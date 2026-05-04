import { Server } from "socket.io";
import cookie from "cookie";
import Appointment from "../models/appointment.model.js";
import User from "../models/user.model.js";
import { verifyAccessToken } from "../utils/token.js";

const getId = (value) => value?._id?.toString?.() || value?.toString?.();

const getTokenFromSocket = (socket) => {
  const authToken = socket.handshake.auth?.token;

  if (authToken) {
    return authToken;
  }

  const rawCookie = socket.handshake.headers.cookie;

  if (!rawCookie) {
    return null;
  }

  const cookies = cookie.parse(rawCookie);
  return cookies.accessToken;
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = getTokenFromSocket(socket);

    if (!token) {
      return next(new Error("Authentication token is required"));
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded._id || decoded.id).select("-password -refreshToken");

    if (!user) {
      return next(new Error("User not found"));
    }

    socket.user = user;
    next();
  } catch (_error) {
    next(new Error("Invalid or expired authentication token"));
  }
};

const assertAppointmentParticipant = async ({ appointmentId, user }) => {
  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  const isPatient = getId(appointment.patient) === user._id.toString();
  const isDoctor = getId(appointment.doctor) === user._id.toString();

  if (!isPatient && !isDoctor && user.role !== "admin") {
    throw new Error("You are not allowed to join this consultation");
  }

  if (!["booked", "completed"].includes(appointment.status)) {
    throw new Error("This consultation is not active");
  }

  return appointment;
};

const roomNameForAppointment = (appointmentId) => `appointment:${appointmentId}`;

const initWebRTCSignaling = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
      credentials: true
    }
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    socket.on("consultation:join", async ({ appointmentId } = {}, callback) => {
      try {
        if (!appointmentId) {
          throw new Error("appointmentId is required");
        }

        const appointment = await assertAppointmentParticipant({
          appointmentId,
          user: socket.user
        });
        const roomName = roomNameForAppointment(appointment._id);

        socket.join(roomName);
        socket.data.appointmentId = appointment._id.toString();
        socket.data.roomName = roomName;

        socket.to(roomName).emit("consultation:peer-joined", {
          userId: socket.user._id,
          role: socket.user.role,
          socketId: socket.id
        });

        callback?.({
          ok: true,
          roomName,
          socketId: socket.id
        });
      } catch (error) {
        callback?.({ ok: false, message: error.message });
      }
    });

    socket.on("webrtc:offer", ({ appointmentId, offer } = {}) => {
      const roomName = roomNameForAppointment(appointmentId || socket.data.appointmentId);
      socket.to(roomName).emit("webrtc:offer", {
        from: socket.id,
        offer
      });
    });

    socket.on("webrtc:answer", ({ appointmentId, answer } = {}) => {
      const roomName = roomNameForAppointment(appointmentId || socket.data.appointmentId);
      socket.to(roomName).emit("webrtc:answer", {
        from: socket.id,
        answer
      });
    });

    socket.on("webrtc:ice-candidate", ({ appointmentId, candidate } = {}) => {
      const roomName = roomNameForAppointment(appointmentId || socket.data.appointmentId);
      socket.to(roomName).emit("webrtc:ice-candidate", {
        from: socket.id,
        candidate
      });
    });

    socket.on("consultation:leave", () => {
      if (socket.data.roomName) {
        socket.to(socket.data.roomName).emit("consultation:peer-left", {
          socketId: socket.id,
          userId: socket.user._id
        });
        socket.leave(socket.data.roomName);
      }
    });

    socket.on("disconnect", () => {
      if (socket.data.roomName) {
        socket.to(socket.data.roomName).emit("consultation:peer-left", {
          socketId: socket.id,
          userId: socket.user._id
        });
      }
    });
  });

  return io;
};

export { initWebRTCSignaling };
