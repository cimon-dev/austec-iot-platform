import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { SettingsService } from './settings.service.js';
import { Controller, Get, Put } from '../../core/decorators/index.js';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware.js';

@Controller()
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get('/admin/settings', authenticate)
  @Get('/settings', authenticate)
  public async getSettings(_req: Request, res: Response) {
    try {
      const settings = await this.settingsService.getSettings();
      res.json({ success: true, settings });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Put('/admin/settings', authenticate, requireRole(['ADMIN']))
  @Put('/settings', authenticate, requireRole(['ADMIN']))
  public async updateSettings(req: Request, res: Response) {
    try {
      const settings = await this.settingsService.updateSettings(req.body);
      res.json({
        success: true,
        message: 'Cập nhật thiết lập hệ thống thành công!',
        settings,
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /**
   * GET /api/system/app-version hoặc /api/app/version
   * Public API cho Mobile App kiểm tra phiên bản mới nhất và link tải APK
   */
  @Get('/system/app-version')
  @Get('/app/version')
  public async getAppVersion(req: Request, res: Response) {
    try {
      const latestVersion = process.env.APP_LATEST_VERSION || '2.4.0';
      const buildCode = parseInt(process.env.APP_BUILD_CODE || '16', 10);
      const minRequiredVersion = process.env.APP_MIN_VERSION || '2.0.0';
      const minRequiredBuild = parseInt(process.env.APP_MIN_BUILD || '10', 10);
      const forceUpdate = process.env.APP_FORCE_UPDATE === 'true';

      const host = req.get('host') || 'localhost:4000';
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const baseUrl = `${protocol}://${host}`;

      const directApkUrl = process.env.APP_DIRECT_APK_URL || 'http://103.82.39.109/Austec_IoT_latest.apk';
      const apkUrl = process.env.APP_APK_URL || `${baseUrl}/api/system/download-apk`;

      const releaseNotes = process.env.APP_RELEASE_NOTES ||
        'Bản cập nhật v2.4.0:\n• Tối ưu luồng Camera WebRTC mở tức thì dưới 1.5s\n• Tự động kết nối lại ngầm khi mạng Wi-Fi/4G gián đoạn\n• Nâng cấp xung nhịp camera 20MHz tăng độ mượt mà\n• Cải thiện hiệu năng và tối ưu hóa toàn diện';

      res.json({
        success: true,
        latestVersion,
        buildCode,
        minRequiredVersion,
        minRequiredBuild,
        apkUrl,
        directApkUrl,
        releaseNotes,
        forceUpdate,
        publishedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * GET /api/system/download-apk hoặc /api/app/download
   * Phục vụ tải trực tiếp file APK mới nhất
   */
  @Get('/system/download-apk')
  @Get('/app/download')
  public async downloadLatestApk(_req: Request, res: Response) {
    try {
      const candidates = [
        path.resolve(process.cwd(), 'public/downloads/Austec_IoT_latest.apk'),
        path.resolve(process.cwd(), 'public/downloads/Austec_IoT_v2.1.0.apk'),
        path.resolve(process.cwd(), '../dist-apk/Austec_IoT_latest.apk'),
        path.resolve(process.cwd(), '../dist-apk/Austec_IoT_v2.1.0.apk'),
        path.resolve(process.cwd(), '../../dist-apk/Austec_IoT_latest.apk'),
      ];

      for (const p of candidates) {
        if (fs.existsSync(p)) {
          return res.download(p, 'Austec_IoT_latest.apk');
        }
      }

      const fallbackUrl = process.env.APP_APK_URL || process.env.APP_DIRECT_APK_URL || 'http://103.82.39.109/Austec_IoT_latest.apk';
      return res.redirect(fallbackUrl);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}

