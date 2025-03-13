import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";

const maxCapacity = 2;
const PORT = process.env.PORT || 4000;

const server = express();
const httpServer = createServer(server);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === "production" 
        ? "https://youth-adults.vercel.app/"
        : "http://localhost:3000", 
      methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("클라이언트 연결됨:", socket.id);

  socket.on("joinRoom", (roomId, myId) => {
    const currentRoomCount = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    if (currentRoomCount >= maxCapacity) {
      socket.emit("roomFull", "이 방은 이미 최대 인원 수 입니다.");
    } else if (currentRoomCount === 0) {
      socket.join(roomId);
      socket.emit("getDataFromStorage");
    } else {
      socket.to(roomId).except(myId).emit("uploadChatData");
      socket.join(roomId);
    }
  });

  socket.on("uploadComplete", (roomId, myId, chatData) => {
    socket.to(roomId).except(myId).emit("getData", chatData);
  });

  socket.on("message", (msg, myId, roomId) => {
    console.log("메시지 수신:", msg);
    io.to(roomId).emit("message", msg, myId);
  });

  socket.on("disconnect", () => {
    console.log("클라이언트 연결 종료:", socket.id);
  });

  socket.on("sendFromSystem", (message, roomId) => {
    io.to(roomId).emit("sendFromSystem", message);
  });

  socket.on("img", (imgFile, myId, roomId) => {
    io.to(roomId).emit("img", imgFile, myId);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Socket.IO 서버 ${PORT}번 포트에서 실행 중`);
});
