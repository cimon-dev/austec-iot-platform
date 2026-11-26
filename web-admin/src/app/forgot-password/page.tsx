"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/context/apiConfig";
import {
  KeyRound,
  Mail,
  MessageSquare,
  Lock,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export default function CustomerForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"lookup" | "verify">("lookup");
  const [identifier, setIdentifier] = useState("");
  const [channels, setChannels] = useState<any>(null);
  const [selectedChannel, setSelectedChannel] = useState<"EMAIL" | "ZALO">("EMAIL");
  const [challengeId, setChallengeId] = useState<string | undefined>(undefined);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sentMsg, setSentMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/forgot-password/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChannels(data.channels);
        setStep("verify");
        await requestResetOtp("EMAIL");
      } else {
        setErrorMsg(data.error || "Không tìm thấy tài khoản tương ứng.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi kết nối máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  const requestResetOtp = async (ch: "EMAIL" | "ZALO" = selectedChannel) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/forgot-password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          channel: ch,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChallengeId(data.challengeId);
        setSentMsg(data.message || `Đã gửi mã OTP qua ${ch}`);
        setCooldown(data.cooldownSeconds || 45);
        toast.success("Đã gửi mã xác thực OTP!");
      } else {
        setErrorMsg(data.error || "Không thể gửi mã OTP.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi gửi mã OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6) {
      setErrorMsg("Vui lòng nhập đủ 6 chữ số OTP.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Mật khẩu nhập lại không khớp.");
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/forgot-password/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          code: otpCode.trim(),
          challengeId,
          newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Đặt lại mật khẩu thành công! Vui lòng đăng nhập.");
        router.push("/login");
      } else {
        setErrorMsg(data.error || "Mã OTP không chính xác hoặc đã hết hạn.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi đặt lại mật khẩu.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full overflow-y-auto bg-[#F6F7F9] dark:bg-[#0D1015] text-[#11161F] dark:text-[#F3F5F8] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#E2E6EC] dark:border-[#252D3A] bg-white dark:bg-[#151A22] p-6 sm:p-8 shadow-xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold">Khôi phục mật khẩu</h1>
            <p className="text-xs text-[#525D6F] dark:text-[#9BA4B2]">
              Xác thực OTP qua Gmail hoặc Zalo ZNS
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 font-medium">
            {errorMsg}
          </div>
        )}

        {sentMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{sentMsg}</span>
          </div>
        )}

        {step === "lookup" ? (
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[#525D6F] dark:text-[#9BA4B2]">
                Email hoặc Số điện thoại đã đăng ký
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Nhập Email hoặc Số điện thoại..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E6EC] dark:border-[#252D3A] bg-[#F6F7F9] dark:bg-[#1C232E] text-sm focus:outline-none focus:border-blue-500"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Tiếp tục nhận mã OTP</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmReset} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedChannel("EMAIL");
                  requestResetOtp("EMAIL");
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                  selectedChannel === "EMAIL"
                    ? "border-blue-600 bg-blue-600/10 text-blue-500"
                    : "border-[#E2E6EC] dark:border-[#252D3A]"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Gmail OTP</span>
              </button>
              <button
                type="button"
                disabled={channels?.zalo && !channels.zalo.available}
                onClick={() => {
                  setSelectedChannel("ZALO");
                  requestResetOtp("ZALO");
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer disabled:opacity-40 ${
                  selectedChannel === "ZALO"
                    ? "border-blue-600 bg-blue-600/10 text-blue-500"
                    : "border-[#E2E6EC] dark:border-[#252D3A]"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Zalo ZNS</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Mã OTP (6 chữ số)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-[#E2E6EC] dark:border-[#252D3A] bg-[#F6F7F9] dark:bg-[#1C232E] text-sm font-mono tracking-widest"
                  required
                />
                <button
                  type="button"
                  disabled={cooldown > 0 || isLoading}
                  onClick={() => requestResetOtp(selectedChannel)}
                  className="px-3 py-2 rounded-xl border border-[#E2E6EC] dark:border-[#252D3A] text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {cooldown > 0 ? `${cooldown}s` : "Gửi lại"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Mật khẩu mới</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-2.5 text-[#7B8596]" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-[#E2E6EC] dark:border-[#252D3A] bg-[#F6F7F9] dark:bg-[#1C232E] text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Xác nhận mật khẩu mới</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-2.5 text-[#7B8596]" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-[#E2E6EC] dark:border-[#252D3A] bg-[#F6F7F9] dark:bg-[#1C232E] text-sm"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Xác nhận đặt lại mật khẩu</span>
            </button>
          </form>
        )}

        <div className="pt-3 border-t border-[#E2E6EC] dark:border-[#252D3A] flex items-center justify-between text-xs">
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-[#525D6F] dark:text-[#9BA4B2] hover:text-[#11161F] dark:hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại đăng nhập</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

