import mongoose, { Schema } from "mongoose";

const hospitalSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Hospital name is required"],
      trim: true
    },
    profilePicture: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      required: [true, "Hospital address is required"],
      trim: true
    },
    phone: {
      type: String,
      required: [true, "Hospital phone number is required"],
      trim: true,
      match: [/^[0-9+\-\s()]{7,20}$/, "Please provide a valid phone number"]
    },
    specialties: {
      type: [String],
      default: [],
      set: (items) => items.map((item) => item.trim()).filter(Boolean)
    },
    consultations: {
      type: [String],
      default: [],
      set: (items) => items.map((item) => item.trim()).filter(Boolean)
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        required: [true, "Hospital coordinates are required"],
        validate: {
          validator(coordinates) {
            return (
              coordinates.length === 2 &&
              coordinates[0] >= -180 &&
              coordinates[0] <= 180 &&
              coordinates[1] >= -90 &&
              coordinates[1] <= 90
            );
          },
          message: "Coordinates must be [longitude, latitude]"
        }
      }
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

hospitalSchema.index({ location: "2dsphere" });
hospitalSchema.index({ name: "text", address: "text", specialties: "text", consultations: "text" });

const Hospital = mongoose.model("Hospital", hospitalSchema);

export default Hospital;
