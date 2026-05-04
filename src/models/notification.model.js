import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment"
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    channel: {
      type: String,
      enum: ["in_app", "email"],
      default: "in_app"
    },
    status: {
      type: String,
      enum: ["queued", "sent", "read"],
      default: "queued"
    },
    sendAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
