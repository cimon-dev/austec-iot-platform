import { getApiBaseUrl } from "@/context/apiConfig";

export interface CustomerApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  requireStepUp?: boolean;
  stepUpPurpose?: string;
  data?: T;
  [key: string]: any;
}

export interface CustomerApiRequestOptions {
  stepUpToken?: string;
  headers?: Record<string, string>;
}

export const CUSTOMER_TOKEN_KEY = "austec_customer_token";
export const CUSTOMER_USER_KEY = "austec_customer_user";

export function getCustomerStoredToken(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem(CUSTOMER_TOKEN_KEY) || "";
  }
  return "";
}

export function getCustomerAuthHeaders(stepUpToken?: string): Record<string, string> {
  const token = getCustomerStoredToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (stepUpToken) {
    headers["X-StepUp-Token"] = stepUpToken;
  }
  return headers;
}

class CustomerApiClient {
  private async request<T = any>(
    path: string,
    options: RequestInit = {},
    extra?: CustomerApiRequestOptions
  ): Promise<CustomerApiResponse<T>> {
    const baseUrl = getApiBaseUrl();
    const url = path.startsWith("http")
      ? path
      : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

    const headers: Record<string, string> = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...getCustomerAuthHeaders(extra?.stepUpToken),
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
        const isCustomerAuthPage =
          p === "/login" || p === "/register" || p === "/forgot-password" || p.startsWith("/admin");
        if (!isCustomerAuthPage && !path.includes("/api/auth/")) {
          localStorage.removeItem(CUSTOMER_USER_KEY);
          localStorage.removeItem(CUSTOMER_TOKEN_KEY);
          window.location.replace("/login");
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
      return {
        success: false,
        error: error.message || "Không thể kết nối đến máy chủ",
      };
    }
  }

  public async get<T = any>(
    path: string,
    params?: Record<string, any>,
    extra?: CustomerApiRequestOptions
  ): Promise<CustomerApiResponse<T>> {
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
    extra?: CustomerApiRequestOptions
  ): Promise<CustomerApiResponse<T>> {
    return this.request<T>(
      path,
      {
        method: "POST",
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      extra
    );
  }

  public async put<T = any>(
    path: string,
    body?: any,
    extra?: CustomerApiRequestOptions
  ): Promise<CustomerApiResponse<T>> {
    return this.request<T>(
      path,
      {
        method: "PUT",
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      extra
    );
  }

  public async patch<T = any>(
    path: string,
    body?: any,
    extra?: CustomerApiRequestOptions
  ): Promise<CustomerApiResponse<T>> {
    return this.request<T>(
      path,
      {
        method: "PATCH",
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      extra
    );
  }

  public async delete<T = any>(
    path: string,
    extra?: CustomerApiRequestOptions
  ): Promise<CustomerApiResponse<T>> {
    return this.request<T>(path, { method: "DELETE" }, extra);
  }

  public async uploadFile(
    file: File,
    endpoint: string = "/api/upload/file"
  ): Promise<CustomerApiResponse<{ url: string; fileName?: string }>> {
    const formData = new FormData();
    formData.append("file", file);
    return this.request(endpoint, {
      method: "POST",
      body: formData,
    });
  }
}

export const customerApi = new CustomerApiClient();

