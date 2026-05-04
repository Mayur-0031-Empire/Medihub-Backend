import { Router } from "express";
import { login, logout, refresh, register } from "../controllers/auth.controller.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

router.post("/register",
     upload.fields([
             {
                 name : "photo",
                 maxCount : 1
             }
         ]), 
     register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
