import { apiClient } from "@/services/api-client";
import { AdminUser } from "./types";

export const adminService = {
  async getStaff(): Promise<AdminUser[]> {
    const res = await apiClient.get<{ staff: AdminUser[] }>("/api/admin/staff");
    if (res.success && Array.isArray(res.staff)) {
      return res.staff;
    }
    return [];
  },

  async createStaff(staff: Partial<AdminUser>): Promise<{ success: boolean; staff?: AdminUser; error?: string }> {
    const res = await apiClient.post<{ staff?: AdminUser; message?: string }>("/api/admin/staff", staff);
    return {
      success: !!res.success,
      staff: res.staff,
      error: res.error,
    };
  },

  async updateStaff(id: string | number, staff: Partial<AdminUser>): Promise<{ success: boolean; staff?: AdminUser; error?: string }> {
    const res = await apiClient.put<{ staff?: AdminUser; message?: string }>(`/api/admin/staff/${id}`, staff);
    return {
      success: !!res.success,
      staff: res.staff,
      error: res.error,
    };
  },

  async deleteStaff(id: string | number): Promise<{ success: boolean; error?: string }> {
    const res = await apiClient.delete<{ message?: string }>(`/api/admin/staff/${id}`);
    return {
      success: !!res.success,
      error: res.error,
    };
  },
};
