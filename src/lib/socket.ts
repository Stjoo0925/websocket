import { io } from "socket.io-client";

let socket: any;

if (typeof window !== "undefined") {
  socket = io("http://localhost:3000", {
    path: "/api/socketio",
    transports: ["websocket", "polling"],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    timeout: 10000,
    autoConnect: true,
    forceNew: true,
    upgrade: true,
  });
}

export default socket;
