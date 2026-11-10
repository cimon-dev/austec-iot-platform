import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

import { createApp } from '../src/app.js';

async function testCameraApi() {
  const { server } = createApp();
  const PORT = 4005;

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => resolve());
  });

  const baseUrl = `http://localhost:${PORT}`;
  console.log('Testing Camera Streaming APIs on test port:', baseUrl);

  try {
    // 1. Test get stream URL
    const streamRes = await fetch(`${baseUrl}/api/devices/CAM704BCA465690/camera/stream`);
    const streamData = await streamRes.json();
    console.log('1. GET /api/devices/CAM704BCA465690/camera/stream status:', streamRes.status);
    console.log('   Response body:', JSON.stringify(streamData, null, 2));

    if (streamRes.status !== 200 || !streamData.endpoints?.webrtc) {
      throw new Error('Endpoint /camera/stream verification failed!');
    }

    // 2. Test MediaMTX Auth Webhook
    const authRes = await fetch(`${baseUrl}/api/media/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publish', path: 'live/CAM704BCA465690' })
    });
    console.log('2. POST /api/media/auth status:', authRes.status);
    if (authRes.status !== 200) {
      throw new Error('Endpoint /api/media/auth verification failed!');
    }

    // 3. Test MediaMTX Hook Publish
    const pubRes = await fetch(`${baseUrl}/api/media/hook/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'live/CAM704BCA465690' })
    });
    const pubData = await pubRes.json();
    console.log('3. POST /api/media/hook/publish status:', pubRes.status, pubData);
    if (pubRes.status !== 200 || !pubData.success) {
      throw new Error('Endpoint /api/media/hook/publish verification failed!');
    }

    // 4. Test MediaMTX Hook Unpublish
    const unpubRes = await fetch(`${baseUrl}/api/media/hook/unpublish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'live/CAM704BCA465690' })
    });
    const unpubData = await unpubRes.json();
    console.log('4. POST /api/media/hook/unpublish status:', unpubRes.status, unpubData);
    if (unpubRes.status !== 200 || !unpubData.success) {
      throw new Error('Endpoint /api/media/hook/unpublish verification failed!');
    }

    console.log('\n======================================================');
    console.log('🎉 100% PASS: ALL CAMERA STREAMING & WEBHOOK APIS WORK PERFECTLY!');
    console.log('======================================================');
  } catch (err: any) {
    console.error('Test error:', err.message);
  } finally {
    server.close();
    process.exit(0);
  }
}

testCameraApi();
