import { getApiBaseUrl } from "@/context/apiConfig";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  requireStepUp?: boolean;
  stepUpPurpose?: string;
  data?: T;
  [key: string]: any;
}

export interface ApiRequestOptions {
  stepUpToken?: string;
  headers?: Record<string, string>;
}

export function getStoredAuthToken(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("austec_auth_token") || "";
  }
  return "";
}

export function getAuthHeaderRecord(stepUpToken?: string): Record<string, string> {
  const token = getStoredAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (stepUpToken) {
    headers["X-StepUp-Token"] = stepUpToken;
  }
  return headers;
}

class ApiClient {
  private async request<T = any>(
    path: string,
    options: RequestInit = {},
    extra?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    const baseUrl = getApiBaseUrl();
    const url = path.startsWith("http")
      ? path
      : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...getAuthHeaderRecord(extra?.stepUpToken),
      ...(options.headers as Record<string, string>),
      ...(extra?.headers || {}),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401 && typeof window !== "undefined") {
        const p = window.location.pathname;
        if (p.startsWith("/admin")) {
          const isAuthPath = p === "/admin/login" || p === "/admin/register";
          if (!isAuthPath && !path.includes("/api/auth/")) {
            localStorage.removeItem("austec_auth_user");
            localStorage.removeItem("austec_auth_token");
            window.location.replace("/admin/login");
          }
        }
      }

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

  public async get<T = any>(
    path: string,
    params?: Record<string, any>,
    extra?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
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
    return this.request<T>(fullPath, { method: "GET" }, extra);
  }

  public async post<T = any>(
    path: string,
    body?: any,
    extra?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      path,
      {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      },
      extra
    );
  }

  public async put<T = any>(
    path: string,
    body?: any,
    extra?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      path,
      {
        method: "PUT",
        body: body ? JSON.stringify(body) : undefined,
      },
      extra
    );
  }

  public async delete<T = any>(
    path: string,
    extra?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "DELETE" }, extra);
  }
}

export const apiClient = new ApiClient();
