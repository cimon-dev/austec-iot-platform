import { Request, Response } from 'express';
import multer from 'multer';
import { Controller, Post } from '../../core/decorators/index.js';
import { storageService } from '../../core/storage/cloudflare-r2.service.js';

export const uploadMulter = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // Tối đa 50MB cho tệp đa phương tiện & tài liệu
  },
  fileFilter: (_req, file, cb) => {
    // Chấp nhận ảnh, video, âm thanh và các định dạng tài liệu phổ biến
    const allowedMimePrefixes = ['image/', 'video/', 'audio/', 'text/'];
    const allowedSpecificMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/octet-stream',
      'application/json',
    ];

    const isAllowed = 
      allowedMimePrefixes.some(prefix => file.mimetype.startsWith(prefix)) ||
      allowedSpecificMimes.includes(file.mimetype);

    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error(`Định dạng tệp không được hỗ trợ (${file.mimetype}). Vui lòng chọn tệp ảnh, video hoặc tài liệu hợp lệ!`));
    }
  },
});

function detectMediaType(mimeType: string, filename: string): 'image' | 'video' | 'file' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'].includes(ext || '')) return 'image';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp'].includes(ext || '')) return 'video';
  return 'file';
}

@Controller('/upload')
export class UploadController {
  /**
   * POST /api/upload/image
   * Upload hình ảnh lên Cloudflare R2 (giữ tương thích)
   */
  @Post('/image', uploadMulter.single('file'))
  public async uploadImage(req: Request, res: Response): Promise<void> {
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
        mediaType: 'image',
      });
    } catch (err: any) {
      console.error('[UploadController] Lỗi tải file ảnh:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Lỗi xử lý khi tải ảnh lên máy chủ lưu trữ!',
      });
    }
  }

  /**
   * POST /api/upload/file hoặc /api/upload/chat-attachment
   * Nhận đa định dạng: hình ảnh, video, tài liệu tệp tin đính kèm
   * Lưu trữ trực tiếp lên Cloudflare R2
   */
  @Post('/file', uploadMulter.single('file'))
  @Post('/chat-attachment', uploadMulter.single('file'))
  public async uploadAttachment(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, error: 'Vui lòng chọn tệp tin hoặc hình ảnh/video hợp lệ!' });
        return;
      }

      const folder = (req.body.folder as string) || 'chat-attachments';
      const result = await storageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        folder
      );

      const mediaType = detectMediaType(file.mimetype, file.originalname);

      res.json({
        success: true,
        message: 'Tải tệp đính kèm lên Cloudflare R2 thành công!',
        url: result.url,
        key: result.key,
        filename: file.originalname,
        size: result.size,
        mimeType: result.mimeType,
        mediaType,
      });
    } catch (err: any) {
      console.error('[UploadController] Lỗi tải tệp đính kèm:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Lỗi xử lý khi tải tệp lên Cloudflare R2!',
      });
    }
  }
}
