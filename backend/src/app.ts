import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import cors from 'cors';
import path from 'path';
import {
  LegacyDataMigrator,
  DynamicSchemaEngine,
  HotCacheClient,
} from '@austec/database';

// Core
import { postgresClient } from './core/database/postgres.client.js';
import { AuthService, AuthenticatedRequest } from './services/auth.service.js';
import { BlackboxService } from './services/blackbox.service.js';
import { ProvisioningService } from './services/provisioning.service.js';
import { CommandService } from './services/command.service.js';
import { SupportService } from './services/support.service.js';
import { PersistenceService } from './services/persistence.service.js';
import { PostgresService } from './services/postgres.service.js';
import { MqttGateway } from './services/mqtt.gateway.js';
import { INITIAL_SEED_USERS, seedDatabase } from './scripts/seed.js';

// Feature Module Routers (NestJS Resource Standard)
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { uploadRouter } from './modules/upload/upload.routes.js';
import { createSettingsRouter } from './modules/settings/settings.routes.js';
import { createStoreRouter } from './modules/store/store.routes.js';
import { createUsersRouter } from './modules/users/users.routes.js';
import { createDevicesRouter } from './modules/devices/devices.routes.js';
import { createBlackboxRouter } from './modules/blackbox/blackbox.routes.js';
import { createCskhRouter } from './modules/cskh/cskh.routes.js';
import { createMqttRouter } from './modules/mqtt/mqtt.routes.js';

export interface UnifiedUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'ADMIN' | 'CSKH' | 'CUSTOMER';
  empID?: string;
  roleTitle?: string;
  department?: string;
  company?: string;
  address?: string;
  province?: string;
  password?: string;
  isActive: boolean;
  registeredAt: string;
  updatedAt?: string;
  updatedBy?: string;
  devices?: any[];
}

interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
  userData?: {
    role: 'ADMIN' | 'CSKH' | 'CUSTOMER';
    customerId?: string;
    userId?: string;
    customerName?: string;
    customerPhone?: string;
  };
}

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Static files & Media upload
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'public/uploads')));


  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/chat' });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  // Database Client Init & Seed
  const persistenceService = new PersistenceService();
  const postgresService = persistenceService.getPostgresService() || new PostgresService();

  postgresClient.connect().then(ok => {
    if (ok) {
      if (postgresService) {
        postgresService.initTables().then(() => {
          postgresService.seedInitialMetadata();
          seedDatabase();
        }).catch(err => {
          console.warn('[Server] Lỗi init/seed Postgres:', err.message);
        });
      }
    }
  });

  // Core Services & Data Migration
  const migrator = new LegacyDataMigrator();
  const migrated = migrator.migrateAll();

  const schemaEngine = new DynamicSchemaEngine();
  migrated.migratedProperties.forEach(p => schemaEngine.registerProperty(p));
  migrated.migratedModels.forEach(m => schemaEngine.registerModel(m));

  const hotCache = new HotCacheClient();
  const blackboxService = new BlackboxService();

  // Restore persistence payload
  const existingBackup = persistenceService.load();
  let usersStore: UnifiedUser[] = existingBackup?.users?.length ? existingBackup.users : [...INITIAL_SEED_USERS];
  let productsStore = existingBackup?.products || [...migrated.migratedProducts];
  let permissionsStore = existingBackup?.permissions || [];
  let supportRequestsStore = existingBackup?.requests || [];

  const provisioningService = new ProvisioningService(
    existingBackup?.deviceInventory || [],
    existingBackup?.deviceInstances || []
  );
  const commandService = new CommandService(blackboxService, hotCache);
  const supportService = new SupportService(hotCache);

  const mqttGateway = new MqttGateway(postgresService, blackboxService, hotCache, (hwId, state) => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'DEVICE_STATE_CHANGE', hardwareId: hwId, state }));
      }
    });
  });
  mqttGateway.start(1883).catch(e => console.warn('[Server] MQTT Gateway warning:', e.message));
  commandService.setMqttGateway(mqttGateway);

  if (existingBackup?.supportTickets && existingBackup?.supportMessages) {
    supportService.importData({
      tickets: existingBackup.supportTickets,
      messages: existingBackup.supportMessages,
    });
  }

  const persistAll = (force = false) => {
    persistenceService.save({
      users: usersStore,
      products: productsStore,
      permissions: permissionsStore,
      requests: supportRequestsStore,
      supportTickets: supportService.exportData().tickets,
      supportMessages: supportService.exportData().messages,
      deviceInventory: provisioningService.exportData().inventory,
      deviceInstances: provisioningService.exportData().instances,
      blackboxLogs: blackboxService.queryLogs({ limit: 1000 }),
    }, force);
  };

  supportService.onUpdate = () => persistAll();

  // Populate hot cache from real instances
  (existingBackup?.deviceInstances || []).forEach(inst => {
    hotCache.setDeviceState(inst.hardwareId, {
      ...inst.currentProperties,
      isOnline: inst.isOnline,
      lastHeartbeat: inst.lastHeartbeat,
    });
  });

  // ==========================================
  // MOUNT FEATURE MODULE ROUTERS (DECORATOR BASED)
  // ==========================================
  app.use('/api', uploadRouter);
  app.use('/api', dashboardRouter);

  app.use('/api', createSettingsRouter(postgresClient));
  app.use('/api', createStoreRouter(postgresClient, productsStore, persistAll));
  app.use('/api', createUsersRouter(usersStore, permissionsStore, persistAll, postgresClient));
  app.use('/api', createDevicesRouter({
    postgresClient,
    postgresService,
    provisioningService,
    commandService,
    mqttGateway,
    wss,
    persistAll,
  }));
  app.use('/api', createBlackboxRouter(postgresClient));
  app.use('/api', createCskhRouter(postgresClient));
  app.use('/api', createMqttRouter(mqttGateway));

  // WebSocket Chat Event Handlers
  const wsClients = new Set<ExtendedWebSocket>();

  wss.on('connection', (ws: ExtendedWebSocket) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    wsClients.add(ws);

    ws.on('message', async (raw) => {
      try {
        const payload = JSON.parse(raw.toString());
        if (payload.type === 'JOIN') {
          const cid = payload.customerId || payload.userId || '00000000-0000-0000-0000-000000000001';
          ws.userData = {
            role: payload.role || 'CUSTOMER',
            customerId: cid,
            userId: cid,
            customerName: payload.customerName || 'Khách Hàng Austec',
            customerPhone: payload.customerPhone || '',
          };
          ws.send(JSON.stringify({ type: 'JOINED', success: true }));
        }
      } catch (_) {}
    });

    ws.on('close', () => { wsClients.delete(ws); });
  });

  const broadcastToCustomer = (customerId: string, data: any) => {
    const jsonStr = JSON.stringify(data);
    for (const c of wsClients) {
      if (c.readyState === WebSocket.OPEN && c.userData?.role === 'CUSTOMER' && c.userData?.customerId === customerId) {
        c.send(jsonStr);
      }
    }
  };

  const broadcastToStaff = (data: any) => {
    const jsonStr = JSON.stringify(data);
    for (const c of wsClients) {
      if (c.readyState === WebSocket.OPEN && (c.userData?.role === 'ADMIN' || c.userData?.role === 'CSKH' || !c.userData?.role)) {
        c.send(jsonStr);
      }
    }
  };

  return {
    app,
    server,
    wss,
    broadcastToCustomer,
    broadcastToStaff,
    services: {
      authService: AuthService,
      schemaEngine,
      hotCache,
      blackboxService,
      provisioningService,
      commandService,
      supportService,
      persistenceService,
    },
    persistAll,
  };
}
