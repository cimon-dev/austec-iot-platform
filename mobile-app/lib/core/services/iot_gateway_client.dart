import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:crypto/crypto.dart';
import '../models/device_model.dart';
import '../constants/app_theme.dart';

class CommandResult {
  final bool success;
  final int latencyMs;
  final String message;
  final String cryptoSignature;

  CommandResult({
    required this.success,
    required this.latencyMs,
    required this.message,
    required this.cryptoSignature,
  });
}

class IoTGatewayClient {
  static final IoTGatewayClient _instance = IoTGatewayClient._internal();
  factory IoTGatewayClient() => _instance;
  IoTGatewayClient._internal();

  // 7 Danh mục khối cố định quanh tâm (Fixed layout matching giaodienmoi.jpg + Camera)
  final List<CategoryMeta> categories = const [
    // 1. DOORS (Top-Left)
    CategoryMeta(
      category: DeviceCategory.rollerDoor,
      title: "DOORS",
      subtitle: "CỬA CUỐN AUSTEC",
      assetPath: "assets/doors.png",
      neonColor: AppTheme.roseDanger,
      offsetX: -105.0,
      offsetY: -95.0,
    ),
    // 2. ENERGY MANAGE (Top-Right)
    CategoryMeta(
      category: DeviceCategory.energyManage,
      title: "ENERGY MANAGE",
      subtitle: "QUẢN LÝ NĂNG LƯỢNG",
      assetPath: "assets/energy.png",
      neonColor: AppTheme.amberWarning,
      offsetX: 105.0,
      offsetY: -95.0,
    ),
    // 3. ENVIRONMENT (Right)
    CategoryMeta(
      category: DeviceCategory.environment,
      title: "ENVIRONMENT",
      subtitle: "CẢM BIẾN MÔI TRƯỜNG",
      assetPath: "assets/sensor.png",
      neonColor: AppTheme.cyanAccent,
      offsetX: 130.0,
      offsetY: 20.0,
    ),
    // 4. OTHERS CONTROL (Bottom-Right)
    CategoryMeta(
      category: DeviceCategory.othersControl,
      title: "OTHERS CONTROL",
      subtitle: "THIẾT BỊ KHÁC",
      assetPath: "assets/others.png",
      neonColor: AppTheme.blueAccent,
      offsetX: 105.0,
      offsetY: 135.0,
    ),
    // 5. DATA ANALYTICS (Bottom-Left)
    CategoryMeta(
      category: DeviceCategory.dataAnalytics,
      title: "DATA ANALYTICS",
      subtitle: "PHÂN TÍCH DỮ LIỆU",
      assetPath: "assets/data.png",
      neonColor: AppTheme.purpleAccent,
      offsetX: -105.0,
      offsetY: 135.0,
    ),
    // 6. LIGHT & SWITCH (Left)
    CategoryMeta(
      category: DeviceCategory.lightSwitch,
      title: "LIGHT & SWITCH",
      subtitle: "CHIẾU SÁNG & ĐÓNG CẮT",
      assetPath: "assets/light.png",
      neonColor: AppTheme.amberWarning,
      offsetX: -130.0,
      offsetY: 20.0,
    ),
    // 7. CAMERA (Top Center - user requested "thêm camera")
    CategoryMeta(
      category: DeviceCategory.camera,
      title: "AI CAMERA",
      subtitle: "CAMERA AN NINH AI",
      assetPath: "assets/data.png",
      neonColor: Colors.tealAccent,
      offsetX: 0.0,
      offsetY: -150.0,
    ),
  ];

