import { postgresClient, PostgresClient } from '../../core/database/postgres.client.js';
import { SupportTicketEntity, ChatMessageEntity } from './entities/ticket.entity.js';
import { CreateTicketDto, SendMessageDto } from './dto/cskh.dto.js';

export class CskhRepository {
  private client: PostgresClient;

  constructor(client: PostgresClient = postgresClient) {
    this.client = client;
  }

  public async getTickets(): Promise<SupportTicketEntity[]> {
    const tickets: SupportTicketEntity[] = [];
    try {
      // 1. Lấy từ support_tickets
      const res = await this.client.query(`
        SELECT st.*, u.full_name as cust_name, u.phone_number as cust_phone, u.email as cust_email
        FROM support_tickets st
        LEFT JOIN users u ON u.id = st.customer_id
        ORDER BY st.created_at DESC
      `);
      if (res.rows.length > 0) {
        for (const r of res.rows) {
          const msgRes = await this.client.query(
            'SELECT * FROM live_chat_messages WHERE ticket_id = $1 ORDER BY id ASC',
            [r.id]
          );
          const messages = msgRes.rows.map(m => this.mapMessageRow(m));
          const lastMsg = messages.length > 0 ? messages[messages.length - 1] : undefined;
          tickets.push({
            id: r.id,
            customerId: r.customer_id,
            customerName: r.cust_name || 'Khách Hàng Austec',
            customerPhone: r.cust_phone || '---',
            customerEmail: r.cust_email || '',
            hardwareId: r.hardware_id,
            subject: r.subject,
            status: r.status,
            priority: r.priority,
            assignedCskhId: r.assigned_cskh_id,
            selectedDevice: typeof r.selected_device === 'string' ? JSON.parse(r.selected_device) : r.selected_device,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            messages,
            lastMessage: lastMsg ? {
              text: lastMsg.text,
              sender: lastMsg.senderRole,
              time: lastMsg.time,
            } : undefined,
          });
        }
      }

      // 2. Lấy từ chat_conversations hệ thống (type = 'CSKH' hoặc id bắt đầu bằng 'cskh-')
      const cskhConvRes = await this.client.query(`
        SELECT c.*, u.full_name as cust_name, u.phone_number as cust_phone, u.email as cust_email
        FROM chat_conversations c
        LEFT JOIN users u ON u.id = c.creator_id
        WHERE c.type = 'CSKH' OR c.id LIKE 'cskh-%'
        ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
      `);

      for (const row of cskhConvRes.rows) {
        if (tickets.some(t => t.id === row.id)) continue;

        const msgRes = await this.client.query(
          'SELECT * FROM chat_messages WHERE conversation_id = $1 ORDER BY id ASC',
          [row.id]
        );
        const messages: ChatMessageEntity[] = msgRes.rows.map(m => {
          const d = new Date(m.created_at || Date.now());
          const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          let atts: string[] = [];
          if (Array.isArray(m.attachments)) {
            atts = m.attachments.map((a: any) => typeof a === 'string' ? a : (a.url || ''));
          }
          const isCSKH = m.sender_role === 'CSKH' || m.sender_role === 'ADMIN';
          const meta = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : (m.metadata || {});
          return {
            id: m.id,
            ticketId: row.id,
            sender: isCSKH ? 'CSKH' : 'user',
            senderRole: m.sender_role,
            text: m.content || '',
            message: m.content || '',
            time: timeStr,
            createdAt: m.created_at,
            attachmentUrls: atts,
            images: atts,
            selectedDevice: meta.selectedDevice,
          };
        });

        const lastMsg = messages.length > 0 ? messages[messages.length - 1] : undefined;
        const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {});

        tickets.push({
          id: row.id,
          customerId: row.creator_id || 'customer',
          customerName: row.cust_name || 'Khách Hàng Austec',
          customerPhone: row.cust_phone || '---',
          customerEmail: row.cust_email || '',
          hardwareId: meta.selectedDevice?.hardwareId || 'AT-DOOR-88239A01',
          deviceName: meta.selectedDevice?.deviceName || 'Cửa cuốn Austec Titadoor A900 Super',
          subject: row.title || 'HỖ TRỢ KỸ THUẬT & CSKH AUSTEC',
          status: meta.status || (messages.length > 0 ? 'PROCESSING' : 'OPEN'),
          priority: 'NORMAL',
          selectedDevice: meta.selectedDevice,
          createdAt: row.created_at,
          updatedAt: row.updated_at || row.last_message_at || row.created_at,
          messages,
          lastMessage: lastMsg ? {
            text: lastMsg.text,
            sender: lastMsg.senderRole,
            time: lastMsg.time,
          } : undefined,
        });
      }

      return tickets;
    } catch (e: any) {
      console.warn('[CskhRepository] getTickets DB query failed:', e.message);
      return tickets;
    }
  }

  public async getActiveChatForCustomer(customerId: string): Promise<{ ticket: SupportTicketEntity | null; messages: ChatMessageEntity[] }> {
    try {
      // 1. Kiểm tra chat_conversations kênh CSKH
      const convRes = await this.client.query(
        "SELECT * FROM chat_conversations WHERE (creator_id = $1 OR id = $2) AND (type = 'CSKH' OR id LIKE 'cskh-%') ORDER BY updated_at DESC LIMIT 1",
        [customerId, `cskh-conv-${customerId}`]
      );
      if (convRes.rows.length > 0) {
        const c = convRes.rows[0];
        const msgRes = await this.client.query(
          'SELECT * FROM chat_messages WHERE conversation_id = $1 ORDER BY id ASC',
          [c.id]
        );
        const messages: ChatMessageEntity[] = msgRes.rows.map(m => {
          const d = new Date(m.created_at || Date.now());
          const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          let atts: string[] = [];
          if (Array.isArray(m.attachments)) {
            atts = m.attachments.map((a: any) => typeof a === 'string' ? a : (a.url || ''));
          }
          const isCSKH = m.sender_role === 'CSKH' || m.sender_role === 'ADMIN';
          const meta = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : (m.metadata || {});
          return {
            id: m.id,
            ticketId: c.id,
            sender: isCSKH ? 'CSKH' : 'user',
            senderRole: m.sender_role,
            text: m.content || '',
            message: m.content || '',
            time: timeStr,
            createdAt: m.created_at,
            attachmentUrls: atts,
            images: atts,
            selectedDevice: meta.selectedDevice,
          };
        });
        return {
          ticket: {
            id: c.id,
            customerId: c.creator_id,
            subject: c.title,
            status: 'OPEN',
            priority: 'NORMAL',
            createdAt: c.created_at,
            messages,
          },
          messages,
        };
      }

      // 2. Kiểm tra support_tickets
      const res = await this.client.query(
        "SELECT * FROM support_tickets WHERE customer_id = $1 AND status != 'RESOLVED' ORDER BY created_at DESC LIMIT 1",
        [customerId]
      );
      if (res.rows.length > 0) {
        const r = res.rows[0];
        const msgRes = await this.client.query(
          'SELECT * FROM live_chat_messages WHERE ticket_id = $1 ORDER BY id ASC',
          [r.id]
        );
        const messages = msgRes.rows.map(m => this.mapMessageRow(m));
        return {
          ticket: {
            id: r.id,
            customerId: r.customer_id,
            subject: r.subject,
            status: r.status,
            priority: r.priority,
            createdAt: r.created_at,
            messages,
          },
          messages,
        };
      }
    } catch (e: any) {
      console.warn('[CskhRepository] getActiveChatForCustomer error:', e.message);
    }
    return { ticket: null, messages: [] };
  }

  public async createTicket(dto: CreateTicketDto): Promise<SupportTicketEntity> {
    const id = `TCK-${Date.now()}`;
    const now = new Date().toISOString();
    try {
      await this.client.query(
        `INSERT INTO support_tickets (id, customer_id, hardware_id, subject, status, priority, selected_device, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'OPEN', $5, $6, $7, $8)`,
        [id, dto.customerId, dto.hardwareId || null, dto.subject, dto.priority, JSON.stringify(dto.selectedDevice || {}), now, now]
      );

      if (dto.initialMessage) {
        await this.addMessage({
          ticketId: id,
          senderId: dto.customerId,
          senderRole: 'CUSTOMER',
          message: dto.initialMessage,
          attachmentUrls: [],
        });
      }
    } catch (e: any) {
      console.warn('[CskhRepository] createTicket DB error:', e.message);
    }
    return {
      id,
      customerId: dto.customerId,
      subject: dto.subject,
      hardwareId: dto.hardwareId,
      status: 'OPEN',
      priority: dto.priority || 'NORMAL',
      selectedDevice: dto.selectedDevice,
      createdAt: now,
      messages: [],
    };
  }

  public async addMessage(dto: SendMessageDto): Promise<ChatMessageEntity> {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const nowIso = now.toISOString();

    try {
      const res = await this.client.query(
        `INSERT INTO live_chat_messages (ticket_id, sender_id, sender_role, message, attachment_urls, device_snapshot, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          dto.ticketId,
          dto.senderId || 'CSKH',
          dto.senderRole,
          dto.message,
          JSON.stringify(dto.attachmentUrls || []),
          JSON.stringify(dto.deviceSnapshot || {}),
          nowIso,
        ]
      );
      const r = res.rows[0];
      return this.mapMessageRow(r);
    } catch (e: any) {
      console.warn('[CskhRepository] addMessage DB error:', e.message);
      return {
        id: Date.now(),
        ticketId: dto.ticketId,
        sender: dto.senderRole === 'CSKH' ? 'CSKH' : 'user',
        senderRole: dto.senderRole,
        text: dto.message,
        message: dto.message,
        time: timeStr,
        createdAt: nowIso,
        attachmentUrls: dto.attachmentUrls || [],
        images: dto.attachmentUrls || [],
      };
    }
  }

  public async updateTicketStatus(id: string, status: 'OPEN' | 'PROCESSING' | 'RESOLVED'): Promise<void> {
    try {
      await this.client.query('UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
    } catch (e: any) {
      console.warn('[CskhRepository] updateTicketStatus error:', e.message);
    }
  }

  private mapMessageRow(m: any): ChatMessageEntity {
    const d = new Date(m.created_at || Date.now());
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const attachments = typeof m.attachment_urls === 'string' ? JSON.parse(m.attachment_urls) : (m.attachment_urls || []);
    return {
      id: m.id,
      ticketId: m.ticket_id,
      sender: m.sender_role === 'CSKH' ? 'CSKH' : 'user',
      senderRole: m.sender_role,
      text: m.message,
      message: m.message,
      time: timeStr,
      createdAt: m.created_at,
      attachmentUrls: attachments,
      images: attachments,
      deviceSnapshot: typeof m.device_snapshot === 'string' ? JSON.parse(m.device_snapshot) : m.device_snapshot,
    };
  }
}
