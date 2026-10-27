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
        INSERT INTO blackbox_audit_logs (
          hardware_id, model_name, action_type, payload,
          actor_id, actor_email, actor_role, client_ip,
          latency_ms, ack_status, crypto_signature, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING *;
      `;

      const res = await this.client.query(query, [
        data.hardwareId,
        data.modelName || 'Austec Titadoor A900 Super',
        data.actionType,
        JSON.stringify(data.payload || {}),
        data.actorId || 'system',
        data.actorEmail || 'system@austec.vn',
        data.actorRole || 'CUSTOMER',
        data.clientIp || '127.0.0.1',
        data.latencyMs || 50,
        data.ackStatus || 'ACKNOWLEDGED',
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
      let sql = 'SELECT * FROM blackbox_audit_logs WHERE 1=1';
      const params: any[] = [];
      let idx = 1;

      if (query.hardwareId) {
        sql += ` AND hardware_id = $${idx++}`;
        params.push(query.hardwareId);
      }
      if (query.actionType) {
        sql += ` AND action_type = $${idx++}`;
        params.push(query.actionType);
      }
      if (query.ackStatus) {
        sql += ` AND ack_status = $${idx++}`;
        params.push(query.ackStatus);
      }

      sql += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
      params.push(query.limit || 100, query.offset || 0);

      const res = await this.client.query(sql, params);
      if (res.rows.length > 0) {
        return res.rows.map(r => this.mapRowToEntity(r));
      }
    } catch (err: any) {
      console.warn('[BlackboxRepository] DB query failed, falling back to memory:', err.message);
    }

    // Fallback in-memory
    let logs = [...this.inMemLogs];
    if (query.hardwareId) {
      logs = logs.filter(l => l.hardwareId === query.hardwareId);
    }
    if (query.actionType) {
      logs = logs.filter(l => l.actionType === query.actionType);
    }
    return logs.slice(0, query.limit || 100);
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
