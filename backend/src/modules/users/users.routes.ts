import { Router } from 'express';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { PostgresClient, postgresClient } from '../../core/database/postgres.client.js';
import { createRouterFromController } from '../../core/decorators/index.js';

export function createUsersRouter(
  usersStore: any[] = [],
  permissionsStore: any[] = [],
  persistAll?: (force?: boolean) => void,
  clientOrPostgresService?: any
): Router {
  const client: PostgresClient =
    clientOrPostgresService instanceof PostgresClient ? clientOrPostgresService : postgresClient;

  const repo = new UsersRepository(usersStore, permissionsStore, persistAll, client);
  const service = new UsersService(repo);
  const controller = new UsersController(service);

  return createRouterFromController(controller);
}

export const usersRouter = createUsersRouter();

