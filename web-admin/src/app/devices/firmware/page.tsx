"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  UploadCloud, 
  Cpu, 
  RotateCw, 
  CheckCircle2, 
  Play, 
  Plus, 
  Search, 
  FileCode, 
  Check, 
  Copy, 
  Trash2, 
  Lock, 
  Unlock, 
  KeyRound, 
  EyeOff, 
  Layers, 
  HardDrive, 
  ShieldCheck,
  Radio,
  SlidersHorizontal
} from "lucide-react";
import { getApiBaseUrl } from "@/context/apiConfig";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { toast } from "sonner";
import { usePermissions } from "@/context/PermissionContext";
import { AccessDenied } from "@/components/AccessDenied";

interface FirmwareRelease {
  id: number;
  version: string;
  modelCode: string;
  binaryFilename: string;
  binaryUrl: string;
  fileSizeBytes: number;
  sha256Checksum: string;
  releaseType: string;
  isActive: boolean;
  changelog: string;
  releasedBy?: string;
  createdAt: string;
}

interface OtaCampaign {
  id: number;
  campaignName: string;
  targetModel: string;
  targetVersion: string;
  rolloutType: string;
  status: string;
  totalDevices: number;
  successCount: number;
  failedCount: number;
  inProgressCount: number;
  startedAt: string;
  completedAt?: string;
}

interface OtaDeviceRecord {
  id: number;
  campaignId: number;
  hardwareId: string;
  customerName: string;
  currentVersion: string;
  targetVersion: string;
  status: "SUCCESS" | "DOWNLOADING" | "PENDING" | "FAILED_OFFLINE" | "FAILED_CHECKSUM" | "SKIPPED";
  progressPct: number;
  lastAttemptAt: string;
  errorReason: string | null;
  retryCount: number;
}

// Danh mục định nghĩa Nhóm Sản Phẩm (Product Groups)
export const PRODUCT_GROUPS = [
  { code: "GRP_DOOR", name: "Cửa cuốn thông minh" },
  { code: "GRP_LOCK", name: "Khóa cửa thông minh" },
  { code: "GRP_UPS", name: "Bộ lưu điện & Năng lượng" },
  { code: "GRP_CAMERA", name: "Giám sát an ninh AI" },
  { code: "GRP_SENSOR", name: "Cảm biến an toàn" },
  { code: "GRP_CONTROLLER", name: "Bo mạch điều khiển trung tâm" },
];

// Danh mục định nghĩa Loại Phần Cứng Kỹ Thuật (Hardware Types)
export const HARDWARE_TYPES = [
  { code: "HW_DOOR_GERMAN", name: "Mạch Rơ-le Cửa cuốn Đức (ESP32-C3)", groupCode: "GRP_DOOR" },
  { code: "HW_DOOR_AUST", name: "Mạch Xung Motor Úc (ESP32 Dual-Core)", groupCode: "GRP_DOOR" },
  { code: "HW_LOCK_AI", name: "Mạch Khóa FaceID 3D (ESP32-S3)", groupCode: "GRP_LOCK" },
  { code: "HW_UPS_SINE", name: "Mạch Biến Tần Sin Chuẩn (ESP32-C3)", groupCode: "GRP_UPS" },
  { code: "HW_CAMERA_AI", name: "Mạch Camera AI NPU (ESP32-S3)", groupCode: "GRP_CAMERA" },
  { code: "HW_SENSOR_LP", name: "Mạch Cảm Biến Tiết Kiệm Pin (ESP32-C3)", groupCode: "GRP_SENSOR" },
  { code: "HW_HUB_RS485", name: "Mạch Trung Tâm Modbus RS485 (ESP32-WROOM)", groupCode: "GRP_CONTROLLER" },
];

interface CommercialModelItem {
  id: string;
  name: string;
  modelCode: string;
  groupCode: string;
  groupName: string;
  hardwareTypeCode: string;
  hardwareTypeName: string;
  mcu: string;
  flashSize: string;
  currentStableVersion: string;
  imageUrl: string;
  description: string;
  keyFeatures: string[];
  codeFiles: {
    name: string;
    language: string;
    code: string;
  }[];
}

