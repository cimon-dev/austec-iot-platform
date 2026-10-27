import { Request, Response } from 'express';
import { SettingsService } from './settings.service.js';

export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  public getSettings = async (_req: Request, res: Response) => {
    try {
      const settings = await this.settingsService.getSettings();
      res.json({ success: true, settings });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  };

  public updateSettings = async (req: Request, res: Response) => {
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
  };
}
