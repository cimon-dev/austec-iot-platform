import { Router } from 'express';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsRepository } from './notifications.repository.js';
import { PostgresClient, postgresClient } from '../../core/database/postgres.client.js';
import { createRouterFromController } from '../../core/decorators/index.js';

export function createNotificationsRouter(clientOrPostgres?: any): Router {
  const client: PostgresClient =
    clientOrPostgres instanceof PostgresClient ? clientOrPostgres : postgresClient;

  const repo = new NotificationsRepository(client);
  const service = new NotificationsService(repo);
  const controller = new NotificationsController(service);

  return createRouterFromController(controller);
}

export const notificationsRouter = createNotificationsRouter();
