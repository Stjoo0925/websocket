"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Send } from "lucide-react";
import axios from "axios";
import socket from "@/lib/socket";

interface Message {
  username: string;
  message: string;
  timestamp: string;
  type?: "text" | "image" | "system";
  imageUrl?: string;
  originalName?: string;
}

export default function Chat() {
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log("Connected to socket server");
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log("Disconnected from socket server");
      setIsConnected(false);
    };

    const handleConnectError = (error: Error) => {
      console.error("Socket connection error:", error);
      setIsConnected(false);
    };

    const handleChatMessage = (data: Message) => {
      setMessages((prev) => [...prev, data]);
    };

    const handleUserJoined = (data: Message) => {
      setMessages((prev) => [...prev, { ...data, type: "system" }]);
    };

    const handleUserLeft = (data: Message) => {
      setMessages((prev) => [...prev, { ...data, type: "system" }]);
    };

    const handleUserCount = (count: number) => {
      setUserCount(count);
    };

    const handleTyping = (data: { username: string; isTyping: boolean }) => {
      setTypingUser(data.username);
      setIsTyping(data.isTyping);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("chat message", handleChatMessage);
    socket.on("user joined", handleUserJoined);
    socket.on("user left", handleUserLeft);
    socket.on("user count", handleUserCount);
    socket.on("typing", handleTyping);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("chat message", handleChatMessage);
      socket.off("user joined", handleUserJoined);
      socket.off("user left", handleUserLeft);
      socket.off("user count", handleUserCount);
      socket.off("typing", handleTyping);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleJoin = () => {
    if (!username.trim() || !socket || !isConnected) return;
    socket.emit("join", username);
    setIsLoggedIn(true);
  };

  const handleSendMessage = () => {
    if (!message.trim() || !socket || !isConnected) return;
    socket.emit("chat message", { message });
    setMessage("");
  };

  const handleTyping = () => {
    if (!socket || !isConnected) return;

    socket.emit("typing", { isTyping: true });

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(() => {
      if (socket) {
        socket.emit("typing", { isTyping: false });
      }
    }, 1000);
  };

  const handleImageUpload = async (file: File) => {
    if (!socket || !isConnected) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await axios.post("/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const result = response.data;

      if (result.success) {
        socket.emit("chat message", {
          type: "image",
          message: `이미지를 공유했습니다: ${result.originalName}`,
          imageUrl: result.imageUrl,
          originalName: result.originalName,
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[600px] relative">
        {!isLoggedIn ? (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-[300px]">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                채팅 입장
              </h2>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="사용자 이름 입력"
                maxLength={20}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 mb-4"
              />
              <button
                onClick={handleJoin}
                className="w-full bg-indigo-500 text-white py-2 rounded-lg hover:bg-indigo-600 transition-colors"
              >
                입장하기
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-xl h-full flex flex-col overflow-hidden">
            <div className="bg-indigo-500 text-white p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <h1 className="text-xl font-bold">실시간 채팅</h1>
                <div className="flex flex-col items-start sm:items-end text-sm">
                  <span>{username}님</span>
                  <span className="opacity-90">접속자: {userCount}명</span>
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`mb-4 max-w-[70%] ${
                    msg.type === "system"
                      ? "mx-auto bg-yellow-100 text-gray-700 text-center"
                      : msg.username === username
                      ? "ml-auto bg-indigo-500 text-white"
                      : "bg-white border border-gray-200"
                  } rounded-lg p-3 break-words`}
                >
                  {msg.type !== "system" && (
                    <div className="font-bold text-sm mb-1">{msg.username}</div>
                  )}
                  <div>{msg.message}</div>
                  {msg.type === "image" && (
                    <img
                      src={msg.imageUrl}
                      alt={msg.originalName}
                      className="mt-2 max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  )}
                  <div className="text-xs opacity-70 mt-1">{msg.timestamp}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="text-sm italic text-gray-600 px-4 min-h-[1.5rem]">
              {isTyping && `${typingUser}님이 입력 중...`}
            </div>

            <div className="p-4 bg-white border-t border-gray-200 flex items-center gap-2">
              <button
                className="w-12 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full border-2 border-gray-300 transition-colors"
                onClick={() => document.getElementById("imageInput")?.click()}
              >
                <Camera className="w-6 h-6 text-gray-600" />
              </button>
              <input
                type="file"
                id="imageInput"
                hidden
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedImage(file);
                    setShowImagePreview(true);
                  }
                }}
              />
              <input
                type="text"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping();
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleSendMessage();
                  }
                }}
                placeholder="메시지를 입력하세요..."
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-full focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleSendMessage}
                className="px-6 py-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors flex items-center gap-2"
              >
                <span>전송</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {showImagePreview && selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                이미지 미리보기
              </h3>
              <img
                src={URL.createObjectURL(selectedImage)}
                alt="Preview"
                className="max-w-full max-h-[300px] rounded-lg"
              />
              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={() => {
                    setShowImagePreview(false);
                    setSelectedImage(null);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    if (selectedImage) {
                      handleImageUpload(selectedImage);
                      setShowImagePreview(false);
                      setSelectedImage(null);
                    }
                  }}
                  className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  전송
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
