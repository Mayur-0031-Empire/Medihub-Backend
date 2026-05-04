import Chat from "../models/chat.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { deleteLocalFiles } from "../utils/deleteLocalFiles.js";
import { classifyMediHubMessage, generateMediHubReply } from "../services/gemini.service.js";

const makeChatTitle = (message = "") => {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return "New MediHub Chat";
  }

  return trimmedMessage.length > 45 ? `${trimmedMessage.slice(0, 45)}...` : trimmedMessage;
};

const uploadAttachments = async (files = []) => {
  const attachments = [];

  for (const file of files) {
    const uploadedFile = await uploadOnCloudinary(file.path);

    if (!uploadedFile?.url && !uploadedFile?.secure_url) {
      deleteLocalFiles(files.map((item) => item.path));
      throw new ApiError(500, "Failed to upload chat attachment");
    }

    attachments.push({
      originalName: file.originalname,
      fileUrl: uploadedFile.secure_url || uploadedFile.url,
      publicId: uploadedFile.public_id,
      mimeType: file.mimetype
    });
  }

  return attachments;
};

const findOwnChat = async (chatId, userId) => {
  const chat = await Chat.findOne({
    _id: chatId,
    owner: userId
  });

  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  return chat;
};

const listChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({ owner: req.user._id })
    .select("title updatedAt createdAt messages")
    .sort({ updatedAt: -1 });

  const chatList = chats.map((chat) => ({
    _id: chat._id,
    title: chat.title,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    lastMessage: chat.messages.at(-1)?.content || ""
  }));

  return res.status(200).json(new ApiResponse(200, "Chats fetched successfully", chatList));
});

const createChat = asyncHandler(async (req, res) => {
  const title = req.body.title?.trim() || "New MediHub Chat";

  const chat = await Chat.create({
    owner: req.user._id,
    title
  });

  return res.status(201).json(new ApiResponse(201, "Chat created successfully", chat));
});

const getChat = asyncHandler(async (req, res) => {
  const chat = await findOwnChat(req.params.chatId, req.user._id);

  return res.status(200).json(new ApiResponse(200, "Chat fetched successfully", chat));
});

const sendMessage = asyncHandler(async (req, res) => {
  const message = req.body.message?.trim();
  const files = req.files || [];

  if (!message && files.length === 0) {
    throw new ApiError(400, "Message or attachment is required");
  }

  const chat = req.params.chatId
    ? await findOwnChat(req.params.chatId, req.user._id)
    : await Chat.create({
        owner: req.user._id,
        title: makeChatTitle(message)
      });

  const userMessage = {
    role: "user",
    content: message || "Please review the uploaded health document or prescription.",
    attachments: [],
    crisisDetected: false
  };

  let reply;
  let classification;

  try {
    classification = await classifyMediHubMessage({
      message: userMessage.content,
      hasAttachments: files.length > 0
    });

    userMessage.crisisDetected = classification.isCrisis;

    reply = await generateMediHubReply({
      history: chat.messages,
      message: userMessage.content,
      files,
      classification
    });

    userMessage.attachments = await uploadAttachments(files);
  } catch (error) {
    deleteLocalFiles(files.map((file) => file.path));
    throw error;
  }

  chat.messages.push(userMessage);
  chat.messages.push({
    role: "assistant",
    content: reply,
    crisisDetected: classification.isCrisis
  });

  if (chat.title === "New MediHub Chat") {
    chat.title = makeChatTitle(userMessage.content);
  }

  await chat.save();

  return res.status(200).json(
    new ApiResponse(200, "Message sent successfully", {
      chatId: chat._id,
      reply,
      crisisDetected: classification.isCrisis,
      classification,
      chat
    })
  );
});

const renameChat = asyncHandler(async (req, res) => {
  const title = req.body.title?.trim();

  if (!title) {
    throw new ApiError(400, "Chat title is required");
  }

  const chat = await findOwnChat(req.params.chatId, req.user._id);
  chat.title = title;
  await chat.save();

  return res.status(200).json(new ApiResponse(200, "Chat renamed successfully", chat));
});

const deleteChat = asyncHandler(async (req, res) => {
  const chat = await findOwnChat(req.params.chatId, req.user._id);
  await chat.deleteOne();

  return res.status(200).json(new ApiResponse(200, "Chat deleted successfully"));
});

export { createChat, deleteChat, getChat, listChats, renameChat, sendMessage };
