import DoctorProfile from "../models/doctor.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { deleteLocalFiles } from "../utils/deleteLocalFiles.js";

const editableDoctorFields = [
  "specialization",
  "experienceYears",
  "hospitalName",
  "consultationFee",
  "availabilitySchedule"
];

const parseDocumentTitles = (documentTitles) => {
  if (!documentTitles) {
    return [];
  }

  if (Array.isArray(documentTitles)) {
    return documentTitles;
  }

  try {
    const parsedTitles = JSON.parse(documentTitles);
    return Array.isArray(parsedTitles) ? parsedTitles : [documentTitles];
  } catch (_error) {
    return documentTitles.split(",").map((title) => title.trim());
  }
};

const parseDocumentIds = (documentIds) => {
  if (!documentIds) {
    return [];
  }

  if (Array.isArray(documentIds)) {
    return documentIds;
  }

  try {
    const parsedIds = JSON.parse(documentIds);
    return Array.isArray(parsedIds) ? parsedIds : [documentIds];
  } catch (_error) {
    return documentIds.split(",").map((id) => id.trim());
  }
};

const buildUploadedDocuments = async (files = [], documentTitles) => {
  const titles = parseDocumentTitles(documentTitles);
  const localPaths = files.map((file) => file.path);

  if (files.length === 0) {
    throw new ApiError(400, "At least one document file is required");
  }

  if (titles.length !== files.length || titles.some((title) => !title?.trim())) {
    deleteLocalFiles(localPaths);
    throw new ApiError(400, "Each document file must have a matching document title");
  }

  const uploadedDocuments = [];

  for (let index = 0; index < files.length; index += 1) {
    const uploadedFile = await uploadOnCloudinary(files[index].path);

    if (!uploadedFile?.url && !uploadedFile?.secure_url) {
      deleteLocalFiles(localPaths);
      throw new ApiError(500, "Failed to upload doctor document to Cloudinary");
    }

    uploadedDocuments.push({
      title: titles[index].trim(),
      fileUrl: uploadedFile.secure_url || uploadedFile.url,
      publicId: uploadedFile.public_id,
      verificationStatus: "pending"
    });
  }

  return uploadedDocuments;
};

const getMyDoctorProfile = asyncHandler(async (req, res) => {
  const doctorProfile = await DoctorProfile.findOne({ user: req.user._id }).populate(
    "user",
    "-password -refreshToken"
  );

  if (!doctorProfile) {
    throw new ApiError(404, "Doctor profile not found");
  }

  return res.status(200).json(new ApiResponse(200, "Doctor profile fetched successfully", doctorProfile));
});

const createDoctorProfile = asyncHandler(async (req, res) => {
  const existingProfile = await DoctorProfile.findOne({ user: req.user._id });

  if (existingProfile) {
    deleteLocalFiles(req.files?.map((file) => file.path));
    throw new ApiError(409, "Doctor profile already exists");
  }

  const { specialization, experienceYears, hospitalName, consultationFee, availabilitySchedule, documentTitles } =
    req.body;

  if ([specialization, experienceYears, hospitalName, consultationFee, availabilitySchedule].some((field) => !String(field ?? "").trim())) {
    deleteLocalFiles(req.files?.map((file) => file.path));
    throw new ApiError(400, "All doctor profile fields are required");
  }

  const documents = await buildUploadedDocuments(req.files, documentTitles);

  const doctorProfile = await DoctorProfile.create({
    user: req.user._id,
    specialization,
    experienceYears,
    hospitalName,
    consultationFee,
    availabilitySchedule,
    documents,
    verificationStatus: "pending",
    isRecommended: false
  });

  return res.status(201).json(new ApiResponse(201, "Doctor profile submitted for verification", doctorProfile));
});

