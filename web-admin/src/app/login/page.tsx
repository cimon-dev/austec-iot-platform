"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { useCustomerAuth } from "@/customer/context/CustomerAuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import {
  Home,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Sun,
  Moon,
  Languages,
  Loader2,
  ShieldCheck,
  Smartphone,
  DoorOpen,
  Video,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export default function CustomerLoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle, authConfig, isAuthenticated } = useCustomerAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("austec_last_customer_identifier");
      if (saved) setIdentifier(saved);
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const res = await login(identifier, password);
      if (res.success) {
        toast.success(
          language === "vi"
            ? "Đăng nhập thành công! Chào mừng về nhà."
            : "Signed in successfully! Welcome home."
        );
        router.push("/");
      } else {
        setErrorMsg(res.error || "Đăng nhập thất bại.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async (credential?: string) => {
    if (!credential) return;
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const res = await loginWithGoogle(credential);
      if (res.success) {
        toast.success("Đăng nhập Google thành công!");
        router.push("/");
      } else {
        setErrorMsg(res.error || "Đăng nhập Google thất bại.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full overflow-y-auto bg-[#F6F7F9] dark:bg-[#0D1015] text-[#11161F] dark:text-[#F3F5F8] flex flex-col lg:flex-row">
      {/* Left Showcase Panel (Desktop) */}
      <div className="hidden lg:flex lg:w-7/12 relative overflow-hidden bg-[#151A22] text-white p-12 flex-col justify-between border-r border-[#252D3A]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center p-2 shadow-lg">
            <img src="/logo-app.webp" alt="Austec" className="w-full h-full object-contain rounded" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight">AUSTEC SMART HOME</h1>
            <p className="text-xs text-[#9BA4B2] font-mono">Web Desktop Cockpit • Cloud & Realtime IoT</p>
          </div>
        </div>

        <div className="max-w-xl space-y-6 my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/15 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            <Home className="w-3.5 h-3.5" />
            <span>
              {language === "vi"
                ? "Hệ sinh thái Nhà thông minh Austec trên trình duyệt"
                : "Austec Smart Home Ecosystem on Web"}
            </span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight">
            {language === "vi"
              ? "Điều khiển toàn bộ ngôi nhà của bạn trực quan chỉ với 1 cú nhấp chuột."
              : "Control your entire smart home intuitively with one-click precision."}
          </h2>

          <p className="text-sm text-[#9BA4B2] leading-relaxed">
            {language === "vi"
              ? "Đồng bộ tức thời với ứng dụng di động Austec Smart Home: vận hành cửa cuốn, giám sát dàn Camera WebRTC 4K, theo dõi công tơ chống giật & hệ thống Pin BMS 16S, phân quyền thành viên gia đình và chat trực tiếp với kỹ thuật viên CSKH."
              : "Real-time synchronization with the Austec mobile app: operate roller doors, monitor 4K WebRTC camera walls, inspect SmartMetter & 16S BMS battery cells, manage family permissions, and chat live with support."}
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-[#1C232E] border border-[#252D3A] space-y-1.5">
              <DoorOpen className="w-5 h-5 text-blue-400" />
              <div className="text-xs font-bold">Cửa cuốn & Ổ cắm</div>
              <p className="text-[11px] text-[#9BA4B2]">Điều khiển 1-Click, khóa trẻ em & lịch sử hộp đen</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#1C232E] border border-[#252D3A] space-y-1.5">
              <Video className="w-5 h-5 text-cyan-400" />
              <div className="text-xs font-bold">Camera Wall 4K</div>
              <p className="text-[11px] text-[#9BA4B2]">Xem đồng thời 4–9 camera trực tiếp trên màn hình lớn</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#1C232E] border border-[#252D3A] space-y-1.5">
              <Zap className="w-5 h-5 text-amber-400" />
              <div className="text-xs font-bold">Công tơ & BMS 16S</div>
              <p className="text-[11px] text-[#9BA4B2]">Giám sát điện năng kW, điện áp từng cell & cảnh báo</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[#6B7484] font-mono">
          <span>© 2026 AUSTEC GROUP • All rights reserved</span>
          <Link href="/admin/login" className="text-[#9BA4B2] hover:text-white flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Cổng Quản Trị Viên & CSKH (/admin) &rarr;</span>
          </Link>
        </div>
      </div>

      {/* Right Login Card */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 lg:hidden">
            <img src="/logo-app.webp" alt="Austec" className="w-8 h-8 rounded-xl" />
            <span className="font-extrabold text-sm">AUSTEC SMART HOME</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#E2E6EC] dark:border-[#252D3A] text-xs font-semibold cursor-pointer"
            >
              <Languages className="w-3.5 h-3.5 text-blue-500" />
              <span className="uppercase">{language}</span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-[#E2E6EC] dark:border-[#252D3A] cursor-pointer"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto my-auto space-y-6">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              {language === "vi" ? "Đăng nhập Nhà của tôi" : "Sign in to My Home"}
            </h2>
            <p className="text-xs text-[#525D6F] dark:text-[#9BA4B2] mt-1">
              {language === "vi"
                ? "Sử dụng tài khoản ứng dụng Austec Smart Home (hoặc tài khoản nội bộ của bạn)."
                : "Use your Austec Smart Home mobile account to continue."}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[#525D6F] dark:text-[#9BA4B2]">
                {language === "vi" ? "Số điện thoại hoặc Email" : "Phone Number or Email"}
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-[#7B8596]" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="0912345678 hoặc email@domain.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2E6EC] dark:border-[#252D3A] bg-white dark:bg-[#1C232E] text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#525D6F] dark:text-[#9BA4B2]">
                  {language === "vi" ? "Mật khẩu" : "Password"}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {language === "vi" ? "Quên mật khẩu?" : "Forgot password?"}
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-[#7B8596]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E2E6EC] dark:border-[#252D3A] bg-white dark:bg-[#1C232E] text-sm focus:outline-none focus:border-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#7B8596] hover:text-[#11161F] dark:hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{language === "vi" ? "Vào Bảng Điều Khiển Nhà" : "Sign In"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {authConfig.googleAuthEnabled && authConfig.googleWebClientId && (
            <div className="space-y-3">
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#E2E6EC] dark:border-[#252D3A]" />
                <span className="flex-shrink mx-3 text-[11px] text-[#7B8596]">
                  {language === "vi" ? "Hoặc tiếp tục với" : "Or continue with"}
                </span>
                <div className="flex-grow border-t border-[#E2E6EC] dark:border-[#252D3A]" />
              </div>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={(res) => handleGoogleLogin(res.credential)}
                  onError={() => setErrorMsg("Không thể xác thực với Google.")}
                  theme={theme === "dark" ? "filled_black" : "outline"}
                  shape="pill"
                  size="large"
                />
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-[#E2E6EC] dark:border-[#252D3A] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <span className="text-[#525D6F] dark:text-[#9BA4B2]">
              {language === "vi" ? "Chưa có tài khoản gia chủ?" : "Don't have an account?"}
            </span>
            <Link href="/register" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
              {language === "vi" ? "Đăng ký tài khoản mới &rarr;" : "Create an account &rarr;"}
            </Link>
          </div>
        </div>

        <div className="text-center lg:hidden pt-4 border-t border-[#E2E6EC] dark:border-[#252D3A]">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs text-[#525D6F] dark:text-[#9BA4B2] hover:underline"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
            <span>Dành cho Quản trị viên & CSKH (/admin)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

