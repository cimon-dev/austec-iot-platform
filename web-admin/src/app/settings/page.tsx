"use client";

import React, { useState } from "react";
import { 
  Settings, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  ShieldCheck, 
  Server, 
  Radio, 
  Clock, 
  Bell, 
  Building2, 
  Globe, 
  Mail, 
  Phone 
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { usePermissions } from "../../context/PermissionContext";
import { AccessDenied } from "../../components/AccessDenied";

export default function SystemSettingsPage() {
  const { t } = useLanguage();
  const { canView, canUpdate } = usePermissions();

  // Settings State matching legacy setting.html + IoT parameters
  const [expiryNotificationDays, setExpiryNotificationDays] = useState<number>(30);
  const [trialExpiryPeriod, setTrialExpiryPeriod] = useState<number>(15);
  const [notificationFrequency, setNotificationFrequency] = useState<string>("daily");

  // IoT Broker Parameters
  const [mqttBrokerUrl, setMqttBrokerUrl] = useState("mqtt://broker.austec.vn");
  const [mqttPort, setMqttPort] = useState(8883);
  const [tlsEnabled, setTlsEnabled] = useState(true);
  const [keepAliveSeconds, setKeepAliveSeconds] = useState(60);

  // General Company Information
  const [companyName, setCompanyName] = useState("CÔNG TY CỔ PHẦN CÔNG NGHỆ AUSTEC");
  const [hotline, setHotline] = useState("1900 6868");
  const [supportEmail, setSupportEmail] = useState("support@austec.vn");
  const [timezone, setTimezone] = useState("Asia/Ho_Chi_Minh (GMT+7)");

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUpdate("mod_setting")) {
      showToast("Bạn không có quyền cập nhật cấu hình hệ thống!");
      return;
    }
    showToast("Đã lưu các thiết lập cấu hình hệ thống thành công!");
  };

  const handleReset = () => {
    if (!canUpdate("mod_setting")) {
      showToast("Bạn không có quyền cập nhật cấu hình hệ thống!");
      return;
    }
    setExpiryNotificationDays(30);
    setTrialExpiryPeriod(15);
    setNotificationFrequency("daily");
    setMqttBrokerUrl("mqtt://broker.austec.vn");
    setMqttPort(8883);
    setTlsEnabled(true);
    setKeepAliveSeconds(60);
    showToast("Đã khôi phục các thiết lập về mặc định!");
  };

  // RBAC Gating
  if (!canView("mod_setting")) {
    return (
      <AccessDenied 
        moduleName="Cài Đặt Hệ Thống & Cấu Hình Dự Án (System Settings)"
        requiredModule="mod_setting"
      />
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2 overflow-hidden">
      {/* Toast Feedback */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 backdrop-blur-md shadow-lg flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            <span>Cài Đặt Hệ Thống & Cấu Hình Dự Án (System Settings)</span>
          </h1>
        </div>

        {canUpdate("mod_setting") && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi Phục Mặc Định</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu Thiết Lập</span>
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1">
        {/* SECTION 1: WARRANTY & NOTIFICATION POLICIES */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Chính Sách Bảo Hành & Cảnh Báo Tự Động (Warranty & Notifications)
            </h2>
          </div>

          <div className="p-4 space-y-3.5 max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Expiry Notification Days
                <span className="block text-[11px] font-normal text-slate-500">
                  Số ngày quét và gửi thông báo trước khi thiết bị hết bảo hành
                </span>
              </label>
              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={expiryNotificationDays}
                  onChange={e => setExpiryNotificationDays(Number(e.target.value))}
                  className="w-36 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-slate-500 font-medium">Ngày (Days)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Trial Expiry Period
                <span className="block text-[11px] font-normal text-slate-500">
                  Thời hạn dùng thử mặc định cho thiết bị mới xuất kho
                </span>
              </label>
              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={trialExpiryPeriod}
                  onChange={e => setTrialExpiryPeriod(Number(e.target.value))}
                  className="w-36 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-slate-500 font-medium">Ngày (Days)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Notification Frequency
                <span className="block text-[11px] font-normal text-slate-500">
                  Tần suất gửi cảnh báo định kỳ tới tài khoản khách hàng
                </span>
              </label>
              <div className="md:col-span-2">
                <select
                  value={notificationFrequency}
                  onChange={e => setNotificationFrequency(e.target.value)}
                  className="w-56 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="daily">Hàng ngày (Daily)</option>
                  <option value="weekly">Hàng tuần (Weekly)</option>
                  <option value="monthly">Hàng tháng (Monthly)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: IOT BROKER & INFRASTRUCTURE */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-500" />
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Hạ Tầng Kết Nối IoT & MQTT Broker (Connectivity Stack)
            </h2>
          </div>

          <div className="p-4 space-y-3.5 max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                MQTT Broker Host
                <span className="block text-[11px] font-normal text-slate-500">
                  Địa chỉ máy chủ phân phối tin nhắn MQTT
                </span>
              </label>
              <div className="md:col-span-2">
                <input
                  type="text"
                  value={mqttBrokerUrl}
                  onChange={e => setMqttBrokerUrl(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Cổng Kết Nối (Port)
              </label>
              <div className="md:col-span-2 flex items-center gap-4">
                <input
                  type="number"
                  value={mqttPort}
                  onChange={e => setMqttPort(Number(e.target.value))}
                  className="w-28 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500"
                />

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tlsEnabled}
                    onChange={e => setTlsEnabled(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-cyan-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Bật mã hóa TLS / SSL (Secure)</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Keepalive Timeout
              </label>
              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  type="number"
                  value={keepAliveSeconds}
                  onChange={e => setKeepAliveSeconds(Number(e.target.value))}
                  className="w-28 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500"
                />
                <span className="text-xs text-slate-500">Giây (Seconds)</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: GENERAL ENTERPRISE INFO */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-500" />
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Thông Tin Doanh Nghiệp & Dự Án (Enterprise Metadata)
            </h2>
          </div>

          <div className="p-4 space-y-3.5 max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tên Doanh Nghiệp
              </label>
              <div className="md:col-span-2">
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Hotline Hỗ Trợ Kỹ Thuật
              </label>
              <div className="md:col-span-2">
                <input
                  type="text"
                  value={hotline}
                  onChange={e => setHotline(e.target.value)}
                  className="w-56 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email Tiếp Nhận CSKH
              </label>
              <div className="md:col-span-2">
                <input
                  type="email"
                  value={supportEmail}
                  onChange={e => setSupportEmail(e.target.value)}
                  className="w-full max-w-md text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Múi Giờ Hệ Thống (Timezone)
              </label>
              <div className="md:col-span-2">
                <input
                  type="text"
                  disabled
                  value={timezone}
                  className="w-56 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
