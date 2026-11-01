const DEFAULT_CLOUD_API_URL = "https://austec-backend.onrender.com";
const DEFAULT_LOCAL_API_URL = "http://localhost:4000";

export function getApiBaseUrl(): string {
  // 1. Kiểm tra cấu hình tùy chọn người dùng đã lưu trong localStorage (nếu có)
  if (typeof window !== "undefined") {
    const customUrl = localStorage.getItem("austec_custom_api_url");
    if (customUrl && customUrl.trim()) {
      let url = customUrl.trim().replace(/\/+$/, "");
      if (url.endsWith("/api")) {
        url = url.slice(0, -4);
      }
      return url;
    }
  }

  // 2. Ưu tiên biến môi trường khai báo trong .env.local hoặc hosting (Vercel)
  if (process.env.NEXT_PUBLIC_API_URL) {
    let url = process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, "");
    if (url.endsWith("/api")) {
      url = url.slice(0, -4);
    }
    return url;
  }

  // 3. Mặc định toàn hệ thống: Kết nối Render Backend Cloud đã deploy và CSDL Supabase
  return DEFAULT_CLOUD_API_URL;
}

export function setCustomApiUrl(url: string | null) {
  if (typeof window !== "undefined") {
    if (url && url.trim()) {
      localStorage.setItem("austec_custom_api_url", url.trim());
    } else {
      localStorage.removeItem("austec_custom_api_url");
    }
  }
}

export function getWsChatUrl(): string {
  // 1. Ưu tiên biến môi trường WebSocket nếu có khai báo
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL.trim().replace(/\/+$/, "");
  }

  // 2. Tự động suy ra WebSocket từ API Base URL (HTTPS => WSS, HTTP => WS)
  const apiBase = getApiBaseUrl();
  if (apiBase.startsWith("http://")) {
    return apiBase.replace("http://", "ws://") + "/ws/chat";
  }
  if (apiBase.startsWith("https://")) {
    return apiBase.replace("https://", "wss://") + "/ws/chat";
  }

  return "ws://localhost:4000/ws/chat";
}

