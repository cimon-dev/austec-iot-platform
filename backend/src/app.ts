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
import { createChatRouter } from './modules/chat/chat.routes.js';
import { createNotificationsRouter } from './modules/notifications/notifications.routes.js';
import { ChatRepository } from './modules/chat/chat.repository.js';

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
    currentConversationId?: string;
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
  app.use('/api', createChatRouter(postgresClient));
  app.use('/api', createNotificationsRouter(postgresClient));
  app.use('/api', createMqttRouter(mqttGateway));

  const chatRepository = new ChatRepository(postgresClient);

  // WebSocket Chat Event Handlers
  const wsClients = new Set<ExtendedWebSocket>();

  function formatLiveMessage(m: any) {
    const d = new Date(m.createdAt);
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const isCSKH = m.senderRole === 'CSKH';
    const attachments = m.attachmentUrls || m.images || [];
    return {
      id: m.id,
      ticketId: m.ticketId,
      sender: isCSKH ? 'CSKH' : 'user',
      senderRole: m.senderRole,
      text: m.message,
      message: m.message,
      time: timeStr,
      createdAt: m.createdAt,
      attachmentUrls: attachments,
      images: attachments,
      selectedDevice: m.selectedDevice,
      hasSnapshot: !!(m.deviceSnapshot && Object.keys(m.deviceSnapshot).length > 0),
      deviceSnapshot: m.deviceSnapshot,
    };
  }

  function enrichTicket(t: any, formattedMessages: any[]) {
    const customer = usersStore.find(u => u.id === t.customerId);
    const lastMsg = formattedMessages.length > 0 ? formattedMessages[formattedMessages.length - 1] : undefined;
    const device = t.selectedDevice || customer?.devices?.[0];
    return {
      id: t.id,
      customerId: t.customerId,
      customerName: customer?.fullName || t.subject?.replace('Kênh hỗ trợ 1-1 cho khách hàng ', '') || 'Khách hàng Austec',
      customerPhone: customer?.phoneNumber || '---',
      customerEmail: customer?.email || '',
      hardwareId: t.hardwareId || device?.hardwareId || 'AT-DOOR-88239A01',
      deviceName: device?.deviceName || device?.modelName || customer?.devices?.[0]?.modelName || 'Cửa cuốn Austec Titadoor A900 Super',
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      selectedDevice: t.selectedDevice || device,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      messages: formattedMessages,
      lastMessage: lastMsg ? {
        text: lastMsg.text,
        sender: lastMsg.senderRole === 'CSKH' ? 'CSKH' : 'CUSTOMER',
        time: lastMsg.time,
      } : undefined,
      technicalSnapshot: {
        model: device?.modelName || customer?.devices?.[0]?.modelName || "Austec Titadoor A900 Super",
        hardwareId: t.hardwareId || device?.hardwareId || 'AT-DOOR-88239A01',
        firmware: "v2.4.1",
        signal: "-65 dBm",
        status: "ONLINE",
        safetyBrake: "Hoạt động tốt",
        childLock: "Bật",
        doorCycleCount: 1420,
        voltage: "220V / 50Hz",
        motorTemp: "42°C",
      },
    };
  }

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

  function broadcastAllTickets() {
    const rawTickets = supportService.getAllOpenTickets();
    const tickets = rawTickets
      .filter(t => supportService.hasActiveMessages(t.id))
      .map(t => {
        const rawMsgs = supportService.getMessagesByTicket(t.id);
        return enrichTicket(t, rawMsgs.map(m => formatLiveMessage(m)));
      });
    broadcastToStaff({
      type: 'TICKETS_UPDATED',
      tickets,
    });
  }

  wss.on('connection', (ws: ExtendedWebSocket) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    wsClients.add(ws);

    ws.on('message', async (raw) => {
      try {
        const payload = JSON.parse(raw.toString());
        const { type } = payload;

        switch (type) {
          case 'JOIN': {
            const cid = payload.customerId || payload.userId || '00000000-0000-0000-0000-000000000001';
            ws.userData = {
              role: payload.role || 'CUSTOMER',
              customerId: cid,
              userId: cid,
              customerName: payload.customerName || 'Khách Hàng Austec',
              customerPhone: payload.customerPhone || '',
            };
            ws.send(JSON.stringify({
              type: 'JOINED',
              success: true,
              role: ws.userData.role,
              customerId: ws.userData.customerId,
            }));

            // Nếu là nhân viên CSKH/Admin vừa vào, gửi toàn bộ tickets đang có
            if (ws.userData.role === 'ADMIN' || ws.userData.role === 'CSKH') {
              const rawTickets = supportService.getAllOpenTickets();
              const tickets = rawTickets
                .filter(t => supportService.hasActiveMessages(t.id))
                .map(t => {
                  const rawMsgs = supportService.getMessagesByTicket(t.id);
                  return enrichTicket(t, rawMsgs.map(m => formatLiveMessage(m)));
                });
              ws.send(JSON.stringify({ type: 'TICKETS_UPDATED', tickets }));
            } else if (ws.userData.customerId) {
              // Nếu là Customer, gửi lại ticket hiện tại của họ nếu có
              const myTicket = supportService.findActiveCustomerTicket(ws.userData.customerId);
              if (myTicket) {
                const rawMsgs = supportService.getMessagesByTicket(myTicket.id);
                const enriched = enrichTicket(myTicket, rawMsgs.map(m => formatLiveMessage(m)));
                ws.send(JSON.stringify({
                  type: 'JOINED',
                  success: true,
                  ticket: enriched,
                  messages: rawMsgs.map(m => formatLiveMessage(m)),
                }));
              }
            }
            break;
          }

          case 'PING': {
            ws.send(JSON.stringify({ type: 'PONG' }));
            break;
          }

          case 'START_CONVERSATION': {
            const { customerId, customerName, customerPhone, hardwareId, message, images, attachmentUrls, selectedDevice } = payload;
            const targetCustomerId = customerId || ws.userData?.customerId || '00000000-0000-0000-0000-000000000001';
            const targetUser = usersStore.find(u => u.id === targetCustomerId);
            const actualName = customerName || targetUser?.fullName || ws.userData?.customerName || 'Khách Hàng Austec';
            const actualMsg = (message || '').toString().trim() || 'Xin chào CSKH Austec! Tôi cần hỗ trợ kỹ thuật về thiết bị của mình.';
            const actualHwId = hardwareId || selectedDevice?.hardwareId || targetUser?.devices?.[0]?.hardwareId || 'AT-DOOR-88239A01';
            const actualAttachments = images || attachmentUrls || [];

            const result = await supportService.startConversation({
              customerId: targetCustomerId,
              customerName: actualName,
              hardwareId: actualHwId,
              message: actualMsg,
              attachmentUrls: actualAttachments,
              selectedDevice,
            });

            const formattedMessages = result.messages.map(m => formatLiveMessage(m));
            const enrichedTicket = enrichTicket(result.ticket, formattedMessages);

            ws.send(JSON.stringify({
              type: 'CONVERSATION_STARTED',
              success: true,
              ticket: enrichedTicket,
              messages: formattedMessages,
            }));

            broadcastToStaff({
              type: 'NEW_TICKET',
              ticket: enrichedTicket,
              messages: formattedMessages,
            });
            break;
          }

          case 'SEND_MESSAGE': {
            const { ticketId, customerId, sender, senderRole, text, message, images, attachmentUrls, selectedDevice, clientTempId } = payload;
            const actualText = (text || message || '').toString().trim();
            const actualAttachments = images || attachmentUrls || [];
            if (!actualText && actualAttachments.length === 0) return;

            let ticket: any;
            if (ticketId) {
              ticket = supportService.getTicketById(ticketId);
            }
            const targetCustomerId = customerId || ws.userData?.customerId;
            if (!ticket && targetCustomerId) {
              ticket = supportService.findActiveCustomerTicket(targetCustomerId);
            }
            if (!ticket) {
              ticket = supportService.getOrCreateCustomerTicket(targetCustomerId || '00000000-0000-0000-0000-000000000001');
            }

            const isCSKH = sender === 'CSKH' || senderRole === 'CSKH' || ws.userData?.role === 'CSKH' || ws.userData?.role === 'ADMIN';
            const role = isCSKH ? 'CSKH' : 'CUSTOMER';
            const senderId = isCSKH ? (ws.userData?.customerId || 'cskh-001') : ticket.customerId;

            const newMsg = await supportService.sendMessage({
              ticketId: ticket.id,
              senderId,
              senderRole: role,
              message: actualText || (actualAttachments.length > 0 ? '[Hình ảnh đính kèm]' : ''),
              attachmentUrls: actualAttachments,
              selectedDevice,
            });

            const formatted: any = formatLiveMessage(newMsg);
            if (clientTempId) {
              formatted.clientTempId = clientTempId;
            }
            const enriched = enrichTicket(ticket, supportService.getMessagesByTicket(ticket.id).map(m => formatLiveMessage(m)));

            // Gửi ACK về chính sender socket kèm clientTempId để cập nhật trạng thái đã gửi thành công
            ws.send(JSON.stringify({
              type: 'MESSAGE_ACK',
              ticketId: ticket.id,
              clientTempId,
              message: formatted,
            }));

            // Broadcast tới Customer (nếu sender không phải là chính customer socket này)
            for (const c of wsClients) {
              if (c !== ws && c.readyState === WebSocket.OPEN && c.userData?.role === 'CUSTOMER' && c.userData?.customerId === ticket.customerId) {
                c.send(JSON.stringify({
                  type: 'NEW_MESSAGE',
                  ticketId: ticket.id,
                  message: formatted,
                }));
              }
            }

            // Broadcast tới Staff (ngoại trừ socket nhân viên vừa gửi để chống duplicate)
            for (const c of wsClients) {
              if (c !== ws && c.readyState === WebSocket.OPEN && (c.userData?.role === 'ADMIN' || c.userData?.role === 'CSKH' || !c.userData?.role)) {
                c.send(JSON.stringify({
                  type: 'NEW_MESSAGE',
                  ticketId: ticket.id,
                  customerId: ticket.customerId,
                  message: formatted,
                  ticket: enriched,
                }));
              }
            }
            break;
          }

          // ==========================================
          // MULTI-USER & GROUP CHAT REALTIME HANDLERS
          // ==========================================
          case 'JOIN_CONVERSATION': {
            const { conversationId, userId } = payload;
            if (!ws.userData) {
              ws.userData = { role: 'CUSTOMER', userId, customerId: userId };
            }
            if (userId) {
              ws.userData.userId = userId;
              ws.userData.customerId = userId;
            }
            ws.userData.currentConversationId = conversationId;

            ws.send(JSON.stringify({
              type: 'CONVERSATION_JOINED',
              success: true,
              conversationId,
            }));
            break;
          }

          case 'LEAVE_CONVERSATION': {
            if (ws.userData) {
              delete ws.userData.currentConversationId;
            }
            ws.send(JSON.stringify({
              type: 'CONVERSATION_LEFT',
              success: true,
            }));
            break;
          }

          case 'SEND_CONVERSATION_MESSAGE': {
            const {
              conversationId,
              text,
              content,
              messageType,
              attachments,
              clientTempId,
              metadata,
              senderId,
              senderName,
              senderRole,
              senderAvatar,
            } = payload;

            const actualSenderId = senderId || ws.userData?.userId || ws.userData?.customerId || 'unknown';
            const actualSenderRole = senderRole || ws.userData?.role || 'CUSTOMER';
            const actualSenderName = senderName || ws.userData?.customerName || 'Người dùng Austec';
            const actualContent = (content || text || '').toString().trim();
            const actualAttachments = attachments || [];

            if (!conversationId) {
              ws.send(JSON.stringify({ type: 'ERROR', error: 'Thiếu conversationId' }));
              break;
            }

            const savedMsg = await chatRepository.saveMessage({
              conversationId,
              senderId: actualSenderId,
              senderRole: actualSenderRole,
              senderName: actualSenderName,
              senderAvatar,
              messageType: messageType || (actualAttachments.length > 0
                ? (actualAttachments[0].mediaType === 'video' ? 'VIDEO' : actualAttachments[0].mediaType === 'file' ? 'FILE' : 'IMAGE')
                : 'TEXT'),
              content: actualContent,
              attachments: actualAttachments,
              clientTempId,
              metadata,
            });

            // 1. Phản hồi ACK ngay cho chính socket người gửi kèm clientTempId (chống duplicate)
            ws.send(JSON.stringify({
              type: 'MESSAGE_ACK',
              clientTempId,
              conversationId,
              message: savedMsg,
            }));

            // 2. Broadcast tin nhắn tới tất cả người tham gia khác (không gửi lại sender socket)
            const participantIds = await chatRepository.getParticipantUserIds(conversationId);
            const broadcastPayload = JSON.stringify({
              type: 'NEW_CONVERSATION_MESSAGE',
              conversationId,
              message: savedMsg,
            });

            for (const client of wsClients) {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                const inRoom = client.userData?.currentConversationId === conversationId;
                const isPart = client.userData?.userId && participantIds.includes(client.userData.userId);
                const isStaffForCskh = (client.userData?.role === 'ADMIN' || client.userData?.role === 'CSKH') && conversationId.startsWith('cskh-');

                if (inRoom || isPart || isStaffForCskh) {
                  client.send(broadcastPayload);
                }
              }
            }
            break;
          }

          case 'TYPING': {
            const { ticketId, customerId, isTyping } = payload;
            if (ws.userData?.role === 'CUSTOMER') {
              broadcastToStaff({ type: 'TYPING', ticketId, customerId: ws.userData?.customerId, isTyping });
            } else if (customerId) {
              broadcastToCustomer(customerId, { type: 'TYPING', ticketId, isTyping });
            }
            break;
          }
        }
      } catch (err) {
        console.error('[WebSocket] Message handling error:', err);
      }
    });

    ws.on('close', () => { wsClients.delete(ws); });
  });

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
