import { Response } from 'express';
import { ChatService } from './chat.service.js';
import {
  CreateDirectChatSchema,
  CreateGroupChatSchema,
  AddGroupMembersSchema,
  SendChatMessageSchema,
} from './dto/chat.dto.js';
import { AuthenticatedRequest } from '../../services/auth.service.js';
import { Controller, Get, Post, Delete } from '../../core/decorators/index.js';
import { authenticate } from '../../core/middlewares/auth.middleware.js';

@Controller('/chat')
export class ChatController {
  constructor(private service: ChatService = new ChatService()) {}

  /**
   * GET /api/chat/users/search?q=...
   * Tìm kiếm người dùng theo SĐT hoặc Email
   */
  @Get('/users/search', authenticate)
  public async searchUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const q = (req.query.q as string) || '';
      const currentUserId = req.user!.id;
      const users = await this.service.searchUsers(q, currentUserId);
      res.json({ success: true, users });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * GET /api/chat/conversations
   * Lấy danh sách cuộc trò chuyện của người dùng hiện tại
   */
  @Get('/conversations', authenticate)
  public async getConversations(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const conversations = await this.service.getConversations(user.id, user.role);
      res.json({ success: true, conversations });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * GET /api/chat/conversations/:id
   * Chi tiết cuộc trò chuyện và danh sách thành viên
   */
  @Get('/conversations/:id', authenticate)
  public async getConversation(req: AuthenticatedRequest, res: Response) {
    try {
      const conversationId = req.params.id as string;
      const conversation = await this.service.getConversationById(conversationId, req.user!.id);
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Cuộc trò chuyện không tồn tại!' });
      }
      res.json({ success: true, conversation });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * POST /api/chat/conversations/direct
   * Tạo hoặc mở cuộc trò chuyện 1-1 với một người dùng khác
   */
  @Post('/conversations/direct', authenticate)
  public async createDirectChat(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = CreateDirectChatSchema.parse(req.body);
      const currentUserId = req.user!.id;
      const conversationId = await this.service.getOrCreateDirectChat(currentUserId, parsed.targetUserId);
      const conversation = await this.service.getConversationById(conversationId, currentUserId);
      res.status(201).json({ success: true, conversationId, conversation });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /**
   * POST /api/chat/conversations/group
   * Tạo nhóm trò chuyện mới
   */
  @Post('/conversations/group', authenticate)
  public async createGroupChat(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = CreateGroupChatSchema.parse(req.body);
      const user = req.user!;
      const conversationId = await this.service.createGroupChat(
        user.id,
        user.fullName || 'Người dùng',
        parsed
      );
      const conversation = await this.service.getConversationById(conversationId, user.id);
      res.status(201).json({
        success: true,
        message: 'Tạo nhóm trò chuyện thành công!',
        conversationId,
        conversation,
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /**
   * POST /api/chat/conversations/:id/members
   * Thêm thành viên vào nhóm chat
   */
  @Post('/conversations/:id/members', authenticate)
  public async addGroupMembers(req: AuthenticatedRequest, res: Response) {
    try {
      const conversationId = req.params.id as string;
      const parsed = AddGroupMembersSchema.parse(req.body);
      const user = req.user!;
      await this.service.addGroupMembers(
        conversationId,
        user.id,
        user.fullName || 'Người dùng',
        parsed.memberIds
      );
      const conversation = await this.service.getConversationById(conversationId, user.id);
      res.json({
        success: true,
        message: 'Thêm thành viên vào nhóm thành công!',
        conversation,
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /**
   * DELETE /api/chat/conversations/:id/members/:userId
   * Xóa thành viên khỏi nhóm hoặc tự rời nhóm
   */
  @Delete('/conversations/:id/members/:userId', authenticate)
  public async removeGroupMember(req: AuthenticatedRequest, res: Response) {
    try {
      const conversationId = req.params.id as string;
      const targetUserId = req.params.userId as string;
      const user = req.user!;
      await this.service.removeGroupMember(
        conversationId,
        user.id,
        user.fullName || 'Người dùng',
        targetUserId
      );
      res.json({ success: true, message: 'Đã cập nhật danh sách thành viên nhóm!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /**
   * GET /api/chat/conversations/:id/messages
   * Lấy danh sách tin nhắn của cuộc trò chuyện
   */
  @Get('/conversations/:id/messages', authenticate)
  public async getMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const conversationId = req.params.id as string;
      const limit = Number(req.query.limit) || 50;
      const beforeId = req.query.beforeId ? Number(req.query.beforeId) : undefined;
      const messages = await this.service.getMessages(conversationId, limit, beforeId);
      res.json({ success: true, messages });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * POST /api/chat/conversations/:id/messages
   * Gửi tin nhắn qua REST (Hỗ trợ fallback khi không dùng WebSocket)
   */
  @Post('/conversations/:id/messages', authenticate)
  public async sendMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const conversationId = req.params.id as string;
      const parsed = SendChatMessageSchema.parse(req.body);
      const user = req.user!;
      const message = await this.service.sendMessage({
        conversationId,
        senderId: user.id,
        senderRole: user.role,
        senderName: user.fullName || 'Người dùng Austec',
        dto: parsed,
      });
      res.status(201).json({ success: true, message });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }
}
