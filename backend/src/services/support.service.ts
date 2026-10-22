import { SupportTicket, LiveChatMessage, HotCacheClient } from '@austec/database';

export class SupportService {
  private tickets: Map<string, SupportTicket> = new Map();
  private messages: LiveChatMessage[] = [];
  private currentMsgId = 1;
  public onUpdate?: () => void;

  constructor(private hotCache: HotCacheClient) {}

  public exportData(): { tickets: SupportTicket[]; messages: LiveChatMessage[] } {
    return {
      tickets: Array.from(this.tickets.values()),
      messages: this.messages,
    };
  }

  public importData(data: { tickets?: SupportTicket[]; messages?: LiveChatMessage[] }) {
    if (data.tickets && Array.isArray(data.tickets)) {
      data.tickets.forEach(t => this.tickets.set(t.id, t));
    }
    if (data.messages && Array.isArray(data.messages)) {
      this.messages = [...data.messages];
      const maxId = this.messages.reduce((max, m) => (m.id && m.id > max ? m.id : max), 0);
      this.currentMsgId = maxId + 1;
    }
  }

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
    this.onUpdate?.();
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

    // DEDUPLICATION: Tránh duplicate khi cả WebSocket và REST cùng gửi đồng thời trong 4s
    const normMsg = (data.message || '').trim();
    const recentDuplicate = this.messages.slice().reverse().find(m => 
      m.ticketId === data.ticketId &&
      m.senderRole === data.senderRole &&
      m.message.trim() === normMsg &&
      (Date.now() - new Date(m.createdAt).getTime()) < 4000
    );

    if (recentDuplicate) {
      return recentDuplicate;
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
    this.onUpdate?.();
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

    // Nếu cuộc trò chuyện này ĐÃ có tin nhắn rồi, không bao giờ gửi lặp lại lời chào khởi tạo
    const existingMessages = this.getMessagesByTicket(ticket.id);
    if (existingMessages.length > 0) {
      return {
        ticket,
        messages: existingMessages,
      };
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

    // 2. Phản hồi chào mừng tức thì từ CSKH Austec (Xử lý tên khách hàng lịch sự, không chào bằng email)
    let cleanName = (data.customerName || '').trim();
    if (
      cleanName.includes('@') ||
      cleanName.startsWith('USR-') ||
      !cleanName ||
      cleanName.toLowerCase() === 'quý khách' ||
      cleanName.toLowerCase() === 'khách hàng austec'
    ) {
      cleanName = '';
    }
    const greetingName = cleanName ? `anh/chị ${cleanName}` : 'Quý khách';
    const honorific = cleanName ? 'anh/chị' : 'Quý khách';
    const deviceGreeting = data.selectedDevice
      ? ` và thiết bị ${data.selectedDevice.deviceName || data.selectedDevice.modelName}`
      : '';
    const cskhWelcomeMsg = await this.sendMessage({
      ticketId: ticket.id,
      senderId: 'cskh-001',
      senderRole: 'CSKH',
      message: `Dạ em chào ${greetingName}! Kỹ thuật viên Austec đã tiếp nhận yêu cầu${deviceGreeting} và kết nối trực tuyến với ${honorific}. Em có thể hỗ trợ gì cho ${honorific} ạ?`,
    });

    return {
      ticket,
      messages: this.getMessagesByTicket(ticket.id),
    };
  }

  public getMessagesByTicket(ticketId: string): LiveChatMessage[] {
    const list = this.messages.filter(m => m.ticketId === ticketId);
    // Deduplicate identical consecutive messages
    const deduped: LiveChatMessage[] = [];
    for (const m of list) {
      const isDupe = deduped.some(x => 
        x.senderRole === m.senderRole && 
        x.message.trim() === m.message.trim() && 
        Math.abs(new Date(x.createdAt).getTime() - new Date(m.createdAt).getTime()) < 4000
      );
      if (!isDupe) {
        deduped.push(m);
      }
    }
    return deduped;
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
      this.onUpdate?.();
    }
  }

  public resolveTicket(ticketId: string): void {
    const t = this.tickets.get(ticketId);
    if (t) {
      t.status = 'RESOLVED';
      this.onUpdate?.();
    }
  }
}

