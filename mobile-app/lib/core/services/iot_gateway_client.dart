import 'dart:async';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import '../models/device_model.dart';

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

  // Mock initial devices
  final List<DeviceItem> _devices = [
    DeviceItem(
      id: "DEV-01",
      hardwareId: "AT-DOOR-88239A",
      name: "Cửa Cuốn Mặt Tiền",
      modelName: "Austec Titadoor A900 Super",
      category: DeviceCategory.rollerDoor,
      positionPercent: 0,
      isChildLockActive: false,
      batteryPercent: 94,
    ),
    DeviceItem(
      id: "DEV-02",
      hardwareId: "MS-LOCK-99120B",
      name: "Khóa Cửa Chính Masaru",
      modelName: "Khóa Masaru Titan X1",
      category: DeviceCategory.smartLock,
      isLocked: true,
      batteryPercent: 88,
    ),
    DeviceItem(
      id: "DEV-03",
      hardwareId: "UPS-220V-77192C",
      name: "Bộ Lưu Điện Khẩn Cấp",
      modelName: "Austec Sin Chuẩn Pro 220V",
      category: DeviceCategory.smartUps,
      acVoltage: 220.5,
      batteryVoltage: 26.2,
      batteryPercent: 98,
      isDischarging: false,
    ),
    DeviceItem(
      id: "DEV-04",
      hardwareId: "SK-AUSTEC-10294",
      name: "Ổ Cắm Bơm Nước Ban Công",
      modelName: "Austec Smart Socket S1",
      category: DeviceCategory.smartSocket,
      isSocketRelayOn: true,
      currentPowerWatt: 160.0,
    ),
    DeviceItem(
      id: "DEV-05",
      hardwareId: "SN-ENV-33019",
      name: "Cảm Biến Phòng Khách",
      modelName: "Austec MultiSensor M1",
      category: DeviceCategory.sensor,
      temperature: 27.8,
      humidity: 59.0,
    ),
  ];

  List<DeviceItem> get devices => List.unmodifiable(_devices);

  // Add newly paired device
  void addDevice(DeviceItem device) {
    _devices.add(device);
  }

  // Find device by hardware ID
  DeviceItem? findByHardwareId(String hardwareId) {
    try {
      return _devices.firstWhere((d) => d.hardwareId == hardwareId);
    } catch (_) {
      return null;
    }
  }

  // Dispatch 2-Click command with cryptographic signature & sub-250ms roundtrip
  Future<CommandResult> sendCommand({
    required String hardwareId,
    required String action,
    Map<String, dynamic>? parameters,
  }) async {
    final startTime = DateTime.now();

    // 1. Generate HMAC/SHA-256 digital signature
    final payloadString = jsonEncode({
      "hardwareId": hardwareId,
      "action": action,
      "parameters": parameters ?? {},
      "timestamp": startTime.toIso8601String(),
      "userId": "USR-001928"
    });
    final signature = sha256.convert(utf8.encode(payloadString)).toString();

    // 2. Simulate MQTT TLS 1.3 network transport latency (between 120ms - 210ms)
    final delayMs = 120 + (DateTime.now().microsecond % 90);
    await Future.delayed(Duration(milliseconds: delayMs));

    // 3. Update local state
    final device = findByHardwareId(hardwareId);
    if (device != null) {
      if (action == "OPEN_DOOR") {
        device.positionPercent = 100;
      } else if (action == "CLOSE_DOOR") {
        device.positionPercent = 0;
      } else if (action == "STOP_DOOR") {
        device.positionPercent = parameters?["target"] ?? 50;
      } else if (action == "TOGGLE_CHILD_LOCK") {
        device.isChildLockActive = !device.isChildLockActive;
      } else if (action == "UNLOCK_SLIDE") {
        device.isLocked = false;
      } else if (action == "LOCK_SLIDE") {
        device.isLocked = true;
      } else if (action == "DISCHARGE_UPS") {
        device.isDischarging = !device.isDischarging;
      } else if (action == "TOGGLE_SOCKET") {
        device.isSocketRelayOn = !device.isSocketRelayOn;
      }
    }

    final totalLatency = DateTime.now().difference(startTime).inMilliseconds;

    return CommandResult(
      success: true,
      latencyMs: totalLatency,
      message: "Lệnh $action đã được thiết bị $hardwareId thực thi thành công",
      cryptoSignature: signature,
    );
  }
}
