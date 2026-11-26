"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { getApiBaseUrl, getWsChatUrl } from "@/context/apiConfig";
import { useCustomerAuth } from "./CustomerAuthContext";
import { customerApi } from "../services/customer-api-client";
import {
  CategoryMeta,
  CommandResult,
  DeviceCategory,
  DeviceItem,
  FamilyRole,
  ProductItem,
  canPerformControl,
  canViewCameraStream,
  getScheduleBlockedReason,
} from "../types/device";

export const AUSTEC_CATEGORIES: CategoryMeta[] = [
  {
    category: "rollerDoor",
    title: "DOORS",
    titleVi: "Cửa cuốn",
    subtitle: "CỬA CUỐN AUSTEC",
    subtitleEn: "Roller doors",
    iconName: "DoorOpen",
    accentColor: "#3B82F6",
    offsetX: -145,
    offsetY: -115,
  },
  {
    category: "camera",
    title: "CAMERA",
    titleVi: "Camera",
    subtitle: "CAMERA AN NINH AI",
    subtitleEn: "Security cameras",
    iconName: "Video",
    accentColor: "#06B6D4",
    offsetX: 0,
    offsetY: -175,
  },
  {
    category: "energyManage",
    title: "ENERGY MANAGE",
    titleVi: "Năng lượng",
    subtitle: "CÔNG TƠ & PIN BMS",
    subtitleEn: "Meter & BMS",
    iconName: "Zap",
    accentColor: "#F59E0B",
    offsetX: 145,
    offsetY: -115,
  },
  {
    category: "lightSwitch",
    title: "LIGHT & SWITCH",
    titleVi: "Ổ cắm & Đèn",
    subtitle: "CHIẾU SÁNG & ĐÓNG CẮT",
    subtitleEn: "Switches & relays",
    iconName: "Power",
    accentColor: "#10B981",
    offsetX: -180,
    offsetY: 20,
  },
  {
    category: "environment",
    title: "ENVIRONMENT",
    titleVi: "Môi trường",
    subtitle: "CẢM BIẾN KHÔNG KHÍ",
    subtitleEn: "Air sensors",
    iconName: "Thermometer",
    accentColor: "#14B8A6",
    offsetX: 180,
    offsetY: 20,
  },
  {
    category: "dataAnalytics",
    title: "DATA ANALYTICS",
    titleVi: "Phân tích",
    subtitle: "THỐNG KÊ VẬN HÀNH",
    subtitleEn: "Data analytics",
    iconName: "BarChart3",
    accentColor: "#6366F1",
    offsetX: -135,
    offsetY: 150,
  },
  {
    category: "othersControl",
    title: "OTHERS CONTROL",
    titleVi: "Thiết bị khác",
    subtitle: "KHÓA & ĐIỀU KHIỂN",
    subtitleEn: "Locks & relays",
    iconName: "Lock",
    accentColor: "#8B5CF6",
    offsetX: 135,
    offsetY: 150,
  },
];

export const DEFAULT_STORE_PRODUCTS: ProductItem[] = [
  {
    id: "PROD-01",
    name: "Cửa Cuốn Austec Titadoor A900 Super",
    categoryTag: "Cửa Cuốn",
    subtitle: "Nhôm định hình 6063 T6 • Khe thoáng thông minh",
    price: 18500000,
    originalPrice: 21000000,
    rating: 4.9,
    reviewsCount: 142,
    imagePath: "/logo-app.webp",
    warrantyText: "Bảo hành chính hãng 24 tháng theo Hardware ID",
    highlights: [
      "Sơn tĩnh điện cao cấp AkzoNobel chống bay màu 10 năm",
      "Tích hợp cảm biến tự dừng & đảo chiều khi gặp vật cản",
      "Bo mạch thông minh hỗ trợ kết nối kép WiFi + Bluetooth BLE",
      "Vận hành siêu êm với gioăng cao su giảm chấn 2 chiều",
    ],
    specs: {
      "Độ dày nan cửa": "1.4mm - 1.8mm",
      "Chất liệu": "Hợp kim nhôm tiêu chuẩn quốc tế 6063-T6",
      "Màu sắc": "Ghi sần / Cafe ánh kim / Vàng kem",
      "Chuẩn kết nối": "BLE 5.0 + WiFi 2.4GHz + RF 433MHz Rolling Code",
    },
  },
  {
    id: "PROD-02",
    name: "Khóa Cửa Thông Minh Masaru Titan X1 Pro",
    categoryTag: "Khóa Thông Minh",
    subtitle: "Nhận diện khuôn mặt 3D FaceID • Vân tay FPC Thụy Điển",
    price: 8900000,
    originalPrice: 10500000,
    rating: 5.0,
    reviewsCount: 98,
    imagePath: "/logo-app.webp",
    warrantyText: "Bảo hành 1 đổi 1 trong 24 tháng",
    highlights: [
      "Mở khóa 6 trong 1: FaceID 3D, Vân tay, Mã số ảo, Thẻ từ, App, Khóa cơ",
      "Chuông hình quan sát ban đêm góc siêu rộng 160 độ",
      "Thân khóa hợp kim Titan nguyên khối chống cưa cắt tuyệt đối",
      "Pin Lithium sạc lại dung lượng cao 5000mAh",
    ],
    specs: {
      "Dung lượng lưu trữ": "100 Khuôn mặt, 100 Vân tay, 100 Mật mã",
      "Độ dày cửa phù hợp": "40mm - 120mm (Cửa gỗ, cửa chống cháy)",
      "Nguồn điện": "Pin sạc Polymer Lithium 7.4V Type-C",
      "Cảnh báo": "Báo động đột nhập, cạy khóa, nhập sai mã 5 lần",
    },
  },
  {
    id: "PROD-03",
    name: "Bộ Lưu Điện Sin Chuẩn Austec Pro 1200VA",
    categoryTag: "Lưu Điện UPS",
    subtitle: "Sóng Sin chuẩn 220V • Xả bảo dưỡng tự động thông minh",
    price: 4500000,
    originalPrice: 5200000,
    rating: 4.8,
    reviewsCount: 76,
    imagePath: "/logo-app.webp",
    warrantyText: "Bảo hành 24 tháng ắc quy & bo mạch",
    highlights: [
      "Công nghệ sóng Sin tinh khiết bảo vệ tuyệt đối mô tơ cửa",
      "Thời gian lưu điện lên đến 48 giờ sau khi mất điện lưới",
      "Tính năng tự xả bảo dưỡng pin định kỳ kéo dài tuổi thọ gấp 2 lần",
      "Hiển thị điện áp và % pin trực tiếp trên App & Web Austec",
    ],
    specs: {
      "Công suất": "1200VA / 900W",
      "Điện áp vào/ra": "220V ± 5% (50Hz)",
      "Dung lượng ắc quy": "2x 12V / 12Ah kín khí chuyên dụng",
      "Hiệu suất chuyển đổi": "≥ 95%",
    },
  },
  {
    id: "PROD-04",
    name: "Mô Tơ Cửa Cuốn Austec Turbo 800KG",
    categoryTag: "Động Cơ & Bo Mạch",
    subtitle: "Lõi đồng 100% • Tích hợp phanh điện từ kép an toàn",
    price: 7200000,
    originalPrice: 8000000,
    rating: 4.9,
    reviewsCount: 115,
    imagePath: "/logo-app.webp",
    warrantyText: "Bảo hành 24 tháng chính hãng",
    highlights: [
      "Động cơ dây đồng chịu nhiệt cao 180 độ C",
      "Hệ thống bánh răng hành tinh thép gia cường chống mài mòn",
      "Tích hợp sẵn rơ-le chống kẹt và bộ tiếp nhận mã nhảy chống dò mã",
      "Dễ dàng tích hợp với cảm biến khói báo cháy tự động mở cửa thoát hiểm",
    ],
    specs: {
      "Sức nâng danh định": "800 kg",
      "Công suất động cơ": "480W",
      "Tốc độ kéo": "12 vòng/phút",
      "Bộ điều khiển": "Hỗ trợ 20 remote mã nhảy 433MHz",
    },
  },
  {
    id: "PROD-05",
    name: "Trạm Cảm Biến Môi Trường Austec MultiSensor M1",
    categoryTag: "Cảm Biến",
    subtitle: "Đo nhiệt độ, độ ẩm, chất lượng không khí AQI PM2.5",
    price: 1250000,
    originalPrice: 1600000,
    rating: 4.7,
    reviewsCount: 52,
    imagePath: "/logo-app.webp",
    warrantyText: "Bảo hành 12 tháng chính hãng",
    highlights: [
      "Cảm biến Sensirion Thụy Sĩ độ chính xác cực cao",
      "Cập nhật dữ liệu thời gian thực theo từng giây lên Cloud",
      "Tự động kích hoạt thông gió hoặc hạ cửa hé khi trời nồm ẩm",
    ],
    specs: {
      "Dải nhiệt độ": "-10°C đến +60°C (±0.2°C)",
      "Dải độ ẩm": "0% đến 100% RH (±2%)",
      "Giao thức": "Zigbee 3.0 / BLE Mesh",
    },
  },
];

