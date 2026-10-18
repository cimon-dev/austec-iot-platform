import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import {
  LegacyDataMigrator,
  DynamicSchemaEngine,
  HotCacheClient,
} from '@austec/database';
import { AuthService, AuthenticatedRequest } from './services/auth.service.js';
import { BlackboxService } from './services/blackbox.service.js';
import { ProvisioningService } from './services/provisioning.service.js';
import { CommandService } from './services/command.service.js';
import { SupportService } from './services/support.service.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  // 1. Khởi tạo Core Services & Nạp Dữ liệu từ Di trú
  const migrator = new LegacyDataMigrator();
  const migrated = migrator.migrateAll();

  const schemaEngine = new DynamicSchemaEngine();
  migrated.migratedProperties.forEach(p => schemaEngine.registerProperty(p));
  migrated.migratedModels.forEach(m => schemaEngine.registerModel(m));

  const hotCache = new HotCacheClient();
  const blackboxService = new BlackboxService();
  const provisioningService = new ProvisioningService(migrated.migratedInventory, migrated.migratedInstances);
  const commandService = new CommandService(blackboxService, hotCache);
  const supportService = new SupportService(hotCache);

  // Nạp trạng thái ban đầu của các thiết bị vào Hot Cache
  migrated.migratedInstances.forEach(inst => {
    hotCache.setDeviceState(inst.hardwareId, {
      isOnline: inst.isOnline,
      currentProperties: inst.currentProperties,
      customName: inst.customName,
      ownerId: inst.ownerId,
      rssiSignal: inst.rssiSignal,
    });
  });

  // ==========================================
  // ROUTE: XÁC THỰC (AUTHENTICATION)
  // ==========================================
  app.post('/api/auth/login', (req, res) => {
    const { email, role } = req.body;
    const targetRole = role || 'CUSTOMER';

    let user: any;
    if (targetRole === 'ADMIN') {
      user = { id: 'admin-001', email: email || 'austec.admin@gmail.com', role: 'ADMIN', fullName: 'Hệ Thống Quản Trị Austec' };
    } else if (targetRole === 'CSKH') {
      user = { id: 'cskh-001', email: email || 'cskh@austec.vn', role: 'CSKH', fullName: 'Nhân Viên Hỗ Trợ Kỹ Thuật' };
    } else {
      const cust = migrated.migratedCustomers.find(c => c.email === email) || migrated.migratedCustomers[0];
      user = { id: cust.id, email: cust.email, role: 'CUSTOMER', fullName: cust.fullName };
    }

    const token = AuthService.signToken(user);
    res.json({ success: true, token, user });
  });

  app.get('/api/auth/me', AuthService.authenticate, (req: AuthenticatedRequest, res) => {
    res.json({ success: true, user: req.user });
  });

  // ==========================================
  // ROUTE: THIẾT BỊ NGƯỜI DÙNG (MOBILE APP)
  // ==========================================
  // Ghép nối thiết bị mới qua Hardware ID và QR Hash
  app.post('/api/devices/pair', AuthService.authenticate, (req: AuthenticatedRequest, res) => {
    const { hardwareId, qrCodeHash, customName, locationLat, locationLng, addressDisplay } = req.body;

    const result = provisioningService.pairDevice({
      hardwareId,
      qrCodeHash,
      userId: req.user!.id,
      customName: customName || 'Thiết bị mới',
      locationLat,
      locationLng,
      addressDisplay,
    });

    if (result.success && result.device) {
      hotCache.setDeviceState(result.device.hardwareId, {
        isOnline: true,
        currentProperties: result.device.currentProperties,
        customName: result.device.customName,
        ownerId: result.device.ownerId,
      });
    }

    res.status(result.success ? 200 : 400).json(result);
  });

  // Lấy danh sách thiết bị thuộc sở hữu của người dùng hiện tại
  app.get('/api/devices/my', AuthService.authenticate, async (req: AuthenticatedRequest, res) => {
    const devices = provisioningService.getDevicesByOwner(req.user!.id);
    const enrichedDevices = await Promise.all(
      devices.map(async d => {
        const cache = await hotCache.getDeviceState(d.hardwareId);
        return {
          ...d,
          isOnline: cache?.isOnline ?? d.isOnline,
          currentProperties: cache?.currentProperties ?? d.currentProperties,
          rssiSignal: cache?.rssiSignal ?? d.rssiSignal,
        };
      })
    );
    res.json({ success: true, devices: enrichedDevices });
  });

  // Điều khiển thiết bị thời gian thực (< 250ms khứ hồi)
  app.post('/api/devices/control', AuthService.authenticate, async (req: AuthenticatedRequest, res) => {
    const { hardwareId, command, params } = req.body;

    // Kiểm tra quyền sở hữu thiết bị nếu là Customer
    if (req.user!.role === 'CUSTOMER') {
      const inst = provisioningService.getInstance(hardwareId);
      if (!inst || inst.ownerId !== req.user!.id) {
        res.status(403).json({ success: false, error: 'Bạn không có quyền điều khiển thiết bị của người khác!' });
        return;
      }
    }

    const result = await commandService.dispatchCommand({
      hardwareId,
      command,
      params,
      actorId: req.user!.id,
      actorRole: req.user!.role,
      actorIp: req.ip,
    });

    res.json(result);
  });

  // Sinh OTP chuyển nhượng thiết bị
  app.post('/api/devices/transfer/generate-otp', AuthService.authenticate, (req: AuthenticatedRequest, res) => {
    try {
      const { hardwareId } = req.body;
      const otp = provisioningService.generateTransferOTP(hardwareId, req.user!.id);
      res.json({ success: true, otp, expiresInMinutes: 15 });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Nhận chuyển nhượng thiết bị bằng OTP
  app.post('/api/devices/transfer/claim', AuthService.authenticate, (req: AuthenticatedRequest, res) => {
    const { otp } = req.body;
    const result = provisioningService.claimTransferOTP(otp, req.user!.id);
    res.status(result.success ? 200 : 400).json(result);
  });

  // ==========================================
  // ROUTE: VIỄN THÁM & REDIS HOT CACHE
  // ==========================================
  app.get('/api/telemetry/stats/realtime', async (req, res) => {
    const stats = await hotCache.getRealtimeStats();
    res.json({ success: true, stats });
  });

  app.get('/api/telemetry/:hardwareId', async (req, res) => {
    const state = await hotCache.getDeviceState(req.params.hardwareId);
    if (!state) {
      res.status(404).json({ success: false, error: 'Không tìm thấy dữ liệu viễn thám' });
      return;
    }
    res.json({ success: true, state });
  });

  app.post('/api/telemetry/report', async (req, res) => {
    const { hardwareId, modelCode, properties, rssiSignal } = req.body;
    const validation = schemaEngine.validateTelemetry(modelCode, properties);

    if (!validation.isValid) {
      res.status(400).json({ success: false, errors: validation.errors });
      return;
    }

    const updated = await hotCache.setDeviceState(hardwareId, {
      currentProperties: validation.sanitizedData,
      rssiSignal,
      isOnline: true,
      lastHeartbeat: new Date().toISOString(),
    });

    res.json({ success: true, alerts: validation.alerts, state: updated });
  });

  // ==========================================
  // ROUTE: WEB CMS QUẢN TRỊ (ADMIN & CSKH)
  // ==========================================
  // 1. Group List
  app.get('/api/admin/groups', AuthService.authenticate, (req, res) => {
    res.json({ success: true, groups: migrated.migratedGroups });
  });

  // 2. Device Types
  app.get('/api/admin/device-types', AuthService.authenticate, (req, res) => {
    res.json({ success: true, deviceTypes: migrated.migratedTypes });
  });

  // 3. Properties (Dynamic Schema)
  app.get('/api/admin/properties', AuthService.authenticate, (req, res) => {
    res.json({ success: true, properties: schemaEngine.getAllProperties() });
  });

  app.post('/api/admin/properties', AuthService.authenticate, AuthService.requireRole(['ADMIN']), (req, res) => {
    const prop = req.body;
    schemaEngine.registerProperty(prop);
    res.json({ success: true, message: 'Thêm thuộc tính động thành công!', property: prop });
  });

  // 4. Models
  app.get('/api/admin/models', AuthService.authenticate, (req, res) => {
    res.json({ success: true, models: migrated.migratedModels });
  });

  // 5. Smart Import với Dry-run Validation
  app.post('/api/admin/inventory/import-excel', AuthService.authenticate, AuthService.requireRole(['ADMIN']), (req, res) => {
    const { records, dryRun } = req.body; // records: Array<{ hardwareId, macAddress, modelId, batchNumber }>

    if (!records || !Array.isArray(records)) {
      res.status(400).json({ success: false, error: 'Dữ liệu file Excel không hợp lệ' });
      return;
    }

    const validationErrors: Array<{ row: number; hardwareId: string; reason: string }> = [];
    const validItems: any[] = [];
    const seenHwIds = new Set<string>();

    records.forEach((r, idx) => {
      const rowNum = idx + 2; // Dòng 1 là Header
      if (!r.hardwareId || r.hardwareId.trim() === '') {
        validationErrors.push({ row: rowNum, hardwareId: r.hardwareId, reason: 'Hardware ID không được để trống' });
        return;
      }
      if (seenHwIds.has(r.hardwareId)) {
        validationErrors.push({ row: rowNum, hardwareId: r.hardwareId, reason: 'Trùng lặp Hardware ID trong chính file Excel' });
        return;
      }
      seenHwIds.add(r.hardwareId);

      const existing = provisioningService.getInstance(r.hardwareId);
      if (existing) {
        validationErrors.push({ row: rowNum, hardwareId: r.hardwareId, reason: 'Hardware ID này đã tồn tại trong CSDL kho' });
        return;
      }

      validItems.push({
        id: `gen-${r.hardwareId}-${Date.now()}`,
        hardwareId: r.hardwareId,
        macAddress: r.macAddress || 'FC:F5:C4:00:00:00',
        modelId: r.modelId || 1,
        batchNumber: r.batchNumber || 'LOT-2026-X1',
        supplier: 'Austec Smart Factory',
        status: 'IN_WAREHOUSE',
        producedAt: new Date().toISOString().split('T')[0],
        warrantyMonths: 24,
        qrCodeHash: `HASH_${r.hardwareId}_SECRET_2026`,
        createdAt: new Date().toISOString(),
      });
    });

    if (validationErrors.length > 0) {
      res.status(422).json({
        success: false,
        message: `Phát hiện ${validationErrors.length} lỗi trong file Excel. Vui lòng kiểm tra và sửa trước khi nhập kho.`,
        errors: validationErrors,
      });
      return;
    }

    if (!dryRun) {
      validItems.forEach(item => provisioningService.registerToInventory(item));
    }

    res.json({
      success: true,
      isDryRun: !!dryRun,
      message: dryRun
        ? `Kiểm tra hoàn tất: Toàn bộ ${validItems.length} bản ghi đều hợp lệ 100%! Bạn có thể bấm Nhập kho.`
        : `Đã nhập kho thành công ${validItems.length} thiết bị xuất xưởng và tự sinh mã QR Code.`,
      importedCount: validItems.length,
    });
  });

  // 6. Device List (Virtual Scroll Table & Slide Drawer)
  app.get('/api/admin/devices', AuthService.authenticate, AuthService.requireRole(['ADMIN', 'CSKH']), async (req, res) => {
    const allInstances = provisioningService.getAllInstances();
    const enriched = await Promise.all(
      allInstances.map(async inst => {
        const cache = await hotCache.getDeviceState(inst.hardwareId);
        const customer = migrated.migratedCustomers.find(c => c.id === inst.ownerId);
        return {
          ...inst,
          isOnline: cache?.isOnline ?? inst.isOnline,
          currentProperties: cache?.currentProperties ?? inst.currentProperties,
          customerName: customer?.fullName || 'Khách vãng lai',
          customerPhone: customer?.phone || '---',
          customerEmail: customer?.email || '---',
        };
      })
    );
    res.json({ success: true, devices: enriched, total: enriched.length });
  });

  // ==========================================
  // ROUTE: CSKH HUB & LIVE CHAT
  // ==========================================
  app.get('/api/cskh/tickets', AuthService.authenticate, AuthService.requireRole(['ADMIN', 'CSKH']), (req, res) => {
    res.json({ success: true, tickets: supportService.getAllOpenTickets() });
  });

  app.post('/api/cskh/tickets', AuthService.authenticate, (req: AuthenticatedRequest, res) => {
    const { hardwareId, subject, priority } = req.body;
    const ticket = supportService.createTicket({
      customerId: req.user!.id,
      hardwareId,
      subject,
      priority,
    });
    res.json({ success: true, ticket });
  });

  app.get('/api/cskh/tickets/:id/messages', AuthService.authenticate, (req, res) => {
    const messages = supportService.getMessagesByTicket(String(req.params.id));
    res.json({ success: true, messages });
  });

  app.post('/api/cskh/tickets/:id/messages', AuthService.authenticate, async (req: AuthenticatedRequest, res) => {
    const { message, attachmentUrls } = req.body;
    const msg = await supportService.sendMessage({
      ticketId: String(req.params.id),
      senderId: req.user!.id,
      senderRole: req.user!.role === 'CUSTOMER' ? 'CUSTOMER' : 'CSKH',
      message,
      attachmentUrls,
    });
    res.json({ success: true, message: msg });
  });

  // ==========================================
  // ROUTE: HỘP ĐEN KIỂM TOÁN (BLACKBOX AUDIT)
  // ==========================================
  app.get('/api/blackbox/logs', AuthService.authenticate, AuthService.requireRole(['ADMIN']), (req, res) => {
    const { hardwareId, actionType, ackStatus, limit } = req.query;
    const logs = blackboxService.queryLogs({
      hardwareId: hardwareId as string,
      actionType: actionType as string,
      ackStatus: ackStatus as any,
      limit: limit ? parseInt(limit as string, 10) : 100,
    });
    res.json({ success: true, total: logs.length, logs });
  });

  return {
    app,
    services: {
      authService: AuthService,
      schemaEngine,
      hotCache,
      blackboxService,
      provisioningService,
      commandService,
      supportService,
    },
  };
}

if (process.env.NODE_ENV !== 'test') {
  const { app } = createApp();
  const PORT = process.env.PORT || 5050;
  app.listen(PORT, () => {
    console.log(`[AUSTEC IOT BACKEND] Server đang chạy mượt mà tại http://localhost:${PORT}`);
  });
}
