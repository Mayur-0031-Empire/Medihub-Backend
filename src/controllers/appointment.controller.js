import mongoose from "mongoose";
import Appointment from "../models/appointment.model.js";
import AvailabilitySlot from "../models/availabilitySlot.model.js";
import DoctorProfile from "../models/doctor.model.js";
import Notification from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { deleteLocalFiles } from "../utils/deleteLocalFiles.js";
import { generateConsultationDraft } from "../services/gemini.service.js";
import { createAppointmentNotifications, createCancellationNotifications, createNotification } from "../services/notification.service.js";

const populateAppointment = [
  { path: "doctor", select: "firstName lastName email phone photo role" },
  { path: "patient", select: "firstName lastName email phone photo role age gender bloodGroup" },
  { path: "doctorProfile" },
  { path: "slot" }
];

const getId = (value) => value?._id?.toString?.() || value?.toString?.();

const assertAppointmentAccess = (appointment, user) => {
  const isPatient = getId(appointment.patient) === user._id.toString();
  const isDoctor = getId(appointment.doctor) === user._id.toString();
  const isAdmin = user.role === "admin";

  if (!isPatient && !isDoctor && !isAdmin) {
    throw new ApiError(403, "You are not allowed to access this appointment");
  }
};

const buildVideoRoom = (appointmentId) => {
  const roomName = `medihub-${appointmentId}`;
  const baseUrl = process.env.VIDEO_CALL_BASE_URL || `${process.env.CLIENT_ORIGIN || "http://localhost:3000"}/consultation`;

  return {
    videoRoomName: roomName,
    videoJoinUrl: `${baseUrl}/${appointmentId}`
  };
};

const uploadFilesAsAttachments = async ({ files = [], titles = [], uploadedBy }) => {
  if (files.length === 0) {
    throw new ApiError(400, "At least one file is required");
  }

  const attachments = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const uploadedFile = await uploadOnCloudinary(file.path);

    if (!uploadedFile?.url && !uploadedFile?.secure_url) {
      deleteLocalFiles(files.map((item) => item.path));
      throw new ApiError(500, "Failed to upload appointment file");
    }

    attachments.push({
      title: titles[index] || file.originalname,
      originalName: file.originalname,
      fileUrl: uploadedFile.secure_url || uploadedFile.url,
      publicId: uploadedFile.public_id,
      mimeType: file.mimetype,
      uploadedBy
    });
  }

  return attachments;
};

const parseTitles = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch (_error) {
    return value.split(",").map((item) => item.trim());
  }
};

const createAvailabilitySlots = asyncHandler(async (req, res) => {
  const { slots } = req.body;

  if (!Array.isArray(slots) || slots.length === 0) {
    throw new ApiError(400, "Slots array is required");
  }

  const doctorProfile = req.doctorProfile;
  const docs = slots.map((slot) => {
    const startAt = new Date(slot.startAt);
    const endAt = new Date(slot.endAt);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      throw new ApiError(400, "Each slot must have valid startAt and endAt");
    }

    return {
      doctorProfile: doctorProfile._id,
      doctor: req.user._id,
      startAt,
      endAt,
      status: "available"
    };
  });

  const createdSlots = await AvailabilitySlot.insertMany(docs, { ordered: false });

  return res.status(201).json(new ApiResponse(201, "Availability slots created successfully", createdSlots));
});

const getDoctorAvailableSlots = asyncHandler(async (req, res) => {
  const doctorProfile = await DoctorProfile.findById(req.params.doctorProfileId);

  if (!doctorProfile || doctorProfile.verifiedTitles.length === 0) {
    throw new ApiError(404, "Verified doctor profile not found");
  }

  const from = req.query.from ? new Date(req.query.from) : new Date();
  const to = req.query.to ? new Date(req.query.to) : undefined;
  const filter = {
    doctorProfile: doctorProfile._id,
    status: "available",
    startAt: { $gte: from }
  };

  if (to) {
    filter.startAt.$lte = to;
  }

  const slots = await AvailabilitySlot.find(filter).sort({ startAt: 1 });

  return res.status(200).json(new ApiResponse(200, "Available slots fetched successfully", slots));
});