  // Danh sách thiết bị người dùng sở hữu (khớp amtuong834 và amtuong1834 trong ảnh)
  final List<DeviceItem> _devices = [
    // 1. Cửa cuốn chính (amtuong 834 trong ảnh cũ)
    DeviceItem(
      id: "DEV-DOOR-01",
      hardwareId: "amtuong1834",
      name: "amtuong",
      modelName: "Cửa cuốn",
      badgeText: "ÂM TƯỜNG",
      deviceNumber: "834",
      category: DeviceCategory.rollerDoor,
      roomName: "Mặt tiền nhà phố",
      positionPercent: 0,
      isChildLockActive: false,
      openTimeoutSeconds: 23,
      closeTimeoutSeconds: 20,
      motorCurrentA: 2.45,
      acVoltage: 221.4,
      rfRemoteCount: 3,
      warrantyUntil: "2028-10-21",
      warrantyCode: "EW-AMTUONG1834-24M",
    ),
    DeviceItem(
      id: "DEV-DOOR-02",
      hardwareId: "amtuong9914",
      name: "Cửa Cuốn Gara",
      modelName: "Austec RollShutter G-Speed",
      badgeText: "GARA",
      deviceNumber: "914",
      category: DeviceCategory.rollerDoor,
      roomName: "Gara tầng trệt",
      positionPercent: 100,
      isChildLockActive: false,
      openTimeoutSeconds: 25,
      closeTimeoutSeconds: 22,
      motorCurrentA: 2.10,
      acVoltage: 220.8,
      rfRemoteCount: 2,
      warrantyUntil: "2028-08-15",
      warrantyCode: "EW-ATDOOR99142C-24M",
    ),

    // 2. Năng lượng & Lưu điện
    DeviceItem(
      id: "DEV-UPS-01",
      hardwareId: "UPS-220V-77192C",
      name: "Bộ Lưu Điện Sin Chuẩn",
      modelName: "Austec Sin Chuẩn Pro 1200VA",
      badgeText: "SIN CHUẨN",
      deviceNumber: "192",
      category: DeviceCategory.energyManage,
      roomName: "Hộp kỹ thuật tầng 1",
      acVoltage: 221.5,
      batteryVoltage: 26.4,
      batteryPercent: 98,
      isDischarging: false,
      currentPowerKw: 3.46,
    ),

    // 3. Cảm biến môi trường
    DeviceItem(
      id: "DEV-ENV-01",
      hardwareId: "SN-ENV-33019",
      name: "Trạm Môi Trường Phòng Khách",
      modelName: "Austec MultiSensor M1 Pro",
      badgeText: "KHÍ TƯỢNG",
      deviceNumber: "019",
      category: DeviceCategory.environment,
      roomName: "Phòng khách trung tâm",
      temperature: 29.3,
      humidity: 64.0,
      airQualityAqi: 32,
      batteryPercent: 98,
    ),

    // 4. Thiết bị khác / Khóa Masaru
    DeviceItem(
      id: "DEV-LOCK-01",
      hardwareId: "MS-LOCK-99120B",
      name: "Khóa Cửa Chính Masaru Titan",
      modelName: "Masaru Titan X1 FaceID",
      badgeText: "TITAN",
      deviceNumber: "120",
      category: DeviceCategory.othersControl,
      roomName: "Cửa đại sảnh",
      isLocked: true,
      batteryPercent: 89,
      lastUnlockUser: "Nguyễn Mạnh Đức (Vân tay)",
    ),

    // 5. Data Analytics
    DeviceItem(
      id: "DEV-DATA-01",
      hardwareId: "AI-HUB-001X",
      name: "Bộ Xử Lý Phân Tích Dữ Liệu",
      modelName: "Austec AI Edge Core v3",
      badgeText: "AI CORE",
      deviceNumber: "001",
      category: DeviceCategory.dataAnalytics,
      roomName: "Trung tâm điều phối",
      aiStatus: "AI Core Active",
    ),

    // 6. Chiếu sáng & Rơ-le
    DeviceItem(
      id: "DEV-LIGHT-01",
      hardwareId: "SW-RELAY-4CH-01",
      name: "Đèn Chiếu Sáng & Rơ-le",
      modelName: "Austec 4-Channel Zigbee Relay",
      badgeText: "RƠ-LE 4CH",
      deviceNumber: "401",
      category: DeviceCategory.lightSwitch,
      roomName: "Phòng khách & Ban công",
      isRelayOn: false,
      brightnessPercent: 85,
      subChannels: [false, false, false, false],
      powerWatt: 0.0,
    ),

    // 7. Camera an ninh
    DeviceItem(
      id: "DEV-CAM-01",
      hardwareId: "CAM-AI-0012A",
      name: "Camera AI Cổng Chính",
      modelName: "Austec Vision Pro 4K HDR",
      badgeText: "AI 4K",
      deviceNumber: "012",
      category: DeviceCategory.camera,
      roomName: "Cổng ra vào",
      isRecording: true,
      isAlarmActive: false,
      streamResolution: "4K HDR NightVision",
    ),
  ];

