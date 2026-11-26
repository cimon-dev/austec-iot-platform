"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { useCustomerAuth } from "@/customer/context/CustomerAuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import {
  User,
  Mail,
  Phone,
  Lock,
  MapPin,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Sun,
  Moon,
  Languages,
} from "lucide-react";
import { toast } from "sonner";

const PROVINCES = [
  "Hà Nội",
  "TP. Hồ Chí Minh",
  "Đà Nẵng",
  "Hải Phòng",
  "Cần Thơ",
  "Quảng Ninh",
  "Bắc Ninh",
  "Hưng Yên",
  "Thanh Hóa",
  "Nghệ An",
  "Đồng Nai",
  "Bình Dương",
  "Khánh Hòa",
  "Lâm Đồng",
  "Tỉnh/Thành khác",
];

export default function CustomerRegisterPage() {
  const router = useRouter();
  const { register, registerWithGoogle, authConfig } = useCustomerAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [province, setProvince] = useState("Hà Nội");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (password !== confirmPassword) {
      setErrorMsg("Mật khẩu nhập lại không khớp.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await register({
        fullName,
        email,
        phoneNumber,
        password,
        address,
        province,
      });
      if (res.success) {
        toast.success("Đăng ký tài khoản thành công! Vui lòng đăng nhập.");
        router.push("/login");
      } else {
        setErrorMsg(res.error || "Không thể đăng ký tài khoản.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full overflow-y-auto bg-[#F6F7F9] dark:bg-[#0D1015] text-[#11161F] dark:text-[#F3F5F8] flex flex-col justify-between p-6">
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <Link href="/login" className="flex items-center gap-2.5">
          <img src="/logo-app.webp" alt="Austec" className="w-8 h-8 rounded-xl" />
          <span className="font-extrabold text-sm">AUSTEC SMART HOME</span>
        </Link>
        <div className="flex items-center gap-2">
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

      <div className="w-full max-w-lg mx-auto my-8 p-6 sm:p-8 rounded-2xl border border-[#E2E6EC] dark:border-[#252D3A] bg-white dark:bg-[#151A22] shadow-xl space-y-5">
        <div>
          <h1 className="text-xl font-extrabold">
            {language === "vi" ? "Tạo tài khoản Gia chủ Austec" : "Create Austec Home Account"}
          </h1>
          <p className="text-xs text-[#525D6F] dark:text-[#9BA4B2] mt-1">
            {language === "vi"
              ? "Tài khoản dùng chung trên cả phiên bản Web và ứng dụng di động Austec Smart Home."
              : "One account for both Austec Web and Mobile App."}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold mb-1 text-[#525D6F] dark:text-[#9BA4B2]">
              Họ và tên gia chủ *
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3 text-[#7B8596]" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E2E6EC] dark:border-[#252D3A] bg-[#F6F7F9] dark:bg-[#1C232E] text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-[#525D6F] dark:text-[#9BA4B2]">
                Số điện thoại *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-3 text-[#7B8596]" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0912345678"
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-[#E2E6EC] dark:border-[#252D3A] bg-[#F6F7F9] dark:bg-[#1C232E] text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-[#525D6F] dark:text-[#9BA4B2]">
                Email nhận mã OTP *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[#7B8596]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@gmail.com"
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-[#E2E6EC] dark:border-[#252D3A] bg-[#F6F7F9] dark:bg-[#1C232E] text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-[#525D6F] dark:text-[#9BA4B2]">
                Tỉnh / Thành
              </label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E6EC] dark:border-[#252D3A] bg-[#F6F7F9] dark:bg-[#1C232E] text-sm focus:outline-none focus:border-blue-500"
              >
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1 text-[#525D6F] dark:text-[#9BA4B2]">
                Địa chỉ lắp đặt
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-[#7B8596]" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Số nhà, đường, khu đô thị..."
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-[#E2E6EC] dark:border-[#252D3A] bg-[#F6F7F9] dark:bg-[#1C232E] text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-[#525D6F] dark:text-[#9BA4B2]">
                Mật khẩu (≥ 6 ký tự) *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-[#7B8596]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-9 py-2 rounded-xl border border-[#E2E6EC] dark:border-[#252D3A] bg-[#F6F7F9] dark:bg-[#1C232E] text-sm focus:outline-none focus:border-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-[#7B8596]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-[#525D6F] dark:text-[#9BA4B2]">
                Nhập lại mật khẩu *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-[#7B8596]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E2E6EC] dark:border-[#252D3A] bg-[#F6F7F9] dark:bg-[#1C232E] text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Đăng ký tài khoản</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {authConfig.googleAuthEnabled && authConfig.googleWebClientId && (
          <div className="pt-2 flex flex-col items-center gap-2">
            <span className="text-[11px] text-[#7B8596]">Hoặc đăng ký nhanh bằng Google</span>
            <GoogleLogin
              onSuccess={async (cred) => {
                if (!cred.credential) return;
                const res = await registerWithGoogle(cred.credential, phoneNumber);
                if (res.success) {
                  toast.success("Đăng ký bằng Google thành công!");
                  router.push("/");
                } else {
                  setErrorMsg(res.error || "Lỗi đăng ký Google.");
                }
              }}
              onError={() => setErrorMsg("Lỗi kết nối Google.")}
              shape="pill"
            />
          </div>
        )}

        <div className="pt-3 border-t border-[#E2E6EC] dark:border-[#252D3A] text-center text-xs">
          <span className="text-[#525D6F] dark:text-[#9BA4B2]">Đã có tài khoản? </span>
          <Link href="/login" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>

      <div className="text-center text-xs text-[#7B8596] font-mono">
        Austec Smart Home Ecosystem • 2026
      </div>
    </div>
  );
}

