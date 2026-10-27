import { Router } from 'express';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware.js';
import { BlackboxController } from './blackbox.controller.js';
import { BlackboxService } from './blackbox.service.js';
import { BlackboxRepository } from './blackbox.repository.js';
import { PostgresClient, postgresClient } from '../../core/database/postgres.client.js';

export function createBlackboxRouter(client: PostgresClient = postgresClient): Router {
  const router = Router();
  const repo = new BlackboxRepository(client);
  const service = new BlackboxService(repo);
  const controller = new BlackboxController(service);

  router.get('/blackbox/logs', authenticate, requireRole(['ADMIN']), controller.getLogs);
  router.post('/blackbox/logs', authenticate, controller.createLog);

  router.get('/logs', authenticate, requireRole(['ADMIN']), controller.getLogs);
  router.post('/logs', authenticate, controller.createLog);

  return router;
}

export const blackboxRouter = createBlackboxRouter();