function createMockSmartMetter(): DeviceItem {
  return {
    id: "mock_smartmetter_1",
    hardwareId: "SmartMetter_A834",
    name: "Công tơ điện tử chống giật",
    modelName: "SmartMetter Pro",
    modelCode: "SmartMetter",
    category: "energyManage",
    roomName: "Tủ điện tổng",
    badgeText: "CHỐNG GIẬT",
    deviceNumber: "834",
    isOnline: true,
    warrantyUntil: "2029-12-31",
    warrantyCode: "EW-METER-834",
    userRole: "owner",
    canControl: true,
    canViewHistory: true,
    canChildLock: true,
    canConfig: true,
    ownerName: "Chủ nhà",
    currentProperties: {
      kwh: 123.45,
      voltage_v: 220.5,
      current_a: 12.4,
      power_kw: 2.73,
      power_status: "ON",
      is_meter_on: true,
      power_limit_w: 4500,
      relay_cut: false,
    },
    assignedProperties: [],
    subscriptionType: "PERPETUAL",
    subscriptionStatus: "ACTIVE",
    installationAddress: "Tủ điện tổng - Tầng 1",
    locationLat: 21.028511,
    locationLng: 105.854167,
    positionPercent: 0,
    isChildLockActive: false,
    isMoving: false,
    movingDirection: "stop",
    openTimeoutSeconds: 23,
    closeTimeoutSeconds: 20,
    isAutoScheduleActive: false,
    isAccessLimitActive: false,
    accessStartTime: "08:00",
    accessEndTime: "18:00",
    accessDays: [true, true, true, true, true, true, true],
    rfRemoteCount: 0,
    motorCurrentA: 12.4,
    acVoltage: 220.5,
    deviceIp: "192.168.1.140",
    isRelayOn: true,
    brightnessPercent: 100,
    subChannels: [true],
    powerWatt: 2730,
    isRecording: false,
    isAlarmActive: false,
    streamResolution: "",
    temperature: 32.0,
    humidity: 60.0,
    airQualityAqi: 25,
    batteryPercent: 100,
    batteryVoltage: 220.5,
    isDischarging: false,
    currentPowerKw: 2.73,
    aiStatus: "Active",
    isLocked: false,
    lastUnlockUser: "",
    auditLogs: [],
  };
}

