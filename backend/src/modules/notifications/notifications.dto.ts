export interface CreateNotificationDto {
  title: string;
  message?: string;
  body?: string;
  category?: 'SYSTEM' | 'MAINTENANCE' | 'ALERT' | 'PROMO' | 'OTA_UPDATE';
  channel?: 'APP_PUSH' | 'SMS' | 'EMAIL';
  targetRole?: string;
  target?: string;
  targetUserId?: string;
  status?: 'SENT' | 'SCHEDULED' | 'DRAFT';
  type?: string;
  scheduleTime?: string;
  targetModel?: string;
}
