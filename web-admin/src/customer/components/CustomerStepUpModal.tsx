"use client";

import React, { useState, useEffect } from "react";
import { customerApi } from "../services/customer-api-client";
import { ShieldCheck, Mail, MessageSquare, Loader2, X, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface CustomerStepUpModalProps {
  isOpen: boolean;
  purpose: "CHANGE_PASSWORD" | "UPDATE_CONTACT" | "UNLINK_GOOGLE" | "DELETE_ACCOUNT" | "UNPAIR_DEVICE" | string;
  title?: string;
  description?: string;
  onClose: () => void;
  onVerified: (stepUpToken: string) => void;
}

export function CustomerStepUpModal({
  isOpen,
  purpose,
  title = "Xác thực bảo mật 2 lớp (Step-up OTP)",
  description = "Để bảo vệ an toàn cho ngôi nhà và tài khoản của bạn, vui lòng xác thực mã OTP 6 chữ số.",
  onClose,
  onVerified,
}: CustomerStepUpModalProps) {
  const [channel, setChannel] = useState<"EMAIL" | "ZALO">("EMAIL");
  const [channelsInfo, setChannelsInfo] = useState<any>(null);
  const [challengeId, setChallengeId] = useState<string | undefined>(undefined);
  const [otpCode, setOtpCode] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (!isOpen) return;
    setOtpCode("");
    setError(null);
    setSentMessage("");
    setChallengeId(undefined);

    const loadChannels = async () => {
      const res = await customerApi.get("/api/auth/verify/channels");
      if (res.success && res.channels) {
        setChannelsInfo(res.channels);
      }
      await sendOtp("EMAIL");
    };
    loadChannels();
  }, [isOpen, purpose]);

  const sendOtp = async (targetChannel: "EMAIL" | "ZALO" = channel) => {
    setIsSending(true);
    setError(null);
    try {
      const res = await customerApi.post("/api/auth/verify/request", {
        purpose,
        channel: targetChannel,
      });
      if (res.success) {
        setChallengeId(res.challengeId);
        setSentMessage(res.message || `Đã gửi mã OTP qua ${targetChannel}`);
        setCooldown(res.cooldownSeconds || 45);
        toast.success(res.message || "Đã gửi mã xác thực OTP!");
      } else {
        setError(res.error || "Không thể gửi mã OTP.");
      }
    } catch (e: any) {
      setError(e.message || "Lỗi kết nối máy chủ gửi OTP.");
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = otpCode.trim();
    if (clean.length !== 6) {
      setError("Vui lòng nhập đủ 6 chữ số OTP.");
      return;
    }
    setIsVerifying(true);
    setError(null);
    try {
      const res = await customerApi.post("/api/auth/verify/confirm", {
        purpose,
        code: clean,
        challengeId,
      });
      if (res.success && res.stepUpToken) {
        toast.success("Xác thực bảo mật thành công!");
        onVerified(res.stepUpToken);
      } else {
        setError(res.error || "Mã OTP không chính xác hoặc đã hết hạn.");
      }
    } catch (e: any) {
      setError(e.message || "Lỗi xác thực OTP.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#252D3A] bg-white dark:bg-[#151A22] p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-500 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#F3F5F8]">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-[#9BA4B2] mt-0.5">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1C232E] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setChannel("EMAIL");
              sendOtp("EMAIL");
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              channel === "EMAIL"
                ? "border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400"
                : "border-slate-200 dark:border-[#252D3A] text-slate-600 dark:text-[#9BA4B2]"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Gmail OTP</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setChannel("ZALO");
              sendOtp("ZALO");
            }}
            disabled={channelsInfo?.zalo && !channelsInfo.zalo.available}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 ${
              channel === "ZALO"
                ? "border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400"
                : "border-slate-200 dark:border-[#252D3A] text-slate-600 dark:text-[#9BA4B2]"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Zalo ZNS</span>
          </button>
        </div>

        {sentMessage && (
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400">
            {sentMessage}
          </div>
        )}

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#9BA4B2] mb-1.5">
              Mã xác thực OTP (6 chữ số)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="Nhập 6 số OTP..."
                className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-slate-200 dark:border-[#252D3A] bg-slate-50 dark:bg-[#1C232E] text-sm font-mono tracking-widest text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button
                type="button"
                disabled={cooldown > 0 || isSending}
                onClick={() => sendOtp(channel)}
                className="absolute right-2 top-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-200 dark:bg-[#252D3A] text-slate-700 dark:text-slate-200 disabled:opacity-50 cursor-pointer"
              >
                {isSending ? "Đang gửi..." : cooldown > 0 ? `Gửi lại (${cooldown}s)` : "Gửi lại"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#252D3A] text-xs font-semibold text-slate-600 dark:text-[#9BA4B2] hover:bg-slate-100 dark:hover:bg-[#1C232E] cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isVerifying || otpCode.length !== 6}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              {isVerifying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Xác nhận OTP</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

