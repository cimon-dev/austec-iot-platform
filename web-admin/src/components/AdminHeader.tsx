"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useSidebar } from "../context/SidebarContext";
import { 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  Languages, 
  ShieldCheck, 
  User, 
  Check, 
  LogOut, 
  SlidersHorizontal,
  ChevronDown,
  Menu,
  Activity,
  KeyRound
} from "lucide-react";

export function AdminHeader() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, logout, quickSwitchRole } = useAuth();
  const { toggleSidebar } = useSidebar();

  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  const [alerts, setAlerts] = useState([
    {
      id: "alt-01",
      title: language === "vi" ? "Cửa cuốn Gara Đức Mạnh: Dòng điện 4.8A" : "Garage Door: Motor current spike 4.8A",
      time: "2 phút trước",
      type: "warning",
      read: false,
    },
    {
      id: "alt-02",
      title: language === "vi" ? "Khóa Titan X1: Kích hoạt OTP thành công" : "Smart Lock X1: Virtual OTP activated",
      time: "15 phút trước",
      type: "info",
      read: false,
    },
    {
      id: "alt-03",
      title: language === "vi" ? "Bản tin Blackbox: Đã băm khối SHA-256 #8824" : "Blackbox Audit: SHA-256 Block #8824 hashed",
      time: "1 giờ trước",
      type: "success",
      read: true,
    },
  ]);

  const unreadCount = alerts.filter(a => !a.read).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/devices?tab=list&search=${encodeURIComponent(searchQuery.trim())}`);
  };

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-12 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-4 md:px-5 flex items-center justify-between z-20 shrink-0 transition-colors">
      {/* Left: Mobile Sidebar trigger & Search Input */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors md:hidden"
        >
          <Menu className="w-4 h-4" />
        </button>

        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder={t("searchPlaceholder", "Tìm thiết bị, IMEI, khách hàng (⌘K)...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 rounded-lg pl-9 pr-10 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all shadow-inner"
          />
          <kbd className="hidden sm:inline-block absolute right-2.5 top-2 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-200 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700">
            ⌘K
          </kbd>
        </form>
      </div>

      {/* Right Controls: Language | Theme | Notifications | User Avatar Profile */}
      <div className="flex items-center gap-2">
        {/* Language Switcher Dropdown */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors shadow-sm cursor-pointer"
          >
            <Languages className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="uppercase text-[11px]">{language}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-1.5 w-36 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => { setLanguage("vi"); setShowLangMenu(false); }}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span>🇻🇳 Tiếng Việt</span>
                {language === "vi" && <Check className="w-3.5 h-3.5 text-cyan-500" />}
              </button>
              <button
                onClick={() => { setLanguage("en"); setShowLangMenu(false); }}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span>🇬🇧 English</span>
                {language === "en" && <Check className="w-3.5 h-3.5 text-cyan-500" />}
              </button>
            </div>
          )}
        </div>

        {/* Theme Dark / Light Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? t("themeLight", "Chuyển giao diện sáng") : t("themeDark", "Chuyển giao diện tối")}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all shadow-sm group cursor-pointer"
        >
          {theme === "dark" ? (
            <Sun className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-indigo-500 group-hover:-rotate-12 transition-transform duration-300" />
          )}
        </button>

        {/* Real-time Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 relative transition-colors shadow-sm cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-1.5 w-80 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white">
                  {t("notifications", "Thông báo thời gian thực")}
                </span>
                <button
                  onClick={() => setAlerts(prev => prev.map(a => ({ ...a, read: true })))}
                  className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  {t("allCaughtUp", "Đã đọc tất cả")}
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-72 overflow-y-auto">
                {alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className={`p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                      !alt.read ? "bg-cyan-50/50 dark:bg-cyan-950/20" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-medium text-slate-900 dark:text-slate-200 leading-snug text-[11px]">
                        {alt.title}
                      </p>
                      {!alt.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0 mt-1"></span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block font-mono">{alt.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar & Dropdown */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 pl-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors shadow-sm cursor-pointer"
          >
            <div className="w-6 h-6 rounded-md bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center font-bold text-[11px] border border-slate-700/60">
              {user?.fullName?.charAt(0) || "A"}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {user?.fullName?.split(" ").slice(-2).join(" ") || "Admin"}
              </div>
              <div className="text-[9px] font-mono text-cyan-600 dark:text-cyan-400 leading-tight">
                {user?.role || "MASTER ADMIN"}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-1.5 w-68 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg mb-2">
                <div className="font-bold text-slate-900 dark:text-white">{user?.fullName}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</div>
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  <span>ROLE: {user?.role}</span>
                </div>
              </div>

              {/* Quick Role Switcher (For testing/development) */}
              <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400">
                {language === "vi" ? "Chuyển vai trò thử nghiệm" : "Quick Role Switch"}
              </div>
              <div className="space-y-1 mb-2">
                <button
                  onClick={() => { quickSwitchRole("ADMIN"); setShowUserMenu(false); }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors ${
                    user?.role === "ADMIN" ? "bg-slate-200 dark:bg-slate-800 font-bold" : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <span>1. Master Administrator</span>
                  {user?.role === "ADMIN" && <Check className="w-3 h-3 text-cyan-500" />}
                </button>
                <button
                  onClick={() => { quickSwitchRole("CSKH"); setShowUserMenu(false); }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors ${
                    user?.role === "CSKH" ? "bg-slate-200 dark:bg-slate-800 font-bold" : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <span>2. CSKH Specialist Lead</span>
                  {user?.role === "CSKH" && <Check className="w-3 h-3 text-cyan-500" />}
                </button>
                <button
                  onClick={() => { quickSwitchRole("CUSTOMER"); setShowUserMenu(false); }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors ${
                    user?.role === "CUSTOMER" ? "bg-slate-200 dark:bg-slate-800 font-bold" : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <span>3. Mobile App End-User</span>
                  {user?.role === "CUSTOMER" && <Check className="w-3 h-3 text-cyan-500" />}
                </button>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-1">
                <button
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t("logout", "Đăng xuất tài khoản")}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
