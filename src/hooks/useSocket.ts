"use client";

import { useEffect, useRef, useState } from "react";
import { Socket, io } from "socket.io-client";

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const initSocket = () => {
      if (!socketRef.current) {
        const socket = io("http://localhost:3000", {
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

        socket.on("connect", () => {
          console.log("Connected to socket server");
          setIsConnected(true);
        });

        socket.on("disconnect", () => {
          console.log("Disconnected from socket server");
          setIsConnected(false);
        });

        socket.on("connect_error", (error) => {
          console.error("Socket connection error:", error);
          setIsConnected(false);
        });

        socketRef.current = socket;
      }
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return { socket: socketRef.current, isConnected };
};
