const { createServer } = require("http");
const { Server } = require("socket.io");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const users = new Map();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    path: "/api/socketio",
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
    connectTimeout: 10000,
    pingTimeout: 5000,
    pingInterval: 10000,
  });

  io.engine.on("connection_error", (err) => {
    console.error("Connection error:", err);
  });

  io.on("connection", (socket) => {
    try {
      console.log("User connected:", socket.id);
      users.set(socket.id, "Anonymous");
      io.emit("user count", users.size);

      socket.on("join", (username) => {
        try {
          console.log("User joined:", username);
          users.set(socket.id, username);
          socket.broadcast.emit("user joined", {
            username,
            message: `${username}님이 입장했습니다.`,
            timestamp: new Date().toLocaleTimeString(),
          });
          io.emit("user count", users.size);
        } catch (error) {
          console.error("Join event error:", error);
        }
      });

      socket.on("chat message", (data) => {
        try {
          const username = users.get(socket.id);
          if (username) {
            const messageData = {
              username,
              ...data,
              timestamp: new Date().toLocaleTimeString(),
            };
            io.emit("chat message", messageData);
          }
        } catch (error) {
          console.error("Chat message event error:", error);
        }
      });

      socket.on("typing", (data) => {
        try {
          const username = users.get(socket.id);
          if (username) {
            socket.broadcast.emit("typing", {
              username,
              isTyping: data.isTyping,
            });
          }
        } catch (error) {
          console.error("Typing event error:", error);
        }
      });

      socket.on("disconnect", () => {
        try {
          const username = users.get(socket.id);
          if (username && username !== "Anonymous") {
            socket.broadcast.emit("user left", {
              username,
              message: `${username}님이 퇴장했습니다.`,
              timestamp: new Date().toLocaleTimeString(),
            });
          }
          users.delete(socket.id);
          io.emit("user count", users.size);
          console.log("User disconnected:", socket.id);
        } catch (error) {
          console.error("Disconnect event error:", error);
        }
      });

      socket.on("error", (error) => {
        console.error("Socket error:", error);
      });
    } catch (error) {
      console.error("Connection handler error:", error);
    }
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
