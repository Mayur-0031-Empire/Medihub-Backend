import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import doctorRoutes from "./routes/doctor.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import bmiBuddyRoutes from "./routes/bmiBuddy.routes.js";
import hospitalLocatorRoutes from "./routes/hospitalLocator.routes.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "medihub-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/ai/chats", chatRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/bmi-buddy", bmiBuddyRoutes);
app.use("/api/hospital-locator", hospitalLocatorRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
