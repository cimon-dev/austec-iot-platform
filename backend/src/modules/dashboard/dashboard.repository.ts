import { postgresClient, PostgresClient } from '../../core/database/postgres.client.js';
import { DashboardStatsEntity } from './entities/dashboard-stats.entity.js';

export class DashboardRepository {
  private client: PostgresClient;

  constructor(client: PostgresClient = postgresClient) {
    this.client = client;
  }

  public async getStats(): Promise<DashboardStatsEntity> {
    try {
      const assignedExpr = `(owner_id IS NOT NULL OR (owner_name IS NOT NULL AND TRIM(owner_name) <> '' AND owner_name <> 'Chưa gán') OR last_heartbeat IS NOT NULL)`;
      const instanceRes = await this.client.query(`
        SELECT
          COUNT(*) FILTER (WHERE is_online = true) AS online_count,
          COUNT(*) FILTER (WHERE COALESCE(is_online, false) = false AND ${assignedExpr}) AS offline_count,
          COUNT(*) FILTER (WHERE COALESCE(is_online, false) = false AND NOT ${assignedExpr}) AS instock_instance_count
        FROM device_instances
      `);
      const extraStockRes = await this.client.query(`
        SELECT COUNT(*) AS extra_stock_count
        FROM device_inventory inv
        WHERE inv.status IN ('MANUFACTURED', 'IN_WAREHOUSE')
          AND NOT EXISTS (
            SELECT 1 FROM device_instances di
            WHERE LOWER(di.hardware_id) = LOWER(inv.hardware_id)
          )
      `);

      const row = instanceRes.rows[0] || {};
      const online = parseInt(row.online_count || '0', 10);
      const offline = parseInt(row.offline_count || '0', 10);
      const inStockFromInstances = parseInt(row.instock_instance_count || '0', 10);
      const extraInStock = parseInt(extraStockRes.rows[0]?.extra_stock_count || '0', 10);
      const inStock = inStockFromInstances + extraInStock;
      const total = online + offline + inStock;

      if (total > 0) {
        const onlinePct = `${((online / total) * 100).toFixed(1)}%`;
        const offlinePct = `${((offline / total) * 100).toFixed(1)}%`;
        const inStockPct = `${((inStock / total) * 100).toFixed(1)}%`;

        return {
          total,
          online,
          offline,
          inStock,
          onlinePct,
          offlinePct,
          inStockPct,
          uptimeSla: '99.9%',
          avgLatencyMs: 25,
        };
      }
    } catch (e: any) {
      console.warn('[DashboardRepository] DB query failed:', e.message);
    }

    return {
      total: 0,
      online: 0,
      offline: 0,
      inStock: 0,
      onlinePct: '0%',
      offlinePct: '0%',
      inStockPct: '0%',
      uptimeSla: '---',
      avgLatencyMs: 0,
    };
  }
}
