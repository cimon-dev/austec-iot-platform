"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { 
  LayoutDashboard, 
  Layers, 
  Cpu, 
  Sliders, 
  Box, 
  FileSpreadsheet, 
  Radio, 
  Headphones, 
  ShieldAlert, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  LogOut,
  ShieldCheck,
  Server,
  Bell,
  Settings,
  UserCheck,
  KeyRound,
  ShoppingBag,
  UploadCloud,
  BookOpen,
  X
} from "lucide-react";

import { usePermissions } from "../context/PermissionContext";

function SidebarNavigation({ 
  isCollapsed, 
  pathname,
  onNavigate
}: { 
  isCollapsed: boolean; 
  pathname: string;
  onNavigate?: () => void;
}) {
  const { t, language } = useLanguage();
  const { canView } = usePermissions();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "list";

  const [deviceMenuOpen, setDeviceMenuOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(true);

  const deviceSubmodules = [
    { id: "groups", label: language === "vi" ? "Nhóm sản phẩm" : "Product Groups", href: "/devices?tab=groups" },
    { id: "types", label: language === "vi" ? "Loại phần cứng" : "Hardware Types", href: "/devices?tab=types" },
    { id: "properties", label: language === "vi" ? "Từ điển thuộc tính" : "Schema Properties", href: "/devices?tab=properties" },
    { id: "models", label: language === "vi" ? "Mẫu thương phẩm" : "Device Models", href: "/devices?tab=models" },
    { id: "import", label: language === "vi" ? "Nhập kho & Tem QR" : "Excel & QR Decals", href: "/devices?tab=import" },
    { id: "list", label: language === "vi" ? "Danh sách thiết bị" : "Device Inventory", href: "/devices?tab=list" },
    { id: "firmware", label: language === "vi" ? "Quản lý Firmware & OTA" : "Firmware & OTA", href: "/devices/firmware" },
    { id: "pairing", label: language === "vi" ? "Lab ghép nối ESP32" : "Hardware Lab & Test", href: "/devices/pairing-lab" },
  ];

  const userSubmodules = [
    { label: language === "vi" ? "Cán bộ quản trị" : "Admin Staff", href: "/users/admin" },
    { label: language === "vi" ? "Vai trò & Phân quyền" : "Roles & Permissions", href: "/users/roles" },
    { label: language === "vi" ? "Khách hàng" : "Customers", href: "/customers?tab=accounts" },
    { label: language === "vi" ? "Phân quyền Gia đình & TB" : "Family Access & RBAC", href: "/customers?tab=matrix" },
  ];

  return (
    <nav className="p-2 space-y-1.5 overflow-y-auto max-h-[calc(100vh-140px)]">
      {/* 1. Main Dashboard */}
      {canView("mod_dash") && (
        <div>
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all group relative ${
              pathname === "/dashboard" 
                ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 shrink-0 ${pathname === "/dashboard" ? "text-cyan-400" : "text-slate-500"}`} />
            {!isCollapsed && <span className="truncate">{t("dashboard", "Dashboard Tổng quan")}</span>}
          </Link>
        </div>
      )}

      {/* 2. Device Management (Collapsible) */}
      {canView("mod_dev") && (
        <div>
          {!isCollapsed ? (
            <div>
              <button
                type="button"
                onClick={() => setDeviceMenuOpen(!deviceMenuOpen)}
                className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-cyan-500" />
                  <span>{t("devices", "Quản lý thiết bị")}</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${deviceMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {deviceMenuOpen && (
                <div className="mt-0.5 space-y-0.5 pl-2 border-l border-slate-200 dark:border-slate-800 ml-2.5">
                  {deviceSubmodules.map((sub) => {
                    const isSubActive = pathname === "/devices" && currentTab === sub.id;
                    return (
                      <Link
                        key={sub.id}
                        href={sub.href}
                        onClick={onNavigate}
                        className={`flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          isSubActive
                            ? "bg-indigo-600 text-white font-semibold shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <span className="truncate">{sub.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/devices?tab=list"
              onClick={onNavigate}
              title="Quản lý thiết bị"
              className={`flex items-center justify-center p-2 rounded-lg transition-colors ${
                pathname.startsWith("/devices")
                  ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Radio className="w-4 h-4 text-cyan-400" />
            </Link>
          )}
        </div>
      )}

      {/* 3. User & Access Management (Collapsible) */}
      {canView("mod_user") && (
        <div>
          {!isCollapsed ? (
            <div>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-purple-500" />
                  <span>Người dùng & Quyền</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {userMenuOpen && (
                <div className="mt-0.5 space-y-0.5 pl-2 border-l border-slate-200 dark:border-slate-800 ml-2.5">
                  {userSubmodules.map((sub) => {
                    const isSubActive = sub.href.includes("?tab=")
                      ? pathname === "/customers" && (searchParams.get("tab") || "accounts") === sub.href.split("tab=")[1]
                      : pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={onNavigate}
                        className={`flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          isSubActive
                            ? "bg-purple-600 text-white font-semibold shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <span className="truncate">{sub.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/users/admin"
              onClick={onNavigate}
              title="Quản lý người dùng"
              className={`flex items-center justify-center p-2 rounded-lg transition-colors ${
                pathname.startsWith("/users") || pathname === "/customers"
                  ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Users className="w-4 h-4 text-purple-400" />
            </Link>
          )}
        </div>
      )}

      {/* 4. Notification Center */}
      {canView("mod_noti") && (
        <div>
          <Link
            href="/notifications"
            onClick={onNavigate}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all group ${
              pathname === "/notifications"
                ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <Bell className={`w-4 h-4 shrink-0 ${pathname === "/notifications" ? "text-amber-400" : "text-slate-500"}`} />
              {!isCollapsed && <span className="truncate">Thông Báo (Push Hub)</span>}
            </div>
          </Link>
        </div>
      )}

      {/* 5. Operations & Support */}
      {(canView("mod_cskh") || canView("mod_audit")) && (
        <div className="pt-1">
          {!isCollapsed && (
            <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {language === "vi" ? "Vận hành & Giám sát" : "Operations & Audit"}
            </div>
          )}

          <div className="space-y-0.5">
            {canView("mod_cskh") && (
              <Link
                href="/cskh"
                onClick={onNavigate}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  pathname.startsWith("/cskh")
                    ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <Headphones className={`w-4 h-4 shrink-0 ${pathname.startsWith("/cskh") ? "text-rose-400" : "text-slate-500"}`} />
                  {!isCollapsed && <span className="truncate">{t("cskhHub", "CSKH Hub & Live Chat")}</span>}
                </div>
              </Link>
            )}

            {canView("mod_audit") && (
              <Link
                href="/blackbox"
                onClick={onNavigate}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  pathname.startsWith("/blackbox")
                    ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <ShieldAlert className={`w-4 h-4 shrink-0 ${pathname.startsWith("/blackbox") ? "text-amber-400" : "text-slate-500"}`} />
                  {!isCollapsed && <span className="truncate">{t("blackbox", "Hộp đen Kiểm toán")}</span>}
                </div>
              </Link>
            )}

            {canView("mod_dev") && (
              <Link
                href="/store"
                onClick={onNavigate}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  pathname.startsWith("/store")
                    ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <ShoppingBag className={`w-4 h-4 shrink-0 ${pathname.startsWith("/store") ? "text-cyan-400" : "text-slate-500"}`} />
                  {!isCollapsed && <span className="truncate">{language === "vi" ? "Gian Hàng & Thương Phẩm" : "Store & Catalog"}</span>}
                </div>
              </Link>
            )}

            {canView("mod_dev") && (
              <Link
                href="/guides"
                onClick={onNavigate}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  pathname.startsWith("/guides")
                    ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <BookOpen className={`w-4 h-4 shrink-0 ${pathname.startsWith("/guides") ? "text-emerald-400" : "text-slate-500"}`} />
                  {!isCollapsed && <span className="truncate">{language === "vi" ? "Hướng Dẫn Lắp Đặt & Reset" : "Install & Reset Manuals"}</span>}
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* 6. Settings */}
      {canView("mod_setting") && (
        <div className="pt-0.5">
          <Link
            href="/settings"
            onClick={onNavigate}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              pathname === "/settings"
                ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <Settings className={`w-4 h-4 shrink-0 ${pathname === "/settings" ? "text-cyan-400" : "text-slate-500"}`} />
            {!isCollapsed && <span className="truncate">Cài Đặt Hệ Thống</span>}
          </Link>
        </div>
      )}
    </nav>
  );
}

export function Sidebar() {
  const { isCollapsed, toggleSidebar, isMobileOpen, closeMobileSidebar } = useSidebar();
  const { t, language } = useLanguage();
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Auto-close mobile sidebar when navigating to a new route
  React.useEffect(() => {
    closeMobileSidebar();
  }, [pathname]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Responsive Sidebar / Mobile Drawer */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col justify-between transition-all duration-300 ease-in-out border-r
          bg-white/95 dark:bg-slate-950/95 backdrop-blur-md
          border-slate-200/80 dark:border-slate-800/70 shadow-2xl md:shadow-sm
          ${isMobileOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0"}
          ${isCollapsed ? "md:w-20" : "md:w-64"}`}
      >
        {/* Top Header & Brand */}
        <div>
          <div className="h-12 flex items-center justify-between px-3 md:px-4 border-b border-slate-200/80 dark:border-slate-800/70">
            <Link
              href="/"
              onClick={closeMobileSidebar}
              className="flex items-center gap-2.5 overflow-hidden group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-800 text-white border border-slate-700/60 dark:border-slate-700/80 flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform shrink-0">
                <span className="bg-gradient-to-tr from-cyan-400 to-indigo-400 bg-clip-text text-transparent">A</span>
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="animate-in fade-in duration-200">
                  <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    AUSTEC
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20">
                      CLOUD
                    </span>
                  </span>
                  <span className="text-[10px] block text-slate-500 dark:text-slate-400 font-mono tracking-wider">
                    IOT ENTERPRISE
                  </span>
                </div>
              )}
            </Link>

            <div className="flex items-center gap-1">
              {/* Close Button on Mobile Drawer */}
              <button
                type="button"
                onClick={closeMobileSidebar}
                title="Đóng thanh điều hướng"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors md:hidden cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Toggle Sidebar Collapse Button (Desktop only) */}
              <button
                type="button"
                onClick={toggleSidebar}
                title={isCollapsed ? t("expandSidebar", "Mở rộng sidebar") : t("collapseSidebar", "Thu gọn sidebar")}
                className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 cursor-pointer"
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Navigation Items wrapped in Suspense for searchParams safe usage */}
          <Suspense fallback={<div className="p-4 text-xs text-slate-400">Loading nav...</div>}>
            <SidebarNavigation
              isCollapsed={isMobileOpen ? false : isCollapsed}
              pathname={pathname}
              onNavigate={closeMobileSidebar}
            />
          </Suspense>
        </div>

        {/* Bottom Infrastructure & User Identity */}
        <div className="p-2.5 border-t border-slate-200/80 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/50 space-y-1.5">
          {!isCollapsed || isMobileOpen ? (
            <>
              <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>MQTT: 8883 TLS</span>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">&lt; 0.3ms</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {user?.fullName?.charAt(0) || "A"}
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-semibold block text-slate-900 dark:text-slate-100 truncate">
                      {user?.fullName || "AUSTEC Admin"}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono uppercase">
                      {user?.role || "Administrator"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={logout}
                  title="Đăng xuất"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div 
                title={user?.fullName || "Admin"}
                className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs"
              >
                {user?.fullName?.charAt(0) || "A"}
              </div>
              <button
                onClick={logout}
                title="Đăng xuất"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
