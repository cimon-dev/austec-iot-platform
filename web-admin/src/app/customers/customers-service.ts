import { apiClient } from "@/services/api-client";
import { CustomerAccount } from "./types";

export const customersService = {
  async getCustomers(): Promise<CustomerAccount[]> {
    const res = await apiClient.get<{ customers: CustomerAccount[] }>("/api/admin/customers");
    if (res.success && Array.isArray(res.customers)) {
      return res.customers;
    }
    return [];
  },

  async createCustomer(customerData: Partial<CustomerAccount>): Promise<{ success: boolean; customer?: CustomerAccount; error?: string }> {
    const res = await apiClient.post<{ customer?: CustomerAccount; message?: string }>("/api/admin/customers", customerData);
    return {
      success: !!res.success,
      customer: res.customer,
      error: res.error,
    };
  },

  async updateCustomer(id: string, customerData: Partial<CustomerAccount>): Promise<{ success: boolean; customer?: CustomerAccount; error?: string }> {
    const res = await apiClient.put<{ customer?: CustomerAccount; message?: string }>(`/api/admin/customers/${id}`, customerData);
    return {
      success: !!res.success,
      customer: res.customer,
      error: res.error,
    };
  },

  async toggleCustomerStatus(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    const res = await apiClient.put<{ message?: string }>(`/api/admin/customers/${id}/status`, { isActive });
    return {
      success: !!res.success,
      error: res.error,
    };
  },

  async updateMemberPermission(hwId: string, memberId: string, permissions: Record<string, any>): Promise<{ success: boolean; error?: string }> {
    const res = await apiClient.put<{ message?: string }>(`/api/devices/${hwId}/members/${memberId}`, permissions);
    return {
      success: !!res.success,
      error: res.error,
    };
  },

  async revokeMember(hwId: string, memberId: string): Promise<{ success: boolean; error?: string }> {
    const res = await apiClient.delete<{ message?: string }>(`/api/devices/${hwId}/members/${memberId}`);
    return {
      success: !!res.success,
      error: res.error,
    };
  },

  async addMember(hwId: string, memberData: Record<string, any>): Promise<{ success: boolean; member?: any; error?: string }> {
    const res = await apiClient.post<{ member?: any; message?: string }>(`/api/devices/${hwId}/members`, memberData);
    return {
      success: !!res.success,
      member: res.member,
      error: res.error,
    };
  },
};
