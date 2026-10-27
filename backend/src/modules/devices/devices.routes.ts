import { Router } from 'express';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware.js';
import { DevicesController } from './devices.controller.js';
import { DevicesService } from './devices.service.js';
import { DevicesRepository } from './devices.repository.js';
import { PostgresClient, postgresClient } from '../../core/database/postgres.client.js';

export function createDevicesRouter(
  clientOrPostgresService?: any,
  fallbacks: { groups?: any[]; types?: any[]; properties?: any[]; models?: any[] } = {}
): Router {
  const router = Router();
  const client: PostgresClient =
    clientOrPostgresService instanceof PostgresClient ? clientOrPostgresService : postgresClient;

  const repo = new DevicesRepository(client, fallbacks);
  const service = new DevicesService(repo);
  const controller = new DevicesController(service);

  // Groups
  router.get('/admin/groups', authenticate, controller.getGroups);
  router.post('/admin/groups', authenticate, requireRole(['ADMIN']), controller.createGroup);
  router.put('/admin/groups/:id', authenticate, requireRole(['ADMIN']), controller.updateGroup);
  router.delete('/admin/groups/:id', authenticate, requireRole(['ADMIN']), controller.deleteGroup);

  // Device Types
  router.get('/admin/device-types', authenticate, controller.getDeviceTypes);
  router.post('/admin/device-types', authenticate, requireRole(['ADMIN']), controller.createDeviceType);
  router.put('/admin/device-types/:id', authenticate, requireRole(['ADMIN']), controller.updateDeviceType);
  router.delete('/admin/device-types/:id', authenticate, requireRole(['ADMIN']), controller.deleteDeviceType);

  // Properties
  router.get('/admin/properties', authenticate, controller.getProperties);
  router.post('/admin/properties', authenticate, requireRole(['ADMIN']), controller.createProperty);
  router.put('/admin/properties/:id', authenticate, requireRole(['ADMIN']), controller.updateProperty);
  router.delete('/admin/properties/:id', authenticate, requireRole(['ADMIN']), controller.deleteProperty);

  // Models
  router.get('/admin/models', authenticate, controller.getModels);
  router.post('/admin/models', authenticate, requireRole(['ADMIN']), controller.createModel);
  router.put('/admin/models/:id', authenticate, requireRole(['ADMIN']), controller.updateModel);
  router.delete('/admin/models/:id', authenticate, requireRole(['ADMIN']), controller.deleteModel);

  // Devices & Inventory
  router.get('/admin/devices', authenticate, controller.getDevices);
  router.delete('/admin/devices/:hardwareId', authenticate, requireRole(['ADMIN']), controller.deleteDevice);

  // RF Remotes
  router.get('/admin/rf-remotes', authenticate, controller.getRfRemotes);
  router.post('/admin/rf-remotes', authenticate, requireRole(['ADMIN']), controller.addRfRemote);
  router.put('/admin/rf-remotes/:id/toggle-block', authenticate, requireRole(['ADMIN']), controller.toggleBlockRfRemote);

  return router;
}

export const devicesRouter = createDevicesRouter();
