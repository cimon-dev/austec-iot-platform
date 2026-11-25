import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
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
      title: "CAMERA",
      subtitle: "CAMERA AN NINH",
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

  // Đồng bộ trạng thái thiết bị thời gian thực (WebSocket + Polling dự phòng 20s)
  WebSocketChannel? _statusWsChannel;
  StreamSubscription? _statusWsSub;
  Timer? _statusWsReconnectTimer;
  Timer? _periodicSyncTimer;
  bool _realtimeSyncActive = false;

  /// Bắt đầu lắng nghe trạng thái Online/Offline liên tục từ Backend
  void startRealtimeStatusSync() {
    if (_realtimeSyncActive) return;
    _realtimeSyncActive = true;
    _connectStatusWebSocket();
    _periodicSyncTimer?.cancel();
    _periodicSyncTimer = Timer.periodic(const Duration(seconds: 20), (_) {
      if (_realtimeSyncActive && AuthService().isLoggedIn) {
        fetchDevicesFromBackend(token: AuthService().token);
      }
    });
  }

  /// Dừng đồng bộ trạng thái liên tục (khi thoát màn hình chính / đăng xuất)
  void stopRealtimeStatusSync() {
    _realtimeSyncActive = false;
    _periodicSyncTimer?.cancel();
    _periodicSyncTimer = null;
    _statusWsReconnectTimer?.cancel();
    _statusWsReconnectTimer = null;
    _statusWsSub?.cancel();
    _statusWsSub = null;
    try {
      _statusWsChannel?.sink.close();
    } catch (_) {}
    _statusWsChannel = null;
  }

  void _connectStatusWebSocket() {
    if (!_realtimeSyncActive) return;
    _statusWsSub?.cancel();
    try {
      _statusWsChannel?.sink.close();
    } catch (_) {}

    try {
      final wsUri = Uri.parse(ApiConfig.wsChatUrl);
      _statusWsChannel = WebSocketChannel.connect(wsUri);
      _statusWsSub = _statusWsChannel!.stream.listen(
        (raw) {
          try {
            final msg = jsonDecode(raw.toString());
            if (msg is Map && msg['type'] == 'DEVICE_STATE_CHANGE') {
              final hwId = msg['hardwareId']?.toString() ?? '';
              final state = msg['state'];
              if (hwId.isNotEmpty && state is Map) {
                _applyRealtimeStateUpdate(hwId, Map<String, dynamic>.from(state));
              }
            }
          } catch (_) {}
        },
        onError: (_) => _scheduleStatusWsReconnect(),
        onDone: () => _scheduleStatusWsReconnect(),
      );
    } catch (_) {
      _scheduleStatusWsReconnect();
    }
  }

  void _scheduleStatusWsReconnect() {
    if (!_realtimeSyncActive) return;
    _statusWsReconnectTimer?.cancel();
    _statusWsReconnectTimer = Timer(const Duration(seconds: 5), () {
      if (_realtimeSyncActive) {
        _connectStatusWebSocket();
      }
    });
  }

  void _applyRealtimeStateUpdate(String hardwareId, Map<String, dynamic> state) {
    final device = findByHardwareId(hardwareId);
    if (device == null) return;

    bool changed = false;
    if (state.containsKey('isOnline')) {
      final nextOnline = state['isOnline'] == true;
      if (device.isOnline != nextOnline) {
        device.isOnline = nextOnline;
        changed = true;
      }
    } else if (!device.isOnline) {
      // Nhận được gói telemetry/action mới từ thiết bị -> thiết bị đang Online
      device.isOnline = true;
      changed = true;
    }

    if (state.containsKey('is_relay_on')) {
      final nextRelay = state['is_relay_on'] == true;
      if (device.isRelayOn != nextRelay) {
        device.isRelayOn = nextRelay;
        changed = true;
      }
    }

    // Cập nhật các thông số telemetry động (Công tơ, BMS, Cửa cuốn...)
    state.forEach((key, value) {
      if (key != 'isOnline' && device.currentProperties[key] != value) {
        device.currentProperties[key] = value;
        changed = true;
      }
    });

    if (changed) {
      _deviceUpdateStream.add(device);
    }
  }

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

  static final DeviceItem _mockSmartMetter = _createMockSmartMetter();
  static final DeviceItem _mockBms = _createMockBms();

  static DeviceItem _createMockSmartMetter() {
    return DeviceItem(
      id: "mock_smartmetter_1",
      hardwareId: "SmartMetter_A834",
      name: "Công tơ điện tử chống giật",
      modelName: "SmartMetter Pro",
      modelCode: "SmartMetter",
      category: DeviceCategory.energyManage,
      roomName: "Tủ điện tổng",
      badgeText: "CHỐNG GIẬT",
      deviceNumber: "834",
      isOnline: true,
      warrantyUntil: "2029-12-31",
      warrantyCode: "EW-METER-834",
      userRole: FamilyRole.owner,
      canControl: true,
      canViewHistory: true,
      canChildLock: true,
      canConfig: true,
      ownerName: "Chủ nhà",
      currentProperties: {
        'kwh': 123.45,
        'voltage_v': 220.5,
        'current_a': 12.4,
        'power_kw': 2.73,
        'power_status': 'ON',
        'is_meter_on': true,
        'power_limit_w': 4500,
        'relay_cut': false,
      },
    );
  }

  static DeviceItem _createMockBms() {
    return DeviceItem(
      id: "mock_bms_1",
      hardwareId: "BMS_52V150AH",
      name: "Hệ thống Pin BMS Lithium",
      modelName: "Austec Smart BMS 16S",
      modelCode: "BMS_16S_150A",
      category: DeviceCategory.energyManage,
      roomName: "Phòng kỹ thuật",
      badgeText: "16S 150A",
      deviceNumber: "150",
      isOnline: true,
      warrantyUntil: "2029-06-30",
      warrantyCode: "EW-BMS-150A",
      userRole: FamilyRole.owner,
      canControl: true,
      canViewHistory: true,
      canChildLock: false,
      canConfig: true,
      ownerName: "Chủ nhà",
      currentProperties: {
        'soc_percent': 95,
        'capacity_current_ah': 142.5,
        'capacity_total_ah': 150.0,
        'status_tag': 'ĐANG XẢ',
        'total_voltage': 52.8,
        'avg_cell_voltage': 3.30,
        'current_a': -68.5,
        'current_limit_a': 150.0,
        'power_kw': 3.62,
        'temp_c': 34.5,
        'delta_v': 0.012,
        'cell_count': 16,
        'cells': [
          {'cell': 1, 'v': 3.301, 'a': -0.39, 'r': 3.559, 'status': 'NORMAL'},
          {'cell': 2, 'v': 3.301, 'a': -0.35, 'r': 3.594, 'status': 'NORMAL'},
          {'cell': 3, 'v': 3.301, 'a': -0.38, 'r': 3.596, 'status': 'NORMAL'},
          {'cell': 4, 'v': 3.301, 'a': -0.28, 'r': 3.466, 'status': 'NORMAL'},
          {'cell': 5, 'v': 3.301, 'a': -0.80, 'r': 3.582, 'status': 'NORMAL'},
          {'cell': 6, 'v': 3.301, 'a': -0.35, 'r': 3.471, 'status': 'WARN'},
          {'cell': 7, 'v': 3.301, 'a': -0.35, 'r': 3.592, 'status': 'NORMAL'},
          {'cell': 8, 'v': 3.301, 'a': -0.60, 'r': 3.343, 'status': 'NORMAL'},
          {'cell': 9, 'v': 3.301, 'a': -1.65, 'r': 1.35, 'status': 'NORMAL'},
          {'cell': 10, 'v': 3.301, 'a': -0.35, 'r': 3.535, 'status': 'NORMAL'},
          {'cell': 11, 'v': 3.301, 'a': -0.38, 'r': 3.596, 'status': 'NORMAL'},
          {'cell': 12, 'v': 3.301, 'a': -0.75, 'r': 3.532, 'status': 'WARN'},
          {'cell': 13, 'v': 3.301, 'a': -0.28, 'r': 3.466, 'status': 'NORMAL'},
          {'cell': 14, 'v': 3.301, 'a': -0.38, 'r': 3.559, 'status': 'NORMAL'},
          {'cell': 15, 'v': 3.301, 'a': -1.88, 'r': 1.38, 'status': 'NORMAL'},
          {'cell': 16, 'v': 3.301, 'a': 0.66, 'r': 3.272, 'status': 'NORMAL'},
        ],
        'faults': [
          {'time': '13:42:10', 'code': 'ERR_04', 'desc': 'Quá dòng xả (Discharge Overcurrent: -68.5A)', 'level': 'Nghiêm trọng', 'status': 'Đang lỗi'},
          {'time': '13:38:05', 'code': 'WARN_02', 'desc': 'Quá áp Cell 8 (Cell 8 Overvoltage: 3.650V)', 'level': 'Cảnh báo', 'status': 'Đang lỗi'},
          {'time': '13:15:22', 'code': 'WARN_05', 'desc': 'Chênh lệch điện áp cao (Delta V > 0.050V)', 'level': 'Cảnh báo', 'status': 'Đang lỗi'},
          {'time': '10:20:00', 'code': 'ERR_01', 'desc': 'Nhiệt độ MOS cao (High MOS Temp: 65.0°C)', 'level': 'Nghiêm trọng', 'status': 'Đã khắc phục'},
        ],
      },
    );
  }

  List<DeviceItem> getDevicesByCategory(DeviceCategory category) {
    final realDevices = _devices.where((d) => d.category == category).toList();

    // 1. Quản lý năng lượng (Bao gồm Công tơ điện tử chống giật & Hệ thống BMS)
    if (category == DeviceCategory.energyManage) {
      final List<DeviceItem> result = List.from(realDevices);
      final hasSmartMeter = result.any((d) =>
          d.modelCode.contains('SmartMetter') ||
          d.hardwareId.toUpperCase().contains('SMARTMETTER') ||
          d.hardwareId.toUpperCase().contains('SMARTMETER') ||
          d.hardwareId.toUpperCase().contains('CONGTO') ||
          d.name.toLowerCase().contains('công tơ'));
      if (!hasSmartMeter) {
        result.insert(0, _mockSmartMetter);
      }
      final hasBms = result.any((d) =>
          d.modelCode.toUpperCase().contains('BMS') ||
          d.hardwareId.toUpperCase().contains('BMS') ||
          d.name.toLowerCase().contains('bms'));
      if (!hasBms) {
        result.add(_mockBms);
      }
      return result;
    }

    if (category == DeviceCategory.rollerDoor ||
        category == DeviceCategory.lightSwitch ||
        category == DeviceCategory.camera) {
      return realDevices;
    }

    // Nhóm Data Analytics thuần túy (nếu có):
    if (category == DeviceCategory.dataAnalytics) {
      return realDevices;
    }

    return realDevices;
  }

  DeviceItem? findByHardwareId(String hardwareId) {
    try {
      final norm = hardwareId.trim().toLowerCase();
      final cleanNorm = norm.replaceAll('amtuong-', '').replaceAll('at-', '').replaceAll('-', '');

      // 1. Luôn ưu tiên tìm kiếm trong danh sách thiết bị thật trong RAM
      for (final d in _devices) {
        final dNorm = d.hardwareId.trim().toLowerCase();
        final dClean = dNorm.replaceAll('amtuong-', '').replaceAll('at-', '').replaceAll('-', '');
        if (dNorm == norm || dClean == cleanNorm || dNorm.endsWith(cleanNorm) || norm.endsWith(dClean)) {
          return d;
        }
      }

      // 2. Fallback mock cho thiết bị mẫu nếu không có thiết bị thật
      if (norm.contains('smartmetter') || cleanNorm.contains('smartmetter')) {
        return _mockSmartMetter;
      }
      if (norm.contains('bms') || cleanNorm.contains('bms')) {
        return _mockBms;
      }

      return null;
    } catch (_) {
      return null;
    }
  }

  String? _lastLoadedUserId;

  String get _cachedDevicesKey => 'austec_cached_user_devices_${AuthService().currentUser?.id ?? "guest"}';

  /// Xóa trắng danh sách thiết bị trong RAM khi đăng xuất / chuyển tài khoản
  void clearAllDevices() {
    _devices.clear();
    _lastLoadedUserId = null;
    _deviceUpdateStream.add(DeviceItem(
      id: '__RESET__',
      hardwareId: '__RESET__',
      name: '',
      modelName: '',
      modelCode: '',
      category: DeviceCategory.othersControl,
      roomName: '',
      badgeText: '',
      deviceNumber: '',
      isOnline: false,
      warrantyUntil: '',
      warrantyCode: '',
      userRole: FamilyRole.guest,
      canControl: false,
      canViewHistory: false,
      canChildLock: false,
      canConfig: false,
      ownerName: '',
      currentProperties: {},
    ));
  }

  /// Lưu danh sách thiết bị vào bộ nhớ cục bộ máy (Offline Storage)
  Future<void> saveDevicesToLocalCache([List? rawList]) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (rawList != null) {
        await prefs.setString(_cachedDevicesKey, jsonEncode(rawList));
        debugPrint('[IoTGatewayClient] 💾 Đã lưu ${rawList.length} thiết bị vào Local Cache: $_cachedDevicesKey');
      } else {
        final listToSave = _devices.map((d) => d.toMap()).toList();
        await prefs.setString(_cachedDevicesKey, jsonEncode(listToSave));
        debugPrint('[IoTGatewayClient] 💾 Đã lưu ${listToSave.length} thiết bị vào Local Cache: $_cachedDevicesKey');
      }
    } catch (e) {
      debugPrint('[IoTGatewayClient] Lỗi lưu Local Cache: $e');
    }
  }

  /// Nạp danh sách thiết bị lưu cục bộ (Local Offline Cache)
  Future<void> loadDevicesFromLocalCache() async {
    try {
      final currentUserId = AuthService().currentUser?.id ?? "guest";
      if (_lastLoadedUserId != null && _lastLoadedUserId != currentUserId) {
        _devices.clear();
      }
      _lastLoadedUserId = currentUserId;

      final prefs = await SharedPreferences.getInstance();
      final cachedJson = prefs.getString(_cachedDevicesKey);
      if (cachedJson != null && cachedJson.isNotEmpty) {
        final dynamic decoded = jsonDecode(cachedJson);
        if (decoded is List) {
          _devices.clear();
          for (var d in decoded) {
            _devices.add(_parseDeviceFromJson(d));
          }
          for (var d in _devices) {
            _deviceUpdateStream.add(d);
          }
          debugPrint('[IoTGatewayClient] 📦 Nạp thành công ${_devices.length} thiết bị từ Local Cache: $_cachedDevicesKey');
        }
      }
    } catch (e) {
      debugPrint('[IoTGatewayClient] Lỗi nạp Local Cache: $e');
    }
  }

  void addDevice(DeviceItem device) {
    final idx = _devices.indexWhere((d) => d.hardwareId.toLowerCase() == device.hardwareId.toLowerCase());
    if (idx >= 0) {
      _devices[idx] = device;
    } else {
      _devices.insert(0, device);
    }
    unawaited(saveDevicesToLocalCache());
    _deviceUpdateStream.add(device);
  }

  Future<void> removeDevice(String hardwareId) async {
    final norm = hardwareId.trim().toLowerCase();
    final removed = _devices.where((d) => d.hardwareId.trim().toLowerCase() == norm).toList();
    _devices.removeWhere((d) => d.hardwareId.trim().toLowerCase() == norm);
    try {
      final prefs = await SharedPreferences.getInstance();
      final listToSave = _devices.map((d) => d.toMap()).toList();
      await prefs.setString(_cachedDevicesKey, jsonEncode(listToSave));
    } catch (_) {}
    if (removed.isNotEmpty) {
      _deviceUpdateStream.add(removed.first);
    } else {
      clearAllDevices();
    }
  }

  void renameDevice(String hardwareId, String newName) {
    final dev = findByHardwareId(hardwareId);
    if (dev != null) {
      dev.name = newName;
      unawaited(saveDevicesToLocalCache());
    }
  }

  /// Xóa / Hủy liên kết thiết bị khỏi tài khoản (API thực tế, hỗ trợ X-StepUp-Token khi OWNER xóa & Factory Reset)
  Future<bool> unpairDevice(String hardwareId, {String? stepUpToken}) async {
    try {
      final token = AuthService().token ?? '';
      if (token.isEmpty) return false;
      final res = await http.delete(
        Uri.parse('${ApiConfig.baseUrl}/api/devices/$hardwareId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
          if (stepUpToken != null && stepUpToken.isNotEmpty) 'X-StepUp-Token': stepUpToken,
        },
      ).timeout(const Duration(seconds: 10));

      if (res.statusCode == 200) {
        removeDevice(hardwareId);
        return true;
      }
    } catch (e) {
      debugPrint('[IoTGatewayClient] unpairDevice error: $e');
    }
    return false;
  }

  /// Đổi tên hiển thị thiết bị (API thực tế)
  Future<bool> updateDeviceName(String hardwareId, String newName) async {
    try {
      final token = AuthService().token ?? '';
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
      final token = AuthService().token ?? '';
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
      final token = AuthService().token ?? '';
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
    final currentUserId = AuthService().currentUser?.id ?? "guest";
    if (_lastLoadedUserId != null && _lastLoadedUserId != currentUserId) {
      _devices.clear();
    }
    _lastLoadedUserId = currentUserId;

    // 1. Luôn đảm bảo nạp từ Local Cache nếu trong RAM chưa có thiết bị
    if (_devices.isEmpty) {
      await loadDevicesFromLocalCache();
    }

    bool syncSuccess = false;

    // 2. Thử đồng bộ từ Backend Cloud / PostgreSQL
    try {
      final authToken = token ?? (AuthService().token ?? '');
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
            // Khi kết nối máy chủ thành công và tài khoản thực tế không có thiết bị: Xóa cache cũ để tránh rò rỉ thiết bị của tài khoản khác
            _devices.clear();
            await saveDevicesToLocalCache([]);
            clearAllDevices();
            syncSuccess = true;
          }
        }
      }
    } catch (e) {
      debugPrint('[IoTGatewayClient] Không thể kết nối Backend (Chế độ Ngoại tuyến Offline): $e');
    }

    // 3. Nếu không thể kết nối hoặc status != 200 (mất mạng / lỗi kết nối):
    if (!syncSuccess) {
      if (_devices.isEmpty) {
        await loadDevicesFromLocalCache();
      }
      // Giữ nguyên trạng thái thiết bị trong cache, không ép toàn bộ về offline
      for (var d in _devices) {
        _deviceUpdateStream.add(d);
      }
    }
  }

  /// Nạp danh sách camera phân trang theo yêu cầu (mỗi lượt 4-6 cái)
  Future<List<DeviceItem>> fetchCamerasPaged({int limit = 6, int offset = 0, String? token}) async {
    try {
      final authToken = token ?? (AuthService().token ?? '');
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
    final hwId = (d['hardwareId'] ?? d['id'] ?? '').toString();
    final name = (d['customName'] ?? d['deviceName'] ?? d['name'] ?? d['modelName'] ?? 'Thiết bị Austec').toString();
    final rawModelName = (d['modelName'] ?? d['model_name'] ?? '').toString();
    final rawModelCode = (d['modelCode'] ?? d['model_code'] ?? '').toString();
    final typeStr = (d['deviceType'] ?? '').toString();
    final explicitCat = (d['category'] ?? d['deviceCategory'] ?? '').toString().toLowerCase();

    DeviceCategory cat;
    final upperHwId = hwId.toUpperCase().trim();
    final lowerName = name.toLowerCase().trim();
    final lowerType = typeStr.toLowerCase().trim();
    final upperModel = rawModelCode.toUpperCase().trim();

    final bool isHubDoor = upperHwId.startsWith('WIFRFTT') || upperHwId.startsWith('CUACUON') || upperHwId.startsWith('AT-DOOR');
    final bool isWallDoor = upperHwId.startsWith('WIFRF_ECO') || upperHwId.startsWith('WIFRFECO') || upperHwId.startsWith('AMTUONG') || upperHwId.contains('AMTUONG') || (upperHwId.startsWith('WIFRF') && upperHwId.contains('ECO'));
    final bool isAnyDoor = isHubDoor || isWallDoor || upperHwId.startsWith('WIFRF') || upperHwId.startsWith('DOOR') || lowerType.contains('cửa') || upperModel.contains('DOOR') || lowerName.contains('cửa');

    final bool isSmartSw = upperHwId.startsWith('SMARTSW') || hwId.contains('SmartSW') || upperHwId.startsWith('OCAM') || upperHwId.contains('SOCKET') || lowerType.contains('ổ cắm') || lowerType.contains('công tắc') || upperModel.contains('SOCKET') || upperModel.contains('SWITCH') || lowerName.contains('ổ cắm') || lowerName.contains('công tắc');

    final bool isSmartMeter = upperHwId.startsWith('SMARTMETTER') || upperHwId.startsWith('SMARTMETER') || lowerName.contains('smartmetter') || lowerName.contains('smartmeter') || upperHwId.contains('CONGTO') || lowerType.contains('công tơ') || upperModel.contains('METER') || lowerName.contains('công tơ');

    final bool isCam = !isSmartSw && !isSmartMeter && (upperHwId.startsWith('CAM') || upperHwId.contains('CAMERA') || upperHwId.contains('ESP32-CAM') || upperHwId.contains('OV2640') || lowerType.contains('camera') || upperModel.startsWith('CAM') || lowerName.contains('camera'));

    // 1. Phân loại theo tiền tố Hardware ID & đặc trưng kỹ thuật Austec
    if (isSmartSw) {
      cat = DeviceCategory.lightSwitch;
    } else if (isCam) {
      cat = DeviceCategory.camera;
    } else if (isSmartMeter) {
      cat = DeviceCategory.energyManage;
    } else if (isAnyDoor) {
      cat = DeviceCategory.rollerDoor;
    } else if (upperHwId.startsWith('BMS') || lowerType.contains('bms') || upperModel.contains('BMS')) {
      cat = DeviceCategory.energyManage;
    // 2. Explicit Category nếu được server/cache trả về rõ ràng
    } else if (explicitCat == 'lightswitch' || explicitCat == 'socket') {
      cat = DeviceCategory.lightSwitch;
    } else if (explicitCat == 'camera') {
      cat = DeviceCategory.camera;
    } else if (explicitCat == 'rollerdoor' || explicitCat == 'door') {
      cat = DeviceCategory.rollerDoor;
    } else if (explicitCat == 'energymanage' || explicitCat == 'energy' || explicitCat == 'meter' || explicitCat == 'bms') {
      cat = DeviceCategory.energyManage;
    } else if (explicitCat == 'dataanalytics') {
      cat = DeviceCategory.dataAnalytics;
    } else if (explicitCat == 'environment') {
      cat = DeviceCategory.environment;
    } else {
      cat = DeviceCategory.othersControl; // Thiết bị chưa phân loại vào OTHERS CONTROL, tuyệt đối không gán bừa Cửa cuốn!
    }

    final modelName = rawModelName.isNotEmpty ? rawModelName : (
      cat == DeviceCategory.lightSwitch ? 'Ổ cắm công tắc thông minh Austec' :
      cat == DeviceCategory.camera ? 'AI Camera 360' :
      cat == DeviceCategory.energyManage ? 'Công tơ điện tử chống giật' :
      cat == DeviceCategory.rollerDoor ? (isWallDoor ? 'Cửa cuốn âm tường Austec' : 'Cửa cuốn trung tâm Austec') : 'Austec Smart Device'
    );
    final modelCode = rawModelCode.isNotEmpty ? rawModelCode : (
      cat == DeviceCategory.lightSwitch ? 'SMART_SOCKET_SW' :
      cat == DeviceCategory.camera ? 'AI_CAMERA_360' :
      cat == DeviceCategory.energyManage ? 'SMART_METER_PRO' :
      cat == DeviceCategory.rollerDoor ? (isWallDoor ? 'DOOR_INWALL_ECO' : 'DOOR_HUB_WIFRFTT') : 'OTHER_CONTROL_DEVICE'
    );

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
    final bool accessLimit = (d['scheduleLimitActive'] == true || d['schedule_limit_active'] == true || props['access_limit'] == true || props['is_access_limit'] == true);
    final String accessStart = (d['accessStartTime'] ?? d['access_start_time'] ?? props['access_start'] ?? props['accessStartTime'] ?? '08:00').toString();
    final String accessEnd = (d['accessEndTime'] ?? d['access_end_time'] ?? props['access_end'] ?? props['accessEndTime'] ?? '18:00').toString();

    List<bool>? accessDays;
    final rawDays = d['accessDays'] ?? d['access_days'] ?? props['access_days'];
    if (rawDays is List) {
      accessDays = rawDays.map((x) => x == true).toList();
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
      badgeText: cat == DeviceCategory.rollerDoor
          ? (isWallDoor ? "ÂM TƯỜNG" : "TRUNG TÂM")
          : cat == DeviceCategory.camera
              ? "CAMERA"
              : cat == DeviceCategory.lightSwitch
                  ? (upperHwId.contains("OCAM") || upperHwId.contains("SOCKET") || upperHwId.startsWith("SMARTSW") ? "Ổ CẮM" : "CÔNG TẮC")
                  : cat == DeviceCategory.energyManage
                      ? "CÔNG TƠ ĐIỆN"
                      : "SMART",
      deviceNumber: hwId.length > 3 ? hwId.substring(hwId.length - 3) : "001",
      roomName: (d['location'] ?? d['roomName'] ?? d['addressDisplay'] ??
          (d['installationAddress'] is Map
              ? d['installationAddress']['fullText']
              : d['installationAddress']) ?? "").toString(),
      installationAddress: (d['addressDisplay'] ??
          (d['installationAddress'] is Map
              ? d['installationAddress']['fullText']
              : d['installationAddress']) ?? "").toString(),
      isOnline: d['isOnline'] == true || d['is_online'] == true || d['status'] == 'ONLINE' || d['status'] == 'online',
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
      ownerId: (d['ownerId'] ?? d['owner_id'])?.toString(),
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
      final isStreamStartAction = action == "STREAM_START" || action == "13";
      if (isStreamStartAction) {
        if (!device.canViewCameraStream) {
          return CommandResult(
            success: false,
            latencyMs: 15,
            message: device.scheduleBlockedReason,
            cryptoSignature: cryptoSig,
          );
        }
      } else if (action == "STREAM_STOP" || action == "14") {
        // Cho phép dừng stream
      } else {
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
    }

    // 1. Phân loại thiết bị & chuẩn bị kênh điều khiển Bluetooth BLE dự phòng tầm gần
    final upperHwId = hardwareId.toUpperCase();
    final isSocket = upperHwId.startsWith("OCAM") || upperHwId.contains("SOCKET");
    final isMeter = upperHwId.contains("SMARTMETTER") || upperHwId.contains("SMARTMETER") || upperHwId.contains("METER");
    final isBms = upperHwId.contains("BMS") || (device?.modelCode.toUpperCase().contains("BMS") ?? false);
    final isCamera = upperHwId.startsWith("CAM") || device?.category == DeviceCategory.camera;

    String resolvedSocketAction = action;
    if (action == "TOGGLE_RELAY") {
      resolvedSocketAction = (device != null && device.isRelayOn) ? "TURN_OFF" : "TURN_ON";
    }

    Future<bool> trySendBleFallback() async {
      if (isSocket) {
        final sAction = (resolvedSocketAction == "TURN_ON" || resolvedSocketAction == "ON" || resolvedSocketAction == "13" || resolvedSocketAction == "1")
            ? "13"
            : (resolvedSocketAction == "STOP" || resolvedSocketAction == "3")
                ? "3"
                : (resolvedSocketAction == "RF_SETUP" || resolvedSocketAction == "RF_PAIR_NEW" || resolvedSocketAction == "11")
                    ? "11"
                    : (resolvedSocketAction == "RF_CLEAR" || resolvedSocketAction == "RF_CLEAR_ALL" || resolvedSocketAction == "12")
                        ? "12"
                        : "14";
        return BleDeviceControlService().sendSocketAction(
          hardwareId: hardwareId,
          actionNumber: sAction,
          userId: device?.ownerId ?? AuthService().currentUser?.id,
        );
      } else if (isBms) {
        final bmsCmd = parameters?['raw_command']?.toString() ?? action;
        return BleDeviceControlService().sendBmsCommand(
          hardwareId: hardwareId,
          command: bmsCmd,
        );
      } else if (!isMeter && !isCamera) {
        final String? bleAction = (action == "OPEN_DOOR" || action == "OPEN" || action == "1")
            ? "1"
            : (action == "CLOSE_DOOR" || action == "CLOSE" || action == "2")
                ? "2"
                : (action == "STOP_DOOR" || action == "STOP" || action == "3")
                    ? "3"
                    : (action == "RF_SETUP" || action == "RF_PAIR_NEW" || action == "11")
                        ? "11"
                        : (action == "RF_CLEAR" || action == "RF_CLEAR_ALL" || action == "12")
                            ? "12"
                            : null;
        if (bleAction != null) {
          return BleDeviceControlService().sendDoorAction(
            hardwareId: hardwareId,
            actionNumber: bleAction,
          );
        }
      }
      return false;
    }

    final bool supportsBleControl = isSocket || isBms || (!isMeter && !isCamera);
    bool triedBle = false;
    bool bleSuccess = false;

    // Nếu thiết bị đang biết là Ngoại tuyến Wi-Fi và hỗ trợ BLE -> ưu tiên điều khiển BLE ngay (không phải chờ Cloud timeout 6s)
    if (supportsBleControl && device != null && !device.isOnline) {
      triedBle = true;
      bleSuccess = await trySendBleFallback();
      if (bleSuccess) {
        netLatency = 35;
      }
    }

    // 2. Kênh Cloud MQTT Gateway (chỉ gọi nếu chưa điều khiển xong qua BLE)
    if (!bleSuccess) {
      try {
        final beAction = action == "OPEN_DOOR"
            ? "OPEN"
            : action == "CLOSE_DOOR"
                ? "CLOSE"
                : action == "STOP_DOOR"
                    ? "STOP"
                    : action == "TOGGLE_RELAY"
                        ? resolvedSocketAction
                        : action;

        final isRfCmd = beAction == "RF_SETUP" || beAction == "RF_PAIR_NEW" || beAction == "RF_CLEAR" || beAction == "RF_CLEAR_ALL" || beAction == "11" || beAction == "12";
        final userToken = AuthService().token ?? '';
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
        ).timeout(Duration(milliseconds: isRfCmd ? 12000 : 6000));

        bool isSuccess = false;
        String? errorMessage;
        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          final innerResult = data['result'] is Map ? data['result'] as Map : null;
          if (data['cryptoSignature'] != null) {
            cryptoSig = data['cryptoSignature'].toString();
          }
          if (data['latencyMs'] != null) {
            netLatency = (data['latencyMs'] as num).toInt();
          } else if (innerResult?['latencyMs'] != null) {
            netLatency = (innerResult!['latencyMs'] as num).toInt();
          }
          final bool outerOk = data['success'] == true;
          final bool innerOk = innerResult == null || innerResult['success'] != false;
          if (outerOk && innerOk) {
            isSuccess = true;
          } else {
            errorMessage = data['error'] ?? innerResult?['message'] ?? data['message'] ?? 'Không thể điều khiển thiết bị. Vui lòng kiểm tra kết nối.';
          }
        } else if (res.statusCode == 403) {
          // Lỗi phân quyền / ngoài khung giờ -> KHÔNG fallback BLE
          final data = jsonDecode(res.body);
          return CommandResult(
            success: false,
            latencyMs: 25,
            message: data['error'] ?? 'Bạn không có quyền thực hiện thao tác này',
            cryptoSignature: cryptoSig,
          );
        } else {
          try {
            final data = jsonDecode(res.body);
            errorMessage = data['error'] ?? data['message'] ?? 'Không thể điều khiển thiết bị. Vui lòng thử lại.';
          } catch (_) {
            errorMessage = 'Không thể điều khiển thiết bị. Vui lòng thử lại.';
          }
        }

        // Cloud không nhận được ACK từ thiết bị (VD: thiết bị mất Wi-Fi đã tự bật BLE) -> tự động chuyển sang BLE!
        if (!isSuccess) {
          if (supportsBleControl && !triedBle) {
            triedBle = true;
            bleSuccess = await trySendBleFallback();
          }
          if (!bleSuccess) {
            // Không điều khiển được cả Cloud lẫn BLE -> báo Ngoại tuyến ngay lập tức trên UI
            if (device != null && device.isOnline) {
              device.isOnline = false;
              _deviceUpdateStream.add(device);
            }
            return CommandResult(
              success: false,
              latencyMs: netLatency,
              message: supportsBleControl
                  ? 'Thiết bị không phản hồi qua mạng và không tìm thấy qua Bluetooth gần đây.'
                  : (errorMessage ?? 'Thiết bị đang ngoại tuyến hoặc không phản hồi.'),
              cryptoSignature: cryptoSig,
            );
          }
        }
      } catch (e) {
        // Điện thoại mất mạng hoặc không kết nối được Cloud -> tự động chuyển sang BLE!
        if (supportsBleControl && !triedBle) {
          triedBle = true;
          bleSuccess = await trySendBleFallback();
        }
        if (!bleSuccess) {
          if (device != null && device.isOnline) {
            device.isOnline = false;
            _deviceUpdateStream.add(device);
          }
          return CommandResult(
            success: false,
            latencyMs: 120,
            message: supportsBleControl
                ? 'Không có kết nối mạng và không tìm thấy thiết bị qua Bluetooth tầm gần.'
                : 'Thiết bị đang ngoại tuyến hoặc mất kết nối mạng.',
            cryptoSignature: cryptoSig,
          );
        }
      }
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
      } else if (action == "METER_POWER_ON" || action == "METER_ON" || (action == "TURN_ON" && device.category == DeviceCategory.energyManage)) {
        device.currentProperties['is_meter_on'] = true;
        device.currentProperties['relay_status'] = 'ON';
        _deviceUpdateStream.add(device);
        return CommandResult(
          success: true,
          latencyMs: netLatency,
          message: "Đã bật công tơ điện",
          cryptoSignature: cryptoSig,
        );
      } else if (action == "METER_POWER_OFF" || action == "METER_OFF" || (action == "TURN_OFF" && device.category == DeviceCategory.energyManage)) {
        device.currentProperties['is_meter_on'] = false;
        device.currentProperties['relay_status'] = 'OFF';
        _deviceUpdateStream.add(device);
        return CommandResult(
          success: true,
          latencyMs: netLatency,
          message: "Đã tắt công tơ điện",
          cryptoSignature: cryptoSig,
        );
      } else if (action == "RESET" && (device.category == DeviceCategory.energyManage || hardwareId.toLowerCase().contains("meter"))) {
        device.currentProperties['alarm'] = null;
        device.currentProperties['is_meter_on'] = true;
        device.currentProperties['relay_status'] = 'ON';
        _deviceUpdateStream.add(device);
        return CommandResult(
          success: true,
          latencyMs: netLatency,
          message: "Đã xóa cảnh báo và cấp điện lại",
          cryptoSignature: cryptoSig,
        );
      } else if (action == "TOGGLE_RELAY" || action == "TURN_ON" || action == "TURN_OFF") {
        final bool turnOn = action == "TURN_ON" ? true : (action == "TURN_OFF" ? false : !device.isRelayOn);
        device.isRelayOn = turnOn;
        final currentActor = AuthService().currentUser?.fullName ?? "Chủ nhà";
        device.auditLogs.insert(
          0,
          AuditLog(
            time: nowStr,
            action: turnOn ? "Bật ổ cắm" : "Tắt ổ cắm",
            actionCode: turnOn ? 13 : 14,
            triggeredBy: currentActor,
            deviceCode: device.hardwareId,
          ),
        );
        _deviceUpdateStream.add(device);
        return CommandResult(
          success: true,
          latencyMs: netLatency,
          message: turnOn ? "Đã bật nguồn điện" : "Đã tắt nguồn điện",
          cryptoSignature: cryptoSig,
        );
      } else if (action == "STOP") {
        final currentActor = AuthService().currentUser?.fullName ?? "Chủ nhà";
        device.auditLogs.insert(
          0,
          AuditLog(
            time: nowStr,
            action: "Dừng thiết bị",
            actionCode: 3,
            triggeredBy: currentActor,
            deviceCode: device.hardwareId,
          ),
        );
        _deviceUpdateStream.add(device);
        return CommandResult(
          success: true,
          latencyMs: netLatency,
          message: "Đã dừng thiết bị",
          cryptoSignature: cryptoSig,
        );
      } else if (action == "RF_SETUP" || action == "RF_CLEAR" || action == "RF_PAIR_NEW" || action == "RF_CLEAR_ALL") {
        final isSetup = action == "RF_SETUP" || action == "RF_PAIR_NEW";
        final currentActor = AuthService().currentUser?.fullName ?? "Chủ nhà";
        device.auditLogs.insert(
          0,
          AuditLog(
            time: nowStr,
            action: isSetup ? "Ghép tay cầm mới" : "Xóa tay cầm",
            actionCode: isSetup ? 11 : 12,
            triggeredBy: currentActor,
            deviceCode: device.hardwareId,
          ),
        );
        _deviceUpdateStream.add(device);
        return CommandResult(
          success: true,
          latencyMs: netLatency,
          message: isSetup ? "Đã bật chế độ ghép tay cầm mới" : "Đã xóa toàn bộ tay cầm",
          cryptoSignature: cryptoSig,
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
      message: "Lệnh $action đã thực hiện thành công",
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
