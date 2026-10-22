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
    selectedDevice?: any;
  }): Promise<LiveChatMessage> {
    const ticket = this.tickets.get(data.ticketId);
    if (!ticket) {
      throw new Error(`Ticket '${data.ticketId}' không tồn tại.`);
    }

    if (data.selectedDevice) {
      (ticket as any).selectedDevice = data.selectedDevice;
      if (data.selectedDevice.hardwareId && !ticket.hardwareId) {
        ticket.hardwareId = data.selectedDevice.hardwareId;
      }
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
      selectedDevice: data.selectedDevice,
      deviceSnapshot,
      createdAt: new Date().toISOString(),
    };

    this.messages.push(msg);
    ticket.updatedAt = new Date().toISOString();
    return msg;
  }

  public getTicketById(ticketId: string): SupportTicket | undefined {
    return this.tickets.get(ticketId);
  }

  public findActiveCustomerTicket(customerId: string): SupportTicket | undefined {
    return this.getTicketsByCustomer(customerId).find(t => t.status !== 'CLOSED');
  }

  public hasActiveMessages(ticketId: string): boolean {
    return this.messages.some(m => m.ticketId === ticketId);
  }

  public getOrCreateCustomerTicket(customerId: string, hardwareId?: string): SupportTicket {
    const existing = this.findActiveCustomerTicket(customerId);
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

  public async startConversation(data: {
    customerId: string;
    customerName?: string;
    hardwareId?: string;
    message: string;
    attachmentUrls?: string[];
    selectedDevice?: any;
  }): Promise<{ ticket: SupportTicket; messages: LiveChatMessage[] }> {
    let ticket = this.findActiveCustomerTicket(data.customerId);
    if (!ticket) {
      const deviceLabel = data.selectedDevice ? ` (${data.selectedDevice.deviceName || data.selectedDevice.modelName || 'Thiết bị mới'})` : '';
      ticket = this.createTicket({
        customerId: data.customerId,
        hardwareId: data.hardwareId || data.selectedDevice?.hardwareId || 'AT-DOOR-88239A01',
        subject: `Kênh hỗ trợ 1-1 cho khách hàng ${data.customerName || data.customerId}${deviceLabel}`,
        priority: 'NORMAL',
      });
    }

    if (data.selectedDevice) {
      (ticket as any).selectedDevice = data.selectedDevice;
    }

    // 1. Tin nhắn khởi tạo từ khách hàng
    const userMsg = await this.sendMessage({
      ticketId: ticket.id,
      senderId: data.customerId,
      senderRole: 'CUSTOMER',
      message: data.message,
      attachmentUrls: data.attachmentUrls,
      selectedDevice: data.selectedDevice,
    });

    // 2. Phản hồi chào mừng tức thì từ CSKH Austec
    const greetingName = data.customerName ? `anh/chị ${data.customerName}` : 'Quý khách';
    const deviceGreeting = data.selectedDevice
      ? ` và thiết bị ${data.selectedDevice.deviceName || data.selectedDevice.modelName}`
      : '';
    const cskhWelcomeMsg = await this.sendMessage({
      ticketId: ticket.id,
      senderId: 'cskh-001',
      senderRole: 'CSKH',
      message: `Dạ em chào ${greetingName}! Kỹ thuật viên Austec đã tiếp nhận yêu cầu${deviceGreeting} và kết nối trực tuyến với anh/chị. Em có thể hỗ trợ gì cho anh/chị ạ?`,
    });

    return {
      ticket,
      messages: this.getMessagesByTicket(ticket.id),
    };
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

