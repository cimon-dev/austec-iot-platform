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
  targetModel?: string | null;
  status: string;
  type: string;
  isRead: boolean;
  readRate: number;
  deliveredCount: number;
  scheduledAt?: string | null;
  sentAt: string;
  createdAt: string;
}

export class NotificationsRepository {
  private schemaChecked = false;
  private syncTimer: any = null;

  constructor(private client: PostgresClient) {
    // Start background sync every 15 seconds to auto-transition scheduled notifications
    this.syncTimer = setInterval(() => {
      this.syncScheduledNotifications().catch(() => {});
    }, 15000);
  }

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
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS scheduled_at VARCHAR(50);
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_model VARCHAR(100);
      `);
      this.schemaChecked = true;
    } catch (e: any) {
      console.warn('[NotificationsRepository] ensureSchema warning:', e.message);
    }
  }

  public async syncScheduledNotifications(): Promise<void> {
    await this.ensureSchema();
    try {
      const now = new Date();
      const nowIso = now.toISOString();
      const nowStr = nowIso.replace('T', ' ').slice(0, 19);
      // Auto-transition SCHEDULED notifications whose scheduled_at <= now to SENT
      await this.client.query(`
        UPDATE notifications
        SET status = 'SENT',
            created_at = COALESCE(scheduled_at, created_at)
        WHERE status = 'SCHEDULED'
          AND (
            (scheduled_at IS NOT NULL AND (scheduled_at <= $1 OR scheduled_at <= $2))
            OR (scheduled_at IS NULL AND (created_at <= $1 OR created_at <= $2))
          )
      `, [nowIso, nowStr]);
    } catch (e: any) {
      console.warn('[NotificationsRepository] syncScheduledNotifications warning:', e.message);
    }
  }

  public async getAll(): Promise<NotificationEntity[]> {
    await this.ensureSchema();
    await this.syncScheduledNotifications();
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
        targetModel: row.target_model || null,
        status: row.status || 'SENT',
        type: row.type || 'INFO',
        isRead: Boolean(row.is_read),
        readRate: row.read_rate !== undefined && row.read_rate !== null ? Number(row.read_rate) : 0,
        deliveredCount: row.delivered_count !== undefined && row.delivered_count !== null ? Number(row.delivered_count) : 0,
        scheduledAt: row.scheduled_at || null,
        sentAt: row.created_at || new Date().toISOString(),
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } catch (e: any) {
      console.error('[NotificationsRepository] getAll error:', e.message);
      return [];
    }
  }

  public async getPublicNotifications(filter?: { role?: string; userId?: string; model?: string }): Promise<NotificationEntity[]> {
    await this.ensureSchema();
    await this.syncScheduledNotifications();
    try {
      let sql = "SELECT * FROM notifications WHERE status = 'SENT'";
      const params: any[] = [];

      if (filter?.userId) {
        params.push(filter.userId);
        sql += ` AND (target_user_id IS NULL OR target_user_id = $${params.length} OR target_role = 'ALL' OR target_role = 'CUSTOMER')`;
      }

      if (filter?.model) {
        params.push(filter.model);
        sql += ` AND (target_model IS NULL OR target_model = '' OR target_model = $${params.length} OR target ILIKE '%' || $${params.length} || '%' OR target_role = 'ALL')`;
      }

      sql += ' ORDER BY id DESC LIMIT 50';

      const res = await this.client.query(sql, params);
      return res.rows.map(row => ({
        id: row.id,
        title: row.title,
        message: row.message || '',
        category: row.category || 'SYSTEM',
        channel: row.channel || 'APP_PUSH',
        target: row.target || row.target_role || 'Tất cả khách hàng (Toàn hệ thống)',
        targetRole: row.target_role || 'ALL',
        targetUserId: row.target_user_id || null,
        targetModel: row.target_model || null,
        status: row.status || 'SENT',
        type: row.type || 'INFO',
        isRead: Boolean(row.is_read),
        readRate: row.read_rate !== undefined && row.read_rate !== null ? Number(row.read_rate) : 0,
        deliveredCount: row.delivered_count !== undefined && row.delivered_count !== null ? Number(row.delivered_count) : 0,
        scheduledAt: row.scheduled_at || null,
        sentAt: row.created_at || new Date().toISOString(),
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } catch (e: any) {
      console.error('[NotificationsRepository] getPublicNotifications error:', e.message);
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
    const targetRole = dto.targetRole || (target.includes('Tất cả') ? 'ALL' : 'CUSTOMER');
    const targetUserId = dto.targetUserId || null;
    const targetModel = dto.targetModel || (target.startsWith('Model: ') ? target.replace('Model: ', '').trim() : null);

    const scheduledAt = dto.scheduleTime && dto.scheduleTime.trim().length > 0 ? dto.scheduleTime.trim() : null;
    let status = dto.status || 'SENT';
    if (scheduledAt && status !== 'DRAFT') {
      const scheduledDate = new Date(scheduledAt.includes('T') ? scheduledAt : scheduledAt.replace(' ', 'T'));
      if (!isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now()) {
        status = 'SCHEDULED';
      } else {
        status = 'SENT';
      }
    }

    const type = dto.type || 'INFO';
    const createdAt = scheduledAt || new Date().toISOString().replace('T', ' ').slice(0, 19);
    const deliveredCount = target.includes('Tất cả') ? 4300 : 1200;
    const readRate = 0;

    const res = await this.client.query(
      `INSERT INTO notifications (
        title, message, category, channel, target, target_role, target_user_id, target_model, status, type, is_read, delivered_count, read_rate, scheduled_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, $11, $12, $13, $14)
      RETURNING *`,
      [
        title,
        message,
        category,
        channel,
        target,
        targetRole,
        targetUserId,
        targetModel,
        status,
        type,
        deliveredCount,
        readRate,
        scheduledAt,
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
      targetModel: row.target_model,
      status: row.status,
      type: row.type,
      isRead: Boolean(row.is_read),
      readRate: Number(row.read_rate || 0),
      deliveredCount: Number(row.delivered_count || 0),
      scheduledAt: row.scheduled_at || null,
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
