"use client";

import React, { useState } from "react";
import { X, Lock, Mail, Smartphone, ShieldCheck, Unlink, Link2 } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/services/api-client";
import { StepUpVerifyModal, StepUpPurpose, getCachedStepUpToken } from "./StepUpVerifyModal";

interface AccountSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountSecurityModal({ isOpen, onClose }: AccountSecurityModalProps) {
  const { user, authConfig, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"password" | "contact" | "google">("password");

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contact form
  const [newEmail, setNewEmail] = useState(user?.email || "");
  const [newPhone, setNewPhone] = useState(user?.phoneNumber || "");

  // Step-up modal state
  const [stepUpState, setStepUpState] = useState<{
    open: boolean;
    purpose: StepUpPurpose;
    title: string;
    detail: string;
    action: (token: string) => Promise<void>;
  } | null>(null);

  if (!isOpen || !user) return null;

  const runWithStepUp = async (
    purpose: StepUpPurpose,
    title: string,
    detail: string,
    action: (token: string) => Promise<void>
  ) => {
    const cached = getCachedStepUpToken(purpose);
    if (cached) {
      await action(cached);
      return;
    }
    setStepUpState({ open: true, purpose, title, detail, action });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Xác nhận mật khẩu mới không khớp.");
      return;
    }
    await runWithStepUp(
      "CHANGE_PASSWORD",
      user.hasPassword === false ? "Thiết lập mật khẩu lần đầu" : "Xác thực Đổi mật khẩu",
      "Xác thực OTP qua Gmail hoặc Zalo trước khi cập nhật mật khẩu đăng nhập.",
      async (stepUpToken) => {
        setIsSubmitting(true);
        try {
          const res = await apiClient.post(
            "/api/auth/change-password",
            {
              currentPassword: user.hasPassword === false ? undefined : currentPassword,
              newPassword,
              confirmPassword,
            },
            { stepUpToken }
          );
          if (res.success) {
            toast.success(res.message || "Cập nhật mật khẩu thành công!");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            await refreshUser();
          } else {
            toast.error(res.error || "Không thể đổi mật khẩu.");
          }
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runWithStepUp(
      "UPDATE_CONTACT",
      "Xác thực thay đổi Email / Số điện thoại",
      "Thay đổi thông tin định danh tài khoản yêu cầu xác thực OTP (Gmail hoặc Zalo).",
      async (stepUpToken) => {
        setIsSubmitting(true);
        try {
          const res = await apiClient.put(
            "/api/auth/contact",
            {
              email: newEmail !== user.email ? newEmail : undefined,
              phoneNumber: newPhone !== user.phoneNumber ? newPhone : undefined,
            },
            { stepUpToken }
          );
          if (res.success) {
            toast.success(res.message || "Đã cập nhật liên hệ định danh!");
            await refreshUser();
          } else {
            toast.error(res.error || "Không thể cập nhật thông tin liên hệ.");
          }
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  const handleLinkGoogleSuccess = async (credential?: string) => {
    if (!credential) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.post("/api/auth/google/link", { idToken: credential });
      if (res.success) {
        toast.success(res.message || "Đã liên kết tài khoản Google thành công!");
        await refreshUser();
      } else {
        toast.error(res.error || "Không thể liên kết Google.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    await runWithStepUp(
      "UNLINK_GOOGLE",
      "Xác thực hủy liên kết Google",
      "Sau khi hủy liên kết, bạn sẽ chỉ đăng nhập được bằng Email/SĐT và Mật khẩu.",
      async (stepUpToken) => {
        setIsSubmitting(true);
        try {
          const res = await apiClient.post("/api/auth/google/unlink", {}, { stepUpToken });
          if (res.success) {
            toast.success(res.message || "Đã hủy liên kết Google.");
            await refreshUser();
          } else {
            toast.error(res.error || "Không thể hủy liên kết Google.");
          }
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Bảo Mật & Tài Khoản
              </h3>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("password")}
              className={`py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === "password"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500"
              }`}
            >
              Mật khẩu
            </button>
            <button
              type="button"
              onClick={() => {
                setNewEmail(user.email || "");
                setNewPhone(user.phoneNumber || "");
                setActiveTab("contact");
              }}
              className={`py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === "contact"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500"
              }`}
            >
              Email / SĐT
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("google")}
              className={`py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === "google"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500"
              }`}
            >
              Liên kết Google
            </button>
          </div>

          {activeTab === "password" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-3 text-xs">
              {user.hasPassword !== false && (
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Mật khẩu hiện tại
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                      placeholder="Nhập mật khẩu hiện tại..."
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Mật khẩu mới (tối thiểu 6 ký tự)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  placeholder="Nhập mật khẩu mới..."
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  placeholder="Nhập lại mật khẩu mới..."
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-cyan-600 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {user.hasPassword === false ? "Thiết lập mật khẩu (Cần OTP)" : "Đổi mật khẩu (Cần OTP)"}
              </button>
            </form>
          )}

          {activeTab === "contact" && (
            <form onSubmit={handleContactSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Địa chỉ Gmail / Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Số điện thoại (nhận OTP Zalo ZNS)
                </label>
                <div className="relative">
                  <Smartphone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="VD: 0944102588"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-cyan-600 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                Cập nhật liên hệ (Cần OTP)
              </button>
            </form>
          )}

          {activeTab === "google" && (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Tài khoản Google (Gmail)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {user.googleLinked ? `Đã liên kết (${user.email})` : "Chưa liên kết với Google"}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    user.googleLinked
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {user.googleLinked ? "Đã kết nối" : "Chưa kết nối"}
                </span>
              </div>

              {user.googleLinked ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleUnlinkGoogle}
                  className="w-full py-2.5 rounded-xl border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Unlink className="w-4 h-4" />
                  <span>Hủy liên kết Google (Cần OTP)</span>
                </button>
              ) : authConfig.googleWebClientId ? (
                <div className="flex justify-center pt-1">
                  <GoogleLogin
                    onSuccess={(cred) => handleLinkGoogleSuccess(cred.credential)}
                    onError={() => toast.error("Không thể mở cửa sổ đăng nhập Google.")}
                    text="continue_with"
                  />
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Link2 className="w-4 h-4 shrink-0" />
                  <span>Điền GOOGLE_WEB_CLIENT_ID trong backend/.env để kích hoạt liên kết Google.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {stepUpState && (
        <StepUpVerifyModal
          isOpen={stepUpState.open}
          purpose={stepUpState.purpose}
          title={stepUpState.title}
          warningDetail={stepUpState.detail}
          onClose={() => setStepUpState(null)}
          onVerified={async (token) => {
            const act = stepUpState.action;
            setStepUpState(null);
            await act(token);
          }}
        />
      )}
    </>
  );
}

