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
  const apkPath = path.resolve(__dirname, '../../dist-apk/Austec_IoT_v2.5.1.apk');
  console.log('Reading APK from:', apkPath);
  const file = fs.readFileSync(apkPath);
  console.log('Size:', (file.length / (1024 * 1024)).toFixed(2), 'MB');

  console.log('1. Uploading releases/Austec_IoT_v2.5.1.apk...');
  await s3.send(new PutObjectCommand({
    Bucket: 'austec-media',
    Key: 'releases/Austec_IoT_v2.5.1.apk',
    Body: file,
    ContentType: 'application/vnd.android.package-archive',
    CacheControl: 'public, max-age=31536000, immutable'
  }));
  console.log('-> Success: https://pub-fd6df13a6cc4417c8cf0051aebc9758d.r2.dev/releases/Austec_IoT_v2.5.1.apk');

  console.log('2. Uploading releases/Austec_IoT_latest.apk...');
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
  console.error('Upload failed:', err);
  process.exit(1);
});

