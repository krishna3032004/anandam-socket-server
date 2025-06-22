const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");
require("dotenv").config();

const Message = require("./models/Message");
const User = require("./models/User");
const Doctor = require("./models/Doctor");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Or use your deployed frontend domain
    methods: ["GET", "POST"],
  },
});

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