function createMockBms(): DeviceItem {
  return {
    id: "mock_bms_1",
    hardwareId: "BMS_52V150AH",
    name: "Hệ thống Pin BMS Lithium",
    modelName: "Austec Smart BMS 16S",
    modelCode: "BMS_16S_150A",
    category: "energyManage",
    roomName: "Phòng kỹ thuật",
    badgeText: "16S 150A",
    deviceNumber: "150",
    isOnline: true,
    warrantyUntil: "2029-06-30",
    warrantyCode: "EW-BMS-150A",
    userRole: "owner",
    canControl: true,
    canViewHistory: true,
    canChildLock: false,
    canConfig: true,
    ownerName: "Chủ nhà",
    currentProperties: {
      soc_percent: 95,
      capacity_current_ah: 142.5,
      capacity_total_ah: 150.0,
      status_tag: "ĐANG XẢ",
      total_voltage: 52.8,
      avg_cell_voltage: 3.3,
      current_a: -68.5,
      current_limit_a: 150.0,
      power_kw: 3.62,
      temp_c: 34.5,
      delta_v: 0.012,
      cell_count: 16,
      cells: [
        { cell: 1, v: 3.301, a: -0.39, r: 3.559, status: "NORMAL" },
        { cell: 2, v: 3.301, a: -0.35, r: 3.594, status: "NORMAL" },
        { cell: 3, v: 3.301, a: -0.38, r: 3.596, status: "NORMAL" },
        { cell: 4, v: 3.301, a: -0.28, r: 3.466, status: "NORMAL" },
        { cell: 5, v: 3.301, a: -0.8, r: 3.582, status: "NORMAL" },
        { cell: 6, v: 3.301, a: -0.35, r: 3.471, status: "WARN" },
        { cell: 7, v: 3.301, a: -0.35, r: 3.592, status: "NORMAL" },
        { cell: 8, v: 3.301, a: -0.6, r: 3.343, status: "NORMAL" },
        { cell: 9, v: 3.301, a: -1.65, r: 1.35, status: "NORMAL" },
        { cell: 10, v: 3.301, a: -0.35, r: 3.535, status: "NORMAL" },
        { cell: 11, v: 3.301, a: -0.38, r: 3.596, status: "NORMAL" },
        { cell: 12, v: 3.301, a: -0.75, r: 3.532, status: "WARN" },
        { cell: 13, v: 3.301, a: -0.28, r: 3.466, status: "NORMAL" },
        { cell: 14, v: 3.301, a: -0.38, r: 3.559, status: "NORMAL" },
        { cell: 15, v: 3.301, a: -1.88, r: 1.38, status: "NORMAL" },
        { cell: 16, v: 3.301, a: 0.66, r: 3.272, status: "NORMAL" },
      ],
      faults: [
        {
          time: "13:42:10",
          code: "ERR_04",
          desc: "Quá dòng xả (Discharge Overcurrent: -68.5A)",
          level: "Nghiêm trọng",
          status: "Đang lỗi",
        },
        {
          time: "13:38:05",
          code: "WARN_02",
          desc: "Quá áp Cell 8 (Cell 8 Overvoltage: 3.650V)",
          level: "Cảnh báo",
          status: "Đang lỗi",
        },
        {
          time: "13:15:22",
          code: "WARN_05",
          desc: "Chênh lệch điện áp cao (Delta V > 0.050V)",
          level: "Cảnh báo",
          status: "Đang lỗi",
        },
        {
          time: "10:20:00",
          code: "ERR_01",
          desc: "Nhiệt độ MOS cao (High MOS Temp: 65.0°C)",
          level: "Nghiêm trọng",
          status: "Đã khắc phục",
        },
      ],
    },
    assignedProperties: [],
    subscriptionType: "PERPETUAL",
    subscriptionStatus: "ACTIVE",
    installationAddress: "Phòng kỹ thuật năng lượng",
    locationLat: 21.028511,
    locationLng: 105.854167,
    positionPercent: 0,
    isChildLockActive: false,
    isMoving: false,
    movingDirection: "stop",
    openTimeoutSeconds: 23,
    closeTimeoutSeconds: 20,
    isAutoScheduleActive: false,
    isAccessLimitActive: false,
    accessStartTime: "08:00",
    accessEndTime: "18:00",
    accessDays: [true, true, true, true, true, true, true],
    rfRemoteCount: 0,
    motorCurrentA: 68.5,
    acVoltage: 52.8,
    deviceIp: "192.168.1.142",
    isRelayOn: true,
    brightnessPercent: 100,
    subChannels: [true],
    powerWatt: 3620,
    isRecording: false,
    isAlarmActive: false,
    streamResolution: "",
    temperature: 34.5,
    humidity: 55.0,
    airQualityAqi: 20,
    batteryPercent: 95,
    batteryVoltage: 52.8,
    isDischarging: true,
    currentPowerKw: 3.62,
    aiStatus: "Active",
    isLocked: false,
    lastUnlockUser: "",
    auditLogs: [],
  };
}

