import { ChatRepository, ChatConversationEntity, ChatMessageEntity } from './chat.repository.js';
import { CreateGroupChatDto, SendChatMessageDto } from './dto/chat.dto.js';

export class ChatService {
  constructor(private repo: ChatRepository = new ChatRepository()) {}

  public async searchUsers(query: string, excludeUserId: string) {
    if (!query || query.trim().length === 0) return [];
    return this.repo.searchUsers(query, excludeUserId);
  }

  public async getConversations(userId: string, userRole?: string): Promise<ChatConversationEntity[]> {
    return this.repo.getConversationsForUser(userId, userRole);
  }

  public async getConversationById(conversationId: string, currentUserId: string): Promise<ChatConversationEntity | null> {
    return this.repo.getConversationById(conversationId, currentUserId);
  }

  public async getOrCreateDirectChat(currentUserId: string, targetUserId: string): Promise<string> {
    return this.repo.getOrCreateDirectConversation(currentUserId, targetUserId);
  }

  public async createGroupChat(creatorId: string, creatorName: string, dto: CreateGroupChatDto): Promise<string> {
    return this.repo.createGroupConversation(creatorId, creatorName, dto.title, dto.memberIds, dto.avatarUrl);
  }

  public async addGroupMembers(conversationId: string, actorId: string, actorName: string, memberIds: string[]): Promise<void> {
    return this.repo.addMembersToGroup(conversationId, actorId, actorName, memberIds);
  }

  public async removeGroupMember(conversationId: string, actorId: string, actorName: string, targetUserId: string): Promise<void> {
    return this.repo.removeMemberFromGroup(conversationId, actorId, actorName, targetUserId);
  }

  public async getMessages(conversationId: string, limit: number = 50, beforeId?: number): Promise<ChatMessageEntity[]> {
    return this.repo.getMessages(conversationId, limit, beforeId);
  }

  public async sendMessage(data: {
    conversationId: string;
    senderId: string;
    senderRole: string;
    senderName: string;
    senderAvatar?: string;
    dto: SendChatMessageDto;
  }): Promise<ChatMessageEntity> {
    return this.repo.saveMessage({
      conversationId: data.conversationId,
      senderId: data.senderId,
      senderRole: data.senderRole,
      senderName: data.senderName,
      senderAvatar: data.senderAvatar,
      messageType: data.dto.messageType,
      content: data.dto.content,
      attachments: data.dto.attachments,
      clientTempId: data.dto.clientTempId,
      metadata: data.dto.metadata,
    });
  }

  public async getParticipantUserIds(conversationId: string): Promise<string[]> {
    return this.repo.getParticipantUserIds(conversationId);
  }
}
