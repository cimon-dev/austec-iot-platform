export interface AdminUser {
  id: string | number;
  empID: string;
  name: string;
  fullName?: string;
  email: string;
  company: string;
  department: string;
  phone: string;
  phoneNumber?: string;
  role: string;
  systemRole?: string;
  isActive?: boolean;
  updatedBy: string;
  updatedAt: string;
}

export interface AdminUserFilterParams {
  empId?: string;
  email?: string;
  phone?: string;
  role?: string;
  company?: string;
}
