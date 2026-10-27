import { z } from 'zod';

export const CreateTicketSchema = z.object({
  customerId: z.string().min(1, 'Customer ID không được để trống'),
  subject: z.string().min(1, 'Tiêu đề ticket không được để trống'),
  hardwareId: z.string().optional(),
  priority: z.enum(['URGENT', 'NORMAL', 'LOW']).optional().default('NORMAL'),
  selectedDevice: z.record(z.any()).optional(),
  initialMessage: z.string().optional(),
});

export type CreateTicketDto = z.infer<typeof CreateTicketSchema>;

export const SendMessageSchema = z.object({
  ticketId: z.string().min(1),
  message: z.string().min(1, 'Nội dung tin nhắn không được để trống'),
  senderId: z.string().optional(),
  senderRole: z.enum(['CSKH', 'CUSTOMER']).default('CSKH'),
  attachmentUrls: z.array(z.string()).optional().default([]),
  deviceSnapshot: z.record(z.any()).optional(),
});

export type SendMessageDto = z.infer<typeof SendMessageSchema>;
