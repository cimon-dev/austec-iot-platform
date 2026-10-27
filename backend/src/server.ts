import dotenv from 'dotenv';
dotenv.config();
import { createApp, UnifiedUser } from './app.js';
export { createApp, UnifiedUser };

if (process.env.NODE_ENV !== 'test') {
  const { server, persistAll } = createApp();
  const PORT = process.env.PORT || 4000;
  server.listen(PORT, () => {
    console.log(
      `[AUSTEC IOT BACKEND] Server HTTP & WebSocket đang chạy mượt mà tại http://localhost:${PORT} (WS: ws://localhost:${PORT}/ws/chat)`
    );
  });

  const handleExit = () => {
    try {
      persistAll(true);
    } catch (_) {}
    process.exit(0);
  };
  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);
}
