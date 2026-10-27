import { postgresClient } from '../core/database/postgres.client.js';
import type { UnifiedUser } from '../app.js';

export const INITIAL_SEED_USERS: UnifiedUser[] = [
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
  {
    id: 'cust-001',
    fullName: 'Nguyễn Mạnh Đức',
    email: 'ducduc02092005@gmail.com',
    phoneNumber: '0912 345 678',
    role: 'CUSTOMER',
    roleTitle: 'Khách hàng',
    address: 'Biệt thự B2-08, Khu Đô Thị Vinhomes Riverside, Long Biên',
    province: 'Hà Nội',
    password: 'Austec123!@#',
    isActive: true,
    registeredAt: '2026-02-01',
    devices: [
      {
        hardwareId: 'AT-DOOR-88239A01',
        modelName: 'Austec Titadoor A900 Super',
        deviceType: 'Cửa cuốn',
        pairedAt: '2026-02-02 08:30',
        warrantyUntil: '2028-10-22',
        isOnline: true,
        roleInHome: 'OWNER',
      },
    ],
  },
];

export async function seedDatabase(): Promise<void> {
  const connected = await postgresClient.connect();
  if (!connected) return;

  try {
    for (const u of INITIAL_SEED_USERS) {
      await postgresClient.query(
        `INSERT INTO users (id, emp_id, full_name, email, phone_number, company, department, role, role_title, password, address, province, is_active, registered_at, updated_at, updated_by, devices)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         ON CONFLICT (email) DO NOTHING`,
        [
          u.id,
          u.empID || null,
          u.fullName,
          u.email,
          u.phoneNumber || null,
          u.company || null,
          u.department || null,
          u.role,
          u.roleTitle || null,
          u.password,
          u.address || null,
          u.province || null,
          u.isActive,
          u.registeredAt,
          u.updatedAt,
          u.updatedBy,
          JSON.stringify(u.devices || []),
        ]
      );
    }
    console.log('[Seed] Đã nạp danh sách tài khoản seed thành công vào PostgreSQL!');
  } catch (err: any) {
    console.warn('[Seed] Lỗi khi nạp seed users:', err.message);
  }
}
