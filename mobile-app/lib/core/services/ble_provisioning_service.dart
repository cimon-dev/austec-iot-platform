import 'dart:async';
import '../models/device_model.dart';
import 'iot_gateway_client.dart';

class DiscoveredHardwareBLE {
  final String hardwareId;
  final String modelName;
  final DeviceCategory category;
  final int rssi; // Signal strength dBm
  final String bleUuid;

  DiscoveredHardwareBLE({
    required this.hardwareId,
    required this.modelName,
    required this.category,
    required this.rssi,
    required this.bleUuid,
  });
}

class PairingResult {
  final bool success;
  final String hardwareId;
  final String modelName;
  final String warrantyCode;
  final String warrantyUntil;
  final String errorMessage;

  PairingResult({
    required this.success,
    required this.hardwareId,
    required this.modelName,
    required this.warrantyCode,
    required this.warrantyUntil,
    this.errorMessage = "",
  });
}

class BleProvisioningService {
  static final BleProvisioningService _instance = BleProvisioningService._internal();
  factory BleProvisioningService() => _instance;
  BleProvisioningService._internal();

  // Simulated factory pool of un-paired devices broadcasting Hardware ID UUID
  final List<DiscoveredHardwareBLE> _mockBroadcastPool = [
    DiscoveredHardwareBLE(
      hardwareId: "AT-DOOR-99142C",
      modelName: "Austec Titadoor A900 Super",
      category: DeviceCategory.rollerDoor,
      rssi: -54,
      bleUuid: "0000aust-0000-1000-8000-00805f9b34fb-AT-DOOR-99142C",
    ),
    DiscoveredHardwareBLE(
      hardwareId: "MS-LOCK-88102A",
      modelName: "Khóa Masaru Titan X1 Pro",
      category: DeviceCategory.smartLock,
      rssi: -62,
      bleUuid: "0000aust-0000-1000-8000-00805f9b34fb-MS-LOCK-88102A",
    ),
    DiscoveredHardwareBLE(
      hardwareId: "UPS-220V-55109D",
      modelName: "Austec Sin Chuẩn Pro 220V",
      category: DeviceCategory.smartUps,
      rssi: -70,
      bleUuid: "0000aust-0000-1000-8000-00805f9b34fb-UPS-220V-55109D",
    ),
  ];

  // Scan BLE for devices with exact Hardware ID
  Future<List<DiscoveredHardwareBLE>> scanForHardwareDevices({String? targetHardwareId}) async {
    // Simulate BLE discovery duration (1.2s)
    await Future.delayed(const Duration(milliseconds: 1200));

    if (targetHardwareId != null && targetHardwareId.isNotEmpty) {
      // Return exact match if scanned via QR
      return _mockBroadcastPool.where((dev) => dev.hardwareId.toUpperCase() == targetHardwareId.toUpperCase()).toList();
    }

    return _mockBroadcastPool;
  }

  // Provisioning pipeline: BLE Handshake -> Push WiFi -> Cloud Register -> 24m E-Warranty
  Future<PairingResult> provisionDevice({
    required DiscoveredHardwareBLE targetDevice,
    required String wifiSsid,
    required String wifiPassword,
    required Function(String stepMessage, double progress) onProgress,
  }) async {
    // Step 1: BLE Secure Handshake
    onProgress("Đang kết nối Bluetooth BLE với ${targetDevice.hardwareId}...", 0.25);
    await Future.delayed(const Duration(milliseconds: 600));

    // Step 2: Push Encrypted WiFi Credentials
    onProgress("Đang gửi thông tin mạng WiFi $wifiSsid vào bo mạch...", 0.50);
    await Future.delayed(const Duration(milliseconds: 700));

    // Step 3: Cloud Verification & Inventory Check
    onProgress("Đang xác thực xuất xưởng & đăng ký lên Cloud Broker...", 0.75);
    await Future.delayed(const Duration(milliseconds: 800));

    // Step 4: Warranty Activation
    onProgress("Kích hoạt bảo hành điện tử chính hãng 24 tháng...", 0.95);
    await Future.delayed(const Duration(milliseconds: 500));

    final warrantyUntil = "2028-10-17";
    final warrantyCode = "EW-${targetDevice.hardwareId.replaceAll('-', '')}-24M";

    // Add device to local list
    final newDevice = DeviceItem(
      id: "DEV-${DateTime.now().millisecondsSinceEpoch}",
      hardwareId: targetDevice.hardwareId,
      name: "${targetDevice.modelName} (Mới ghép)",
      modelName: targetDevice.modelName,
      category: targetDevice.category,
      isOnline: true,
      warrantyUntil: warrantyUntil,
    );
    IoTGatewayClient().addDevice(newDevice);

    onProgress("Ghép nối thiết bị thành công 100%!", 1.0);

    return PairingResult(
      success: true,
      hardwareId: targetDevice.hardwareId,
      modelName: targetDevice.modelName,
      warrantyCode: warrantyCode,
      warrantyUntil: warrantyUntil,
    );
  }
}
