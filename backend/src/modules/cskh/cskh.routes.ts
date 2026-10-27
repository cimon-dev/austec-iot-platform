import { Router } from 'express';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware.js';
import { CskhController } from './cskh.controller.js';
import { CskhService } from './cskh.service.js';
import { CskhRepository } from './cskh.repository.js';
import { PostgresClient, postgresClient } from '../../core/database/postgres.client.js';

export function createCskhRouter(client: PostgresClient = postgresClient): Router {
  const router = Router();
  const repo = new CskhRepository(client);
  const service = new CskhService(repo);
  const controller = new CskhController(service);

  router.get('/cskh/tickets', authenticate, requireRole(['ADMIN', 'CSKH']), controller.getTickets);
  router.get('/cskh/active-chat', authenticate, controller.getActiveChat);
  router.post('/cskh/tickets', authenticate, controller.createTicket);
  router.put('/cskh/tickets/:id/status', authenticate, requireRole(['ADMIN', 'CSKH']), controller.updateStatus);
  router.post('/cskh/tickets/:ticketId/messages', authenticate, controller.sendMessage);

  return router;
}

export const cskhRouter = createCskhRouter();
