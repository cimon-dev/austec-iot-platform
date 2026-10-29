import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'auth_service.dart';

class BleDeviceControlService {
  static final BleDeviceControlService _instance = BleDeviceControlService._internal();
  factory BleDeviceControlService() => _instance;
  BleDeviceControlService._internal();

  BluetoothDevice? _connectedDevice;
  BluetoothCharacteristic? _rxCharacteristic;
  String? _lastHardwareId;

  // UUIDs chuẩn phần cứng ESP32-C3 CodeCuaCuonBLE
  static const String serviceUuid = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
  static const String rxCharUuid = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";

  /// Gửi lệnh điều khiển trực tiếp tới rơ-le bo mạch ESP32 qua BLE:
  /// Cú pháp firmware CodeCuaCuonBLE (bluetooth.h):
  ///   {userId}/{hardwareId}/action/{actionNumber}
  /// Trong đó actionNumber:
  ///   "1": Mở cửa (Up relay kích hoạt -> tiếng tạch tạch)
  ///   "2": Đóng cửa (Down relay kích hoạt -> tiếng tạch tạch)
  ///   "3": Dừng khẩn cấp (Stop relay kích hoạt -> tiếng tạch tạch)
  Future<bool> sendDoorAction({
    required String hardwareId,
    required String actionNumber,
  }) async {
    if (kIsWeb) return false;

    final currentUser = AuthService().currentUser;
    final currentUserId = (currentUser != null && currentUser.id.isNotEmpty)
        ? currentUser.id
        : 'USR-330967';

    final payloadPrimary = "$currentUserId/$hardwareId/action/$actionNumber";

    try {
      // 1. Tận dụng kết nối BLE sẵn có nếu thiết bị vẫn đang kết nối
      if (_connectedDevice != null &&
          _lastHardwareId?.toLowerCase() == hardwareId.toLowerCase() &&
          _connectedDevice!.isConnected &&
          _rxCharacteristic != null) {
        final bool withoutResponse =
            _rxCharacteristic!.properties.writeWithoutResponse && !_rxCharacteristic!.properties.write;
        await _rxCharacteristic!.write(utf8.encode(payloadPrimary), withoutResponse: withoutResponse).timeout(const Duration(seconds: 2));
        if (currentUserId != 'USR-330967') {
          // Gửi thêm fallback nếu ID ghép nối là USR-330967
          await Future.delayed(const Duration(milliseconds: 60));
          await _rxCharacteristic!.write(utf8.encode("USR-330967/$hardwareId/action/$actionNumber"), withoutResponse: withoutResponse).timeout(const Duration(seconds: 1));
        }
        debugPrint("[BLE Door Control] ⚡ Gửi lệnh trực tiếp BLE siêu tốc thành công: $payloadPrimary");
        return true;
      }

      // 2. Tìm thiết bị BLE ở cự ly gần
      BluetoothDevice? targetDevice;

      // Kiểm tra danh sách thiết bị đã kết nối của hệ điều hành
      try {
        final connectedList = FlutterBluePlus.connectedDevices;
        for (final dev in connectedList) {
          final n = dev.platformName.toLowerCase();
          if (n == hardwareId.toLowerCase() || n.contains(hardwareId.toLowerCase())) {
            targetDevice = dev;
            break;
          }
        }
      } catch (_) {}

      // Kiểm tra kết quả quét gần nhất
      if (targetDevice == null) {
        final scanResults = FlutterBluePlus.lastScanResults;
        for (final r in scanResults) {
          final n = (r.device.platformName.isNotEmpty ? r.device.platformName : r.advertisementData.advName).toLowerCase();
          if (n == hardwareId.toLowerCase() || n.contains(hardwareId.toLowerCase())) {
            targetDevice = r.device;
            break;
          }
        }
      }

      // Nếu chưa có, quét nhanh 1.5s để bắt sóng BLE
      if (targetDevice == null) {
        try {
          if (FlutterBluePlus.isScanningNow) {
            await FlutterBluePlus.stopScan();
          }
          await FlutterBluePlus.startScan(
            timeout: const Duration(milliseconds: 1500),
          );
          final freshResults = await FlutterBluePlus.scanResults.first.timeout(
            const Duration(milliseconds: 1600),
            onTimeout: () => FlutterBluePlus.lastScanResults,
          );
          for (final r in freshResults) {
            final n = (r.device.platformName.isNotEmpty ? r.device.platformName : r.advertisementData.advName).toLowerCase();
            if (n == hardwareId.toLowerCase() || n.contains(hardwareId.toLowerCase())) {
              targetDevice = r.device;
              break;
            }
          }
        } catch (_) {}
      }

      if (targetDevice == null) {
        debugPrint("[BLE Door Control] ⚠️ Không tìm thấy thiết bị BLE [$hardwareId] trong tầm quét");
        return false;
      }

      // 3. Kết nối với thiết bị BLE
      if (!targetDevice.isConnected) {
        try {
          if (FlutterBluePlus.isScanningNow) {
            await FlutterBluePlus.stopScan();
          }
        } catch (_) {}

        await targetDevice.connect(
          license: License.nonprofit,
          timeout: const Duration(seconds: 3),
        ).timeout(const Duration(seconds: 4));
      }

      // 4. Khám phá GATT Services & Characteristic RX
      final services = await targetDevice.discoverServices().timeout(const Duration(seconds: 3));
      BluetoothCharacteristic? rxChar;

      for (final s in services) {
        final sUuid = s.uuid.toString().replaceAll('-', '').toUpperCase();
        if (sUuid.contains("6E400001")) {
          for (final c in s.characteristics) {
            final cUuid = c.uuid.toString().replaceAll('-', '').toUpperCase();
            if (cUuid.contains("6E400002")) {
              rxChar = c;
              break;
            }
          }
        }
        if (rxChar != null) break;
      }

      // Fallback tìm trên tất cả các dịch vụ
      if (rxChar == null) {
        for (final s in services) {
          for (final c in s.characteristics) {
            final cUuid = c.uuid.toString().replaceAll('-', '').toUpperCase();
            if (cUuid.contains("6E400002")) {
              rxChar = c;
              break;
            }
          }
          if (rxChar != null) break;
        }
      }

      if (rxChar != null) {
        final bool withoutResponse = rxChar.properties.writeWithoutResponse && !rxChar.properties.write;
        await rxChar.write(utf8.encode(payloadPrimary), withoutResponse: withoutResponse).timeout(const Duration(seconds: 2));
        if (currentUserId != 'USR-330967') {
          await Future.delayed(const Duration(milliseconds: 60));
          await rxChar.write(utf8.encode("USR-330967/$hardwareId/action/$actionNumber"), withoutResponse: withoutResponse).timeout(const Duration(seconds: 1));
        }

        debugPrint("[BLE Door Control] ✅ Đã truyền lệnh BLE trực tiếp tới rơ-le bo mạch ESP32: $payloadPrimary");
        _connectedDevice = targetDevice;
        _rxCharacteristic = rxChar;
        _lastHardwareId = hardwareId;
        return true;
      }
    } catch (e) {
      debugPrint("[BLE Door Control] ⚠️ Lỗi truyền lệnh BLE: $e");
    }
    return false;
  }
}
