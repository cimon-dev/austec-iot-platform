import { Request, Response } from 'express';
import { CskhService } from './cskh.service.js';
import { CreateTicketSchema, SendMessageSchema } from './dto/cskh.dto.js';
import { AuthenticatedRequest } from '../../services/auth.service.js';

export class CskhController {
  constructor(private service: CskhService = new CskhService()) {}

  public getTickets = async (_req: Request, res: Response) => {
    try {
      const tickets = await this.service.getTickets();
      res.json({ success: true, total: tickets.length, tickets });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  };

  public getActiveChat = async (req: AuthenticatedRequest, res: Response) => {
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
  };

  public createTicket = async (req: AuthenticatedRequest, res: Response) => {
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
  };

  public sendMessage = async (req: AuthenticatedRequest, res: Response) => {
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
  };

  public updateStatus = async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      await this.service.updateStatus(String(req.params.id), status);
      res.json({ success: true, message: 'Cập nhật trạng thái ticket thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };
}