export function parseDeviceFromJson(d: any, fallbackOwnerName: string = "Chủ sở hữu"): DeviceItem {
  const hwId = String(d.hardwareId ?? d.id ?? "");
  const name = String(
    d.customName ?? d.deviceName ?? d.name ?? d.modelName ?? "Thiết bị Austec"
  );
  const rawModelName = String(d.modelName ?? d.model_name ?? "");
  const rawModelCode = String(d.modelCode ?? d.model_code ?? "");
  const typeStr = String(d.deviceType ?? "");
  const explicitCat = String(d.category ?? d.deviceCategory ?? "").toLowerCase();

  const upperHwId = hwId.toUpperCase().trim();
  const lowerName = name.toLowerCase().trim();
  const lowerType = typeStr.toLowerCase().trim();
  const upperModel = rawModelCode.toUpperCase().trim();

  const isHubDoor =
    upperHwId.startsWith("WIFRFTT") ||
    upperHwId.startsWith("CUACUON") ||
    upperHwId.startsWith("AT-DOOR");
  const isWallDoor =
    upperHwId.startsWith("WIFRF_ECO") ||
    upperHwId.startsWith("WIFRFECO") ||
    upperHwId.startsWith("AMTUONG") ||
    upperHwId.includes("AMTUONG") ||
    (upperHwId.startsWith("WIFRF") && upperHwId.includes("ECO"));
  const isAnyDoor =
    isHubDoor ||
    isWallDoor ||
    upperHwId.startsWith("WIFRF") ||
    upperHwId.startsWith("DOOR") ||
    lowerType.includes("cửa") ||
    upperModel.includes("DOOR") ||
    lowerName.includes("cửa");

  const isSmartSw =
    upperHwId.startsWith("SMARTSW") ||
    hwId.includes("SmartSW") ||
    upperHwId.startsWith("OCAM") ||
    upperHwId.includes("SOCKET") ||
    lowerType.includes("ổ cắm") ||
    lowerType.includes("công tắc") ||
    upperModel.includes("SOCKET") ||
    upperModel.includes("SWITCH") ||
    lowerName.includes("ổ cắm") ||
    lowerName.includes("công tắc");

  const isSmartMeter =
    upperHwId.startsWith("SMARTMETTER") ||
    upperHwId.startsWith("SMARTMETER") ||
    lowerName.includes("smartmetter") ||
    lowerName.includes("smartmeter") ||
    upperHwId.includes("CONGTO") ||
    lowerType.includes("công tơ") ||
    upperModel.includes("METER") ||
    lowerName.includes("công tơ");

  const isCam =
    !isSmartSw &&
    !isSmartMeter &&
    (upperHwId.startsWith("CAM") ||
      upperHwId.includes("CAMERA") ||
      upperHwId.includes("ESP32-CAM") ||
      upperHwId.includes("OV2640") ||
      lowerType.includes("camera") ||
      upperModel.startsWith("CAM") ||
      lowerName.includes("camera"));

  let cat: DeviceCategory;
  if (isSmartSw) {
    cat = "lightSwitch";
  } else if (isCam) {
    cat = "camera";
  } else if (isSmartMeter) {
    cat = "energyManage";
  } else if (isAnyDoor) {
    cat = "rollerDoor";
  } else if (
    upperHwId.startsWith("BMS") ||
    lowerType.includes("bms") ||
    upperModel.includes("BMS")
  ) {
    cat = "energyManage";
  } else if (explicitCat === "lightswitch" || explicitCat === "socket") {
    cat = "lightSwitch";
  } else if (explicitCat === "camera") {
    cat = "camera";
  } else if (explicitCat === "rollerdoor" || explicitCat === "door") {
    cat = "rollerDoor";
  } else if (
    explicitCat === "energymanage" ||
    explicitCat === "energy" ||
    explicitCat === "meter" ||
    explicitCat === "bms"
  ) {
    cat = "energyManage";
  } else if (explicitCat === "dataanalytics") {
    cat = "dataAnalytics";
  } else if (explicitCat === "environment") {
    cat = "environment";
  } else {
    cat = "othersControl";
  }

  const modelName =
    rawModelName ||
    (cat === "lightSwitch"
      ? "Ổ cắm công tắc thông minh Austec"
      : cat === "camera"
        ? "AI Camera 360"
        : cat === "energyManage"
          ? "Công tơ điện tử chống giật"
          : cat === "rollerDoor"
            ? isWallDoor
              ? "Cửa cuốn âm tường Austec"
              : "Cửa cuốn trung tâm Austec"
            : "Austec Smart Device");

  const modelCode =
    rawModelCode ||
    (cat === "lightSwitch"
      ? "SMART_SOCKET_SW"
      : cat === "camera"
        ? "AI_CAMERA_360"
        : cat === "energyManage"
          ? "SMART_METER_PRO"
          : cat === "rollerDoor"
            ? isWallDoor
              ? "DOOR_INWALL_ECO"
              : "DOOR_HUB_WIFRFTT"
            : "OTHER_CONTROL_DEVICE");

  const props =
    d.currentProperties && typeof d.currentProperties === "object"
      ? { ...d.currentProperties }
      : {};
  const assignedProps = Array.isArray(d.assignedProperties) ? [...d.assignedProperties] : [];

  const doorState = String(props.door_state ?? "CLOSED");
  const pos =
    typeof props.position_percent === "number"
      ? Math.round(props.position_percent)
      : doorState === "CLOSED"
        ? 0
        : doorState === "OPEN"
          ? 100
          : 50;

  const openTimeout = Number(props.open_timeout ?? props.openTimeoutSeconds ?? 23) || 23;
  const closeTimeout = Number(props.close_timeout ?? props.closeTimeoutSeconds ?? 20) || 20;
  const autoSchedule = Boolean(props.is_auto_schedule || props.auto_schedule);
  const accessLimit = Boolean(
    d.scheduleLimitActive ||
      d.schedule_limit_active ||
      props.access_limit ||
      props.is_access_limit
  );
  const accessStart = String(
    d.accessStartTime ?? d.access_start_time ?? props.access_start ?? "08:00"
  );
  const accessEnd = String(
    d.accessEndTime ?? d.access_end_time ?? props.access_end ?? "18:00"
  );
  const rawDays = d.accessDays ?? d.access_days ?? props.access_days;
  const accessDays = Array.isArray(rawDays)
    ? rawDays.map((x: any) => Boolean(x))
    : [true, true, true, true, true, false, false];

  const isRelayOn = Boolean(
    props.is_relay_on === true || props.relay_state === "ON" || props.state === "ON"
  );

  const roleStr = String(d.roleInHome ?? d.userRole ?? "OWNER").toUpperCase();
  const uRole: FamilyRole =
    roleStr === "GUEST"
      ? "guest"
      : roleStr === "MEMBER" || roleStr === "FAMILY"
        ? "member"
        : "owner";

  const canControl = d.canControl !== false && d.can_control !== false;
  const canViewHistory = d.canViewHistory !== false && d.can_view_history !== false;
  const canChildLock =
    Boolean(d.canChildLock || d.can_child_lock) || uRole === "owner";
  const canConfig = Boolean(d.canConfig || d.can_config) || uRole === "owner";

  const roomStr = String(
    d.location ??
      d.roomName ??
      d.addressDisplay ??
      (typeof d.installationAddress === "object"
        ? d.installationAddress?.fullText
        : d.installationAddress) ??
      "Tầng 1 - Nhà chính"
  );

  const warrantyRaw = String(
    d.warrantyEndAt ?? d.warrantyUntil ?? d.subscriptionExpiresAt ?? "2028-10-23"
  );

  return {
    id: String(d.id ?? hwId),
    hardwareId: hwId,
    name,
    modelName,
    modelCode,
    imageUrl: d.imageUrl,
    category: cat,
    currentProperties: props,
    assignedProperties: assignedProps,
    badgeText:
      cat === "rollerDoor"
        ? isWallDoor
          ? "ÂM TƯỜNG"
          : "TRUNG TÂM"
        : cat === "camera"
          ? "CAMERA"
          : cat === "lightSwitch"
            ? upperHwId.includes("OCAM") ||
              upperHwId.includes("SOCKET") ||
              upperHwId.startsWith("SMARTSW")
              ? "Ổ CẮM"
              : "CÔNG TẮC"
            : cat === "energyManage"
              ? "CÔNG TƠ ĐIỆN"
              : "SMART",
    deviceNumber: hwId.length > 3 ? hwId.slice(-3) : "001",
    roomName: roomStr || "Nhà riêng",
    installationAddress: roomStr || "Nhà riêng",
    isOnline: Boolean(
      d.isOnline === true ||
        d.is_online === true ||
        d.status === "ONLINE" ||
        d.status === "online"
    ),
    userRole: uRole,
    canControl,
    canViewHistory,
    canChildLock,
    canConfig,
    positionPercent: pos,
    batteryPercent: Number(props.battery_pct ?? 95),
    motorCurrentA: Number(props.motor_current ?? 2.4),
    acVoltage: Number(props.ac_voltage ?? 220.0),
    isChildLockActive: Boolean(props.is_child_lock),
    isLocked: Boolean(props.is_locked),
    isRelayOn,
    openTimeoutSeconds: openTimeout,
    closeTimeoutSeconds: closeTimeout,
    isAutoScheduleActive: autoSchedule,
    isAccessLimitActive: accessLimit,
    accessStartTime: accessStart,
    accessEndTime: accessEnd,
    accessDays,
    ownerName: String(d.ownerName ?? fallbackOwnerName),
    ownerId: d.ownerId ?? d.owner_id,
    warrantyUntil: warrantyRaw.length >= 10 ? warrantyRaw.slice(0, 10) : "2028-10-23",
    warrantyCode: String(
      d.warrantyCode ?? `EW-${hwId.replace(/-/g, "").toUpperCase()}-24M`
    ),
    subscriptionType: String(d.subscriptionType ?? "LIMITED"),
    subscriptionExpiresAt: String(d.subscriptionExpiresAt ?? "2028-10-23"),
    subscriptionStatus: String(d.subscriptionStatus ?? "ACTIVE"),
    locationLat: Number(d.lat ?? d.locationLat ?? d.location_lat ?? 21.028511),
    locationLng: Number(d.lng ?? d.locationLng ?? d.location_lng ?? 105.854167),
    isMoving: false,
    movingDirection: "stop",
    rfRemoteCount: Number(props.rf_count ?? 3),
    deviceIp: String(d.ipAddress ?? props.ip ?? "192.168.1.135"),
    linkedCameraHwId: props.linked_camera_hw_id,
    brightnessPercent: Number(props.brightness ?? 100),
    subChannels: Array.isArray(props.sub_channels)
      ? props.sub_channels
      : [true, false, true, true],
    powerWatt: Number(props.power_w ?? 65.0),
    isRecording: true,
    isAlarmActive: Boolean(props.is_alarm),
    streamResolution: "4K HDR NightVision",
    temperature: Number(props.temperature ?? props.temp_c ?? 28.5),
    humidity: Number(props.humidity ?? 64.0),
    airQualityAqi: Number(props.aqi ?? 28),
    batteryVoltage: Number(props.total_voltage ?? 26.2),
    isDischarging: Boolean(props.is_discharging),
    currentPowerKw: Number(props.power_kw ?? 2.73),
    aiStatus: "AI Core Active",
    lastUnlockUser: "Chủ nhà",
    auditLogs: Array.isArray(d.auditLogs) ? d.auditLogs : [],
  };
}

