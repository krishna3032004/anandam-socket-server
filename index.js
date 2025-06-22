import express from "express";
import http from "http";
import mongoose from "mongoose";
import cors from "cors";
import { Server } from "socket.io";
import dotenv from "dotenv";

import Message from "./models/Message.js";
import User from "./models/User.js";
import Doctor from "./models/Doctor.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://anandamwellness-xi.vercel.app", // 👈 Change this to your deployed frontend domain for security
    methods: ["GET", "POST"],
  },
});

// 🌐 Connect MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log("Joined room:", roomId);
  });

  socket.on("sendMessage", async (message) => {
    const savedMessage = await Message.create(message);
    io.to(message.roomId).emit("receiveMessage", savedMessage);

    const { senderId, receiverId } = message;

    const user = await User.findById(senderId);
    const doctor = await Doctor.findById(receiverId);

    if (user && !user.chattedWith.includes(receiverId)) {
      user.chattedWith.push(receiverId);
      await user.save();
    }

    if (doctor && !doctor.chattedWith.includes(senderId)) {
      doctor.chattedWith.push(senderId);
      await doctor.save();
    }
  });

  socket.on("video-call-request", ({ from, to, roomId }) => {
    io.to(roomId).emit("video-call-request", { from, to, roomId });
  });

  socket.on("pickup-call", ({ from, to, roomId }) => {
    io.to(roomId).emit("pickup-call", { from, to });
  });

  socket.on("callAccepted", ({ to, roomId }) => {
    io.to(roomId).emit("callAccepted");
  });

  socket.on("webrtc-signal", ({ signal, roomId }) => {
    io.to(roomId).emit("webrtc-signal", { signal });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});
