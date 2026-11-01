import { Router } from 'express';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { SettingsRepository } from './settings.repository.js';
import { PostgresClient, postgresClient } from '../../core/database/postgres.client.js';
import { createRouterFromController } from '../../core/decorators/index.js';

export function createSettingsRouter(client: PostgresClient = postgresClient): Router {
  const repo = new SettingsRepository(client);
  const service = new SettingsService(repo);
  const controller = new SettingsController(service);

  return createRouterFromController(controller);
}

export const settingsRouter = createSettingsRouter();

