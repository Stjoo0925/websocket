import api from "./axios";

// 메시지 관련 타입
export interface Message {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  type: "text" | "image";
  imageUrl?: string;
  originalName?: string;
}

// 이미지 업로드 응답 타입
export interface UploadResponse {
  success: boolean;
  imageUrl: string;
  originalName: string;
}

// 메시지 전송
export const sendMessage = async (
  message: Omit<Message, "id" | "timestamp">
) => {
  const response = await api.post<Message>("/api/messages", message);
  return response.data;
};

// 이미지 업로드
export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append("image", file);

  const response = await api.post<UploadResponse>("/api/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// 메시지 목록 조회
export const getMessages = async () => {
  const response = await api.get<Message[]>("/api/messages");
  return response.data;
};
