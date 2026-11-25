import { apiClient } from "@/services/api-client";
import { SystemSettings } from "./types";

export const settingsService = {
  async getSettings(): Promise<SystemSettings | null> {
    const res = await apiClient.get<{ settings: SystemSettings }>("/api/admin/settings");
    if (res.success && res.settings) {
      return res.settings;
    }
    return null;
  },

  async updateSettings(
    settings: Partial<SystemSettings>,
    stepUpToken?: string
  ): Promise<{ success: boolean; error?: string; requireStepUp?: boolean }> {
    const res = await apiClient.put<{ message?: string }>("/api/admin/settings", settings, {
      stepUpToken,
    });
    return {
      success: !!res.success,
      error: res.error,
      requireStepUp: res.requireStepUp,
    };
  },
};
