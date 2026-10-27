import { apiClient } from "@/services/api-client";
import { Ticket, SupportRequestTicket } from "./types";

export const cskhService = {
  async getTickets(): Promise<Ticket[]> {
    const res = await apiClient.get<{ tickets: Ticket[] }>("/api/cskh/tickets");
    if (res.success && Array.isArray(res.tickets)) {
      return res.tickets;
    }
    return [];
  },

  async sendMessage(ticketId: string, message: { text: string; sender: string; senderRole?: string; attachmentUrls?: string[] }): Promise<{ success: boolean; message?: any; error?: string }> {
    const res = await apiClient.post<{ message?: any }>(`/api/cskh/tickets/${ticketId}/message`, message);
    return {
      success: !!res.success,
      message: res.message,
      error: res.error,
    };
  },

  async updateTicketStatus(ticketId: string, status: string): Promise<{ success: boolean; error?: string }> {
    const res = await apiClient.put<{ message?: string }>(`/api/cskh/tickets/${ticketId}/status`, { status });
    return {
      success: !!res.success,
      error: res.error,
    };
  },

  async getSupportRequests(): Promise<SupportRequestTicket[]> {
    const res = await apiClient.get<{ requests: SupportRequestTicket[] }>("/api/cskh/requests");
    if (res.success && Array.isArray(res.requests)) {
      return res.requests;
    }
    return [];
  },

  async respondToRequest(requestId: string, adminResponse: string, status: string): Promise<{ success: boolean; error?: string }> {
    const res = await apiClient.put<{ message?: string }>(`/api/cskh/requests/${requestId}/response`, {
      adminResponse,
      status,
    });
    return {
      success: !!res.success,
      error: res.error,
    };
  },

  async rebootDevice(hardwareId: string): Promise<{ success: boolean; error?: string }> {
    const res = await apiClient.post<{ message?: string }>(`/api/devices/${hardwareId}/reboot`, {});
    return {
      success: !!res.success,
      error: res.error,
    };
  },
};
