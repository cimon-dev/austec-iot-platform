"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
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
      toast.error("Bạn không có quyền cập nhật cấu hình hệ thống!");
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
        toast.success("Đã lưu các thiết lập cấu hình hệ thống vào PostgreSQL thành công!");
      } else {
        toast.error(res.error || "Lỗi lưu cấu hình!");
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối máy chủ: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!canUpdate("mod_setting")) {
      toast.error("Bạn không có quyền cập nhật cấu hình hệ thống!");
      return;
    }
    setExpiryNotificationDays(30);
    setTrialExpiryPeriod(15);
    setNotificationFrequency("daily");
    setMqttBrokerUrl("mqtt://broker.austec.vn");
    setMqttPort(8883);
    setTlsEnabled(true);
    setKeepAliveSeconds(60);
    toast.info("Đã khôi phục các giá trị về mặc định (chưa lưu)!");
  };

  if (!canView("mod_setting")) {
    return <AccessDenied moduleName="Cài đặt hệ thống" requiredModule="mod_setting" />;
  }

  return (
    <div className="h-full flex flex-col min-h-0 space-y-3 overflow-hidden">

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
