import 'package:flutter/material.dart';

enum DeviceCategory {
  rollerDoor,
  energyManage,
  environment,
  othersControl,
  dataAnalytics,
  lightSwitch,
  camera,
}

enum FamilyRole {
  owner,
  member,
  guest,
}

class CategoryMeta {
  final DeviceCategory category;
  final String title;
  final String subtitle;
  final String assetPath;
  final Color neonColor;
  // Fixed relative offset from center (dx, dy) in pixels
  final double offsetX;
  final double offsetY;

  const CategoryMeta({
    required this.category,
    required this.title,
    required this.subtitle,
    required this.assetPath,
    required this.neonColor,
    required this.offsetX,
    required this.offsetY,
  });
}

class AuditLog {
  final String time;
  final String action;
  final int actionCode; // 1: Mở, 2: Đóng, 3: Dừng
  final String triggeredBy;
  final String deviceCode;
  final bool isAlert;

  const AuditLog({
    required this.time,
    required this.action,
    required this.actionCode,
    required this.triggeredBy,
    required this.deviceCode,
    this.isAlert = false,
  });
}

class DeviceItem {
  final String id;
  final String hardwareId;
  String name;
  final String modelName;
  final DeviceCategory category;
  final String roomName;
  final String badgeText; // e.g. "ÂM TƯỜNG", "GARA", "CHÍNH"
  final String deviceNumber; // e.g. "834", "1834"
  bool isOnline;
  final String warrantyUntil;
  final String warrantyCode;
  final FamilyRole userRole;

  // Gói dịch vụ & Hạn sử dụng (Mặc định 12 tháng khi KH)
  String subscriptionType; // 'LIMITED' hoặc 'PERPETUAL'
  String? subscriptionExpiresAt;
  String subscriptionStatus; // 'ACTIVE', 'EXPIRED', 'LIFETIME'
  String installationAddress;

  bool get isPerpetual => subscriptionType == 'PERPETUAL';
  bool get isExpired => subscriptionStatus == 'EXPIRED';

  // Cửa cuốn (Roller Door)
  int positionPercent; // 0 = Đóng kín, 100 = Mở hết
  bool isChildLockActive;
  bool isMoving;
  String movingDirection; // 'up', 'down', 'stop'
  int openTimeoutSeconds; // Cài đặt timeout mở (giây) - default 23s
  int closeTimeoutSeconds; // Cài đặt timeout đóng (giây) - default 20s
  bool isAutoScheduleActive;
  bool isAccessLimitActive;
  String accessStartTime; // '08:00'
  String accessEndTime; // '17:00'
  List<bool> accessDays; // [T2, T3, T4, T5, T6, T7, CN]
  int rfRemoteCount;
  double motorCurrentA;
  double acVoltage;
  final String deviceIp;

  // Chiếu sáng & Rơ-le (Light & Relays)
  bool isRelayOn;
  int brightnessPercent;
  List<bool> subChannels;
  double powerWatt;

  // Camera An Ninh
  bool isRecording;
  bool isAlarmActive;
  String streamResolution;

  // Cảm biến môi trường
  double temperature;
  double humidity;
  int airQualityAqi;
  int batteryPercent;

  // Quản lý năng lượng & UPS
  double batteryVoltage;
  bool isDischarging;
  double currentPowerKw;

  // Data Analytics
  String aiStatus;

  // Thiết bị khác / Khóa thông minh
  bool isLocked;
  String lastUnlockUser;

  // Lịch sử điều khiển
  List<AuditLog> auditLogs;

