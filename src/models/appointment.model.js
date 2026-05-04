import mongoose, { Schema } from "mongoose";

const attachmentSchema = new Schema(
  {
    title: {
      type: String,
      trim: true
    },
    originalName: {
      type: String,
      trim: true
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true
    },
    publicId: {
      type: String,
      trim: true
    },
    mimeType: {
      type: String,
      trim: true
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

const symptomSchema = new Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true
    },
    severity: {
      type: String,
      enum: ["mild", "moderate", "severe", "unknown"],
      default: "unknown"
    },
    duration: {
      type: String,
      trim: true
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

const prescriptionSchema = new Schema(
  {
    draftText: {
      type: String,
      trim: true
    },
    approvedText: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ["not_generated", "draft", "approved"],
      default: "not_generated"
    },
    approvedAt: {
      type: Date
    }
  },
  {
    _id: false
  }
);

const appointmentSchema = new Schema(
  {
    slot: {
      type: Schema.Types.ObjectId,
      ref: "AvailabilitySlot",
      required: true,
      unique: true
    },
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
    patient: {
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
      enum: ["booked", "completed", "patient_cancelled", "doctor_cancelled", "no_show"],
      default: "booked",
      index: true
    },
    cancellationReason: {
      type: String,
      trim: true
    },
    videoRoomName: {
      type: String,
      trim: true
    },
    videoJoinUrl: {
      type: String,
      trim: true
    },
    symptoms: {
      type: [symptomSchema],
      default: []
    },
    patientNotes: {
      type: String,
      trim: true
    },
    doctorDiagnosis: {
      type: String,
      trim: true
    },
    doctorNotes: {
      type: String,
      trim: true
    },
    meetingTranscript: {
      type: String,
      trim: true
    },
    aiConsultationNotes: {
      type: String,
      trim: true
    },
    prescription: {
      type: prescriptionSchema,
      default: () => ({ status: "not_generated" })
    },
    reports: {
      type: [attachmentSchema],
      default: []
    },
    doctorAttachments: {
      type: [attachmentSchema],
      default: []
    },
    reminderSentAt: {
      type: Date
    },
    trainingConsent: {
      type: Boolean,
      default: false
    },
    aiTrainingTags: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

const Appointment = mongoose.model("Appointment", appointmentSchema);

export default Appointment;
