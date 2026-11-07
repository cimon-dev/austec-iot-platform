import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:http/http.dart' as http;
import '../models/device_model.dart';
import '../constants/api_config.dart';
import '../constants/device_provisioning_catalog.dart';
import 'iot_gateway_client.dart';
import 'auth_service.dart';
import 'ble_web_scanner.dart';

enum PairingMethod {
  bluetooth,
  wifiSoftAp,
}

class DiscoveredHardwareBLE {
  final String hardwareId;
  final String modelName;
  final DeviceCategory category;
  final int rssi; // Signal strength dBm
  final String bleUuid;
  final bool isRealHardware;
  final BluetoothDevice? nativeDevice;
  final DeviceProvisioningProfile profile;

  DiscoveredHardwareBLE({
    required this.hardwareId,
    required this.modelName,
    required this.category,
    required this.rssi,
    required this.bleUuid,
    this.isRealHardware = true,
    this.nativeDevice,
    DeviceProvisioningProfile? profile,
  }) : profile = profile ?? DeviceProvisioningCatalog.resolveProfile(rawName: hardwareId);
}

class PairingResult {
  final bool success;
  final String hardwareId;
  final String modelName;
  final String ownerName;
  final String warrantyCode;
  final String warrantyUntil;
  final String errorMessage;
  final bool isOnlineWifi;

  PairingResult({
    required this.success,
    required this.hardwareId,
    required this.modelName,
    required this.ownerName,
    required this.warrantyCode,
    required this.warrantyUntil,
    this.errorMessage = "",
    this.isOnlineWifi = false,
  });
}

class BleProvisioningService {
  static final BleProvisioningService _instance = BleProvisioningService._internal();
  factory BleProvisioningService() => _instance;
  BleProvisioningService._internal();

