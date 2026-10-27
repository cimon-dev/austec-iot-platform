import { CskhRepository } from './cskh.repository.js';
import { CreateTicketDto, SendMessageDto } from './dto/cskh.dto.js';
import { SupportTicketEntity, ChatMessageEntity } from './entities/ticket.entity.js';

export class CskhService {
  constructor(private repo: CskhRepository = new CskhRepository()) {}

  public async getTickets(): Promise<SupportTicketEntity[]> {
    return this.repo.getTickets();
  }

  public async getActiveChat(customerId: string): Promise<{ ticket: SupportTicketEntity | null; messages: ChatMessageEntity[] }> {
    return this.repo.getActiveChatForCustomer(customerId);
  }

  public async createTicket(dto: CreateTicketDto): Promise<SupportTicketEntity> {
    return this.repo.createTicket(dto);
  }

  public async sendMessage(dto: SendMessageDto): Promise<ChatMessageEntity> {
    return this.repo.addMessage(dto);
  }

  public async updateStatus(ticketId: string, status: 'OPEN' | 'PROCESSING' | 'RESOLVED'): Promise<void> {
    return this.repo.updateTicketStatus(ticketId, status);
  }
}
