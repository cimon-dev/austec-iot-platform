"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth, AvailableChannels } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { getApiBaseUrl } from "@/context/apiConfig";
import {
  ShieldCheck,
  Lock,
  Mail,
  Smartphone,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Server,
  Sun,
  Moon,
  Languages,
  MessageSquare,
  Loader2,
  X,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle, verifyAdmin2FA, authConfig } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Admin 2FA Step state
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [preAuthToken, setPreAuthToken] = useState<string>("");
  const [twoFaChannels, setTwoFaChannels] = useState<AvailableChannels | null>(null);
  const [twoFaChannel, setTwoFaChannel] = useState<"EMAIL" | "ZALO">("EMAIL");
  const [twoFaChallengeId, setTwoFaChallengeId] = useState<string | undefined>(undefined);
  const [twoFaSentMsg, setTwoFaSentMsg] = useState<string>("");
  const [otpCode, setOtpCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Real Forgot Password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<"identify" | "verify">("identify");
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotChannels, setForgotChannels] = useState<AvailableChannels | null>(null);
  const [forgotChannel, setForgotChannel] = useState<"EMAIL" | "ZALO">("EMAIL");
  const [forgotChallengeId, setForgotChallengeId] = useState<string | undefined>(undefined);
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPwd, setForgotNewPwd] = useState("");
  const [forgotConfirmPwd, setForgotConfirmPwd] = useState("");
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotErr, setForgotErr] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const send2FaOtp = async (tokenOverride?: string, channelOverride?: "EMAIL" | "ZALO") => {
    const token = tokenOverride || preAuthToken;
    const ch = channelOverride || twoFaChannel;
    if (!token) return;

    setIsSendingOtp(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/verify/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: "ADMIN_LOGIN_2FA",
          channel: ch,
          preAuthToken: token,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTwoFaChallengeId(data.challengeId);
        setTwoFaSentMsg(data.message || `Đã gửi mã OTP tới ${data.maskedTarget}`);
        setCooldown(data.cooldownSeconds || 45);
        toast.success(data.message || "Đã gửi mã OTP 2FA!");
      } else {
        setErrorMessage(data?.error || "Không thể gửi mã OTP 2FA.");
      }
    } catch (e: any) {
      setErrorMessage(e.message || "Lỗi kết nối máy chủ gửi OTP.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const enter2FaStep = async (token: string, channels?: AvailableChannels) => {
    setPreAuthToken(token);
    setTwoFaChannels(channels || null);
    setTwoFaChannel("EMAIL");
    setOtpCode("");
    setTwoFaSentMsg("");
    setStep("2fa");
    // Tự động gửi mã OTP qua Gmail (kênh mặc định) ngay khi sang bước 2FA
    await send2FaOtp(token, "EMAIL");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (step === "credentials") {
        if (!identifier.trim()) {
          setErrorMessage(
            language === "vi"
              ? "Vui lòng nhập Email hoặc Số điện thoại"
              : "Please enter email or phone number"
          );
          return;
        }
        if (!password || password.length < 6) {
          setErrorMessage("Vui lòng nhập mật khẩu (tối thiểu 6 ký tự).");
          return;
        }

        const res = await login({ identifier: identifier.trim(), password, rememberMe });
        if (!res.success) {
          setErrorMessage(res.error || "Đăng nhập thất bại.");
          return;
        }

        if (res.require2FA && res.preAuthToken) {
          await enter2FaStep(res.preAuthToken, res.channels);
          return;
        }

        router.push("/admin");
      } else {
        const cleanOtp = otpCode.trim();
        if (cleanOtp.length !== 6) {
          setErrorMessage("Vui lòng nhập đủ mã OTP 6 chữ số.");
          return;
        }
        const res = await verifyAdmin2FA(preAuthToken, cleanOtp, twoFaChallengeId);
        if (res.success) {
          toast.success("Xác thực 2FA thành công!");
          router.push("/admin");
        } else {
          setErrorMessage(res.error || "Mã xác thực 2FA không chính xác.");
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Lỗi kết nối máy chủ xác thực.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential?: string) => {
    if (!credential) {
      setErrorMessage("Không nhận được mã xác thực từ Google.");
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const res = await loginWithGoogle(credential);
      if (!res.success) {
        setErrorMessage(res.error || "Đăng nhập bằng Google thất bại.");
        return;
      }
      if (res.require2FA && res.preAuthToken) {
        await enter2FaStep(res.preAuthToken, res.channels);
        return;
      }
      toast.success("Đăng nhập bằng Google thành công!");
      router.push("/admin");
    } finally {
      setIsLoading(false);
    }
  };

  // ========================
  // FORGOT PASSWORD HANDLERS
  // ========================
  const handleForgotLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErr(null);
    setForgotMsg(null);
    setForgotLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/forgot-password/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: forgotIdentifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setForgotErr(data?.error || "Không tìm thấy tài khoản.");
        return;
      }
      setForgotChannels(data.channels);
      setForgotChannel("EMAIL");
      setForgotStep("verify");
    } catch (err: any) {
      setForgotErr(err.message || "Lỗi kết nối máy chủ.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotSendOtp = async () => {
    setForgotErr(null);
    setForgotMsg(null);
    setForgotLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/forgot-password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: forgotIdentifier.trim(),
          channel: forgotChannel,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setForgotErr(data?.error || "Không thể gửi mã khôi phục.");
        return;
      }
      setForgotChallengeId(data.challengeId);
      setForgotMsg(data.message || "Đã gửi mã OTP khôi phục!");
      toast.success(data.message || "Đã gửi mã OTP!");
    } catch (err: any) {
      setForgotErr(err.message || "Lỗi gửi OTP.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErr(null);
    if (forgotOtp.trim().length !== 6) {
      setForgotErr("Vui lòng nhập mã OTP 6 chữ số.");
      return;
    }
    if (forgotNewPwd.length < 6) {
      setForgotErr("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (forgotNewPwd !== forgotConfirmPwd) {
      setForgotErr("Xác nhận mật khẩu mới không khớp.");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/forgot-password/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: forgotIdentifier.trim(),
          code: forgotOtp.trim(),
          newPassword: forgotNewPwd,
          confirmPassword: forgotConfirmPwd,
          challengeId: forgotChallengeId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setForgotErr(data?.error || "Không thể đặt lại mật khẩu.");
        return;
      }
      toast.success(data.message || "Đặt lại mật khẩu thành công!");
      setShowForgotModal(false);
      setForgotStep("identify");
      setForgotOtp("");
      setForgotNewPwd("");
      setForgotConfirmPwd("");
    } catch (err: any) {
      setForgotErr(err.message || "Lỗi kết nối máy chủ.");
    } finally {
      setForgotLoading(false);
    }
  };

  const zalo2FaAvailable = Boolean(twoFaChannels?.zalo?.available);

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Floating Controls: Language & Theme */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <button
          onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-semibold backdrop-blur-md shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Languages className="w-3.5 h-3.5 text-cyan-500" />
          <span className="uppercase">{language}</span>
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 backdrop-blur-md shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-500" />
          )}
        </button>
      </div>

      {/* LEFT PANEL */}
      <div className="hidden md:flex md:w-1/2 p-12 flex-col justify-between border-r border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white border border-slate-700/80 flex items-center justify-center font-bold text-xl shadow-lg">
            <span className="bg-gradient-to-tr from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              A
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              AUSTEC CLOUD
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ZERO-TRUST SECURE
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Cổng Quản Trị & Vận Hành IoT Doanh Nghiệp
            </p>
          </div>
        </div>

        <div className="relative z-10 my-12 space-y-6 max-w-lg">
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Xác Thực Đa Tầng Thực Tế
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Quản trị tập trung, bảo vệ thiết bị bằng Google OAuth & OTP 2 kênh.
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Tài khoản Quản trị viên bắt buộc xác thực 2FA qua Gmail hoặc Zalo ZNS. Nhân viên CSKH đăng ký mới được kiểm duyệt chặt chẽ trước khi kích hoạt.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3.5 pt-4">
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-sm shadow-sm flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Xác Thực 2 Kênh (Gmail & Zalo ZNS)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Luôn có Gmail OTP mặc định và tùy chọn Zalo ZNS bảo vệ đăng nhập Admin, nạp OTA, phân quyền Admin và cài đặt MQTT.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-sm shadow-sm flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Mã Hóa Mật Khẩu Bcrypt & Google Sign-In
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Hỗ trợ đăng nhập bằng tài khoản Google doanh nghiệp, loại bỏ hoàn toàn mật khẩu văn bản thuần và token thử nghiệm.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-sm shadow-sm flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Kiểm Duyệt Nhân Sự CSKH Tập Trung
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Nhân viên CSKH đăng ký mới sẽ vào danh sách chờ phê duyệt của Quản trị viên trước khi được truy cập hệ thống.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="font-mono text-[11px]">PRODUCTION AUTH ARCHITECTURE</span>
          </div>
          <span>&copy; 2026 Austec Smart IoT</span>
        </div>
      </div>

      {/* RIGHT PANEL: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {step === "credentials"
                ? language === "vi"
                  ? "Đăng Nhập Cổng Quản Trị"
                  : "Sign in to Admin Portal"
                : language === "vi"
                ? "Xác Thực Bảo Mật 2FA (Admin)"
                : "Admin Two-Factor Authentication"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {step === "credentials"
                ? "Dành cho Quản trị viên (ADMIN) và Nhân viên CSKH đã được phê duyệt"
                : "Chọn nhận mã OTP 6 chữ số qua Gmail (mặc định) hoặc Zalo ZNS (tùy chọn)"}
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === "credentials" ? (
              <>
                <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod("email");
                      setIdentifier("");
                    }}
                    className={`flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      authMethod === "email"
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email công vụ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod("phone");
                      setIdentifier("");
                    }}
                    className={`flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      authMethod === "phone"
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Số điện thoại</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {authMethod === "email" ? "Địa chỉ Email" : "Số điện thoại đăng ký"}
                  </label>
                  <div className="relative">
                    {authMethod === "email" ? (
                      <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    ) : (
                      <Smartphone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    )}
                    <input
                      type={authMethod === "email" ? "email" : "tel"}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={
                        authMethod === "email"
                          ? "Nhập địa chỉ email của bạn..."
                          : "Nhập số điện thoại đăng ký..."
                      }
                      required
                      autoComplete="username"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Mật khẩu bảo mật
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotIdentifier(identifier);
                        setForgotStep("identify");
                        setForgotErr(null);
                        setForgotMsg(null);
                        setShowForgotModal(true);
                      }}
                      className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu..."
                      required
                      autoComplete="current-password"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-cyan-500"
                    />
                    <span>Duy trì phiên đăng nhập</span>
                  </label>
                </div>
              </>
            ) : (
              /* REAL 2FA STEP WITH 2 OPTIONS: GMAIL + ZALO ZNS */
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">
                    Chọn kênh nhận mã xác thực 2FA:
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setTwoFaChannel("EMAIL")}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                        twoFaChannel === "EMAIL"
                          ? "border-cyan-500 bg-cyan-500/10"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Mail className="w-4 h-4 text-cyan-500" />
                        <div>
                          <div className="text-xs font-bold">Gmail (Mặc định)</div>
                          <div className="text-[11px] text-slate-500">
                            {twoFaChannels?.email?.maskedTarget || "Gửi về Gmail tài khoản"}
                          </div>
                        </div>
                      </div>
                      {twoFaChannel === "EMAIL" && <CheckCircle2 className="w-4 h-4 text-cyan-500" />}
                    </button>

                    <button
                      type="button"
                      disabled={!zalo2FaAvailable}
                      onClick={() => zalo2FaAvailable && setTwoFaChannel("ZALO")}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition ${
                        !zalo2FaAvailable
                          ? "opacity-55 cursor-not-allowed border-slate-200 dark:border-slate-800"
                          : twoFaChannel === "ZALO"
                          ? "border-blue-500 bg-blue-500/10 cursor-pointer"
                          : "border-slate-200 dark:border-slate-800 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <MessageSquare className="w-4 h-4 text-blue-500" />
                        <div>
                          <div className="text-xs font-bold">Zalo ZNS (Tùy chọn)</div>
                          <div className="text-[11px] text-slate-500">
                            {!twoFaChannels?.zalo?.enabledOnServer
                              ? "Chưa kích hoạt key Zalo ZNS"
                              : !twoFaChannels?.zalo?.hasPhone
                              ? "Tài khoản chưa có SĐT"
                              : `Gửi về Zalo ${twoFaChannels.zalo.maskedTarget}`}
                          </div>
                        </div>
                      </div>
                      {twoFaChannel === "ZALO" && zalo2FaAvailable && (
                        <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      )}
                    </button>
                  </div>
                </div>

                {twoFaSentMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-700 dark:text-emerald-300">
                    {twoFaSentMsg}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block text-center">
                    Nhập mã OTP 6 chữ số
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 text-center text-xl font-mono tracking-[0.5em] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all shadow-sm"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("credentials");
                      setPreAuthToken("");
                      setOtpCode("");
                      setErrorMessage(null);
                    }}
                    className="text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    ← Quay lại đăng nhập
                  </button>
                  <button
                    type="button"
                    disabled={isSendingOtp || cooldown > 0}
                    onClick={() => send2FaOtp()}
                    className="text-cyan-600 dark:text-cyan-400 hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    {isSendingOtp
                      ? "Đang gửi..."
                      : cooldown > 0
                      ? `Gửi lại sau ${cooldown}s`
                      : `Gửi mã qua ${twoFaChannel === "EMAIL" ? "Gmail" : "Zalo"}`}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md hover:shadow-cyan-500/20 flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : step === "credentials" ? (
                <>
                  <span>Đăng nhập</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              ) : (
                <>
                  <span>Xác nhận 2FA & Vào hệ thống</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Google Sign-In Section */}
          {step === "credentials" && (
            <div className="space-y-3">
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
                <span className="bg-slate-50 dark:bg-slate-950 px-3 text-[11px] text-slate-400 uppercase font-semibold shrink-0">
                  Hoặc tiếp tục với
                </span>
                <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
              </div>

              {authConfig.googleWebClientId ? (
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={(res) => handleGoogleSuccess(res.credential)}
                    onError={() => setErrorMessage("Đăng nhập bằng Google thất bại hoặc đã bị hủy.")}
                    theme={theme === "dark" ? "filled_black" : "outline"}
                    size="large"
                    width="380"
                    text="signin_with"
                    shape="rectangular"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    toast.info(
                      "Chưa điền GOOGLE_WEB_CLIENT_ID trong backend/.env. Hãy điền key và khởi động lại Backend để kích hoạt Google Sign-In."
                    )
                  }
                  className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2.5 shadow-xs transition cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Đăng nhập bằng Google (Chờ điền key .env)</span>
                </button>
              )}
            </div>
          )}

          {/* Register Link */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
            <span>Nhân viên CSKH mới chưa có tài khoản? </span>
            <Link
              href="/admin/register"
              className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              Đăng ký chờ duyệt ngay
            </Link>
          </div>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-500" />
                Khôi Phục Mật Khẩu
              </h3>
              <button
                onClick={() => setShowForgotModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotErr && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-xs text-rose-600 dark:text-rose-400">
                {forgotErr}
              </div>
            )}
            {forgotMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-700 dark:text-emerald-300">
                {forgotMsg}
              </div>
            )}

            {forgotStep === "identify" ? (
              <form onSubmit={handleForgotLookup} className="space-y-3 text-xs">
                <p className="text-slate-500">
                  Nhập Email hoặc Số điện thoại tài khoản để chọn kênh nhận mã khôi phục (Gmail hoặc Zalo ZNS).
                </p>
                <input
                  type="text"
                  required
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  placeholder="Nhập Email hoặc Số điện thoại..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-cyan-600 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {forgotLoading ? "Đang kiểm tra..." : "Tiếp tục"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotConfirm} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForgotChannel("EMAIL")}
                    className={`p-2 rounded-xl border text-left cursor-pointer ${
                      forgotChannel === "EMAIL"
                        ? "border-cyan-500 bg-cyan-500/10"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="font-bold">Gmail</div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {forgotChannels?.email?.maskedTarget}
                    </div>
                  </button>
                  <button
                    type="button"
                    disabled={!forgotChannels?.zalo?.available}
                    onClick={() => forgotChannels?.zalo?.available && setForgotChannel("ZALO")}
                    className={`p-2 rounded-xl border text-left ${
                      !forgotChannels?.zalo?.available
                        ? "opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800"
                        : forgotChannel === "ZALO"
                        ? "border-blue-500 bg-blue-500/10 cursor-pointer"
                        : "border-slate-200 dark:border-slate-700 cursor-pointer"
                    }`}
                  >
                    <div className="font-bold">Zalo ZNS</div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {forgotChannels?.zalo?.available
                        ? forgotChannels.zalo.maskedTarget
                        : "Chưa khả dụng"}
                    </div>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={forgotLoading}
                  onClick={handleForgotSendOtp}
                  className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Gửi mã OTP qua {forgotChannel === "EMAIL" ? "Gmail" : "Zalo"}
                </button>

                <input
                  type="text"
                  maxLength={6}
                  required
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="Nhập mã OTP 6 chữ số..."
                  className="w-full px-3 py-2 text-center font-mono tracking-widest rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
                <input
                  type="password"
                  required
                  value={forgotNewPwd}
                  onChange={(e) => setForgotNewPwd(e.target.value)}
                  placeholder="Mật khẩu mới (tối thiểu 6 ký tự)..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
                <input
                  type="password"
                  required
                  value={forgotConfirmPwd}
                  onChange={(e) => setForgotConfirmPwd(e.target.value)}
                  placeholder="Xác nhận mật khẩu mới..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-cyan-600 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {forgotLoading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
