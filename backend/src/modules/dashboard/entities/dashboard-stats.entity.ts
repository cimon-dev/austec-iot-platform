export interface DashboardStatsEntity {
  total: number;
  online: number;
  offline: number;
  inStock: number;
  onlinePct: string;
  offlinePct: string;
  inStockPct: string;
  uptimeSla: string;
  avgLatencyMs: number;
}