const updateDoctorProfile = asyncHandler(async (req, res) => {
  const updates = {};

  for (const field of editableDoctorFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      updates[field] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "At least one valid doctor profile field is required");
  }

  const doctorProfile = await DoctorProfile.findOne({ user: req.user._id });

  if (!doctorProfile) {
    throw new ApiError(404, "Doctor profile not found");
  }

  Object.assign(doctorProfile, updates);
  doctorProfile.syncVerifiedTitles();
  await doctorProfile.save();

  return res.status(200).json(new ApiResponse(200, "Doctor profile updated successfully", doctorProfile));
});

const addDoctorDocuments = asyncHandler(async (req, res) => {
  const doctorProfile = await DoctorProfile.findOne({ user: req.user._id });

  if (!doctorProfile) {
    deleteLocalFiles(req.files?.map((file) => file.path));
    throw new ApiError(404, "Doctor profile not found");
  }

  const documents = await buildUploadedDocuments(req.files, req.body.documentTitles);

  doctorProfile.documents.push(...documents);
  doctorProfile.syncVerifiedTitles();
  await doctorProfile.save();

  return res.status(200).json(new ApiResponse(200, "Doctor documents added for review", doctorProfile));
});

const getVerifiedDoctors = asyncHandler(async (req, res) => {
  const filter = {
    verifiedTitles: { $exists: true, $ne: [] }
  };

  if (req.query.title) {
    filter.verifiedTitles = { $regex: req.query.title, $options: "i" };
  }

  const doctors = await DoctorProfile.find(filter)
    .populate("user", "firstName lastName username email phone photo role")
    .sort({ isRecommended: -1, updatedAt: -1 });

  return res.status(200).json(new ApiResponse(200, "Verified doctors fetched successfully", doctors));
});

const getPendingDoctorProfiles = asyncHandler(async (_req, res) => {
  const doctors = await DoctorProfile.find({
    "documents.verificationStatus": "pending"
  })
    .populate("user", "firstName lastName username email phone photo role")
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, "Pending doctor profiles fetched successfully", doctors));
});

const verifyDoctorProfile = asyncHandler(async (req, res) => {
  const { verificationStatus, rejectionReason, isRecommended, documentIds } = req.body;
  const selectedDocumentIds = parseDocumentIds(documentIds);

  if (!["verified", "rejected"].includes(verificationStatus)) {
    throw new ApiError(400, "Verification status must be verified or rejected");
  }

  if (verificationStatus === "rejected" && !rejectionReason?.trim()) {
    throw new ApiError(400, "Rejection reason is required");
  }

  const documentStatus = verificationStatus === "verified" ? "verified" : "rejected";
  const doctorProfile = await DoctorProfile.findById(req.params.doctorProfileId);

  if (!doctorProfile) {
    throw new ApiError(404, "Doctor profile not found");
  }

  doctorProfile.verifiedBy = req.user._id;
  doctorProfile.verifiedAt = new Date();
  doctorProfile.rejectionReason = verificationStatus === "rejected" ? rejectionReason : undefined;
  doctorProfile.documents.forEach((document) => {
    const shouldUpdateDocument =
      document.verificationStatus === "pending" &&
      (selectedDocumentIds.length === 0 || selectedDocumentIds.includes(document._id.toString()));

    if (shouldUpdateDocument) {
      document.verificationStatus = documentStatus;
    }
  });
  doctorProfile.syncVerifiedTitles();

  if (doctorProfile.verificationStatus === "verified" && typeof isRecommended !== "undefined") {
    doctorProfile.isRecommended = Boolean(isRecommended);
  }

  if (doctorProfile.verificationStatus !== "verified") {
    doctorProfile.isRecommended = false;
  }

  await doctorProfile.save();

  return res.status(200).json(new ApiResponse(200, "Doctor verification updated successfully", doctorProfile));
});

export {
  addDoctorDocuments,
  createDoctorProfile,
  getMyDoctorProfile,
  getPendingDoctorProfiles,
  getVerifiedDoctors,
  updateDoctorProfile,
  verifyDoctorProfile
};
