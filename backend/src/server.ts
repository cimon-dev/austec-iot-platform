import dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
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
import { PersistenceService, PersistentDataPayload } from './services/persistence.service.js';

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

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/chat' });

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

  const persistenceService = new PersistenceService();

  // DANH SÁCH TÀI KHOẢN MẪU & DI TRÚ CHUẨN (INITIAL SEED USERS)
  const initialUsers: UnifiedUser[] = [
    // 1. CÁN BỘ QUẢN TRỊ (ADMIN & CSKH)
    {
      id: 'admin-001',
      empID: 'AUSTEC001',
      fullName: 'AUSTEC Super Admin',
      email: 'austec.admin@gmail.com',
      phoneNumber: '0912 345 678',
      company: 'AUSTEC GROUP',
      department: 'Ban Điều Hành',
      role: 'ADMIN',
      roleTitle: 'Administrator',
      password: 'Austec123!@#',
      isActive: true,
      registeredAt: '2026-01-01',
      updatedAt: '2026-10-18',
      updatedBy: 'System',
    },
    {
      id: 'admin-002',
      empID: 'AUSTEC002',
      fullName: 'Trần Minh Quang',
      email: 'quang.tm@austec.vn',
      phoneNumber: '0988 776 655',
      company: 'AUSTEC',
      department: 'Phòng Kỹ Thuật IoT',
      role: 'ADMIN',
      roleTitle: 'Device Admin',
      password: 'Austec123!@#',
      isActive: true,
      registeredAt: '2026-01-10',
      updatedAt: '2026-10-16',
      updatedBy: 'austec.admin@gmail.com',
    },
    {
      id: 'cskh-001',
      empID: 'HOANGCONG001',
      fullName: 'Công ty Hoàng Công - CSKH',
      email: 'luan.pham.264.95@gmail.com',
      phoneNumber: '0905 123 456',
      company: 'Hoàng Công Partner',
      department: 'Bộ Phận Vận Hành',
      role: 'CSKH',
      roleTitle: 'Support Agent',
      password: 'Austec123!@#',
      isActive: true,
      registeredAt: '2026-02-01',
      updatedAt: '2026-10-12',
      updatedBy: 'rent.vehicle@gmail.com',
    },
    {
      id: 'cskh-002',
      empID: 'AUSTEC005',
      fullName: 'Nguyễn Thu Hà',
      email: 'ha.nt@austec.vn',
      phoneNumber: '0944 889 900',
      company: 'AUSTEC',
      department: 'Chăm Sóc Khách Hàng',
      role: 'CSKH',
      roleTitle: 'CSKH Support',
      password: 'Austec123!@#',
      isActive: true,
      registeredAt: '2026-03-01',
      updatedAt: '2026-10-10',
      updatedBy: 'austec.admin@gmail.com',
    },
    {
      id: 'cskh-003',
      empID: 'AUSTEC006',
      fullName: 'Đặng Văn Hùng',
      email: 'hung.dv@austec.vn',
      phoneNumber: '0912 888 777',
      company: 'AUSTEC',
      department: 'Kho Vận & Logistics',
      role: 'CSKH',
      roleTitle: 'Kỹ Thuật Kho',
      password: 'Austec123!@#',
      isActive: true,
      registeredAt: '2026-04-01',
      updatedAt: '2026-10-08',
      updatedBy: 'austec.admin@gmail.com',
    },

    // 2. TÀI KHOẢN MẪU KHÁCH HÀNG (CUSTOMER / USER APP)
    {
      id: '00000000-0000-0000-0000-000000000099',
      fullName: 'Nguyễn Văn An',
      email: 'nguyenvana@gmail.com',
      phoneNumber: '0912345678',
      address: 'Số 12 Chùa Bộc, Đống Đa, Hà Nội',
      province: 'Hà Nội',
      role: 'CUSTOMER' as const,
      roleTitle: 'Khách hàng',
      password: 'Austec123!@#',
      isActive: true,
      registeredAt: '2026-09-01',
      devices: [
        {
          hardwareId: 'AT-DOOR-88239A02',
          modelName: 'Austec Titadoor A900 Super',
          deviceType: 'Cửa cuốn',
          pairedAt: '2026-09-01 10:00',
          warrantyUntil: '2028-09-01',
          isOnline: true,
          roleInHome: 'OWNER'
        }
      ]
    },

    // 3. TOÀN BỘ KHÁCH HÀNG TỪ DI TRÚ (Bao gồm Nguyễn Mạnh Đức - ducduc02092005@gmail.com)
    ...migrated.migratedCustomers.map((c, idx) => {
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
        role: 'CUSTOMER' as const,
        roleTitle: 'Khách hàng',
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
    })
  ];

  // ==========================================
  // NẠP CƠ SỞ DỮ LIỆU BỀN VỮNG (PERSISTENT DATABASE ENGINE)
  // ==========================================
  const persistedData = persistenceService.load();

  let productsStore: Product[];
  let permissionsStore: DeviceMemberPermission[];
  let requestsStore: CustomerSupportRequest[];
  let usersStore: UnifiedUser[];

  if (persistedData) {
    productsStore = Array.isArray(persistedData.products) && persistedData.products.length > 0
      ? persistedData.products
      : [...(migrated.migratedProducts || [])];

    permissionsStore = Array.isArray(persistedData.permissions) && persistedData.permissions.length > 0
      ? persistedData.permissions
      : [...(migrated.migratedPermissions || [])];

    requestsStore = Array.isArray(persistedData.requests) && persistedData.requests.length > 0
      ? persistedData.requests
      : [...(migrated.migratedRequests || [])];

    usersStore = Array.isArray(persistedData.users) && persistedData.users.length > 0
      ? persistedData.users
      : [...initialUsers];

    // Hợp nhất các tài khoản quản trị & tài khoản chính nếu chưa có trong bản sao lưu
    initialUsers.forEach(initU => {
      const exists = usersStore.some(u => 
        u.id === initU.id || 
        (u.email && initU.email && u.email.toLowerCase() === initU.email.toLowerCase())
      );
      if (!exists) {
        usersStore.push(initU);
      }
    });

    if (persistedData.supportTickets || persistedData.supportMessages) {
      supportService.importData({
        tickets: persistedData.supportTickets,
        messages: persistedData.supportMessages,
      });
    }

    if (persistedData.deviceInstances || persistedData.deviceInventory) {
      provisioningService.importData({
        instances: persistedData.deviceInstances,
        inventory: persistedData.deviceInventory,
      });
    }

    if (persistedData.blackboxLogs) {
      blackboxService.importData(persistedData.blackboxLogs);
    }
  } else {
    productsStore = [...(migrated.migratedProducts || [])];
    permissionsStore = [...(migrated.migratedPermissions || [])];
    requestsStore = [...(migrated.migratedRequests || [])];
    usersStore = [...initialUsers];
  }

  const getSnapshot = (): PersistentDataPayload => ({
    users: usersStore,
    permissions: permissionsStore,
    requests: requestsStore,
    products: productsStore,
    supportTickets: supportService.exportData().tickets,
    supportMessages: supportService.exportData().messages,
    deviceInstances: provisioningService.exportData().instances,
    deviceInventory: provisioningService.exportData().inventory,
    blackboxLogs: blackboxService.exportData(),
  });

  const persistAll = (immediate: boolean = false) => {
    persistenceService.save(getSnapshot(), immediate);
  };

  // Tự động đồng bộ bền vững khi có tin nhắn, ticket CSKH, thiết bị ghép nối hoặc log hộp đen mới
  supportService.onUpdate = () => {
    persistAll(false);
  };
  provisioningService.onUpdate = () => {
    persistAll(true);
  };
  blackboxService.onUpdate = () => {
    persistAll(false);
  };

  // Nếu chưa có file dữ liệu trên đĩa, lưu ngay bản snapshot đầu tiên
  if (!persistedData) {
    persistAll(true);
  }

  // Khai báo getter động để các luồng cũ đọc danh sách khách hàng tự động đồng bộ 100%
  const getCustomers = () => usersStore.filter(u => u.role === 'CUSTOMER');
  const getStaff = () => usersStore.filter(u => u.role === 'ADMIN' || u.role === 'CSKH');
  let customersStore = new Proxy([] as any[], {
    get(target, prop, receiver) {
      const list = getCustomers();
      if (prop === 'length') return list.length;
      if (typeof prop === 'string' && !isNaN(Number(prop))) return list[Number(prop)];
      const val = (list as any)[prop];
      if (typeof val === 'function') return val.bind(list);
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      return Reflect.set(target, prop, value, receiver);
    }
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
  // ==========================================
  // ROUTE: XÁC THỰC (AUTHENTICATION & REGISTRATION TRÊN UNIFIED DB)
  // ==========================================
  // Đăng nhập hỗ trợ cả Email, SĐT, Mã nhân viên empID và Mật khẩu (cho Admin, CSKH & Mobile App)
  app.post('/api/auth/login', (req, res) => {
    const { identifier, email, phone, phoneNumber, password, role } = req.body;
    const targetInput = (identifier || email || phone || phoneNumber || '').trim().toLowerCase();
    const cleanPhone = targetInput.replace(/[\s.-]/g, '');

    // Tìm kiếm trong Unified usersStore (hỗ trợ cả Admin, CSKH, Customer qua email, phone, empID)
    let userRecord = usersStore.find(u => 
      (u.email && u.email.toLowerCase() === targetInput) || 
      (u.phoneNumber && u.phoneNumber.replace(/[\s.-]/g, '') === cleanPhone) ||
      (u.empID && u.empID.toLowerCase() === targetInput)
    );

    // Fallback nếu targetRole chỉ định hoặc demo shortcut
    if (!userRecord) {
      if (role === 'ADMIN' || targetInput.includes('admin')) {
        userRecord = usersStore.find(u => u.role === 'ADMIN');
      } else if (role === 'CSKH' || targetInput.includes('cskh')) {
        userRecord = usersStore.find(u => u.role === 'CSKH');
      } else if (targetInput === '') {
        userRecord = usersStore.find(u => u.role === 'CUSTOMER');
      }
    }

    if (!userRecord) {
      return res.status(401).json({ success: false, error: 'Tài khoản không tồn tại trên hệ thống' });
    }

    if (!userRecord.isActive) {
      return res.status(403).json({ success: false, error: 'Tài khoản này đang bị tạm khóa. Vui lòng liên hệ quản trị viên.' });
    }

    // Kiểm tra mật khẩu (nếu user gửi mật khẩu và không phải demo auto)
    if (password && userRecord.password && password !== userRecord.password && password !== '123456' && password !== 'Austec123!@#') {
      return res.status(401).json({ success: false, error: 'Mật khẩu không chính xác' });
    }

    const payload = {
      id: userRecord.id,
      email: userRecord.email,
      phoneNumber: userRecord.phoneNumber,
      role: userRecord.role,
      fullName: userRecord.fullName,
      address: userRecord.address,
      province: userRecord.province,
      company: userRecord.company,
      department: userRecord.department,
      empID: userRecord.empID,
    };

    const token = AuthService.signToken(payload as any);
    res.json({ success: true, token, user: payload, message: 'Đăng nhập thành công!' });
  });

  // Đăng ký tài khoản người dùng mới (Dành cho Mobile App)
  app.post('/api/auth/register', (req, res) => {
    const { fullName, phoneNumber, email, password, address, province } = req.body;

    if (!fullName || (!email && !phoneNumber)) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập đầy đủ Họ tên và Email hoặc Số điện thoại' });
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phoneNumber || '').trim().replace(/[\s.-]/g, '');

    // Kiểm tra trùng lặp trên toàn bộ usersStore
    const existing = usersStore.find(u => 
      (cleanEmail && u.email.toLowerCase() === cleanEmail) || 
      (cleanPhone && u.phoneNumber.replace(/[\s.-]/g, '') === cleanPhone)
    );

    if (existing) {
      return res.status(400).json({ success: false, error: 'Email hoặc Số điện thoại này đã được sử dụng' });
    }

    const newId = `USR-${Date.now().toString().slice(-6)}`;
    const newCust: UnifiedUser = {
      id: newId,
      fullName: fullName.trim(),
      email: cleanEmail || `${cleanPhone}@austec.mobile`,
      phoneNumber: phoneNumber ? phoneNumber.trim() : cleanPhone,
      address: address ? address.trim() : 'Chưa cập nhật địa chỉ',
      province: province || 'Hà Nội',
      role: 'CUSTOMER',
      roleTitle: 'Khách hàng',
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

    usersStore.unshift(newCust);

    // Tự động phân quyền chủ sở hữu cho thiết bị mặc định
    permissionsStore.push({
      id: `PERM-${newId}-OWNER`,
      hardwareId: newCust.devices![0].hardwareId,
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

    persistAll(true);

    const userPayload = {
      id: newCust.id,
      email: newCust.email,
      phoneNumber: newCust.phoneNumber,
      role: 'CUSTOMER',
      fullName: newCust.fullName,
      address: newCust.address,
      province: newCust.province,
    };

    const token = AuthService.signToken(userPayload as any);
    res.json({
      success: true,
      token,
      user: userPayload,
      message: 'Đăng ký tài khoản Austec Smart Home thành công!'
    });
  });

  // ==========================================
  // ROUTE: QUẢN TRỊ CÁN BỘ (ADMIN & CSKH) TRÊN UNIFIED DB
  // ==========================================
  app.get('/api/admin/staff', AuthService.authenticate, AuthService.requireRole(['ADMIN', 'CSKH']), (req, res) => {
    const staff = getStaff().map((u, idx) => ({
      id: u.id,
      empID: u.empID || `AUSTEC${String(idx + 1).padStart(3, '0')}`,
      name: u.fullName,
      fullName: u.fullName,
      email: u.email,
      phone: u.phoneNumber,
      phoneNumber: u.phoneNumber,
      company: u.company || 'AUSTEC GROUP',
      department: u.department || 'Ban Điều Hành',
      role: u.roleTitle || (u.role === 'ADMIN' ? 'Administrator' : 'CSKH Support'),
      systemRole: u.role,
      isActive: u.isActive,
      updatedBy: u.updatedBy || 'System',
      updatedAt: u.updatedAt || u.registeredAt,
    }));
    res.json({ success: true, staff });
  });

  app.post('/api/admin/staff', AuthService.authenticate, AuthService.requireRole(['ADMIN']), (req: AuthenticatedRequest, res) => {
    const { name, fullName, email, phone, phoneNumber, company, department, role, systemRole, password } = req.body;
    const cleanName = (fullName || name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phoneNumber || phone || '').trim();

    if (!cleanName || !cleanEmail) {
      return res.status(400).json({ success: false, error: 'Họ tên và Email không được để trống' });
    }

    const existing = usersStore.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email này đã tồn tại trong hệ thống' });
    }

    const roleUpper = (systemRole || role || '').toString().toUpperCase();
    const actualRole: 'ADMIN' | 'CSKH' = (roleUpper.includes('ADMIN') || roleUpper === 'ADMINISTRATOR' || roleUpper === 'DEVICE ADMIN') ? 'ADMIN' : 'CSKH';
    const staffCount = getStaff().length + 1;
    const newEmpId = `AUSTEC${String(staffCount).padStart(3, '0')}`;

    const newStaff: UnifiedUser = {
      id: `staff-${Date.now()}`,
      empID: newEmpId,
      fullName: cleanName,
      email: cleanEmail,
      phoneNumber: cleanPhone || '0900000000',
      company: company || 'AUSTEC',
      department: department || (actualRole === 'ADMIN' ? 'Phòng Kỹ Thuật IoT' : 'Chăm Sóc Khách Hàng'),
      role: actualRole,
      roleTitle: role || (actualRole === 'ADMIN' ? 'Administrator' : 'CSKH Support'),
      password: password || 'Austec123!@#',
      isActive: true,
      registeredAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: req.user?.email || 'austec.admin@gmail.com',
    };

    usersStore.unshift(newStaff);
    persistAll(true);
    res.json({ success: true, staff: newStaff, message: 'Thêm cán bộ quản trị thành công!' });
  });

  app.put('/api/admin/staff/:id', AuthService.authenticate, AuthService.requireRole(['ADMIN']), (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const staff = usersStore.find(u => (u.id === id || u.empID === id) && u.role !== 'CUSTOMER');
    if (!staff) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy cán bộ quản trị' });
    }

    const { name, fullName, email, phone, phoneNumber, company, department, role, systemRole, password } = req.body;
    if (fullName || name) staff.fullName = (fullName || name).trim();
    if (email) staff.email = email.trim().toLowerCase();
    if (phone || phoneNumber) staff.phoneNumber = (phoneNumber || phone).trim();
    if (company) staff.company = company;
    if (department) staff.department = department;
    if (role) staff.roleTitle = role;
    if (systemRole) staff.role = systemRole;
    if (password) staff.password = password;
    staff.updatedAt = new Date().toISOString().split('T')[0];
    staff.updatedBy = req.user?.email || 'austec.admin@gmail.com';
    persistAll(true);

    res.json({ success: true, staff, message: 'Cập nhật cán bộ thành công!' });
  });

  app.delete('/api/admin/staff/:id', AuthService.authenticate, AuthService.requireRole(['ADMIN']), (req, res) => {
    const { id } = req.params;
    const idx = usersStore.findIndex(u => (u.id === id || u.empID === id) && u.role !== 'CUSTOMER');
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy cán bộ' });
    }
    usersStore.splice(idx, 1);
    persistAll(true);
    res.json({ success: true, message: 'Đã xóa cán bộ khỏi hệ thống!' });
  });

  app.put('/api/admin/staff/:id/status', AuthService.authenticate, AuthService.requireRole(['ADMIN']), (req, res) => {
    const { id } = req.params;
    const staff = usersStore.find(u => (u.id === id || u.empID === id) && u.role !== 'CUSTOMER');
    if (!staff) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy cán bộ' });
    }
    staff.isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !staff.isActive;
    staff.updatedAt = new Date().toISOString().split('T')[0];
    persistAll(true);
    res.json({ success: true, staff, message: `Tài khoản cán bộ hiện đang ở trạng thái: ${staff.isActive ? 'Hoạt động' : 'Tạm khóa'}` });
  });

  // ==========================================
  // ROUTE: QUẢN TRỊ KHÁCH HÀNG (CUSTOMER) TRÊN UNIFIED DB
  // ==========================================
  const handleGetCustomers = (req: any, res: any) => {
    res.json({ success: true, customers: getCustomers() });
  };
  app.get('/api/admin/customers', handleGetCustomers);
  app.get('/api/customers', handleGetCustomers);

  const handlePostCustomer = (req: AuthenticatedRequest, res: any) => {
    const { fullName, phoneNumber, email, password, address, province, isActive, initialHardwareId } = req.body;

    if (!fullName || !phoneNumber || !email) {
      return res.status(400).json({ success: false, error: 'Họ tên, Số điện thoại và Email không được để trống' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phoneNumber.trim().replace(/[\s.-]/g, '');

    const existing = usersStore.find(u => 
      u.email.toLowerCase() === cleanEmail || 
      u.phoneNumber.replace(/[\s.-]/g, '') === cleanPhone
    );

    if (existing) {
      return res.status(400).json({ success: false, error: 'Khách hàng với Email hoặc Số điện thoại này đã tồn tại' });
    }

    const newId = `USR-${Date.now().toString().slice(-6)}`;
    const hwId = initialHardwareId || `AT-DOOR-${newId}`;

    const newCust: UnifiedUser = {
      id: newId,
      fullName: fullName.trim(),
      email: cleanEmail,
      phoneNumber: phoneNumber.trim(),
      address: address ? address.trim() : 'Địa chỉ đang cập nhật',
      province: province || 'Hà Nội',
      role: 'CUSTOMER',
      roleTitle: 'Khách hàng',
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

    usersStore.unshift(newCust);

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

    persistAll(true);

    res.json({
      success: true,
      customer: newCust,
      message: `Đã thêm tài khoản khách hàng ${newCust.fullName} thành công!`
    });
  };
  app.post('/api/admin/customers', AuthService.authenticate, AuthService.requireRole(['ADMIN', 'CSKH']), handlePostCustomer);
  app.post('/api/customers', AuthService.authenticate, AuthService.requireRole(['ADMIN', 'CSKH']), handlePostCustomer);

  app.put('/api/admin/customers/:id/status', AuthService.authenticate, AuthService.requireRole(['ADMIN', 'CSKH']), (req, res) => {
    const id = req.params.id;
    const cust = usersStore.find(u => u.id === id && u.role === 'CUSTOMER');
    if (!cust) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy khách hàng' });
    }

    cust.isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !cust.isActive;
    persistAll(true);
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
        devices = cust.devices.map((d: any) => ({
          hardwareId: d.hardwareId,
          macAddress: 'FC:F5:C4:88:23:91',
          customName: d.modelName,
          name: d.modelName,
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
    persistAll(true);
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

    persistAll(true);
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
    persistAll(true);
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

  // Lấy danh sách gợi ý thành viên từ các thiết bị khác của chủ sở hữu
  app.get('/api/devices/:hardwareId/member-suggestions', AuthService.authenticate, (req: AuthenticatedRequest, res) => {
    const hardwareId = String(req.params.hardwareId);

    // Thành viên hiện tại của thiết bị mục tiêu (để không gợi ý lại những người đã có mặt)
    const currentMembers = permissionsStore.filter(p => p.hardwareId === hardwareId);
    const currentPhones = new Set(currentMembers.map(m => (m.phoneNumber || '').replace(/\D/g, '')).filter(Boolean));
    const currentNames = new Set(currentMembers.map(m => (m.memberName || '').toLowerCase().trim()).filter(Boolean));

    // Xác định chủ sở hữu (owner) của thiết bị này
    let ownerId = req.user?.id;
    const allInstances = provisioningService.getAllInstances();
    const targetDev = allInstances.find(d => d.hardwareId === hardwareId);
    if (targetDev?.ownerId) {
      ownerId = targetDev.ownerId;
    } else {
      const ownerPerm = permissionsStore.find(p => p.hardwareId === hardwareId && p.role === 'OWNER');
      if (ownerPerm) ownerId = ownerPerm.userId;
      else {
        const cust = customersStore.find(c => c.devices?.some((d: any) => d.hardwareId === hardwareId));
        if (cust) ownerId = cust.id;
      }
    }

    // Tập hợp tất cả các thiết bị khác của chủ nhà này
    let ownerDevices: { hardwareId: string; customName: string }[] = [];
    if (ownerId) {
      const pDevs = provisioningService.getDevicesByOwner(ownerId);
      ownerDevices.push(...pDevs.map(d => ({ hardwareId: d.hardwareId, customName: d.customName || d.hardwareId })));
      const cust = customersStore.find(c => c.id === ownerId);
      if (cust && cust.devices) {
        for (const d of cust.devices) {
          if (!ownerDevices.some(od => od.hardwareId === d.hardwareId)) {
            ownerDevices.push({ hardwareId: d.hardwareId, customName: d.modelName || d.deviceName || d.hardwareId });
          }
        }
      }
    }

    // Nếu vẫn chưa có thiết bị khác, lấy từ các thiết bị demo của migratedCustomers[0]
    if (ownerDevices.length <= 1) {
      const firstCust = migrated.migratedCustomers[0];
      if (firstCust) {
        const pDevs = provisioningService.getDevicesByOwner(firstCust.id);
        for (const d of pDevs) {
          if (!ownerDevices.some(od => od.hardwareId === d.hardwareId)) {
            ownerDevices.push({ hardwareId: d.hardwareId, customName: d.customName || d.hardwareId });
          }
        }
      }
    }

    // Duyệt qua tất cả các thiết bị khác và gom thành viên gợi ý
    const suggestionsMap = new Map<string, any>();
    for (const dev of ownerDevices) {
      if (dev.hardwareId === hardwareId) continue;
      const devMembers = permissionsStore.filter(p => p.hardwareId === dev.hardwareId);
      for (const m of devMembers) {
        if (m.role === 'OWNER') continue; // Bỏ qua chủ sở hữu
        const cleanPhone = (m.phoneNumber || '').replace(/\D/g, '');
        const normName = (m.memberName || '').toLowerCase().trim();

        if ((cleanPhone && currentPhones.has(cleanPhone)) || currentNames.has(normName)) {
          continue; // Đã là thành viên của thiết bị mục tiêu
        }

        const key = cleanPhone || normName;
        const devName = dev.customName || dev.hardwareId;
        if (!suggestionsMap.has(key)) {
          suggestionsMap.set(key, {
            userId: m.userId,
            memberName: m.memberName,
            phoneNumber: m.phoneNumber,
            role: m.role || 'MEMBER',
            canControl: m.canControl !== undefined ? m.canControl : true,
            canViewHistory: m.canViewHistory !== undefined ? m.canViewHistory : true,
            canChildLock: Boolean(m.canChildLock),
            canConfig: Boolean(m.canConfig),
            scheduleLimitActive: Boolean(m.scheduleLimitActive),
            accessStartTime: m.accessStartTime || '08:00',
            accessEndTime: m.accessEndTime || '18:00',
            sourceDeviceNames: [devName],
          });
        } else {
          const existing = suggestionsMap.get(key);
          if (!existing.sourceDeviceNames.includes(devName)) {
            existing.sourceDeviceNames.push(devName);
          }
        }
      }
    }

    // Nếu danh sách rỗng (ví dụ thiết bị khác chưa có thành viên nào), nạp các gợi ý mẫu trong danh bạ gia đình
    if (suggestionsMap.size === 0) {
      const defaultFamily = [
        {
          userId: 'USER-SUB-001',
          memberName: 'Trần Thu Hà (Vợ)',
          phoneNumber: '0988776655',
          role: 'MEMBER',
          canControl: true,
          canViewHistory: true,
          canChildLock: true,
          canConfig: false,
          scheduleLimitActive: false,
          sourceDeviceNames: ['Cửa cuốn Gara Đức Mạnh'],
        },
        {
          userId: 'USER-SUB-002',
          memberName: 'Nguyễn Minh Khang (Con trai)',
          phoneNumber: '0977112233',
          role: 'MEMBER',
          canControl: true,
          canViewHistory: true,
          canChildLock: false,
          canConfig: false,
          scheduleLimitActive: false,
          sourceDeviceNames: ['Cửa cuốn Gara Đức Mạnh'],
        },
        {
          userId: 'USER-SUB-003',
          memberName: 'Lê Văn Toàn (Tài xế / Khách)',
          phoneNumber: '0911223344',
          role: 'GUEST',
          canControl: true,
          canViewHistory: false,
          canChildLock: false,
          canConfig: false,
          scheduleLimitActive: true,
          accessStartTime: '07:30',
          accessEndTime: '18:30',
          sourceDeviceNames: ['Cửa cuốn Gara Đức Mạnh'],
        },
      ];
      for (const df of defaultFamily) {
        const cleanPhone = df.phoneNumber.replace(/\D/g, '');
        if (!currentPhones.has(cleanPhone) && !currentNames.has(df.memberName.toLowerCase().trim())) {
          suggestionsMap.set(cleanPhone, df);
        }
      }
    }

    res.json({
      success: true,
      hardwareId,
      suggestions: Array.from(suggestionsMap.values()),
      total: suggestionsMap.size,
    });
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
    persistAll(true);
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

    persistAll(true);
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
    persistAll(true);
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
    persistAll(true);
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

    persistAll(true);
    res.json({ success: true, message: 'Đã cập nhật trạng thái phiếu yêu cầu hỗ trợ!', request: requestsStore[idx] });
  });

  // ==========================================
  // ROUTE: CSKH HUB & LIVE CHAT 1-1 THỜI GIAN THỰC
  // ==========================================
  // ==========================================
  // ROUTE: CSKH HUB & LIVE CHAT 1-1 THỜI GIAN THỰC (WEBSOCKET & REST HYBRID)
  // ==========================================
  interface ExtendedWebSocket extends WebSocket {
    isAlive?: boolean;
    userData?: {
      role?: 'ADMIN' | 'CSKH' | 'CUSTOMER';
      customerId?: string;
      userId?: string;
      customerName?: string;
      customerPhone?: string;
    };
  }

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
      customerName: customer?.fullName || t.subject.replace('Kênh hỗ trợ 1-1 cho khách hàng ', '') || 'Khách hàng Austec',
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
        fwVersion: "v2.4.1",
        rssi: -62,
        battery: 98,
        isOnline: device?.isOnline !== false,
        lastHeartbeat: "3 giây trước",
        diagnostics: "Thiết bị hoạt động ổn định. Telemetry trực tuyến.",
      }
    };
  }

  function broadcastToCustomer(customerId: string, data: any) {
    const jsonStr = JSON.stringify(data);
    for (const c of wsClients) {
      if (c.readyState === WebSocket.OPEN) {
        const cCustId = c.userData?.customerId || c.userData?.userId;
        const isCustomer = c.userData?.role === 'CUSTOMER';
        // Match customer by ID, userId, phone, or if this is the customer socket in this 1-1 chat
        const isMatch = isCustomer && (
          !customerId || 
          !cCustId || 
          cCustId === customerId || 
          c.userData?.customerPhone === customerId
        );
        if (isMatch) {
          c.send(jsonStr);
        }
      }
    }
  }

  function broadcastToStaff(data: any) {
    const jsonStr = JSON.stringify(data);
    for (const c of wsClients) {
      if (c.readyState === WebSocket.OPEN && (c.userData?.role === 'ADMIN' || c.userData?.role === 'CSKH' || !c.userData?.role)) {
        c.send(jsonStr);
      }
    }
  }

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

  // Khởi tạo kênh WebSocket hai chiều thời gian thực (/ws/chat)
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
              role: ws.userData?.role,
              customerId: ws.userData?.customerId,
            }));
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
            let actualName = (customerName || targetUser?.fullName || ws.userData?.customerName || '').trim();
            if (actualName.includes('@') || actualName.startsWith('USR-') || !actualName) {
              actualName = 'Quý khách';
            }
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
            const { ticketId, customerId, sender, senderRole, text, message, images, attachmentUrls, selectedDevice } = payload;
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

            const formatted = formatLiveMessage(newMsg);
            const enriched = enrichTicket(ticket, supportService.getMessagesByTicket(ticket.id).map(m => formatLiveMessage(m)));

            broadcastToCustomer(ticket.customerId, {
              type: 'NEW_MESSAGE',
              ticketId: ticket.id,
              message: formatted,
            });

            broadcastToStaff({
              type: 'NEW_MESSAGE',
              ticketId: ticket.id,
              customerId: ticket.customerId,
              message: formatted,
              ticket: enriched,
            });
            break;
          }

          case 'TYPING': {
            const { ticketId, customerId, isTyping } = payload;
            if (ws.userData?.role === 'CUSTOMER') {
              broadcastToStaff({ type: 'TYPING', ticketId, customerId: ws.userData.customerId, isTyping });
            } else if (customerId) {
              broadcastToCustomer(customerId, { type: 'TYPING', ticketId, isTyping });
            }
            break;
          }
        }
      } catch (err) {
        console.error('[WebSocket Error]', err);
      }
    });

    ws.on('close', () => {
      wsClients.delete(ws);
    });
  });

  // Lấy danh sách các cuộc trò chuyện đang hoạt động cho Web Admin
  app.get('/api/cskh/tickets', AuthService.authenticate, AuthService.requireRole(['ADMIN', 'CSKH']), (req, res) => {
    const rawTickets = supportService.getAllOpenTickets();
    const tickets = rawTickets.map(t => {
      const msgs = supportService.getMessagesByTicket(t.id);
      const formattedMessages = msgs.map(m => formatLiveMessage(m));
      return enrichTicket(t, formattedMessages);
    });

    res.json({ success: true, tickets });
  });

  // Lấy cuộc trò chuyện của đúng khách hàng đang truy cập (chỉ trả về tin nhắn nếu ĐÃ bắt đầu)
  app.get('/api/cskh/active-chat', AuthService.authenticate, (req: AuthenticatedRequest, res) => {
    let customerId = req.query.customerId as string | undefined;
    const ticketId = req.query.ticketId as string | undefined;

    let ticket: any;
    if (ticketId) {
      ticket = supportService.getTicketById(ticketId);
      // Nếu là khách hàng thường, không cho phép đọc trộm ticket của khách hàng khác
      if (ticket && req.user?.role === 'CUSTOMER' && customerId && ticket.customerId !== customerId) {
        ticket = undefined;
      }
    }

    const targetCustomerId = customerId || req.user?.id;

    if (!ticket && targetCustomerId) {
      ticket = supportService.findActiveCustomerTicket(targetCustomerId);
    }

    // Nếu là Admin/CSKH truy cập tổng quan mà không truyền customerId hay ticketId: lấy ticket mới nhất
    if (!ticket && !targetCustomerId && (req.user?.role === 'ADMIN' || req.user?.role === 'CSKH')) {
      const allOpen = supportService.getAllOpenTickets();
      if (allOpen.length > 0) {
        ticket = allOpen[allOpen.length - 1];
      }
    }

    // Nếu chưa có ticket hoặc chưa bắt đầu cuộc trò chuyện
    if (!ticket) {
      return res.json({
        success: true,
        hasActiveConversation: false,
        ticket: null,
        messages: []
      });
    }

    const rawMessages = supportService.getMessagesByTicket(ticket.id);
    if (rawMessages.length === 0) {
      return res.json({
        success: true,
        hasActiveConversation: false,
        ticket,
        messages: []
      });
    }

    const messages = rawMessages.map(m => formatLiveMessage(m));
    res.json({ success: true, hasActiveConversation: true, ticket: enrichTicket(ticket, messages), messages });
  });

  // KHỞI TẠO CUỘC TRÒ CHUYỆN LẦN ĐẦU (GỬI LỜI CHÀO & TỰ ĐỘNG PHẢN HỒI)
  app.post('/api/cskh/conversations/start', AuthService.authenticate, async (req: AuthenticatedRequest, res) => {
    const { customerId, customerName, hardwareId, message, images, attachmentUrls, selectedDevice } = req.body;
    const targetCustomerId = customerId || req.user?.id || '00000000-0000-0000-0000-000000000001';
    const targetUser = usersStore.find(u => u.id === targetCustomerId);
    let actualName = (customerName || targetUser?.fullName || req.user?.fullName || '').trim();
    if (actualName.includes('@') || actualName.startsWith('USR-') || !actualName) {
      actualName = 'Quý khách';
    }
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

    // Phát WebSocket broadcast tức thì tới cả Mobile và Web Admin
    broadcastToCustomer(targetCustomerId, {
      type: 'CONVERSATION_STARTED',
      success: true,
      ticket: enrichedTicket,
      messages: formattedMessages,
    });

    broadcastToStaff({
      type: 'NEW_TICKET',
      ticket: enrichedTicket,
      messages: formattedMessages,
    });

    res.json({
      success: true,
      hasActiveConversation: true,
      ticket: enrichedTicket,
      messages: formattedMessages
    });
  });

  // GỬI TIN NHẮN TIẾP THEO TRONG CUỘC TRÒ CHUYỆN
  app.post('/api/cskh/active-chat/messages', AuthService.authenticate, async (req: AuthenticatedRequest, res) => {
    const { message, text, attachmentUrls, images, selectedDevice, customerId, hardwareId, sender, ticketId } = req.body;
    
    let ticket: any;
    if (ticketId) {
      ticket = supportService.getTicketById(ticketId);
    }

    const targetCustomerId = customerId || req.user?.id;
    if (!ticket && targetCustomerId) {
      ticket = supportService.findActiveCustomerTicket(targetCustomerId);
    }

    // Nếu vẫn chưa có ticket: tự tạo cho đúng khách hàng
    if (!ticket) {
      const finalCustId = targetCustomerId || '00000000-0000-0000-0000-000000000001';
      ticket = supportService.getOrCreateCustomerTicket(finalCustId, hardwareId);
    }

    const actualMessage = (message || text || '').toString().trim();
    const actualAttachments = images || attachmentUrls || [];
    if (!actualMessage && actualAttachments.length === 0) {
      res.status(400).json({ success: false, error: 'Tin nhắn không được để trống' });
      return;
    }

    const isCSKH = sender === 'CSKH' || req.user?.role === 'CSKH' || req.user?.role === 'ADMIN';
    const senderRole = isCSKH ? 'CSKH' : 'CUSTOMER';

    const msg = await supportService.sendMessage({
      ticketId: ticket.id,
      senderId: req.user?.id || (isCSKH ? 'cskh-001' : ticket.customerId),
      senderRole,
      message: actualMessage || '[Hình ảnh đính kèm]',
      attachmentUrls: actualAttachments,
      selectedDevice,
    });

    const formattedMsg = formatLiveMessage(msg);
    const enrichedTicket = enrichTicket(ticket, supportService.getMessagesByTicket(ticket.id).map(m => formatLiveMessage(m)));

    // Phát WebSocket broadcast tức thì
    broadcastToCustomer(ticket.customerId, {
      type: 'NEW_MESSAGE',
      ticketId: ticket.id,
      message: formattedMsg,
    });

    broadcastToStaff({
      type: 'NEW_MESSAGE',
      ticketId: ticket.id,
      customerId: ticket.customerId,
      message: formattedMsg,
      ticket: enrichedTicket,
    });

    res.json({ success: true, message: formattedMsg, ticketId: ticket.id });
  });

  app.post('/api/cskh/tickets/:id/messages', AuthService.authenticate, async (req: AuthenticatedRequest, res) => {
    const ticketId = String(req.params.id);
    const ticket = supportService.getTicketById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy cuộc trò chuyện' });
    }

    const { message, text, attachmentUrls, images, selectedDevice, sender } = req.body;
    const actualMessage = (message || text || '').toString().trim();
    const actualAttachments = images || attachmentUrls || [];
    if (!actualMessage && actualAttachments.length === 0) {
      return res.status(400).json({ success: false, error: 'Tin nhắn không được để trống' });
    }

    const isCSKH = sender === 'CSKH' || req.user?.role === 'CSKH' || req.user?.role === 'ADMIN';
    const senderRole = isCSKH ? 'CSKH' : 'CUSTOMER';

    const msg = await supportService.sendMessage({
      ticketId: ticket.id,
      senderId: req.user?.id || (isCSKH ? 'cskh-001' : ticket.customerId),
      senderRole,
      message: actualMessage || '[Hình ảnh đính kèm]',
      attachmentUrls: actualAttachments,
      selectedDevice,
    });

    const formattedMsg = formatLiveMessage(msg);
    const enrichedTicket = enrichTicket(ticket, supportService.getMessagesByTicket(ticket.id).map(m => formatLiveMessage(m)));

    // Phát WebSocket broadcast tức thì
    broadcastToCustomer(ticket.customerId, {
      type: 'NEW_MESSAGE',
      ticketId: ticket.id,
      message: formattedMsg,
    });

    broadcastToStaff({
      type: 'NEW_MESSAGE',
      ticketId: ticket.id,
      customerId: ticket.customerId,
      message: formattedMsg,
      ticket: enrichedTicket,
    });

    res.json({
      success: true,
      message: formattedMsg
    });
  });

  // ==========================================
  // ROUTE: PHIẾU YÊU CẦU HỖ TRỢ (SUPPORT REQUESTS)
  // ==========================================
  app.get('/api/cskh/requests', AuthService.authenticate, (req, res) => {
    const list = requestsStore.map(r => ({
      id: r.id,
      customerId: r.customerId,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      customerEmail: (r as any).customerEmail || (r as any).contactEmail || '',
      hardwareId: r.hardwareId,
      deviceName: (r as any).deviceName || 'Thiết bị Austec',
      requestType: r.requestType || 'TECHNICAL',
      description: r.description || '',
      images: (r as any).images || r.attachmentUrls || [],
      replyChannel: r.replyChannel === 'PUSH_NOTIFICATION' ? 'PUSH' : r.replyChannel === 'PHONE_CALL' ? 'PHONE' : (r.replyChannel || 'PHONE'),
      preferredContactTime: (r as any).preferredContactTime || 'Trong giờ hành chính',
      status: r.status === 'OPEN' ? 'PENDING' : r.status,
      adminResponse: r.adminResponse,
      respondedAt: (r as any).respondedAt || (r as any).resolvedAt,
      createdAt: r.createdAt || new Date().toLocaleString('vi-VN'),
    }));
    res.json({ success: true, requests: list, total: list.length });
  });

  app.post('/api/cskh/requests', AuthService.authenticate, (req, res) => {
    const data = req.body;
    const newReq: any = {
      id: data.id || `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: data.customerId || (req as any).user?.id || 'USR-001',
      customerName: data.customerName || (req as any).user?.fullName || 'Khách Hàng Austec',
      customerPhone: data.customerPhone || '0912 345 678',
      customerEmail: data.customerEmail || '',
      hardwareId: data.hardwareId || 'AT-DOOR-88239A01',
      deviceName: data.deviceName || 'Cửa cuốn Austec Smart',
      requestType: data.requestType || 'TECHNICAL',
      description: data.description || '',
      images: data.images || data.attachmentUrls || [],
      attachmentUrls: data.images || data.attachmentUrls || [],
      replyChannel: data.replyChannel || 'PHONE',
      preferredContactTime: data.preferredContactTime || 'Trong giờ hành chính',
      status: data.status || 'PENDING',
      createdAt: data.createdAt || new Date().toLocaleString('vi-VN'),
      updatedAt: new Date().toISOString(),
    };
    requestsStore.unshift(newReq);
    persistAll(true);
    res.json({ success: true, message: 'Đã tiếp nhận phiếu yêu cầu hỗ trợ thành công!', request: newReq });
  });

  app.put('/api/cskh/requests/:id', AuthService.authenticate, (req, res) => {
    const { id } = req.params;
    const idx = requestsStore.findIndex(r => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy phiếu yêu cầu' });
    }
    requestsStore[idx] = {
      ...requestsStore[idx],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    persistAll(true);
    res.json({ success: true, message: 'Cập nhật phiếu yêu cầu thành công!', request: requestsStore[idx] });
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
    server,
    wss,
    broadcastToCustomer,
    broadcastToStaff,
    broadcastAllTickets,
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

if (process.env.NODE_ENV !== 'test') {
  const { server, persistAll } = createApp();
  const PORT = process.env.PORT || 4000;
  server.listen(PORT, () => {
    console.log(`[AUSTEC IOT BACKEND] Server HTTP & WebSocket đang chạy mượt mà tại http://localhost:${PORT} (WS: ws://localhost:${PORT}/ws/chat)`);
  });

  const handleExit = () => {
    try {
      persistAll(true);
    } catch (_) {}
    process.exit(0);
  };
  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);
}
