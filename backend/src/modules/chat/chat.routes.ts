import { Router } from 'express';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { ChatRepository } from './chat.repository.js';
import { PostgresClient, postgresClient } from '../../core/database/postgres.client.js';
import { createRouterFromController } from '../../core/decorators/index.js';

export function createChatRouter(client: PostgresClient = postgresClient): Router {
  const repo = new ChatRepository(client);
  const service = new ChatService(repo);
  const controller = new ChatController(service);

  return createRouterFromController(controller);
}

export const chatRouter = createChatRouter();
