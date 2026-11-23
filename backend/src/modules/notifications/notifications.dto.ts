export type NotificationCategory =
  | 'SYSTEM'
  | 'MAINTENANCE'
  | 'ALERT'
  | 'PROMO'
  | 'OTA_UPDATE'
  | 'AD_BANNER';

export type NotificationCampaignType =
  | 'STANDARD'
  | 'PROMO_BANNER'
  | 'NEW_DEVICE'
  | 'CAMPAIGN';

export type NotificationActionType =
  | 'NONE'
  | 'OPEN_SHOP'
  | 'OPEN_CHAT'
  | 'OPEN_URL';

export interface NotificationMetadata {
  campaignCode?: string;
  badgeText?: string;
  productId?: string;
  promoCode?: string;
  showAsPopup?: boolean;
  [key: string]: any;
}

export interface CreateNotificationDto {
  title: string;
  message?: string;
  body?: string;
  category?: NotificationCategory;
  channel?: 'APP_PUSH' | 'SMS' | 'EMAIL';
  targetRole?: string;
  target?: string;
  targetUserId?: string;
  status?: 'SENT' | 'SCHEDULED' | 'DRAFT';
  type?: string;
  scheduleTime?: string;
  targetModel?: string;
  // Media & Advertisement / Campaign fields
  imageUrl?: string;
  bannerUrl?: string;
  campaignType?: NotificationCampaignType;
  actionType?: NotificationActionType;
  actionValue?: string;
  ctaLabel?: string;
  priority?: number;
  expiresAt?: string;
  metadata?: NotificationMetadata;
}
