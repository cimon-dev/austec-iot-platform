"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, Mail, MessageSquare, KeyRound, Loader2, CheckCircle2, Info, X } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api-client";
import { AvailableChannels } from "@/context/AuthContext";

export type StepUpPurpose =
  | "ADMIN_LOGIN_2FA"
  | "CHANGE_PASSWORD"
  | "FORGOT_PASSWORD"
  | "UPDATE_CONTACT"
  | "UNLINK_GOOGLE"
  | "DELETE_ACCOUNT"
  | "TRANSFER_DEVICE"
  | "UNPAIR_DEVICE"
  | "OTA_ADMIN"
  | "ADMIN_ROLE_CHANGE"
  | "SYSTEM_SETTINGS";

// Cache phiên Step-up ngắn hạn trong RAM (hết hạn đồng bộ với server)
const stepUpTokenCache = new Map<string, { token: string; expiresAt: number }>();

export function getCachedStepUpToken(purpose: StepUpPurpose): string | null {
  const item = stepUpTokenCache.get(purpose);
  if (!item) return null;
  if (Date.now() >= item.expiresAt - 15000) {
    stepUpTokenCache.delete(purpose);
    return null;
  }
  return item.token;
}

export function clearCachedStepUpToken(purpose?: StepUpPurpose) {
  if (purpose) {
    stepUpTokenCache.delete(purpose);
  } else {
    stepUpTokenCache.clear();
  }
}

export interface StepUpVerifyModalProps {
  isOpen: boolean;
  purpose: StepUpPurpose;
  title: string;
  warningTitle?: string;
  warningDetail: string;
  badgeText?: string;
  badgeType?: "danger" | "warning" | "info";
  summaryRows?: Array<{ label: string; value: string }>;
  confirmBtnLabel?: string;
  targetOverride?: string;
  onClose: () => void;
  onVerified: (stepUpToken: string) => void | Promise<void>;
}

