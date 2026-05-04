import { Router } from "express";
import {
  addDoctorDocuments,
  createDoctorProfile,
  getMyDoctorProfile,
  getPendingDoctorProfiles,
  getVerifiedDoctors,
  updateDoctorProfile,
  verifyDoctorProfile
} from "../controllers/doctor.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { requireDoctor } from "../middleware/doctor.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

router.get("/", getVerifiedDoctors);

router
  .route("/me")
  .get(protect, requireDoctor, getMyDoctorProfile)
  .post(protect, requireDoctor, upload.array("documents", 10), createDoctorProfile)
  .patch(protect, requireDoctor, updateDoctorProfile);

router.post("/me/documents", protect, requireDoctor, upload.array("documents", 10), addDoctorDocuments);

router.get("/admin/pending", protect, authorize("admin"), getPendingDoctorProfiles);
router.patch("/admin/:doctorProfileId/verify", protect, authorize("admin"), verifyDoctorProfile);

export default router;
