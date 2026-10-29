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