const bookAppointment = asyncHandler(async (req, res) => {
  const { slotId, symptoms = [], patientNotes = "", trainingConsent = false } = req.body;

  if (!slotId) {
    throw new ApiError(400, "slotId is required");
  }

  const session = await mongoose.startSession();
  let appointment;

  try {
    await session.withTransaction(async () => {
      const slot = await AvailabilitySlot.findOneAndUpdate(
        {
          _id: slotId,
          status: "available",
          startAt: { $gt: new Date() }
        },
        { $set: { status: "booked" } },
        { new: true, session }
      );

      if (!slot) {
        throw new ApiError(409, "This slot is no longer available");
      }

      const video = buildVideoRoom(slot._id);
      appointment = await Appointment.create(
        [
          {
            slot: slot._id,
            doctorProfile: slot.doctorProfile,
            doctor: slot.doctor,
            patient: req.user._id,
            startAt: slot.startAt,
            endAt: slot.endAt,
            symptoms: symptoms.map((symptom) => ({
              description: symptom.description || symptom,
              severity: symptom.severity || "unknown",
              duration: symptom.duration,
              addedBy: req.user._id
            })),
            patientNotes,
            trainingConsent,
            ...video
          }
        ],
        { session }
      ).then((items) => items[0]);
    });
  } finally {
    await session.endSession();
  }

  await createAppointmentNotifications(appointment);
  const populatedAppointment = await Appointment.findById(appointment._id).populate(populateAppointment);

  return res.status(201).json(new ApiResponse(201, "Appointment booked successfully", populatedAppointment));
});

const listMyAppointments = asyncHandler(async (req, res) => {
  const filter =
    req.user.role === "doctor"
      ? { doctor: req.user._id }
      : req.user.role === "patient"
        ? { patient: req.user._id }
        : {};

  const appointments = await Appointment.find(filter).populate(populateAppointment).sort({ startAt: -1 });

  return res.status(200).json(new ApiResponse(200, "Appointments fetched successfully", appointments));
});

const getAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.appointmentId).populate(populateAppointment);

  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }

  assertAppointmentAccess(appointment, req.user);

  return res.status(200).json(new ApiResponse(200, "Appointment fetched successfully", appointment));
});

const addPatientSymptoms = asyncHandler(async (req, res) => {
  const { symptoms = [], patientNotes } = req.body;
  const appointment = await Appointment.findById(req.params.appointmentId);

  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }

  if (getId(appointment.patient) !== req.user._id.toString()) {
    throw new ApiError(403, "Only the patient can add symptoms");
  }

  symptoms.forEach((symptom) => {
    appointment.symptoms.push({
      description: symptom.description || symptom,
      severity: symptom.severity || "unknown",
      duration: symptom.duration,
      addedBy: req.user._id
    });
  });

  if (typeof patientNotes === "string") {
    appointment.patientNotes = patientNotes;
  }

  await appointment.save();

  return res.status(200).json(new ApiResponse(200, "Symptoms updated successfully", appointment));
});

const uploadPatientReports = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.appointmentId);

  if (!appointment) {
    deleteLocalFiles(req.files?.map((file) => file.path));
    throw new ApiError(404, "Appointment not found");
  }

  assertAppointmentAccess(appointment, req.user);

  if (req.user._id.toString() !== getId(appointment.patient) && req.user.role !== "admin") {
    deleteLocalFiles(req.files?.map((file) => file.path));
    throw new ApiError(403, "Only the patient can upload reports");
  }

  const attachments = await uploadFilesAsAttachments({
    files: req.files || [],
    titles: parseTitles(req.body.titles),
    uploadedBy: req.user._id
  });

  appointment.reports.push(...attachments);
  await appointment.save();

  return res.status(200).json(new ApiResponse(200, "Reports uploaded successfully", appointment));
});

