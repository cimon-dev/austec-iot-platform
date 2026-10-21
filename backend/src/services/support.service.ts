import { SupportTicket, LiveChatMessage, HotCacheClient } from '@austec/database';

export class SupportService {
  private tickets: Map<string, SupportTicket> = new Map();
  private messages: LiveChatMessage[] = [];
  private currentMsgId = 1;

  constructor(private hotCache: HotCacheClient) {}

  /**
   * Khởi tạo Ticket hỗ trợ từ khách hàng
   */
  public createTicket(data: {
    customerId: string;
    hardwareId?: string;
    subject: string;
    priority?: 'LOW' | 'NORMAL' | 'URGENT';
  }): SupportTicket {
    const ticketId = `ticket-${Date.now()}`;
    const ticket: SupportTicket = {
      id: ticketId,
      customerId: data.customerId,
      hardwareId: data.hardwareId,
      status: 'OPEN',
      priority: data.priority || 'NORMAL',
      subject: data.subject,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.tickets.set(ticketId, ticket);
    return ticket;
  }

  /**
   * Gửi tin nhắn Live Chat, tự động kẹp thông số viễn thám kỹ thuật (Remote Inspector Snapshot)
   */
  public async sendMessage(data: {
    ticketId: string;
    senderId: string;
    senderRole: 'CUSTOMER' | 'CSKH';
    message: string;
    attachmentUrls?: string[];
  }): Promise<LiveChatMessage> {
    const ticket = this.tickets.get(data.ticketId);
    if (!ticket) {
      throw new Error(`Ticket '${data.ticketId}' không tồn tại.`);
    }

    // Tự động kẹp ảnh chụp trạng thái kỹ thuật của thiết bị nếu có
    let deviceSnapshot: Record<string, any> = {};
    if (ticket.hardwareId) {
      const state = await this.hotCache.getDeviceState(ticket.hardwareId);
      if (state) {
        deviceSnapshot = {
          hardwareId: state.hardwareId,
          isOnline: state.isOnline,
          lastHeartbeat: state.lastHeartbeat,
          currentProperties: state.currentProperties,
          rssiSignal: state.rssiSignal,
        };
      }
    }

    const msg: LiveChatMessage = {
      id: this.currentMsgId++,
      ticketId: data.ticketId,
      senderId: data.senderId,
      senderRole: data.senderRole,
      message: data.message,
      attachmentUrls: data.attachmentUrls || [],
      deviceSnapshot,
      createdAt: new Date().toISOString(),
    };

    this.messages.push(msg);
    ticket.updatedAt = new Date().toISOString();
    return msg;
  }

  public getOrCreateCustomerTicket(customerId: string, hardwareId?: string): SupportTicket {
    const existing = this.getTicketsByCustomer(customerId).find(t => t.status !== 'CLOSED');
    if (existing) {
      if (hardwareId && !existing.hardwareId) {
        existing.hardwareId = hardwareId;
      }
      return existing;
    }

    return this.createTicket({
      customerId,
      hardwareId: hardwareId || 'AT-DOOR-88239A01',
      subject: `Kênh hỗ trợ trực tiếp cho khách hàng`,
      priority: 'NORMAL',
    });
  }

  public getMessagesByTicket(ticketId: string): LiveChatMessage[] {
    return this.messages.filter(m => m.ticketId === ticketId);
  }

  public getTicketsByCustomer(customerId: string): SupportTicket[] {
    return Array.from(this.tickets.values()).filter(t => t.customerId === customerId);
  }

  public getAllOpenTickets(): SupportTicket[] {
    return Array.from(this.tickets.values()).filter(t => t.status !== 'CLOSED');
  }

  public assignCSKH(ticketId: string, cskhId: string): void {
    const t = this.tickets.get(ticketId);
    if (t) {
      t.assignedCskhId = cskhId;
      t.status = 'PROCESSING';
    }
  }

  public resolveTicket(ticketId: string): void {
    const t = this.tickets.get(ticketId);
    if (t) {
      t.status = 'RESOLVED';
    }
  }
}

