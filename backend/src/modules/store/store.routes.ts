import { Router } from 'express';
import { StoreController } from './store.controller.js';
import { StoreService } from './store.service.js';
import { StoreRepository } from './store.repository.js';
import { PostgresClient, postgresClient } from '../../core/database/postgres.client.js';
import { createRouterFromController } from '../../core/decorators/index.js';

export function createStoreRouter(
  clientOrPostgresService?: any,
  productsStore: any[] = [],
  persistAll?: (force?: boolean) => void
): Router {
  const client: PostgresClient =
    clientOrPostgresService instanceof PostgresClient ? clientOrPostgresService : postgresClient;

  const repo = new StoreRepository(client, productsStore, persistAll);
  const service = new StoreService(repo);
  const controller = new StoreController(service);

  return createRouterFromController(controller);
}

export const storeRouter = createStoreRouter();

