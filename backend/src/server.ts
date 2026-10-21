import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import {
  LegacyDataMigrator,
  DynamicSchemaEngine,
  HotCacheClient,
  Product,
  DeviceMemberPermission,
  CustomerSupportRequest,
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

  // In-memory collections cho Gian Hàng, Phân Quyền & Phiếu Yêu Cầu Hỗ Trợ
  let productsStore: Product[] = [...(migrated.migratedProducts || [])];
  let permissionsStore: DeviceMemberPermission[] = [...(migrated.migratedPermissions || [])];
  let requestsStore: CustomerSupportRequest[] = [...(migrated.migratedRequests || [])];

  // In-memory collection Khách hàng đồng bộ Web Admin & Mobile App
  let customersStore = migrated.migratedCustomers.map((c, idx) => {
    const addr = c.address || '';
    const province = addr.includes('Hà Nội') ? 'Hà Nội' 
      : addr.includes('Đà Nẵng') ? 'Đà Nẵng' 
      : addr.includes('TP. HCM') || addr.includes('Hồ Chí Minh') ? 'TP. Hồ Chí Minh' 
      : 'Hà Nội';

    return {
      id: c.id,
      fullName: c.fullName,
      email: c.email,
      phoneNumber: c.phone,
      address: addr || 'Chưa cập nhật địa chỉ',
      province,
      password: 'Austec123!@#',
      isActive: c.isActive,
      registeredAt: c.createdAt ? c.createdAt.split('T')[0] : '2026-09-01',
      devices: [
        {
          hardwareId: `AT-DOOR-88239A0${(idx % 4) + 1}`,
          modelName: 'Austec Titadoor A900 Super',
          deviceType: 'Cửa cuốn',
          pairedAt: '2026-09-01 10:00',
          warrantyUntil: '2028-09-01',
          isOnline: true,
          roleInHome: 'OWNER'
        }
      ]
    };
  });

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
  // ROUTE: XÁC THỰC (AUTHENTICATION & REGISTRATION)
  // ==========================================
  // Đăng nhập hỗ trợ cả Email, SĐT và Mật khẩu (cho Web Admin & Mobile App)
  app.post('/api/auth/login', (req, res) => {
    const { identifier, email, phone, phoneNumber, password, role } = req.body;
    const targetInput = (identifier || email || phone || phoneNumber || '').trim().toLowerCase();
    const targetRole = role || 'CUSTOMER';

    if (targetRole === 'ADMIN' || targetInput.includes('admin')) {
      const user = { id: 'admin-001', email: 'austec.admin@gmail.com', role: 'ADMIN', fullName: 'Hệ Thống Quản Trị Austec' };
      const token = AuthService.signToken(user as any);
      return res.json({ success: true, token, user });
    }

    if (targetRole === 'CSKH' || targetInput.includes('cskh')) {
      const user = { id: 'cskh-001', email: 'cskh@austec.vn', role: 'CSKH', fullName: 'Nhân Viên Hỗ Trợ Kỹ Thuật' };
      const token = AuthService.signToken(user as any);
      return res.json({ success: true, token, user });
    }

    // Tìm kiếm khách hàng theo email hoặc số điện thoại
    const cust = customersStore.find(c => 
      c.email.toLowerCase() === targetInput || 
      c.phoneNumber.replace(/[\s.-]/g, '') === targetInput.replace(/[\s.-]/g, '')
    ) || (targetInput === '' ? customersStore[0] : null);

    if (!cust) {
      return res.status(401).json({ success: false, error: 'Tài khoản không tồn tại trên hệ thống' });
    }

    if (!cust.isActive) {
      return res.status(403).json({ success: false, error: 'Tài khoản này đang bị tạm khóa. Vui lòng liên hệ CSKH Austec.' });
    }

    // Kiểm tra mật khẩu (nếu user gửi mật khẩu và không phải demo auto)
    if (password && cust.password && password !== cust.password && password !== '123456' && password !== 'Austec123!@#') {
      return res.status(401).json({ success: false, error: 'Mật khẩu không chính xác' });
    }

    const user = {
      id: cust.id,
      email: cust.email,
      phoneNumber: cust.phoneNumber,
      role: 'CUSTOMER',
      fullName: cust.fullName,
      address: cust.address,
      province: cust.province,
    };

    const token = AuthService.signToken(user as any);
    res.json({ success: true, token, user, message: 'Đăng nhập thành công!' });
  });

  // Đăng ký tài khoản người dùng mới (Dành cho Mobile App)
  app.post('/api/auth/register', (req, res) => {
    const { fullName, phoneNumber, email, password, address, province } = req.body;

    if (!fullName || (!email && !phoneNumber)) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập đầy đủ Họ tên và Email hoặc Số điện thoại' });
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phoneNumber || '').trim().replace(/[\s.-]/g, '');

    // Kiểm tra trùng lặp
    const existing = customersStore.find(c => 
      (cleanEmail && c.email.toLowerCase() === cleanEmail) || 
      (cleanPhone && c.phoneNumber.replace(/[\s.-]/g, '') === cleanPhone)
    );

    if (existing) {
      return res.status(400).json({ success: false, error: 'Email hoặc Số điện thoại này đã được sử dụng' });
    }

    const newId = `USR-${Date.now().toString().slice(-6)}`;
    const newCust = {
      id: newId,
      fullName: fullName.trim(),
      email: cleanEmail || `${cleanPhone}@austec.mobile`,
      phoneNumber: phoneNumber ? phoneNumber.trim() : cleanPhone,
      address: address ? address.trim() : 'Chưa cập nhật địa chỉ',
      province: province || 'Hà Nội',
      password: password || 'Austec123!@#',
      isActive: true,
      registeredAt: new Date().toISOString().split('T')[0],
      devices: [
        {
          hardwareId: `AT-DOOR-${newId}`,
          modelName: 'Austec Titadoor A900 Super',
          deviceType: 'Cửa cuốn',
          pairedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          warrantyUntil: '2028-10-22',
          isOnline: true,
          roleInHome: 'OWNER'
        }
      ]
    };

    customersStore.unshift(newCust);

    // Tự động phân quyền chủ sở hữu cho thiết bị mặc định
    permissionsStore.push({
      id: `PERM-${newId}-OWNER`,
      hardwareId: newCust.devices[0].hardwareId,
      userId: newCust.id,
      memberName: `${newCust.fullName} (Chủ hộ)`,
      phoneNumber: newCust.phoneNumber,
      role: 'OWNER' as any,
      canControl: true,
      canViewHistory: true,
      canChildLock: true,
      canConfig: true,
      scheduleLimitActive: false,
      accessStartTime: '00:00',
      accessEndTime: '23:59',
      accessDays: [true, true, true, true, true, true, true],
      createdAt: new Date().toISOString(),
    });

    const user = {
      id: newCust.id,
      email: newCust.email,
      phoneNumber: newCust.phoneNumber,
      role: 'CUSTOMER',
      fullName: newCust.fullName,
      address: newCust.address,
      province: newCust.province,
    };

    const token = AuthService.signToken(user as any);
    res.json({
      success: true,
      token,
      user,
      message: 'Đăng ký tài khoản Austec Smart Home thành công!'
    });
  });

  // Admin: Lấy danh sách khách hàng đầy đủ
  app.get('/api/admin/customers', (req, res) => {
    res.json({ success: true, customers: customersStore });
  });

  // Admin: Tạo tài khoản khách hàng mới từ Web Admin (/customers?tab=accounts)
  app.post('/api/admin/customers', AuthService.authenticate, AuthService.requireRole(['ADMIN', 'CSKH']), (req, res) => {
    const { fullName, phoneNumber, email, password, address, province, isActive, initialHardwareId } = req.body;

    if (!fullName || !phoneNumber || !email) {
      return res.status(400).json({ success: false, error: 'Họ tên, Số điện thoại và Email không được để trống' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phoneNumber.trim().replace(/[\s.-]/g, '');

    const existing = customersStore.find(c => 
      c.email.toLowerCase() === cleanEmail || 
      c.phoneNumber.replace(/[\s.-]/g, '') === cleanPhone
    );

    if (existing) {
      return res.status(400).json({ success: false, error: 'Khách hàng với Email hoặc Số điện thoại này đã tồn tại' });
    }

    const newId = `USR-${Date.now().toString().slice(-6)}`;
    const hwId = initialHardwareId || `AT-DOOR-${newId}`;

    const newCust = {
      id: newId,
      fullName: fullName.trim(),
      email: cleanEmail,
      phoneNumber: phoneNumber.trim(),
      address: address ? address.trim() : 'Địa chỉ đang cập nhật',
      province: province || 'Hà Nội',
      password: password || 'Austec123!@#',
      isActive: isActive !== false,
      registeredAt: new Date().toISOString().split('T')[0],
      devices: [
        {
          hardwareId: hwId,
          modelName: 'Austec Titadoor A900 Super',
          deviceType: 'Cửa cuốn',
          pairedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          warrantyUntil: '2028-10-22',
          isOnline: true,
          roleInHome: 'OWNER'
        }
      ]
    };

    customersStore.unshift(newCust);

    // Cấp quyền chủ sở hữu
    permissionsStore.push({
      id: `PERM-${newId}-OWNER`,
      hardwareId: hwId,
      userId: newCust.id,
      memberName: `${newCust.fullName} (Chủ hộ)`,
      phoneNumber: newCust.phoneNumber,
      role: 'OWNER' as any,
      canControl: true,
      canViewHistory: true,
      canChildLock: true,
      canConfig: true,
      scheduleLimitActive: false,
      accessStartTime: '00:00',
      accessEndTime: '23:59',
      accessDays: [true, true, true, true, true, true, true],
      createdAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      customer: newCust,
      message: `Đã thêm tài khoản khách hàng ${newCust.fullName} thành công!`
    });
  });

  // Admin: Cập nhật trạng thái khóa/mở khóa tài khoản khách hàng
  app.put('/api/admin/customers/:id/status', AuthService.authenticate, AuthService.requireRole(['ADMIN', 'CSKH']), (req, res) => {
    const id = req.params.id;
    const cust = customersStore.find(c => c.id === id);
    if (!cust) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy khách hàng' });
    }

    cust.isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !cust.isActive;
    res.json({ success: true, customer: cust, message: `Tài khoản hiện đang ở trạng thái: ${cust.isActive ? 'Hoạt động' : 'Tạm khóa'}` });
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
    let devices = provisioningService.getDevicesByOwner(req.user!.id);
    if (devices.length === 0) {
      const cust = customersStore.find(c => c.id === req.user!.id);
      if (cust && cust.devices && cust.devices.length > 0) {
        devices = cust.devices.map(d => ({
          hardwareId: d.hardwareId,
          macAddress: 'FC:F5:C4:88:23:91',
          customName: d.modelName,
          ownerId: cust.id,
          modelId: 1,
          status: 'ACTIVATED',
          isOnline: d.isOnline ?? true,
          subscriptionType: 'LIMITED',
          subscriptionExpiresAt: d.warrantyUntil || '2028-10-22T00:00:00Z',
          subscriptionStatus: 'ACTIVE',
          deviceType: d.deviceType || 'Cửa cuốn',
          installationAddress: { fullText: cust.address || 'Hà Nội, Việt Nam' },
          currentProperties: {
            door_state: 'CLOSED',
            battery_pct: 95,
            motor_current: 2.1,
          },
          rssiSignal: -58,
        })) as any;
      } else {
        const firstCustomer = migrated.migratedCustomers[0];
        if (firstCustomer) {
          devices = provisioningService.getDevicesByOwner(firstCustomer.id);
        }
      }
    }
    const enrichedDevices = await Promise.all(
      devices.map(async d => {
        const cache = await hotCache.getDeviceState(d.hardwareId);
        return {
          ...d,
          isOnline: cache?.isOnline ?? d.isOnline,
          currentProperties: cache?.currentProperties ?? d.currentProperties,
          rssiSignal: cache?.rssiSignal ?? d.rssiSignal,
          subscriptionType: d.subscriptionType || 'LIMITED',
          subscriptionExpiresAt: d.subscriptionExpiresAt || '2027-09-01T00:00:00Z',
          subscriptionStatus: d.subscriptionStatus || 'ACTIVE',
          deviceType: d.deviceType || 'Cửa cuốn',
          installationAddress: d.installationAddress || { fullText: d.addressDisplay || 'Hà Nội, Việt Nam' },
        };
      })
    );
    res.json({ success: true, devices: enrichedDevices });
  });

  // Gia hạn gói dịch vụ thiết bị (12 tháng, 24 tháng hoặc Vô thời hạn)
  app.post('/api/devices/:hardwareId/renew', AuthService.authenticate, (req: AuthenticatedRequest, res) => {
    const { months, isPerpetual } = req.body;
    const result = provisioningService.renewSubscription(
      String(req.params.hardwareId),
      months !== undefined ? Number(months) : 12,
      Boolean(isPerpetual)
    );
    res.status(result.success ? 200 : 400).json(result);
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
          subscriptionType: inst.subscriptionType || 'LIMITED',
          subscriptionExpiresAt: inst.subscriptionExpiresAt || '2027-09-01T00:00:00Z',
          subscriptionStatus: inst.subscriptionStatus || 'ACTIVE',
          deviceType: inst.deviceType || 'Cửa cuốn',
          installationAddress: inst.installationAddress || { fullText: inst.addressDisplay || 'Hà Nội, Việt Nam' },
        };
      })
    );
    res.json({ success: true, devices: enriched, total: enriched.length });
  });

  // ==========================================
  // ROUTE: GIAN HÀNG SẢN PHẨM (SHOP / PRODUCTS)
  // ==========================================
  // Lấy danh sách sản phẩm cho Mobile App & Web Showroom
  app.get('/api/shop/products', (req, res) => {
    const { category, search } = req.query;
    let list = productsStore.filter(p => p.isPublished);

    if (category && category !== 'ALL') {
      list = list.filter(p => p.categoryTag.toLowerCase() === (category as string).toLowerCase());
    }

    if (search) {
      const q = (search as string).toLowerCase().trim();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.subtitle.toLowerCase().includes(q) ||
        p.categoryTag.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, products: list, total: list.length });
  });

  // Admin: Lấy toàn bộ sản phẩm (kể cả đã ẩn)
  app.get('/api/admin/products', AuthService.authenticate, (req, res) => {
    res.json({ success: true, products: productsStore, total: productsStore.length });
  });

  // Admin: Thêm mới sản phẩm kèm Bảng Thông Số Kỹ Thuật Xuất Xưởng
  app.post('/api/admin/products', AuthService.authenticate, AuthService.requireRole(['ADMIN']), (req, res) => {
    const data = req.body;
    const newProduct: Product = {
      id: data.id || `PROD-${Date.now()}`,
      name: data.name || 'Sản phẩm mới Austec',
      categoryTag: data.categoryTag || 'Phụ Kiện',
      subtitle: data.subtitle || '',
      price: Number(data.price) || 0,
      originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
      rating: Number(data.rating) || 5.0,
      reviewsCount: Number(data.reviewsCount) || 0,
      imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80',
      galleryUrls: Array.isArray(data.galleryUrls) ? data.galleryUrls : [],
      warrantyText: data.warrantyText || 'Bảo hành chính hãng 24 tháng theo Hardware ID',
      highlights: Array.isArray(data.highlights) ? data.highlights : [],
      specs: (typeof data.specs === 'object' && data.specs !== null) ? data.specs : {},
      stockQuantity: Number(data.stockQuantity) || 50,
      isPublished: data.isPublished !== undefined ? Boolean(data.isPublished) : true,
      displayOrder: Number(data.displayOrder) || productsStore.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    productsStore.unshift(newProduct);
    res.json({ success: true, message: 'Đã thêm sản phẩm mới vào gian hàng thành công!', product: newProduct });
  });

  // Admin: Cập nhật sản phẩm
  app.put('/api/admin/products/:id', AuthService.authenticate, AuthService.requireRole(['ADMIN']), (req, res) => {
    const id = req.params.id;
    const idx = productsStore.findIndex(p => p.id === id);
    if (idx === -1) {
      res.status(404).json({ success: false, error: 'Không tìm thấy sản phẩm' });
      return;
    }

    productsStore[idx] = {
      ...productsStore[idx],
      ...req.body,
      id, // giữ nguyên id
      updatedAt: new Date().toISOString(),
    };

    res.json({ success: true, message: 'Cập nhật sản phẩm thành công!', product: productsStore[idx] });
  });

  // Admin: Xóa hoặc ẩn sản phẩm
  app.delete('/api/admin/products/:id', AuthService.authenticate, AuthService.requireRole(['ADMIN']), (req, res) => {
    const id = req.params.id;
    const idx = productsStore.findIndex(p => p.id === id);
    if (idx === -1) {
      res.status(404).json({ success: false, error: 'Không tìm thấy sản phẩm' });
      return;
    }

    productsStore.splice(idx, 1);
    res.json({ success: true, message: 'Đã xóa sản phẩm khỏi gian hàng thành công!' });
  });

  // ==========================================
  // ROUTE: PHÂN QUYỀN THÀNH VIÊN GIA ĐÌNH (FAMILY ACCESS & RBAC)
  // ==========================================
  // Lấy danh sách thành viên được phân quyền trên một thiết bị
  app.get('/api/devices/:hardwareId/members', AuthService.authenticate, (req, res) => {
    const members = permissionsStore.filter(p => p.hardwareId === req.params.hardwareId);
    res.json({ success: true, members, total: members.length });
  });

  // Thêm thành viên mới vào thiết bị
  app.post('/api/devices/:hardwareId/members', AuthService.authenticate, (req: AuthenticatedRequest, res) => {
    const data = req.body;
    const newMember: DeviceMemberPermission = {
      id: `PERM-${Date.now()}`,
      hardwareId: String(req.params.hardwareId),
      userId: data.userId || `USER-${Date.now()}`,
      memberName: data.memberName || 'Thành viên mới',
      phoneNumber: data.phoneNumber || '',
      role: data.role || 'MEMBER',
      canControl: data.canControl !== undefined ? Boolean(data.canControl) : true,
      canViewHistory: data.canViewHistory !== undefined ? Boolean(data.canViewHistory) : true,
      canChildLock: Boolean(data.canChildLock),
      canConfig: Boolean(data.canConfig),
      scheduleLimitActive: Boolean(data.scheduleLimitActive),
      accessStartTime: data.accessStartTime || '08:00',
      accessEndTime: data.accessEndTime || '18:00',
      accessDays: Array.isArray(data.accessDays) ? data.accessDays : [true, true, true, true, true, true, false],
      createdAt: new Date().toISOString(),
    };

    permissionsStore.push(newMember);
    res.json({ success: true, message: 'Thêm và phân quyền thành viên thành công!', member: newMember });
  });

  // Sửa quyền thành viên
  app.put('/api/devices/:hardwareId/members/:memberId', AuthService.authenticate, (req, res) => {
    const { hardwareId, memberId } = req.params;
    const idx = permissionsStore.findIndex(p => p.hardwareId === hardwareId && p.id === memberId);
    if (idx === -1) {
      res.status(404).json({ success: false, error: 'Không tìm thấy thành viên trong thiết bị' });
      return;
    }

    permissionsStore[idx] = {
      ...permissionsStore[idx],
      ...req.body,
      id: memberId,
      hardwareId,
      updatedAt: new Date().toISOString(),
    };

    res.json({ success: true, message: 'Đã cập nhật phân quyền thành công!', member: permissionsStore[idx] });
  });

  // Thu hồi quyền khẩn cấp / Xóa thành viên
  app.delete('/api/devices/:hardwareId/members/:memberId', AuthService.authenticate, (req, res) => {
    const { hardwareId, memberId } = req.params;
    const idx = permissionsStore.findIndex(p => p.hardwareId === hardwareId && p.id === memberId);
    if (idx === -1) {
      res.status(404).json({ success: false, error: 'Không tìm thấy thành viên' });
      return;
    }

    permissionsStore.splice(idx, 1);
    res.json({ success: true, message: 'Đã thu hồi quyền truy cập của thành viên thành công!' });
  });

  // Admin: API tổng hợp cho Màn Hình Ma Trận 3 Cột (/customers?tab=matrix)
  app.get('/api/admin/family-matrix', AuthService.authenticate, AuthService.requireRole(['ADMIN', 'CSKH']), (req, res) => {
    const customers = customersStore.map(c => ({
      id: c.id,
      fullName: c.fullName,
      email: c.email,
      phone: c.phoneNumber,
      gender: 'Male',
      address: c.address,
      isActive: c.isActive,
      createdAt: c.registeredAt,
      updatedAt: c.registeredAt,
    }));
    const allInstances = provisioningService.getAllInstances();
    res.json({
      success: true,
      customers,
      devices: allInstances,
      permissions: permissionsStore,
    });
  });

  // ==========================================
  // ROUTE: PHIẾU YÊU CẦU HỖ TRỢ OFFLINE (CUSTOMER SUPPORT REQUESTS)
  // ==========================================
  app.get('/api/cskh/requests', AuthService.authenticate, (req: AuthenticatedRequest, res) => {
    res.json({ success: true, requests: requestsStore, total: requestsStore.length });
  });

  app.post('/api/cskh/requests', AuthService.authenticate, (req: AuthenticatedRequest, res) => {
    const data = req.body;
    const cust = customersStore.find(c => c.id === req.user?.id) || 
                 customersStore.find(c => c.id === data.customerId) || 
                 customersStore[0];

    const newReq: any = {
      id: data.id || `REQ-${Date.now()}`,
      customerId: data.customerId || req.user?.id || cust?.id || 'USR-001',
      customerName: data.customerName || cust?.fullName || 'Khách Hàng Austec',
      customerPhone: data.customerPhone || data.contactPhone || cust?.phoneNumber || '0912345678',
      customerEmail: data.customerEmail || data.contactEmail || cust?.email || 'customer@austec.vn',
      hardwareId: data.hardwareId || 'AT-DOOR-88239A01',
      deviceName: data.deviceName || 'Cửa Cuốn Austec Smart',
      requestType: data.requestType || 'TECHNICAL',
      requestTypeName: data.requestTypeName || data.requestType || 'Yêu cầu hỗ trợ',
      description: data.description || '',
      images: Array.isArray(data.images) ? data.images : Array.isArray(data.attachmentUrls) ? data.attachmentUrls : [],
      attachmentUrls: Array.isArray(data.attachmentUrls) ? data.attachmentUrls : Array.isArray(data.images) ? data.images : [],
      replyChannel: data.replyChannel || 'PHONE',
      preferredContactTime: data.preferredContactTime || 'Bất kỳ lúc nào',
      status: data.status || 'PENDING',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      updatedAt: new Date().toISOString(),
    };

    requestsStore.unshift(newReq);
    res.json({ success: true, message: 'Gửi phiếu yêu cầu hỗ trợ thành công! Đội ngũ CSKH sẽ phản hồi sớm nhất.', request: newReq });
  });

  app.put('/api/cskh/requests/:id', AuthService.authenticate, AuthService.requireRole(['ADMIN', 'CSKH']), (req, res) => {
    const id = req.params.id;
    const idx = requestsStore.findIndex(r => r.id === id);
    if (idx === -1) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu yêu cầu' });
      return;
    }

    requestsStore[idx] = {
      ...requestsStore[idx],
      ...req.body,
      id,
      updatedAt: new Date().toISOString(),
    };

    if (req.body.status === 'RESOLVED') {
      requestsStore[idx].resolvedAt = new Date().toISOString();
    }

    res.json({ success: true, message: 'Đã cập nhật trạng thái phiếu yêu cầu hỗ trợ!', request: requestsStore[idx] });
  });

  // ==========================================
  // ROUTE: CSKH HUB & LIVE CHAT 1-1 THỜI GIAN THỰC
  // ==========================================
  app.get('/api/cskh/tickets', AuthService.authenticate, AuthService.requireRole(['ADMIN', 'CSKH']), (req, res) => {
    res.json({ success: true, tickets: supportService.getAllOpenTickets() });
  });

  // Lấy hoặc khởi tạo ticket trò chuyện 1-1 cho khách hàng/thiết bị
  app.get('/api/cskh/active-chat', AuthService.authenticate, (req: AuthenticatedRequest, res) => {
    const customerId = (req.query.customerId as string) || req.user?.id || '00000000-0000-0000-0000-000000000001';
    const hardwareId = req.query.hardwareId as string | undefined;
    const ticket = supportService.getOrCreateCustomerTicket(customerId, hardwareId);
    const rawMessages = supportService.getMessagesByTicket(ticket.id);

    // Chuẩn hóa định dạng tin nhắn cho cả Web Admin và Mobile App
    const messages = rawMessages.map(m => {
      const d = new Date(m.createdAt);
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const isCSKH = m.senderRole === 'CSKH';
      return {
        id: m.id,
        ticketId: m.ticketId,
        sender: isCSKH ? 'CSKH' : 'user',
        senderRole: m.senderRole,
        text: m.message,
        message: m.message,
        time: timeStr,
        createdAt: m.createdAt,
        hasSnapshot: !!(m.deviceSnapshot && Object.keys(m.deviceSnapshot).length > 0),
        deviceSnapshot: m.deviceSnapshot,
      };
    });

    res.json({ success: true, ticket, messages });
  });

  app.post('/api/cskh/active-chat/messages', AuthService.authenticate, async (req: AuthenticatedRequest, res) => {
    const { message, text, attachmentUrls, customerId, hardwareId, sender } = req.body;
    const targetCustomerId = customerId || req.user?.id || '00000000-0000-0000-0000-000000000001';
    const ticket = supportService.getOrCreateCustomerTicket(targetCustomerId, hardwareId);

    const actualMessage = (message || text || '').toString().trim();
    if (!actualMessage) {
      res.status(400).json({ success: false, error: 'Tin nhắn không được để trống' });
      return;
    }

    const isCSKH = sender === 'CSKH' || req.user?.role === 'CSKH' || req.user?.role === 'ADMIN';
    const senderRole = isCSKH ? 'CSKH' : 'CUSTOMER';

    const msg = await supportService.sendMessage({
      ticketId: ticket.id,
      senderId: req.user?.id || (isCSKH ? 'cskh-001' : targetCustomerId),
      senderRole,
      message: actualMessage,
      attachmentUrls,
    });

    const d = new Date(msg.createdAt);
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    const formattedMsg = {
      id: msg.id,
      ticketId: msg.ticketId,
      sender: isCSKH ? 'CSKH' : 'user',
      senderRole,
      text: msg.message,
      message: msg.message,
      time: timeStr,
      createdAt: msg.createdAt,
    };

    res.json({ success: true, message: formattedMsg, ticketId: ticket.id });
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
