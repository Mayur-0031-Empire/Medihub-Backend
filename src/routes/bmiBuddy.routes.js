import { Router } from "express";
import { calculateBmiPlan, getBmiBuddyInfo } from "../controllers/bmiBuddy.controller.js";

const router = Router();

router.get("/", getBmiBuddyInfo);
router.post("/calculate", calculateBmiPlan);

export default router;
