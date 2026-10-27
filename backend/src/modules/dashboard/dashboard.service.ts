import { DashboardRepository } from './dashboard.repository.js';
import { DashboardStatsEntity } from './entities/dashboard-stats.entity.js';

export class DashboardService {
  constructor(private repo: DashboardRepository = new DashboardRepository()) {}

  public async getStats(): Promise<DashboardStatsEntity> {
    return this.repo.getStats();
  }
}
