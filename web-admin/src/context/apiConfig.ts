export function getApiBaseUrl(): string {
  // 1. Prioritize environment variable configured on Vercel or in .env
  if (process.env.NEXT_PUBLIC_API_URL) {
    let url = process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, "");
    if (url.endsWith("/api")) {
      url = url.slice(0, -4);
    }
    return url;
  }

  // 2. Client-side browser detection
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // Local development
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:4000";
    }
    // LAN / local IP address (e.g. 192.168.1.15)
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
      return `http://${host}:4000`;
    }
  }

  return "http://localhost:4000";
}

export function getWsChatUrl(): string {
  // 1. Prioritize WebSocket URL environment variable
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL.trim().replace(/\/+$/, "");
  }

  // 2. Auto-derive from API base URL if specified
  const apiBase = getApiBaseUrl();
  if (apiBase.startsWith("http://")) {
    return apiBase.replace("http://", "ws://") + "/ws/chat";
  }
  if (apiBase.startsWith("https://")) {
    return apiBase.replace("https://", "wss://") + "/ws/chat";
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "ws://localhost:4000/ws/chat";
    }
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
      return `ws://${host}:4000/ws/chat`;
    }
  }

  return "ws://localhost:4000/ws/chat";
}

