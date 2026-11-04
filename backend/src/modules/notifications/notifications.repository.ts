import { PostgresClient } from '../../core/database/postgres.client.js';
import { CreateNotificationDto } from './notifications.dto.js';

export interface NotificationEntity {
  id: number;
  title: string;
  message: string;
  category: string;
  channel: string;
  target: string;
  targetRole: string;
  targetUserId?: string | null;
  status: string;
  type: string;
  isRead: boolean;
  readRate: number;
  deliveredCount: number;
  sentAt: string;
  createdAt: string;
}

export class NotificationsRepository {
  private schemaChecked = false;

  constructor(private client: PostgresClient) {}

  private async ensureSchema(): Promise<void> {
    if (this.schemaChecked) return;
    try {
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          target_role VARCHAR(50) DEFAULT 'ALL',
          target_user_id VARCHAR(100),
          type VARCHAR(50) DEFAULT 'INFO',
          is_read BOOLEAN DEFAULT FALSE,
          created_at VARCHAR(50)
        );
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'SYSTEM';
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'APP_PUSH';
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target VARCHAR(255) DEFAULT 'Tất cả khách hàng (Toàn hệ thống)';
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'SENT';
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivered_count INT DEFAULT 0;
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_rate FLOAT DEFAULT 0;
      `);
      this.schemaChecked = true;
    } catch (e: any) {
      console.warn('[NotificationsRepository] ensureSchema warning:', e.message);
    }
  }

  public async getAll(): Promise<NotificationEntity[]> {
    await this.ensureSchema();
    try {
      const res = await this.client.query(
        'SELECT * FROM notifications ORDER BY id DESC'
      );
      return res.rows.map(row => ({
        id: row.id,
        title: row.title,
        message: row.message || '',
        category: row.category || 'SYSTEM',
        channel: row.channel || 'APP_PUSH',
        target: row.target || row.target_role || 'Tất cả khách hàng (Toàn hệ thống)',
        targetRole: row.target_role || 'ALL',
        targetUserId: row.target_user_id || null,
        status: row.status || 'SENT',
        type: row.type || 'INFO',
        isRead: Boolean(row.is_read),
        readRate: row.read_rate !== undefined && row.read_rate !== null ? Number(row.read_rate) : 0,
        deliveredCount: row.delivered_count !== undefined && row.delivered_count !== null ? Number(row.delivered_count) : 0,
        sentAt: row.created_at || new Date().toISOString(),
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } catch (e: any) {
      console.error('[NotificationsRepository] getAll error:', e.message);
      return [];
    }
  }

  public async create(dto: CreateNotificationDto): Promise<NotificationEntity> {
    await this.ensureSchema();
    const title = dto.title.trim();
    const message = (dto.message || dto.body || dto.title).trim();
    const category = dto.category || 'SYSTEM';
    const channel = dto.channel || 'APP_PUSH';
    const target = dto.target || (dto.targetRole === 'ALL' || !dto.targetRole ? 'Tất cả khách hàng (Toàn hệ thống)' : dto.targetRole);
    const targetRole = dto.targetRole || 'ALL';
    const targetUserId = dto.targetUserId || null;
    const status = dto.status || 'SENT';
    const type = dto.type || 'INFO';
    const createdAt = dto.scheduleTime || new Date().toISOString().replace('T', ' ').slice(0, 19);
    const deliveredCount = target.includes('Tất cả') ? 4300 : 1200;
    const readRate = 0;

    const res = await this.client.query(
      `INSERT INTO notifications (
        title, message, category, channel, target, target_role, target_user_id, status, type, is_read, delivered_count, read_rate, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10, $11, $12)
      RETURNING *`,
      [
        title,
        message,
        category,
        channel,
        target,
        targetRole,
        targetUserId,
        status,
        type,
        deliveredCount,
        readRate,
        createdAt,
      ]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      title: row.title,
      message: row.message,
      category: row.category,
      channel: row.channel,
      target: row.target,
      targetRole: row.target_role,
      targetUserId: row.target_user_id,
      status: row.status,
      type: row.type,
      isRead: Boolean(row.is_read),
      readRate: Number(row.read_rate || 0),
      deliveredCount: Number(row.delivered_count || 0),
      sentAt: row.created_at,
      createdAt: row.created_at,
    };
  }

  public async delete(id: number): Promise<boolean> {
    await this.ensureSchema();
    try {
      const res = await this.client.query('DELETE FROM notifications WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    } catch (e: any) {
      console.error('[NotificationsRepository] delete error:', e.message);
      throw e;
    }
  }

  public async markAsRead(id: number): Promise<boolean> {
    await this.ensureSchema();
    try {
      const res = await this.client.query('UPDATE notifications SET is_read = true WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    } catch (e: any) {
      console.error('[NotificationsRepository] markAsRead error:', e.message);
      return false;
    }
  }
}
