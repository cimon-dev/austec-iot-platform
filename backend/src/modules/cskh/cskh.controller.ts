import { Request, Response } from 'express';
import { CskhService } from './cskh.service.js';
import { CreateTicketSchema, SendMessageSchema } from './dto/cskh.dto.js';
import { AuthenticatedRequest } from '../../services/auth.service.js';
import { Controller, Get, Post, Put } from '../../core/decorators/index.js';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware.js';
import { PostgresClient, postgresClient } from '../../core/database/postgres.client.js';

@Controller('/cskh')
export class CskhController {
  constructor(
    private service: CskhService = new CskhService(),
    private client: PostgresClient = postgresClient
  ) {}

  @Get('/tickets', authenticate, requireRole(['ADMIN', 'CSKH']))
  public async getTickets(_req: Request, res: Response) {
    try {
      const tickets = await this.service.getTickets();
      res.json({ success: true, total: tickets.length, tickets });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Get('/active-chat', authenticate)
  public async getActiveChat(req: AuthenticatedRequest, res: Response) {
    try {
      const customerId = (req.query.customerId as string) || req.user?.id;
      if (!customerId) {
        return res.status(400).json({ success: false, error: 'Thiếu customerId' });
      }
      const data = await this.service.getActiveChat(customerId);
      res.json({
        success: true,
        hasActiveConversation: !!data.ticket,
        ticket: data.ticket,
        messages: data.messages,
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Post('/tickets', authenticate)
  public async createTicket(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = CreateTicketSchema.parse({
        ...req.body,
        customerId: req.body.customerId || req.user?.id,
      });
      const ticket = await this.service.createTicket(parsed);
      res.status(201).json({ success: true, message: 'Đã tạo yêu cầu hỗ trợ thành công!', ticket });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Put('/tickets/:id/status', authenticate, requireRole(['ADMIN', 'CSKH']))
  public async updateStatus(req: Request, res: Response) {
    try {
      const { status } = req.body;
      await this.service.updateStatus(String(req.params.id), status);
      res.json({ success: true, message: 'Cập nhật trạng thái ticket thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Post('/tickets/:ticketId/messages', authenticate)
  public async sendMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = SendMessageSchema.parse({
        ...req.body,
        ticketId: req.params.ticketId || req.body.ticketId,
        senderId: req.user?.id,
        senderRole: req.user?.role === 'CUSTOMER' ? 'CUSTOMER' : 'CSKH',
      });
      const message = await this.service.sendMessage(parsed);
      res.status(201).json({ success: true, message: 'Gửi tin nhắn thành công!', data: message });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Post('/tickets/:ticketId/message', authenticate)
  public async sendMessageSingle(req: AuthenticatedRequest, res: Response) {
    return this.sendMessage(req, res);
  }

  @Post('/active-chat/messages', authenticate)
  public async sendActiveChatMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const customerId = req.body.customerId || req.user?.id || '00000000-0000-0000-0000-000000000001';
      const text = req.body.text || req.body.message || '';
      const attachments = req.body.attachmentUrls || req.body.images || [];

      // Find active CSKH ticket/conversation
      const data = await this.service.getActiveChat(customerId);
      let ticketId = data.ticket?.id;

      if (!ticketId) {
        const newTicket = await this.service.createTicket({
          customerId,
          subject: 'Hỗ trợ CSKH trực tuyến',
          priority: 'NORMAL',
          initialMessage: text,
        });
        ticketId = newTicket.id;
      } else {
        await this.service.sendMessage({
          ticketId,
          senderId: customerId,
          senderRole: 'CUSTOMER',
          message: text,
          attachmentUrls: attachments,
        });
      }

      res.status(201).json({ success: true, message: 'Gửi tin nhắn CSKH thành công!', ticketId });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /**
   * GET /api/cskh/requests
   * Lấy danh sách phiếu yêu cầu hỗ trợ kỹ thuật của khách hàng
   */
  @Get('/requests', authenticate)
  public async getRequests(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      if (this.client.getConnected()) {
        let query = 'SELECT * FROM customer_support_requests ORDER BY created_at DESC';
        let params: any[] = [];
        if (user.role !== 'ADMIN' && user.role !== 'CSKH') {
          query = 'SELECT * FROM customer_support_requests WHERE customer_id = $1 OR customer_phone = $2 ORDER BY created_at DESC';
          params = [user.id, user.phoneNumber || ''];
        }
        const result = await this.client.query(query, params);
        const requests = result.rows.map(r => ({
          id: r.id,
          customerId: r.customer_id,
          customerName: r.customer_name,
          customerPhone: r.customer_phone,
          customerEmail: r.customer_email,
          hardwareId: r.hardware_id,
          deviceName: r.device_name,
          requestType: r.request_type,
          requestTypeName: r.request_type_name,
          description: r.description,
          images: typeof r.images === 'string' ? JSON.parse(r.images) : (r.images || []),
          replyChannel: r.reply_channel,
          status: r.status,
          adminResponse: r.admin_response,
          createdAt: r.created_at,
          resolvedAt: r.resolved_at,
        }));
        return res.json({ success: true, requests, total: requests.length });
      }
      res.json({ success: true, requests: [], total: 0 });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * POST /api/cskh/requests
   * Tạo phiếu yêu cầu hỗ trợ kỹ thuật / bảo hành mới từ Mobile
   */
  @Post('/requests', authenticate)
  public async createRequest(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        id,
        customerId,
        customerName,
        customerPhone,
        customerEmail,
        hardwareId,
        deviceName,
        requestType,
        description,
        images,
        replyChannel,
      } = req.body;
      const user = req.user!;
      const ticketId = id || `REQ-${Date.now().toString().slice(-6)}`;
      const now = new Date().toISOString();

      if (this.client.getConnected()) {
        await this.client.query(
          `INSERT INTO customer_support_requests (
             id, customer_id, customer_name, customer_phone, customer_email,
             hardware_id, device_name, request_type, request_type_name,
             description, images, reply_channel, status, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PENDING', $13, $13)
           ON CONFLICT (id) DO UPDATE SET
             description = EXCLUDED.description,
             status = 'PENDING',
             updated_at = EXCLUDED.updated_at`,
          [
            ticketId,
            customerId || user.id,
            customerName || user.fullName || 'Khách hàng',
            customerPhone || user.phoneNumber || '',
            customerEmail || user.email || '',
            hardwareId || 'GENERAL_INQUIRY',
            deviceName || 'Thiết bị Austec',
            requestType || 'TECHNICAL',
            requestType || 'TECHNICAL',
            description,
            JSON.stringify(images || []),
            replyChannel || 'PUSH',
            now,
          ]
        );
        return res.status(201).json({
          success: true,
          message: 'Đã gửi phiếu hỗ trợ CSKH thành công!',
          ticketId,
        });
      }
      res.json({ success: true, ticketId });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }
}

