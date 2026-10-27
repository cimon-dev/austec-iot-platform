import { SettingsRepository } from './settings.repository.js';
import { UpdateSettingsDto, UpdateSettingsSchema } from './dto/update-settings.dto.js';
import { SystemSettingsEntity } from './entities/system-settings.entity.js';

export const DEFAULT_SYSTEM_SETTINGS: SystemSettingsEntity = {
  id: 1,
  expiryNotificationDays: 30,
  trialExpiryPeriod: 15,
  notificationFrequency: 'daily',
  mqttBrokerUrl: 'mqtt://broker.austec.vn',
  mqttPort: 8883,
  tlsEnabled: true,
  keepAliveSeconds: 60,
  companyName: 'CÔNG TY CỔ PHẦN CÔNG NGHỆ AUSTEC',
  hotline: '1900 6868',
  supportEmail: 'support@austec.vn',
  timezone: 'Asia/Ho_Chi_Minh (GMT+7)',
};

export class SettingsService {
  constructor(private repo: SettingsRepository = new SettingsRepository()) {}

  public async getSettings(): Promise<SystemSettingsEntity> {
    const settings = await this.repo.getSettings();
    if (settings) {
      return settings;
    }
    return DEFAULT_SYSTEM_SETTINGS;
  }

  public async updateSettings(data: unknown, updatedBy?: string): Promise<SystemSettingsEntity> {
    const validated: UpdateSettingsDto = UpdateSettingsSchema.parse(data);
    const updated = await this.repo.updateSettings(validated, updatedBy);
    if (updated) {
      return updated;
    }
    return { ...DEFAULT_SYSTEM_SETTINGS, ...validated };
  }
}
