export type DeviceCategory =
  | "rollerDoor"
  | "energyManage"
  | "environment"
  | "othersControl"
  | "dataAnalytics"
  | "lightSwitch"
  | "camera";

export type FamilyRole = "owner" | "member" | "guest";

export interface CategoryMeta {
  category: DeviceCategory;
  title: string;
  titleVi: string;
  subtitle: string;
  subtitleEn: string;
  iconName: string;
  accentColor: string;
  offsetX: number;
  offsetY: number;
}

export interface AuditLog {
  time: string;
  action: string;
  actionCode: number; // 1: Mở, 2: Đóng, 3: Dừng, 11: RF Pair, 12: RF Clear, 13: Bật/Stream, 14: Tắt
  triggeredBy: string;
  deviceCode: string;
  isAlert?: boolean;
}

export interface CommandResult {
  success: boolean;
  latencyMs: number;
  message: string;
  cryptoSignature: string;
}

export interface DeviceItem {
  id: string;
  hardwareId: string;
  name: string;
  modelName: string;
  modelCode: string;
  imageUrl?: string;
  category: DeviceCategory;
  roomName: string;
  badgeText: string;
  deviceNumber: string;
  isOnline: boolean;
  warrantyUntil: string;
  warrantyCode: string;
  userRole: FamilyRole;
  canControl: boolean;
  canViewHistory: boolean;
  canChildLock: boolean;
  canConfig: boolean;
  ownerName: string;
  ownerId?: string;

  // Dynamic Schema
  currentProperties: Record<string, any>;
  assignedProperties: Array<Record<string, any>>;

  // Subscription & Location
  subscriptionType: string;
  subscriptionExpiresAt?: string;
  subscriptionStatus: string;
  installationAddress: string;
  locationLat: number;
  locationLng: number;

  // Roller Door
  positionPercent: number;
  isChildLockActive: boolean;
  isMoving: boolean;
  movingDirection: "up" | "down" | "stop";
  openTimeoutSeconds: number;
  closeTimeoutSeconds: number;
  isAutoScheduleActive: boolean;
  isAccessLimitActive: boolean;
  accessStartTime: string;
  accessEndTime: string;
  accessDays: boolean[]; // [T2..CN]
  rfRemoteCount: number;
  motorCurrentA: number;
  acVoltage: number;
  deviceIp: string;
  linkedCameraHwId?: string;

  // Light & Switch
  isRelayOn: boolean;
  brightnessPercent: number;
  subChannels: boolean[];
  powerWatt: number;

  // Camera
  isRecording: boolean;
  isAlarmActive: boolean;
  streamResolution: string;

  // Environment
  temperature: number;
  humidity: number;
  airQualityAqi: number;
  batteryPercent: number;

  // Energy & UPS
  batteryVoltage: number;
  isDischarging: boolean;
  currentPowerKw: number;

  // Data Analytics / Lock
  aiStatus: string;
  isLocked: boolean;
  lastUnlockUser: string;

  // Audit logs
  auditLogs: AuditLog[];
}

export function isDeviceOwner(dev: DeviceItem): boolean {
  return dev.userRole === "owner";
}

export function isWithinAllowedSchedule(dev: DeviceItem): boolean {
  if (dev.userRole === "owner") return true;
  if (!dev.isAccessLimitActive) return true;

  const now = new Date();
  // JS getDay(): 0 = CN, 1 = T2..6 = T7 -> convert to 0 = T2..6 = CN
  const dayIdx = (now.getDay() + 6) % 7;
  if (Array.isArray(dev.accessDays) && dev.accessDays.length > dayIdx && !dev.accessDays[dayIdx]) {
    return false;
  }

  try {
    const [sh, sm] = (dev.accessStartTime || "00:00").split(":").map(Number);
    const [eh, em] = (dev.accessEndTime || "23:59").split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const curMin = now.getHours() * 60 + now.getMinutes();
    if (curMin < startMin || curMin > endMin) {
      return false;
    }
  } catch {
    // ignore parse errors
  }
  return true;
}

export function canPerformControl(dev: DeviceItem): boolean {
  return dev.canControl && isWithinAllowedSchedule(dev);
}

export function canViewCameraStream(dev: DeviceItem): boolean {
  if (dev.userRole === "owner") return true;
  if (!dev.canControl && !dev.canViewHistory) return false;
  return isWithinAllowedSchedule(dev);
}

