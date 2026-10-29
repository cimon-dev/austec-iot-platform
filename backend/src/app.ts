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
  app.use('/api/upload', uploadRouter);
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
  // MOUNT FEATURE MODULE ROUTERS
  // ==========================================
  app.use('/api', dashboardRouter);
  app.use('/api', createSettingsRouter(postgresClient));
  app.use('/api', createStoreRouter(postgresClient, productsStore, persistAll));
  app.use('/api', createUsersRouter(usersStore, permissionsStore, persistAll, postgresClient));
  app.use('/api', createDevicesRouter(postgresClient, {
    groups: [],
    types: [],
    properties: [],
    models: [],
  }));
  app.use('/api', createBlackboxRouter(postgresClient));
  app.use('/api', createCskhRouter(postgresClient));
  app.use('/api', createMqttRouter(mqttGateway));

  // Device Operations (Pairing, Live Telemetry, Command Dispatch)
  app.post('/api/pairing/simulate-onboard', async (req, res) => {
    try {
      const { hardwareId, userId, modelCode, customerName, ownerName } = req.body;
      if (!hardwareId) {
        return res.status(400).json({ success: false, error: 'Thiếu hardwareId' });
      }
      const targetUser = userId || '00000000-0000-0000-0000-000000000001';
      const targetModel = modelCode || 'DOOR_GERMAN_ALU';
      const finalCustomerName = customerName || `Cửa cuốn ${hardwareId}`;
      const finalOwnerName = ownerName || customerName || 'Chủ sở hữu';

      if (postgresService && postgresClient.getConnected()) {
        const result = await postgresService.registerPairingDevice(
          hardwareId,
          targetModel,
          targetUser,
          finalCustomerName,
          finalOwnerName
        );
        return res.json({
          success: true,
          message: `Kích hoạt onboard thiết bị [${hardwareId}] thành công!`,
          ...result,
        });
      }

      const pairResult = provisioningService.pairDevice({
        hardwareId,
        qrCodeHash: '',
        userId: targetUser,
        customName: finalCustomerName,
      });
      persistAll(true);
      res.json({
        success: true,
        message: `Kích hoạt onboard thiết bị [${hardwareId}] thành công!`,
        hardwareId,
        ownerName: finalOwnerName,
        status: 'INSTALLED',
        warrantyUntil: new Date(Date.now() + 24 * 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/devices/pair', AuthService.authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { hardwareId, qrHash, deviceName, location, customName, wifiSsid } = req.body;
      const targetUser = req.user!;
      if (!hardwareId) {
        return res.status(400).json({ success: false, error: 'Thiếu thông tin Hardware ID' });
      }
      const finalName = customName || deviceName || 'Cửa Cuốn Gia Đình';

      if (postgresClient.getConnected()) {
        await postgresClient.query(
          `UPDATE device_inventory SET status = 'ACTIVE' WHERE hardware_id = $1`,
          [hardwareId]
        );
        const instRes = await postgresClient.query(
          `INSERT INTO device_instances (id, hardware_id, owner_id, custom_name, address_display, is_online, subscription_type, subscription_status, warranty_start_at, warranty_end_at, created_at)
           VALUES ($1, $2, $3, $4, $5, true, 'STANDARD', 'ACTIVE', NOW()::text, (NOW() + INTERVAL '2 years')::text, NOW()::text)
           ON CONFLICT (hardware_id) DO UPDATE SET
             owner_id = EXCLUDED.owner_id,
             custom_name = EXCLUDED.custom_name,
             address_display = EXCLUDED.address_display,
             is_online = true
           RETURNING *`,
          [hardwareId, hardwareId, targetUser.id, finalName, location || 'Nhà riêng']
        );
        const permId = `PERM-${hardwareId}-${targetUser.id.slice(0, 8)}`;
        await postgresClient.query(
          `INSERT INTO device_permissions (id, hardware_id, user_id, member_name, role, can_control, can_view_history, can_child_lock, can_config, created_at)
           VALUES ($1, $2, $3, $4, 'OWNER', true, true, true, true, NOW()::text)
           ON CONFLICT (id) DO UPDATE SET can_control = true, role = 'OWNER'`,
          [permId, hardwareId, targetUser.id, targetUser.fullName || targetUser.email || 'Chủ sở hữu']
        );
        const inst = instRes.rows[0];
        const warrantyUntil = inst.warranty_end_at ? new Date(inst.warranty_end_at).toISOString().slice(0, 10) : '2028-10-23';
        const warrantyCode = `EW-${hardwareId.replace(/-/g, '').toUpperCase()}-24M`;

        return res.json({
          success: true,
          message: 'Ghép nối thiết bị và kích hoạt bảo hành điện tử thành công!',
          instance: inst,
          device: {
            ...inst,
            warrantyUntil,
            warrantyCode,
          },
        });
      }

      const pairResult = provisioningService.pairDevice({
        hardwareId,
        qrCodeHash: qrHash || '',
        userId: targetUser.id,
        customName: finalName,
        addressDisplay: location,
      });
      persistAll(true);
      const warrantyUntil = new Date(Date.now() + 24 * 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const warrantyCode = `EW-${hardwareId.replace(/-/g, '').toUpperCase()}-24M`;

      res.json({
        success: true,
        message: 'Ghép nối thiết bị thành công!',
        instance: pairResult.device,
        device: {
          ...pairResult.device,
          warrantyUntil,
          warrantyCode,
        },
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.get('/api/devices/my', AuthService.authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const targetUser = req.user!;
      if (postgresClient.getConnected()) {
        const query = `
          SELECT di.*, dp.role as user_role, dp.can_control, m.model_name
          FROM device_instances di
          JOIN device_permissions dp ON dp.hardware_id = di.hardware_id
          LEFT JOIN device_inventory inv ON inv.hardware_id = di.hardware_id
          LEFT JOIN device_models m ON m.id = inv.model_id
          WHERE dp.user_id = $1
          ORDER BY di.created_at DESC
        `;
        const result = await postgresClient.query(query, [targetUser.id]);
        if (result.rows.length > 0) {
          const devices = result.rows.map(r => ({
            id: r.id,
            hardwareId: r.hardware_id,
            modelName: r.model_name || 'Austec Titadoor A900 Super',
            deviceName: r.custom_name || r.model_name || 'Cửa cuốn Austec',
            deviceType: r.device_type || 'Cửa cuốn',
            isOnline: r.is_online,
            roleInHome: r.user_role || 'OWNER',
            warrantyUntil: r.warranty_end_at || '2028-10-22',
            currentProperties: r.current_properties || {},
          }));
          return res.json({ success: true, devices, total: devices.length });
        }
      }

      const devices = provisioningService.getDevicesByOwner(targetUser.id);
      res.json({ success: true, devices, total: devices.length });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/devices/control', AuthService.authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const hardwareId = req.body.hardwareId;
      const command = req.body.command || req.body.action;
      const params = req.body.params || req.body.parameters;
      const targetUser = req.user!;
      if (!hardwareId || !command) {
        return res.status(400).json({ success: false, error: 'Thiếu hardwareId hoặc command' });
      }

      const result = await commandService.dispatchCommand({
        hardwareId,
        command,
        params,
        actorId: targetUser.id,
        actorRole: targetUser.role as any,
        actorIp: req.ip || '127.0.0.1',
      });

      if (postgresClient.getConnected()) {
        await postgresClient.query(
          `UPDATE device_instances 
           SET current_properties = jsonb_set(COALESCE(current_properties, '{}'::jsonb), '{door_state}', to_jsonb($1::text)),
               last_heartbeat = NOW()
           WHERE hardware_id = $2`,
          [command, hardwareId]
        );
      }

      wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) {
          c.send(JSON.stringify({
            type: 'DEVICE_STATE_CHANGE',
            hardwareId,
            state: { door_state: command, timestamp: new Date().toISOString() },
          }));
        }
      });

      res.json({ success: true, result });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

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
