const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 정적 파일 제공
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Multer 설정 (파일 업로드)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // 파일명 중복 방지를 위해 timestamp 추가
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
  },
  fileFilter: (req, file, cb) => {
    // 이미지 파일만 허용
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("이미지 파일만 업로드 가능합니다."));
    }
  },
});

// 메인 페이지 라우트
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 파일 업로드 라우트
app.post("/upload", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "파일이 업로드되지 않았습니다." });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      imageUrl: imageUrl,
      originalName: req.file.originalname,
    });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ error: "파일 업로드 중 오류가 발생했습니다." });
  }
});

// 연결된 사용자 목록
const users = new Map();

// Socket.IO 연결 처리
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // 사용자 입장 처리
  socket.on("join", (username) => {
    users.set(socket.id, username);

    // 다른 사용자들에게 새 사용자 입장 알림
    socket.broadcast.emit("user joined", {
      username: username,
      message: `${username}님이 채팅방에 입장했습니다.`,
      timestamp: new Date().toLocaleTimeString(),
    });

    // 현재 접속자 수 업데이트
    io.emit("user count", users.size);

    console.log(`${username} joined the chat`);
  });

  // 채팅 메시지 처리
  socket.on("chat message", (data) => {
    const username = users.get(socket.id);
    if (username) {
      const messageData = {
        username: username,
        message: data.message,
        timestamp: new Date().toLocaleTimeString(),
        type: data.type || "text", // 'text' 또는 'image'
      };

      // 이미지 메시지인 경우 추가 정보 포함
      if (data.type === "image") {
        messageData.imageUrl = data.imageUrl;
        messageData.originalName = data.originalName;
      }

      // 모든 클라이언트에게 메시지 전송
      io.emit("chat message", messageData);

      console.log(
        `Message from ${username}: ${
          data.type === "image" ? "[Image]" : data.message
        }`
      );
    }
  });

  // 타이핑 상태 처리
  socket.on("typing", (data) => {
    const username = users.get(socket.id);
    if (username) {
      socket.broadcast.emit("typing", {
        username: username,
        isTyping: data.isTyping,
      });
    }
  });

  // 사용자 연결 해제 처리
  socket.on("disconnect", () => {
    const username = users.get(socket.id);
    if (username) {
      users.delete(socket.id);

      // 다른 사용자들에게 사용자 퇴장 알림
      socket.broadcast.emit("user left", {
        username: username,
        message: `${username}님이 채팅방을 나갔습니다.`,
        timestamp: new Date().toLocaleTimeString(),
      });

      // 현재 접속자 수 업데이트
      io.emit("user count", users.size);

      console.log(`${username} left the chat`);
    }

    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
