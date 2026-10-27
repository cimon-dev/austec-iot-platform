import { Router, Request, Response } from 'express';
import multer from 'multer';
import { storageService } from '../../core/storage/cloudflare-r2.service.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Tối đa 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/svg+xml',
      'image/gif',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận các định dạng ảnh: JPEG, PNG, WebP, SVG, GIF!'));
    }
  },
});

export const uploadRouter = Router();

/**
 * POST /api/upload/image
 * Nhận file ảnh qua multipart/form-data (trường 'file' hoặc 'image')
 * Upload trực tiếp lên Cloudflare R2 và trả về CDN URL công khai
 */
uploadRouter.post(
  '/image',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, error: 'Vui lòng đính kèm file ảnh hợp lệ!' });
        return;
      }

      const folder = (req.body.folder as string) || 'devices';
      const result = await storageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        folder
      );

      res.json({
        success: true,
        message: 'Tải ảnh lên Cloudflare R2 thành công!',
        url: result.url,
        key: result.key,
        filename: file.originalname,
        size: result.size,
        mimeType: result.mimeType,
      });
    } catch (err: any) {
      console.error('[UploadRouter] Lỗi tải file ảnh:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Lỗi xử lý khi tải ảnh lên máy chủ lưu trữ!',
      });
    }
  }
);
