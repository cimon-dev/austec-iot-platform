const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://3a2142b45c2f1bc8c78db6a8f7abb11d.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'cec868128e2417eef6a9c76c6592aa8c',
    secretAccessKey: '8a3d5f86feb452d95a2b6e7ed3acc4079b1250ea8134f448728d98097bbcec4b'
  }
});

async function main() {
  const buildApk = path.resolve(__dirname, '../../mobile-app/build/app/outputs/flutter-apk/app-release.apk');
  const distDir = path.resolve(__dirname, '../../dist-apk');
  const v275Apk = path.join(distDir, 'Austec_IoT_v2.7.5.apk');
  const latestApk = path.join(distDir, 'Austec_IoT_latest.apk');

  console.log('Copying built APK from:', buildApk);
  fs.copyFileSync(buildApk, v275Apk);
  fs.copyFileSync(buildApk, latestApk);

  const file = fs.readFileSync(v275Apk);
  console.log('Size:', (file.length / (1024 * 1024)).toFixed(2), 'MB');

  console.log('1. Uploading releases/Austec_IoT_v2.7.5.apk to R2...');
  await s3.send(new PutObjectCommand({
    Bucket: 'austec-media',
    Key: 'releases/Austec_IoT_v2.7.5.apk',
    Body: file,
    ContentType: 'application/vnd.android.package-archive',
    CacheControl: 'public, max-age=31536000, immutable'
  }));
  console.log('-> Success: https://pub-fd6df13a6cc4417c8cf0051aebc9758d.r2.dev/releases/Austec_IoT_v2.7.5.apk');

  console.log('2. Uploading releases/Austec_IoT_latest.apk to R2...');
  await s3.send(new PutObjectCommand({
    Bucket: 'austec-media',
    Key: 'releases/Austec_IoT_latest.apk',
    Body: file,
    ContentType: 'application/vnd.android.package-archive',
    CacheControl: 'public, max-age=60, no-cache'
  }));
  console.log('-> Success: https://pub-fd6df13a6cc4417c8cf0051aebc9758d.r2.dev/releases/Austec_IoT_latest.apk');
}

main().catch(err => {
  console.error('Deploy failed:', err);
  process.exit(1);
});
