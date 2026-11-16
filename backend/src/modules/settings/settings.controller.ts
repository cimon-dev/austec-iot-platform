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
      const latestVersion = process.env.APP_LATEST_VERSION || '2.1.0';
      const buildCode = parseInt(process.env.APP_BUILD_CODE || '13', 10);
      const minRequiredVersion = process.env.APP_MIN_VERSION || '2.0.0';
      const minRequiredBuild = parseInt(process.env.APP_MIN_BUILD || '10', 10);
      const forceUpdate = process.env.APP_FORCE_UPDATE === 'true';

      const host = req.get('host') || 'localhost:4000';
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const baseUrl = `${protocol}://${host}`;

      const apkUrl = process.env.APP_APK_URL || `${baseUrl}/api/system/download-apk`;

      const releaseNotes = process.env.APP_RELEASE_NOTES ||
        'Bản cập nhật v2.1.0:\n• Tự động kiểm tra và nâng cấp ứng dụng trực tiếp (In-App OTA)\n• Bổ sung điều khiển Công tơ điện tử chống giật thông minh\n• Tối ưu phân quyền thành viên gia đình và bảo mật\n• Nâng cấp giao diện điều khiển và sửa các lỗi phát sinh';

      res.json({
        success: true,
        latestVersion,
        buildCode,
        minRequiredVersion,
        minRequiredBuild,
        apkUrl,
        directApkUrl: `${baseUrl}/downloads/Austec_IoT_latest.apk`,
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

      if (process.env.APP_APK_URL) {
        return res.redirect(process.env.APP_APK_URL);
      }

      res.status(404).json({
        success: false,
        message: 'Chưa có file APK nào được tải lên máy chủ!',
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}

