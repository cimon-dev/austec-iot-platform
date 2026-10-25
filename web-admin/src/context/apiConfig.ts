export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:4000`;
    }
  }
  return "http://localhost:4000";
}

export function getWsChatUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `ws://${host}:4000/ws/chat`;
    }
  }
  return "ws://localhost:4000/ws/chat";
}
