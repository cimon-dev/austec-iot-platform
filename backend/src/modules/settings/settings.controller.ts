import { Request, Response } from 'express';
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
}