  /// Dò tìm sóng Bluetooth BLE & Phần cứng thực tế xung quanh (Tự động liên tục & độ nhạy cao)
  Future<List<DiscoveredHardwareBLE>> scanForHardwareDevices({String? targetHardwareId, bool triggerWebBle = false}) async {
    final List<DiscoveredHardwareBLE> discovered = [];

    // 0. Quét sóng Bluetooth Native phần cứng (Dành cho iPhone iOS & Android thực tế)
    if (!kIsWeb) {
      try {
        final results = FlutterBluePlus.lastScanResults;
        for (final r in results) {
            final adv = r.advertisementData;
            final rawName = (r.device.platformName.isNotEmpty ? r.device.platformName : adv.advName).trim();
            final serviceUuids = adv.serviceUuids.map((u) => u.toString().toLowerCase()).toList();

            final matchedProfile = DeviceProvisioningCatalog.resolveProfile(
              rawName: rawName,
              advertisedUuids: serviceUuids,
            );
            final bool isRecognized = matchedProfile.matches(rawName: rawName, advertisedUuids: serviceUuids);
            final bool isTargetMatch = targetHardwareId != null &&
                targetHardwareId.trim().isNotEmpty &&
                (rawName.toLowerCase() == targetHardwareId.trim().toLowerCase() ||
                 r.device.remoteId.str.toLowerCase() == targetHardwareId.trim().toLowerCase());

            if (isRecognized || isTargetMatch || rawName.isNotEmpty) {
              final devId = rawName.isNotEmpty ? rawName : (targetHardwareId?.isNotEmpty == true ? targetHardwareId! : r.device.remoteId.str);
              final exists = discovered.any((d) => d.hardwareId.toLowerCase() == devId.toLowerCase());
              if (!exists) {
                discovered.add(DiscoveredHardwareBLE(
                  hardwareId: devId,
                  modelName: isRecognized
                      ? "${matchedProfile.defaultTitle} ($devId)"
                      : "Thiết Bị BLE ($devId)",
                  category: matchedProfile.category,
                  rssi: r.rssi,
                  bleUuid: matchedProfile.bleServiceUuids.first,
                  isRealHardware: true,
                  nativeDevice: r.device,
                  profile: matchedProfile,
                ));
              }
            }
          }
      } catch (e) {
        debugPrint("Scan native BLE error: $e");
      }
    }

    // 1. Quét phần cứng thực tế qua API sóng trực tiếp từ Gateway / Backend
    try {
      final res = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/devices/discovered-hardware'),
        headers: {'Accept': 'application/json'},
      ).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        if (body['success'] == true && body['devices'] is List) {
          for (final d in body['devices']) {
            final hwId = (d['hardwareId'] ?? d['id'] ?? '').toString();
            if (hwId.isNotEmpty) {
              final exists = discovered.any((item) => item.hardwareId.toLowerCase() == hwId.toLowerCase());
              if (!exists) {
                final profile = DeviceProvisioningCatalog.resolveProfile(rawName: hwId);
                discovered.add(DiscoveredHardwareBLE(
                  hardwareId: hwId,
                  modelName: d['modelName'] ?? '${profile.defaultTitle} ($hwId - Mạng AP)',
                  category: profile.category,
                  rssi: (d['rssi'] as num?)?.toInt() ?? -42,
                  bleUuid: profile.bleServiceUuids.first,
                  isRealHardware: true,
                  profile: profile,
                ));
              }
            }
          }
        }
      }
    } catch (_) {}

    // 2. Nếu người dùng bấm kích hoạt Web Bluetooth trực tiếp trên trình duyệt hỗ trợ
    if (triggerWebBle && isWebBluetoothSupported()) {
      try {
        final webResult = await scanWebBluetooth();
        if (webResult != null && webResult['success'] == true) {
          final foundId = (webResult['hardwareId'] ?? webResult['name'] ?? webResult['id'] ?? '').toString().trim();
          if (foundId.isNotEmpty) {
            final exists = discovered.any((d) => d.hardwareId.toLowerCase() == foundId.toLowerCase());
            if (!exists) {
              final profile = DeviceProvisioningCatalog.resolveProfile(rawName: foundId);
              discovered.add(DiscoveredHardwareBLE(
                hardwareId: foundId,
                modelName: "${profile.defaultTitle} ($foundId - Bluetooth Thực)",
                category: profile.category,
                rssi: -39,
                bleUuid: profile.bleServiceUuids.first,
                isRealHardware: true,
                profile: profile,
              ));
            }
          }
        }
      } catch (_) {}
    }

    // 3. Nếu người dùng nhập mã QR hoặc Hardware ID cụ thể để khớp
    if (targetHardwareId != null && targetHardwareId.trim().isNotEmpty) {
      final q = targetHardwareId.trim();
      final exists = discovered.any((d) => d.hardwareId.toLowerCase() == q.toLowerCase());
      if (!exists) {
        final profile = DeviceProvisioningCatalog.resolveProfile(rawName: q);
        discovered.add(DiscoveredHardwareBLE(
          hardwareId: q,
          modelName: "${profile.defaultTitle} ($q - Khớp Tem ID)",
          category: profile.category,
          rssi: -45,
          bleUuid: profile.bleServiceUuids.first,
          isRealHardware: true,
          profile: profile,
        ));
      }
    }

    return discovered;
  }

  /// Kiểm tra độc lập tính hợp lệ của Wi-Fi trước khi bắt đầu bất kỳ thao tác BLE nào
  Future<String?> checkWifiValidity({required String ssid, required String password}) async {
    final cleanSsid = ssid.trim();
    if (cleanSsid.isEmpty) {
      return "Vui lòng chọn hoặc nhập tên mạng Wi-Fi (SSID).";
    }

    final upperSsid = cleanSsid.toUpperCase();
    if (upperSsid.contains('5G') || upperSsid.contains('5GHZ')) {
      return "Mạng Wi-Fi '$cleanSsid' có dấu hiệu là băng tần 5GHz. Bo mạch phần cứng Austec (ESP32) chỉ hỗ trợ sóng 2.4GHz! Vui lòng chọn mạng Wi-Fi 2.4GHz.";
    }

    if (cleanSsid.contains(',') || cleanSsid.contains('/') || password.contains(',') || password.contains('/')) {
      return "Tên hoặc mật khẩu Wi-Fi không được chứa ký tự phân tách đặc biệt (dấu phẩy ',' hoặc dấu gạch chéo '/') vì sẽ làm sai cú pháp nạp của vi điều khiển ESP32.";
    }

    if (password.isEmpty || password.length < 8 || password.length > 63) {
      return "Mật khẩu Wi-Fi không hợp lệ! Chuẩn bảo mật WPA2 yêu cầu từ 8 đến 63 ký tự.";
    }

    // Kiểm tra kết nối mạng của điện thoại với máy chủ / Gateway
    try {
      final verifyRes = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/wifi/verify'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'ssid': cleanSsid,
          'password': password,
        }),
      ).timeout(const Duration(seconds: 5));

      if (verifyRes.statusCode == 400) {
        try {
          final vData = jsonDecode(verifyRes.body);
          if (vData['error'] != null && vData['error'].toString().contains('Mật khẩu không chính xác')) {
            return vData['error'].toString();
          }
        } catch (_) {}
      }
    } catch (e) {
      debugPrint("Wi-Fi verify API warning (bỏ qua nếu server cloud): $e");
    }

    return null; // Null nghĩa là Wi-Fi hoàn toàn hợp lệ
  }

  /// Pipeline ghép nối & nạp cấu hình thực tế vào ESP32 và CSDL Cloud
  Future<PairingResult> provisionDevice({
    required DiscoveredHardwareBLE targetDevice,
    required String wifiSsid,
    required String wifiPassword,
    String location = "Gara",
    String? address,
    double? lat,
    double? lng,
    PairingMethod method = PairingMethod.bluetooth,
    String? brokerIp,
    int brokerPort = 1883,
    required Function(String stepMessage, double progress) onProgress,
    bool Function()? isCancelled,
  }) async {
    // Lấy thông tin tài khoản đang đăng nhập THỰC TẾ
    final currentUser = AuthService().currentUser;
    final currentUserId = currentUser?.id ?? '00000000-0000-0000-0000-000000000001';
    final currentUserName = (currentUser != null && currentUser.fullName.isNotEmpty)
        ? currentUser.fullName
        : (currentUser?.email.isNotEmpty == true ? currentUser!.email : 'Chủ sở hữu');
    final authToken = AuthService().token ?? 'austec-customer-token';

    if (isCancelled?.call() == true) return _cancelledResult(targetDevice);

    final cleanSsid = wifiSsid.trim();

    // =========================================================================
    // GIAI ĐOẠN 1: KIỂM TRA MẠNG WI-FI TRƯỚC TẤT CẢ CÁC BƯỚC (TRƯỚC KHI BẬT/KẾT NỐI BLE)
    // =========================================================================
    onProgress("Giai đoạn 1/3: Đang kiểm tra tính hợp lệ & kết nối mạng Wi-Fi [$cleanSsid]...", 0.15);
    final wifiValidationError = await checkWifiValidity(ssid: cleanSsid, password: wifiPassword);
    if (wifiValidationError != null) {
      return PairingResult(
        success: false,
        hardwareId: targetDevice.hardwareId,
        modelName: targetDevice.modelName,
        ownerName: "",
        warrantyCode: "",
        warrantyUntil: "",
        errorMessage: wifiValidationError,
      );
    }

    onProgress("Mạng Wi-Fi [$cleanSsid] hợp lệ! Đang chuẩn bị kết nối BLE...", 0.30);
    await Future.delayed(const Duration(milliseconds: 650));

    if (isCancelled?.call() == true) return _cancelledResult(targetDevice);

    // Sử dụng địa chỉ Broker thực tế từ cấu hình/backend (không dùng IP fallback cố định)
    final String targetBrokerIp = (brokerIp != null && brokerIp.trim().isNotEmpty)
        ? brokerIp.trim()
        : (Uri.tryParse(ApiConfig.baseUrl)?.host ?? '');

    final profile = targetDevice.profile;
    final inputData = ProvisioningInputData(
      ssid: cleanSsid,
      password: wifiPassword,
      userId: currentUserId,
      brokerIp: targetBrokerIp,
      brokerPort: brokerPort,
    );
    final String payloadString = profile.buildBlePayload(inputData);

    // =========================================================================
    // GIAI ĐOẠN 2: KẾT NỐI BLUETOOTH BLE VỚI BO MẠCH PHẦN CỨNG THỰC TẾ
    // =========================================================================
    if (method == PairingMethod.bluetooth) {
      onProgress("Giai đoạn 2/3: Đang kết nối Bluetooth BLE với ${profile.defaultTitle} [${targetDevice.hardwareId}]...", 0.38);
      
      bool bleSuccess = false;
      bool isWifiCheckFailed = false;
      String wifiErrorMessage = "Mật khẩu Wi-Fi không chính xác hoặc bo mạch không kết nối được tới router này!";
      String? bleErrorMessage;

      if (kIsWeb) {
        try {
          final webRes = await sendWebBluetoothOnboard(
            payloadString,
            serviceUuid: profile.bleServiceUuids.first,
            rxUuid: profile.bleRxCharUuid,
          );
          if (webRes != null) {
            if (webRes['isWrongWifi'] == true || (webRes['success'] == false && webRes['error']?.toString().contains('Mật khẩu') == true)) {
              isWifiCheckFailed = true;
              if (webRes['error'] != null) {
                wifiErrorMessage = webRes['error'].toString();
              }
            } else if (webRes['success'] == true) {
              bleSuccess = true;
            }
          }
        } catch (_) {}
      } else {
        try {
          // 1. Dừng quét BLE trước khi kết nối (Bắt buộc trên iOS CoreBluetooth để không bị đơ)
          try {
            if (FlutterBluePlus.isScanningNow) {
              await FlutterBluePlus.stopScan();
            }
          } catch (_) {}

          // Native FlutterBluePlus trên Android / iOS
          BluetoothDevice? devToConnect = targetDevice.nativeDevice;

          // Nếu devToConnect chưa có hoặc bị mất: Tìm kiếm trong lastScanResults
          if (devToConnect == null) {
            final scanResults = FlutterBluePlus.lastScanResults;
            final targetUpper = targetDevice.hardwareId.toUpperCase();
            final normTargetUuids = profile.bleServiceUuids.map((u) => u.replaceAll('-', '').toUpperCase()).toList();

            final match = scanResults.cast<ScanResult?>().firstWhere(
              (r) {
                if (r == null) return false;
                final pName = r.device.platformName.toUpperCase();
                final advName = r.advertisementData.advName.toUpperCase();
                final rId = r.device.remoteId.str.toUpperCase();
                final advUuids = r.advertisementData.serviceUuids.map((u) => u.toString().replaceAll('-', '').toUpperCase()).toList();

                return pName == targetUpper ||
                       advName == targetUpper ||
                       (targetUpper.isNotEmpty && (pName.contains(targetUpper) || targetUpper.contains(pName))) ||
                       rId == targetUpper ||
                       advUuids.any((adv) => normTargetUuids.any((t) => adv.contains(t)));
              },
              orElse: () => null,
            );

            if (match != null) {
              devToConnect = match.device;
            }
          }

          // Nếu vẫn null (do scan đã dừng từ trước khi user nhập form): Chạy quét nhanh 2.5s để bắt lại thiết bị
          if (devToConnect == null) {
            onProgress("Đang định vị lại sóng BLE của ${targetDevice.modelName}...", 0.40);
            try {
              await FlutterBluePlus.startScan(timeout: const Duration(seconds: 3));
              await Future.delayed(const Duration(milliseconds: 2500));
              try { await FlutterBluePlus.stopScan(); } catch (_) {}

              final results = FlutterBluePlus.lastScanResults;
              final targetUpper = targetDevice.hardwareId.toUpperCase();
              final normTargetUuids = profile.bleServiceUuids.map((u) => u.replaceAll('-', '').toUpperCase()).toList();

              final match = results.cast<ScanResult?>().firstWhere(
                (r) {
                  if (r == null) return false;
                  final pName = r.device.platformName.toUpperCase();
                  final advName = r.advertisementData.advName.toUpperCase();
                  final rId = r.device.remoteId.str.toUpperCase();
                  final advUuids = r.advertisementData.serviceUuids.map((u) => u.toString().replaceAll('-', '').toUpperCase()).toList();

                  return pName == targetUpper ||
                         advName == targetUpper ||
                         (targetUpper.isNotEmpty && (pName.contains(targetUpper) || targetUpper.contains(pName))) ||
                         rId == targetUpper ||
                         advUuids.any((adv) => normTargetUuids.any((t) => adv.contains(t)));
                },
                orElse: () => null,
              );
              if (match != null) {
                devToConnect = match.device;
              }
            } catch (_) {}
          }

          if (devToConnect == null) {
            bleErrorMessage = "Không tìm thấy sóng Bluetooth của thiết bị [${targetDevice.hardwareId}]. Hãy đảm bảo thiết bị đang bật nguồn.";
          } else {
            onProgress("Đang kết nối Bluetooth tới [${targetDevice.hardwareId}]...", 0.42);

            // Kết nối Bluetooth
            if (!devToConnect.isConnected) {
              await devToConnect.connect(
                license: License.nonprofit,
                timeout: const Duration(seconds: 8),
              ).timeout(const Duration(seconds: 9));
            }

            // Tăng MTU lên 512 bytes (Tối quan trọng trên Android để không bị cắt bớt chuỗi 80+ bytes)
            try {
              await devToConnect.requestMtu(512).timeout(const Duration(seconds: 2));
            } catch (_) {}
            await Future.delayed(const Duration(milliseconds: 250));

            // Khám phá toàn bộ Services
            final services = await devToConnect.discoverServices().timeout(const Duration(seconds: 7));
            if (services.isEmpty) {
              bleErrorMessage = "Không đọc được dịch vụ (Services) từ thiết bị BLE.";
            } else {
              final normRxChar = profile.bleRxCharUuid.replaceAll('-', '').toUpperCase();
              final normTxChar = (profile.bleTxCharUuid ?? '').replaceAll('-', '').toUpperCase();

              BluetoothCharacteristic? rxChar;
              BluetoothCharacteristic? txChar;

              // Tìm trên TOÀN BỘ các services (tránh bị kẹt ở Generic Access Service 0x1800)
              for (final s in services) {
                for (final c in s.characteristics) {
                  final cUuid = c.uuid.toString().replaceAll('-', '').toUpperCase();
                  if (cUuid.contains(normRxChar) ||
                      cUuid.contains("6E400002") ||
                      cUuid.contains("BEA5C122") ||
                      cUuid.contains("BEA5A000")) {
                    rxChar = c;
                  }
                  if ((normTxChar.isNotEmpty && cUuid.contains(normTxChar)) ||
                      cUuid.contains("6E400003") ||
                      (cUuid.contains("BEA5C122") && c.properties.notify)) {
                    txChar = c;
                  }
                }
              }

              // Dự phòng: Tìm bất kỳ characteristic nào có quyền Write
              if (rxChar == null) {
                for (final s in services) {
                  for (final c in s.characteristics) {
                    if (c.properties.write || c.properties.writeWithoutResponse) {
                      rxChar = c;
                      break;
                    }
                  }
                  if (rxChar != null) break;
                }
              }

              if (rxChar == null) {
                bleErrorMessage = "Không tìm thấy cổng ghi dữ liệu (RX Characteristic) trên bo mạch.";
              } else {
                final notifyChar = (txChar != null && txChar.properties.notify)
                    ? txChar
                    : (rxChar.properties.notify
                        ? rxChar
                        : null);

                StreamSubscription? notifySub;
                Completer<bool> wifiCheckCompleter = Completer();

                if (notifyChar != null && notifyChar.properties.notify) {
                  try {
                    await notifyChar.setNotifyValue(true);
                    notifySub = notifyChar.lastValueStream.listen((val) {
                      final str = utf8.decode(val, allowMalformed: true);
                      debugPrint("BLE Notification from ESP32: $str");
                      if (str.contains("WIFI_FAIL") || str.contains("FAIL")) {
                        isWifiCheckFailed = true;
                        if (!wifiCheckCompleter.isCompleted) wifiCheckCompleter.complete(false);
                      } else if (str.contains("WIFI_OK") ||
                                 str.contains("PAIRED_OK") ||
                                 str.contains("OK") ||
                                 str.contains("SUCCESS") ||
                                 (targetDevice.hardwareId.isNotEmpty && str.toUpperCase().contains(targetDevice.hardwareId.toUpperCase()))) {
                        if (!wifiCheckCompleter.isCompleted) wifiCheckCompleter.complete(true);
                      }
                    });
                  } catch (e) {
                    debugPrint("Setup BLE notify error: $e");
                  }
                }

                onProgress("Đang nạp thông số Wi-Fi vào bo mạch phần cứng...", 0.45);
                final bytes = utf8.encode(payloadString);

                try {
                  if (rxChar.properties.write) {
                    // Ưu tiên Write With Response (hỗ trợ Long Write chuẩn trên iOS & Android)
                    await rxChar.write(
                      bytes,
                      withoutResponse: false,
                      allowLongWrite: true,
                    ).timeout(const Duration(seconds: 5));
                  } else if (rxChar.properties.writeWithoutResponse) {
                    // Nếu chỉ có writeWithoutResponse: Tuyệt đối KHÔNG truyền allowLongWrite: true (tránh lỗi iOS/Android)
                    await rxChar.write(
                      bytes,
                      withoutResponse: true,
                      allowLongWrite: false,
                    ).timeout(const Duration(seconds: 5));
                  } else {
                    // Mặc định gọi hàm write cơ bản
                    await rxChar.write(bytes).timeout(const Duration(seconds: 5));
                  }
                } catch (writeErr) {
                  debugPrint("Lần 1 ghi lỗi ($writeErr), thử lại fallback an toàn...");
                  try {
                    await rxChar.write(bytes).timeout(const Duration(seconds: 4));
                  } catch (err2) {
                    debugPrint("Fallback write cũng lỗi: $err2");
                    rethrow;
                  }
                }

                // Chờ phản hồi từ bo mạch (tối đa 3 giây)
                final timer = Timer(const Duration(milliseconds: 3000), () {
                  if (!wifiCheckCompleter.isCompleted) wifiCheckCompleter.complete(true);
                });
                await wifiCheckCompleter.future;
                timer.cancel();
                await notifySub?.cancel();

                if (!isWifiCheckFailed) {
                  bleSuccess = true;
                }

                await Future.delayed(const Duration(milliseconds: 300));
                try {
                  await devToConnect.disconnect();
                } catch (_) {}
              }
            }
          }
        } catch (e) {
          bleErrorMessage = "Lỗi kết nối Bluetooth: $e";
          debugPrint("BLE native provision error: $e");
        }
      }

      if (isCancelled?.call() == true) return _cancelledResult(targetDevice);

      // Nếu bo mạch báo lỗi mật khẩu Wi-Fi không chính xác: Dừng ngay lập tức, không lưu CSDL!
      if (isWifiCheckFailed) {
        return PairingResult(
          success: false,
          hardwareId: targetDevice.hardwareId,
          modelName: targetDevice.modelName,
          ownerName: "",
          warrantyCode: "",
          warrantyUntil: "",
          errorMessage: wifiErrorMessage,
        );
      }

      // Nếu truyền BLE không thành công: Dừng ngay lập tức, không lưu CSDL!
      if (!bleSuccess) {
        return PairingResult(
          success: false,
          hardwareId: targetDevice.hardwareId,
          modelName: targetDevice.modelName,
          ownerName: "",
          warrantyCode: "",
          warrantyUntil: "",
          errorMessage: bleErrorMessage ?? "Không thể truyền dữ liệu cấu hình sang bo mạch qua BLE. Vui lòng thử lại gần thiết bị hơn.",
        );
      }

      onProgress("Bo mạch đã tiếp nhận cấu hình mạng! Đang khởi động lại...", 0.50);
      await Future.delayed(const Duration(milliseconds: 500));
    } else {
      // WiFi SoftAP: Bo mạch phát Access Point tại 192.168.4.1
      onProgress("Đang gửi thông số qua Wi-Fi SoftAP tới bo mạch (192.168.4.1)...", 0.35);
      bool apSuccess = false;
      try {
        final apUri = profile.buildSoftApUri(inputData, apHost: '192.168.4.1');
        http.Response apRes;
        if (targetDevice.category == DeviceCategory.camera || profile.defaultModelCode.contains('CAM')) {
          // Camera OV2640 lắng nghe POST /save với form body (ssid, pass, mqtt)
          apRes = await http.post(
            apUri,
            body: {
              'ssid': inputData.ssid,
              'pass': inputData.password,
              'mqtt': targetBrokerIp,
            },
          ).timeout(const Duration(seconds: 4));
        } else {
          // Cửa cuốn & Ổ cắm Austec lắng nghe GET /?SSID=...
          apRes = await http.get(apUri).timeout(const Duration(seconds: 4));
        }
        if (apRes.statusCode == 200) {
          apSuccess = true;
        }
      } catch (_) {}

      if (isCancelled?.call() == true) return _cancelledResult(targetDevice);

      // Nếu truyền SoftAP thất bại: Dừng ngay lập tức, không lưu CSDL!
      if (!apSuccess) {
        return PairingResult(
          success: false,
          hardwareId: targetDevice.hardwareId,
          modelName: targetDevice.modelName,
          ownerName: "",
          warrantyCode: "",
          warrantyUntil: "",
          errorMessage: "Không thể gửi dữ liệu cấu hình tới bo mạch qua Wi-Fi SoftAP (192.168.4.1). Vui lòng kiểm tra kết nối mạng của bạn.",
        );
      }

      onProgress("Bo mạch đã nhận cấu hình qua Wi-Fi SoftAP! Đang khởi động lại...", 0.50);
      await Future.delayed(const Duration(milliseconds: 500));
    }

    if (isCancelled?.call() == true) return _cancelledResult(targetDevice);

    // =========================================================================
    // GIAI ĐOẠN 3: KIỂM TRA BO MẠCH KHỞI ĐỘNG LẠI & KẾT NỐI VÀO WI-FI / MQTT
    // =========================================================================
    bool hardwareIsOnline = false;
    const int onlineCheckAttempts = 6;
    for (int i = 0; i < onlineCheckAttempts; i++) {
      if (isCancelled?.call() == true) return _cancelledResult(targetDevice);

      final currentCheckProgress = 0.65 + ((i + 1) / onlineCheckAttempts) * 0.22;
      onProgress(
        "Đang chờ bo mạch kết nối Wi-Fi & MQTT (lần ${i + 1}/$onlineCheckAttempts)...",
        double.parse(currentCheckProgress.toStringAsFixed(2)),
      );

      await Future.delayed(const Duration(milliseconds: 1200));

      try {
        final checkUri = Uri.parse('${ApiConfig.baseUrl}/api/devices/hardware-online-check?hardwareId=${targetDevice.hardwareId}');
        final checkRes = await http.get(checkUri).timeout(const Duration(milliseconds: 1500));
        if (checkRes.statusCode == 200) {
          final body = jsonDecode(checkRes.body);
          if (body['success'] == true && body['isOnline'] == true) {
            hardwareIsOnline = true;
            break;
          }
        }
      } catch (_) {}
    }

    if (isCancelled?.call() == true) return _cancelledResult(targetDevice);

    // NẾU BO MẠCH KHÔNG KẾT NỐI ĐƯỢC VÀO WI-FI / MQTT:
    // Tuyệt đối KHÔNG LƯU vào CSDL Backend! Dừng ngay và báo lỗi chính xác!
    if (!hardwareIsOnline) {
      return PairingResult(
        success: false,
        hardwareId: targetDevice.hardwareId,
        modelName: targetDevice.modelName,
        ownerName: "",
        warrantyCode: "",
        warrantyUntil: "",
        errorMessage: "Mật khẩu Wi-Fi không chính xác hoặc bo mạch không kết nối được tới Router [$cleanSsid] / máy chủ MQTT. Vui lòng kiểm tra lại mật khẩu (chỉ hỗ trợ băng tần 2.4GHz) và khoảng cách tới Router.",
      );
    }

    // =========================================================================
    // GIAI ĐOẠN 4: THIẾT BỊ ĐÃ ONLINE - LƯU VÀO CSDL MÁY CHỦ & KÍCH HOẠT BẢO HÀNH
    // =========================================================================
    onProgress("Bo mạch đã kết nối trực tuyến! Đang kích hoạt quyền sở hữu...", 0.90);
    String warrantyUntil = "2028-10-23";
    String warrantyCode = "EW-${targetDevice.hardwareId.replaceAll('-', '').toUpperCase()}-24M";
    String confirmedOwner = currentUserName;
    dynamic pairResponseData;

    try {
      final finalAddress = (address != null && address.trim().isNotEmpty) ? address.trim() : location;
      final finalLat = lat ?? 21.028511;
      final finalLng = lng ?? 105.854167;

      final res = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/devices/pair'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({
          'hardwareId': targetDevice.hardwareId,
          'customName': targetDevice.modelName,
          'wifiSsid': wifiSsid,
          'location': location,
          'addressDisplay': finalAddress,
          'address': finalAddress,
          'lat': finalLat,
          'lng': finalLng,
          'latitude': finalLat,
          'longitude': finalLng,
        }),
      ).timeout(const Duration(seconds: 7));

      if (res.statusCode != 200) {
        String errorMsg = "Không thể ghép nối thiết bị lên hệ thống (Lỗi HTTP ${res.statusCode}).";
        try {
          final errBody = jsonDecode(res.body);
          if (errBody['error'] != null) {
            errorMsg = errBody['error'].toString();
          }
        } catch (_) {}
        return PairingResult(
          success: false,
          hardwareId: targetDevice.hardwareId,
          modelName: targetDevice.modelName,
          ownerName: "",
          warrantyCode: "",
          warrantyUntil: "",
          errorMessage: errorMsg,
        );
      }

      final data = jsonDecode(res.body);
      pairResponseData = data;
      if (data['success'] != true) {
        return PairingResult(
          success: false,
          hardwareId: targetDevice.hardwareId,
          modelName: targetDevice.modelName,
          ownerName: "",
          warrantyCode: "",
          warrantyUntil: "",
          errorMessage: data['error'] ?? "Ghép nối thất bại từ máy chủ.",
        );
      }

      if (data['device'] != null && data['device']['warrantyUntil'] != null) {
        warrantyUntil = data['device']['warrantyUntil'].toString();
      }
      if (data['device'] != null && data['device']['warrantyCode'] != null) {
        warrantyCode = data['device']['warrantyCode'].toString();
      }
    } catch (e) {
      return PairingResult(
        success: false,
        hardwareId: targetDevice.hardwareId,
        modelName: targetDevice.modelName,
        ownerName: "",
        warrantyCode: "",
        warrantyUntil: "",
        errorMessage: "Lỗi kết nối tới máy chủ khi kích hoạt thiết bị: $e",
      );
    }

    if (isCancelled?.call() == true) return _cancelledResult(targetDevice);

    await IoTGatewayClient().fetchDevicesFromBackend(token: authToken);

    final String serverHwId = (pairResponseData != null && pairResponseData['hardwareId'] != null)
        ? pairResponseData['hardwareId'].toString()
        : targetDevice.hardwareId;

    DeviceItem? syncedDevice = IoTGatewayClient().findByHardwareId(serverHwId) ??
                               IoTGatewayClient().findByHardwareId(targetDevice.hardwareId);

    if (syncedDevice == null) {
      final finalAddress = (address != null && address.trim().isNotEmpty) ? address.trim() : location;
      final newDev = DeviceItem(
        id: serverHwId,
        hardwareId: serverHwId,
        name: targetDevice.modelName,
        category: targetDevice.profile.category,
        modelName: targetDevice.profile.defaultTitle,
        isOnline: true,
        warrantyCode: warrantyCode,
        warrantyUntil: warrantyUntil,
        ownerName: confirmedOwner,
        roomName: finalAddress,
        installationAddress: finalAddress,
        locationLat: lat ?? 21.028511,
        locationLng: lng ?? 105.854167,
      );
      IoTGatewayClient().addDevice(newDev);
      syncedDevice = newDev;
    }

    onProgress("Ghép nối thành công & Đã kết nối Wi-Fi trực tuyến!", 1.0);

    return PairingResult(
      success: true,
      hardwareId: serverHwId,
      modelName: syncedDevice.name,
      ownerName: confirmedOwner,
      warrantyCode: warrantyCode,
      warrantyUntil: warrantyUntil,
      isOnlineWifi: true,
    );
  }

  PairingResult _cancelledResult(DiscoveredHardwareBLE dev) {
    return PairingResult(
      success: false,
      hardwareId: dev.hardwareId,
      modelName: dev.modelName,
      ownerName: "",
      warrantyCode: "",
      warrantyUntil: "",
      errorMessage: "Quá trình ghép nối đã được hủy theo yêu cầu.",
    );
  }
}
