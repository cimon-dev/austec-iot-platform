import { postgresClient, PostgresClient } from '../../core/database/postgres.client.js';
import { UserEntity, SystemRoleEntity } from './entities/user.entity.js';
import { DeviceMemberPermission } from '@austec/database';

export class UsersRepository {
  private client: PostgresClient;
  private usersStore: UserEntity[];
  private permissionsStore: DeviceMemberPermission[];
  private onPersist?: () => void;

  constructor(
    usersStore: UserEntity[] = [],
    permissionsStore: DeviceMemberPermission[] = [],
    onPersist?: () => void,
    client: PostgresClient = postgresClient
  ) {
    this.usersStore = usersStore;
    this.permissionsStore = permissionsStore;
    this.onPersist = onPersist;
    this.client = client;
  }

  public getAll(): UserEntity[] {
    return this.usersStore;
  }

  public async getStaff(): Promise<UserEntity[]> {
    try {
      const res = await this.client.query(
        "SELECT * FROM users WHERE role IN ('ADMIN', 'CSKH') ORDER BY registered_at DESC"
      );
      if (res.rows.length > 0) {
        return res.rows.map(r => this.mapRowToEntity(r));
      }
    } catch (e: any) {
      console.warn('[UsersRepository] getStaff DB query failed, fallback:', e.message);
    }
    return this.usersStore.filter(u => u.role === 'ADMIN' || u.role === 'CSKH');
  }

  public async getCustomers(): Promise<UserEntity[]> {
    try {
      const res = await this.client.query(
        "SELECT * FROM users WHERE role = 'CUSTOMER' ORDER BY registered_at DESC"
      );
      if (res.rows.length > 0) {
        return res.rows.map(r => this.mapRowToEntity(r));
      }
    } catch (e: any) {
      console.warn('[UsersRepository] getCustomers DB query failed, fallback:', e.message);
    }
    return this.usersStore.filter(u => u.role === 'CUSTOMER');
  }

  public findById(id: string): UserEntity | undefined {
    return this.usersStore.find(u => u.id === id || u.empID === id);
  }

  public findByEmailOrPhone(email?: string, phone?: string): UserEntity | undefined {
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanPhone = (phone || '').replace(/[\s.-]/g, '');
    return this.usersStore.find(u =>
      (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) ||
      (cleanPhone && u.phoneNumber && u.phoneNumber.replace(/[\s.-]/g, '') === cleanPhone)
    );
  }

  public async add(user: UserEntity): Promise<void> {
    try {
      await this.client.query(
        `INSERT INTO users (id, emp_id, full_name, email, phone_number, company, department, role, role_title, password, address, province, is_active, registered_at, updated_at, updated_by, devices)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         ON CONFLICT (id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           email = EXCLUDED.email,
           phone_number = EXCLUDED.phone_number,
           company = EXCLUDED.company,
           department = EXCLUDED.department,
           role = EXCLUDED.role,
           role_title = EXCLUDED.role_title,
           password = EXCLUDED.password,
           address = EXCLUDED.address,
           province = EXCLUDED.province,
           is_active = EXCLUDED.is_active,
           updated_at = EXCLUDED.updated_at,
           updated_by = EXCLUDED.updated_by`,
        [
          user.id,
          user.empID || null,
          user.fullName,
          user.email,
          user.phoneNumber || null,
          user.company || null,
          user.department || null,
          user.role,
          user.roleTitle || null,
          user.password || 'Austec123!@#',
          user.address || null,
          user.province || null,
          user.isActive,
          user.registeredAt,
          user.updatedAt || user.registeredAt,
          user.updatedBy || 'System',
          JSON.stringify(user.devices || []),
        ]
      );
    } catch (e: any) {
      console.warn('[UsersRepository] DB add user failed:', e.message);
    }

    const idx = this.usersStore.findIndex(u => u.id === user.id || (u.email && u.email === user.email));
    if (idx !== -1) {
      this.usersStore[idx] = user;
    } else {
      this.usersStore.unshift(user);
    }
    this.onPersist?.();
  }

