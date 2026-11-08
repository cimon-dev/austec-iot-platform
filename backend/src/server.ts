import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Tự động tìm .env ở cả thư mục hiện tại và thư mục module backend
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'austec-iot-platform/backend/.env'),
  path.resolve(process.cwd(), 'backend/.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}
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

  process.on('uncaughtException', (err) => {
    console.error('[Server] uncaughtException caught:', err?.message || err);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('[Server] unhandledRejection caught:', reason);
  });
}
