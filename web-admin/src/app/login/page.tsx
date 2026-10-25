"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
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
  ShieldAlert,
  Server,
  Sun,
  Moon,
  Languages,
  Check
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, quickSwitchRole } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("austec.admin@gmail.com");
  const [password, setPassword] = useState("Austec123!@#");
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("123456");
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const validPwd = (password === "••••••••••••" || !password) ? "Austec123!@#" : password;

      if (step === "credentials") {
        // Validate credentials
        if (!identifier.trim()) {
          setErrorMessage(language === "vi" ? "Vui lòng nhập Email hoặc Số điện thoại" : "Please enter email or phone number");
          setIsLoading(false);
          return;
        }

        // Nếu là admin, hiển thị bước xác thực 2FA (Zero-Trust)
        if (identifier.toLowerCase().includes("admin")) {
          // Thử đăng nhập để kiểm tra mật khẩu trước
          const checkRes = await login({ identifier, password: validPwd, rememberMe });
          if (!checkRes.success) {
            setErrorMessage(checkRes.error || "Mật khẩu không chính xác. Mật khẩu mẫu: Austec123!@# hoặc 123456");
            setIsLoading(false);
            return;
          }
          setStep("2fa");
          setIsLoading(false);
          return;
        }

        const res = await login({ identifier, password: validPwd, rememberMe });
        if (res.success) {
          router.push("/");
        } else {
          setErrorMessage(res.error || "Đăng nhập thất bại");
        }
      } else {
        // 2FA step
        const cleanOtp = (otpCode || "").trim();
        if (cleanOtp && cleanOtp !== "123456" && cleanOtp !== "000000") {
          setErrorMessage("Mã xác thực 2FA không chính xác. Mã mẫu hệ thống là: 123456");
          setIsLoading(false);
          return;
        }

        const res = await login({ identifier, password: validPwd, otp: cleanOtp || "123456", rememberMe });
        if (res.success) {
          router.push("/");
        } else {
          setErrorMessage(res.error || "Xác thực 2FA không chính xác");
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Lỗi kết nối máy chủ xác thực");
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickAccount = (type: "admin" | "cskh" | "customer") => {
    if (type === "admin") {
      setAuthMethod("email");
      setIdentifier("austec.admin@gmail.com");
      setPassword("Austec123!@#");
      setOtpCode("123456");
    } else if (type === "cskh") {
      setAuthMethod("email");
      setIdentifier("cskh.austec01@austec.vn");
      setPassword("123456");
      setOtpCode("123456");
    } else {
      setAuthMethod("phone");
      setIdentifier("0912345678");
      setPassword("123456");
      setOtpCode("123456");
    }
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Floating Controls: Language & Theme */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <button
          onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-semibold backdrop-blur-md shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Languages className="w-3.5 h-3.5 text-cyan-500" />
          <span className="uppercase">{language}</span>
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 backdrop-blur-md shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
        </button>
      </div>

      {/* LEFT PANEL: Enterprise Security & Brand Showcase */}
      <div className="hidden md:flex md:w-1/2 p-12 flex-col justify-between border-r border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white border border-slate-700/80 flex items-center justify-center font-bold text-xl shadow-lg">
            <span className="bg-gradient-to-tr from-cyan-400 to-indigo-400 bg-clip-text text-transparent">A</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              AUSTEC CLOUD
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ZERO-TRUST SECURE
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Hệ thống Quản trị & Vận hành IoT Cấp Doanh Nghiệp
            </p>
          </div>
        </div>

        {/* Security Core Pillars */}
        <div className="relative z-10 my-12 space-y-6 max-w-lg">
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Kiến trúc Bảo mật Cao nhất
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Quản trị tập trung, an toàn tuyệt đối mọi thiết bị phần cứng.
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Mọi gói tin điều khiển, kết nối MQTT 8883 TLS và thông tin định danh đều được mã hóa đa tầng và ghi nhật ký Hộp đen SHA-256 bất biến.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3.5 pt-4">
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-sm shadow-sm flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Xác Thực Đa Yếu Tố (MFA / 2FA)</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Bảo vệ chống chiếm đoạt tài khoản bằng mã số OTP thời gian thực qua SMS hoặc Authenticator.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-sm shadow-sm flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Chữ Ký Số Lệnh (HMAC-SHA256)</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Ngăn chặn hoàn toàn tấn công giả mạo (Man-in-the-Middle) và replay attack trên sóng không dây.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-sm shadow-sm flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Hạ Tầng Microsecond Caching</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Bộ nhớ đệm Redis Hot Cache phản hồi tức thì dưới 0.3 mili-giây, hỗ trợ hàng triệu phiên đồng thời.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Security Badges */}
        <div className="relative z-10 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="font-mono text-[11px]">ISO 27001 & SOC-2 COMPLIANT READY</span>
          </div>
          <span>&copy; 2026 Austec Smart IoT</span>
        </div>
      </div>

      {/* RIGHT PANEL: Login Form Card */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {step === "credentials" 
                ? (language === "vi" ? "Đăng Nhập Cổng Quản Trị" : "Sign in to Admin Portal") 
                : (language === "vi" ? "Xác Thực Bảo Mật 2FA" : "Two-Factor Authentication")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {step === "credentials"
                ? (language === "vi" 
                    ? "Nhập Email hoặc Số điện thoại để truy cập hệ thống bảo mật cao" 
                    : "Enter your verified email or mobile phone to continue")
                : (language === "vi"
                    ? "Nhập mã số 6 chữ số từ ứng dụng Authenticator / SMS của bạn"
                    : "Enter the 6-digit verification code from your Authenticator / SMS")}
            </p>
          </div>

          {/* Quick Demo Switcher Chips */}
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 block">
              {language === "vi" ? "Tài khoản mẫu thử nghiệm tức thì:" : "Quick Demo Accounts:"}
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillQuickAccount("admin")}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 hover:border-cyan-500 transition-colors shadow-sm truncate"
              >
                1. Master Admin
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount("cskh")}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 hover:border-cyan-500 transition-colors shadow-sm truncate"
              >
                2. CSKH Lead
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount("customer")}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 hover:border-cyan-500 transition-colors shadow-sm truncate"
              >
                3. App End-User
              </button>
            </div>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === "credentials" ? (
              <>
                {/* Method Tabs: Email vs Phone */}
                <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setAuthMethod("email"); setIdentifier("austec.admin@gmail.com"); }}
                    className={`flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
                    onClick={() => { setAuthMethod("phone"); setIdentifier("0944102588"); }}
                    className={`flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      authMethod === "phone"
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Số điện thoại</span>
                  </button>
                </div>

                {/* Identifier Input */}
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
                      placeholder={authMethod === "email" ? "admin@austec.vn" : "09xxxxxxxx"}
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Mật khẩu bảo mật
                    </label>
                    <button
                      type="button"
                      onClick={() => alert("Hệ thống đã gửi liên kết đặt lại mật khẩu về Email/SĐT của bạn!")}
                      className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline"
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
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-cyan-500"
                    />
                    <span>Duy trì đăng nhập bảo mật (30 ngày)</span>
                  </label>
                </div>
              </>
            ) : (
              /* 2FA Verification Step */
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center space-y-1">
                  <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-semibold block">
                    XÁC THỰC BƯỚC 2 (2FA OTP)
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Mã xác thực đã được gửi tới ứng dụng bảo mật của tài khoản <strong className="font-mono text-slate-900 dark:text-white">{identifier}</strong>.
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    (Mã thử nghiệm hệ thống: <strong>123456</strong>)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block text-center">
                    Nhập mã 6 chữ số
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 text-center text-xl font-mono tracking-[0.5em] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all shadow-sm"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setStep("credentials")}
                    className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    ← Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={() => alert("Đã gửi lại mã OTP mới qua SMS/Email!")}
                    className="text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    Gửi lại mã OTP
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md hover:shadow-cyan-500/20 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isLoading ? (
                <span>Đang mã hóa & xác thực...</span>
              ) : step === "credentials" ? (
                <>
                  <span>Tiếp tục đăng nhập</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              ) : (
                <>
                  <span>Xác nhận & Vào hệ thống</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
            <span>Chưa có tài khoản quản trị hoặc người dùng? </span>
            <Link href="/register" className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline">
              Đăng ký mới ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
