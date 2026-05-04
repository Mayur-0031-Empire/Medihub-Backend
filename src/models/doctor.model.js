import mongoose, { Schema } from "mongoose";

const documentSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Document title is required"],
      trim: true
    },
    fileUrl: {
      type: String,
      required: [true, "Document file URL is required"],
      trim: true
    },
    publicId: {
      type: String,
      trim: true
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending"
    }
  },
  {
    timestamps: true
  }
);

const doctorProfileSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    specialization: {
      type: String,
      required: [true, "Specialization is required"],
      trim: true
    },
    experienceYears: {
      type: Number,
      required: [true, "Experience years are required"],
      min: 0,
      max: 70
    },
    hospitalName: {
      type: String,
      required: [true, "Hospital name is required"],
      trim: true
    },
    consultationFee: {
      type: Number,
      required: [true, "Consultation fee is required"],
      min: 0
    },
    availabilitySchedule: {
      type: String,
      required: [true, "Availability schedule is required"],
      trim: true
    },
    documents: {
      type: [documentSchema],
      validate: {
        validator(documents) {
          return documents.length > 0;
        },
        message: "At least one qualification document is required"
      }
    },
    verifiedTitles: {
      type: [String],
      default: []
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      index: true
    },
    isRecommended: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    verifiedAt: {
      type: Date
    },
    rejectionReason: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

doctorProfileSchema.methods.syncVerifiedTitles = function syncVerifiedTitles() {
  const verifiedTitles = this.documents
    .filter((document) => document.verificationStatus === "verified")
    .map((document) => document.title);
  const hasPendingDocuments = this.documents.some((document) => document.verificationStatus === "pending");

  this.verifiedTitles = [...new Set(verifiedTitles)];

  if (this.verifiedTitles.length > 0) {
    this.verificationStatus = "verified";
    return;
  }

  this.verificationStatus = hasPendingDocuments ? "pending" : "rejected";
};

const DoctorProfile = mongoose.model("DoctorProfile", doctorProfileSchema);

export default DoctorProfile;
