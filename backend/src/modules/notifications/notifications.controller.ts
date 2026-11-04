import { Request, Response } from 'express';
import { NotificationsService } from './notifications.service.js';
import { Controller, Get, Post, Delete, Put } from '../../core/decorators/index.js';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware.js';

@Controller()
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get('/admin/notifications', authenticate)
  @Get('/notifications', authenticate)
  public async getNotifications(_req: Request, res: Response) {
    try {
      const notifications = await this.service.getAll();
      res.json({ success: true, notifications });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Post('/admin/notifications', authenticate, requireRole(['ADMIN', 'CSKH']))
  @Post('/notifications', authenticate, requireRole(['ADMIN', 'CSKH']))
  public async createNotification(req: Request, res: Response) {
    try {
      const notification = await this.service.create(req.body);
      res.json({
        success: true,
        notification,
        message: 'Đã phát sóng thông báo thành công!',
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Delete('/admin/notifications/:id', authenticate, requireRole(['ADMIN']))
  @Delete('/notifications/:id', authenticate, requireRole(['ADMIN']))
  public async deleteNotification(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await this.service.delete(id);
      res.json({ success: true, message: 'Đã xóa thông báo khỏi hệ thống!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Put('/admin/notifications/:id/read', authenticate)
  @Put('/notifications/:id/read', authenticate)
  public async markAsRead(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await this.service.markAsRead(id);
      res.json({ success: true, message: 'Đã đánh dấu đã đọc!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }
}
