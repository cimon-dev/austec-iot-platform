const DEFAULT_CLOUD_API_URL = "https://austec-backend.onrender.com";

export function getApiBaseUrl(): string {
  // 1. Ưu tiên biến môi trường khai báo trong .env.local hoặc hosting (Vercel)
  if (process.env.NEXT_PUBLIC_API_URL) {
    let url = process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, "");
    if (url.endsWith("/api")) {
      url = url.slice(0, -4);
    }
    return url;
  }

  // 2. Mặc định toàn hệ thống: Kết nối thẳng tới Backend Cloud đã deploy trên Render
  return DEFAULT_CLOUD_API_URL;
}

export function getWsChatUrl(): string {
  // 1. Ưu tiên biến môi trường WebSocket nếu có khai báo
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL.trim().replace(/\/+$/, "");
  }

  // 2. Tự động suy ra WebSocket từ API Base URL (HTTPS => WSS)
  const apiBase = getApiBaseUrl();
  if (apiBase.startsWith("http://")) {
    return apiBase.replace("http://", "ws://") + "/ws/chat";
  }
  if (apiBase.startsWith("https://")) {
    return apiBase.replace("https://", "wss://") + "/ws/chat";
  }

  return "wss://austec-backend.onrender.com/ws/chat";
}
