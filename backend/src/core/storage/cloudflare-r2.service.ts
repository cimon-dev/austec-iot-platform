import dotenv from 'dotenv';
dotenv.config();
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { IStorageService, UploadResult } from './storage.interface.js';

export class CloudflareR2StorageService implements IStorageService {
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private publicDomain: string;
  private isConfigured: boolean = false;
  private localUploadsDir: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucketName = process.env.R2_BUCKET_NAME || 'austec-media';
    this.publicDomain = (process.env.R2_PUBLIC_DOMAIN || 'https://pub-fd6df13a6cc4417c8cf0051aebc9758d.r2.dev').replace(/\/+$/, '');

    // Đường dẫn fallback lưu local khi cần
    this.localUploadsDir = path.resolve(process.cwd(), 'public/uploads');

    if (accountId && accessKeyId && secretAccessKey) {
      try {
        this.s3Client = new S3Client({
          region: 'auto',
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });
        this.isConfigured = true;
        console.log(`[Storage] Đã khởi tạo Cloudflare R2 Client thành công cho bucket: ${this.bucketName}`);
      } catch (err: any) {
        console.error('[Storage] Không thể khởi tạo S3 Client cho Cloudflare R2:', err.message);
      }
    } else {
      console.warn('[Storage] Thiếu thông tin R2 credentials trong .env, sẽ dùng Local Disk Fallback.');
    }
  }

  public async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    folderPrefix: string = 'devices'
  ): Promise<UploadResult> {
    const ext = path.extname(originalName).toLowerCase() || '.webp';
    const cleanPrefix = folderPrefix.replace(/^\/+|\/+$/g, '');
    const randomSuffix = crypto.randomBytes(6).toString('hex');
    const filename = `${Date.now()}_${randomSuffix}${ext}`;
    const key = `${cleanPrefix}/${filename}`;

    // 1. Nếu có cấu hình R2 -> Upload lên Cloudflare R2
    if (this.isConfigured && this.s3Client) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: mimeType,
          CacheControl: 'public, max-age=31536000, immutable',
        });

        await this.s3Client.send(command);
        const publicUrl = `${this.publicDomain}/${key}`;

        console.log(`[Storage] Đã tải lên Cloudflare R2 thành công: ${publicUrl}`);
        return {
          url: publicUrl,
          key,
          size: fileBuffer.length,
          mimeType,
        };
      } catch (r2Error: any) {
        console.error('[Storage] Lỗi khi upload lên Cloudflare R2, chuyển sang lưu Local:', r2Error.message);
      }
    }

    // 2. Fallback: Lưu vào thư mục public/uploads
    if (!fs.existsSync(this.localUploadsDir)) {
      fs.mkdirSync(this.localUploadsDir, { recursive: true });
    }
    const localFilePath = path.join(this.localUploadsDir, filename);
    fs.writeFileSync(localFilePath, fileBuffer);

    const localUrl = `/uploads/${filename}`;
    console.log(`[Storage] Đã lưu file cục bộ: ${localUrl}`);

    return {
      url: localUrl,
      key: `local/${filename}`,
      size: fileBuffer.length,
      mimeType,
    };
  }

  public async deleteFile(key: string): Promise<boolean> {
    if (this.isConfigured && this.s3Client && !key.startsWith('local/')) {
      try {
        const command = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        });
        await this.s3Client.send(command);
        console.log(`[Storage] Đã xóa file trên Cloudflare R2: ${key}`);
        return true;
      } catch (e: any) {
        console.error('[Storage] Lỗi khi xóa file trên Cloudflare R2:', e.message);
        return false;
      }
    }

    // Xóa file local nếu có
    if (key.startsWith('local/')) {
      const filename = path.basename(key);
      const filePath = path.join(this.localUploadsDir, filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          return true;
        } catch {}
      }
    }

    return false;
  }
}

// Singleton instance
export const storageService = new CloudflareR2StorageService();