interface CustomerIoTContextType {
  categories: CategoryMeta[];
  devices: DeviceItem[];
  allDevicesWithEnergySamples: DeviceItem[];
  notifications: any[];
  isLoadingDevices: boolean;
  wsConnected: boolean;
  getDevicesByCategory: (cat: DeviceCategory) => DeviceItem[];
  findByHardwareId: (hardwareId: string) => DeviceItem | undefined;
  refreshDevices: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  sendCommand: (
    hardwareId: string,
    action: string,
    parameters?: Record<string, any>
  ) => Promise<CommandResult>;
  updateDeviceName: (hardwareId: string, newName: string) => Promise<boolean>;
  updateDeviceLocation: (hardwareId: string, newLocation: string) => Promise<boolean>;
  updateDeviceProperties: (
    hardwareId: string,
    properties: Record<string, any>
  ) => Promise<boolean>;
  unpairDevice: (hardwareId: string, stepUpToken?: string) => Promise<boolean>;
  triggerEmergencyLockdown: () => Promise<number>;
  addOrUpdateDevice: (rawOrParsed: any) => DeviceItem;
}

const CustomerIoTContext = createContext<CustomerIoTContextType | undefined>(undefined);

const MOCK_SMART_METTER = createMockSmartMetter();
const MOCK_BMS = createMockBms();

