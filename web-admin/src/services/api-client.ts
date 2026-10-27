import { getApiBaseUrl } from "@/context/apiConfig";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  [key: string]: any;
}

class ApiClient {
  private getToken(): string {
    if (typeof window !== "undefined") {
      return localStorage.getItem("austec_auth_token") || "austec-admin-super-token";
    }
    return "austec-admin-super-token";
  }

  private async request<T = any>(
    path: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const baseUrl = getApiBaseUrl();
    const url = path.startsWith("http") ? path : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.getToken()}`,
      ...(options.headers as Record<string, string>),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const json = await response.json().catch(() => ({
        success: response.ok,
        error: `Lỗi kết nối máy chủ (HTTP ${response.status})`,
      }));

      if (!response.ok && !json.error) {
        json.error = `HTTP error ${response.status}`;
      }

      return json;
    } catch (error: any) {
      console.error(`[ApiClient Error] ${path}:`, error.message);
      return {
        success: false,
        error: error.message || "Không thể kết nối đến máy chủ",
      };
    }
  }

  public async get<T = any>(path: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let fullPath = path;
    if (params) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          query.append(k, String(v));
        }
      });
      const qs = query.toString();
      if (qs) {
        fullPath += (fullPath.includes("?") ? "&" : "?") + qs;
      }
    }
    return this.request<T>(fullPath, { method: "GET" });
  }

  public async post<T = any>(path: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async put<T = any>(path: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async delete<T = any>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
