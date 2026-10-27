export interface ModulePermission {
  id: string;
  name: string;
  all: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  view: boolean;
}

export interface RoleItem {
  id: number;
  name: string;
  userCount: number;
  isSystem: boolean;
  permissions: ModulePermission[];
}
