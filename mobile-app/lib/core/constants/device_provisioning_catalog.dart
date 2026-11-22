import 'package:flutter/material.dart';
import '../models/device_model.dart';
import 'app_theme.dart';

/// Dữ liệu đầu vào cần nạp xuống bo mạch phần cứng ESP32
class ProvisioningInputData {
  final String ssid;
  final String password;
  final String userId;
  final String brokerIp;
  final int brokerPort;

  const ProvisioningInputData({
    required this.ssid,
    required this.password,
    required this.userId,
    required this.brokerIp,
    this.brokerPort = 1883,
  });
}

/// Định nghĩa Hồ sơ Ghép nối (Profile) cho từng chủng loại thiết bị IoT
class DeviceProvisioningProfile {
  /// Mã phân loại thiết bị trong hệ thống
  final DeviceCategory category;

  /// Tên gọi hiển thị tiêu chuẩn (VD: Cửa Cuốn Austec, Camera An Ninh AI)
  final String defaultTitle;

  /// Mã Model lưu trong CSDL PostgreSQL (phục vụ kích hoạt bảo hành điện tử)
  final String defaultModelCode;

  /// Icon nhận diện trực quan trên giao diện Mobile
  final IconData icon;

  /// Màu sắc chủ đạo (Badge, viền card)
  final Color accentColor;

  /// Danh sách các Service UUID BLE đặc trưng của thiết bị (viết thường, không dấu gạch ngang hoặc có gạch ngang)
  final List<String> bleServiceUuids;

  /// Danh sách từ khóa nhận diện trong Tên sóng Bluetooth quảng bá (advName)
  final List<String> nameKeywords;

  /// BLE Characteristic UUID nhận dữ liệu nạp (RX Characteristic)
  final String bleRxCharUuid;

  /// BLE Characteristic UUID phát dữ liệu phản hồi (TX Characteristic / Notify)
  final String? bleTxCharUuid;

  /// Hàm đóng gói chuỗi payload gửi qua sóng Bluetooth BLE
  final String Function(ProvisioningInputData data) buildBlePayload;

  /// Hàm xây dựng đường dẫn nạp qua kênh Wi-Fi SoftAP (nếu không dùng BLE)
  final Uri Function(ProvisioningInputData data, {String apHost}) buildSoftApUri;

  const DeviceProvisioningProfile({
    required this.category,
    required this.defaultTitle,
    required this.defaultModelCode,
    required this.icon,
    required this.accentColor,
    required this.bleServiceUuids,
    required this.nameKeywords,
    required this.bleRxCharUuid,
    this.bleTxCharUuid,
    required this.buildBlePayload,
    required this.buildSoftApUri,
  });

  /// Kiểm tra xem một thiết bị quét được có khớp với Hồ sơ này không
  bool matches({required String rawName, List<String> advertisedUuids = const []}) {
    final lowerName = rawName.toLowerCase().trim();

    // 1. Khớp theo Service UUID
    final normAdvUuids = advertisedUuids.map((u) => u.toLowerCase().replaceAll('-', '')).toList();
    for (final targetUuid in bleServiceUuids) {
      final normTarget = targetUuid.toLowerCase().replaceAll('-', '');
      if (normAdvUuids.any((adv) => adv.contains(normTarget))) {
        return true;
      }
    }

    // 2. Khớp theo Từ khóa tên thiết bị (amtuong*, ESP32-CAM*,...)
    if (lowerName.isNotEmpty) {
      // Bảo đảm Camera không bao giờ nhận nhầm Ổ cắm (OCAM / SMARTSW)
      if (category == DeviceCategory.camera && (lowerName.startsWith('ocam') || lowerName.contains('socket') || lowerName.startsWith('smartsw'))) {
        return false;
      }
      for (final kw in nameKeywords) {
        if (lowerName.contains(kw.toLowerCase())) {
          return true;
        }
      }
    }

    return false;
  }
}

