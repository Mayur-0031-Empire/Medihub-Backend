import { Router } from "express";
import {
  createChat,
  deleteChat,
  getChat,
  listChats,
  renameChat,
  sendMessage
} from "../controllers/chat.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

router.use(protect);

router.route("/").get(listChats).post(createChat);
router.post("/messages", upload.array("attachments", 3), sendMessage);
router.route("/:chatId").get(getChat).patch(renameChat).delete(deleteChat);
router.post("/:chatId/messages", upload.array("attachments", 3), sendMessage);

export default router;
