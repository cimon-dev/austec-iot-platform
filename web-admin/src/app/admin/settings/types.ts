export interface SystemSettings {
  expiryNotificationDays: number;
  trialExpiryPeriod: number;
  notificationFrequency: string;
  mqttBrokerUrl: string;
  mqttPort: number;
  tlsEnabled: boolean;
  keepAliveSeconds: number;
  companyName: string;
  hotline: string;
  supportEmail: string;
  timezone: string;
  [key: string]: any;
}
