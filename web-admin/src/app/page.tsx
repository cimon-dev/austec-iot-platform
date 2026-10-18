"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { 
  Radio, 
  Layers, 
  ShieldCheck, 
  Headphones, 
  Bell, 
  Users, 
  ArrowRight, 
  Server, 
  Lock
} from "lucide-react";

export default function WelcomePortalPage() {
  const { user } = useAuth();
  const { language } = useLanguage();

  const modules = [
    {
      title: language === "vi" ? "Dashboard Giám Sát" : "Telemetry Dashboard",
      desc: language === "vi" ? "Trạng thái On/Off, bản đồ tọa độ và thông số SLA" : "Live metrics, geo-telemetry and broker SLA",
      href: "/dashboard",
      icon: Radio,
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-50 dark:bg-cyan-950/40",
      border: "hover:border-cyan-500/50"
    },
    {
      title: language === "vi" ? "Quản Lý Thiết Bị" : "Device Management",
      desc: language === "vi" ? "Nhóm sản phẩm, model, schema và nhập kho tem QR" : "Product groups, models, schema and QR import",
      href: "/devices?tab=list",
      icon: Layers,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-950/40",
      border: "hover:border-indigo-500/50"
    },
    {
      title: language === "vi" ? "Hộp Đen Kiểm Toán" : "Blackbox Audit",
      desc: language === "vi" ? "Lưu vết lệnh điều khiển phần cứng có chữ ký số SHA-256" : "Immutable cryptographic log of hardware commands",
      href: "/blackbox",
      icon: ShieldCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      border: "hover:border-emerald-500/50"
    },
    {
      title: language === "vi" ? "CSKH & Viễn Thám" : "Customer Support",
      desc: language === "vi" ? "Hỗ trợ kỹ thuật trực tiếp và chẩn đoán phần cứng từ xa" : "Live customer chat and remote diagnostics",
      href: "/cskh",
      icon: Headphones,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/40",
      border: "hover:border-rose-500/50"
    },
    {
      title: language === "vi" ? "Cán Bộ & Phân Quyền" : "Admin & Permissions",
      desc: language === "vi" ? "Quản lý nhân sự, vai trò và ma trận phân quyền" : "Manage staff users, roles and RBAC permissions",
      href: "/users/admin",
      icon: Users,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/40",
      border: "hover:border-purple-500/50"
    },
    {
      title: language === "vi" ? "Trung Tâm Thông Báo" : "Notification Hub",
      desc: language === "vi" ? "Soạn thảo và phát sóng thông báo đến ứng dụng gia chủ" : "Compose and broadcast notifications to mobile app",
      href: "/notifications",
      icon: Bell,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40",
      border: "hover:border-amber-500/50"
    }
  ];

  return (
    <div className="h-full flex flex-col justify-between max-w-5xl mx-auto space-y-4 py-2">
      {/* Sleek Minimalist Header */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {language === "vi" ? `Xin chào, ${user?.fullName || "Quản Trị Viên"}!` : `Welcome back, ${user?.fullName || "Administrator"}!`}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === "vi" 
              ? "Cổng điều hành và quản trị tập trung hệ sinh thái thiết bị thông minh Austec." 
              : "Centralized management portal for the Austec Smart IoT ecosystem."}
          </p>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-sm group shrink-0"
        >
          <Radio className="w-4 h-4" />
          <span>{language === "vi" ? "Vào Dashboard" : "Open Dashboard"}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* 6 Clean Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.href}
              href={m.href}
              className={`p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs transition-all flex flex-col justify-between group cursor-pointer ${m.border}`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${m.bg} ${m.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    {m.title}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                    {m.desc}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Clean Status Footer */}
      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-[11px]">{language === "vi" ? "Hạ tầng Broker: Trực tuyến" : "Broker: Online"}</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-mono text-[11px]">MQTT TLS Port 8883 • 142ms</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] font-mono">
          <Lock className="w-3 h-3 text-cyan-500" />
          <span>{user?.email}</span>
          <span>•</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.role}</span>
        </div>
      </div>
    </div>
  );
}