const COMMERCIAL_MODELS: CommercialModelItem[] = [
  {
    id: "prod_door_german",
    name: "Cửa Cuốn Austec Titadoor A900 Super",
    modelCode: "DOOR_GERMAN_ALU",
    groupCode: "GRP_DOOR",
    groupName: "Cửa cuốn thông minh",
    hardwareTypeCode: "HW_DOOR_GERMAN",
    hardwareTypeName: "Mạch Rơ-le Cửa cuốn Đức (ESP32-C3)",
    mcu: "ESP32-C3 RISC-V 160MHz",
    flashSize: "4MB Dual-Bank OTA",
    currentStableVersion: "v1.1.0",
    imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=300&q=80",
    description: "Bộ điều khiển cửa cuốn thông minh khe thoáng nhôm công nghệ Đức, tích hợp rơ-le 3 kênh và cảm biến dừng đảo chiều khẩn cấp.",
    keyFeatures: [
      "Tự động dừng khi gặp vật cản (Smart Obstacle Stop)",
      "Điều khiển qua mạng MQTT độ trễ < 50ms",
      "Hỗ trợ nạp OTA từ xa qua WiFi an toàn tuyệt đối",
      "Tương thích remote RF 433MHz Rolling Code"
    ],
    codeFiles: [
      {
        name: "main.cpp",
        language: "cpp",
        code: `// ============================================================================
// AUSTEC SMART IOT - FIRMWARE CỬA CUỐN KHE THOÁNG ĐỨC (DOOR_GERMAN_ALU)
// Vi điều khiển: ESP32-C3 | Flash: 4MB Dual-Bank | Phiên bản: v1.1.0 STABLE
// ============================================================================
#include <Arduino.h>
#include <WiFi.h>
#include "ota_engine.h"
#include "mqtt_austec.h"

#define RELAY_OPEN_PIN     4   // Kích rơ-le Mở Cửa (Xung 500ms)
#define RELAY_CLOSE_PIN    5   // Kích rơ-le Đóng Cửa (Xung 500ms)
#define RELAY_STOP_PIN     18  // Kích rơ-le Dừng Khẩn Cấp
#define SENSOR_OBSTACLE    21  // Cảm biến quang hồng ngoại chống kẹt
#define SENSOR_LIMIT_TOP   19  // Công tắc hành trình trên
#define SENSOR_LIMIT_BOT   22  // Công tắc hành trình dưới

void setup() {
    Serial.begin(115200);
    Serial.println("[AUSTEC] Khoi dong Bo dieu khien Cua cuon Titadoor A900 v1.1.0");

    pinMode(RELAY_OPEN_PIN, OUTPUT);
    pinMode(RELAY_CLOSE_PIN, OUTPUT);
    pinMode(RELAY_STOP_PIN, OUTPUT);
    pinMode(SENSOR_OBSTACLE, INPUT_PULLUP);

    initAustecNetwork();
    setupOtaBackgroundService();
}

void loop() {
    if (digitalRead(SENSOR_OBSTACLE) == LOW) {
        digitalWrite(RELAY_STOP_PIN, HIGH);
        delay(200);
        digitalWrite(RELAY_STOP_PIN, LOW);
        mqttPublishAlert("OBSTACLE_DETECTED_AUTO_STOP");
    }

    processMqttCommands();
    yield();
}`
      },
      {
        name: "ota_engine.cpp",
        language: "cpp",
        code: `// MODULE NẠP FIRMWARE KHÔNG DÂY (OTA DUAL-BANK ENGINE)
#include <HTTPUpdate.h>
#include <WiFiClientSecure.h>
#include <mbedtls/sha256.h>

bool performOtaUpdate(const char* binaryUrl, const char* expectedSha256) {
    WiFiClient client;
    httpUpdate.rebootOnUpdate(false);

    Serial.printf("[OTA] Bat dau tai firmware tu: %s\\n", binaryUrl);
    t_httpUpdate_return ret = httpUpdate.update(client, binaryUrl);

    if (ret == HTTP_UPDATE_OK) {
        Serial.println("[OTA] Tai ghi vao phan vung app1 thanh cong 100%!");
        if (validateFirmwareSha256(expectedSha256)) {
            Serial.println("[OTA] Ma SHA256 hop le. Chuyen Bootloader & Restart!");
            ESP.restart();
            return true;
        } else {
            Serial.println("[OTA] LOI: Sai lech ma băm SHA256. Huy bo nap!");
            return false;
        }
    }
    return false;
}`
      }
    ]
  },
  {
    id: "prod_door_aust",
    name: "Cửa Cuốn Thép Tấm Liền Austdoor Aust-Steel",
    modelCode: "DOOR_AU_STEEL",
    groupCode: "GRP_DOOR",
    groupName: "Cửa cuốn thông minh",
    hardwareTypeCode: "HW_DOOR_AUST",
    hardwareTypeName: "Mạch Xung Motor Úc (ESP32 Dual-Core)",
    mcu: "ESP32 Dual-Core 240MHz",
    flashSize: "4MB Dual-Bank OTA",
    currentStableVersion: "v1.0.2",
    imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80",
    description: "Bo mạch điều khiển tối ưu hóa cho động cơ tấm liền công nghệ Úc tốc độ đóng mở nhanh và chống xô nan.",
    keyFeatures: [
      "Xung kích rơ-le siêu nhạy 250ms cho motor DC tấm liền",
      "Tự động tính toán vị trí hành trình theo thời gian chạy",
      "Bảo vệ quá dòng động cơ khi kẹt nan",
      "Khôi phục trạng thái thông minh sau khi cúp điện"
    ],
    codeFiles: [
      {
        name: "aust_door_motor.cpp",
        language: "cpp",
        code: `// THUẬT TOÁN ĐIỀU KHIỂN MOTOR CỬA CUỐN TẤM LIỀN CÔNG NGHỆ ÚC
#include <Arduino.h>

void triggerAustMotorPulse(uint8_t relayPin, uint16_t durationMs) {
    digitalWrite(relayPin, HIGH);
    delay(durationMs);
    digitalWrite(relayPin, LOW);
    Serial.printf("[AUST_DOOR] Phat xung kich %dms len Pin %d thanh cong\\n", durationMs, relayPin);
}`
      }
    ]
  },
  {
    id: "prod_lock_masaru",
    name: "Khóa Thông Minh FaceID Masaru Titan X1",
    modelCode: "SMART_LOCK_MASARU",
    groupCode: "GRP_LOCK",
    groupName: "Khóa cửa thông minh",
    hardwareTypeCode: "HW_LOCK_AI",
    hardwareTypeName: "Mạch Khóa FaceID 3D (ESP32-S3)",
    mcu: "ESP32-S3 Dual-Core AI 240MHz",
    flashSize: "8MB Dual-Bank OTA",
    currentStableVersion: "v2.0.1",
    imageUrl: "https://images.unsplash.com/photo-1558002038-1055907df827?w=300&q=80",
    description: "Khóa cửa thông minh cao cấp tích hợp nhận diện khuôn mặt FaceID 3D, vân tay bán dẫn FPC Thụy Điển và mã số ảo.",
    keyFeatures: [
      "Nhận diện FaceID 3D hồng ngoại ban đêm < 0.3s",
      "Sinh mã mở cửa một lần (One-Time OTP) từ xa trên App",
      "Chuông hình đàm thoại 2 chiều qua WiFi",
      "Báo động cạy khóa & gửi ảnh kẻ gian về điện thoại"
    ],
    codeFiles: [
      {
        name: "masaru_security.cpp",
        language: "cpp",
        code: `// MODULE BẢO MẬT KHÓA MASARU TITAN X1 - SINH MÃ OTP & MỞ KHÓA
#include <Arduino.h>
#include <mbedtls/sha256.h>

bool verifyOneTimeOtp(uint32_t inputOtp, uint32_t currentTimestamp) {
    uint32_t calculatedOtp = generateTimeBasedOtp(currentTimestamp);
    return (inputOtp == calculatedOtp);
}`
      }
    ]
  },
  {
    id: "prod_ups_sine",
    name: "Bộ Lưu Điện Cửa Cuốn Austec Sine 1200 Pro",
    modelCode: "UPS_AC_220V",
    groupCode: "GRP_UPS",
    groupName: "Bộ lưu điện & Năng lượng",
    hardwareTypeCode: "HW_UPS_SINE",
    hardwareTypeName: "Mạch Biến Tần Sin Chuẩn (ESP32-C3)",
    mcu: "ESP32-C3 RISC-V 160MHz",
    flashSize: "4MB Dual-Bank OTA",
    currentStableVersion: "v1.8.2",
    imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&q=80",
    description: "Bộ lưu điện sin chuẩn Pure Sine Wave chuyên dụng cho motor cửa cuốn, tích hợp giám sát pin thông minh qua Cloud.",
    keyFeatures: [
      "Sóng sin chuẩn tinh khiết bảo vệ cuộn dây motor",
      "Chế độ tự động xả sạc dưỡng ắc quy định kỳ 30 ngày",
      "Cảnh báo pin yếu & mất điện lưới qua tin nhắn thông báo",
      "Lưu trữ dung lượng đủ đóng mở 30 - 40 lần khi mất điện"
    ],
    codeFiles: [
      {
        name: "ups_bms_monitor.cpp",
        language: "cpp",
        code: `// GIÁM SÁT DUNG LƯỢNG PIN & CHUYỂN MẠCH SIN CHUẨN
#include <Arduino.h>

float readBatteryVoltage() {
    int raw = analogRead(A0);
    float voltage = (raw / 4095.0) * 24.0;
    return voltage;
}`
      }
    ]
  },
  {
    id: "prod_cam_vision",
    name: "Camera Giám Sát AI Vision 4K Ngoài Trời",
    modelCode: "CAMERA_VISION_4K",
    groupCode: "GRP_CAMERA",
    groupName: "Giám sát an ninh AI",
    hardwareTypeCode: "HW_CAMERA_AI",
    hardwareTypeName: "Mạch Camera AI NPU (ESP32-S3)",
    mcu: "ESP32-S3 AI Vision + NPU",
    flashSize: "16MB Dual-Bank OTA",
    currentStableVersion: "v1.0.0",
    imageUrl: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=300&q=80",
    description: "Camera AI nhận diện chuyển động người, cảnh báo kẻ gian vượt hàng rào và đồng bộ với hệ thống cửa cuốn tự đóng.",
    keyFeatures: [
      "Độ phân giải siêu nét 4K Ultra HD góc rộng 135 độ",
      "AI nhận diện người và phương tiện chính xác 99%",
      "Tự động kích hoạt đóng cửa khi phát hiện đột nhập",
      "Đèn chiếu sáng rọi đêm có màu Full-Color"
    ],
    codeFiles: [
      {
        name: "ai_vision_detect.cpp",
        language: "cpp",
        code: `// MODULE AI NHẬN DIỆN CHUYỂN ĐỘNG & BÁO ĐỘNG ĐỘT NHẬP
#include "esp_camera.h"

void processAiPersonDetection(camera_fb_t* fb) {
    if (detectHumanPresence(fb)) {
        triggerSecuritySiren();
        sendAlertSnapshotToCloud(fb);
    }
}`
      }
    ]
  },
  {
    id: "prod_sensor_multi",
    name: "Cảm Biến Đa Năng Môi Trường MultiSensor M1",
    modelCode: "SENSOR_MULTI_M1",
    groupCode: "GRP_SENSOR",
    groupName: "Cảm biến an toàn",
    hardwareTypeCode: "HW_SENSOR_LP",
    hardwareTypeName: "Mạch Cảm Biến Tiết Kiệm Pin (ESP32-C3)",
    mcu: "ESP32-C3 Ultra Low Power",
    flashSize: "4MB Dual-Bank",
    currentStableVersion: "v1.0.1",
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&q=80",
    description: "Cảm biến báo khói, báo cháy, nhiệt độ và độ ẩm, tự động mở cửa cuốn thoát hiểm khi phát hiện sự cố cháy nổ.",
    keyFeatures: [
      "Tự động kích hoạt mở cửa cuốn khi phát hiện khói/cháy",
      "Chế độ ngủ sâu (Deep Sleep) thời lượng pin 2 năm",
      "Báo cáo nhiệt độ độ ẩm phòng thời gian thực",
      "Còi hú báo động âm lượng lớn 90dB tại chỗ"
    ],
    codeFiles: [
      {
        name: "sensor_smoke_alert.cpp",
        language: "cpp",
        code: `// KÍCH HOẠT MỞ CỬA THOÁT HIỂM KHI CÓ HỎA HOẠN
#include <Arduino.h>

void onSmokeDetected() {
    triggerAlarmBuzzer(true);
    broadcastEmergencyOpenDoorCommand();
}`
      }
    ]
  },
  {
    id: "prod_hub_controller",
    name: "Bộ Điều Khiển Trung Tâm Austec IoT Hub",
    modelCode: "CONTROLLER_IOT_HUB",
    groupCode: "GRP_CONTROLLER",
    groupName: "Bo mạch điều khiển trung tâm",
    hardwareTypeCode: "HW_HUB_RS485",
    hardwareTypeName: "Mạch Trung Tâm Modbus RS485 (ESP32-WROOM)",
    mcu: "ESP32-WROOM-32D Dual-Core",
    flashSize: "8MB Dual-Bank OTA",
    currentStableVersion: "v1.5.0",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80",
    description: "Bo mạch điều khiển mở rộng 4 kênh công suất lớn, cổng giao tiếp RS485 Modbus công nghiệp và kết nối Internet kép.",
    keyFeatures: [
      "4 Rơ-le tải nặng 30A điều khiển động cơ 3 pha",
      "Giao tiếp Modbus RS485 liên kết hệ thống tòa nhà BMS",
      "Hỗ trợ kết nối kép WiFi + Cổng mạng LAN Ethernet",
      "Đồng bộ thời gian thực với Cloud qua MQTT SSL"
    ],
    codeFiles: [
      {
        name: "hub_modbus_controller.cpp",
        language: "cpp",
        code: `// ĐIỀU KHIỂN RƠ-LE CÔNG SUẤT VÀ GIAO TIẾP RS485 MODBUS
#include <ModbusMaster.h>

void triggerHeavyRelay(uint8_t channel, bool state) {
    digitalWrite(RELAY_PINS[channel], state ? HIGH : LOW);
    updateLedIndicator(channel, state);
}`
      }
    ]
  }
];

