import { apiClient } from "@/services/api-client";
import { BlackboxLogEntry, BlackboxFilterParams } from "./types";

export const blackboxService = {
  async getLogs(params: BlackboxFilterParams = {}): Promise<{ total: number; logs: BlackboxLogEntry[] }> {
    const res = await apiClient.get<{ total: number; logs: BlackboxLogEntry[] }>("/api/blackbox/logs", params);
    if (res.success && res.logs) {
      return { total: res.total || res.logs.length, logs: res.logs };
    }
    return { total: 0, logs: [] };
  },
};
