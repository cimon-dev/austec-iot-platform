enum DeviceCategory {
  rollerDoor,
  smartLock,
  smartUps,
  smartSocket,
  sensor,
}

enum FamilyRole {
  owner,
  member,
  guest,
}

class DeviceItem {
  final String id;
  final String hardwareId;
  final String name;
  final String modelName;
  final DeviceCategory category;
  final bool isOnline;
  final String warrantyUntil;
  final FamilyRole userRole;

  // Real-time telemetry state
  int positionPercent; // For Roller Door (0 = Closed, 100 = Open)
  bool isChildLockActive;
  bool isLocked; // For Smart Lock
  int batteryPercent;
  double acVoltage; // For UPS (220V)
  double batteryVoltage; // For UPS (12V / 24V)
  bool isDischarging;
  bool isSocketRelayOn; // For Smart Socket
  double currentPowerWatt;
  double temperature; // For Sensor (°C)
  double humidity; // For Sensor (%)

  DeviceItem({
    required this.id,
    required this.hardwareId,
    required this.name,
    required this.modelName,
    required this.category,
    this.isOnline = true,
    this.warrantyUntil = "2027-10-17",
    this.userRole = FamilyRole.owner,
    this.positionPercent = 0,
    this.isChildLockActive = false,
    this.isLocked = true,
    this.batteryPercent = 95,
    this.acVoltage = 221.4,
    this.batteryVoltage = 25.8,
    this.isDischarging = false,
    this.isSocketRelayOn = true,
    this.currentPowerWatt = 145.0,
    this.temperature = 28.5,
    this.humidity = 64.0,
  });

  // Category string helper
  String get categoryDisplayName {
    switch (category) {
      case DeviceCategory.rollerDoor:
        return "Cửa Cuốn Austec";
      case DeviceCategory.smartLock:
        return "Khóa Masaru Titan";
      case DeviceCategory.smartUps:
        return "Bộ Lưu Điện Sin Chuẩn";
      case DeviceCategory.smartSocket:
        return "Ổ Cắm Thông Minh";
      case DeviceCategory.sensor:
        return "Cảm Biến Môi Trường";
    }
  }

  // State summary helper
  String get stateSummary {
    if (!isOnline) return "Ngoại tuyến";
    switch (category) {
      case DeviceCategory.rollerDoor:
        if (positionPercent == 0) return "Đang đóng kín (0%)";
        if (positionPercent == 100) return "Mở hoàn toàn (100%)";
        return "Mở hé $positionPercent%";
      case DeviceCategory.smartLock:
        return isLocked ? "Đã khóa chốt an toàn" : "Đã mở khóa";
      case DeviceCategory.smartUps:
        return isDischarging ? "Đang xả bảo dưỡng" : "Điện lưới: ${acVoltage.toStringAsFixed(0)}V (Pin $batteryPercent%)";
      case DeviceCategory.smartSocket:
        return isSocketRelayOn ? "Đang bật (${currentPowerWatt.toStringAsFixed(0)}W)" : "Đã tắt nguồn";
      case DeviceCategory.sensor:
        return "${temperature.toStringAsFixed(1)}°C | $humidity%";
    }
  }
}
