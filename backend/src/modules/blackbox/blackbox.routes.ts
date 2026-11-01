import { Router } from 'express';
import { BlackboxController } from './blackbox.controller.js';
import { BlackboxService } from './blackbox.service.js';
import { BlackboxRepository } from './blackbox.repository.js';
import { PostgresClient, postgresClient } from '../../core/database/postgres.client.js';
import { createRouterFromController } from '../../core/decorators/index.js';

export function createBlackboxRouter(client: PostgresClient = postgresClient): Router {
  const repo = new BlackboxRepository(client);
  const service = new BlackboxService(repo);
  const controller = new BlackboxController(service);

  return createRouterFromController(controller);
}

export const blackboxRouter = createBlackboxRouter();

