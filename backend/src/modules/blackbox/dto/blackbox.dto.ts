import { z } from 'zod';

export const CreateBlackboxLogSchema = z.object({
  hardwareId: z.string().min(1, 'Hardware ID không được để trống'),
  modelName: z.string().optional(),
  actionType: z.string().min(1, 'Action Type không được để trống'),
  payload: z.record(z.any()).optional().default({}),
  actorId: z.string().optional(),
  actorEmail: z.string().optional(),
  actorRole: z.enum(['ADMIN', 'CSKH', 'CUSTOMER']).optional().default('CUSTOMER'),
  clientIp: z.string().optional().default('127.0.0.1'),
  latencyMs: z.number().int().optional().default(50),
  ackStatus: z.enum(['ACKNOWLEDGED', 'TIMEOUT', 'REJECTED', 'EXECUTING']).optional().default('ACKNOWLEDGED'),
  cryptoSignature: z.string().optional(),
});

export type CreateBlackboxLogDto = z.infer<typeof CreateBlackboxLogSchema>;

export const QueryBlackboxLogsSchema = z.object({
  hardwareId: z.string().optional(),
  actionType: z.string().optional(),
  ackStatus: z.string().optional(),
  limit: z.coerce.number().int().positive().optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type QueryBlackboxLogsDto = z.infer<typeof QueryBlackboxLogsSchema>;