export default function FirmwareOtaPage() {
  const { canView, canCreate, canUpdate, canDelete } = usePermissions();

  const [firmwares, setFirmwares] = useState<FirmwareRelease[]>([]);
  const [campaigns, setCampaigns] = useState<OtaCampaign[]>([]);
  const [records, setRecords] = useState<OtaDeviceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // 2 Combobox Filter: Nhóm sản phẩm & Loại phần cứng
  const [groupFilter, setGroupFilter] = useState<string>("ALL");
  const [hardwareTypeFilter, setHardwareTypeFilter] = useState<string>("ALL");

  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Tab bên phải: "firmware" (Danh sách bản phát hành & tiến độ) hoặc "code" (Xem mã nguồn)
  const [activeRightTab, setActiveRightTab] = useState<"firmware" | "code">("firmware");

  // Model thương phẩm đang được chọn
  const [selectedModelId, setSelectedModelId] = useState<string>(COMMERCIAL_MODELS[0].id);

  // Mở khóa xem Code Preview (Yêu cầu xác thực Email Admin)
  const [isCodeUnlocked, setIsCodeUnlocked] = useState<boolean>(false);
  const [activeCodeFileIndex, setActiveCodeFileIndex] = useState<number>(0);

  // Modal Xác thực Email Admin (Demo OTP Dialog)
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authActionType, setAuthActionType] = useState<"VIEW_CODE" | "UPLOAD_FW">("VIEW_CODE");
  const [otpCode, setOtpCode] = useState<string>("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);

  // Modal Tạo chiến dịch & Upload Firmware
  const [showDeployModal, setShowDeployModal] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [deployVersion, setDeployVersion] = useState<string>("v1.1.0");
  const [deployMode, setDeployMode] = useState<string>("ALL");
  const [deploying, setDeploying] = useState<boolean>(false);

  // Form Upload Firmware mới
  const [newVersion, setNewVersion] = useState<string>("v1.2.0");
  const [newChangelog, setNewChangelog] = useState<string>("");
  const [newType, setNewType] = useState<string>("STABLE");

  // Xóa firmware
  const [deleteSingleFwTarget, setDeleteSingleFwTarget] = useState<FirmwareRelease | null>(null);
  const [deletingFw, setDeletingFw] = useState<boolean>(false);

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
    return { Authorization: `Bearer ${token}` };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const [fwRes, campRes] = await Promise.all([
        fetch(`${getApiBaseUrl()}/api/admin/firmware`, { headers }),
        fetch(`${getApiBaseUrl()}/api/admin/ota/campaigns`, { headers })
      ]);
      const fwData = await fwRes.json();
      const campData = await campRes.json();

      if (fwData.success) setFirmwares(fwData.releases || []);
      if (campData.success && campData.campaigns && campData.campaigns.length > 0) {
        setCampaigns(campData.campaigns);
        const latestId = campData.campaigns[0].id;
        const detRes = await fetch(`${getApiBaseUrl()}/api/admin/ota/campaigns/${latestId}`, { headers });
        const detData = await detRes.json();
        if (detData.success) {
          setRecords(detData.records || []);
        }
      }
    } catch (e) {
      console.error("Lỗi nạp dữ liệu OTA:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const currentModel = useMemo(() => {
    return COMMERCIAL_MODELS.find(m => m.id === selectedModelId) || COMMERCIAL_MODELS[0];
  }, [selectedModelId]);

  // Danh sách các loại phần cứng tương ứng với nhóm đang chọn
  const availableHardwareTypes = useMemo(() => {
    if (groupFilter === "ALL") return HARDWARE_TYPES;
    return HARDWARE_TYPES.filter(h => h.groupCode === groupFilter);
  }, [groupFilter]);

  // Xử lý đổi nhóm sản phẩm
  const handleGroupChange = (newGroup: string) => {
    setGroupFilter(newGroup);
    if (newGroup !== "ALL") {
      const validHw = HARDWARE_TYPES.filter(h => h.groupCode === newGroup);
      if (!validHw.some(h => h.code === hardwareTypeFilter)) {
        setHardwareTypeFilter("ALL");
      }
    }
  };

  // Lọc mẫu thương phẩm theo cả Nhóm sản phẩm, Loại phần cứng và Tìm kiếm
  const filteredModels = useMemo(() => {
    return COMMERCIAL_MODELS.filter(m => {
      const matchGroup = groupFilter === "ALL" || m.groupCode === groupFilter;
      const matchHw = hardwareTypeFilter === "ALL" || m.hardwareTypeCode === hardwareTypeFilter;
      const matchSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.modelCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.groupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.hardwareTypeName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGroup && matchHw && matchSearch;
    });
  }, [groupFilter, hardwareTypeFilter, searchQuery]);

  const modelFirmwares = useMemo(() => {
    return firmwares.filter(f => f.modelCode === currentModel.modelCode);
  }, [firmwares, currentModel.modelCode]);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    toast.success("Đã sao chép mã SHA-256!");
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleRequestAuth = (action: "VIEW_CODE" | "UPLOAD_FW") => {
    setAuthActionType(action);
    setOtpCode("");
    setShowAuthModal(true);
  };

  const handleAutoFillDemoOtp = () => {
    const demoCode = "882391";
    setOtpCode(demoCode);
    toast.info("Đã điền mã xác thực thử nghiệm: 882391");
  };

  const handleConfirmOtp = () => {
    if (!otpCode || otpCode.trim().length < 6) {
      toast.error("Vui lòng nhập đủ mã xác thực 6 chữ số!");
      return;
    }
    setIsVerifyingOtp(true);
    setTimeout(() => {
      setIsVerifyingOtp(false);
      setShowAuthModal(false);
      toast.success("Xác thực Email Quản trị viên thành công!");
      if (authActionType === "VIEW_CODE") {
        setIsCodeUnlocked(true);
        setActiveRightTab("code");
      } else if (authActionType === "UPLOAD_FW") {
        setShowUploadModal(true);
      }
    }, 500);
  };

  const handleConfirmDeleteFw = async () => {
    if (!deleteSingleFwTarget) return;
    setDeletingFw(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/firmware/${deleteSingleFwTarget.id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setFirmwares(prev => prev.filter(f => f.id !== deleteSingleFwTarget.id));
        toast.success(`Đã xóa bản phát hành ${deleteSingleFwTarget.version}!`);
        setDeleteSingleFwTarget(null);
      } else {
        toast.error(data.error || "Lỗi khi xóa firmware");
      }
    } catch (e: any) {
      toast.error(`Lỗi kết nối: ${e.message}`);
    } finally {
      setDeletingFw(false);
    }
  };

  const handleDeployCampaign = async () => {
    try {
      setDeploying(true);
      const res = await fetch(`${getApiBaseUrl()}/api/admin/ota/deploy`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          name: `Chiến dịch phát hành ${deployVersion} cho ${currentModel.modelCode}`,
          targetModel: currentModel.modelCode,
          targetVersion: deployVersion,
          rolloutType: deployMode
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã khởi tạo chiến dịch nạp OTA cho ${currentModel.name}!`);
        setShowDeployModal(false);
        fetchData();
      } else {
        toast.error(data.error || "Không thể khởi chạy chiến dịch");
      }
    } catch (e) {
      toast.error("Lỗi kết nối khi khởi chạy OTA");
    } finally {
      setDeploying(false);
    }
  };

  const handleCreateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/firmware`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          version: newVersion,
          modelCode: currentModel.modelCode,
          binaryFilename: `firmware_${currentModel.modelCode.toLowerCase()}_${newVersion}.bin`,
          binaryUrl: `${getApiBaseUrl()}/firmware/${currentModel.modelCode.toLowerCase()}_${newVersion}.bin`,
          fileSizeBytes: 1612000,
          sha256Checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          releaseType: newType,
          changelog: newChangelog || "Cập nhật tính năng & nâng cao độ ổn định cho thiết bị"
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã phát hành firmware ${newVersion} cho ${currentModel.name}!`);
        setShowUploadModal(false);
        setNewChangelog("");
        fetchData();
      } else {
        toast.error(data.error || "Lỗi tạo bản release");
      }
    } catch (err) {
      toast.error("Lỗi khi gửi dữ liệu lên máy chủ");
    }
  };

  const handleRetryDevice = async (recordId: number) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/ota/retry/${recordId}`, {
        method: "POST",
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: "DOWNLOADING", progressPct: 35, errorReason: null } : r));
        toast.success("Đã gửi lại yêu cầu nạp cho thiết bị!");
      }
    } catch (e) {
      toast.error("Lỗi kết nối khi gửi lại lệnh");
    }
  };

  if (!canView("mod_ota") && !canView("mod_dev")) {
    return (
      <AccessDenied 
        moduleName="Quản Lý Firmware & OTA (Firmware Releases & OTA Campaigns)"
        requiredModule="mod_ota"
      />
    );
  }

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col min-h-0 overflow-hidden p-2.5 space-y-2 bg-slate-50 dark:bg-slate-950">
      
      {/* THANH TIÊU ĐỀ TRÊN CÙNG */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            Quản trị Firmware & Cập nhật OTA
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Quản lý kho firmware theo mẫu thương phẩm, xem mã nguồn bảo mật và khởi chạy nạp không dây từ xa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Nút nạp OTA (Primary Action) */}
          {(canUpdate("mod_ota") || canUpdate("mod_dev")) && (
            <button
              onClick={() => {
                setDeployVersion(currentModel.currentStableVersion);
                setShowDeployModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
            >
              <Play className="w-3.5 h-3.5" />
              Khởi chạy OTA
            </button>
          )}

          {/* Nút thêm Firmware mới (Primary Action) */}
          {(canCreate("mod_ota") || canCreate("mod_dev")) && (
            <button
              onClick={() => handleRequestAuth("UPLOAD_FW")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm Firmware (.bin)
            </button>
          )}
        </div>
      </div>

      {/* NỘI DUNG 2 KHỐI CHÍNH TRỌN VẸN TRONG 100VH */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-2.5 overflow-hidden">
        
        {/* ========================================================================= */}
        {/* KHỐI 1 (BÊN TRÁI): KHO MẪU THƯƠNG PHẨM (2 COMBOBOX BỘ LỌC) */}
        {/* ========================================================================= */}
        <div className="w-full md:w-80 shrink-0 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
          
          {/* Header & 2 Combobox Filter */}
          <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Mẫu Thương Phẩm ({filteredModels.length})
              </span>
              <span className="text-[10px] text-slate-400">Chọn mẫu để xem</span>
            </div>

            {/* Ô tìm kiếm từ khóa */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc mã model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
              />
            </div>

            {/* 2 COMBOBOX BỘ LỌC: NHÓM SẢN PHẨM & LOẠI PHẦN CỨNG */}
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Nhóm sản phẩm:
                </label>
                <select
                  value={groupFilter}
                  onChange={(e) => handleGroupChange(e.target.value)}
                  className="w-full text-[11px] py-1 px-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 cursor-pointer"
                >
                  <option value="ALL">Tất cả nhóm</option>
                  {PRODUCT_GROUPS.map((grp) => (
                    <option key={grp.code} value={grp.code}>
                      {grp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Loại phần cứng:
                </label>
                <select
                  value={hardwareTypeFilter}
                  onChange={(e) => setHardwareTypeFilter(e.target.value)}
                  className="w-full text-[11px] py-1 px-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 cursor-pointer"
                >
                  <option value="ALL">Tất cả phần cứng</option>
                  {availableHardwareTypes.map((hw) => (
                    <option key={hw.code} value={hw.code}>
                      {hw.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Danh sách thẻ mẫu thương phẩm (Cuộn bên trong) */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filteredModels.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Không tìm thấy mẫu thương phẩm phù hợp với bộ lọc
              </div>
            ) : (
              filteredModels.map((model) => {
                const isSelected = model.id === currentModel.id;
                const releaseCount = firmwares.filter(f => f.modelCode === model.modelCode).length;

                return (
                  <div
                    key={model.id}
                    onClick={() => {
                      setSelectedModelId(model.id);
                      setIsCodeUnlocked(false);
                      setActiveCodeFileIndex(0);
                    }}
                    className={`p-2.5 cursor-pointer transition flex items-center gap-2.5 ${
                      isSelected 
                        ? "bg-slate-100/80 dark:bg-slate-800 border-l-2 border-cyan-500" 
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <img 
                      src={model.imageUrl} 
                      alt={model.name}
                      className="w-10 h-10 rounded-md object-cover border border-slate-200 dark:border-slate-700 shrink-0" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase truncate">
                          {model.groupName}
                        </span>
                        <span className="text-[10px] px-1 rounded bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-mono shrink-0">
                          {releaseCount} fw
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate mt-0.5">
                        {model.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                        <span className="truncate max-w-[140px] font-mono">{model.hardwareTypeName}</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono shrink-0">{model.currentStableVersion}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* KHỐI 2 (BÊN PHẢI): CHI TIẾT MẪU & QUẢN TRỊ FIRMWARE / CODE / TIẾN ĐỘ */}
        {/* ========================================================================= */}
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
          
          {/* Header Thông tin Mẫu Thương phẩm */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-3">
                <img 
                  src={currentModel.imageUrl} 
                  alt={currentModel.name}
                  className="w-11 h-11 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0" 
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                      {currentModel.groupName}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {currentModel.hardwareTypeName}
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      Mã: {currentModel.modelCode}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                    {currentModel.name}
                  </h2>
                </div>
              </div>

              {/* Thông số phần cứng nhanh */}
              <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 shrink-0">
                <div className="flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{currentModel.mcu}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{currentModel.flashSize}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{currentModel.currentStableVersion}</span>
                </div>
              </div>
            </div>
          </div>

          {/* THANH TAB CHUYỂN ĐỔI: KHO FIRMWARE vs MÃ NGUỒN CỐT LÕI */}
          <div className="flex items-center justify-between px-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shrink-0 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveRightTab("firmware")}
                className={`py-2 px-3 font-semibold border-b-2 transition flex items-center gap-1.5 ${
                  activeRightTab === "firmware"
                    ? "border-cyan-600 text-cyan-600 dark:text-cyan-400 dark:border-cyan-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                Kho Bản Phát Hành (.bin) & Tiến Độ Nạp ({modelFirmwares.length})
              </button>

              <button
                onClick={() => setActiveRightTab("code")}
                className={`py-2 px-3 font-semibold border-b-2 transition flex items-center gap-1.5 ${
                  activeRightTab === "code"
                    ? "border-cyan-600 text-cyan-600 dark:text-cyan-400 dark:border-cyan-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {isCodeUnlocked ? <Unlock className="w-3.5 h-3.5 text-emerald-500" /> : <Lock className="w-3.5 h-3.5 text-amber-500" />}
                Mã Nguồn Cốt Lõi (Code Preview)
              </button>
            </div>

            <div className="flex items-center gap-1.5 py-1">
              {activeRightTab === "firmware" && (canCreate("mod_ota") || canCreate("mod_dev")) && (
                <button
                  onClick={() => handleRequestAuth("UPLOAD_FW")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                >
                  <Plus className="w-3 h-3" />
                  Thêm bản .bin
                </button>
              )}

              {activeRightTab === "code" && isCodeUnlocked && (
                <button
                  onClick={() => setIsCodeUnlocked(false)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
                >
                  <EyeOff className="w-3 h-3" />
                  Khóa lại
                </button>
              )}
            </div>
          </div>

          {/* VÙNG NỘI DUNG CUỘN NỘI BỘ */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3.5">
            
            {/* TAB 1: KHO BẢN PHÁT HÀNH FIRMWARE & TIẾN ĐỘ THIẾT BỊ NẠP */}
            {activeRightTab === "firmware" ? (
              <div className="space-y-4">
                
                {/* 1.1 Danh sách các bản phát hành Firmware (.bin) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Các Tệp Nhị Phân Firmware Sẵn Sàng
                    </span>
                    <span className="text-[11px] text-slate-400">Kiểm tra SHA-256 trước khi triển khai</span>
                  </div>

                  {modelFirmwares.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                      Chưa có tệp nhị phân .bin nào cho mẫu này. Bấm "Thêm bản .bin" để phát hành phiên bản mới.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {modelFirmwares.map((fw) => (
                        <div
                          key={fw.id}
                          className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 transition space-y-2 text-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 dark:text-white text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                                {fw.version}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                                fw.releaseType === "STABLE"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                              }`}>
                                {fw.releaseType}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {new Date(fw.createdAt).toLocaleDateString("vi-VN")}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setDeployVersion(fw.version);
                                  setShowDeployModal(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1 shadow-xs"
                              >
                                <Play className="w-3 h-3" />
                                Nạp OTA
                              </button>

                              {(canDelete("mod_ota") || canDelete("mod_dev")) && (
                                <button
                                  onClick={() => setDeleteSingleFwTarget(fw)}
                                  className="p-1 text-slate-400 hover:text-red-500 rounded transition"
                                  title="Xóa bản phát hành"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                            {fw.changelog}
                          </p>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                            <div className="flex items-center gap-3">
                              <span>Dung lượng: <strong className="text-slate-700 dark:text-slate-300">{(fw.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</strong></span>
                              <span>Tệp: <code className="text-slate-600 dark:text-slate-400 font-mono text-[10px]">{fw.binaryFilename}</code></span>
                            </div>

                            {/* Mã băm SHA-256 */}
                            <div className="flex items-center gap-1 font-mono text-[10px] bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              <span className="text-slate-400">SHA256:</span>
                              <span className="text-slate-700 dark:text-slate-300">
                                {fw.sha256Checksum.substring(0, 10)}...{fw.sha256Checksum.substring(fw.sha256Checksum.length - 8)}
                              </span>
                              <button
                                onClick={() => handleCopyHash(fw.sha256Checksum)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1"
                                title="Sao chép toàn bộ mã SHA256"
                              >
                                {copiedHash === fw.sha256Checksum ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 1.2 Tiến độ thiết bị nạp thực tế ngoài đời */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-slate-500" />
                      Tiến Độ Nạp Mạch Phần Cứng ({records.length} thiết bị)
                    </span>
                    <button
                      onClick={fetchData}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      title="Làm mới tiến độ"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    </button>
                  </div>

                  {records.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                      Chưa có tiến trình nạp nào đang diễn ra. Bấm "Khởi chạy OTA" để bắt đầu nạp xuống thiết bị.
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden text-xs">
                      {records.map((rec) => (
                        <div key={rec.id} className="p-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{rec.customerName}</span>
                                <span className="font-mono text-[10px] px-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">
                                  {rec.hardwareId}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.2">
                                Bản cũ: {rec.currentVersion} ➔ Bản nạp: <strong className="text-slate-700 dark:text-slate-200">{rec.targetVersion}</strong>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              rec.status === "SUCCESS"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : rec.status === "DOWNLOADING"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 animate-pulse"
                                : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                            }`}>
                              {rec.status} ({rec.progressPct}%)
                            </span>

                            {rec.status !== "SUCCESS" && (
                              <button
                                onClick={() => handleRetryDevice(rec.id)}
                                className="px-2 py-0.5 text-[11px] font-medium rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                              >
                                Thử lại
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              /* TAB 2: XEM MÃ NGUỒN CỐT LÕI (FIRMWARE CODE PREVIEW) */
              <div className="h-full flex flex-col min-h-0">
                {!isCodeUnlocked ? (
                  <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-8 text-center flex flex-col items-center justify-center my-auto">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 mb-2">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Mã Nguồn Được Bảo Vệ Cấp Cao (Admin 2FA)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">
                      Để bảo vệ bản quyền công nghệ và an toàn cửa cuốn, bạn cần xác thực mã OTP qua Email Quản trị viên để mở khóa xem mã nguồn.
                    </p>
                    <button
                      onClick={() => handleRequestAuth("VIEW_CODE")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-200 dark:hover:bg-white dark:text-slate-900 transition shadow-xs"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Xác Thực Email Admin Để Xem Code
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 flex flex-col space-y-2">
                    {/* Header Files & Actions */}
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        {currentModel.codeFiles.map((file, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveCodeFileIndex(idx)}
                            className={`px-2.5 py-1 text-xs font-mono rounded transition flex items-center gap-1.5 ${
                              activeCodeFileIndex === idx
                                ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-bold"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                          >
                            <FileCode className="w-3.5 h-3.5" />
                            {file.name}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          const code = currentModel.codeFiles[activeCodeFileIndex]?.code || "";
                          navigator.clipboard.writeText(code);
                          toast.success("Đã sao chép mã nguồn!");
                        }}
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Sao chép code
                      </button>
                    </div>

                    {/* Khung Editor Hiển thị Code */}
                    <div className="flex-1 min-h-0 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex flex-col shadow-inner">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 font-mono shrink-0">
                        <span>{currentModel.codeFiles[activeCodeFileIndex]?.name} • C++ (ESP-IDF)</span>
                        <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                          <Unlock className="w-3 h-3" /> Đã xác thực an toàn
                        </span>
                      </div>
                      <pre className="flex-1 min-h-0 p-3.5 text-xs font-mono text-slate-200 overflow-auto leading-relaxed scrollbar-thin">
                        <code>{currentModel.codeFiles[activeCodeFileIndex]?.code}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* DIALOG XÁC THỰC EMAIL QUẢN TRỊ VIÊN (DEMO OTP DIALOG) */}
      {/* ========================================================================= */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase">
                  Xác Thực Quản Trị Viên (Admin 2FA)
                </h3>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Xác nhận danh tính trước khi {authActionType === "VIEW_CODE" ? "xem mã nguồn Firmware" : "thêm bản phát hành mới"}. Mã đã gửi đến:
              </p>
              
              <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 font-mono text-center font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                admin@austec.vn
              </div>

              {/* Ô nhập mã OTP */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                  Nhập mã OTP 6 chữ số:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Ví dụ: 882391"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full text-center tracking-widest text-base font-mono font-bold py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-slate-500"
                />
              </div>

              {/* Nút Demo Tự Động Điền Mã */}
              <button
                type="button"
                onClick={handleAutoFillDemoOtp}
                className="w-full py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3 h-3" />
                Tự động điền mã xác thực (Demo: 882391)
              </button>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="flex-1 py-1.5 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmOtp}
                disabled={isVerifyingOtp}
                className="flex-1 py-1.5 text-xs font-semibold rounded bg-slate-900 hover:bg-black dark:bg-slate-200 dark:hover:bg-white text-white dark:text-slate-900 transition flex items-center justify-center gap-1"
              >
                {isVerifyingOtp ? "Đang xác thực..." : "Xác nhận & Mở khóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL KHỞI CHẠY CHIẾN DỊCH NẠP OTA */}
      {/* ========================================================================= */}
      {showDeployModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-emerald-600" />
                Khởi chạy chiến dịch nạp OTA
              </h3>
              <button onClick={() => setShowDeployModal(false)} className="text-slate-400 text-sm">✕</button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-slate-500 block mb-0.5">Mẫu thương phẩm đích:</label>
                <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                  {currentModel.name}
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-0.5">Phiên bản Firmware mục tiêu:</label>
                <input
                  type="text"
                  value={deployVersion}
                  onChange={(e) => setDeployVersion(e.target.value)}
                  className="w-full py-1.5 px-2.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-0.5">Phạm vi triển khai:</label>
                <select
                  value={deployMode}
                  onChange={(e) => setDeployMode(e.target.value)}
                  className="w-full py-1.5 px-2.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="ALL">Toàn bộ thiết bị thuộc Model này</option>
                  <option value="CANARY_10">Thử nghiệm 10% thiết bị</option>
                  <option value="BETA_TESTERS">Chỉ nhóm khách hàng thử nghiệm</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowDeployModal(false)}
                className="flex-1 py-1.5 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Hủy
              </button>
              <button
                onClick={handleDeployCampaign}
                disabled={deploying}
                className="flex-1 py-1.5 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {deploying ? "Đang gửi..." : "Bắt đầu triển khai"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL THÊM BẢN FIRMWARE MỚI (.BIN) */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form onSubmit={handleCreateRelease} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                <UploadCloud className="w-3.5 h-3.5 text-cyan-600" />
                Thêm bản phát hành Firmware (.bin)
              </h3>
              <button type="button" onClick={() => setShowUploadModal(false)} className="text-slate-400 text-sm">✕</button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-slate-500 block mb-0.5">Mẫu thương phẩm đích:</label>
                <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                  {currentModel.name}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-500 block mb-0.5">Phiên bản (VD: v1.2.0):</label>
                  <input
                    type="text"
                    required
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    className="w-full py-1.5 px-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-0.5">Loại phát hành:</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full py-1.5 px-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="STABLE">STABLE</option>
                    <option value="BETA">BETA</option>
                    <option value="HOTFIX">HOTFIX</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-0.5">Nội dung nâng cấp (Changelog):</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ghi ngắn gọn cải tiến..."
                  value={newChangelog}
                  onChange={(e) => setNewChangelog(e.target.value)}
                  className="w-full py-1 px-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="flex-1 py-1.5 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 py-1.5 text-xs font-semibold rounded bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                Lưu vào máy chủ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA FIRMWARE */}
      <ConfirmDeleteModal
        isOpen={!!deleteSingleFwTarget}
        title="Xác nhận xóa bản phát hành Firmware"
        itemName={deleteSingleFwTarget?.version}
        itemType="bản phát hành firmware"
        description={`Bạn có chắc chắn muốn xóa bản phát hành "${deleteSingleFwTarget?.version}" của mẫu ${deleteSingleFwTarget?.modelCode}? Hành động này không thể hoàn tác.`}
        isDeleting={deletingFw}
        onConfirm={handleConfirmDeleteFw}
        onClose={() => setDeleteSingleFwTarget(null)}
      />
    </div>
  );
}
