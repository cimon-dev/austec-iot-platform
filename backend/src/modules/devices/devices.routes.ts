import { Router } from 'express';
import { DevicesController } from './devices.controller.js';
import { DevicesService } from './devices.service.js';
import { DevicesRepository } from './devices.repository.js';
import { DeviceOperationsController, DevicePairingController, DeviceOperationsDependencies } from './device-operations.controller.js';
import { PostgresClient, postgresClient } from '../../core/database/postgres.client.js';
import { createRouterFromController } from '../../core/decorators/index.js';

export function createDevicesRouter(
  clientOrOptions?: any,
  fallbacks: { groups?: any[]; types?: any[]; properties?: any[]; models?: any[] } = {},
  extraDeps: DeviceOperationsDependencies = {}
): Router {
  const router = Router();

  let client: PostgresClient = postgresClient;
  let deps: DeviceOperationsDependencies = { ...extraDeps };

  if (clientOrOptions instanceof PostgresClient) {
    client = clientOrOptions;
  } else if (clientOrOptions && typeof clientOrOptions === 'object') {
    if (clientOrOptions.client instanceof PostgresClient) {
      client = clientOrOptions.client;
    } else if (clientOrOptions.postgresClient instanceof PostgresClient) {
      client = clientOrOptions.postgresClient;
    }
    deps = { ...clientOrOptions, ...extraDeps };
  }

  deps.client = client;

  // 1. Admin Device Management Controller (Decorated with @Controller('/admin'))
  const repo = new DevicesRepository(client, fallbacks);
  const service = new DevicesService(repo);
  const adminController = new DevicesController(service);

  // 2. Client Device Operations Controller (Decorated with @Controller('/devices'))
  const operationsController = new DeviceOperationsController(deps);

  // 3. Pairing Controller (Decorated with @Controller('/pairing'))
  const pairingController = new DevicePairingController(deps);

  // Auto-mount routers generated from Controller Decorators
  router.use(createRouterFromController(adminController));
  router.use(createRouterFromController(operationsController));
  router.use(createRouterFromController(pairingController));

  return router;
}

export const devicesRouter = createDevicesRouter();