const updateDoctorConsultation = asyncHandler(async (req, res) => {
  const { doctorDiagnosis, doctorNotes, meetingTranscript, status } = req.body;
  const appointment = await Appointment.findById(req.params.appointmentId);

  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }

  if (getId(appointment.doctor) !== req.user._id.toString()) {
    throw new ApiError(403, "Only the assigned doctor can update consultation details");
  }

  if (typeof doctorDiagnosis === "string") {
    appointment.doctorDiagnosis = doctorDiagnosis;
  }
  if (typeof doctorNotes === "string") {
    appointment.doctorNotes = doctorNotes;
  }
  if (typeof meetingTranscript === "string") {
    appointment.meetingTranscript = meetingTranscript;
  }
  if (status === "completed") {
    appointment.status = "completed";
  }

  await appointment.save();

  return res.status(200).json(new ApiResponse(200, "Consultation updated successfully", appointment));
});

const uploadDoctorAttachments = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.appointmentId);

  if (!appointment) {
    deleteLocalFiles(req.files?.map((file) => file.path));
    throw new ApiError(404, "Appointment not found");
  }

  if (getId(appointment.doctor) !== req.user._id.toString()) {
    deleteLocalFiles(req.files?.map((file) => file.path));
    throw new ApiError(403, "Only the assigned doctor can upload consultation attachments");
  }

  const attachments = await uploadFilesAsAttachments({
    files: req.files || [],
    titles: parseTitles(req.body.titles),
    uploadedBy: req.user._id
  });

  appointment.doctorAttachments.push(...attachments);
  await appointment.save();

  return res.status(200).json(new ApiResponse(200, "Doctor attachments uploaded successfully", appointment));
});

const generateAiConsultationDraft = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.appointmentId);

  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }

  if (getId(appointment.doctor) !== req.user._id.toString()) {
    throw new ApiError(403, "Only the assigned doctor can generate consultation draft");
  }

  const draft = await generateConsultationDraft({ appointment });
  appointment.aiConsultationNotes = draft;
  appointment.prescription.draftText = draft;
  appointment.prescription.status = "draft";
  appointment.aiTrainingTags = ["consultation_summary", "prescription_draft"];
  await appointment.save();

  return res.status(200).json(new ApiResponse(200, "AI consultation draft generated successfully", appointment));
});

const approvePrescription = asyncHandler(async (req, res) => {
  const { approvedText } = req.body;
  const appointment = await Appointment.findById(req.params.appointmentId);

  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }

  if (getId(appointment.doctor) !== req.user._id.toString()) {
    throw new ApiError(403, "Only the assigned doctor can approve prescription");
  }

  appointment.prescription.approvedText = approvedText || appointment.prescription.draftText;
  appointment.prescription.status = "approved";
  appointment.prescription.approvedAt = new Date();
  await appointment.save();

  await createNotification({
    user: appointment.patient,
    appointment: appointment._id,
    title: "Prescription approved",
    message: "Your doctor has approved and shared your prescription."
  });

  return res.status(200).json(new ApiResponse(200, "Prescription approved and shared with patient", appointment));
});

const cancelAppointmentByDoctor = asyncHandler(async (req, res) => {
  const { reason = "Doctor emergency" } = req.body;
  const appointment = await Appointment.findById(req.params.appointmentId);

  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }

  if (getId(appointment.doctor) !== req.user._id.toString()) {
    throw new ApiError(403, "Only the assigned doctor can cancel this appointment");
  }

  appointment.status = "doctor_cancelled";
  appointment.cancellationReason = reason;
  await appointment.save();

  await AvailabilitySlot.findByIdAndUpdate(appointment.slot, {
    $set: {
      status: "cancelled",
      reason
    }
  });
  await createCancellationNotifications(appointment, reason);

  return res.status(200).json(new ApiResponse(200, "Appointment cancelled successfully", appointment));
});

const listMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ sendAt: -1 });

  return res.status(200).json(new ApiResponse(200, "Notifications fetched successfully", notifications));
});

export {
  addPatientSymptoms,
  approvePrescription,
  bookAppointment,
  cancelAppointmentByDoctor,
  createAvailabilitySlots,
  generateAiConsultationDraft,
  getAppointment,
  getDoctorAvailableSlots,
  listMyAppointments,
  listMyNotifications,
  updateDoctorConsultation,
  uploadDoctorAttachments,
  uploadPatientReports
};
