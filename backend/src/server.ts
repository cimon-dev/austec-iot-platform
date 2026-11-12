import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Nạp backend/.env (chứa bí mật DB/R2/JWT) trước, sau đó nạp root .env tập trung (override=true)
const backendEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(process.cwd(), 'austec-iot-platform/backend/.env'),
];
for (const p of backendEnvPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: false });
    break;
  }
}

const rootEnvPaths = [
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'austec-iot-platform/.env'),
];
for (const p of rootEnvPaths) {
  if (fs.existsSync(p) && p !== backendEnvPaths[0]) {
    dotenv.config({ path: p, override: true });
    break;
  }
}
dotenv.config();
import { createApp, UnifiedUser } from './app.js';
export { createApp, UnifiedUser };

if (process.env.NODE_ENV !== 'test') {
  const { server, persistAll } = createApp();
  const PORT = process.env.PORT || process.env.BACKEND_PORT || 4000;
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
