import { apiClient } from "@/services/api-client";
import { RoleItem } from "./types";

export const rolesService = {
  async getRoles(): Promise<RoleItem[]> {
    const res = await apiClient.get<{ roles: RoleItem[] }>("/api/admin/roles");
    if (res.success && Array.isArray(res.roles)) {
      return res.roles;
    }
    return [];
  },

  async saveRoles(roles: RoleItem[]): Promise<{ success: boolean; error?: string }> {
    const res = await apiClient.put<{ message?: string }>("/api/admin/roles", { roles });
    return {
      success: !!res.success,
      error: res.error,
    };
  },

  async updateRole(id: number, data: { name: string; description?: string }): Promise<{ success: boolean; role?: any; error?: string }> {
    const res = await apiClient.put<{ role?: any; message?: string }>(`/api/admin/roles/${id}`, data);
    return {
      success: !!res.success,
      role: res.role,
      error: res.error,
    };
  },

  async deleteRole(id: number): Promise<{ success: boolean; error?: string }> {
    const res = await apiClient.delete<{ message?: string }>(`/api/admin/roles/${id}`);
    return {
      success: !!res.success,
      error: res.error,
    };
  },
};
