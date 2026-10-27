import { Router } from 'express';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { PostgresClient, postgresClient } from '../../core/database/postgres.client.js';

export function createUsersRouter(
  usersStore: any[] = [],
  permissionsStore: any[] = [],
  persistAll?: (force?: boolean) => void,
  clientOrPostgresService?: any
): Router {
  const router = Router();
  const client: PostgresClient =
    clientOrPostgresService instanceof PostgresClient ? clientOrPostgresService : postgresClient;

  const repo = new UsersRepository(usersStore, permissionsStore, persistAll, client);
  const service = new UsersService(repo);
  const controller = new UsersController(service);

  // Authentication endpoints
  router.post('/auth/login', controller.login);
  router.post('/auth/register', controller.register);
  router.get('/auth/me', authenticate, controller.me);

  // Staff endpoints
  router.get('/admin/staff', authenticate, requireRole(['ADMIN', 'CSKH']), controller.getStaff);
  router.post('/admin/staff', authenticate, requireRole(['ADMIN']), controller.createStaff);
  router.put('/admin/staff/:id', authenticate, requireRole(['ADMIN']), controller.updateStaff);
  router.delete('/admin/staff/:id', authenticate, requireRole(['ADMIN']), controller.deleteStaff);
  router.put('/admin/staff/:id/status', authenticate, requireRole(['ADMIN']), controller.toggleStaffStatus);

  // Customer endpoints
  router.get('/admin/customers', controller.getCustomers);
  router.get('/customers', controller.getCustomers);
  router.post('/admin/customers', authenticate, requireRole(['ADMIN', 'CSKH']), controller.createCustomer);
  router.post('/customers', authenticate, requireRole(['ADMIN', 'CSKH']), controller.createCustomer);
  router.put('/admin/customers/:id/status', authenticate, requireRole(['ADMIN', 'CSKH']), controller.toggleCustomerStatus);

  // System Roles endpoints
  router.get('/admin/roles', authenticate, controller.getRoles);
  router.put('/admin/roles', authenticate, requireRole(['ADMIN']), controller.saveRoles);
  router.put('/admin/roles/:id/permissions', authenticate, requireRole(['ADMIN']), controller.updateRolePermissions);
  router.delete('/admin/roles/:id', authenticate, requireRole(['ADMIN']), controller.deleteRole);

  return router;

}

export const usersRouter = createUsersRouter();
