import { Router } from 'express';
import { CskhController } from './cskh.controller.js';
import { CskhService } from './cskh.service.js';
import { CskhRepository } from './cskh.repository.js';
import { PostgresClient, postgresClient } from '../../core/database/postgres.client.js';
import { createRouterFromController } from '../../core/decorators/index.js';

export function createCskhRouter(client: PostgresClient = postgresClient): Router {
  const repo = new CskhRepository(client);
  const service = new CskhService(repo);
  const controller = new CskhController(service);

  return createRouterFromController(controller);
}

export const cskhRouter = createCskhRouter();

