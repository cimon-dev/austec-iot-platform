export type UserRole = 'ADMIN' | 'CSKH' | 'CUSTOMER';

export interface UserEntity {
  id: string;
  empID?: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: UserRole;
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

export interface RolePermissionEntity {
  id: number;
  roleId: number;
  moduleId: string;
  moduleName: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canAll: boolean;
}

export interface SystemRoleEntity {
  id: number;
  roleCode: string;
  roleName: string;
  description?: string;
  isSystem: boolean;
  userCount?: number;
  permissions?: RolePermissionEntity[];
}
