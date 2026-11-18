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
  // 1. CỬA CUỐN TRUNG TÂM AUSTEC (WIFRFTT + MAC) - Có phần thêm tay cầm RF
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile rollerDoorProfile = DeviceProvisioningProfile(
    category: DeviceCategory.rollerDoor,
    defaultTitle: "Cửa Cuốn Trung Tâm",
    defaultModelCode: "DOOR_HUB_WIFRFTT",
    icon: Icons.roller_shades_rounded,
    accentColor: AppTheme.cyanAccent,
    bleServiceUuids: [
      "6e400001-b5a3-f393-e0a9-e50e24dcca9e", // Chuẩn Nordic UART Service
      "6e400001",
    ],
    nameKeywords: ["wifrftt", "cuacuon", "austec", "door", "roller", "at-door"],
    bleRxCharUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
    bleTxCharUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
    // Cú pháp nạp Cửa cuốn: onboard/{ssid}/{pass}/{userId}/{brokerIp}/{port}
    buildBlePayload: (data) =>
        "onboard/${data.ssid}/${data.password}/${data.userId}/${data.brokerIp}/${data.brokerPort}",
    // Cú pháp nạp SoftAP: http://192.168.4.1/?SSID=...&PASS=...&USER=...&IP=...&PORT=...
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/?SSID=${Uri.encodeComponent(data.ssid)}&PASS=${Uri.encodeComponent(data.password)}&USER=${Uri.encodeComponent(data.userId)}&IP=${Uri.encodeComponent(data.brokerIp)}&PORT=${data.brokerPort}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 2. CỬA CUỐN ÂM TƯỜNG AUSTEC (WIFRF_ECO + MAC) - Cùng nhóm Doors màu cam, KHÔNG CÓ tay cầm RF
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile wallDoorProfile = DeviceProvisioningProfile(
    category: DeviceCategory.rollerDoor,
    defaultTitle: "Cửa Cuốn Âm Tường",
    defaultModelCode: "DOOR_INWALL_ECO",
    icon: Icons.roller_shades_closed_rounded,
    accentColor: AppTheme.amberWarning,
    bleServiceUuids: [
      "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
      "6e400001",
    ],
    nameKeywords: ["wifrf_eco", "wifrfeco", "wifrf", "amtuong", "inwall"],
    bleRxCharUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
    bleTxCharUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
    buildBlePayload: (data) =>
        "onboard/${data.ssid}/${data.password}/${data.userId}/${data.brokerIp}/${data.brokerPort}",
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/?SSID=${Uri.encodeComponent(data.ssid)}&PASS=${Uri.encodeComponent(data.password)}&USER=${Uri.encodeComponent(data.userId)}&IP=${Uri.encodeComponent(data.brokerIp)}&PORT=${data.brokerPort}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 3. Ổ CẮM CÔNG TẮC THÔNG MINH AUSTEC (SmartSW + MAC / OCAM)
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile smartSocketProfile = DeviceProvisioningProfile(
    category: DeviceCategory.lightSwitch,
    defaultTitle: "Ổ Cắm Công Tắc Thông Minh",
    defaultModelCode: "SMART_SOCKET_SW",
    icon: Icons.power_rounded,
    accentColor: AppTheme.amberWarning,
    bleServiceUuids: [
      "6e400001-b5a3-f393-e0a9-e50e24dcca9e", // Chuẩn Nordic UART của ocammoi
      "4faac861-11a3-45d6-964d-c57406320509", // Hỗ trợ mạch cũ nếu có
      "4faac861",
      "6e400001",
    ],
    nameKeywords: ["smartsw", "smart_sw", "ocam", "socket", "ocamping"],
    bleRxCharUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
    bleTxCharUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
    buildBlePayload: (data) =>
        "onboard/${data.ssid}/${data.password}/${data.userId}/${data.brokerIp}/${data.brokerPort}",
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/?SSID=${Uri.encodeComponent(data.ssid)}&PASS=${Uri.encodeComponent(data.password)}&USER=${Uri.encodeComponent(data.userId)}&IP=${Uri.encodeComponent(data.brokerIp)}&PORT=${data.brokerPort}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 4. CAMERA AN NINH AI (AI-Thinker ESP32-CAM OV2640)
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile cameraProfile = DeviceProvisioningProfile(
    category: DeviceCategory.camera,
    defaultTitle: "Camera An Ninh AI",
    defaultModelCode: "AI_CAMERA_360",
    icon: Icons.videocam_rounded,
    accentColor: AppTheme.purpleAccent,
    bleServiceUuids: [
      "4fafc201-1fb5-459e-8fcc-c5c9c331914b", // UUID BLE trong code camera OV2640
      "4fafc201",
    ],
    nameKeywords: ["esp32-cam", "camera", "cam_", "cam-", "ov2640", "ezviz", "dahua", "hikvision"],
    bleRxCharUuid: "bea5c122-3d83-11ed-a261-0242ac120002",
    bleTxCharUuid: "bea5c122-3d83-11ed-a261-0242ac120002",
    buildBlePayload: (data) =>
        "${data.ssid},${data.password},${data.brokerIp}",
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/save?ssid=${Uri.encodeComponent(data.ssid)}&pass=${Uri.encodeComponent(data.password)}&mqtt=${Uri.encodeComponent(data.brokerIp)}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 5. CÔNG TƠ ĐIỆN TỬ CHỐNG GIẬT AUSTEC (SmartMetter + MAC - smartmetter_copy.ino)
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
    nameKeywords: ["smartmetter", "smartmeter", "congto", "meter"],
    bleRxCharUuid: "beb5483e-36e1-4688-b7f5-ea07361b26a8",
    bleTxCharUuid: "beb5483e-36e1-4688-b7f5-ea07361b26a8",
    buildBlePayload: (data) =>
        "${data.ssid},${data.password},${data.brokerIp},${data.brokerPort}",
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/config?ssid=${Uri.encodeComponent(data.ssid)}&pass=${Uri.encodeComponent(data.password)}&server=${Uri.encodeComponent(data.brokerIp)}&port=${data.brokerPort}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 6. HỆ THỐNG PIN LƯU TRỮ THÔNG MINH AUSTEC BMS (AUSTEC_BMS + MAC - BMSV01.ino)
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
    nameKeywords: ["austec_bms", "bms", "austec-bms", "smartbms"],
    bleRxCharUuid: "8258380b-1039-4733-9b81-22f431886882",
    bleTxCharUuid: "beb5483e-36e1-4688-b7f5-ea07361b26a8",
    // Cú pháp nạp BLE đúng chuẩn hàm applyRemoteSettingsCommand trong BMSV01.ino: PAIR:<ssid>,<pass>
    buildBlePayload: (data) => "PAIR:${data.ssid},${data.password}",
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/save?ssid=${Uri.encodeComponent(data.ssid)}&pass=${Uri.encodeComponent(data.password)}&mqtt=${Uri.encodeComponent(data.brokerIp)}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 6. THIẾT BỊ BLE CHƯA ĐĂNG KÝ (GENERIC / UNREGISTERED) - KHÔNG DÙNG FALLBACK ÉP KIỂU!
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

  /// Danh sách thiết bị trọng tâm đang hoạt động thực tế
  static final List<DeviceProvisioningProfile> allProfiles = [
    rollerDoorProfile,  // 1. Cửa cuốn trung tâm (WIFRFTT)
    wallDoorProfile,    // 2. Cửa cuốn âm tường (WIFRF_ECO / amtuong)
    smartSocketProfile, // 3. Ổ cắm công tắc thông minh (SmartSW / OCAM)
    cameraProfile,      // 4. Camera An Ninh AI (ESP32-CAM)
    smartMeterProfile,  // 5. Công tơ điện tử chống giật (SmartMetter)
    bmsProfile,         // 6. Hệ thống Pin Lưu Trữ BMS (AUSTEC_BMS)
  ];

  /// Hàm tìm và khớp Profile CHÍNH XÁC THEO TÀI LIỆU KỸ THUẬT AUSTEC
  /// Tuyệt đối không fallback ép kiểu về các loại trên đối với thiết bị lạ!
  static DeviceProvisioningProfile resolveProfile({
    required String rawName,
    List<String> advertisedUuids = const [],
  }) {
    final lowerName = rawName.toLowerCase().trim();
    final upperName = rawName.toUpperCase().trim();

    // 0. Hệ thống Pin lưu trữ BMS: Bắt đầu bằng AUSTEC_BMS / BMS / SMARTBMS
    if (upperName.startsWith("AUSTEC_BMS") || upperName.startsWith("BMS") || upperName.startsWith("SMARTBMS") || (lowerName.contains("bms") && !lowerName.contains("door"))) {
      return bmsProfile;
    }

    // 1. Công tơ điện tử chống giật: Bắt đầu bằng SmartMetter / smartmeter / congto
    if (upperName.startsWith("SMARTMETTER") || upperName.startsWith("SMARTMETER") || lowerName.contains("congto") || (lowerName.contains("meter") && !lowerName.contains("door"))) {
      return smartMeterProfile;
    }

    // 2. Ổ cắm công tắc thông minh: Bắt cả case chữ in hoa và thường: SmartSW, SMARTSW, smartsw, OCAM, socket
    if (upperName.startsWith("SMARTSW") || rawName.contains("SmartSW") || upperName.startsWith("OCAM") || lowerName.contains("socket") || lowerName.contains("ocamping")) {
      return smartSocketProfile;
    }

    // 3. Camera an ninh AI: Bắt đầu bằng cam, esp32-cam, camera, ov2640 (loại trừ ocam, smartsw, socket)
    if ((lowerName.startsWith("cam") || lowerName.contains("camera") || lowerName.contains("esp32-cam") || lowerName.contains("ov2640")) &&
        !upperName.startsWith("OCAM") && !upperName.startsWith("SMARTSW") && !lowerName.contains("socket")) {
      return cameraProfile;
    }

    // 4. Cửa cuốn âm tường: Bắt đầu bằng WIFRF_ECO, WIFRFECO, amtuong, inwall
    if (upperName.startsWith("WIFRF_ECO") || upperName.startsWith("WIFRFECO") || lowerName.startsWith("amtuong") || lowerName.contains("inwall") || (upperName.startsWith("WIFRF") && upperName.contains("ECO"))) {
      return wallDoorProfile;
    }

    // 5. Cửa cuốn trung tâm: Bắt đầu bằng WIFRFTT, cuacuon, at-door, door
    if (upperName.startsWith("WIFRFTT") || lowerName.startsWith("cuacuon") || lowerName.startsWith("at-door") || (lowerName.startsWith("door") && !lowerName.contains("sensor"))) {
      return rollerDoorProfile;
    }

    // 6. Khớp Service UUID đặc thù NẾU có dấu hiệu rõ ràng
    if (advertisedUuids.isNotEmpty) {
      final normAdvUuids = advertisedUuids.map((u) => u.toLowerCase().replaceAll('-', '')).toList();
      if (normAdvUuids.any((u) => u.contains("4fafc201"))) {
        if (lowerName.contains("bms")) return bmsProfile;
        if (lowerName.contains("meter") || lowerName.contains("metter")) return smartMeterProfile;
        if (lowerName.contains("cam")) return cameraProfile;
      }
      if (normAdvUuids.any((u) => u.contains("6e400001"))) {
        if (upperName.startsWith("SMARTSW") || upperName.startsWith("OCAM")) return smartSocketProfile;
        if (upperName.startsWith("WIFRF_ECO") || lowerName.startsWith("amtuong")) return wallDoorProfile;
        if (upperName.startsWith("WIFRFTT") || lowerName.startsWith("cuacuon") || lowerName.startsWith("at-door")) return rollerDoorProfile;
      }
    }

    // 7. TUYỆT ĐỐI KHÔNG FALLBACK VỀ 4/5 LOẠI TRÊN!
    // Các thiết bị lạ tự động chuyển vào loại Other Control
    return unregisteredDeviceProfile;
  }
}