/// DANH MỤC TẬP TRUNG TẤT CẢ THIẾT BỊ GHÉP NỐI (DEVICE PROVISIONING CATALOG)
/// Khi công ty có thêm thiết bị mới (Khóa vân tay, Cảm biến, UPS,...), 
/// lập trình viên chỉ cần thêm 1 Profile vào danh sách này, không cần sửa đổi giao diện!
class DeviceProvisioningCatalog {
  // ---------------------------------------------------------------------------
  // 1. CỬA CUỐN CHÍNH (cuacuon, WIFIRF-TT+MAC, vvcucuon)
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile rollerDoorProfile = DeviceProvisioningProfile(
    category: DeviceCategory.rollerDoor,
    defaultTitle: "Cửa Cuốn Chính",
    defaultModelCode: "DOOR_HUB_WIFRFTT",
    icon: Icons.roller_shades_rounded,
    accentColor: AppTheme.cyanAccent,
    bleServiceUuids: [
      "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
      "6e400001",
    ],
    nameKeywords: ["cuacuon", "wifirf-tt", "wifirftt", "vvcucuon"],
    bleRxCharUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
    bleTxCharUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
    buildBlePayload: (data) =>
        "onboard/${data.ssid}/${data.password}/${data.userId}/${data.brokerIp}/${data.brokerPort}",
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/?SSID=${Uri.encodeComponent(data.ssid)}&PASS=${Uri.encodeComponent(data.password)}&USER=${Uri.encodeComponent(data.userId)}&IP=${Uri.encodeComponent(data.brokerIp)}&PORT=${data.brokerPort}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 2. THIẾT BỊ ĐIỀU KHIỂN GẮN TƯỜNG / ÂM TƯỜNG (amtuong, WIFIRF-ECO+MAC, vvamtuong)
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile wallDoorProfile = DeviceProvisioningProfile(
    category: DeviceCategory.rollerDoor,
    defaultTitle: "Cửa Cuốn Gắn Tường",
    defaultModelCode: "DOOR_INWALL_ECO",
    icon: Icons.roller_shades_closed_rounded,
    accentColor: AppTheme.amberWarning,
    bleServiceUuids: [
      "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
      "6e400001",
    ],
    nameKeywords: ["amtuong", "wifirf-eco", "wifirfeco", "vvamtuong"],
    bleRxCharUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
    bleTxCharUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
    buildBlePayload: (data) =>
        "onboard/${data.ssid}/${data.password}/${data.userId}/${data.brokerIp}/${data.brokerPort}",
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/?SSID=${Uri.encodeComponent(data.ssid)}&PASS=${Uri.encodeComponent(data.password)}&USER=${Uri.encodeComponent(data.userId)}&IP=${Uri.encodeComponent(data.brokerIp)}&PORT=${data.brokerPort}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 3. CỬA KÍNH LÙA (Glsdoor + MAC)
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile glsDoorProfile = DeviceProvisioningProfile(
    category: DeviceCategory.rollerDoor,
    defaultTitle: "Cửa Kính Lùa",
    defaultModelCode: "DOOR_GLSDOOR",
    icon: Icons.meeting_room_rounded,
    accentColor: AppTheme.cyanAccent,
    bleServiceUuids: [
      "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
      "6e400001",
    ],
    nameKeywords: ["glsdoor"],
    bleRxCharUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
    bleTxCharUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
    buildBlePayload: (data) =>
        "onboard/${data.ssid}/${data.password}/${data.userId}/${data.brokerIp}/${data.brokerPort}",
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/?SSID=${Uri.encodeComponent(data.ssid)}&PASS=${Uri.encodeComponent(data.password)}&USER=${Uri.encodeComponent(data.userId)}&IP=${Uri.encodeComponent(data.brokerIp)}&PORT=${data.brokerPort}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 4. CỬA TAY QUAY (Rolldoor + MAC)
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile rollDoorProfile = DeviceProvisioningProfile(
    category: DeviceCategory.rollerDoor,
    defaultTitle: "Cửa Tay Quay",
    defaultModelCode: "DOOR_ROLLDOOR",
    icon: Icons.swap_horiz_rounded,
    accentColor: AppTheme.amberWarning,
    bleServiceUuids: [
      "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
      "6e400001",
    ],
    nameKeywords: ["rolldoor"],
    bleRxCharUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
    bleTxCharUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
    buildBlePayload: (data) =>
        "onboard/${data.ssid}/${data.password}/${data.userId}/${data.brokerIp}/${data.brokerPort}",
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/?SSID=${Uri.encodeComponent(data.ssid)}&PASS=${Uri.encodeComponent(data.password)}&USER=${Uri.encodeComponent(data.userId)}&IP=${Uri.encodeComponent(data.brokerIp)}&PORT=${data.brokerPort}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 5. Ổ CẮM & CÔNG TẮC (ocam + MAC, SW + MAC) -> Lights Switch
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile smartSocketProfile = DeviceProvisioningProfile(
    category: DeviceCategory.lightSwitch,
    defaultTitle: "Ổ Cắm Công Tắc Thông Minh",
    defaultModelCode: "SMART_SOCKET_SW",
    icon: Icons.power_rounded,
    accentColor: AppTheme.amberWarning,
    bleServiceUuids: [
      "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
      "4faac861-11a3-45d6-964d-c57406320509",
      "4faac861",
      "6e400001",
    ],
    nameKeywords: ["ocam", "sw", "smartsw"],
    bleRxCharUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
    bleTxCharUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
    buildBlePayload: (data) =>
        "onboard/${data.ssid}/${data.password}/${data.userId}/${data.brokerIp}/${data.brokerPort}",
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/?SSID=${Uri.encodeComponent(data.ssid)}&PASS=${Uri.encodeComponent(data.password)}&USER=${Uri.encodeComponent(data.userId)}&IP=${Uri.encodeComponent(data.brokerIp)}&PORT=${data.brokerPort}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 6. CÔNG TƠ ĐIỆN TỬ CHỐNG GIẬT (Smartmetter + MAC) -> Energy Manages
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile smartMeterProfile = DeviceProvisioningProfile(
    category: DeviceCategory.energyManage,
    defaultTitle: "Công Tơ Điện Tử Chống Giật",
    defaultModelCode: "SMART_METER_PRO",
    icon: Icons.electric_bolt_rounded,
    accentColor: AppTheme.emeraldSuccess,
    bleServiceUuids: [
      "4fafc201-1fb5-459e-8fcc-c5c9c331914b",
      "4fafc201",
    ],
    nameKeywords: ["smartmetter", "smartmeter"],
    bleRxCharUuid: "beb5483e-36e1-4688-b7f5-ea07361b26a8",
    bleTxCharUuid: "beb5483e-36e1-4688-b7f5-ea07361b26a8",
    buildBlePayload: (data) =>
        "${data.ssid},${data.password},${data.brokerIp},${data.brokerPort}",
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/config?ssid=${Uri.encodeComponent(data.ssid)}&pass=${Uri.encodeComponent(data.password)}&server=${Uri.encodeComponent(data.brokerIp)}&port=${data.brokerPort}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 7. THIẾT BỊ QUẢN LÝ VÀ GIÁM SÁT PIN LITHIUM BMS (BMS + MAC) -> Energy Manages
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile bmsProfile = DeviceProvisioningProfile(
    category: DeviceCategory.energyManage,
    defaultTitle: "Hệ Thống Pin Lưu Trữ BMS",
    defaultModelCode: "SMART_BMS_PRO",
    icon: Icons.battery_charging_full_rounded,
    accentColor: AppTheme.emeraldSuccess,
    bleServiceUuids: [
      "4fafc201-1fb5-459e-8fcc-c5c9c331914b",
      "4fafc201",
    ],
    nameKeywords: ["bms"],
    bleRxCharUuid: "8258380b-1039-4733-9b81-22f431886882",
    bleTxCharUuid: "beb5483e-36e1-4688-b7f5-ea07361b26a8",
    buildBlePayload: (data) => "PAIR:${data.ssid},${data.password}",
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/save?ssid=${Uri.encodeComponent(data.ssid)}&pass=${Uri.encodeComponent(data.password)}&mqtt=${Uri.encodeComponent(data.brokerIp)}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 8. THIẾT BỊ LƯU TRỮ NĂNG LƯỢNG UPS (UPS + MAC) -> Energy Manages
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile upsProfile = DeviceProvisioningProfile(
    category: DeviceCategory.energyManage,
    defaultTitle: "Bộ Lưu Điện UPS",
    defaultModelCode: "SMART_UPS_PRO",
    icon: Icons.power_input_rounded,
    accentColor: AppTheme.emeraldSuccess,
    bleServiceUuids: [
      "4fafc201-1fb5-459e-8fcc-c5c9c331914b",
      "4fafc201",
    ],
    nameKeywords: ["ups"],
    bleRxCharUuid: "beb5483e-36e1-4688-b7f5-ea07361b26a8",
    bleTxCharUuid: "beb5483e-36e1-4688-b7f5-ea07361b26a8",
    buildBlePayload: (data) =>
        "${data.ssid},${data.password},${data.brokerIp},${data.brokerPort}",
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/config?ssid=${Uri.encodeComponent(data.ssid)}&pass=${Uri.encodeComponent(data.password)}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 9. CẢM BIẾN NHIỆT ĐỘ (Tempsensor + MAC) -> Thiết bị môi trường
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile tempSensorProfile = DeviceProvisioningProfile(
    category: DeviceCategory.environment,
    defaultTitle: "Cảm Biến Nhiệt Độ",
    defaultModelCode: "SENSOR_TEMP",
    icon: Icons.thermostat_rounded,
    accentColor: Colors.orangeAccent,
    bleServiceUuids: ["6e400001-b5a3-f393-e0a9-e50e24dcca9e"],
    nameKeywords: ["tempsensor"],
    bleRxCharUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
    buildBlePayload: (data) =>
        "onboard/${data.ssid}/${data.password}/${data.userId}/${data.brokerIp}/${data.brokerPort}",
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/?SSID=${Uri.encodeComponent(data.ssid)}&PASS=${Uri.encodeComponent(data.password)}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 10. CẢM BIẾN KHÍ GAS (Gassensor + MAC) -> Thiết bị môi trường
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile gasSensorProfile = DeviceProvisioningProfile(
    category: DeviceCategory.environment,
    defaultTitle: "Cảm Biến Khí Gas",
    defaultModelCode: "SENSOR_GAS",
    icon: Icons.cloud_queue_rounded,
    accentColor: Colors.amberAccent,
    bleServiceUuids: ["6e400001-b5a3-f393-e0a9-e50e24dcca9e"],
    nameKeywords: ["gassensor"],
    bleRxCharUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
    buildBlePayload: (data) =>
        "onboard/${data.ssid}/${data.password}/${data.userId}/${data.brokerIp}/${data.brokerPort}",
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/?SSID=${Uri.encodeComponent(data.ssid)}&PASS=${Uri.encodeComponent(data.password)}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 11. CẢM BIẾN NỒNG ĐỘ OXY (O2sensor + MAC) -> Thiết bị môi trường
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile o2SensorProfile = DeviceProvisioningProfile(
    category: DeviceCategory.environment,
    defaultTitle: "Cảm Biến Nồng Độ Oxy",
    defaultModelCode: "SENSOR_O2",
    icon: Icons.air_rounded,
    accentColor: Colors.lightBlueAccent,
    bleServiceUuids: ["6e400001-b5a3-f393-e0a9-e50e24dcca9e"],
    nameKeywords: ["o2sensor"],
    bleRxCharUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
    buildBlePayload: (data) =>
        "onboard/${data.ssid}/${data.password}/${data.userId}/${data.brokerIp}/${data.brokerPort}",
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/?SSID=${Uri.encodeComponent(data.ssid)}&PASS=${Uri.encodeComponent(data.password)}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 12. CẢM BIẾN BÁO CHÁY (Flamsensor + MAC) -> Thiết bị môi trường
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile flamSensorProfile = DeviceProvisioningProfile(
    category: DeviceCategory.environment,
    defaultTitle: "Cảm Biến Báo Cháy",
    defaultModelCode: "SENSOR_FLAM",
    icon: Icons.local_fire_department_rounded,
    accentColor: Colors.redAccent,
    bleServiceUuids: ["6e400001-b5a3-f393-e0a9-e50e24dcca9e"],
    nameKeywords: ["flamsensor"],
    bleRxCharUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
    buildBlePayload: (data) =>
        "onboard/${data.ssid}/${data.password}/${data.userId}/${data.brokerIp}/${data.brokerPort}",
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/?SSID=${Uri.encodeComponent(data.ssid)}&PASS=${Uri.encodeComponent(data.password)}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 13. CAMERA AN NINH AI (CAM + MAC)
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile cameraProfile = DeviceProvisioningProfile(
    category: DeviceCategory.camera,
    defaultTitle: "Camera An Ninh AI",
    defaultModelCode: "AI_CAMERA_360",
    icon: Icons.videocam_rounded,
    accentColor: AppTheme.purpleAccent,
    bleServiceUuids: [
      "4fafc201-1fb5-459e-8fcc-c5c9c331914b",
      "4fafc201",
    ],
    nameKeywords: ["cam"],
    bleRxCharUuid: "bea5c122-3d83-11ed-a261-0242ac120002",
    bleTxCharUuid: "bea5c122-3d83-11ed-a261-0242ac120002",
    buildBlePayload: (data) =>
        "${data.ssid},${data.password},${data.brokerIp}",
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/save?ssid=${Uri.encodeComponent(data.ssid)}&pass=${Uri.encodeComponent(data.password)}&mqtt=${Uri.encodeComponent(data.brokerIp)}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 14. THIẾT BỊ KHÁC (TẤT CẢ CÁC THIẾT BỊ CÒN LẠI KHI GHÉP NỐI) -> Other Control
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile unregisteredDeviceProfile = DeviceProvisioningProfile(
    category: DeviceCategory.othersControl,
    defaultTitle: "Thiết Bị Khác",
    defaultModelCode: "OTHER_CONTROL_DEVICE",
    icon: Icons.device_unknown_rounded,
    accentColor: Colors.blueGrey,
    bleServiceUuids: ["6e400001-b5a3-f393-e0a9-e50e24dcca9e"],
    nameKeywords: [],
    bleRxCharUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
    buildBlePayload: (data) =>
        "onboard/${data.ssid}/${data.password}/${data.userId}/${data.brokerIp}/${data.brokerPort}",
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/?SSID=${Uri.encodeComponent(data.ssid)}&PASS=${Uri.encodeComponent(data.password)}',
    ),
  );

  /// Danh sách tất cả Profile chuẩn hóa theo file yêu cầu
  static final List<DeviceProvisioningProfile> allProfiles = [
    rollerDoorProfile,   // Cửa cuốn chính
    wallDoorProfile,     // Gắn tường / Âm tường
    glsDoorProfile,      // Cửa kính lùa
    rollDoorProfile,     // Cửa tay quay
    smartSocketProfile,  // Lights & Switch
    smartMeterProfile,   // Công tơ điện tử
    bmsProfile,          // Pin lithium BMS
    upsProfile,          // Bộ lưu điện UPS
    tempSensorProfile,   // Cảm biến nhiệt độ
    gasSensorProfile,    // Cảm biến Gas
    o2SensorProfile,     // Cảm biến Oxy
    flamSensorProfile,   // Cảm biến báo cháy
    cameraProfile,       // Camera
  ];

  /// Hàm tìm và khớp Profile CHÍNH XÁC 100% THEO FILE YÊU CẦU
  /// Sử dụng toLowerCase() để bắt mọi trường hợp chữ HOA / chữ thường (Vidu, ViDu, vidu, VIDU)
  static DeviceProvisioningProfile resolveProfile({
    required String rawName,
    List<String> advertisedUuids = const [],
  }) {
    final lowerName = rawName.toLowerCase().trim();

    // 1. Nhóm Cửa (4 loại: Cửa cuốn chính, Âm tường, Kính lùa, Tay quay)
    if (lowerName.contains("cuacuon") || lowerName.contains("wifirf-tt") || lowerName.contains("wifirftt") || lowerName.contains("vvcucuon")) {
      return rollerDoorProfile;
    }
    if (lowerName.contains("amtuong") || lowerName.contains("wifirf-eco") || lowerName.contains("wifirfeco") || lowerName.contains("vvamtuong")) {
      return wallDoorProfile;
    }
    if (lowerName.contains("glsdoor")) {
      return glsDoorProfile;
    }
    if (lowerName.contains("rolldoor")) {
      return rollDoorProfile;
    }

    // 2. Lights & Switch: ocam, sw, smartsw
    if (lowerName.contains("ocam") || lowerName.contains("smartsw") || lowerName.startsWith("sw") || lowerName.contains("sw-") || lowerName.contains("sw_") || lowerName.contains("sw+")) {
      return smartSocketProfile;
    }

    // 3. Energy Manages: Smartmetter, BMS, UPS
    if (lowerName.contains("smartmetter") || lowerName.contains("smartmeter")) {
      return smartMeterProfile;
    }
    if (lowerName.contains("bms")) {
      return bmsProfile;
    }
    if (lowerName.contains("ups")) {
      return upsProfile;
    }

    // 4. Thiết bị môi trường: Tempsensor, Gassensor, O2sensor, Flamsensor
    if (lowerName.contains("tempsensor")) {
      return tempSensorProfile;
    }
    if (lowerName.contains("gassensor")) {
      return gasSensorProfile;
    }
    if (lowerName.contains("o2sensor")) {
      return o2SensorProfile;
    }
    if (lowerName.contains("flamsensor")) {
      return flamSensorProfile;
    }

    // 5. Camera an ninh: cam (loại trừ ocam)
    if (lowerName.contains("cam") && !lowerName.contains("ocam")) {
      return cameraProfile;
    }

    // 6. TẤT CẢ CÁC THIẾT BỊ CÒN LẠI: Vào Others Control
    return unregisteredDeviceProfile;
  }
}
