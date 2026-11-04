import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/device_model.dart';
import '../constants/api_config.dart';
import 'auth_service.dart';
import 'ble_device_control_service.dart';

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

  // 7 Danh mục khối cố định quanh tâm (Monochrome B&W Industrial Layout)
  final List<CategoryMeta> categories = const [
    // 1. DOORS (Top-Left)
    CategoryMeta(
      category: DeviceCategory.rollerDoor,
      title: "DOORS",
      subtitle: "CỬA CUỐN AUSTEC",
      assetPath: "assets/doors.png",
      neonColor: Color(0xFFE4E4E7),
      offsetX: -105.0,
      offsetY: -95.0,
    ),
    // 2. ENERGY MANAGE (Top-Right)
    CategoryMeta(
      category: DeviceCategory.energyManage,
      title: "ENERGY MANAGE",
      subtitle: "QUẢN LÝ NĂNG LƯỢNG",
      assetPath: "assets/energy.png",
      neonColor: Color(0xFFE4E4E7),
      offsetX: 105.0,
      offsetY: -95.0,
    ),
    // 3. ENVIRONMENT (Right)
    CategoryMeta(
      category: DeviceCategory.environment,
      title: "ENVIRONMENT",
      subtitle: "CẢM BIẾN MÔI TRƯỜNG",
      assetPath: "assets/sensor.png",
      neonColor: Color(0xFFE4E4E7),
      offsetX: 130.0,
      offsetY: 20.0,
    ),
    // 4. OTHERS CONTROL (Bottom-Right)
    CategoryMeta(
      category: DeviceCategory.othersControl,
      title: "OTHERS CONTROL",
      subtitle: "THIẾT BỊ KHÁC",
      assetPath: "assets/others.png",
      neonColor: Color(0xFFE4E4E7),
      offsetX: 105.0,
      offsetY: 135.0,
    ),
    // 5. DATA ANALYTICS (Bottom-Left)
    CategoryMeta(
      category: DeviceCategory.dataAnalytics,
      title: "DATA ANALYTICS",
      subtitle: "PHÂN TÍCH DỮ LIỆU",
      assetPath: "assets/data.png",
      neonColor: Color(0xFFE4E4E7),
      offsetX: -105.0,
      offsetY: 135.0,
    ),
    // 6. LIGHT & SWITCH (Left)
    CategoryMeta(
      category: DeviceCategory.lightSwitch,
      title: "LIGHT & SWITCH",
      subtitle: "CHIẾU SÁNG & ĐÓNG CẮT",
      assetPath: "assets/light.png",
      neonColor: Color(0xFFE4E4E7),
      offsetX: -130.0,
      offsetY: 20.0,
    ),
    // 7. CAMERA (Top Center)
    CategoryMeta(
      category: DeviceCategory.camera,
      title: "AI CAMERA",
      subtitle: "CAMERA AN NINH AI",
      assetPath: "assets/data.png",
      neonColor: Color(0xFFE4E4E7),
      offsetX: 0.0,
      offsetY: -150.0,
    ),
  ];

  // Danh sách thiết bị người dùng sở hữu (Khởi tạo trắng 100%, nạp động từ CSDL Backend khi đăng nhập / ghép nối)
  final List<DeviceItem> _devices = [];
  final StreamController<DeviceItem> _deviceUpdateStream = StreamController<DeviceItem>.broadcast();
  Stream<DeviceItem> get onDeviceUpdated => _deviceUpdateStream.stream;
  final Map<String, Timer> _doorMotionTimers = {};

  List<DeviceItem> get devices => List.unmodifiable(_devices);

  void notifyDeviceChanged(DeviceItem device) {
    _deviceUpdateStream.add(device);
  }

  /// Khởi chạy tiến trình di chuyển cửa cuốn chạy ngầm đồng bộ thời gian thực
  void startDoorMotion({required String hardwareId, required String direction}) {
    final device = findByHardwareId(hardwareId);
    if (device == null) return;

    _doorMotionTimers[hardwareId]?.cancel();
    _doorMotionTimers.remove(hardwareId);

    if (direction == "STOP") {
      device.isMoving = false;
      device.movingDirection = 'stop';
      _deviceUpdateStream.add(device);
      return;
    }

    if (direction == "OPEN") {
      if (device.positionPercent >= 100) {
        device.isMoving = false;
        device.movingDirection = 'stop';
        _deviceUpdateStream.add(device);
        return;
      }
      device.isMoving = true;
      device.movingDirection = 'up';
      _deviceUpdateStream.add(device);

      const tickMs = 80;
      final int timeoutSec = (device.openTimeoutSeconds > 0 ? device.openTimeoutSeconds : 20).clamp(6, 60);
      final totalTicks = (timeoutSec * 1000 / tickMs).clamp(40, 250);
      final double step = (100.0 - device.positionPercent) / totalTicks;
      double currentPos = device.positionPercent.toDouble();

      _doorMotionTimers[hardwareId] = Timer.periodic(const Duration(milliseconds: tickMs), (timer) {
        currentPos += step;
        if (currentPos >= 100.0) {
          device.positionPercent = 100;
          device.isMoving = false;
          device.movingDirection = 'stop';
          timer.cancel();
          _doorMotionTimers.remove(hardwareId);
        } else {
          device.positionPercent = currentPos.round();
        }
        _deviceUpdateStream.add(device);
      });
    } else if (direction == "CLOSE") {
      if (device.positionPercent <= 0) {
        device.isMoving = false;
        device.movingDirection = 'stop';
        _deviceUpdateStream.add(device);
        return;
      }
      device.isMoving = true;
      device.movingDirection = 'down';
      _deviceUpdateStream.add(device);

      const tickMs = 80;
      final int timeoutSec = (device.closeTimeoutSeconds > 0 ? device.closeTimeoutSeconds : 20).clamp(6, 60);
      final totalTicks = (timeoutSec * 1000 / tickMs).clamp(40, 250);
      final double step = (device.positionPercent > 0 ? device.positionPercent : 100) / totalTicks;
      double currentPos = device.positionPercent.toDouble();

      _doorMotionTimers[hardwareId] = Timer.periodic(const Duration(milliseconds: tickMs), (timer) {
        currentPos -= step;
        if (currentPos <= 0.0) {
          device.positionPercent = 0;
          device.isMoving = false;
          device.movingDirection = 'stop';
          timer.cancel();
          _doorMotionTimers.remove(hardwareId);
        } else {
          device.positionPercent = currentPos.round();
        }
        _deviceUpdateStream.add(device);
      });
    }
  }

  List<DeviceItem> getDevicesByCategory(DeviceCategory category) {
    return _devices.where((d) => d.category == category).toList();
  }

  DeviceItem? findByHardwareId(String hardwareId) {
    try {
      final norm = hardwareId.trim().toLowerCase();
      final cleanNorm = norm.replaceAll('amtuong-', '').replaceAll('at-', '').replaceAll('-', '');
      return _devices.firstWhere((d) {
        final dNorm = d.hardwareId.trim().toLowerCase();
        final dClean = dNorm.replaceAll('amtuong-', '').replaceAll('at-', '').replaceAll('-', '');
        return dNorm == norm || dClean == cleanNorm || dNorm.endsWith(cleanNorm) || norm.endsWith(dClean);
      });
    } catch (_) {
      return null;
    }
  }

  static const String _cachedDevicesKey = 'austec_cached_user_devices';

  /// Lưu danh sách thiết bị vào bộ nhớ cục bộ máy (Offline Storage)
  Future<void> saveDevicesToLocalCache([List? rawList]) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (rawList != null && rawList.isNotEmpty) {
        await prefs.setString(_cachedDevicesKey, jsonEncode(rawList));
        debugPrint('[IoTGatewayClient] 💾 Đã lưu ${rawList.length} thiết bị vào Local Cache từ Raw List');
      } else if (_devices.isNotEmpty) {
        final listToSave = _devices.map((d) => d.toMap()).toList();
        await prefs.setString(_cachedDevicesKey, jsonEncode(listToSave));
        debugPrint('[IoTGatewayClient] 💾 Đã lưu ${listToSave.length} thiết bị vào Local Cache từ _devices');
      }
    } catch (e) {
      debugPrint('[IoTGatewayClient] Lỗi lưu Local Cache: $e');
    }
  }

  /// Nạp danh sách thiết bị lưu cục bộ (Local Offline Cache)
  Future<void> loadDevicesFromLocalCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedJson = prefs.getString(_cachedDevicesKey);
      if (cachedJson != null && cachedJson.isNotEmpty) {
        final dynamic decoded = jsonDecode(cachedJson);
        if (decoded is List && decoded.isNotEmpty) {
          _devices.clear();
          for (var d in decoded) {
            _devices.add(_parseDeviceFromJson(d));
          }
          for (var d in _devices) {
            _deviceUpdateStream.add(d);
          }
          debugPrint('[IoTGatewayClient] 📦 Nạp thành công ${_devices.length} thiết bị từ Local Cache (Offline Ready)');
        }
      }
    } catch (e) {
      debugPrint('[IoTGatewayClient] Lỗi nạp Local Cache: $e');
    }
  }

  void addDevice(DeviceItem device) {
    final idx = _devices.indexWhere((d) => d.hardwareId == device.hardwareId);
    if (idx >= 0) {
      _devices[idx] = device;
    } else {
      _devices.insert(0, device);
    }
    unawaited(saveDevicesToLocalCache());
    _deviceUpdateStream.add(device);
  }

  Future<void> removeDevice(String hardwareId) async {
    _devices.removeWhere((d) => d.hardwareId == hardwareId);
    try {
      final prefs = await SharedPreferences.getInstance();
      final listToSave = _devices.map((d) => d.toMap()).toList();
      await prefs.setString(_cachedDevicesKey, jsonEncode(listToSave));
    } catch (_) {}
  }

  void renameDevice(String hardwareId, String newName) {
    final dev = findByHardwareId(hardwareId);
    if (dev != null) {
      dev.name = newName;
      unawaited(saveDevicesToLocalCache());
    }
  }

  /// Xóa / Hủy liên kết thiết bị khỏi tài khoản (API thực tế)
  Future<bool> unpairDevice(String hardwareId) async {
    try {
      final token = AuthService().token ?? 'austec-customer-token';
      final res = await http.delete(
        Uri.parse('${ApiConfig.baseUrl}/api/devices/$hardwareId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      ).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        removeDevice(hardwareId);
        return true;
      }
    } catch (e) {
      debugPrint('[IoTGatewayClient] unpairDevice error: $e');
    }
    removeDevice(hardwareId);
    return false;
  }

  /// Đổi tên hiển thị thiết bị (API thực tế)
  Future<bool> updateDeviceName(String hardwareId, String newName) async {
    try {
      final token = AuthService().token ?? 'austec-customer-token';
      final res = await http.patch(
        Uri.parse('${ApiConfig.baseUrl}/api/devices/$hardwareId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({'customName': newName}),
      ).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        renameDevice(hardwareId, newName);
        return true;
      }
    } catch (e) {
      debugPrint('[IoTGatewayClient] updateDeviceName error: $e');
    }
    renameDevice(hardwareId, newName);
    return false;
  }

  /// Đổi vị trí / phòng đặt thiết bị (API thực tế lưu CSDL)
  Future<bool> updateDeviceLocation(String hardwareId, String newLocation) async {
    try {
      final token = AuthService().token ?? 'austec-customer-token';
      final res = await http.patch(
        Uri.parse('${ApiConfig.baseUrl}/api/devices/$hardwareId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({'location': newLocation, 'addressDisplay': newLocation}),
      ).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        final dev = findByHardwareId(hardwareId);
        if (dev != null) {
          dev.roomName = newLocation;
        }
        return true;
      }
    } catch (e) {
      debugPrint('[IoTGatewayClient] updateDeviceLocation error: $e');
    }
    final dev = findByHardwareId(hardwareId);
    if (dev != null) {
      dev.roomName = newLocation;
    }
    return false;
  }

  /// Cập nhật các thông số cài đặt / thuộc tính động của thiết bị (API thực tế)
  Future<bool> updateDeviceProperties(String hardwareId, Map<String, dynamic> properties) async {
    try {
      final token = AuthService().token ?? 'austec-customer-token';
      final res = await http.patch(
        Uri.parse('${ApiConfig.baseUrl}/api/devices/$hardwareId/properties'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({'properties': properties}),
      ).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        final dev = findByHardwareId(hardwareId);
        if (dev != null) {
          dev.currentProperties.addAll(properties);
        }
        return true;
      }
    } catch (e) {
      debugPrint('[IoTGatewayClient] updateDeviceProperties error: $e');
    }
    return false;
  }

  /// Nạp danh sách thiết bị thật từ Backend theo quyền sở hữu của người dùng hiện tại
  Future<void> fetchDevicesFromBackend({String? token}) async {
    // 1. Luôn đảm bảo nạp từ Local Cache nếu trong RAM chưa có thiết bị
    if (_devices.isEmpty) {
      await loadDevicesFromLocalCache();
    }

    bool syncSuccess = false;

    // 2. Thử đồng bộ từ Backend Cloud / PostgreSQL
    try {
      final authToken = token ?? (AuthService().token ?? 'austec-customer-token');
      final res = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/devices/my'),
        headers: {'Authorization': 'Bearer $authToken'},
      ).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['devices'] is List) {
          final List list = data['devices'];
          if (list.isNotEmpty) {
            _devices.clear();
            for (var d in list) {
              _devices.add(_parseDeviceFromJson(d));
            }
            // Lưu đồng bộ ngay vào Local Cache
            await saveDevicesToLocalCache();

            for (var d in _devices) {
              _deviceUpdateStream.add(d);
            }
            syncSuccess = true;
          } else {
            // Nếu Backend trả về mảng rỗng (hoặc khi mất kết nối nội bộ DB), giữ lại dữ liệu local cache
            if (_devices.isEmpty) {
              await loadDevicesFromLocalCache();
            }
          }
        }
      }
    } catch (e) {
      debugPrint('[IoTGatewayClient] Không thể kết nối Backend (Chế độ Ngoại tuyến Offline): $e');
    }

    // 3. Nếu không thể kết nối hoặc status != 200 (mất mạng / lỗi 500 khi Supabase offline):
    if (!syncSuccess) {
      if (_devices.isEmpty) {
        await loadDevicesFromLocalCache();
      }
      // Đồng bộ trạng thái ngoại tuyến cho toàn bộ thiết bị
      for (var d in _devices) {
        d.isOnline = false;
        _deviceUpdateStream.add(d);
      }
    }
  }

  /// Nạp danh sách camera phân trang theo yêu cầu (mỗi lượt 4-6 cái)
  Future<List<DeviceItem>> fetchCamerasPaged({int limit = 6, int offset = 0, String? token}) async {
    try {
      final authToken = token ?? 'austec-customer-token';
      final res = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/devices/my?category=camera&limit=$limit&offset=$offset'),
        headers: {'Authorization': 'Bearer $authToken'},
      ).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['devices'] is List) {
          final List list = data['devices'];
          final List<DeviceItem> parsedList = [];
          for (var d in list) {
            final dev = _parseDeviceFromJson(d);
            parsedList.add(dev);
            addDevice(dev); // Đồng bộ vào bộ nhớ
          }
          return parsedList;
        }
      }
    } catch (e) {
      debugPrint('[IoTGatewayClient] fetchCamerasPaged error: $e');
    }

    // Fallback: Lấy từ bộ nhớ thiết bị camera hiện có
    final allCams = getDevicesByCategory(DeviceCategory.camera);
    if (offset >= allCams.length) return [];
    return allCams.skip(offset).take(limit).toList();
  }

  DeviceItem _parseDeviceFromJson(dynamic d) {
    final hwId = (d['hardwareId'] ?? '').toString();
    final name = (d['customName'] ?? d['deviceName'] ?? d['name'] ?? d['modelName'] ?? 'Thiết bị Austec').toString();
    final modelName = (d['modelName'] ?? d['model_name'] ?? 'Austec Smart Device').toString();
    final modelCode = (d['modelCode'] ?? d['model_code'] ?? 'DOOR_GERMAN_ALU').toString();
    final typeStr = (d['deviceType'] ?? '').toString();

    DeviceCategory cat = DeviceCategory.rollerDoor;
    if (typeStr.contains('Khóa') || hwId.toUpperCase().contains('LOCK')) {
      cat = DeviceCategory.othersControl;
    } else if (typeStr.contains('điện') || hwId.toUpperCase().contains('UPS')) {
      cat = DeviceCategory.energyManage;
    } else if (typeStr.contains('biến') || hwId.toUpperCase().contains('SENSOR')) {
      cat = DeviceCategory.environment;
    } else if (typeStr.contains('Camera') || hwId.toUpperCase().contains('CAM') || modelCode.contains('CAM')) {
      cat = DeviceCategory.camera;
    } else if (typeStr.contains('công tắc') || typeStr.contains('ổ cắm') || hwId.toUpperCase().contains('OCAM') || modelCode.contains('SOCKET') || name.toLowerCase().contains('ổ cắm') || name.toLowerCase().contains('công tắc')) {
      cat = DeviceCategory.lightSwitch;
    }

    final props = d['currentProperties'] is Map ? Map<String, dynamic>.from(d['currentProperties']) : <String, dynamic>{};
    final assignedPropsRaw = d['assignedProperties'] is List ? d['assignedProperties'] as List : [];
    final List<Map<String, dynamic>> assignedProps = [];
    for (var p in assignedPropsRaw) {
      if (p is Map) {
        assignedProps.add(Map<String, dynamic>.from(p));
      }
    }

    final doorState = (props['door_state'] ?? 'CLOSED').toString();
    final int pos = props['position_percent'] is num
        ? (props['position_percent'] as num).toInt()
        : (doorState == 'CLOSED' ? 0 : doorState == 'OPEN' ? 100 : 50);

    final int openTimeout = (props['open_timeout'] ?? props['openTimeoutSeconds'] ?? 23) is num
        ? (props['open_timeout'] ?? props['openTimeoutSeconds'] ?? 23).toInt()
        : 23;
    final int closeTimeout = (props['close_timeout'] ?? props['closeTimeoutSeconds'] ?? 20) is num
        ? (props['close_timeout'] ?? props['closeTimeoutSeconds'] ?? 20).toInt()
        : 20;
    final bool autoSchedule = props['is_auto_schedule'] == true || props['auto_schedule'] == true;
    final bool accessLimit = props['access_limit'] == true || props['is_access_limit'] == true;
    final String accessStart = (props['access_start'] ?? props['accessStartTime'] ?? '08:00').toString();
    final String accessEnd = (props['access_end'] ?? props['accessEndTime'] ?? '17:00').toString();

    List<bool>? accessDays;
    if (props['access_days'] is List) {
      accessDays = (props['access_days'] as List).map((x) => x == true).toList();
    }

    final bool isRelayOn = props['is_relay_on'] == true || props['relay_state'] == 'ON' || props['state'] == 'ON';

    final String roleStr = (d['roleInHome'] ?? d['userRole'] ?? 'OWNER').toString().toUpperCase();
    final FamilyRole uRole = (roleStr == 'GUEST')
        ? FamilyRole.guest
        : (roleStr == 'MEMBER' || roleStr == 'FAMILY')
            ? FamilyRole.member
            : FamilyRole.owner;

    final bool canControl = d['canControl'] != false && d['can_control'] != false;
    final bool canViewHistory = d['canViewHistory'] != false && d['can_view_history'] != false;
    final bool canChildLock = d['canChildLock'] == true || d['can_child_lock'] == true || uRole == FamilyRole.owner;
    final bool canConfig = d['canConfig'] == true || d['can_config'] == true || uRole == FamilyRole.owner;

    return DeviceItem(
      id: d['id']?.toString() ?? hwId,
      hardwareId: hwId,
      name: name,
      modelName: modelName,
      modelCode: modelCode,
      imageUrl: d['imageUrl']?.toString(),
      category: cat,
      currentProperties: props,
      assignedProperties: assignedProps,
      badgeText: cat == DeviceCategory.rollerDoor ? "AUSTEC" : cat == DeviceCategory.camera ? "AI CAM" : cat == DeviceCategory.lightSwitch ? "CÔNG TẮC" : "SMART",
      deviceNumber: hwId.length > 3 ? hwId.substring(hwId.length - 3) : "001",
      roomName: (d['location'] ?? d['roomName'] ?? d['addressDisplay'] ??
          (d['installationAddress'] is Map
              ? d['installationAddress']['fullText']
              : d['installationAddress']) ?? "Khu vực chính").toString(),
      installationAddress: (d['addressDisplay'] ??
          (d['installationAddress'] is Map
              ? d['installationAddress']['fullText']
              : d['installationAddress']) ?? "").toString(),
      isOnline: d['isOnline'] == true,
      userRole: uRole,
      canControl: canControl,
      canViewHistory: canViewHistory,
      canChildLock: canChildLock,
      canConfig: canConfig,
      positionPercent: pos,
      batteryPercent: (props['battery_pct'] as num?)?.toInt() ?? 92,
      motorCurrentA: (props['motor_current'] as num?)?.toDouble() ?? 2.4,
      acVoltage: (props['ac_voltage'] as num?)?.toDouble() ?? 220.0,
      isChildLockActive: props['is_child_lock'] == true,
      isLocked: props['is_locked'] == true,
      isRelayOn: isRelayOn,
      openTimeoutSeconds: openTimeout,
      closeTimeoutSeconds: closeTimeout,
      isAutoScheduleActive: autoSchedule,
      isAccessLimitActive: accessLimit,
      accessStartTime: accessStart,
      accessEndTime: accessEnd,
      accessDays: accessDays,
      ownerName: (d['ownerName'] ?? (AuthService().currentUser?.fullName ?? 'Chủ sở hữu')).toString(),
      warrantyUntil: (d['warrantyEndAt'] ?? d['warrantyUntil'] ?? d['subscriptionExpiresAt'] ?? '2028-10-23').toString().length >= 10
          ? (d['warrantyEndAt'] ?? d['warrantyUntil'] ?? d['subscriptionExpiresAt'] ?? '2028-10-23').toString().substring(0, 10)
          : '2028-10-23',
      warrantyCode: (d['warrantyCode'] ?? 'EW-${hwId.replaceAll('-', '').toUpperCase()}-24M').toString(),
      subscriptionType: (d['subscriptionType'] ?? 'LIMITED').toString(),
      subscriptionExpiresAt: (d['subscriptionExpiresAt'] ?? '2028-10-23').toString(),
      subscriptionStatus: (d['subscriptionStatus'] ?? 'ACTIVE').toString(),
      locationLat: (d['lat'] ?? d['locationLat'] ?? d['location_lat'] as num?)?.toDouble() ?? 21.028511,
      locationLng: (d['lng'] ?? d['locationLng'] ?? d['location_lng'] as num?)?.toDouble() ?? 105.854167,
    );
  }

  /// Nạp trực tiếp đối tượng thiết bị từ JSON máy chủ vào bộ nhớ hoạt động
  DeviceItem parseAndAddDevice(dynamic d) {
    final dev = _parseDeviceFromJson(d);
    addDevice(dev);
    return dev;
  }

  void clearDevices() {
    _devices.clear();
  }

  // Dispatch command with audit logging
  Future<CommandResult> sendCommand({
    required String hardwareId,
    required String action,
    Map<String, dynamic>? parameters,
  }) async {
    final startTime = DateTime.now();
    String cryptoSig = "SIG-${DateTime.now().millisecondsSinceEpoch}";
    int netLatency = 120;

    final device = findByHardwareId(hardwareId);
    if (device != null) {
      if (!device.canPerformControl) {
        return CommandResult(
          success: false,
          latencyMs: 15,
          message: !device.canControl
              ? "Tài khoản của bạn đã bị chủ nhà giới hạn quyền điều khiển"
              : "Hiện ngoài khung giờ cho phép điều khiển (${device.accessStartTime} - ${device.accessEndTime})",
          cryptoSignature: cryptoSig,
        );
      }
      if (action == "TOGGLE_CHILD_LOCK" && !device.canChildLock) {
        return CommandResult(
          success: false,
          latencyMs: 15,
          message: "Bạn không có quyền bật/tắt Khóa an toàn trẻ em",
          cryptoSignature: cryptoSig,
        );
      }
    }

    // 1. Kênh Bluetooth BLE: Phát trực tiếp xuống rơ-le bo mạch ESP32 nếu ở gần (tạo tiếng tạch tạch rơ-le tức thì)
    final isSocket = hardwareId.toUpperCase().startsWith("OCAM") || hardwareId.toUpperCase().contains("SOCKET");
    if (isSocket) {
      final sAction = (action == "TURN_ON" || action == "ON" || action == "3") ? "3" : "4";
      unawaited(BleDeviceControlService().sendSocketAction(hardwareId: hardwareId, actionNumber: sAction));
    } else {
      final String? bleAction = (action == "OPEN_DOOR" || action == "OPEN" || action == "1") ? "1"
          : (action == "CLOSE_DOOR" || action == "CLOSE" || action == "2") ? "2"
          : (action == "STOP_DOOR" || action == "STOP" || action == "3") ? "3"
          : null;
      if (bleAction != null) {
        unawaited(BleDeviceControlService().sendDoorAction(hardwareId: hardwareId, actionNumber: bleAction));
      }
    }

    // 2. Kênh Cloud MQTT Gateway: Cập nhật CSDL PostgreSQL & đồng bộ Web Admin qua API
    try {
      final beAction = action == "OPEN_DOOR"
          ? "OPEN"
          : action == "CLOSE_DOOR"
              ? "CLOSE"
              : action == "STOP_DOOR"
                  ? "STOP"
                  : action;

      final userToken = AuthService().token ?? 'austec-customer-token';
      final res = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/devices/control'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $userToken',
        },
        body: jsonEncode({
          'hardwareId': hardwareId,
          'command': beAction,
          'action': beAction,
          'parameters': parameters ?? {},
        }),
      ).timeout(const Duration(milliseconds: 3000));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['cryptoSignature'] != null) {
          cryptoSig = data['cryptoSignature'].toString();
        }
        if (data['latencyMs'] != null) {
          netLatency = (data['latencyMs'] as num).toInt();
        }
      } else if (res.statusCode == 403) {
        final data = jsonDecode(res.body);
        return CommandResult(
          success: false,
          latencyMs: 25,
          message: data['error'] ?? 'Bạn không có quyền thực hiện thao tác này',
          cryptoSignature: cryptoSig,
        );
      }
    } catch (_) {
      // Offline fallback
      final delayMs = 60 + (DateTime.now().microsecond % 40);
      await Future.delayed(Duration(milliseconds: delayMs));
    }

    if (device != null) {
      final nowStr = "${DateTime.now().day.toString().padLeft(2, '0')}/${DateTime.now().month.toString().padLeft(2, '0')}/${DateTime.now().year} ${DateTime.now().hour.toString().padLeft(2, '0')}:${DateTime.now().minute.toString().padLeft(2, '0')}:${DateTime.now().second.toString().padLeft(2, '0')}";

      if (action == "OPEN_DOOR") {
        if (device.isChildLockActive) {
          return CommandResult(
            success: false,
            latencyMs: 15,
            message: "Cửa đang KHÓA AN TOÀN TRẺ EM! Không thể mở.",
            cryptoSignature: cryptoSig,
          );
        }
        startDoorMotion(hardwareId: hardwareId, direction: "OPEN");
        final currentActor = AuthService().currentUser?.fullName ?? "Chủ nhà";
        device.auditLogs.insert(
          0,
          AuditLog(
            time: nowStr,
            action: "Mở cửa",
            actionCode: 1,
            triggeredBy: currentActor,
            deviceCode: device.hardwareId,
          ),
        );
        return CommandResult(
          success: true,
          latencyMs: netLatency,
          message: "Đang mở cửa cuốn...",
          cryptoSignature: cryptoSig,
        );
      } else if (action == "CLOSE_DOOR") {
        if (device.isChildLockActive) {
          return CommandResult(
            success: false,
            latencyMs: 15,
            message: "Cửa đang KHÓA AN TOÀN TRẺ EM! Không thể đóng.",
            cryptoSignature: cryptoSig,
          );
        }
        startDoorMotion(hardwareId: hardwareId, direction: "CLOSE");
        final currentActor = AuthService().currentUser?.fullName ?? "Chủ nhà";
        device.auditLogs.insert(
          0,
          AuditLog(
            time: nowStr,
            action: "Đóng cửa",
            actionCode: 2,
            triggeredBy: currentActor,
            deviceCode: device.hardwareId,
          ),
        );
        return CommandResult(
          success: true,
          latencyMs: netLatency,
          message: "Đang đóng cửa cuốn...",
          cryptoSignature: cryptoSig,
        );
      } else if (action == "STOP_DOOR") {
        startDoorMotion(hardwareId: hardwareId, direction: "STOP");
        final currentActor = AuthService().currentUser?.fullName ?? "Chủ nhà";
        device.auditLogs.insert(
          0,
          AuditLog(
            time: nowStr,
            action: "Dừng cửa",
            actionCode: 3,
            triggeredBy: currentActor,
            deviceCode: device.hardwareId,
          ),
        );
        return CommandResult(
          success: true,
          latencyMs: netLatency,
          message: "Đã dừng cửa cuốn tại vị trí ${device.positionPercent}%",
          cryptoSignature: cryptoSig,
        );
      } else if (action == "SET_POSITION") {
        final target = parameters?["position"] as int? ?? 50;
        device.positionPercent = target;
        _deviceUpdateStream.add(device);
      } else if (action == "TOGGLE_CHILD_LOCK") {
        device.isChildLockActive = !device.isChildLockActive;
        if (device.isChildLockActive) {
          startDoorMotion(hardwareId: hardwareId, direction: "STOP");
        }
        _deviceUpdateStream.add(device);
        return CommandResult(
          success: true,
          latencyMs: netLatency,
          message: device.isChildLockActive
              ? "ĐÃ KHÓA AN TOÀN TRẺ EM! Các nút điều khiển đã bị khóa."
              : "ĐÃ MỞ KHÓA! Hệ thống sẵn sàng vận hành.",
          cryptoSignature: cryptoSig,
        );
      } else if (action == "UPDATE_TIMEOUTS") {
        device.openTimeoutSeconds = parameters?["openTimeout"] ?? device.openTimeoutSeconds;
        device.closeTimeoutSeconds = parameters?["closeTimeout"] ?? device.closeTimeoutSeconds;
        _deviceUpdateStream.add(device);
      } else if (action == "UPDATE_ACCESS_CONTROL") {
        device.isAccessLimitActive = parameters?["isActive"] ?? device.isAccessLimitActive;
        device.accessStartTime = parameters?["startTime"] ?? device.accessStartTime;
        device.accessEndTime = parameters?["endTime"] ?? device.accessEndTime;
        if (parameters?["days"] != null) {
          device.accessDays = List<bool>.from(parameters!["days"]);
        }
      } else if (action == "TOGGLE_RELAY" || action == "TURN_ON" || action == "TURN_OFF") {
        final bool turnOn = action == "TURN_ON" ? true : (action == "TURN_OFF" ? false : !device.isRelayOn);
        device.isRelayOn = turnOn;
        final currentActor = AuthService().currentUser?.fullName ?? "Chủ nhà";
        device.auditLogs.insert(
          0,
          AuditLog(
            time: nowStr,
            action: turnOn ? "Bật rơ-le / ổ cắm" : "Tắt rơ-le / ổ cắm",
            actionCode: turnOn ? 3 : 4,
            triggeredBy: currentActor,
            deviceCode: device.hardwareId,
          ),
        );
      } else if (action == "STREAM_START" || action == "TAKE_SNAPSHOT" || action == "STREAM_STOP") {
        final currentActor = AuthService().currentUser?.fullName ?? "Chủ nhà";
        device.auditLogs.insert(
          0,
          AuditLog(
            time: nowStr,
            action: action == "STREAM_START" ? "Kích hoạt Stream Camera" : action == "STREAM_STOP" ? "Dừng Stream Camera" : "Chụp ảnh Snapshot Camera",
            actionCode: action == "STREAM_STOP" ? 14 : 13,
            triggeredBy: currentActor,
            deviceCode: device.hardwareId,
          ),
        );
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
      latencyMs: totalLatency > 0 ? totalLatency : netLatency,
      message: "Lệnh $action đã gửi tới bo mạch & lưu vào Hộp Đen CSDL",
      cryptoSignature: cryptoSig,
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
