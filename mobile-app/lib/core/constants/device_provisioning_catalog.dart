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
  // 1. CỬA CUỐN THÔNG MINH AUSTEC (ESP32-C3) - Thiết bị trọng tâm đang test phần cứng
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile rollerDoorProfile = DeviceProvisioningProfile(
    category: DeviceCategory.rollerDoor,
    defaultTitle: "Cửa Cuốn Austec",
    defaultModelCode: "DOOR_GERMAN_ALU",
    icon: Icons.roller_shades_rounded,
    accentColor: AppTheme.cyanAccent,
    bleServiceUuids: [
      "6e400001-b5a3-f393-e0a9-e50e24dcca9e", // Chuẩn Nordic UART Service
      "6e400001",
    ],
    nameKeywords: ["amtuong", "cuacuon", "austec", "door", "roller", "at-door"],
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
  // 2. CAMERA AN NINH AI (AI-Thinker ESP32-CAM OV2640)
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile cameraProfile = DeviceProvisioningProfile(
    category: DeviceCategory.camera,
    defaultTitle: "Camera An Ninh",
    defaultModelCode: "AI_CAMERA_360",
    icon: Icons.videocam_rounded,
    accentColor: AppTheme.purpleAccent,
    bleServiceUuids: [
      "4fafc201-1fb5-459e-8fcc-c5c9c331914b", // UUID BLE trong code camera OV2640
      "4fafc201",
    ],
    nameKeywords: ["esp32-cam", "camera", "cam_", "cam-", "ov2640", "setup", "ble-cam"],
    bleRxCharUuid: "bea5c122-3d83-11ed-a261-0242ac120002",
    bleTxCharUuid: "bea5c122-3d83-11ed-a261-0242ac120002",
    // Cú pháp nạp Camera: {ssid},{pass},{mqtt_ip}
    buildBlePayload: (data) =>
        "${data.ssid},${data.password},${data.brokerIp}",
    // Cú pháp nạp SoftAP: POST http://192.168.4.1/save?ssid=...&pass=...&mqtt=...
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/save?ssid=${Uri.encodeComponent(data.ssid)}&pass=${Uri.encodeComponent(data.password)}&mqtt=${Uri.encodeComponent(data.brokerIp)}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 3. Ổ CẮM THÔNG MINH AUSTEC (ESP32 Relay - OCAM từ ocammoi)
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile smartSocketProfile = DeviceProvisioningProfile(
    category: DeviceCategory.lightSwitch,
    defaultTitle: "Ổ Cắm Thông Minh Austec",
    defaultModelCode: "SMART_SOCKET_ECO",
    icon: Icons.power_rounded,
    accentColor: AppTheme.amberWarning,
    bleServiceUuids: [
      "6e400001-b5a3-f393-e0a9-e50e24dcca9e", // Chuẩn Nordic UART của ocammoi
      "4faac861-11a3-45d6-964d-c57406320509", // Hỗ trợ mạch cũ nếu có
      "4faac861",
      "6e400001",
    ],
    nameKeywords: ["ocam", "socket", "ocamping"],
    bleRxCharUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
    bleTxCharUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
    // Cú pháp nạp Ổ cắm qua BLE: Khớp 100% cú pháp onboard của ocammoi (bluetooth.h)
    buildBlePayload: (data) =>
        "onboard/${data.ssid}/${data.password}/${data.userId}/${data.brokerIp}/${data.brokerPort}",
    // Cú pháp nạp SoftAP: Khớp Web_Server.h của ocammoi
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/?SSID=${Uri.encodeComponent(data.ssid)}&PASS=${Uri.encodeComponent(data.password)}&USER=${Uri.encodeComponent(data.userId)}&IP=${Uri.encodeComponent(data.brokerIp)}&PORT=${data.brokerPort}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 4. KHÓA THÔNG MINH MASARU (Mẫu chuẩn bị mở rộng trong tương lai)
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile smartLockProfile = DeviceProvisioningProfile(
    category: DeviceCategory.othersControl,
    defaultTitle: "Khóa Thông Minh Masaru",
    defaultModelCode: "SMART_LOCK_MASARU",
    icon: Icons.lock_rounded,
    accentColor: AppTheme.amberWarning,
    bleServiceUuids: ["6e400001-lock"],
    nameKeywords: ["masaru", "lock", "khoa"],
    bleRxCharUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
    buildBlePayload: (data) =>
        "lock_onboard/${data.ssid}/${data.password}/${data.userId}/${data.brokerIp}",
    buildSoftApUri: (data, {String apHost = "192.168.4.1"}) => Uri.parse(
      'http://$apHost/?SSID=${Uri.encodeComponent(data.ssid)}&PASS=${Uri.encodeComponent(data.password)}',
    ),
  );

  // ---------------------------------------------------------------------------
  // 5. THIẾT BỊ BLE CHƯA ĐĂNG KÝ (GENERIC / UNREGISTERED) - KHÔNG DÙNG FALLBACK ÉP KIỂU!
  // ---------------------------------------------------------------------------
  static final DeviceProvisioningProfile unregisteredDeviceProfile = DeviceProvisioningProfile(
    category: DeviceCategory.othersControl,
    defaultTitle: "Thiết Bị BLE",
    defaultModelCode: "GENERIC_BLE_DEVICE",
    icon: Icons.bluetooth_searching_rounded,
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

  /// Danh sách toàn bộ các Profile có trong hệ thống
  static final List<DeviceProvisioningProfile> allProfiles = [
    smartSocketProfile, // Ổ cắm thông minh OCAM (ocammoi)
    cameraProfile,      // Camera An Ninh AI (espcam.pdf)
    smartLockProfile,   // Khóa thông minh Masaru
    rollerDoorProfile,  // Cửa cuốn Austec (amtuong / at-door)
  ];

  /// Hàm tìm và khớp Profile CHÍNH XÁC - TUYỆT ĐỐI KHÔNG FALLBACK ÉP VỀ CỬA CUỐN
  static DeviceProvisioningProfile resolveProfile({
    required String rawName,
    List<String> advertisedUuids = const [],
  }) {
    final lowerName = rawName.toLowerCase().trim();

    // 1. Khớp ưu tiên theo tiền tố Hardware ID hoặc từ khóa đặc thù (Độ chính xác cao nhất)
    if (lowerName.startsWith("ocam") || lowerName.contains("socket") || lowerName.contains("ocamping")) {
      return smartSocketProfile;
    }
    if (lowerName.startsWith("cam") || lowerName.contains("camera") || lowerName.contains("ov2640")) {
      return cameraProfile;
    }
    if (lowerName.startsWith("lock") || lowerName.contains("masaru") || lowerName.contains("khoa")) {
      return smartLockProfile;
    }
    if (lowerName.startsWith("amtuong") || lowerName.startsWith("at-door") || lowerName.contains("cuacuon")) {
      return rollerDoorProfile;
    }

    // 2. Khớp theo Service UUID đặc thù
    if (advertisedUuids.isNotEmpty) {
      final normAdvUuids = advertisedUuids.map((u) => u.toLowerCase().replaceAll('-', '')).toList();
      // Camera UUID: 4fafc201
      if (normAdvUuids.any((u) => u.contains("4fafc201"))) {
        return cameraProfile;
      }
      // Khóa UUID: 6e400001-lock
      if (normAdvUuids.any((u) => u.contains("6e400001lock"))) {
        return smartLockProfile;
      }
      // Nordic UART: Phân biệt Cửa cuốn hay Ổ cắm dựa vào tiền tố
      if (normAdvUuids.any((u) => u.contains("6e400001"))) {
        if (lowerName.startsWith("ocam")) return smartSocketProfile;
        if (lowerName.startsWith("amtuong") || lowerName.startsWith("at-door")) return rollerDoorProfile;
      }
    }

    // 3. Khớp qua profile.matches cho các từ khóa phụ
    for (final profile in allProfiles) {
      if (profile.matches(rawName: rawName, advertisedUuids: advertisedUuids)) {
        return profile;
      }
    }

    // 4. TUYỆT ĐỐI KHÔNG DÙNG FALLBACK ÉP THÀNH CỬA CUỐN
    // Nếu thiết bị chưa đăng ký trong Catalog -> trả về unregisteredDeviceProfile minh bạch
    return unregisteredDeviceProfile;
  }
}
