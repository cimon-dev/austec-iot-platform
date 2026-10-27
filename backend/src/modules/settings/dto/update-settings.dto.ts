import { z } from 'zod';

export const UpdateSettingsSchema = z.object({
  expiryNotificationDays: z.number().int().positive().optional(),
  trialExpiryPeriod: z.number().int().positive().optional(),
  notificationFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  mqttBrokerUrl: z.string().min(1).optional(),
  mqttPort: z.number().int().positive().optional(),
  tlsEnabled: z.boolean().optional(),
  keepAliveSeconds: z.number().int().positive().optional(),
  companyName: z.string().min(1).optional(),
  hotline: z.string().min(1).optional(),
  supportEmail: z.string().email().optional(),
  timezone: z.string().min(1).optional(),
});

export type UpdateSettingsDto = z.infer<typeof UpdateSettingsSchema>;
