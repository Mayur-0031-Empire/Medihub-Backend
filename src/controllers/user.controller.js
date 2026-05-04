import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { deleteLocalFiles } from "../utils/deleteLocalFiles.js";

const allowedTextFields = [
  "firstName",
  "lastName",
  "phone",
  "gender",
  "address",
  "bloodGroup",
  "age"
];

const getMe = (req, res) => {
  res.status(200).json(new ApiResponse(200, "User fetched successfully", req.user));
};

const updateMe = asyncHandler(async (req, res) => {
  if (req.body.username || req.body.email) {
    throw new ApiError(400, "Username and email cannot be updated");
  }

  if (req.body.photo || req.body.password || req.body.oldPassword || req.body.newPassword) {
    throw new ApiError(400, "Use the dedicated photo or password update route");
  }

  const updates = {};

  for (const field of allowedTextFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      updates[field] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "At least one valid field is required");
  }

  if (updates.phone) {
    const existingPhoneUser = await User.findOne({
      phone: updates.phone,
      _id: { $ne: req.user._id }
    });

    if (existingPhoneUser) {
      throw new ApiError(409, "phone already exists");
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: updates
    },
    {
      new: true,
      runValidators: true
    }
  ).select("-password -refreshToken");

  return res.status(200).json(new ApiResponse(200, "Profile updated successfully", user));
});

const updatePhoto = asyncHandler(async (req, res) => {
  const photoLocalPath = req.file?.path;

  if (!photoLocalPath) {
    throw new ApiError(400, "Photo file is required");
  }

  const photo = await uploadOnCloudinary(photoLocalPath);

  if (!photo?.url) {
    deleteLocalFiles([photoLocalPath]);
    throw new ApiError(500, "Failed to upload photo to Cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        photo: photo.url
      }
    },
    {
      new: true,
      runValidators: true
    }
  ).select("-password -refreshToken");

  return res.status(200).json(new ApiResponse(200, "Photo updated successfully", user));
});

const updatePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new ApiError(400, "Old password, new password, and confirm password are required");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "New password and confirm password do not match");
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters");
  }

  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Old password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  return res.status(200).json(new ApiResponse(200, "Password updated successfully"));
});

export { getMe, updateMe, updatePhoto, updatePassword };
