import { z } from 'zod';

export const CreateDirectChatSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required'),
});

export const CreateGroupChatSchema = z.object({
  title: z.string().min(1, 'Tên nhóm không được để trống').max(200),
  memberIds: z.array(z.string()).min(1, 'Vui lòng chọn ít nhất 1 thành viên'),
  avatarUrl: z.string().optional(),
});

export const AddGroupMembersSchema = z.object({
  memberIds: z.array(z.string()).min(1, 'Danh sách thành viên không được để trống'),
});

export const SendChatMessageSchema = z.object({
  content: z.string().default(''),
  messageType: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'FILE', 'DEVICE_SNAPSHOT', 'SYSTEM']).default('TEXT'),
  attachments: z.array(z.any()).default([]),
  clientTempId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type CreateDirectChatDto = z.infer<typeof CreateDirectChatSchema>;
export type CreateGroupChatDto = z.infer<typeof CreateGroupChatSchema>;
export type AddGroupMembersDto = z.infer<typeof AddGroupMembersSchema>;
export type SendChatMessageDto = z.infer<typeof SendChatMessageSchema>;
