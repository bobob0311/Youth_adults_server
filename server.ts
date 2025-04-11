import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import aligoapi from "aligoapi";
import cors from 'cors'; 
import "dotenv/config";

const maxCapacity = 2;
const PORT = process.env.PORT || 4000;

const server = express();
const httpServer = createServer(server);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000", 
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
    socket.to(roomId).except(myId).emit("getPrevChatData", chatData);
  });

  socket.on("message", (msg, myId, roomId) => {
    console.log("메시지 수신:", msg);
    io.to(roomId).emit("message", msg, myId);
  });

  socket.on("disconnect", () => {
    console.log("클라이언트 연결 종료:", socket.id);
  });

  socket.on("sendBySystem", (message, roomId) => {
    io.to(roomId).emit("sendBySystem", message);
  });

  socket.on("img", (imgFile, myId, roomId) => {
    io.to(roomId).emit("img", imgFile, myId);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Socket.IO 서버 ${PORT}번 포트에서 실행 중`);
});


server.use(cors({
  origin: (process.env.NODE_ENV || "development") === "production"
    ? "https://youth-adults.vercel.app" 
    : "http://localhost:3000",           
  methods: ["GET", "POST"],
}));

server.use(express.json());

const AuthData = {
    key: process.env.ALIGO_API_KEY,
    user_id: process.env.ALIGO_USER_ID,
    testmode_yn: "Y",
};

const SENDER = process.env.SENDER_PHONE_NUMBER;

server.post("/sendMessage", async (req, res) => {
  console.log("여기까지도 왔습니다.")
  try {
    const { message_title, message, phoneNumber, message_type } = req.body;

    console.log("Received Data:", { message_title, message, phoneNumber, message_type });
    console.log(SENDER)
    const requestData = {
      headers: {
        "content-type": "application/json",
      },
      body: {
        sender: SENDER,
        receiver: phoneNumber,
        msg: message,
        msg_type: message_type,
        title: message_title,
      },
    };

    console.log("Request Object:", requestData);

    const response = await aligoapi.send(requestData, AuthData);
    console.log("Response:", response);

    res.status(200).json(response);
  } catch (e) {
    console.error("Error occurred:", e);
    const errorMessage = e instanceof Error ? e.message : "Internal Server Error";
    res.status(500).json({ error: errorMessage });
  }
});