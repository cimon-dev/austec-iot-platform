"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/context/apiConfig";
import { AvailableChannels, PublicAuthConfig } from "@/context/AuthContext";
import {
  CUSTOMER_TOKEN_KEY,
  CUSTOMER_USER_KEY,
  customerApi,
} from "../services/customer-api-client";

export interface CustomerUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: "CUSTOMER" | "ADMIN" | "CSKH";
  avatarUrl?: string;
  address?: string;
  province?: string;
  googleLinked?: boolean;
  hasPassword?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  sessionToken?: string;
}

export interface CustomerLoginResult {
  success: boolean;
  error?: string;
  message?: string;
  require2FA?: boolean;
  preAuthToken?: string;
  channels?: AvailableChannels;
}

export interface CustomerRegisterParams {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  address?: string;
  province?: string;
}

interface CustomerAuthContextType {
  user: CustomerUser | null;
  token: string;
  authConfig: PublicAuthConfig;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<CustomerLoginResult>;
  loginWithGoogle: (idToken: string) => Promise<CustomerLoginResult>;
  verify2FA: (preAuthToken: string, code: string, challengeId?: string) => Promise<{ success: boolean; error?: string }>;
  register: (params: CustomerRegisterParams) => Promise<{ success: boolean; message?: string; error?: string }>;
  registerWithGoogle: (idToken: string, phoneNumber?: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (payload: { fullName?: string; address?: string; province?: string; avatarUrl?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const DEFAULT_CONFIG: PublicAuthConfig = {
  googleWebClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
  googleAuthEnabled: Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
  emailOtpEnabled: true,
  emailSmtpConfigured: false,
  zaloOtpEnabled: false,
  devConsoleOtpMode: false,
};

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [token, setToken] = useState<string>("");
  const [authConfig, setAuthConfig] = useState<PublicAuthConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const saveSession = useCallback((jwt: string, rawUser: any) => {
    const u: CustomerUser = {
      id: rawUser.id,
      fullName: rawUser.fullName || rawUser.name || "Khách hàng Austec",
      email: rawUser.email || "",
      phoneNumber: rawUser.phoneNumber || rawUser.phone || "",
      role: rawUser.role || "CUSTOMER",
      avatarUrl: rawUser.avatarUrl,
      address: rawUser.address || "",
      province: rawUser.province || "Hà Nội",
      googleLinked: Boolean(rawUser.googleLinked),
      hasPassword: rawUser.hasPassword !== false,
      emailVerified: Boolean(rawUser.emailVerified),
      phoneVerified: Boolean(rawUser.phoneVerified),
      sessionToken: jwt,
    };
    setUser(u);
    setToken(jwt);
    try {
      localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(u));
      localStorage.setItem(CUSTOMER_TOKEN_KEY, jwt);
      localStorage.setItem("austec_last_customer_identifier", u.phoneNumber || u.email || "");
    } catch {
      // ignore storage errors
    }
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setToken("");
    try {
      localStorage.removeItem(CUSTOMER_USER_KEY);
      localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    } catch {
      // ignore
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const savedToken = typeof window !== "undefined" ? localStorage.getItem(CUSTOMER_TOKEN_KEY) : null;
    if (!savedToken) {
      clearSession();
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
        signal: controller.signal,
      });
      if (res.status === 401) {
        clearSession();
        return;
      }
      const data = await res.json();
      if (data.success && data.user) {
        saveSession(savedToken, data.user);
      }
    } catch {
      // giữ phiên offline nếu mất kết nối tạm thời
    } finally {
      clearTimeout(timer);
    }
  }, [clearSession, saveSession]);

  useEffect(() => {
    let active = true;

    // 1. Hydrate localStorage session immediately so navigation/reload NEVER hangs on loading screen
    let hasLocalSession = false;
    try {
      const savedUser = localStorage.getItem(CUSTOMER_USER_KEY);
      const savedToken = localStorage.getItem(CUSTOMER_TOKEN_KEY);
      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
        hasLocalSession = true;
      } else {
        const adminUserStr = localStorage.getItem("austec_auth_user");
        const adminTokenStr = localStorage.getItem("austec_auth_token");
        if (adminUserStr && adminTokenStr) {
          const parsedAdmin = JSON.parse(adminUserStr);
          saveSession(adminTokenStr, parsedAdmin);
          hasLocalSession = true;
        }
      }
    } catch {
      clearSession();
    } finally {
      setIsLoading(false);
    }

    // 2. Refresh public auth config & profile asynchronously in the background (with timeout)
    const syncInBackground = async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const cfgRes = await fetch(`${getApiBaseUrl()}/api/auth/public-config`, {
          signal: controller.signal,
        });
        if (active && cfgRes.ok) {
          const cfgData = await cfgRes.json();
          if (cfgData.success) {
            setAuthConfig({
              googleWebClientId:
                process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || cfgData.googleWebClientId || "",
              googleAuthEnabled:
                Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) || Boolean(cfgData.googleAuthEnabled),
              emailOtpEnabled: cfgData.emailOtpEnabled !== false,
              emailSmtpConfigured: Boolean(cfgData.emailSmtpConfigured),
              zaloOtpEnabled: Boolean(cfgData.zaloOtpEnabled),
              devConsoleOtpMode: Boolean(cfgData.devConsoleOtpMode),
            });
          }
        }
      } catch {
        // keep default config
      } finally {
        clearTimeout(timer);
      }

