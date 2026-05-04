import { Router } from "express";
import {
  createHospital,
  findNearbyHospitals,
  getHospitalPhoto,
  getMapConfig,
  listHospitals
} from "../controllers/hospitalLocator.controller.js";

const router = Router();

router.get("/map-config", getMapConfig);
router.get("/photo", getHospitalPhoto);
router.get("/hospitals", listHospitals);
router.post("/hospitals", createHospital);
router.get("/nearby", findNearbyHospitals);

export default router;