  DeviceItem({
    required this.id,
    required this.hardwareId,
    required this.name,
    required this.modelName,
    required this.category,
    this.roomName = "Tầng 1 - Mặt Tiền",
    this.badgeText = "ÂM TƯỜNG",
    this.deviceNumber = "834",
    this.isOnline = true,
    this.warrantyUntil = "2028-10-21",
    this.warrantyCode = "EW-AUSTEC-24M",
    this.userRole = FamilyRole.owner,
    this.subscriptionType = 'LIMITED',
    this.subscriptionExpiresAt = '2027-10-21T00:00:00.000Z',
    this.subscriptionStatus = 'ACTIVE',
    this.installationAddress = 'Số 88, Phố Huế, P. Ngô Thì Nhậm, Q. Hai Bà Trưng, Hà Nội',
    this.positionPercent = 0,
    this.isChildLockActive = false,
    this.isMoving = false,
    this.movingDirection = 'stop',
    this.openTimeoutSeconds = 23,
    this.closeTimeoutSeconds = 20,
    this.isAutoScheduleActive = false,
    this.isAccessLimitActive = true,
    this.accessStartTime = "08:00",
    this.accessEndTime = "17:00",
    List<bool>? accessDays,
    this.rfRemoteCount = 3,
    this.motorCurrentA = 2.45,
    this.acVoltage = 221.4,
    this.deviceIp = "192.168.1.135",
    this.isRelayOn = true,
    this.brightnessPercent = 85,
    List<bool>? subChannels,
    this.powerWatt = 65.0,
    this.isRecording = true,
    this.isAlarmActive = false,
    this.streamResolution = "4K HDR NightVision",
    this.temperature = 29.3,
    this.humidity = 64.0,
    this.airQualityAqi = 32,
    this.batteryPercent = 98,
    this.batteryVoltage = 26.2,
    this.isDischarging = false,
    this.currentPowerKw = 3.46,
    this.aiStatus = "AI Core Active",
    this.isLocked = true,
    this.lastUnlockUser = "Nguyễn Mạnh Đức (Vân tay)",
    List<AuditLog>? auditLogs,
  })  : accessDays = accessDays ?? [true, true, true, true, true, false, false],
        subChannels = subChannels ?? [true, false, true, true],
        auditLogs = auditLogs ??
            [
              const AuditLog(
                time: "21/10/2026 15:38:23",
                action: "Dừng cửa",
                actionCode: 3,
                triggeredBy: "Nguyễn Mạnh Đức",
                deviceCode: "amtuong1834",
              ),
              const AuditLog(
                time: "21/10/2026 15:38:04",
                action: "Đóng cửa",
                actionCode: 2,
                triggeredBy: "Nguyễn Mạnh Đức",
                deviceCode: "amtuong1834",
              ),
              const AuditLog(
                time: "21/10/2026 15:35:11",
                action: "Mở cửa",
                actionCode: 1,
                triggeredBy: "Nguyễn Mạnh Đức",
                deviceCode: "amtuong1834",
              ),
              const AuditLog(
                time: "21/10/2026 15:34:23",
                action: "Đóng cửa",
                actionCode: 2,
                triggeredBy: "Nguyễn Mạnh Đức",
                deviceCode: "amtuong1834",
              ),
              const AuditLog(
                time: "15/10/2026 20:16:18",
                action: "Dừng cửa",
                actionCode: 3,
                triggeredBy: "Nguyễn Mạnh Đức",
                deviceCode: "amtuong1834",
              ),
            ];

  String get categoryDisplayName {
    switch (category) {
      case DeviceCategory.rollerDoor:
        return "Cửa Cuốn Austec";
      case DeviceCategory.energyManage:
        return "Lưu Điện & Năng Lượng";
      case DeviceCategory.environment:
        return "Cảm Biến Môi Trường";
      case DeviceCategory.othersControl:
        return "Thiết Bị Khác";
      case DeviceCategory.dataAnalytics:
        return "Phân Tích Dữ Liệu";
      case DeviceCategory.lightSwitch:
        return "Chiếu Sáng & Rơ-le";
      case DeviceCategory.camera:
        return "Camera An Ninh AI";
    }
  }

  String get stateSummary {
    if (!isOnline) return "Ngoại tuyến";
    switch (category) {
      case DeviceCategory.rollerDoor:
        if (isMoving) {
          return movingDirection == 'up' ? "Đang mở..." : "Đang đóng...";
        }
        if (positionPercent == 0) return "Đang đóng kín (0%)";
        if (positionPercent == 100) return "Mở hoàn toàn (100%)";
        return "Mở hé $positionPercent%";

      case DeviceCategory.energyManage:
        return "${currentPowerKw.toStringAsFixed(2)} kW";

      case DeviceCategory.environment:
        return "${temperature.toStringAsFixed(1)}°C";

      case DeviceCategory.othersControl:
        return "Meters OK";

      case DeviceCategory.dataAnalytics:
        return aiStatus;

      case DeviceCategory.lightSwitch:
        final activeRelays = subChannels.where((c) => c).length;
        return isRelayOn ? "$activeRelays RƠ-LE BẬT" : "TẤT CẢ TẮT";

      case DeviceCategory.camera:
        return isAlarmActive ? "CẢNH BÁO!" : "REC LIVE 4K";
    }
  }

  int get openPercentage => positionPercent;
}

// Product model for native shop
class ProductItem {
  final String id;
  final String name;
  final String categoryTag;
  final String subtitle;
  final int price;
  final int? originalPrice;
  final double rating;
  final int reviewsCount;
  final String imagePath;
  final String warrantyText;
  final List<String> highlights;
  final Map<String, String> specs;

  const ProductItem({
    required this.id,
    required this.name,
    required this.categoryTag,
    required this.subtitle,
    required this.price,
    this.originalPrice,
    required this.rating,
    required this.reviewsCount,
    required this.imagePath,
    this.warrantyText = "Bảo hành chính hãng 24 tháng",
    required this.highlights,
    required this.specs,
  });

  String get formattedPrice {
    final buffer = StringBuffer();
    final str = price.toString();
    for (int i = 0; i < str.length; i++) {
      if (i > 0 && (str.length - i) % 3 == 0) {
        buffer.write('.');
      }
      buffer.write(str[i]);
    }
    return "${buffer.toString()} đ";
  }
}