  List<DeviceItem> get devices => List.unmodifiable(_devices);

  List<DeviceItem> getDevicesByCategory(DeviceCategory category) {
    return _devices.where((d) => d.category == category).toList();
  }

  DeviceItem? findByHardwareId(String hardwareId) {
    try {
      return _devices.firstWhere((d) => d.hardwareId == hardwareId);
    } catch (_) {
      return null;
    }
  }

  void addDevice(DeviceItem device) {
    _devices.add(device);
  }

  void removeDevice(String hardwareId) {
    _devices.removeWhere((d) => d.hardwareId == hardwareId);
  }

  void renameDevice(String hardwareId, String newName) {
    final dev = findByHardwareId(hardwareId);
    if (dev != null) {
      dev.name = newName;
    }
  }

  void updateDeviceName(String hardwareId, String newName) => renameDevice(hardwareId, newName);

  // Dispatch command with audit logging
  Future<CommandResult> sendCommand({
    required String hardwareId,
    required String action,
    Map<String, dynamic>? parameters,
  }) async {
    final startTime = DateTime.now();
    final delayMs = 80 + (DateTime.now().microsecond % 50);
    await Future.delayed(Duration(milliseconds: delayMs));

    final device = findByHardwareId(hardwareId);
    if (device != null) {
      final nowStr = "${DateTime.now().day.toString().padLeft(2, '0')}/${DateTime.now().month.toString().padLeft(2, '0')}/${DateTime.now().year} ${DateTime.now().hour.toString().padLeft(2, '0')}:${DateTime.now().minute.toString().padLeft(2, '0')}:${DateTime.now().second.toString().padLeft(2, '0')}";

      if (action == "OPEN_DOOR") {
        device.positionPercent = 100;
        device.isMoving = false;
        device.movingDirection = 'stop';
        device.auditLogs.insert(
          0,
          AuditLog(
            time: nowStr,
            action: "Mở cửa",
            actionCode: 1,
            triggeredBy: "Nguyễn Mạnh Đức",
            deviceCode: device.hardwareId,
          ),
        );
      } else if (action == "CLOSE_DOOR") {
        device.positionPercent = 0;
        device.isMoving = false;
        device.movingDirection = 'stop';
        device.auditLogs.insert(
          0,
          AuditLog(
            time: nowStr,
            action: "Đóng cửa",
            actionCode: 2,
            triggeredBy: "Nguyễn Mạnh Đức",
            deviceCode: device.hardwareId,
          ),
        );
      } else if (action == "STOP_DOOR") {
        device.isMoving = false;
        device.movingDirection = 'stop';
        device.auditLogs.insert(
          0,
          AuditLog(
            time: nowStr,
            action: "Dừng cửa",
            actionCode: 3,
            triggeredBy: "Nguyễn Mạnh Đức",
            deviceCode: device.hardwareId,
          ),
        );
      } else if (action == "SET_POSITION") {
        final target = parameters?["position"] as int? ?? 50;
        device.positionPercent = target;
      } else if (action == "TOGGLE_CHILD_LOCK") {
        device.isChildLockActive = !device.isChildLockActive;
      } else if (action == "UPDATE_TIMEOUTS") {
        device.openTimeoutSeconds = parameters?["openTimeout"] ?? device.openTimeoutSeconds;
        device.closeTimeoutSeconds = parameters?["closeTimeout"] ?? device.closeTimeoutSeconds;
      } else if (action == "UPDATE_ACCESS_CONTROL") {
        device.isAccessLimitActive = parameters?["isActive"] ?? device.isAccessLimitActive;
        device.accessStartTime = parameters?["startTime"] ?? device.accessStartTime;
        device.accessEndTime = parameters?["endTime"] ?? device.accessEndTime;
        if (parameters?["days"] != null) {
          device.accessDays = List<bool>.from(parameters!["days"]);
        }
      } else if (action == "TOGGLE_RELAY") {
        device.isRelayOn = !device.isRelayOn;
      } else if (action == "TOGGLE_DISCHARGE") {
        device.isDischarging = !device.isDischarging;
      } else if (action == "TOGGLE_LOCK") {
        device.isLocked = !device.isLocked;
      } else if (action == "TOGGLE_ALARM") {
        device.isAlarmActive = !device.isAlarmActive;
      }
    }

    final totalLatency = DateTime.now().difference(startTime).inMilliseconds;

    return CommandResult(
      success: true,
      latencyMs: totalLatency,
      message: "Lệnh $action đã được gửi tới thiết bị $hardwareId thành công",
      cryptoSignature: "SIG-${DateTime.now().millisecondsSinceEpoch}",
    );
  }

