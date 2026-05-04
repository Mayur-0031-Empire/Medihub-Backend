import "dotenv/config";
import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initWebRTCSignaling } from "./services/webrtcSignaling.service.js";

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

initWebRTCSignaling(server);

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`MediHub API running on port ${PORT}`);
      console.log("WebRTC signaling server ready");
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  });
