import { PostgresClient, postgresClient } from '../../core/database/postgres.client.js';

export interface ChatParticipantInfo {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  chatRole: 'ADMIN' | 'MEMBER';
  joinedAt?: string;
}

export interface ChatConversationEntity {
  id: string;
  type: 'CSKH' | 'DIRECT' | 'GROUP';
  title: string;
  avatarUrl?: string;
  creatorId?: string;
  lastMessage?: string;
  lastMessageSenderName?: string;
  lastMessageAt?: string;
  memberCount?: number;
  metadata?: Record<string, any>;
  participants?: ChatParticipantInfo[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageEntity {
  id: number;
  conversationId: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  senderAvatar?: string;
  messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'DEVICE_SNAPSHOT' | 'SYSTEM';
  content: string;
  attachments: any[];
  clientTempId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export class ChatRepository {
  private client: PostgresClient;

  constructor(client: PostgresClient = postgresClient) {
    this.client = client;
  }

  /**
   * Tìm kiếm người dùng theo số điện thoại hoặc email (hoặc tên)
   */
  public async searchUsers(query: string, excludeUserId: string): Promise<any[]> {
    const q = `%${query.trim().toLowerCase()}%`;
    try {
      const res = await this.client.query(
        `SELECT id, full_name as "fullName", email, phone_number as "phoneNumber", role, company, department
         FROM users
         WHERE id != $1
           AND (LOWER(phone_number) LIKE $2 OR LOWER(email) LIKE $2 OR LOWER(full_name) LIKE $2)
         ORDER BY full_name ASC
         LIMIT 20`,
        [excludeUserId, q]
      );
      return res.rows;
    } catch (e: any) {
      console.warn('[ChatRepository] searchUsers error:', e.message);
      return [];
    }
  }

  /**
   * Đảm bảo luôn có 1 kênh CSKH sẵn cho khách hàng (ghim đầu danh sách)
   */
  public async ensureCskhConversation(userId: string, userName?: string): Promise<string> {
    const convId = `cskh-conv-${userId}`;
    const now = new Date().toISOString();

    try {
      // Kiểm tra xem đã tồn tại chưa
      const exist = await this.client.query(
        `SELECT id FROM chat_conversations WHERE id = $1 LIMIT 1`,
        [convId]
      );

      if (exist.rows.length === 0) {
        // Tạo hội thoại CSKH mới
        await this.client.query(
          `INSERT INTO chat_conversations (id, type, title, avatar_url, creator_id, last_message, last_message_sender_name, last_message_at, created_at, updated_at)
           VALUES ($1, 'CSKH', 'Trung tâm Hỗ trợ Kỹ thuật Austec 24/7', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80', $2, 'Dạ em chào Quý khách! Kỹ thuật viên Austec đã sẵn sàng hỗ trợ trực tuyến 24/7.', 'Kỹ thuật viên Austec', $3, $3, $3)`,
          [convId, userId, now]
        );

        // Thêm Customer
        await this.client.query(
          `INSERT INTO chat_participants (conversation_id, user_id, role, joined_at)
           VALUES ($1, $2, 'MEMBER', $3)
           ON CONFLICT DO NOTHING`,
          [convId, userId, now]
        );

        // Thêm Admin/CSKH
        await this.client.query(
          `INSERT INTO chat_participants (conversation_id, user_id, role, joined_at)
           VALUES ($1, 'admin-001', 'ADMIN', $2)
           ON CONFLICT DO NOTHING`,
          [convId, now]
        );

        // Tin nhắn chào mừng ban đầu
        await this.client.query(
          `INSERT INTO chat_messages (conversation_id, sender_id, sender_role, sender_name, message_type, content, created_at)
           VALUES ($1, 'admin-001', 'CSKH', 'Kỹ thuật viên Austec', 'TEXT', 'Dạ em chào Quý khách! Kỹ thuật viên Austec đã tiếp nhận kết nối. Em có thể hỗ trợ gì cho anh/chị về thiết bị và kỹ thuật ạ?', $2)`,
          [convId, now]
        );
      }
    } catch (e: any) {
      console.warn('[ChatRepository] ensureCskhConversation error:', e.message);
    }
    return convId;
  }

  /**
   * Lấy danh sách hội thoại của người dùng (CSKH luôn ở đầu, sau đó đến các nhóm và 1-1 theo thời gian mới nhất)
   */
  public async getConversationsForUser(userId: string, userRole?: string): Promise<ChatConversationEntity[]> {
    if (userRole === 'CUSTOMER' || !userRole) {
      await this.ensureCskhConversation(userId);
    }

    try {
      const res = await this.client.query(
        `SELECT c.*,
                p.role as my_role,
                (SELECT COUNT(*) FROM chat_participants cp WHERE cp.conversation_id = c.id) as member_count
         FROM chat_conversations c
         JOIN chat_participants p ON p.conversation_id = c.id AND p.user_id = $1
         ORDER BY
           CASE WHEN c.type = 'CSKH' THEN 0 ELSE 1 END,
           c.last_message_at DESC NULLS LAST,
           c.created_at DESC`,
        [userId]
      );

      const conversations: ChatConversationEntity[] = [];

      for (const row of res.rows) {
        let displayTitle = row.title;
        let displayAvatar = row.avatar_url;

        // Nếu là chat DIRECT 1-1, lấy tên và thông tin của người đối thoại
        if (row.type === 'DIRECT') {
          const partnerRes = await this.client.query(
            `SELECT u.id, u.full_name, u.email, u.phone_number, u.role
             FROM chat_participants cp
             JOIN users u ON u.id = cp.user_id
             WHERE cp.conversation_id = $1 AND cp.user_id != $2
             LIMIT 1`,
            [row.id, userId]
          );

          if (partnerRes.rows.length > 0) {
            const partner = partnerRes.rows[0];
            displayTitle = partner.full_name || partner.phone_number || partner.email || 'Người dùng Austec';
            displayAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayTitle)}&background=0284c7&color=fff`;
          }
        }

        conversations.push({
          id: row.id,
          type: row.type,
          title: displayTitle,
          avatarUrl: displayAvatar,
          creatorId: row.creator_id,
          lastMessage: row.last_message,
          lastMessageSenderName: row.last_message_sender_name,
          lastMessageAt: row.last_message_at,
          memberCount: Number(row.member_count || 2),
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }

      return conversations;
    } catch (e: any) {
      console.warn('[ChatRepository] getConversationsForUser error:', e.message);
      return [];
    }
  }

  /**
   * Lấy chi tiết một cuộc trò chuyện kèm danh sách thành viên
   */
  public async getConversationById(conversationId: string, currentUserId: string): Promise<ChatConversationEntity | null> {
    try {
      const res = await this.client.query(
        `SELECT c.*,
                (SELECT COUNT(*) FROM chat_participants cp WHERE cp.conversation_id = c.id) as member_count
         FROM chat_conversations c
         WHERE c.id = $1`,
        [conversationId]
      );

      if (res.rows.length === 0) return null;
      const row = res.rows[0];

      // Lấy danh sách thành viên
      const partRes = await this.client.query(
        `SELECT u.id as "userId", u.full_name as "fullName", u.email, u.phone_number as "phoneNumber", u.role, cp.role as "chatRole", cp.joined_at as "joinedAt"
         FROM chat_participants cp
         JOIN users u ON u.id = cp.user_id
         WHERE cp.conversation_id = $1
         ORDER BY cp.role ASC, u.full_name ASC`,
        [conversationId]
      );

      let displayTitle = row.title;
      let displayAvatar = row.avatar_url;

      if (row.type === 'DIRECT') {
        const partner = partRes.rows.find((p: any) => p.userId !== currentUserId);
        if (partner) {
          displayTitle = partner.fullName || partner.phoneNumber || partner.email || 'Người dùng Austec';
          displayAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayTitle)}&background=0284c7&color=fff`;
        }
      }

      return {
        id: row.id,
        type: row.type,
        title: displayTitle,
        avatarUrl: displayAvatar,
        creatorId: row.creator_id,
        lastMessage: row.last_message,
        lastMessageSenderName: row.last_message_sender_name,
        lastMessageAt: row.last_message_at,
        memberCount: Number(row.member_count || partRes.rows.length),
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
        participants: partRes.rows,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (e: any) {
      console.warn('[ChatRepository] getConversationById error:', e.message);
      return null;
    }
  }

  /**
   * Tạo hoặc lấy cuộc trò chuyện 1-1 giữa 2 người dùng
   */
  public async getOrCreateDirectConversation(userId1: string, userId2: string): Promise<string> {
    if (userId1 === userId2) {
      throw new Error('Không thể tự trò chuyện với chính mình!');
    }

    try {
      // Tìm xem đã có cuộc hội thoại 1-1 giữa 2 người này chưa
      const existRes = await this.client.query(
        `SELECT c.id
         FROM chat_conversations c
         JOIN chat_participants p1 ON p1.conversation_id = c.id AND p1.user_id = $1
         JOIN chat_participants p2 ON p2.conversation_id = c.id AND p2.user_id = $2
         WHERE c.type = 'DIRECT'
         LIMIT 1`,
        [userId1, userId2]
      );

      if (existRes.rows.length > 0) {
        return existRes.rows[0].id;
      }

      // Tạo cuộc trò chuyện DIRECT mới
      const convId = `dir-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      await this.client.query(
        `INSERT INTO chat_conversations (id, type, title, creator_id, created_at, updated_at)
         VALUES ($1, 'DIRECT', 'Cuộc trò chuyện trực tiếp', $2, $3, $3)`,
        [convId, userId1, now]
      );

      await this.client.query(
        `INSERT INTO chat_participants (conversation_id, user_id, role, joined_at)
         VALUES ($1, $2, 'ADMIN', $4), ($1, $3, 'MEMBER', $4)`,
        [convId, userId1, userId2, now]
      );

      return convId;
    } catch (e: any) {
      console.error('[ChatRepository] getOrCreateDirectConversation error:', e);
      throw e;
    }
  }

  /**
   * Tạo nhóm trò chuyện mới
   */
  public async createGroupConversation(
    creatorId: string,
    creatorName: string,
    title: string,
    memberIds: string[],
    avatarUrl?: string
  ): Promise<string> {
    const convId = `grp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const cleanAvatar = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=6366f1&color=fff`;

    try {
      await this.client.query(
        `INSERT INTO chat_conversations (id, type, title, avatar_url, creator_id, last_message, last_message_sender_name, last_message_at, created_at, updated_at)
         VALUES ($1, 'GROUP', $2, $3, $4, $5, 'Hệ thống', $6, $6, $6)`,
        [convId, title, cleanAvatar, creatorId, `${creatorName} đã tạo nhóm "${title}"`, now]
      );

      // Thêm Creator với role ADMIN
      await this.client.query(
        `INSERT INTO chat_participants (conversation_id, user_id, role, joined_at)
         VALUES ($1, $2, 'ADMIN', $3)`,
        [convId, creatorId, now]
      );

      // Thêm các thành viên khác
      const uniqueMembers = Array.from(new Set(memberIds)).filter(id => id !== creatorId);
      for (const mId of uniqueMembers) {
        await this.client.query(
          `INSERT INTO chat_participants (conversation_id, user_id, role, joined_at)
           VALUES ($1, $2, 'MEMBER', $3)
           ON CONFLICT DO NOTHING`,
          [convId, mId, now]
        );
      }

      // Thêm tin nhắn hệ thống thông báo tạo nhóm
      await this.client.query(
        `INSERT INTO chat_messages (conversation_id, sender_id, sender_role, sender_name, message_type, content, created_at)
         VALUES ($1, $2, 'SYSTEM', 'Hệ thống', 'SYSTEM', $3, $4)`,
        [convId, creatorId, `${creatorName} đã tạo nhóm "${title}"`, now]
      );

      return convId;
    } catch (e: any) {
      console.error('[ChatRepository] createGroupConversation error:', e);
      throw e;
    }
  }

  /**
   * Thêm thành viên vào nhóm chat
   */
  public async addMembersToGroup(
    conversationId: string,
    actorId: string,
    actorName: string,
    memberIds: string[]
  ): Promise<void> {
    const now = new Date().toISOString();
    try {
      const uniqueMembers = Array.from(new Set(memberIds));
      for (const mId of uniqueMembers) {
        await this.client.query(
          `INSERT INTO chat_participants (conversation_id, user_id, role, joined_at)
           VALUES ($1, $2, 'MEMBER', $3)
           ON CONFLICT DO NOTHING`,
          [conversationId, mId, now]
        );
      }

      // Tin nhắn hệ thống
      await this.client.query(
        `INSERT INTO chat_messages (conversation_id, sender_id, sender_role, sender_name, message_type, content, created_at)
         VALUES ($1, $2, 'SYSTEM', 'Hệ thống', 'SYSTEM', $3, $4)`,
        [conversationId, actorId, `${actorName} đã thêm thành viên mới vào nhóm`, now]
      );

      await this.client.query(
        `UPDATE chat_conversations SET last_message = $1, last_message_sender_name = 'Hệ thống', last_message_at = $2, updated_at = $2 WHERE id = $3`,
        [`${actorName} đã thêm thành viên mới vào nhóm`, now, conversationId]
      );
    } catch (e: any) {
      console.error('[ChatRepository] addMembersToGroup error:', e);
      throw e;
    }
  }

  /**
   * Rời nhóm hoặc xóa thành viên khỏi nhóm
   */
  public async removeMemberFromGroup(
    conversationId: string,
    actorId: string,
    actorName: string,
    targetUserId: string
  ): Promise<void> {
    const now = new Date().toISOString();
    try {
      await this.client.query(
        `DELETE FROM chat_participants WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, targetUserId]
      );

      const isSelf = actorId === targetUserId;
      const text = isSelf ? `${actorName} đã rời khỏi nhóm` : `${actorName} đã xóa một thành viên khỏi nhóm`;

      await this.client.query(
        `INSERT INTO chat_messages (conversation_id, sender_id, sender_role, sender_name, message_type, content, created_at)
         VALUES ($1, $2, 'SYSTEM', 'Hệ thống', 'SYSTEM', $3, $4)`,
        [conversationId, actorId, text, now]
      );

      await this.client.query(
        `UPDATE chat_conversations SET last_message = $1, last_message_sender_name = 'Hệ thống', last_message_at = $2, updated_at = $2 WHERE id = $3`,
        [text, now, conversationId]
      );
    } catch (e: any) {
      console.error('[ChatRepository] removeMemberFromGroup error:', e);
      throw e;
    }
  }

  /**
   * Lấy lịch sử tin nhắn của một cuộc trò chuyện
   */
  public async getMessages(conversationId: string, limit: number = 50, beforeId?: number): Promise<ChatMessageEntity[]> {
    try {
      let query = `
        SELECT * FROM chat_messages
        WHERE conversation_id = $1
      `;
      const params: any[] = [conversationId];

      if (beforeId) {
        query += ` AND id < $2`;
        params.push(beforeId);
      }

      query += ` ORDER BY id DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const res = await this.client.query(query, params);
      const rows = res.rows.reverse();

      return rows.map((r: any) => this.mapMessageRow(r));
    } catch (e: any) {
      console.warn('[ChatRepository] getMessages error:', e.message);
      return [];
    }
  }

  /**
   * Lưu tin nhắn mới và cập nhật trạng thái phòng chat (Hỗ trợ deduplication qua clientTempId)
   */
  public async saveMessage(data: {
    conversationId: string;
    senderId: string;
    senderRole: string;
    senderName: string;
    senderAvatar?: string;
    messageType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'DEVICE_SNAPSHOT' | 'SYSTEM';
    content: string;
    attachments?: any[];
    clientTempId?: string;
    metadata?: Record<string, any>;
  }): Promise<ChatMessageEntity> {
    const now = new Date().toISOString();

    // DEDUPLICATION: Nếu có clientTempId, kiểm tra xem tin nhắn này đã được lưu trong DB chưa
    if (data.clientTempId) {
      const existing = await this.client.query(
        `SELECT * FROM chat_messages WHERE conversation_id = $1 AND client_temp_id = $2 LIMIT 1`,
        [data.conversationId, data.clientTempId]
      );
      if (existing.rows.length > 0) {
        return this.mapMessageRow(existing.rows[0]);
      }
    }

    try {
      const msgType = data.messageType || 'TEXT';
      const res = await this.client.query(
        `INSERT INTO chat_messages (
           conversation_id, sender_id, sender_role, sender_name, sender_avatar,
           message_type, content, attachments, client_temp_id, metadata, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          data.conversationId,
          data.senderId,
          data.senderRole,
          data.senderName,
          data.senderAvatar || null,
          msgType,
          data.content || '',
          JSON.stringify(data.attachments || []),
          data.clientTempId || null,
          JSON.stringify(data.metadata || {}),
          now,
        ]
      );

      const row = res.rows[0];

      // Tóm tắt tin nhắn cuối cùng để hiển thị ở danh sách
      let snippet = data.content;
      if (!snippet && data.attachments && data.attachments.length > 0) {
        const first = data.attachments[0];
        snippet = first.mediaType === 'image' ? '[Hình ảnh]' : first.mediaType === 'video' ? '[Video]' : `[Tệp: ${first.filename || 'Đính kèm'}]`;
      }

      await this.client.query(
        `UPDATE chat_conversations
         SET last_message = $1, last_message_sender_name = $2, last_message_at = $3, updated_at = $3
         WHERE id = $4`,
        [snippet || 'Đã gửi tin nhắn', data.senderName, now, data.conversationId]
      );

      return this.mapMessageRow(row);
    } catch (e: any) {
      console.error('[ChatRepository] saveMessage error:', e);
      throw e;
    }
  }

  /**
   * Lấy danh sách user IDs tham gia vào một cuộc trò chuyện
   */
  public async getParticipantUserIds(conversationId: string): Promise<string[]> {
    try {
      const res = await this.client.query(
        `SELECT user_id FROM chat_participants WHERE conversation_id = $1`,
        [conversationId]
      );
      return res.rows.map((r: any) => r.user_id);
    } catch {
      return [];
    }
  }

  private mapMessageRow(r: any): ChatMessageEntity {
    return {
      id: r.id,
      conversationId: r.conversation_id,
      senderId: r.sender_id,
      senderRole: r.sender_role,
      senderName: r.sender_name,
      senderAvatar: r.sender_avatar,
      messageType: r.message_type,
      content: r.content,
      attachments: typeof r.attachments === 'string' ? JSON.parse(r.attachments) : (r.attachments || []),
      clientTempId: r.client_temp_id,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {}),
      createdAt: r.created_at,
    };
  }
}
