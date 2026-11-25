"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { usePermissions } from "../../context/PermissionContext";
import { AccessDenied } from "../../components/AccessDenied";
import {
  StepUpVerifyModal,
  getCachedStepUpToken,
  clearCachedStepUpToken,
} from "@/components/StepUpVerifyModal";
import { settingsService } from "./settings-service";
import {
  SettingsHeader,
  WarrantyPolicyCard,
  MqttBrokerCard,
  CompanyInfoCard,
} from "./components";

export default function SystemSettingsPage() {
  const { canView, canUpdate } = usePermissions();

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

  const initialMqttRef = useRef({
    mqttBrokerUrl: "mqtt://broker.austec.vn",
    mqttPort: 8883,
    tlsEnabled: true,
    keepAliveSeconds: 60,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showStepUpModal, setShowStepUpModal] = useState(false);

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

          initialMqttRef.current = {
            mqttBrokerUrl: s.mqttBrokerUrl ?? "mqtt://broker.austec.vn",
            mqttPort: s.mqttPort ?? 8883,
            tlsEnabled: s.tlsEnabled ?? true,
            keepAliveSeconds: s.keepAliveSeconds ?? 60,
          };
        }
      } catch (err: any) {
        console.warn("Lỗi nạp cài đặt hệ thống:", err.message);
      }
    };

    fetchSettings();
  }, []);

  const executeSave = async (stepUpToken?: string) => {
    setIsSaving(true);
    try {
      const res = await settingsService.updateSettings(
        {
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
        },
        stepUpToken
      );

      if (res.requireStepUp) {
        clearCachedStepUpToken("SYSTEM_SETTINGS");
        setShowStepUpModal(true);
        return;
      }

      if (res.success) {
        initialMqttRef.current = {
          mqttBrokerUrl,
          mqttPort,
          tlsEnabled,
          keepAliveSeconds,
        };
        toast.success("Đã lưu các thiết lập cấu hình hệ thống thành công!");
      } else {
        toast.error(res.error || "Lỗi lưu cấu hình!");
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối máy chủ: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!canUpdate("mod_setting")) {
      toast.error("Bạn không có quyền cập nhật cấu hình hệ thống!");
      return;
    }

    const mqttChanged =
      mqttBrokerUrl !== initialMqttRef.current.mqttBrokerUrl ||
      Number(mqttPort) !== Number(initialMqttRef.current.mqttPort) ||
      Boolean(tlsEnabled) !== Boolean(initialMqttRef.current.tlsEnabled) ||
      Number(keepAliveSeconds) !== Number(initialMqttRef.current.keepAliveSeconds);

    if (mqttChanged) {
      const cached = getCachedStepUpToken("SYSTEM_SETTINGS");
      if (cached) {
        await executeSave(cached);
      } else {
        setShowStepUpModal(true);
      }
      return;
    }

    await executeSave();
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
      <SettingsHeader
        canUpdate={canUpdate("mod_setting")}
        isSaving={isSaving}
        onReset={handleReset}
        onSave={handleSave}
      />

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

      <StepUpVerifyModal
        isOpen={showStepUpModal}
        purpose="SYSTEM_SETTINGS"
        title="Xác Thực Thay Đổi Hạ Tầng MQTT Hệ Thống"
        badgeText="Ảnh hưởng toàn bộ thiết bị IoT"
        badgeType="danger"
        warningDetail="Thay đổi địa chỉ MQTT Broker, Port hoặc TLS có thể làm mất kết nối toàn bộ thiết bị cửa cuốn và cảm biến đang vận hành. Vui lòng xác thực OTP qua Gmail hoặc Zalo để xác nhận."
        summaryRows={[
          { label: "MQTT Broker", value: mqttBrokerUrl },
          { label: "Port / TLS", value: `${mqttPort} (${tlsEnabled ? "TLS Bật" : "TLS Tắt"})` },
          { label: "KeepAlive", value: `${keepAliveSeconds}s` },
        ]}
        onClose={() => setShowStepUpModal(false)}
        onVerified={async (token) => {
          setShowStepUpModal(false);
          await executeSave(token);
        }}
      />
    </div>
  );
}
