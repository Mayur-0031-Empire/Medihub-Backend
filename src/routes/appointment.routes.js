import { Router } from "express";
import {
  addPatientSymptoms,
  approvePrescription,
  bookAppointment,
  cancelAppointmentByDoctor,
  createAvailabilitySlots,
  generateAiConsultationDraft,
  getAppointment,
  getDoctorAvailableSlots,
  listMyAppointments,
  listMyNotifications,
  updateDoctorConsultation,
  uploadDoctorAttachments,
  uploadPatientReports
} from "../controllers/appointment.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { requireVerifiedDoctor } from "../middleware/doctor.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

router.get("/doctors/:doctorProfileId/slots", getDoctorAvailableSlots);

router.use(protect);

router.get("/notifications", listMyNotifications);
router.get("/me", listMyAppointments);
router.post("/slots", authorize("doctor"), requireVerifiedDoctor, createAvailabilitySlots);
router.post("/book", authorize("patient"), bookAppointment);

router
  .route("/:appointmentId")
  .get(getAppointment);

router.patch("/:appointmentId/symptoms", authorize("patient"), addPatientSymptoms);
router.post("/:appointmentId/reports", authorize("patient"), upload.array("reports", 10), uploadPatientReports);

router.patch("/:appointmentId/doctor-notes", authorize("doctor"), updateDoctorConsultation);
router.post("/:appointmentId/doctor-files", authorize("doctor"), upload.array("files", 10), uploadDoctorAttachments);
router.post("/:appointmentId/ai-draft", authorize("doctor"), generateAiConsultationDraft);
router.patch("/:appointmentId/prescription/approve", authorize("doctor"), approvePrescription);
router.patch("/:appointmentId/cancel-by-doctor", authorize("doctor"), cancelAppointmentByDoctor);

export default router;