      if (active && hasLocalSession) {
        await refreshProfile();
      }
    };

    syncInBackground();
    return () => {
      active = false;
    };
  }, [clearSession, refreshProfile, saveSession]);

  const login = async (identifier: string, password: string): Promise<CustomerLoginResult> => {
    if (!identifier || !identifier.trim()) {
      return { success: false, error: "Vui lòng nhập Email hoặc Số điện thoại." };
    }
    if (!password || password.length < 6) {
      return { success: false, error: "Vui lòng nhập mật khẩu (tối thiểu 6 ký tự)." };
    }
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          portal: "mobile",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data?.error || "Đăng nhập thất bại." };
      }
      if (data.require2FA && data.preAuthToken) {
        return {
          success: true,
          require2FA: true,
          preAuthToken: data.preAuthToken,
          channels: data.channels,
          message: data.message,
        };
      }
      if (data.token && data.user) {
        saveSession(data.token, data.user);
        return { success: true };
      }
      return { success: false, error: "Phản hồi máy chủ không hợp lệ." };
    } catch (e: any) {
      return { success: false, error: `Lỗi kết nối máy chủ: ${e.message}` };
    }
  };

  const loginWithGoogle = async (idToken: string): Promise<CustomerLoginResult> => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, portal: "mobile", mode: "login" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data?.error || "Đăng nhập Google thất bại." };
      }
      if (data.require2FA && data.preAuthToken) {
        return {
          success: true,
          require2FA: true,
          preAuthToken: data.preAuthToken,
          channels: data.channels,
          message: data.message,
        };
      }
      if (data.token && data.user) {
        saveSession(data.token, data.user);
        return { success: true };
      }
      return { success: false, error: "Phản hồi xác thực Google không hợp lệ." };
    } catch (e: any) {
      return { success: false, error: `Lỗi kết nối Google: ${e.message}` };
    }
  };

  const verify2FA = async (preAuthToken: string, code: string, challengeId?: string) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/login/verify-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preAuthToken, code: code.trim(), challengeId }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.token && data.user) {
        saveSession(data.token, data.user);
        return { success: true };
      }
      return { success: false, error: data?.error || "Mã xác thực OTP không chính xác." };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const register = async (params: CustomerRegisterParams) => {
    if (!params.fullName || params.fullName.trim().length < 2) {
      return { success: false, error: "Họ và tên không được để trống." };
    }
    if (!params.email || !params.email.includes("@")) {
      return { success: false, error: "Địa chỉ email không đúng định dạng." };
    }
    if (!params.phoneNumber || params.phoneNumber.replace(/\D/g, "").length < 9) {
      return { success: false, error: "Số điện thoại di động không hợp lệ." };
    }
    if (!params.password || params.password.length < 6) {
      return { success: false, error: "Mật khẩu phải có ít nhất 6 ký tự." };
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: params.fullName.trim(),
          email: params.email.trim(),
          phoneNumber: params.phoneNumber.trim(),
          password: params.password,
          address: params.address?.trim() || "",
          province: params.province || "Hà Nội",
          portal: "mobile",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.token && data.user) {
          saveSession(data.token, data.user);
        }
        return { success: true, message: data.message };
      }
      return { success: false, error: data?.error || "Không thể đăng ký tài khoản." };
    } catch (e: any) {
      return { success: false, error: `Lỗi kết nối máy chủ: ${e.message}` };
    }
  };

  const registerWithGoogle = async (idToken: string, phoneNumber?: string) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          portal: "mobile",
          mode: "register",
          phoneNumber,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.token && data.user) {
          saveSession(data.token, data.user);
        }
        return { success: true, message: data.message };
      }
      return { success: false, error: data?.error || "Không thể đăng ký bằng Google." };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const updateProfile = async (payload: {
    fullName?: string;
    address?: string;
    province?: string;
    avatarUrl?: string;
  }) => {
    const res = await customerApi.put("/api/auth/profile", payload);
    if (res.success) {
      await refreshProfile();
      return { success: true };
    }
    return { success: false, error: res.error || "Không thể cập nhật hồ sơ." };
  };

  const logout = () => {
    clearSession();
    router.push("/login");
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        user,
        token,
        authConfig,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        loginWithGoogle,
        verify2FA,
        register,
        registerWithGoogle,
        refreshProfile,
        updateProfile,
        logout,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) {
    throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  }
  return ctx;
}

