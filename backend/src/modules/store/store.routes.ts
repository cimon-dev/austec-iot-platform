import { Router } from 'express';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware.js';
import { StoreController } from './store.controller.js';
import { StoreService } from './store.service.js';
import { StoreRepository } from './store.repository.js';
import { PostgresClient, postgresClient } from '../../core/database/postgres.client.js';

export function createStoreRouter(
  clientOrPostgresService?: any,
  productsStore: any[] = [],
  persistAll?: (force?: boolean) => void
): Router {
  const router = Router();
  const client: PostgresClient =
    clientOrPostgresService instanceof PostgresClient ? clientOrPostgresService : postgresClient;

  const repo = new StoreRepository(client, productsStore, persistAll);
  const service = new StoreService(repo);
  const controller = new StoreController(service);

  // Shop endpoints
  router.get('/shop/products', controller.getShopProducts);
  router.post('/shop/orders', authenticate, controller.createShopOrder);

  // Admin endpoints
  router.get('/admin/products', authenticate, controller.getAdminProducts);
  router.post('/admin/products', authenticate, requireRole(['ADMIN']), controller.createProduct);
  router.put('/admin/products/:id', authenticate, requireRole(['ADMIN']), controller.updateProduct);
  router.delete('/admin/products/:id', authenticate, requireRole(['ADMIN']), controller.deleteProduct);

  router.get('/admin/orders', authenticate, controller.getOrders);
  router.put('/admin/orders/:id/status', authenticate, requireRole(['ADMIN', 'CSKH']), controller.updateOrderStatus);

  return router;
}

export const storeRouter = createStoreRouter();
