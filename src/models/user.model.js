import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const allowedRoles = ["admin", "patient", "doctor"];
const allowedGenders = ["male", "female", "other", "prefer_not_to_say"];

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: 2,
      maxlength: 50
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: 2,
      maxlength: 50
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-z0-9_]+$/, "Username can contain lowercase letters, numbers, and underscores only"]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"]
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      match: [/^[0-9+\-\s()]{7,20}$/, "Please provide a valid phone number"]
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false
    },
    role: {
      type: String,
      enum: allowedRoles,
      required: [true, "Role is required"],
      default: "patient"
    },
    gender: {
      type: String,
      enum: allowedGenders
    },
    address: {
      type: String,
      trim: true,
      maxlength: 250
    },
    photo: {
      type: String,
      trim: true
    },
    bloodGroup: {
      type: String,
      trim: true,
      uppercase: true,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", null]
    },
    age: {
      type: Number,
      min: 0,
      max: 130
    },
    refreshToken: {
      type: String,
      select: false
    }
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isPasswordCorrect = function isPasswordCorrect(candidatePassword) {
  return this.comparePassword(candidatePassword);
};

userSchema.methods.generateAccessToken = function generateAccessToken() {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      role: this.role
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || process.env.ACCESS_TOKEN_EXPIRY || "15m"
    }
  );
};

userSchema.methods.generateRefreshToken = function generateRefreshToken() {
  return jwt.sign(
    {
      _id: this._id
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || process.env.REFRESH_TOKEN_EXPIRY || "7d"
    }
  );
};

const User = mongoose.model("User", userSchema);

export { allowedRoles, allowedGenders };
export default User;