  // Store catalog
  final List<ProductItem> storeProducts = const [
    ProductItem(
      id: "PROD-01",
      name: "Cửa Cuốn Austec Titadoor A900 Super",
      categoryTag: "Cửa Cuốn",
      subtitle: "Nhôm định hình 6063 T6 • Khe thoáng thông minh",
      price: 18500000,
      originalPrice: 21000000,
      rating: 4.9,
      reviewsCount: 142,
      imagePath: "assets/doors.png",
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
    ),
    ProductItem(
      id: "PROD-02",
      name: "Khóa Cửa Thông Minh Masaru Titan X1 Pro",
      categoryTag: "Khóa Thông Minh",
      subtitle: "Nhận diện khuôn mặt 3D FaceID • Vân tay FPC Thụy Điển",
      price: 8900000,
      originalPrice: 10500000,
      rating: 5.0,
      reviewsCount: 98,
      imagePath: "assets/others.png",
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
    ),
    ProductItem(
      id: "PROD-03",
      name: "Bộ Lưu Điện Sin Chuẩn Austec Pro 1200VA",
      categoryTag: "Lưu Điện UPS",
      subtitle: "Sóng Sin chuẩn 220V • Xả bảo dưỡng tự động thông minh",
      price: 4500000,
      originalPrice: 5200000,
      rating: 4.8,
      reviewsCount: 76,
      imagePath: "assets/energy.png",
      warrantyText: "Bảo hành 24 tháng ắc quy & bo mạch",
      highlights: [
        "Công nghệ sóng Sin tinh khiết bảo vệ tuyệt đối mô tơ cửa",
        "Thời gian lưu điện lên đến 48 giờ sau khi mất điện lưới",
        "Tính năng tự xả xả bảo dưỡng pin định kỳ kéo dài tuổi thọ gấp 2 lần",
        "Hiển thị điện áp và % pin trực tiếp trên App Austec Mobile",
      ],
      specs: {
        "Công suất": "1200VA / 900W",
        "Điện áp vào/ra": "220V ± 5% (50Hz)",
        "Dung lượng ắc quy": "2x 12V / 12Ah kín khí chuyên dụng",
        "Hiệu suất chuyển đổi": "≥ 95%",
      },
    ),
    ProductItem(
      id: "PROD-04",
      name: "Mô Tơ Cửa Cuốn Austec Turbo 800KG",
      categoryTag: "Động Cơ & Bo Mạch",
      subtitle: "Lõi đồng 100% • Tích hợp phanh điện từ kép an toàn",
      price: 7200000,
      originalPrice: 8000000,
      rating: 4.9,
      reviewsCount: 115,
      imagePath: "assets/doors.png",
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
    ),
    ProductItem(
      id: "PROD-05",
      name: "Trạm Cảm Biến Môi Trường Austec MultiSensor M1",
      categoryTag: "Cảm Biến",
      subtitle: "Đo nhiệt độ, độ ẩm, chất lượng không khí AQI PM2.5",
      price: 1250000,
      originalPrice: 1600000,
      rating: 4.7,
      reviewsCount: 52,
      imagePath: "assets/sensor.png",
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
    ),
  ];
}
