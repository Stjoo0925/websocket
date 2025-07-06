// Socket.IO 연결
const socket = io();

// DOM 요소들
const loginModal = document.getElementById("loginModal");
const chatContainer = document.getElementById("chatContainer");
const usernameInput = document.getElementById("usernameInput");
const joinBtn = document.getElementById("joinBtn");
const currentUserSpan = document.getElementById("currentUser");
const userCountSpan = document.getElementById("userCount");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const typingIndicator = document.getElementById("typingIndicator");
const imageInput = document.getElementById("imageInput");
const imageBtn = document.getElementById("imageBtn");
const imagePreviewModal = document.getElementById("imagePreviewModal");
const previewImage = document.getElementById("previewImage");
const cancelImageBtn = document.getElementById("cancelImageBtn");
const sendImageBtn = document.getElementById("sendImageBtn");

// 전역 변수
let currentUsername = "";
let typingTimer;
let isTyping = false;
let selectedImageFile = null;

// 초기화
document.addEventListener("DOMContentLoaded", () => {
  // 사용자 이름 입력 필드에 포커스
  usernameInput.focus();

  // 엔터 키로 입장하기
  usernameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      joinChat();
    }
  });

  // 입장 버튼 클릭
  joinBtn.addEventListener("click", joinChat);

  // 메시지 전송 이벤트
  sendBtn.addEventListener("click", sendMessage);
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  // 타이핑 감지
  messageInput.addEventListener("input", handleTyping);

  // 이미지 업로드 이벤트
  imageBtn.addEventListener("click", () => {
    imageInput.click();
  });

  imageInput.addEventListener("change", handleImageSelect);
  cancelImageBtn.addEventListener("click", closeImagePreview);
  sendImageBtn.addEventListener("click", sendImage);
});

// 채팅방 입장
function joinChat() {
  const username = usernameInput.value.trim();

  if (username === "") {
    alert("사용자 이름을 입력해주세요.");
    return;
  }

  if (username.length > 20) {
    alert("사용자 이름은 20자 이하로 입력해주세요.");
    return;
  }

  currentUsername = username;
  currentUserSpan.textContent = `${username}님`;

  // 서버에 입장 알림
  socket.emit("join", username);

  // 모달 숨기고 채팅 화면 표시
  loginModal.style.display = "none";
  chatContainer.style.display = "block";

  // 메시지 입력 필드에 포커스
  messageInput.focus();
}

// 메시지 전송
function sendMessage() {
  const message = messageInput.value.trim();

  if (message === "") {
    return;
  }

  // 서버로 메시지 전송
  socket.emit("chat message", { message: message });

  // 입력 필드 초기화
  messageInput.value = "";

  // 타이핑 상태 해제
  if (isTyping) {
    socket.emit("typing", { isTyping: false });
    isTyping = false;
  }
}

// 타이핑 상태 처리
function handleTyping() {
  if (!isTyping) {
    socket.emit("typing", { isTyping: true });
    isTyping = true;
  }

  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    socket.emit("typing", { isTyping: false });
    isTyping = false;
  }, 1000);
}

// 이미지 선택 처리
function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // 파일 크기 체크 (5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert("파일 크기가 5MB를 초과합니다.");
    return;
  }

  // 이미지 파일 체크
  if (!file.type.startsWith("image/")) {
    alert("이미지 파일만 업로드 가능합니다.");
    return;
  }

  selectedImageFile = file;

  // 미리보기 표시
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    imagePreviewModal.style.display = "flex";
  };
  reader.readAsDataURL(file);
}

// 이미지 미리보기 닫기
function closeImagePreview() {
  imagePreviewModal.style.display = "none";
  selectedImageFile = null;
  imageInput.value = "";
}

// 이미지 전송
async function sendImage() {
  if (!selectedImageFile) return;

  const formData = new FormData();
  formData.append("image", selectedImageFile);

  try {
    // 전송 버튼 비활성화
    sendImageBtn.disabled = true;
    sendImageBtn.textContent = "업로드 중...";

    const response = await fetch("/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      // 이미지 메시지 전송
      socket.emit("chat message", {
        type: "image",
        message: `이미지를 공유했습니다: ${result.originalName}`,
        imageUrl: result.imageUrl,
        originalName: result.originalName,
      });

      // 미리보기 모달 닫기
      closeImagePreview();
    } else {
      alert("이미지 업로드에 실패했습니다: " + result.error);
    }
  } catch (error) {
    console.error("Upload error:", error);
    alert("이미지 업로드 중 오류가 발생했습니다.");
  } finally {
    // 전송 버튼 복구
    sendImageBtn.disabled = false;
    sendImageBtn.textContent = "전송";
  }
}

// 메시지 화면에 추가
function addMessage(data, type = "other") {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${type}`;

  if (type === "system") {
    messageDiv.innerHTML = `
            <div>${data.message}</div>
            <div class="message-time">${data.timestamp}</div>
        `;
  } else {
    const isOwnMessage = data.username === currentUsername;
    messageDiv.className = `message ${isOwnMessage ? "own" : "other"}`;

    let messageContent = "";
    if (data.type === "image") {
      messageContent = `
        <div class="message-header">${data.username}</div>
        <div>${data.message}</div>
        <img src="${data.imageUrl}" alt="${data.originalName}" class="message-image" onclick="openImageModal('${data.imageUrl}')">
        <div class="message-time">${data.timestamp}</div>
      `;
    } else {
      messageContent = `
        <div class="message-header">${data.username}</div>
        <div>${data.message}</div>
        <div class="message-time">${data.timestamp}</div>
      `;
    }

    messageDiv.innerHTML = messageContent;
  }

  messagesDiv.appendChild(messageDiv);
  scrollToBottom();
}

// 이미지 클릭 시 큰 화면으로 보기
function openImageModal(imageUrl) {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.display = "flex";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 90%; max-height: 90%; background: transparent; box-shadow: none;">
      <img src="${imageUrl}" style="max-width: 100%; max-height: 100%; border-radius: 8px;">
    </div>
  `;

  modal.addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  document.body.appendChild(modal);
}

// 채팅 창 맨 아래로 스크롤
function scrollToBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Socket.IO 이벤트 리스너들

// 채팅 메시지 수신
socket.on("chat message", (data) => {
  addMessage(data);
});

// 사용자 입장 알림
socket.on("user joined", (data) => {
  addMessage(data, "system");
});

// 사용자 퇴장 알림
socket.on("user left", (data) => {
  addMessage(data, "system");
});

// 접속자 수 업데이트
socket.on("user count", (count) => {
  userCountSpan.textContent = `접속자: ${count}명`;
});

// 타이핑 상태 표시
socket.on("typing", (data) => {
  if (data.isTyping) {
    typingIndicator.textContent = `${data.username}님이 입력 중...`;
  } else {
    typingIndicator.textContent = "";
  }
});

// 연결 상태 관리
socket.on("connect", () => {
  console.log("Connected to server");
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
  // 재연결 시도 메시지 표시
  addMessage(
    {
      message: "서버와의 연결이 끊어졌습니다. 재연결을 시도합니다...",
      timestamp: new Date().toLocaleTimeString(),
    },
    "system"
  );
});

socket.on("reconnect", () => {
  console.log("Reconnected to server");
  addMessage(
    {
      message: "서버에 다시 연결되었습니다.",
      timestamp: new Date().toLocaleTimeString(),
    },
    "system"
  );

  // 재연결 시 사용자 정보 다시 전송
  if (currentUsername) {
    socket.emit("join", currentUsername);
  }
});
