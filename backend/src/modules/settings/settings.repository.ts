import { postgresClient, PostgresClient } from '../../core/database/postgres.client.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { SystemSettingsEntity } from './entities/system-settings.entity.js';

export class SettingsRepository {
  private client: PostgresClient;

  constructor(client: PostgresClient = postgresClient) {
    this.client = client;
  }

  private async ensureTable(): Promise<void> {
    const ddl = `
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT PRIMARY KEY DEFAULT 1,
        expiry_notification_days INT DEFAULT 30,
        trial_expiry_period INT DEFAULT 15,
        notification_frequency VARCHAR(50) DEFAULT 'daily',
        mqtt_broker_url VARCHAR(255) DEFAULT 'mqtt://broker.austec.vn',
        mqtt_port INT DEFAULT 8883,
        tls_enabled BOOLEAN DEFAULT TRUE,
        keep_alive_seconds INT DEFAULT 60,
        company_name VARCHAR(255) DEFAULT 'CÔNG TY CỔ PHẦN CÔNG NGHỆ AUSTEC',
        hotline VARCHAR(50) DEFAULT '1900 6868',
        support_email VARCHAR(255) DEFAULT 'support@austec.vn',
        timezone VARCHAR(100) DEFAULT 'Asia/Ho_Chi_Minh (GMT+7)',
        updated_at VARCHAR(50),
        updated_by VARCHAR(100)
      );
    `;
    try {
      await this.client.query(ddl);
    } catch (err: any) {
      console.warn('[SettingsRepository] Error ensuring system_settings table:', err.message);
    }
  }

  public async getSettings(): Promise<SystemSettingsEntity | null> {
    try {
      await this.ensureTable();
      const res = await this.client.query('SELECT * FROM system_settings WHERE id = 1');
      if (res.rows.length === 0) {
        return null;
      }
      const r = res.rows[0];
      return {
        id: r.id,
        expiryNotificationDays: r.expiry_notification_days,
        trialExpiryPeriod: r.trial_expiry_period,
        notificationFrequency: r.notification_frequency,
        mqttBrokerUrl: r.mqtt_broker_url,
        mqttPort: r.mqtt_port,
        tlsEnabled: r.tls_enabled,
        keepAliveSeconds: r.keep_alive_seconds,
        companyName: r.company_name,
        hotline: r.hotline,
        supportEmail: r.support_email,
        timezone: r.timezone,
        updatedAt: r.updated_at,
        updatedBy: r.updated_by,
      };
    } catch (err: any) {
      console.error('[SettingsRepository] Error getSettings:', err.message);
      return null;
    }
  }

  public async updateSettings(data: UpdateSettingsDto, updatedBy?: string): Promise<SystemSettingsEntity | null> {
    try {
      await this.ensureTable();
      const current = (await this.getSettings()) || {
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

      const merged = { ...current, ...data };
      const nowStr = new Date().toISOString();

      const query = `
        INSERT INTO system_settings (
          id, expiry_notification_days, trial_expiry_period, notification_frequency,
          mqtt_broker_url, mqtt_port, tls_enabled, keep_alive_seconds,
          company_name, hotline, support_email, timezone, updated_at, updated_by
        ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          expiry_notification_days = EXCLUDED.expiry_notification_days,
          trial_expiry_period = EXCLUDED.trial_expiry_period,
          notification_frequency = EXCLUDED.notification_frequency,
          mqtt_broker_url = EXCLUDED.mqtt_broker_url,
          mqtt_port = EXCLUDED.mqtt_port,
          tls_enabled = EXCLUDED.tls_enabled,
          keep_alive_seconds = EXCLUDED.keep_alive_seconds,
          company_name = EXCLUDED.company_name,
          hotline = EXCLUDED.hotline,
          support_email = EXCLUDED.support_email,
          timezone = EXCLUDED.timezone,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by
        RETURNING *;
      `;

      const res = await this.client.query(query, [
        merged.expiryNotificationDays,
        merged.trialExpiryPeriod,
        merged.notificationFrequency,
        merged.mqttBrokerUrl,
        merged.mqttPort,
        merged.tlsEnabled,
        merged.keepAliveSeconds,
        merged.companyName,
        merged.hotline,
        merged.supportEmail,
        merged.timezone,
        nowStr,
        updatedBy || 'admin',
      ]);

      const r = res.rows[0];
      return {
        id: r.id,
        expiryNotificationDays: r.expiry_notification_days,
        trialExpiryPeriod: r.trial_expiry_period,
        notificationFrequency: r.notification_frequency,
        mqttBrokerUrl: r.mqtt_broker_url,
        mqttPort: r.mqtt_port,
        tlsEnabled: r.tls_enabled,
        keepAliveSeconds: r.keep_alive_seconds,
        companyName: r.company_name,
        hotline: r.hotline,
        supportEmail: r.support_email,
        timezone: r.timezone,
        updatedAt: r.updated_at,
        updatedBy: r.updated_by,
      };
    } catch (err: any) {
      console.error('[SettingsRepository] Error updateSettings:', err.message);
      return null;
    }
  }
}
