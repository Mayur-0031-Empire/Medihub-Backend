import User from "../models/user.model.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/token.js";
import { clearAuthCookies, setAuthCookies } from "../utils/cookies.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { deleteLocalFiles } from "../utils/deleteLocalFiles.js";

const issueTokens = async (user, res) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  setAuthCookies(res, { accessToken, refreshToken });

  return { accessToken, refreshToken };
};

const register = asyncHandler(async (req, res) => {
    const {
      firstName,
      lastName,
      username,
      role,
      email,
      phone,
      password,
      confirmPassword
    } = req.body;
    const photoLocalPath = req.file?.path || req.files?.photo?.[0]?.path;

    if ([firstName, lastName, username, role, email, phone, password, confirmPassword].some((field) => !field?.trim())) {
      deleteLocalFiles([photoLocalPath]);
      throw new ApiError(400, "All fields are required");
    }

    if (password !== confirmPassword) {
      deleteLocalFiles([photoLocalPath]);
      throw new ApiError(400, "Password and confirm password do not match");
    }

    const existingUser = await User.findOne({
      $or: [
        { username: username?.toLowerCase() },
        { email: email?.toLowerCase() },
        { phone }
      ]
    });

    if (existingUser) {
      deleteLocalFiles([photoLocalPath]);
      const field =
        existingUser.username === username?.toLowerCase()
          ? "username"
          : existingUser.email === email?.toLowerCase()
            ? "email"
            : "phone";

      throw new ApiError(409, `${field} already exists`);
    }

    if (!photoLocalPath) {
      throw new ApiError(400, "Photo is required");
    }
    console.log(photoLocalPath);
    const photo = await uploadOnCloudinary(photoLocalPath);

    if (!photo?.url) {
      deleteLocalFiles([photoLocalPath]);
      throw new ApiError(500, "Failed to upload photo to Cloudinary");
    }

    const user = await User.create({
      firstName,
      lastName,
      username,
      role,
      email,
      phone,
      password,
      photo: photo.url
    });

    await issueTokens(user, res);

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    return res.status(201).json(new ApiResponse(201, "User registered successfully", createdUser));
});

const login = async (req, res, next) => {
  try {
    const { identifier, usernameOrEmail, username, email, password } = req.body;
    const loginId = identifier || usernameOrEmail || username || email;

    if (!loginId || !password) {
      return res.status(400).json({ message: "Username/email and password are required" });
    }

    const user = await User.findOne({
      $or: [{ email: loginId.toLowerCase() }, { username: loginId.toLowerCase() }]
    }).select("+password +refreshToken");

    if (!user || !(await user.isPasswordCorrect(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    await issueTokens(user, res);

    res.status(200).json(new ApiResponse(200, "Logged in successfully", user));
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken || req.body?.refreshToken;

    if (!token) {
      return res.status(401).json({ message: "Refresh token is required" });
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded._id || decoded.id).select("+refreshToken");

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    await issueTokens(user, res);

    res.status(200).json(new ApiResponse(200, "Token refreshed successfully"));
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken || req.body?.refreshToken;

    if (token) {
      const user = await User.findOne({ refreshToken: token }).select("+refreshToken");

      if (user) {
        user.refreshToken = undefined;
        await user.save({ validateBeforeSave: false });
      }
    }

    clearAuthCookies(res);
    res.status(200).json(new ApiResponse(200, "Logged out successfully"));
  } catch (error) {
    next(error);
  }
};

export { register, login, refresh, logout };