export function CustomerIoTProvider({ children }: { children: React.ReactNode }) {
  const { user, token, isAuthenticated } = useCustomerAuth();
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [mockMeterState, setMockMeterState] = useState<DeviceItem>(MOCK_SMART_METTER);
  const [mockBmsState, setMockBmsState] = useState<DeviceItem>(MOCK_BMS);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  const doorTimersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const devicesRef = useRef<DeviceItem[]>(devices);
  const mockMeterRef = useRef<DeviceItem>(mockMeterState);
  const mockBmsRef = useRef<DeviceItem>(mockBmsState);
  devicesRef.current = devices;
  mockMeterRef.current = mockMeterState;
  mockBmsRef.current = mockBmsState;

  const cacheKey = `austec_cached_user_devices_${user?.id || "guest"}`;

  const saveCache = useCallback(
    (list: DeviceItem[]) => {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(list));
      } catch {
        // ignore
      }
    },
    [cacheKey]
  );

  const refreshDevices = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setDevices([]);
      return;
    }

    setIsLoadingDevices((prev) => (devices.length === 0 ? true : prev));
    try {
      const res = await customerApi.get("/api/devices/my");
      if (res.success && Array.isArray(res.devices)) {
        const parsed = res.devices.map((raw: any) =>
          parseDeviceFromJson(raw, user?.fullName || "Chủ sở hữu")
        );
        setDevices(parsed);
        saveCache(parsed);
      }
    } catch {
      // fallback to cache
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setDevices(JSON.parse(cached));
        }
      } catch {
        // ignore
      }
    } finally {
      setIsLoadingDevices(false);
    }
  }, [cacheKey, devices.length, isAuthenticated, saveCache, token, user?.fullName]);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await customerApi.get("/api/notifications");
      if (res.success) {
        const list = res.notifications || res.data?.notifications || [];
        if (Array.isArray(list)) {
          setNotifications(list);
        }
      }
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (String(n.id) === String(id) ? { ...n, is_read: true, isRead: true } : n))
    );
    await customerApi.put(`/api/notifications/${id}/read`);
  }, []);

  // Load initial cache + fetch from backend
  useEffect(() => {
    if (!isAuthenticated) {
      setDevices([]);
      setNotifications([]);
      return;
    }
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDevices(parsed);
        }
      }
    } catch {
      // ignore
    }
    refreshDevices();
    refreshNotifications();

    const syncInterval = setInterval(() => {
      refreshDevices();
    }, 20000);
    const notiInterval = setInterval(() => {
      refreshNotifications();
    }, 15000);

    return () => {
      clearInterval(syncInterval);
      clearInterval(notiInterval);
    };
  }, [cacheKey, isAuthenticated, refreshDevices, refreshNotifications]);

  // Realtime WebSocket for DEVICE_STATE_CHANGE
  useEffect(() => {
    if (!isAuthenticated || typeof window === "undefined") return;

    let active = true;

    const connectWs = () => {
      if (!active) return;
      try {
        const ws = new WebSocket(getWsChatUrl());
        wsRef.current = ws;

        ws.onopen = () => {
          if (!active) return;
          setWsConnected(true);
          if (user?.id) {
            ws.send(
              JSON.stringify({
                type: "JOIN",
                role: "CUSTOMER",
                customerId: user.id,
                customerName: user.fullName,
              })
            );
          }
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg && msg.type === "DEVICE_STATE_CHANGE" && msg.hardwareId && msg.state) {
              const targetHw = String(msg.hardwareId).trim().toLowerCase();
              const st = msg.state;

              setDevices((prev) =>
                prev.map((dev) => {
                  const devHw = dev.hardwareId.trim().toLowerCase();
                  if (devHw !== targetHw && !devHw.endsWith(targetHw) && !targetHw.endsWith(devHw)) {
                    return dev;
                  }
                  const nextOnline =
                    typeof st.isOnline === "boolean" ? st.isOnline : true;
                  const nextRelay =
                    typeof st.is_relay_on === "boolean"
                      ? st.is_relay_on
                      : dev.isRelayOn;
                  const nextPos =
                    typeof st.position_percent === "number"
                      ? st.position_percent
                      : dev.positionPercent;

                  return {
                    ...dev,
                    isOnline: nextOnline,
                    isRelayOn: nextRelay,
                    positionPercent: nextPos,
                    currentProperties: {
                      ...dev.currentProperties,
                      ...st,
                    },
                  };
                })
              );
            }
          } catch {
            // ignore malformed
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          if (active) {
            reconnectTimerRef.current = setTimeout(connectWs, 5000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (active) {
          reconnectTimerRef.current = setTimeout(connectWs, 5000);
        }
      }
    };

    connectWs();

    return () => {
      active = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, [isAuthenticated, user?.fullName, user?.id]);

  const getDevicesByCategory = useCallback(
    (category: DeviceCategory): DeviceItem[] => {
      const realDevices = devices.filter((d) => d.category === category);
      if (category === "energyManage") {
        const result = [...realDevices];
        const hasSmartMeter = result.some(
          (d) =>
            d.modelCode.includes("SmartMetter") ||
            d.hardwareId.toUpperCase().includes("SMARTMETTER") ||
            d.hardwareId.toUpperCase().includes("SMARTMETER") ||
            d.hardwareId.toUpperCase().includes("CONGTO") ||
            d.name.toLowerCase().includes("công tơ")
        );
        if (!hasSmartMeter) {
          result.unshift(mockMeterState);
        }
        const hasBms = result.some(
          (d) =>
            d.modelCode.toUpperCase().includes("BMS") ||
            d.hardwareId.toUpperCase().includes("BMS") ||
            d.name.toLowerCase().includes("bms")
        );
        if (!hasBms) {
          result.push(mockBmsState);
        }
        return result;
      }
      return realDevices;
    },
    [devices, mockBmsState, mockMeterState]
  );

  const allDevicesWithEnergySamples = React.useMemo(() => {
    const energyDevs = getDevicesByCategory("energyManage");
    const nonEnergyDevs = devices.filter((d) => d.category !== "energyManage");
    return [...nonEnergyDevs, ...energyDevs];
  }, [devices, getDevicesByCategory]);

  const findByHardwareId = useCallback(
    (hardwareId: string): DeviceItem | undefined => {
      if (!hardwareId) return undefined;
      const norm = hardwareId.trim().toLowerCase();
      const cleanNorm = norm.replace(/amtuong-|at-|-/g, "");

      for (const d of devicesRef.current) {
        const dNorm = d.hardwareId.trim().toLowerCase();
        const dClean = dNorm.replace(/amtuong-|at-|-/g, "");
        if (
          dNorm === norm ||
          dClean === cleanNorm ||
          dNorm.endsWith(cleanNorm) ||
          norm.endsWith(dClean)
        ) {
          return d;
        }
      }

      if (norm.includes("smartmetter") || cleanNorm.includes("smartmetter")) {
        return mockMeterRef.current;
      }
      if (norm.includes("bms") || cleanNorm.includes("bms")) {
        return mockBmsRef.current;
      }
      return undefined;
    },
    []
  );

  const startDoorMotion = useCallback((hardwareId: string, direction: "OPEN" | "CLOSE" | "STOP") => {
    if (doorTimersRef.current[hardwareId]) {
      clearInterval(doorTimersRef.current[hardwareId]);
      delete doorTimersRef.current[hardwareId];
    }

    if (direction === "STOP") {
      setDevices((prev) =>
        prev.map((d) =>
          d.hardwareId.toLowerCase() === hardwareId.toLowerCase()
            ? { ...d, isMoving: false, movingDirection: "stop" }
            : d
        )
      );
      return;
    }

    const tickMs = 100;
    doorTimersRef.current[hardwareId] = setInterval(() => {
      setDevices((prev) =>
        prev.map((d) => {
          if (d.hardwareId.toLowerCase() !== hardwareId.toLowerCase()) return d;
          const timeoutSec = Math.max(
            6,
            Math.min(60, direction === "OPEN" ? d.openTimeoutSeconds : d.closeTimeoutSeconds)
          );
          const step = 100 / ((timeoutSec * 1000) / tickMs);
          const nextPos =
            direction === "OPEN"
              ? Math.min(100, d.positionPercent + step)
              : Math.max(0, d.positionPercent - step);
          const rounded = Math.round(nextPos);
          const finished = direction === "OPEN" ? rounded >= 100 : rounded <= 0;

          if (finished && doorTimersRef.current[hardwareId]) {
            clearInterval(doorTimersRef.current[hardwareId]);
            delete doorTimersRef.current[hardwareId];
          }

          return {
            ...d,
            positionPercent: rounded,
            isMoving: !finished,
            movingDirection: finished ? "stop" : direction === "OPEN" ? "up" : "down",
          };
        })
      );
    }, tickMs);
  }, []);

  const sendCommand = useCallback(
    async (
      hardwareId: string,
      action: string,
      parameters?: Record<string, any>
    ): Promise<CommandResult> => {
      const startTime = Date.now();
      let cryptoSig = `SIG-${startTime}`;
      let netLatency = 115;

      const device = findByHardwareId(hardwareId);
      if (device) {
        const isStreamStart = action === "STREAM_START" || action === "13";
        if (isStreamStart) {
          if (!canViewCameraStream(device)) {
            return {
              success: false,
              latencyMs: 15,
              message: getScheduleBlockedReason(device),
              cryptoSignature: cryptoSig,
            };
          }
        } else if (action !== "STREAM_STOP" && action !== "14") {
          if (!canPerformControl(device)) {
            return {
              success: false,
              latencyMs: 15,
              message: !device.canControl
                ? "Tài khoản của bạn đã bị chủ nhà giới hạn quyền điều khiển"
                : `Hiện ngoài khung giờ cho phép điều khiển (${device.accessStartTime} - ${device.accessEndTime})`,
              cryptoSignature: cryptoSig,
            };
          }
          if (action === "TOGGLE_CHILD_LOCK" && !device.canChildLock) {
            return {
              success: false,
              latencyMs: 15,
              message: "Bạn không có quyền bật/tắt Khóa an toàn trẻ em",
              cryptoSignature: cryptoSig,
            };
          }
        }

        if ((action === "OPEN_DOOR" || action === "CLOSE_DOOR") && device.isChildLockActive) {
          return {
            success: false,
            latencyMs: 15,
            message: "Cửa đang KHÓA AN TOÀN TRẺ EM! Vui lòng mở khóa trước khi vận hành.",
            cryptoSignature: cryptoSig,
          };
        }
      }

      const resolvedSocketAction =
        action === "TOGGLE_RELAY"
          ? device?.isRelayOn
            ? "TURN_OFF"
            : "TURN_ON"
          : action;

      const beAction =
        action === "OPEN_DOOR"
          ? "OPEN"
          : action === "CLOSE_DOOR"
            ? "CLOSE"
            : action === "STOP_DOOR"
              ? "STOP"
              : action === "TOGGLE_RELAY"
                ? resolvedSocketAction
                : action === "TOGGLE_LOCK"
                  ? device?.isLocked
                    ? "UNLOCK"
                    : "LOCK"
                  : action;

      const normalizedParams: Record<string, any> = { ...(parameters || {}) };
      if (beAction === "CONFIG_POWER_LIMIT" && normalizedParams.power_limit_w !== undefined && normalizedParams.power_limit === undefined) {
        normalizedParams.power_limit = normalizedParams.power_limit_w;
      }

      const isMockEnergy =
        hardwareId === MOCK_SMART_METTER.hardwareId || hardwareId === MOCK_BMS.hardwareId;

      if (!isMockEnergy) {
        try {
          const res = await customerApi.post("/api/devices/control", {
            hardwareId,
            command: beAction,
            action: beAction,
            parameters: normalizedParams,
          });

          if (res.cryptoSignature) cryptoSig = String(res.cryptoSignature);
          if (typeof res.latencyMs === "number") netLatency = res.latencyMs;

          const innerOk = !res.result || res.result.success !== false;
          if (!res.success || !innerOk) {
            return {
              success: false,
              latencyMs: netLatency,
              message:
                res.error ||
                res.result?.message ||
                res.message ||
                "Thiết bị không phản hồi. Vui lòng kiểm tra kết nối.",
              cryptoSignature: cryptoSig,
            };
          }
        } catch (err: any) {
          return {
            success: false,
            latencyMs: Date.now() - startTime,
            message: err.message || "Không thể kết nối máy chủ điều khiển.",
            cryptoSignature: cryptoSig,
          };
        }
      }

      // Stream / snapshot commands don't mutate device list state — skip setDevices to avoid unnecessary re-renders
      if (
        action === "STREAM_START" ||
        action === "STREAM_STOP" ||
        action === "TAKE_SNAPSHOT" ||
        action === "13" ||
        action === "14"
      ) {
        return {
          success: true,
          latencyMs: Date.now() - startTime || netLatency,
          message: `Lệnh ${action} đã thực thi`,
          cryptoSignature: cryptoSig,
        };
      }

      const now = new Date();
      const nowStr = `${String(now.getDate()).padStart(2, "0")}/${String(
        now.getMonth() + 1
      ).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(
        2,
        "0"
      )}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(
        2,
        "0"
      )}`;
      const actor = user?.fullName || "Chủ nhà";

      // Update mock energy devices if targeted
      if (hardwareId === MOCK_SMART_METTER.hardwareId) {
        setMockMeterState((prev) => {
          const nextProps = { ...prev.currentProperties };
          if (action === "METER_POWER_ON" || action === "TURN_ON") {
            nextProps.is_meter_on = true;
            nextProps.power_status = "ON";
          } else if (action === "METER_POWER_OFF" || action === "TURN_OFF") {
            nextProps.is_meter_on = false;
            nextProps.power_status = "OFF";
          } else if (action === "RESET") {
            nextProps.is_meter_on = true;
            nextProps.power_status = "ON";
            nextProps.alarm = null;
          } else if (action === "CONFIG_POWER_LIMIT" && parameters?.power_limit_w) {
            nextProps.power_limit_w = parameters.power_limit_w;
          }
          return { ...prev, currentProperties: nextProps };
        });
      } else if (hardwareId === MOCK_BMS.hardwareId) {
        setMockBmsState((prev) => ({
          ...prev,
          currentProperties: {
            ...prev.currentProperties,
            ...(parameters || {}),
          },
        }));
      }

      // Apply local state & motion
      if (action === "OPEN_DOOR") {
        startDoorMotion(hardwareId, "OPEN");
      } else if (action === "CLOSE_DOOR") {
        startDoorMotion(hardwareId, "CLOSE");
      } else if (action === "STOP_DOOR") {
        startDoorMotion(hardwareId, "STOP");
      }

      setDevices((prev) =>
        prev.map((d) => {
          if (d.hardwareId.toLowerCase() !== hardwareId.toLowerCase()) return d;
          const updated = { ...d, auditLogs: [...d.auditLogs] };

          if (action === "OPEN_DOOR") {
            updated.auditLogs.unshift({
              time: nowStr,
              action: "Mở cửa",
              actionCode: 1,
              triggeredBy: actor,
              deviceCode: d.hardwareId,
            });
          } else if (action === "CLOSE_DOOR") {
            updated.auditLogs.unshift({
              time: nowStr,
              action: "Đóng cửa",
              actionCode: 2,
              triggeredBy: actor,
              deviceCode: d.hardwareId,
            });
          } else if (action === "STOP_DOOR") {
            updated.auditLogs.unshift({
              time: nowStr,
              action: "Dừng cửa",
              actionCode: 3,
              triggeredBy: actor,
              deviceCode: d.hardwareId,
            });
          } else if (action === "TOGGLE_CHILD_LOCK") {
            updated.isChildLockActive = !d.isChildLockActive;
            if (updated.isChildLockActive) {
              startDoorMotion(hardwareId, "STOP");
            }
          } else if (
            action === "TOGGLE_RELAY" ||
            action === "TURN_ON" ||
            action === "TURN_OFF"
          ) {
            const turnOn =
              action === "TURN_ON"
                ? true
                : action === "TURN_OFF"
                  ? false
                  : !d.isRelayOn;
            updated.isRelayOn = turnOn;
            updated.auditLogs.unshift({
              time: nowStr,
              action: turnOn ? "Bật nguồn điện" : "Tắt nguồn điện",
              actionCode: turnOn ? 13 : 14,
              triggeredBy: actor,
              deviceCode: d.hardwareId,
            });
          } else if (action === "METER_POWER_ON") {
            updated.currentProperties = {
              ...updated.currentProperties,
              is_meter_on: true,
              relay_status: "ON",
            };
          } else if (action === "METER_POWER_OFF") {
            updated.currentProperties = {
              ...updated.currentProperties,
              is_meter_on: false,
              relay_status: "OFF",
            };
          } else if (action === "RESET") {
            updated.currentProperties = {
              ...updated.currentProperties,
              alarm: null,
              is_meter_on: true,
              relay_status: "ON",
            };
          } else if (action === "CONFIG_POWER_LIMIT" && (parameters?.power_limit || parameters?.power_limit_w)) {
            const lim = Number(parameters?.power_limit ?? parameters?.power_limit_w);
            updated.currentProperties = {
              ...updated.currentProperties,
              power_limit: lim,
              power_limit_w: lim,
            };
          } else if (action === "LOCK") {
            updated.isLocked = true;
          } else if (action === "UNLOCK") {
            updated.isLocked = false;
          } else if (action === "TOGGLE_LOCK") {
            updated.isLocked = !d.isLocked;
          } else if (action === "TOGGLE_ALARM") {
            updated.isAlarmActive = !d.isAlarmActive;
          }

          return updated;
        })
      );

      const message =
        action === "OPEN_DOOR"
          ? "Đang mở cửa cuốn..."
          : action === "CLOSE_DOOR"
            ? "Đang đóng cửa cuốn..."
            : action === "STOP_DOOR"
              ? "Đã dừng cửa cuốn"
              : action === "TOGGLE_CHILD_LOCK"
                ? !device?.isChildLockActive
                  ? "Đã bật Khóa an toàn trẻ em"
                  : "Đã mở Khóa an toàn trẻ em"
                : action === "TOGGLE_RELAY" || action === "TURN_ON" || action === "TURN_OFF"
                  ? resolvedSocketAction === "TURN_ON"
                    ? "Đã bật nguồn điện"
                    : "Đã tắt nguồn điện"
                  : `Lệnh ${action} đã thực thi thành công`;

      return {
        success: true,
        latencyMs: Date.now() - startTime || netLatency,
        message,
        cryptoSignature: cryptoSig,
      };
    },
    [findByHardwareId, startDoorMotion, user?.fullName]
  );

  const updateDeviceName = useCallback(
    async (hardwareId: string, newName: string): Promise<boolean> => {
      setDevices((prev) => {
        const next = prev.map((d) =>
          d.hardwareId.toLowerCase() === hardwareId.toLowerCase() ? { ...d, name: newName } : d
        );
        saveCache(next);
        return next;
      });
      const res = await customerApi.patch(`/api/devices/${hardwareId}`, {
        customName: newName,
      });
      return res.success;
    },
    [saveCache]
  );

  const updateDeviceLocation = useCallback(
    async (hardwareId: string, newLocation: string): Promise<boolean> => {
      setDevices((prev) => {
        const next = prev.map((d) =>
          d.hardwareId.toLowerCase() === hardwareId.toLowerCase()
            ? { ...d, roomName: newLocation, installationAddress: newLocation }
            : d
        );
        saveCache(next);
        return next;
      });
      const res = await customerApi.patch(`/api/devices/${hardwareId}`, {
        location: newLocation,
        addressDisplay: newLocation,
      });
      return res.success;
    },
    [saveCache]
  );

  const updateDeviceProperties = useCallback(
    async (hardwareId: string, properties: Record<string, any>): Promise<boolean> => {
      const normalized = { ...properties };
      if (normalized.access_limit !== undefined && normalized.is_access_limit === undefined) {
        normalized.is_access_limit = normalized.access_limit;
      } else if (normalized.is_access_limit !== undefined && normalized.access_limit === undefined) {
        normalized.access_limit = normalized.is_access_limit;
      }
      setDevices((prev) => {
        const next = prev.map((d) =>
          d.hardwareId.toLowerCase() === hardwareId.toLowerCase()
            ? {
                ...d,
                currentProperties: { ...d.currentProperties, ...normalized },
                openTimeoutSeconds: Number(
                  normalized.open_timeout ?? d.openTimeoutSeconds
                ),
                closeTimeoutSeconds: Number(
                  normalized.close_timeout ?? d.closeTimeoutSeconds
                ),
                isAutoScheduleActive:
                  normalized.is_auto_schedule !== undefined
                    ? Boolean(normalized.is_auto_schedule)
                    : d.isAutoScheduleActive,
                isAccessLimitActive:
                  normalized.access_limit !== undefined
                    ? Boolean(normalized.access_limit)
                    : d.isAccessLimitActive,
                accessStartTime: String(normalized.access_start ?? d.accessStartTime),
                accessEndTime: String(normalized.access_end ?? d.accessEndTime),
                accessDays: Array.isArray(normalized.access_days)
                  ? normalized.access_days
                  : d.accessDays,
                linkedCameraHwId:
                  normalized.linked_camera_hw_id !== undefined
                    ? normalized.linked_camera_hw_id
                    : d.linkedCameraHwId,
              }
            : d
        );
        saveCache(next);
        return next;
      });
      const res = await customerApi.patch(`/api/devices/${hardwareId}/properties`, {
        properties: normalized,
      });
      return res.success;
    },
    [saveCache]
  );

  const unpairDevice = useCallback(
    async (hardwareId: string, stepUpToken?: string): Promise<boolean> => {
      const res = await customerApi.delete(
        `/api/devices/${hardwareId}`,
        stepUpToken ? { stepUpToken } : undefined
      );
      if (res.success) {
        setDevices((prev) => {
          const next = prev.filter(
            (d) => d.hardwareId.toLowerCase() !== hardwareId.toLowerCase()
          );
          saveCache(next);
          return next;
        });
        return true;
      }
      return false;
    },
    [saveCache]
  );

  const triggerEmergencyLockdown = useCallback(async (): Promise<number> => {
    const doors = devices.filter((d) => d.category === "rollerDoor");
    let count = 0;
    for (const door of doors) {
      if (!door.isChildLockActive) {
        await sendCommand(door.hardwareId, "TOGGLE_CHILD_LOCK");
        count++;
      } else {
        await sendCommand(door.hardwareId, "STOP_DOOR");
        count++;
      }
    }
    return count;
  }, [devices, sendCommand]);

  const addOrUpdateDevice = useCallback(
    (rawOrParsed: any): DeviceItem => {
      const dev =
        rawOrParsed && rawOrParsed.category && rawOrParsed.currentProperties
          ? (rawOrParsed as DeviceItem)
          : parseDeviceFromJson(rawOrParsed, user?.fullName || "Chủ sở hữu");
      setDevices((prev) => {
        const idx = prev.findIndex(
          (x) => x.hardwareId.toLowerCase() === dev.hardwareId.toLowerCase()
        );
        const next = idx >= 0 ? prev.map((x, i) => (i === idx ? dev : x)) : [dev, ...prev];
        saveCache(next);
        return next;
      });
      return dev;
    },
    [saveCache, user?.fullName]
  );

  return (
    <CustomerIoTContext.Provider
      value={{
        categories: AUSTEC_CATEGORIES,
        devices,
        allDevicesWithEnergySamples,
        notifications,
        isLoadingDevices,
        wsConnected,
        getDevicesByCategory,
        findByHardwareId,
        refreshDevices,
        refreshNotifications,
        markNotificationRead,
        sendCommand,
        updateDeviceName,
        updateDeviceLocation,
        updateDeviceProperties,
        unpairDevice,
        triggerEmergencyLockdown,
        addOrUpdateDevice,
      }}
    >
      {children}
    </CustomerIoTContext.Provider>
  );
}

export function useCustomerIoT() {
  const ctx = useContext(CustomerIoTContext);
  if (!ctx) {
    throw new Error("useCustomerIoT must be used within CustomerIoTProvider");
  }
  return ctx;
}

