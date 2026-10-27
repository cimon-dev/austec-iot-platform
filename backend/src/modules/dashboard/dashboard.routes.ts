import { Router } from 'express';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { DashboardRepository } from './dashboard.repository.js';
import { PostgresClient, postgresClient } from '../../core/database/postgres.client.js';

export function createDashboardRouter(client: PostgresClient = postgresClient): Router {
  const router = Router();
  const repo = new DashboardRepository(client);
  const service = new DashboardService(repo);
  const controller = new DashboardController(service);

  router.get('/dashboard/stats', controller.getStats);

  return router;
}

export const dashboardRouter = createDashboardRouter();
