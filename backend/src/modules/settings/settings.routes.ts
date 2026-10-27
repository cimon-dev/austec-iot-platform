import { Router } from 'express';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware.js';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { SettingsRepository } from './settings.repository.js';
import { PostgresClient, postgresClient } from '../../core/database/postgres.client.js';

export function createSettingsRouter(client: PostgresClient = postgresClient): Router {
  const router = Router();
  const repo = new SettingsRepository(client);
  const service = new SettingsService(repo);
  const controller = new SettingsController(service);

  router.get('/admin/settings', authenticate, controller.getSettings);
  router.put('/admin/settings', authenticate, requireRole(['ADMIN']), controller.updateSettings);

  router.get('/settings', authenticate, controller.getSettings);
  router.put('/settings', authenticate, requireRole(['ADMIN']), controller.updateSettings);

  return router;
}

export const settingsRouter = createSettingsRouter();
