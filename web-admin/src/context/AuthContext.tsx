"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "./apiConfig";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: "ADMIN" | "CSKH" | "CUSTOMER";
  avatarUrl?: string;
  company?: string;
  department?: string;
  empID?: string;
  googleLinked?: boolean;
  hasPassword?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  approvalStatus?: "APPROVED" | "PENDING" | "REJECTED";
  lastLoginAt?: string;
  sessionToken?: string;
}

export interface AvailableChannels {
  email: {
    available: boolean;
    maskedTarget: string;
  };
  zalo: {
    available: boolean;
    enabledOnServer: boolean;
    hasPhone: boolean;
    maskedTarget: string;
  };
}

export interface PublicAuthConfig {
  googleWebClientId: string;
  googleAuthEnabled: boolean;
  emailOtpEnabled: boolean;
  emailSmtpConfigured: boolean;
  zaloOtpEnabled: boolean;
  devConsoleOtpMode: boolean;
}

export interface LoginParams {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterParams {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  department?: string;
  company?: string;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  message?: string;
  require2FA?: boolean;
  preAuthToken?: string;
  channels?: AvailableChannels;
  pendingApproval?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  authConfig: PublicAuthConfig;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (params: LoginParams) => Promise<LoginResult>;
  loginWithGoogle: (idToken: string) => Promise<LoginResult>;
  verifyAdmin2FA: (preAuthToken: string, code: string, challengeId?: string) => Promise<{ success: boolean; error?: string }>;
  register: (params: RegisterParams) => Promise<{ success: boolean; pendingApproval?: boolean; message?: string; error?: string }>;
  registerWithGoogle: (idToken: string, extra?: { phoneNumber?: string; department?: string; company?: string }) => Promise<{ success: boolean; pendingApproval?: boolean; message?: string; error?: string }>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const DEFAULT_PUBLIC_CONFIG: PublicAuthConfig = {
  googleWebClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
  googleAuthEnabled: Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
  emailOtpEnabled: true,
  emailSmtpConfigured: false,
  zaloOtpEnabled: false,
  devConsoleOtpMode: false,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authConfig, setAuthConfig] = useState<PublicAuthConfig>(DEFAULT_PUBLIC_CONFIG);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const saveSession = useCallback((token: string, rawUser: any) => {
    const authedUser: AuthUser = {
      id: rawUser.id,
      fullName: rawUser.fullName || rawUser.name || "Quản Trị Viên",
      email: rawUser.email || "",
      phoneNumber: rawUser.phoneNumber || rawUser.phone || "",
      role: rawUser.role,
      avatarUrl: rawUser.avatarUrl,
      company: rawUser.company,
      department: rawUser.department,
      empID: rawUser.empID,
      googleLinked: Boolean(rawUser.googleLinked),
      hasPassword: rawUser.hasPassword !== false,
      emailVerified: Boolean(rawUser.emailVerified),
      phoneVerified: Boolean(rawUser.phoneVerified),
      approvalStatus: rawUser.approvalStatus || "APPROVED",
      lastLoginAt: new Date().toISOString().replace("T", " ").substring(0, 19),
      sessionToken: token,
    };
    setUser(authedUser);
    try {
      localStorage.setItem("austec_auth_user", JSON.stringify(authedUser));
      localStorage.setItem("austec_auth_token", token);
    } catch {
      // ignore storage errors
    }
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem("austec_auth_user");
      localStorage.removeItem("austec_auth_token");
    } catch {
      // ignore
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const savedToken = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") : null;
    if (!savedToken) {
      clearSession();
      return;
    }
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      });
      if (res.status === 401) {
        clearSession();
        if (
          typeof window !== "undefined" &&
          window.location.pathname.startsWith("/admin") &&
          window.location.pathname !== "/admin/login" &&
          window.location.pathname !== "/admin/register"
        ) {
          window.location.replace("/admin/login");
        }
        return;
      }
      const data = await res.json();
      if (data.success && data.user) {
        if (data.user.role === "CUSTOMER") {
          clearSession();
          return;
        }
        saveSession(savedToken, data.user);
      }
    } catch (err) {
      console.warn("[AuthContext] Không kết nối được API làm mới phiên:", err);
    }
  }, [clearSession, saveSession]);

  useEffect(() => {
    const initAuth = async () => {
      // 1. Nạp public auth config từ Backend (Google Client ID, trạng thái Zalo ZNS...)
      try {
        const cfgRes = await fetch(`${getApiBaseUrl()}/api/auth/public-config`);
        if (cfgRes.ok) {
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
        // giữ default config
      }

      // 2. Kiểm tra phiên đăng nhập thực tế với Backend
      try {
        const savedUser = localStorage.getItem("austec_auth_user");
        const savedToken = localStorage.getItem("austec_auth_token");
        if (savedUser && savedToken) {
          const parsedUser = JSON.parse(savedUser);
          if (parsedUser?.role === "CUSTOMER") {
            clearSession();
          } else {
            setUser(parsedUser);
            await refreshUser();
          }
        } else {
          setUser(null);
        }
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [clearSession, refreshUser]);

  const login = async (params: LoginParams): Promise<LoginResult> => {
    const { identifier, password } = params;
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
          portal: "admin",
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
    } catch (netErr: any) {
      return { success: false, error: `Không thể kết nối máy chủ xác thực: ${netErr.message}` };
    }
  };

  const loginWithGoogle = async (idToken: string): Promise<LoginResult> => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, portal: "admin", mode: "login" }),
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
    } catch (netErr: any) {
      return { success: false, error: `Lỗi kết nối xác thực Google: ${netErr.message}` };
    }
  };

  const verifyAdmin2FA = async (
    preAuthToken: string,
    code: string,
    challengeId?: string
  ): Promise<{ success: boolean; error?: string }> => {
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
      return { success: false, error: data?.error || "Mã xác thực 2FA không chính xác." };
    } catch (netErr: any) {
      return { success: false, error: `Lỗi kết nối xác thực 2FA: ${netErr.message}` };
    }
  };

  const register = async (params: RegisterParams) => {
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
          department: params.department?.trim(),
          company: params.company?.trim(),
          portal: "admin",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          pendingApproval: Boolean(data.pendingApproval),
          message: data.message,
        };
      }
      return { success: false, error: data?.error || "Không thể gửi yêu cầu đăng ký." };
    } catch (netErr: any) {
      return { success: false, error: `Lỗi kết nối máy chủ: ${netErr.message}` };
    }
  };

  const registerWithGoogle = async (
    idToken: string,
    extra?: { phoneNumber?: string; department?: string; company?: string }
  ) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          portal: "admin",
          mode: "register",
          phoneNumber: extra?.phoneNumber,
          department: extra?.department,
          company: extra?.company,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          pendingApproval: Boolean(data.pendingApproval),
          message: data.message,
        };
      }
      return { success: false, error: data?.error || "Không thể đăng ký bằng Google." };
    } catch (netErr: any) {
      return { success: false, error: `Lỗi kết nối máy chủ: ${netErr.message}` };
    }
  };

  const logout = () => {
    clearSession();
    router.push("/admin/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authConfig,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithGoogle,
        verifyAdmin2FA,
        register,
        registerWithGoogle,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
