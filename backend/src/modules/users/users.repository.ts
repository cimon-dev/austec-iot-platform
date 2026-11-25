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
        "SELECT * FROM public.users WHERE role IN ('ADMIN', 'CSKH') ORDER BY registered_at DESC"
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
        "SELECT * FROM public.users WHERE role = 'CUSTOMER' ORDER BY registered_at DESC"
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

  public async findByIdAsync(id: string): Promise<UserEntity | null> {
    try {
      const res = await this.client.query('SELECT * FROM public.users WHERE id = $1 OR emp_id = $1 LIMIT 1', [id]);
      if (res.rows.length > 0) {
        const entity = this.mapRowToEntity(res.rows[0]);
        const idx = this.usersStore.findIndex(u => u.id === entity.id);
        if (idx >= 0) {
          this.usersStore[idx] = entity;
        } else {
          this.usersStore.push(entity);
        }
        return entity;
      }
    } catch (e: any) {
      console.warn('[UsersRepository] findByIdAsync DB error:', e.message);
    }
    return this.usersStore.find(u => u.id === id || u.empID === id) || null;
  }

  public findByEmailOrPhone(email?: string, phone?: string): UserEntity | undefined {
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanPhone = (phone || '').replace(/[\s.-]/g, '');
    return this.usersStore.find(u =>
      (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) ||
      (cleanPhone && u.phoneNumber && u.phoneNumber.replace(/[\s.-]/g, '') === cleanPhone)
    );
  }

  public async findByEmailOrPhoneAsync(email?: string, phone?: string): Promise<UserEntity | null> {
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanPhone = (phone || '').replace(/[\s.-]/g, '');

    try {
      const res = await this.client.query(
        `SELECT * FROM public.users 
         WHERE (LOWER(email) = $1 AND $1 != '') 
            OR (REPLACE(REPLACE(phone_number, ' ', ''), '-', '') = $2 AND $2 != '') 
         LIMIT 1`,
        [cleanEmail, cleanPhone]
      );
      if (res.rows.length > 0) {
        const entity = this.mapRowToEntity(res.rows[0]);
        const idx = this.usersStore.findIndex(u => u.id === entity.id);
        if (idx >= 0) {
          this.usersStore[idx] = entity;
        } else {
          this.usersStore.push(entity);
        }
        return entity;
      }
    } catch (e: any) {
      console.warn('[UsersRepository] findByEmailOrPhoneAsync error:', e.message);
    }
    return this.findByEmailOrPhone(email, phone) || null;
  }

  public async findUserForAuthAsync(identifier: string, cleanPhone: string): Promise<UserEntity | null> {
    const cleanId = (identifier || '').toLowerCase().trim();
    const phone = (cleanPhone || '').replace(/[\s.-]/g, '');

    try {
      const res = await this.client.query(
        `SELECT * FROM public.users 
         WHERE (LOWER(email) = $1 AND $1 != '') 
            OR (REPLACE(REPLACE(phone_number, ' ', ''), '-', '') = $2 AND $2 != '')
            OR (LOWER(id) = $1 AND $1 != '')
            OR (LOWER(emp_id) = $1 AND $1 != '')
         LIMIT 1`,
        [cleanId, phone]
      );
      if (res.rows.length > 0) {
        const entity = this.mapRowToEntity(res.rows[0]);
        const idx = this.usersStore.findIndex(u => u.id === entity.id);
        if (idx >= 0) {
          this.usersStore[idx] = entity;
        } else {
          this.usersStore.push(entity);
        }
        return entity;
      }
    } catch (e: any) {
      console.warn('[UsersRepository] findUserForAuthAsync DB error:', e.message);
    }

    return this.usersStore.find(u =>
      (cleanId && u.email && u.email.toLowerCase() === cleanId) ||
      (phone && u.phoneNumber && u.phoneNumber.replace(/[\s.-]/g, '') === phone) ||
      (cleanId && u.empID && u.empID.toLowerCase() === cleanId) ||
      (cleanId && u.id && u.id.toLowerCase() === cleanId)
    ) || null;
  }

  public async add(user: UserEntity): Promise<void> {
    try {
      await this.client.query(
        `INSERT INTO public.users (id, emp_id, full_name, email, phone_number, company, department, role, role_title, password, address, province, avatar_url, is_active, registered_at, updated_at, updated_by, devices)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
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
           avatar_url = EXCLUDED.avatar_url,
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
          user.avatarUrl || null,
          user.isActive,
          user.registeredAt,
          user.updatedAt || user.registeredAt,
          user.updatedBy || 'System',
          JSON.stringify(user.devices || []),
        ]
      );
    } catch (e: any) {
      console.error('[UsersRepository] DB add user failed:', e.message);
      throw e;
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
    let user = this.findById(id);
    if (!user) {
      user = (await this.findByIdAsync(id)) || undefined;
    }
    if (user) {
      Object.assign(user, updates);
    }

    try {
      await this.client.query(
        `UPDATE public.users SET
           full_name = COALESCE($1, full_name),
           email = COALESCE($2, email),
           phone_number = COALESCE($3, phone_number),
           company = COALESCE($4, company),
           department = COALESCE($5, department),
           role = COALESCE($6, role),
           role_title = COALESCE($7, role_title),
           address = COALESCE($8, address),
           province = COALESCE($9, province),
           avatar_url = COALESCE($10, avatar_url),
           is_active = COALESCE($11, is_active),
           updated_at = NOW()
         WHERE id = $12 OR emp_id = $12`,
        [
          updates.fullName ?? null,
          updates.email ? updates.email.trim().toLowerCase() : null,
          updates.phoneNumber ?? null,
          updates.company ?? null,
          updates.department ?? null,
          updates.role ?? null,
          updates.roleTitle ?? null,
          updates.address ?? null,
          updates.province ?? null,
          updates.avatarUrl ?? null,
          updates.isActive ?? null,
          id,
        ]
      );
    } catch (e: any) {
      console.error('[UsersRepository] DB update user failed:', e.message);
      throw e;
    }

    this.onPersist?.();
    return user || null;
  }

  public async changePassword(userId: string, currentPass: string, newPass: string): Promise<boolean> {
    const res = await this.client.query('SELECT password FROM public.users WHERE id = $1 LIMIT 1', [userId]);
    if (res.rows.length === 0) {
      throw new Error('Không tìm thấy tài khoản người dùng');
    }
    const currentDbPass = res.rows[0].password || 'Austec123!@#';
    if (currentDbPass !== currentPass) {
      throw new Error('Mật khẩu hiện tại không chính xác!');
    }
    await this.client.query('UPDATE public.users SET password = $1, updated_at = NOW() WHERE id = $2', [newPass, userId]);
    const memUser = this.usersStore.find(u => u.id === userId);
    if (memUser) {
      memUser.password = newPass;
    }
    this.onPersist?.();
    return true;
  }

  public async updateProfile(userId: string, data: { fullName?: string; phoneNumber?: string; address?: string; province?: string; avatarUrl?: string }): Promise<UserEntity | null> {
    let user = this.findById(userId);
    if (!user) {
      user = (await this.findByIdAsync(userId)) || undefined;
    }
    if (user) {
      if (data.fullName !== undefined) user.fullName = data.fullName;
      if (data.phoneNumber !== undefined) user.phoneNumber = data.phoneNumber;
      if (data.address !== undefined) user.address = data.address;
      if (data.province !== undefined) user.province = data.province;
      if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;
    }

    await this.client.query(
      `UPDATE public.users SET
         full_name = COALESCE($1, full_name),
         phone_number = COALESCE($2, phone_number),
         address = COALESCE($3, address),
         province = COALESCE($4, province),
         avatar_url = COALESCE($5, avatar_url),
         updated_at = NOW()
       WHERE id = $6 OR emp_id = $6`,
      [
        data.fullName ?? null,
        data.phoneNumber ?? null,
        data.address ?? null,
        data.province ?? null,
        data.avatarUrl ?? null,
        userId,
      ]
    );

    this.onPersist?.();
    return user || (await this.findByIdAsync(userId));
  }

  public async deleteOwnAccount(
    userId: string,
    password: string
  ): Promise<{ deletedUserId: string; email: string }> {
    const userRes = await this.client.query(
      'SELECT id, email, phone_number, role, password, is_active FROM public.users WHERE id = $1 LIMIT 1',
      [userId]
    );
    if (userRes.rows.length === 0) {
      throw new Error('Không tìm thấy tài khoản người dùng');
    }

    const row = userRes.rows[0];
    const currentDbPass = row.password || '';
    if (!password || currentDbPass !== password) {
      throw new Error('Mật khẩu xác nhận không chính xác!');
    }

    if (row.role === 'ADMIN') {
      const adminCountRes = await this.client.query(
        "SELECT COUNT(*)::int AS cnt FROM public.users WHERE role = 'ADMIN' AND is_active = true AND id != $1",
        [userId]
      );
      if ((adminCountRes.rows[0]?.cnt ?? 0) === 0) {
        throw new Error('Không thể xóa tài khoản Quản trị viên duy nhất đang hoạt động của hệ thống.');
      }
    }

    const userEmail = (row.email || '').trim().toLowerCase();
    const userPhone = (row.phone_number || '').trim();
    const cleanPhone = userPhone.replace(/[\s.-]/g, '');

    const ownedRes = await this.client.query(
      `SELECT hardware_id, custom_name, device_type
       FROM public.device_instances
       WHERE owner_id = $1
          OR (LOWER(owner_id) = $2 AND $2 != '')
          OR (owner_phone = $3 AND $3 != '')
          OR (REPLACE(REPLACE(owner_phone, ' ', ''), '.', '') = $4 AND $4 != '')`,
      [userId, userEmail, userPhone, cleanPhone]
    );

    if (ownedRes.rows.length > 0) {
      const names = ownedRes.rows
        .slice(0, 3)
        .map((d: any) => d.custom_name || d.hardware_id)
        .join(', ');
      const suffix = ownedRes.rows.length > 3 ? ` và ${ownedRes.rows.length - 3} thiết bị khác` : '';
      throw new Error(
        `Tài khoản vẫn đang là Chủ sở hữu của ${ownedRes.rows.length} thiết bị (${names}${suffix}). Vui lòng chuyển giao quyền sở hữu hoặc hủy ghép nối toàn bộ thiết bị trước khi xóa tài khoản vĩnh viễn.`
      );
    }

    await this.client.transaction(async client => {
      await client.query(
        `DELETE FROM public.device_permissions
         WHERE user_id = $1
            OR (phone_number = $2 AND $2 != '')
            OR (REPLACE(REPLACE(phone_number, ' ', ''), '.', '') = $3 AND $3 != '')`,
        [userId, userPhone, cleanPhone]
      );
      await client.query(
        'DELETE FROM public.device_ownership_transfers WHERE from_user_id = $1',
        [userId]
      );
      await client.query('DELETE FROM public.chat_messages WHERE sender_id = $1', [userId]);
      await client.query('DELETE FROM public.chat_participants WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM public.users WHERE id = $1', [userId]);
    });

    const userIdx = this.usersStore.findIndex(u => u.id === userId);
    if (userIdx !== -1) {
      this.usersStore.splice(userIdx, 1);
    }
    for (let i = this.permissionsStore.length - 1; i >= 0; i--) {
      const p = this.permissionsStore[i];
      if (
        p.userId === userId ||
        (cleanPhone && p.phoneNumber && p.phoneNumber.replace(/[\s.-]/g, '') === cleanPhone)
      ) {
        this.permissionsStore.splice(i, 1);
      }
    }
    this.onPersist?.();

    return { deletedUserId: userId, email: row.email };
  }

  public async remove(id: string): Promise<boolean> {
    try {
      await this.client.query('DELETE FROM public.users WHERE id = $1', [id]);
    } catch (e: any) {
      console.error('[UsersRepository] DB delete user failed:', e.message);
      throw e;
    }

    const idx = this.usersStore.findIndex(u => u.id === id || u.empID === id);
    if (idx === -1) return false;
    this.usersStore.splice(idx, 1);
    this.onPersist?.();
    return true;
  }

  public async getRoles(): Promise<any[]> {
    try {
      const roleRes = await this.client.query('SELECT * FROM system_roles ORDER BY id ASC');
      if (roleRes.rows.length > 0) {
        // Query user counts grouped by role
        const countRes = await this.client.query(
          "SELECT role, COUNT(*)::int as count FROM public.users GROUP BY role"
        );
        const countMap: Record<string, number> = {};
        for (const row of countRes.rows) {
          countMap[row.role] = row.count;
        }

        const roles: any[] = [];
        for (const r of roleRes.rows) {
          const permRes = await this.client.query(
            'SELECT * FROM role_permissions WHERE role_id = $1 ORDER BY id ASC',
            [r.id]
          );
          roles.push({
            id: r.id,
            name: r.role_name,
            roleName: r.role_name,
            roleCode: r.role_code,
            description: r.description,
            isSystem: Boolean(r.is_system),
            userCount: countMap[r.role_code] || (r.role_code === 'ROLE_ADMIN' ? countMap['ADMIN'] || 0 : 0),
            permissions: permRes.rows.map(p => ({
              id: p.module_id,
              name: p.module_name,
              view: Boolean(p.can_view),
              create: Boolean(p.can_create),
              update: Boolean(p.can_update),
              delete: Boolean(p.can_delete),
              all: Boolean(p.can_all),
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
          const modId = p.id || p.moduleId;
          const modName = p.name || p.moduleName || modId;
          const v = Boolean(p.view ?? p.canView);
          const c = Boolean(p.create ?? p.canCreate);
          const u = Boolean(p.update ?? p.canUpdate);
          const d = Boolean(p.delete ?? p.canDelete);
          const a = Boolean(p.all ?? p.canAll);
          await client.query(
            `INSERT INTO role_permissions (role_id, module_id, module_name, can_view, can_create, can_update, can_delete, can_all)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [roleId, modId, modName, v, c, u, d, a]
          );
        }
      });
    } catch (e: any) {
      console.warn('[UsersRepository] updateRolePermissions error:', e.message);
      throw e;
    }
  }

  public async saveRoles(roles: any[]): Promise<void> {
    for (const r of roles) {
      if (r.id && Number(r.id) < 1000000000) {
        await this.client.query('UPDATE system_roles SET role_name = $1 WHERE id = $2', [r.name || r.roleName, r.id]);
        if (Array.isArray(r.permissions)) {
          await this.updateRolePermissions(Number(r.id), r.permissions);
        }
      } else {
        const code = (r.roleCode || `ROLE_${(r.name || 'NEW').toUpperCase().replace(/[^A-Z0-9]/g, '_')}`).slice(0, 50);
        const res = await this.client.query(
          `INSERT INTO system_roles (role_code, role_name, description, is_system, created_at)
           VALUES ($1, $2, $3, false, $4) RETURNING id`,
          [code, r.name || 'Vai trò mới', r.description || '', new Date().toISOString()]
        );
        const newRoleId = res.rows[0].id;
        if (Array.isArray(r.permissions)) {
          await this.updateRolePermissions(newRoleId, r.permissions);
        }
      }
    }
  }

  public async updateRole(roleId: number, data: { name: string; description?: string }): Promise<any> {
    try {
      const res = await this.client.query(
        `UPDATE system_roles SET
           role_name = COALESCE($1, role_name),
           description = COALESCE($2, description)
         WHERE id = $3
         RETURNING *`,
        [data.name, data.description || null, roleId]
      );
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          id: r.id,
          name: r.role_name,
          roleCode: r.role_code,
          description: r.description,
          isSystem: r.is_system,
        };
      }
    } catch (e: any) {
      console.warn('[UsersRepository] updateRole error:', e.message);
      throw e;
    }
    return { id: roleId, name: data.name };
  }

  public async deleteRole(roleId: number): Promise<boolean> {
    await this.client.transaction(async client => {
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
      await client.query('DELETE FROM system_roles WHERE id = $1 AND is_system = false', [roleId]);
    });
    return true;
  }

  public async addPermission(permission: DeviceMemberPermission): Promise<void> {
    try {
      await this.client.query(
        `INSERT INTO public.device_permissions (id, hardware_id, user_id, member_name, phone_number, role, can_control, can_view_history, can_child_lock, can_config, schedule_limit_active, access_start_time, access_end_time, access_days, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO UPDATE SET
           role = EXCLUDED.role,
           can_control = EXCLUDED.can_control,
           can_view_history = EXCLUDED.can_view_history,
           can_child_lock = EXCLUDED.can_child_lock,
           can_config = EXCLUDED.can_config`,
        [
          permission.id,
          permission.hardwareId,
          permission.userId,
          permission.memberName,
          permission.phoneNumber || null,
          permission.role,
          permission.canControl ?? true,
          permission.canViewHistory ?? true,
          permission.canChildLock ?? true,
          permission.canConfig ?? true,
          permission.scheduleLimitActive ?? false,
          permission.accessStartTime || '00:00',
          permission.accessEndTime || '23:59',
          JSON.stringify(permission.accessDays || [true, true, true, true, true, true, true]),
          permission.createdAt || new Date().toISOString(),
        ]
      );
    } catch (e: any) {
      console.warn('[UsersRepository] DB addPermission failed:', e.message);
    }
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
      avatarUrl: r.avatar_url || undefined,
      isActive: r.is_active ?? true,
      registeredAt: r.registered_at || new Date().toISOString(),
      updatedAt: r.updated_at || undefined,
      updatedBy: r.updated_by || undefined,
      devices: typeof r.devices === 'string' ? JSON.parse(r.devices) : (r.devices || []),
    };
  }
}
