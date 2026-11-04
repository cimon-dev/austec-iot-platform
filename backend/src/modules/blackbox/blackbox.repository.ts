import crypto from 'crypto';
import { postgresClient, PostgresClient } from '../../core/database/postgres.client.js';
import { BlackboxLogEntity } from './entities/blackbox-log.entity.js';
import { CreateBlackboxLogDto, QueryBlackboxLogsDto } from './dto/blackbox.dto.js';

export class BlackboxRepository {
  private client: PostgresClient;
  private inMemLogs: BlackboxLogEntity[] = [];

  constructor(client: PostgresClient = postgresClient) {
    this.client = client;
  }

  private async ensureTable(): Promise<void> {
    const ddl = `
      CREATE TABLE IF NOT EXISTS blackbox_audit_logs (
        id SERIAL PRIMARY KEY,
        hardware_id VARCHAR(100) NOT NULL,
        model_name VARCHAR(255),
        action_type VARCHAR(100) NOT NULL,
        payload JSONB DEFAULT '{}'::jsonb,
        actor_id VARCHAR(100),
        actor_email VARCHAR(255),
        actor_role VARCHAR(50),
        client_ip VARCHAR(50),
        latency_ms INT DEFAULT 0,
        ack_status VARCHAR(50) DEFAULT 'ACKNOWLEDGED',
        crypto_signature VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    try {
      await this.client.query(ddl);
    } catch (err: any) {
      console.warn('[BlackboxRepository] Error ensuring blackbox_audit_logs table:', err.message);
    }
  }

  public async insertLog(data: CreateBlackboxLogDto): Promise<BlackboxLogEntity> {
    const signature =
      data.cryptoSignature ||
      crypto
        .createHash('sha256')
        .update(`${data.hardwareId}-${data.actionType}-${Date.now()}`)
        .digest('hex');

    try {
      await this.ensureTable();
      const query = `
        INSERT INTO blackbox_logs (
          hardware_id, actor_id, actor_role, actor_name, actor_ip,
          action_type, payload_sent, ack_status, latency_ms,
          crypto_signature, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()::text)
        RETURNING *;
      `;

      const res = await this.client.query(query, [
        data.hardwareId,
        data.actorId || 'system',
        data.actorRole || 'CUSTOMER',
        data.actorEmail || 'austec.admin@gmail.com',
        data.clientIp || '127.0.0.1',
        data.actionType,
        JSON.stringify(data.payload || {}),
        data.ackStatus || 'ACK_OK',
        data.latencyMs || 50,
        signature,
      ]);

      const r = res.rows[0];
      const entity = this.mapRowToEntity(r);
      this.inMemLogs.unshift(entity);
      return entity;
    } catch (err: any) {
      console.warn('[BlackboxRepository] DB insert failed, saving in memory:', err.message);
      const fallbackEntity: BlackboxLogEntity = {
        id: `BBX-${Date.now()}`,
        hardwareId: data.hardwareId,
        modelName: data.modelName || 'Austec Titadoor A900 Super',
        actionType: data.actionType,
        commandType: data.actionType,
        payload: data.payload,
        payloadSent: data.payload,
        actorId: data.actorId,
        userId: data.actorId,
        actorEmail: data.actorEmail,
        userEmail: data.actorEmail,
        actorRole: data.actorRole,
        userRole: data.actorRole,
        clientIp: data.clientIp,
        latencyMs: data.latencyMs,
        ackStatus: data.ackStatus as any,
        status: data.ackStatus as any,
        cryptoSignature: signature,
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      };
      this.inMemLogs.unshift(fallbackEntity);
      return fallbackEntity;
    }
  }

  public async getLogs(query: QueryBlackboxLogsDto): Promise<BlackboxLogEntity[]> {
    try {
      await this.ensureTable();
      let sql = `
        SELECT 
          b.id,
          b.hardware_id,
          COALESCE(di.custom_name, di.model_name, 'Austec Smart Gateway') as model_name,
          b.action_type,
          COALESCE(b.payload_sent, '{}'::jsonb) as payload,
          b.actor_id,
          COALESCE(b.actor_name, b.actor_id, 'Chủ nhà') as actor_email,
          COALESCE(b.actor_role, 'CUSTOMER') as actor_role,
          COALESCE(b.actor_ip, '127.0.0.1') as client_ip,
          COALESCE(b.latency_ms, 35)::int as latency_ms,
          CASE 
            WHEN b.ack_status = 'ACK_OK' OR b.ack_status = 'SUCCESS' THEN 'ACKNOWLEDGED'
            ELSE COALESCE(b.ack_status, 'ACKNOWLEDGED')
          END as ack_status,
          b.crypto_signature,
          b.created_at
        FROM blackbox_logs b
        LEFT JOIN device_instances di ON di.hardware_id = b.hardware_id
        WHERE 1=1
      `;
      const params: any[] = [];
      let idx = 1;

      if (query.hardwareId) {
        sql += ` AND b.hardware_id ILIKE $${idx++}`;
        params.push(`%${query.hardwareId}%`);
      }
      if (query.actionType) {
        sql += ` AND b.action_type = $${idx++}`;
        params.push(query.actionType);
      }
      if (query.ackStatus) {
        sql += ` AND b.ack_status = $${idx++}`;
        params.push(query.ackStatus);
      }

      sql += ` ORDER BY b.id DESC LIMIT $${idx++} OFFSET $${idx++}`;
      params.push(query.limit || 100, query.offset || 0);

      const res = await this.client.query(sql, params);
      if (res.rows && res.rows.length > 0) {
        return res.rows.map(r => this.mapRowToEntity(r));
      }
      return [];
    } catch (err: any) {
      console.error('[BlackboxRepository] DB query failed, error:', err.message);
      throw err;
    }
  }

  private mapRowToEntity(r: any): BlackboxLogEntity {
    const timeIso = r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString();
    return {
      id: r.id,
      hardwareId: r.hardware_id,
      modelName: r.model_name || 'Austec Titadoor A900 Super',
      actionType: r.action_type,
      commandType: r.action_type,
      payload: r.payload || {},
      payloadSent: r.payload || {},
      actorId: r.actor_id,
      userId: r.actor_id,
      actorEmail: r.actor_email,
      userEmail: r.actor_email,
      actorRole: r.actor_role,
      userRole: r.actor_role,
      clientIp: r.client_ip,
      latencyMs: r.latency_ms,
      ackStatus: r.ack_status,
      status: r.ack_status,
      cryptoSignature: r.crypto_signature,
      createdAt: timeIso,
      timestamp: timeIso,
    };
  }
}
