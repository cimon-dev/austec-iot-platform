import { apiClient } from "@/services/api-client";
import { AdminUser } from "./types";

export interface PendingStaffCandidate {
  id: string;
  name: string;
  fullName: string;
  email: string;
  phone: string;
  phoneNumber: string;
  company: string;
  department: string;
  role: string;
  systemRole: string;
  authProvider?: string;
  googleLinked?: boolean;
  avatarUrl?: string;
  approvalStatus: "PENDING";
  registeredAt: string;
}

export const adminService = {
  async getStaff(): Promise<AdminUser[]> {
    const res = await apiClient.get<{ staff: AdminUser[] }>("/api/admin/staff");
    if (res.success && Array.isArray(res.staff)) {
      return res.staff;
    }
    return [];
  },

  async getPendingStaff(): Promise<PendingStaffCandidate[]> {
    const res = await apiClient.get<{ pending: PendingStaffCandidate[] }>(
      "/api/admin/staff/pending"
    );
    if (res.success && Array.isArray(res.pending)) {
      return res.pending;
    }
    return [];
  },

  async approvePendingStaff(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await apiClient.post(`/api/admin/staff/${id}/approve`);
    return {
      success: !!res.success,
      message: res.message,
      error: res.error,
    };
  },

  async rejectPendingStaff(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await apiClient.post(`/api/admin/staff/${id}/reject`);
    return {
      success: !!res.success,
      message: res.message,
      error: res.error,
    };
  },

  async createStaff(
    staff: Partial<AdminUser>,
    stepUpToken?: string
  ): Promise<{ success: boolean; staff?: AdminUser; error?: string; requireStepUp?: boolean }> {
    const res = await apiClient.post<{ staff?: AdminUser; message?: string }>(
      "/api/admin/staff",
      staff,
      { stepUpToken }
    );
    return {
      success: !!res.success,
      staff: res.staff,
      error: res.error,
      requireStepUp: res.requireStepUp,
    };
  },

  async updateStaff(
    id: string | number,
    staff: Partial<AdminUser>,
    stepUpToken?: string
  ): Promise<{ success: boolean; staff?: AdminUser; error?: string; requireStepUp?: boolean }> {
    const res = await apiClient.put<{ staff?: AdminUser; message?: string }>(
      `/api/admin/staff/${id}`,
      staff,
      { stepUpToken }
    );
    return {
      success: !!res.success,
      staff: res.staff,
      error: res.error,
      requireStepUp: res.requireStepUp,
    };
  },

  async deleteStaff(
    id: string | number,
    stepUpToken?: string
  ): Promise<{ success: boolean; error?: string; requireStepUp?: boolean }> {
    const res = await apiClient.delete<{ message?: string }>(`/api/admin/staff/${id}`, {
      stepUpToken,
    });
    return {
      success: !!res.success,
      error: res.error,
      requireStepUp: res.requireStepUp,
    };
  },
};