  public async update(id: string, updates: Partial<UserEntity>): Promise<UserEntity | null> {
    const user = this.findById(id);
    if (!user) return null;
    Object.assign(user, updates);

    try {
      await this.client.query(
        `UPDATE users SET
           full_name = COALESCE($1, full_name),
           phone_number = COALESCE($2, phone_number),
           company = COALESCE($3, company),
           department = COALESCE($4, department),
           role = COALESCE($5, role),
           role_title = COALESCE($6, role_title),
           address = COALESCE($7, address),
           province = COALESCE($8, province),
           is_active = COALESCE($9, is_active),
           updated_at = NOW()
         WHERE id = $10`,
        [
          updates.fullName,
          updates.phoneNumber,
          updates.company,
          updates.department,
          updates.role,
          updates.roleTitle,
          updates.address,
          updates.province,
          updates.isActive,
          id,
        ]
      );
    } catch (e: any) {
      console.warn('[UsersRepository] DB update user failed:', e.message);
    }

    this.onPersist?.();
    return user;
  }

  public async remove(id: string): Promise<boolean> {
    try {
      await this.client.query('DELETE FROM users WHERE id = $1', [id]);
    } catch (e: any) {
      console.warn('[UsersRepository] DB delete user failed:', e.message);
    }

    const idx = this.usersStore.findIndex(u => u.id === id || u.empID === id);
    if (idx === -1) return false;
    this.usersStore.splice(idx, 1);
    this.onPersist?.();
    return true;
  }

  public async getRoles(): Promise<SystemRoleEntity[]> {
    try {
      const roleRes = await this.client.query('SELECT * FROM system_roles ORDER BY id ASC');
      if (roleRes.rows.length > 0) {
        const roles: SystemRoleEntity[] = [];
        for (const r of roleRes.rows) {
          const permRes = await this.client.query(
            'SELECT * FROM role_permissions WHERE role_id = $1 ORDER BY id ASC',
            [r.id]
          );
          roles.push({
            id: r.id,
            roleCode: r.role_code,
            roleName: r.role_name,
            description: r.description,
            isSystem: r.is_system,
            permissions: permRes.rows.map(p => ({
              id: p.id,
              roleId: p.role_id,
              moduleId: p.module_id,
              moduleName: p.module_name,
              canView: p.can_view,
              canCreate: p.can_create,
              canUpdate: p.can_update,
              canDelete: p.can_delete,
              canAll: p.can_all,
            })),
          });
        }
        return roles;
      }
    } catch (e: any) {
      console.warn('[UsersRepository] getRoles DB failed:', e.message);
    }
    return [];
  }

  public async updateRolePermissions(roleId: number, permissions: any[]): Promise<void> {
    try {
      await this.client.transaction(async client => {
        await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
        for (const p of permissions) {
          await client.query(
            `INSERT INTO role_permissions (role_id, module_id, module_name, can_view, can_create, can_update, can_delete, can_all)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [roleId, p.id || p.moduleId, p.name || p.moduleName, p.view, p.create, p.update, p.delete, p.all]
          );
        }
      });
    } catch (e: any) {
      console.warn('[UsersRepository] updateRolePermissions error:', e.message);
    }
  }

  public addPermission(permission: DeviceMemberPermission): void {
    this.permissionsStore.push(permission);
    this.onPersist?.();
  }

  public removePermission(id: string): boolean {
    const idx = this.permissionsStore.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.permissionsStore.splice(idx, 1);
    this.onPersist?.();
    return true;
  }

  public getPermissions(hardwareId?: string): DeviceMemberPermission[] {
    if (hardwareId) {
      return this.permissionsStore.filter(p => p.hardwareId === hardwareId);
    }
    return this.permissionsStore;
  }

  private mapRowToEntity(r: any): UserEntity {
    return {
      id: r.id,
      empID: r.emp_id || undefined,
      fullName: r.full_name,
      email: r.email,
      phoneNumber: r.phone_number || undefined,
      role: r.role,
      roleTitle: r.role_title || undefined,
      company: r.company || undefined,
      department: r.department || undefined,
      password: r.password,
      address: r.address || undefined,
      province: r.province || undefined,
      isActive: r.is_active ?? true,
      registeredAt: r.registered_at || new Date().toISOString(),
      updatedAt: r.updated_at || undefined,
      updatedBy: r.updated_by || undefined,
      devices: typeof r.devices === 'string' ? JSON.parse(r.devices) : (r.devices || []),
    };
  }
}
