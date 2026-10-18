"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import { 
  UserPlus, 
  Mail, 
  Smartphone, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Sun,
  Moon,
  Languages,
  UserCheck
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "CSKH" | "CUSTOMER">("CUSTOMER");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp!");
      return;
    }

    if (strength < 2) {
      setErrorMessage("Vui lòng đặt mật khẩu mạnh hơn (ít nhất 8 ký tự, bao gồm chữ hoa, số và ký tự đặc biệt).");
      return;
    }

    if (!agreeTerms) {
      setErrorMessage("Vui lòng đồng ý với Điều khoản Dịch vụ và Chính sách Bảo mật của Austec.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await register({
        fullName,
        email,
        phoneNumber,
        password,
        role,
      });

      if (res.success) {
        setSuccessMessage("Đăng ký tài khoản thành công! Đang chuyển hướng về Cổng Đăng nhập...");
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      } else {
        setErrorMessage(res.error || "Đăng ký thất bại");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Lỗi máy chủ xác thực");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 md:p-12 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Floating Theme & Language Switches */}
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

      <div className="w-full max-w-lg space-y-6 bg-white dark:bg-slate-900/90 p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl backdrop-blur-md">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 mb-2">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {language === "vi" ? "Khởi Tạo Tài Khoản Austec Cloud" : "Create an Austec Cloud Account"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === "vi" 
              ? "Tham gia hệ sinh thái quản lý thiết bị thông minh cấp doanh nghiệp" 
              : "Join enterprise-grade smart IoT device management ecosystem"}
          </p>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2.5 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Họ và tên đầy đủ
            </label>
            <input
              type="text"
              required
              placeholder="Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all shadow-sm"
            />
          </div>

          {/* Email & Phone grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Địa chỉ Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@austec.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Số điện thoại di động
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="tel"
                  required
                  placeholder="0912345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Role Choice */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Vai trò tài khoản
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole("CUSTOMER")}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                  role === "CUSTOMER"
                    ? "bg-slate-900 text-white dark:bg-cyan-600 dark:border-cyan-500 border-slate-900 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                }`}
              >
                Khách Hàng (App)
              </button>
              <button
                type="button"
                onClick={() => setRole("CSKH")}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                  role === "CSKH"
                    ? "bg-slate-900 text-white dark:bg-cyan-600 dark:border-cyan-500 border-slate-900 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                }`}
              >
                Nhân Viên CSKH
              </button>
              <button
                type="button"
                onClick={() => setRole("ADMIN")}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                  role === "ADMIN"
                    ? "bg-slate-900 text-white dark:bg-cyan-600 dark:border-cyan-500 border-slate-900 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                }`}
              >
                Quản Trị Viên
              </button>
            </div>
          </div>

          {/* Password & Confirm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Password Strength Meter */}
          {password && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Độ mạnh mật khẩu:</span>
                <span className={`font-bold ${
                  strength <= 1 ? "text-rose-500" : strength <= 2 ? "text-amber-500" : "text-emerald-500"
                }`}>
                  {strength <= 1 ? "Yếu" : strength <= 2 ? "Trung bình" : "Rất an toàn"}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 h-1">
                {[1, 2, 3, 4].map((stepIdx) => (
                  <div
                    key={stepIdx}
                    className={`h-full rounded-full transition-all ${
                      strength >= stepIdx
                        ? strength <= 1 ? "bg-rose-500" : strength <= 2 ? "bg-amber-500" : "bg-emerald-500"
                        : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Agreement Checkbox */}
          <div className="flex items-center gap-2 pt-1 text-xs text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              id="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-cyan-500"
            />
            <label htmlFor="terms" className="cursor-pointer">
              Tôi đồng ý với <span className="text-cyan-600 dark:text-cyan-400 underline">Điều khoản dịch vụ</span> & <span className="text-cyan-600 dark:text-cyan-400 underline">Chính sách bảo mật Austec</span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md hover:shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <span>Đang khởi tạo tài khoản bảo mật...</span> : (
              <>
                <span>Hoàn tất Đăng ký</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          <span>Đã có tài khoản? </span>
          <Link href="/login" className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
