"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { useCustomerIoT } from "../context/CustomerIoTContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { getDeviceStateSummary } from "../types/device";
import {
  Home,
  Video,
  Zap,
  Users,
  MessageSquare,
  ShoppingBag,
  PlusCircle,
  User,
  Settings,
  ShieldAlert,
  Search,
  Bell,
  Sun,
  Moon,
  Languages,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ShieldCheck,
  Wifi,
  WifiOff,
  Clock,
  DoorOpen,
  Power,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

const PUBLIC_CUSTOMER_PATHS = ["/login", "/register", "/forgot-password"];

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useCustomerAuth();
  const {
    devices,
    allDevicesWithEnergySamples,
    notifications,
    wsConnected,
    markNotificationRead,
    sendCommand,
    triggerEmergencyLockdown,
  } = useCustomerIoT();
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clockText, setClockText] = useState("");
  const [showNotiPopover, setShowNotiPopover] = useState(false);
  const [showUserPopover, setShowUserPopover] = useState(false);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState("");
  const [isLockingDown, setIsLockingDown] = useState(false);

  const notiRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const isPublicRoute = PUBLIC_CUSTOMER_PATHS.includes(pathname);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicRoute) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, isPublicRoute, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClockText(
        `${String(now.getHours()).padStart(2, "0")}:${String(
          now.getMinutes()
        ).padStart(2, "0")}`
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowQuickSearch((v) => !v);
      } else if (e.key === "Escape") {
        setShowQuickSearch(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (notiRef.current && !notiRef.current.contains(e.target as Node)) {
        setShowNotiPopover(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserPopover(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (isPublicRoute) {
    return <div className="h-screen w-screen overflow-y-auto">{children}</div>;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0D1015] text-[#F3F5F8]">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <div className="w-10 h-10 rounded-xl bg-[#151A22] border border-white/10 flex items-center justify-center text-blue-500">
            <Home className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-[#F3F5F8]">
            {language === "vi" ? "Đang tải không gian nhà thông minh" : "Loading smart home"}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0D1015] text-[#F3F5F8]">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <p className="text-sm text-[#9BA4B2]">
            {language === "vi" ? "Đang chuyển tới trang đăng nhập" : "Redirecting to sign in"}
          </p>
          <Link
            href="/login"
            className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white"
          >
            {language === "vi" ? "Đăng nhập" : "Sign in"}
          </Link>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: "/", label: language === "vi" ? "Bảng điều khiển" : "Control center", icon: Home, exact: true },
    { href: "/cameras", label: language === "vi" ? "Camera an ninh" : "Cameras", icon: Video },
    { href: "/energy", label: language === "vi" ? "Năng lượng & BMS" : "Energy & BMS", icon: Zap },
    { href: "/family", label: language === "vi" ? "Chia sẻ gia đình" : "Family", icon: Users },
    { href: "/chat", label: language === "vi" ? "Tin nhắn & CSKH" : "Messages", icon: MessageSquare },
    { href: "/shop", label: language === "vi" ? "Gian hàng" : "Store", icon: ShoppingBag },
    { href: "/pair", label: language === "vi" ? "Thêm thiết bị" : "Pair device", icon: PlusCircle },
    { href: "/profile", label: language === "vi" ? "Hồ sơ & bảo mật" : "Profile", icon: User },
    { href: "/settings", label: language === "vi" ? "Cài đặt" : "Settings", icon: Settings },
  ];

  const onlineCount = allDevicesWithEnergySamples.filter((d) => d.isOnline).length;
  const totalCount = allDevicesWithEnergySamples.length;
  const unreadNotiCount = notifications.filter((n) => !n.is_read && !n.isRead).length;

  const handleEmergencyLockdown = async () => {
    const doorCount = devices.filter((d) => d.category === "rollerDoor").length;
    if (doorCount === 0) {
      toast.info(
        language === "vi"
          ? "Chưa có thiết bị cửa cuốn để khóa khẩn cấp"
          : "No roller doors available"
      );
      return;
    }
    setIsLockingDown(true);
    try {
      const affected = await triggerEmergencyLockdown();
      toast.success(
        language === "vi"
          ? `Đã bật khóa an toàn cho ${affected} cửa cuốn`
          : `Locked ${affected} roller doors`
      );
    } finally {
      setIsLockingDown(false);
    }
  };

  const filteredSearchDevices = allDevicesWithEnergySamples.filter((d) => {
    if (!quickSearchQuery.trim()) return true;
    const q = quickSearchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.hardwareId.toLowerCase().includes(q) ||
      d.roomName.toLowerCase().includes(q) ||
      d.modelName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F6F7F9] dark:bg-[#0D1015] text-[#11161F] dark:text-[#F3F5F8] antialiased">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Quiet Desktop Sidebar (224px / 64px collapsed, strict 4px rhythm) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col justify-between border-r border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#11151C] transition-[width,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] shrink-0 ${
          mobileMenuOpen ? "translate-x-0 w-56" : "-translate-x-full md:translate-x-0"
        } ${isCollapsed ? "md:w-16" : "md:w-56"}`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Brand Row (h-12 = 48px) */}
          <div className="h-12 flex items-center justify-between px-3 border-b border-black/[0.08] dark:border-white/[0.08] shrink-0">
            <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-[#1C232E] dark:bg-[#1C232E] border border-white/10 flex items-center justify-center p-1 shrink-0">
                <img src="/logo-app.webp" alt="Austec" className="w-full h-full object-contain rounded-xs" />
              </div>
              {(!isCollapsed || mobileMenuOpen) && (
                <span className="text-[14px] font-semibold tracking-tight truncate text-[#11161F] dark:text-[#F3F5F8]">
                  Austec Home
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-[#7B8596] hover:text-[#11161F] dark:hover:text-[#F3F5F8] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
              title={isCollapsed ? "Mở rộng" : "Thu gọn"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-[#7B8596]"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* Nav Links (34px height, 2px gap, aligned 16px icons) */}
          <nav className="p-2 space-y-0.5 overflow-y-auto flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`h-9 flex items-center gap-2.5 px-2.5 rounded-lg text-[13px] transition-colors ${
                    isActive
                      ? "bg-[#EEF1F5] dark:bg-[#1C232E] text-[#11161F] dark:text-[#F3F5F8] font-semibold border border-black/[0.06] dark:border-white/[0.08]"
                      : "text-[#525D6F] dark:text-[#9BA4B2] font-normal hover:text-[#11161F] dark:hover:text-[#F3F5F8] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="w-4 flex items-center justify-center shrink-0">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? "text-blue-600 dark:text-blue-400" : "text-[#7B8596]"
                      }`}
                      strokeWidth={1.5}
                    />
                  </span>
                  {(!isCollapsed || mobileMenuOpen) && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-2 border-t border-black/[0.08] dark:border-white/[0.08] space-y-1.5 shrink-0">
          <button
            type="button"
            disabled={isLockingDown}
            onClick={handleEmergencyLockdown}
            title={language === "vi" ? "Khóa khẩn cấp toàn bộ cửa cuốn" : "Lock all doors"}
            className="w-full h-9 flex items-center justify-center gap-2 px-2.5 rounded-lg bg-rose-600/10 hover:bg-rose-600/15 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-medium transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            {(!isCollapsed || mobileMenuOpen) && (
              <span className="truncate">
                {language === "vi" ? "Khóa khẩn cấp cửa" : "Lock all doors"}
              </span>
            )}
          </button>

          {(user?.role === "ADMIN" || user?.role === "CSKH") && (
            <Link
              href="/admin"
              title="Mở Cổng Quản Trị (/admin)"
              className="w-full h-9 flex items-center justify-center gap-2 px-2.5 rounded-lg bg-[#EEF1F5] dark:bg-[#1C232E] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-[#11161F] dark:text-[#F3F5F8] text-xs font-medium border border-black/[0.06] dark:border-white/[0.08] transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" strokeWidth={1.5} />
              {(!isCollapsed || mobileMenuOpen) && (
                <>
                  <span className="truncate">Quản trị (/admin)</span>
                  <ExternalLink className="w-3 h-3 ml-auto text-[#7B8596]" strokeWidth={1.5} />
                </>
              )}
            </Link>
          )}
        </div>
      </aside>

      {/* Main Viewport Container (100vh strictly constrained) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Quiet Top Header (h-12 = 48px) */}
        <header className="h-12 border-b border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] px-3 flex items-center justify-between gap-3 shrink-0 z-20">
          <div className="flex items-center gap-2.5 flex-1 min-w-0 max-w-md">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-[#525D6F] dark:text-[#9BA4B2]"
            >
              <Menu className="w-4 h-4" strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={() => setShowQuickSearch(true)}
              className="w-full h-8 flex items-center justify-between gap-2 px-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs text-[#7B8596] hover:border-blue-500/40 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                <span className="truncate">
                  {language === "vi" ? "Tìm thiết bị" : "Search devices"}
                </span>
              </span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-[#151A22] rounded border border-black/[0.08] dark:border-white/[0.08] text-[#7B8596]">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right Quiet Meta & Controls */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 px-2.5 h-8 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] border border-black/[0.06] dark:border-white/[0.06] text-xs font-mono tabular-nums text-[#525D6F] dark:text-[#9BA4B2]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  onlineCount > 0 ? "bg-emerald-500" : "bg-[#7B8596]"
                }`}
              />
              <span>
                {onlineCount}/{totalCount}
              </span>
              <span className="opacity-30">|</span>
              <span className="flex items-center gap-1 text-[11px]">
                {wsConnected ? (
                  <Wifi className="w-3 h-3 text-emerald-500" strokeWidth={1.5} />
                ) : (
                  <WifiOff className="w-3 h-3 text-amber-500" strokeWidth={1.5} />
                )}
                <span>{clockText}</span>
              </span>
            </div>

            <Link
              href="/pair"
              className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>{language === "vi" ? "Thêm thiết bị" : "Add device"}</span>
            </Link>

            <button
              type="button"
              onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
              className="h-8 px-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-xs font-mono text-[#525D6F] dark:text-[#9BA4B2] transition-colors cursor-pointer"
              title="Chuyển ngôn ngữ"
            >
              {language.toUpperCase()}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-[#525D6F] dark:text-[#9BA4B2] transition-colors cursor-pointer"
              title={theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <Moon className="w-4 h-4" strokeWidth={1.5} />
              )}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notiRef}>
              <button
                type="button"
                onClick={() => setShowNotiPopover(!showNotiPopover)}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-[#525D6F] dark:text-[#9BA4B2] relative transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" strokeWidth={1.5} />
                {unreadNotiCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-mono font-medium flex items-center justify-center">
                    {unreadNotiCount}
                  </span>
                )}
              </button>

              {showNotiPopover && (
                <div className="absolute right-0 mt-1.5 w-80 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
                    <span className="text-xs font-semibold">
                      {language === "vi" ? "Thông báo" : "Notifications"}
                    </span>
                    <span className="text-[11px] font-mono text-[#7B8596]">
                      {notifications.length}
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                    {notifications.length === 0 ? (
                      <div className="p-5 text-center text-xs text-[#7B8596]">
                        {language === "vi" ? "Không có thông báo mới" : "No notifications"}
                      </div>
                    ) : (
                      notifications.map((n: any) => {
                        const isRead = Boolean(n.is_read || n.isRead);
                        return (
                          <div
                            key={n.id}
                            onClick={() => {
                              if (!isRead) markNotificationRead(String(n.id));
                              if (n.actionType === "OPEN_SHOP") router.push("/shop");
                              else if (n.actionType === "CONSULT_CSKH") router.push("/chat");
                              setShowNotiPopover(false);
                            }}
                            className={`p-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors cursor-pointer ${
                              !isRead ? "bg-blue-500/[0.04]" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-medium">{n.title}</span>
                              {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                            </div>
                            <p className="text-[11px] text-[#525D6F] dark:text-[#9BA4B2] mt-1 line-clamp-2">
                              {n.message || n.body}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative" ref={userRef}>
              <button
                type="button"
                onClick={() => setShowUserPopover(!showUserPopover)}
                className="h-8 flex items-center gap-2 pl-1.5 pr-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <div className="w-5 h-5 rounded-md bg-blue-600 text-white font-semibold text-[11px] flex items-center justify-center overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    user?.fullName?.charAt(0) || "U"
                  )}
                </div>
                <span className="hidden sm:inline text-xs font-medium max-w-[100px] truncate">
                  {user?.fullName}
                </span>
              </button>

              {showUserPopover && (
                <div className="absolute right-0 mt-1.5 w-60 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] shadow-xl p-1.5 z-50 text-xs">
                  <div className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] mb-1">
                    <div className="font-semibold truncate">{user?.fullName}</div>
                    <div className="text-[11px] text-[#7B8596] truncate font-mono">
                      {user?.email || user?.phoneNumber}
                    </div>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setShowUserPopover(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                  >
                    <User className="w-3.5 h-3.5 text-[#7B8596]" strokeWidth={1.5} />
                    <span>Hồ sơ & bảo mật</span>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setShowUserPopover(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#7B8596]" strokeWidth={1.5} />
                    <span>Cài đặt thiết bị</span>
                  </Link>
                  {(user?.role === "ADMIN" || user?.role === "CSKH") && (
                    <Link
                      href="/admin"
                      onClick={() => setShowUserPopover(false)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-blue-500"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Cổng Quản trị (/admin)</span>
                    </Link>
                  )}
                  <div className="my-1 border-t border-black/[0.06] dark:border-white/[0.06]" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserPopover(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-rose-500/10 text-rose-500 font-medium cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Strict 100vh Main Content Slot — NO FULL-PAGE SCROLL */}
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col p-3">
          {children}
        </main>
      </div>

      {/* Quick Command Search Modal (Ctrl+K) */}
      {showQuickSearch && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/65 pt-16 p-4"
          onClick={() => setShowQuickSearch(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#151A22] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center gap-2">
              <Search className="w-4 h-4 text-[#7B8596] shrink-0" strokeWidth={1.5} />
              <input
                type="text"
                value={quickSearchQuery}
                onChange={(e) => setQuickSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, phòng hoặc mã thiết bị"
                className="w-full bg-transparent text-sm focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowQuickSearch(false)}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#EEF1F5] dark:bg-[#1C232E] text-[#7B8596]"
              >
                ESC
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-black/[0.06] dark:divide-white/[0.06]">
              {filteredSearchDevices.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#7B8596]">
                  Không tìm thấy thiết bị phù hợp
                </div>
              ) : (
                filteredSearchDevices.map((dev) => (
                  <div
                    key={dev.hardwareId}
                    className="p-2.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] flex items-center justify-between gap-2"
                  >
                    <div
                      onClick={() => {
                        setShowQuickSearch(false);
                        router.push(`/devices/${encodeURIComponent(dev.hardwareId)}`);
                      }}
                      className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#EEF1F5] dark:bg-[#1C232E] flex items-center justify-center shrink-0 text-[#525D6F] dark:text-[#9BA4B2]">
                        {dev.category === "rollerDoor" ? (
                          <DoorOpen className="w-4 h-4" strokeWidth={1.5} />
                        ) : dev.category === "camera" ? (
                          <Video className="w-4 h-4" strokeWidth={1.5} />
                        ) : dev.category === "energyManage" ? (
                          <Zap className="w-4 h-4" strokeWidth={1.5} />
                        ) : (
                          <Power className="w-4 h-4" strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{dev.name}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#7B8596]">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              dev.isOnline ? "bg-emerald-500" : "bg-[#7B8596]"
                            }`}
                          />
                          <span className={dev.isOnline ? "text-emerald-500" : "text-[#7B8596]"}>
                            {dev.isOnline ? "Trực tuyến" : "Ngoại tuyến"}
                          </span>
                          <span>·</span>
                          <span className="truncate">{getDeviceStateSummary(dev, language)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {dev.category === "rollerDoor" && (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              const r = await sendCommand(dev.hardwareId, "OPEN_DOOR");
                              r.success ? toast.success(r.message) : toast.error(r.message);
                            }}
                            className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium cursor-pointer"
                          >
                            Mở
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const r = await sendCommand(dev.hardwareId, "STOP_DOOR");
                              r.success ? toast.success(r.message) : toast.error(r.message);
                            }}
                            className="px-2 py-1 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-medium cursor-pointer"
                          >
                            Dừng
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const r = await sendCommand(dev.hardwareId, "CLOSE_DOOR");
                              r.success ? toast.success(r.message) : toast.error(r.message);
                            }}
                            className="px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium cursor-pointer"
                          >
                            Đóng
                          </button>
                        </>
                      )}
                      {dev.category === "lightSwitch" && (
                        <button
                          type="button"
                          onClick={async () => {
                            const r = await sendCommand(dev.hardwareId, "TOGGLE_RELAY");
                            r.success ? toast.success(r.message) : toast.error(r.message);
                          }}
                          className="px-2.5 py-1 rounded-md bg-blue-600 text-white text-[11px] font-medium cursor-pointer"
                        >
                          {dev.isRelayOn ? "Tắt" : "Bật"}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