export function StepUpVerifyModal({
  isOpen,
  purpose,
  title,
  warningTitle = "Xác thực bảo mật 2 lớp (Gmail / Zalo)",
  warningDetail,
  badgeText = "Yêu cầu xác thực OTP",
  badgeType = "warning",
  summaryRows = [],
  confirmBtnLabel = "Xác nhận & Thực hiện",
  targetOverride,
  onClose,
  onVerified,
}: StepUpVerifyModalProps) {
  const [channels, setChannels] = useState<AvailableChannels | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<"EMAIL" | "ZALO">("EMAIL");
  const [challengeId, setChallengeId] = useState<string | undefined>(undefined);
  const [otpSent, setOtpSent] = useState(false);
  const [sentInfo, setSentInfo] = useState<string>("");
  const [otpCode, setOtpCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setOtpSent(false);
    setOtpCode("");
    setChallengeId(undefined);
    setSentInfo("");
    setErrorMsg(null);
    setSelectedChannel("EMAIL");

    apiClient.get<{ channels: AvailableChannels }>("/api/auth/verify/channels").then((res) => {
      if (res.success && res.channels) {
        setChannels(res.channels);
      }
    });
  }, [isOpen, purpose]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  if (!isOpen) return null;

  const handleSendOtp = async () => {
    setErrorMsg(null);
    setIsSending(true);
    try {
      const res = await apiClient.post("/api/auth/verify/request", {
        purpose,
        channel: selectedChannel,
        targetOverride,
      });
      if (res.success) {
        setOtpSent(true);
        setChallengeId(res.challengeId);
        setCooldown(res.cooldownSeconds || 45);
        setSentInfo(res.message || `Đã gửi mã OTP tới ${res.maskedTarget}`);
        toast.success(res.message || "Đã gửi mã OTP!");
      } else {
        setErrorMsg(res.error || "Không thể gửi mã OTP.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Lỗi kết nối máy chủ gửi OTP.");
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6) {
      setErrorMsg("Vui lòng nhập đủ mã OTP 6 chữ số.");
      return;
    }
    setErrorMsg(null);
    setIsConfirming(true);
    try {
      const res = await apiClient.post("/api/auth/verify/confirm", {
        purpose,
        code: otpCode.trim(),
        challengeId,
      });
      if (res.success && res.stepUpToken) {
        const ttlMs = (Number(res.expiresInSeconds) || 600) * 1000;
        stepUpTokenCache.set(purpose, {
          token: res.stepUpToken,
          expiresAt: Date.now() + ttlMs,
        });
        await onVerified(res.stepUpToken);
      } else {
        setErrorMsg(res.error || "Mã OTP không chính xác.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Lỗi xác minh mã OTP.");
    } finally {
      setIsConfirming(false);
    }
  };

  const zaloAvailable = Boolean(channels?.zalo?.available);
  const zaloSubtitle = !channels
    ? "Đang kiểm tra..."
    : !channels.zalo.enabledOnServer
    ? "Tùy chọn thêm (chưa bật key Zalo ZNS)"
    : !channels.zalo.hasPhone
    ? "Tài khoản chưa có SĐT hợp lệ"
    : `Gửi về Zalo SĐT ${channels.zalo.maskedTarget}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
      <form
        onSubmit={handleConfirm}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-2.5">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                badgeType === "danger"
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : badgeType === "info"
                  ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span
                className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 ${
                  badgeType === "danger"
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : badgeType === "info"
                    ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {badgeText}
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                {title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning box */}
        <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/70 dark:border-amber-800/40 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>{warningTitle}</span>
          </div>
          <p className="text-[11px] text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
            {warningDetail}
          </p>
        </div>

        {/* Optional summary */}
        {summaryRows.length > 0 && (
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1 text-[11px]">
            {summaryRows.map((row, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-slate-500">{row.label}:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-mono truncate">
                  {row.value}
                </strong>
              </div>
            ))}
          </div>
        )}

        {/* 2-Option Channel Selector */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">
            Chọn kênh nhận mã OTP (6 chữ số):
          </label>
          <div className="grid grid-cols-1 gap-2">
            {/* Option 1: Gmail (Always Available) */}
            <button
              type="button"
              onClick={() => setSelectedChannel("EMAIL")}
              className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                selectedChannel === "EMAIL"
                  ? "border-cyan-500 bg-cyan-500/10"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Xác thực qua Gmail</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                      Mặc định
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {targetOverride && targetOverride.includes("@")
                      ? `Gửi tới ${targetOverride}`
                      : channels?.email?.maskedTarget
                      ? `Gửi tới ${channels.email.maskedTarget}`
                      : "Gửi tới địa chỉ Gmail tài khoản"}
                  </div>
                </div>
              </div>
              {selectedChannel === "EMAIL" && (
                <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
              )}
            </button>

            {/* Option 2: Zalo ZNS (Optional) */}
            <button
              type="button"
              disabled={!zaloAvailable}
              onClick={() => zaloAvailable && setSelectedChannel("ZALO")}
              className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                !zaloAvailable
                  ? "opacity-55 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
                  : selectedChannel === "ZALO"
                  ? "border-blue-500 bg-blue-500/10 cursor-pointer"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Xác thực qua Zalo ZNS</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold">
                      Tùy chọn
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {zaloSubtitle}
                  </div>
                </div>
              </div>
              {selectedChannel === "ZALO" && zaloAvailable && (
                <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
              )}
            </button>
          </div>
        </div>

        {/* Send OTP & Code Input */}
        <div className="space-y-2.5">
          <button
            type="button"
            disabled={isSending || cooldown > 0}
            onClick={handleSendOtp}
            className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang gửi mã OTP...</span>
              </>
            ) : cooldown > 0 ? (
              <span>Gửi lại mã OTP sau {cooldown}s</span>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5 text-cyan-500" />
                <span>
                  {otpSent
                    ? `Gửi lại mã qua ${selectedChannel === "EMAIL" ? "Gmail" : "Zalo"}`
                    : `Gửi mã OTP qua ${selectedChannel === "EMAIL" ? "Gmail" : "Zalo"}`}
                </span>
              </>
            )}
          </button>

          {sentInfo && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-700 dark:text-emerald-300">
              {sentInfo}
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-[11px] text-rose-600 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Nhập mã OTP 6 chữ số..."
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
            className="w-full text-center tracking-[0.45em] text-lg font-mono font-bold py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={isConfirming || otpCode.trim().length !== 6}
            className={`flex-1 py-2 text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer ${
              badgeType === "danger"
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-slate-900 hover:bg-slate-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white"
            }`}
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <span>{confirmBtnLabel}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

