import { Request, Response } from 'express';
import { NotificationsService } from './notifications.service.js';
import { Controller, Get, Post, Delete, Put } from '../../core/decorators/index.js';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware.js';

@Controller()
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  // Admin endpoint: gets all notifications (SENT, SCHEDULED, DRAFT)
  @Get('/admin/notifications', authenticate)
  public async getAdminNotifications(_req: Request, res: Response) {
    try {
      const notifications = await this.service.getAll();
      res.json({ success: true, notifications });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  // Public / Mobile endpoint: gets ONLY active notifications whose scheduled time has arrived (SENT)
  @Get('/notifications')
  @Get('/customer/notifications')
  public async getClientNotifications(req: Request, res: Response) {
    try {
      const filter = {
        userId: req.query.userId ? String(req.query.userId) : undefined,
        model: req.query.model ? String(req.query.model) : undefined,
        role: req.query.role ? String(req.query.role) : 'CUSTOMER',
      };
      const notifications = await this.service.getPublicNotifications(filter);
      res.json({ success: true, notifications });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Post('/admin/notifications', authenticate, requireRole(['ADMIN', 'CSKH']))
  public async createNotification(req: Request, res: Response) {
    try {
      const notification = await this.service.create(req.body);
      res.json({
        success: true,
        notification,
        message: notification.status === 'SCHEDULED'
          ? 'Đã lên lịch phát sóng thông báo thành công!'
          : 'Đã phát sóng thông báo thành công!',
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Delete('/admin/notifications/:id', authenticate, requireRole(['ADMIN']))
  public async deleteNotification(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await this.service.delete(id);
      res.json({ success: true, message: 'Đã xóa thông báo khỏi hệ thống!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Put('/notifications/:id/read')
  @Put('/admin/notifications/:id/read', authenticate)
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
