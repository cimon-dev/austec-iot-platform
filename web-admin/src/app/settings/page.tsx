"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { usePermissions } from "../../context/PermissionContext";
import { AccessDenied } from "../../components/AccessDenied";
import { settingsService } from "./settings-service";
import {
  SettingsHeader,
  WarrantyPolicyCard,
  MqttBrokerCard,
  CompanyInfoCard,
} from "./components";

export default function SystemSettingsPage() {
  const { canView, canUpdate } = usePermissions();

  // Settings State
  const [expiryNotificationDays, setExpiryNotificationDays] = useState<number>(30);
  const [trialExpiryPeriod, setTrialExpiryPeriod] = useState<number>(15);
  const [notificationFrequency, setNotificationFrequency] = useState<string>("daily");

  const [mqttBrokerUrl, setMqttBrokerUrl] = useState("mqtt://broker.austec.vn");
  const [mqttPort, setMqttPort] = useState(8883);
  const [tlsEnabled, setTlsEnabled] = useState(true);
  const [keepAliveSeconds, setKeepAliveSeconds] = useState(60);

  const [companyName, setCompanyName] = useState("CÔNG TY CỔ PHẦN CÔNG NGHỆ AUSTEC");
  const [hotline, setHotline] = useState("1900 6868");
  const [supportEmail, setSupportEmail] = useState("support@austec.vn");
  const [timezone, setTimezone] = useState("Asia/Ho_Chi_Minh (GMT+7)");

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Nạp dữ liệu thực tế từ PostgreSQL khi mở trang
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const s = await settingsService.getSettings();
        if (s) {
          if (s.expiryNotificationDays !== undefined) setExpiryNotificationDays(s.expiryNotificationDays);
          if (s.trialExpiryPeriod !== undefined) setTrialExpiryPeriod(s.trialExpiryPeriod);
          if (s.notificationFrequency) setNotificationFrequency(s.notificationFrequency);
          if (s.mqttBrokerUrl) setMqttBrokerUrl(s.mqttBrokerUrl);
          if (s.mqttPort !== undefined) setMqttPort(s.mqttPort);
          if (s.tlsEnabled !== undefined) setTlsEnabled(s.tlsEnabled);
          if (s.keepAliveSeconds !== undefined) setKeepAliveSeconds(s.keepAliveSeconds);
          if (s.companyName) setCompanyName(s.companyName);
          if (s.hotline) setHotline(s.hotline);
          if (s.supportEmail) setSupportEmail(s.supportEmail);
          if (s.timezone) setTimezone(s.timezone);
        }
      } catch (err: any) {
        console.warn("Lỗi nạp cài đặt hệ thống:", err.message);
      }
    };

    fetchSettings();
  }, []);

  // Lưu dữ liệu thực tế xuống Database PostgreSQL
  const handleSave = async () => {
    if (!canUpdate("mod_setting")) {
      showToast("Bạn không có quyền cập nhật cấu hình hệ thống!", "error");
      return;
    }

    setIsSaving(true);
    try {
      const res = await settingsService.updateSettings({
        expiryNotificationDays,
        trialExpiryPeriod,
        notificationFrequency,
        mqttBrokerUrl,
        mqttPort,
        tlsEnabled,
        keepAliveSeconds,
        companyName,
        hotline,
        supportEmail,
        timezone,
      });

      if (res.success) {
        showToast("Đã lưu các thiết lập cấu hình hệ thống vào PostgreSQL thành công!");
      } else {
        showToast(res.error || "Lỗi lưu cấu hình!", "error");
      }
    } catch (err: any) {
      showToast("Lỗi kết nối máy chủ: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!canUpdate("mod_setting")) {
      showToast("Bạn không có quyền cập nhật cấu hình hệ thống!", "error");
      return;
    }
    setExpiryNotificationDays(30);
    setTrialExpiryPeriod(15);
    setNotificationFrequency("daily");
    setMqttBrokerUrl("mqtt://broker.austec.vn");
    setMqttPort(8883);
    setTlsEnabled(true);
    setKeepAliveSeconds(60);
    showToast("Đã khôi phục các giá trị về mặc định (chưa lưu)!");
  };

  if (!canView("mod_setting")) {
    return <AccessDenied moduleName="Cài đặt hệ thống" requiredModule="mod_setting" />;
  }

  return (
    <div className="h-full flex flex-col min-h-0 space-y-3 overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg border shadow-lg flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom ${
            toast.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <SettingsHeader
        canUpdate={canUpdate("mod_setting")}
        isSaving={isSaving}
        onReset={handleReset}
        onSave={handleSave}
      />

      {/* Settings Form Body */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        <WarrantyPolicyCard
          expiryNotificationDays={expiryNotificationDays}
          trialExpiryPeriod={trialExpiryPeriod}
          notificationFrequency={notificationFrequency}
          onChangeExpiryDays={setExpiryNotificationDays}
          onChangeTrialDays={setTrialExpiryPeriod}
          onChangeFrequency={setNotificationFrequency}
        />

        <MqttBrokerCard
          mqttBrokerUrl={mqttBrokerUrl}
          mqttPort={mqttPort}
          tlsEnabled={tlsEnabled}
          keepAliveSeconds={keepAliveSeconds}
          onChangeUrl={setMqttBrokerUrl}
          onChangePort={setMqttPort}
          onChangeTls={setTlsEnabled}
          onChangeKeepAlive={setKeepAliveSeconds}
        />

        <CompanyInfoCard
          companyName={companyName}
          hotline={hotline}
          supportEmail={supportEmail}
          timezone={timezone}
          onChangeCompany={setCompanyName}
          onChangeHotline={setHotline}
          onChangeEmail={setSupportEmail}
          onChangeTimezone={setTimezone}
        />
      </div>
    </div>
  );
}
