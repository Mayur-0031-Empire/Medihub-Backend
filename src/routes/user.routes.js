import { Router } from "express";
import { getMe, updateMe, updatePassword, updatePhoto } from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

router.get("/me", protect, getMe);
router.patch("/me", protect, updateMe);
router.patch("/me/photo", protect, upload.single("photo"), updatePhoto);
router.patch("/me/password", protect, updatePassword);

export default router;
