import mongoose, { Schema } from "mongoose";

const availabilitySlotSchema = new Schema(
  {
    doctorProfile: {
      type: Schema.Types.ObjectId,
      ref: "DoctorProfile",
      required: true,
      index: true
    },
    doctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    startAt: {
      type: Date,
      required: true,
      index: true
    },
    endAt: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ["available", "booked", "blocked", "cancelled"],
      default: "available",
      index: true
    },
    reason: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

availabilitySlotSchema.index({ doctorProfile: 1, startAt: 1, endAt: 1 }, { unique: true });

const AvailabilitySlot = mongoose.model("AvailabilitySlot", availabilitySlotSchema);

export default AvailabilitySlot;