export function getScheduleBlockedReason(dev: DeviceItem, lang: "vi" | "en" = "vi"): string {
  if (dev.userRole === "owner") return "";
  if (!dev.canControl && !dev.canViewHistory) {
    return lang === "vi"
      ? "Tài khoản của bạn đã bị chủ nhà tạm khóa quyền truy cập"
      : "Your access has been restricted by the home owner";
  }
  if (!dev.isAccessLimitActive) return "";

  const now = new Date();
  const dayIdx = (now.getDay() + 6) % 7;
  if (Array.isArray(dev.accessDays) && dev.accessDays.length > dayIdx && !dev.accessDays[dayIdx]) {
    return lang === "vi"
      ? "Hôm nay không nằm trong lịch được chủ nhà phân quyền"
      : "Access is not permitted today by the home owner's schedule";
  }

  return lang === "vi"
    ? `Ngoài khung giờ được phép (${dev.accessStartTime} - ${dev.accessEndTime})`
    : `Outside permitted schedule (${dev.accessStartTime} - ${dev.accessEndTime})`;
}

export function getCategoryDisplayName(cat: DeviceCategory, lang: "vi" | "en" = "vi"): string {
  switch (cat) {
    case "rollerDoor":
      return lang === "vi" ? "Cửa Cuốn Austec" : "Austec Roller Doors";
    case "energyManage":
      return lang === "vi" ? "Lưu Điện & Năng Lượng" : "Energy & BMS";
    case "environment":
      return lang === "vi" ? "Cảm Biến Môi Trường" : "Environment Sensors";
    case "othersControl":
      return lang === "vi" ? "Thiết Bị Khác" : "Other Devices";
    case "dataAnalytics":
      return lang === "vi" ? "Phân Tích Dữ Liệu" : "Data Analytics";
    case "lightSwitch":
      return lang === "vi" ? "Ổ Cắm & Công Tắc" : "Switches & Sockets";
    case "camera":
      return lang === "vi" ? "Camera An Ninh AI" : "AI Security Cameras";
  }
}

export function getDeviceStateSummary(dev: DeviceItem, lang: "vi" | "en" = "vi"): string {
  if (!dev.isOnline) return lang === "vi" ? "Ngoại tuyến" : "Offline";
  switch (dev.category) {
    case "rollerDoor":
      if (dev.isMoving) {
        return dev.movingDirection === "up"
          ? lang === "vi"
            ? `Đang mở (${dev.positionPercent}%)...`
            : `Opening (${dev.positionPercent}%)...`
          : lang === "vi"
            ? `Đang đóng (${dev.positionPercent}%)...`
            : `Closing (${dev.positionPercent}%)...`;
      }
      if (dev.positionPercent <= 0) return lang === "vi" ? "Đang đóng kín (0%)" : "Closed (0%)";
      if (dev.positionPercent >= 100) return lang === "vi" ? "Mở hoàn toàn (100%)" : "Fully Open (100%)";
      return lang === "vi" ? `Mở hé ${dev.positionPercent}%` : `Partially Open ${dev.positionPercent}%`;
    case "energyManage":
      if (dev.hardwareId.toUpperCase().includes("BMS") || dev.modelCode.toUpperCase().includes("BMS")) {
        const soc = dev.currentProperties?.soc_percent ?? 95;
        const tag = dev.currentProperties?.status_tag ?? "ONLINE";
        return `SoC ${soc}% • ${tag}`;
      }
      return `${Number(dev.currentProperties?.power_kw ?? dev.currentPowerKw ?? 0).toFixed(2)} kW`;
    case "environment":
      return `${dev.temperature.toFixed(1)}°C • ${dev.humidity.toFixed(0)}%`;
    case "lightSwitch":
      return dev.isRelayOn
        ? lang === "vi"
          ? "ĐANG BẬT NGUỒN"
          : "POWER ON"
        : lang === "vi"
          ? "ĐÃ TẮT NGUỒN"
          : "POWER OFF";
    case "camera":
      return dev.isAlarmActive ? (lang === "vi" ? "CẢNH BÁO!" : "ALERT!") : "REC LIVE 4K";
    case "dataAnalytics":
      return dev.aiStatus;
    case "othersControl":
      return dev.isLocked
        ? lang === "vi"
          ? "Đang khóa an toàn"
          : "Locked"
        : lang === "vi"
          ? "Đã mở khóa"
          : "Unlocked";
  }
}

export interface ProductItem {
  id: string;
  name: string;
  categoryTag: string;
  subtitle: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewsCount: number;
  imagePath: string;
  warrantyText: string;
  highlights: string[];
  specs: Record<string, string>;
}

export interface ShopReviewItem {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userPhone?: string;
  rating: number;
  comment: string;
  isVerifiedBuyer: boolean;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingCounts: Record<string, number>;
}

