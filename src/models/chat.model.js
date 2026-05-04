import mongoose, { Schema } from "mongoose";

const attachmentSchema = new Schema(
  {
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
    }
  },
  {
    _id: false
  }
);

const messageSchema = new Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    attachments: {
      type: [attachmentSchema],
      default: []
    },
    crisisDetected: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const chatSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: {
      type: String,
      trim: true,
      default: "New MediHub Chat"
    },
    messages: {
      type: [messageSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
