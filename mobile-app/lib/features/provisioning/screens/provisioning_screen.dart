import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'dart:async';
import 'dart:convert';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:http/http.dart' as http;
import '../../../core/constants/app_theme.dart';
import '../../../core/constants/api_config.dart';
import '../../../core/constants/device_provisioning_catalog.dart';
import '../../../core/services/ble_provisioning_service.dart';
import '../../../core/services/iot_gateway_client.dart';
import '../../../core/models/device_model.dart';
import '../widgets/wifi_picker_sheet.dart';
import '../widgets/pairing_progress_dialog.dart';
import '../../devices/screens/roller_door_control_screen.dart';
import '../../devices/screens/device_detail_screen.dart';
import '../../../core/services/device_location_service.dart';
import 'package:geolocator/geolocator.dart';

class ProvisioningScreen extends StatefulWidget {
  const ProvisioningScreen({super.key});

  @override
  State<ProvisioningScreen> createState() => _ProvisioningScreenState();
}

class _ProvisioningScreenState extends State<ProvisioningScreen> {
  final BleProvisioningService _bleService = BleProvisioningService();
  bool _isScanning = false;
  List<DiscoveredHardwareBLE> _discoveredDevices = [];
  DiscoveredHardwareBLE? _selectedDevice;
  Timer? _autoDiscoveryTimer;
  BluetoothAdapterState _adapterState = BluetoothAdapterState.unknown;
  StreamSubscription? _adapterStateSub;
  StreamSubscription<List<ScanResult>>? _scanResultSub;

  bool _isScanningWifi = false;
  String _currentWifiSsid = "";
  List<String> _availableNetworks = [];

  PairingMethod _selectedMethod = PairingMethod.bluetooth;
  String _brokerIp = "";
  int _brokerPort = 1883;

  final TextEditingController _qrCodeController = TextEditingController();
  final TextEditingController _ssidController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _locationController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();
  final TextEditingController _latController = TextEditingController();
  final TextEditingController _lngController = TextEditingController();
  bool _isGettingLocation = false;

  bool _obscurePassword = true;
  Timer? _progressSmoothTimer;
  double _targetProgress = 0.0;

  bool _isProvisioning = false;
  double _provisioningProgress = 0.0;
  String _provisioningStep = "";
  PairingResult? _pairingResult;

  @override
  void initState() {
    super.initState();
    _detectCurrentWifi();

    // Tự động xin quyền và lấy tọa độ GPS vệ tinh ngay khi người dùng vào màn hình Thêm Thiết Bị
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _getCurrentGpsLocation(promptIfDenied: true, showSuccessSnackbar: false);
      }
    });

    if (!kIsWeb) {
      _adapterStateSub = FlutterBluePlus.adapterState.listen((state) {
        if (!mounted) return;
        setState(() => _adapterState = state);
        if (state == BluetoothAdapterState.on) {
          _triggerScan();
        } else {
          setState(() => _isScanning = false);
        }
      });

      FlutterBluePlus.isScanning.listen((scanning) {
        if (mounted) setState(() => _isScanning = scanning);
      });

      // Kiểm tra trạng thái hiện tại và kích hoạt quét ngay
      FlutterBluePlus.adapterState.first.then((state) {
        if (!mounted) return;
        setState(() => _adapterState = state);
        _triggerScan();
      }).catchError((_) {
        _triggerScan();
      });
    } else {
      _startContinuousBleScanning();
    }
  }

  @override
  void dispose() {
    _progressSmoothTimer?.cancel();
    _autoDiscoveryTimer?.cancel();
    _scanResultSub?.cancel();
    _adapterStateSub?.cancel();
    if (!kIsWeb) {
      try {
        FlutterBluePlus.stopScan();
      } catch (_) {}
    }
    _qrCodeController.dispose();
    _ssidController.dispose();
    _passwordController.dispose();
    _locationController.dispose();
    _addressController.dispose();
    _latController.dispose();
    _lngController.dispose();
    super.dispose();
  }

  Future<void> _triggerScan() async {
    if (_isScanning) return;
    setState(() => _isScanning = true);

    if (kIsWeb) {
      final devs = await _bleService.scanForHardwareDevices(triggerWebBle: true);
      if (mounted) {
        setState(() {
          _isScanning = false;
          _mergeDevices(devs);
        });
      }
      return;
    }

    // Native Flutter trên iOS / Android
    try {
      // Đợi CBCentralManager của iOS khởi tạo xong (từ unknown sang on) tối đa 3s
      final currentState = await FlutterBluePlus.adapterState
          .where((s) => s == BluetoothAdapterState.on)
          .first
          .timeout(const Duration(seconds: 3), onTimeout: () => FlutterBluePlus.adapterStateNow);

      if (mounted) {
        setState(() => _adapterState = currentState);
      }

      if (currentState == BluetoothAdapterState.on) {
        if (FlutterBluePlus.isScanningNow) {
          await FlutterBluePlus.stopScan();
        }

        _scanResultSub?.cancel();
        _scanResultSub = FlutterBluePlus.scanResults.listen(_processNativeScanResults);
        _processNativeScanResults(FlutterBluePlus.lastScanResults);

        await FlutterBluePlus.startScan(
          timeout: const Duration(seconds: 15),
          androidUsesFineLocation: false,
        );
      } else {
        debugPrint("Bluetooth state is not ON: $currentState");
      }
    } catch (e) {
      debugPrint("Native startScan error: $e");
    } finally {
      // Dò thêm thiết bị qua Gateway / SoftAP Wi-Fi đồng thời
      final devs = await _bleService.scanForHardwareDevices(triggerWebBle: false);
      if (mounted) {
        setState(() {
          _isScanning = false;
          _mergeDevices(devs);
        });
      }
    }
  }

  void _mergeDevices(List<DiscoveredHardwareBLE> incoming) {
    for (final d in incoming) {
      final idx = _discoveredDevices.indexWhere((x) => x.hardwareId.toLowerCase() == d.hardwareId.toLowerCase());
      if (idx >= 0) {
        _discoveredDevices[idx] = d;
      } else {
        _discoveredDevices.add(d);
      }
    }
    if (_selectedDevice == null && _discoveredDevices.isNotEmpty) {
      _selectedDevice = _discoveredDevices.first;
    }
  }

  void _startContinuousBleScanning() {
    _autoDiscoveryTimer?.cancel();
    _isScanning = true;
    _runSingleScanCycle();
    _autoDiscoveryTimer = Timer.periodic(const Duration(milliseconds: 2500), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (!_isProvisioning) {
        _runSingleScanCycle();
      }
    });
  }

  void _processNativeScanResults(List<ScanResult> results) {
    if (!mounted) return;
    final targetId = _qrCodeController.text.trim();
    final List<DiscoveredHardwareBLE> list = List.from(_discoveredDevices);
    bool changed = false;

    for (final r in results) {
      final adv = r.advertisementData;
      final rawName = (r.device.platformName.isNotEmpty ? r.device.platformName : adv.advName).trim();
      final serviceUuids = adv.serviceUuids.map((u) => u.toString().toLowerCase()).toList();

      final matchedProfile = DeviceProvisioningCatalog.resolveProfile(
        rawName: rawName,
        advertisedUuids: serviceUuids,
      );
      final bool isRecognized = matchedProfile.matches(rawName: rawName, advertisedUuids: serviceUuids);
      final bool isTargetMatch = targetId.isNotEmpty &&
          (rawName.toLowerCase() == targetId.toLowerCase() ||
           r.device.remoteId.str.toLowerCase() == targetId.toLowerCase());

      final bool isAustec = isRecognized || isTargetMatch;
      // Chấp nhận mọi thiết bị Austec/ESP32 hoặc thiết bị BLE có tên xung quanh
      if (isAustec || rawName.isNotEmpty) {
        final devId = rawName.isNotEmpty ? rawName : (targetId.isNotEmpty ? targetId : r.device.remoteId.str);
        final idx = list.indexWhere((d) => d.hardwareId.toLowerCase() == devId.toLowerCase());
        final newDev = DiscoveredHardwareBLE(
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
        );
        if (idx >= 0) {
          list[idx] = newDev;
        } else {
          if (isAustec) {
            list.insert(0, newDev);
          } else {
            list.add(newDev);
          }
          changed = true;
        }
      }
    }

    if (changed || list.length != _discoveredDevices.length) {
      setState(() {
        _discoveredDevices = list;
        if (_selectedDevice == null && list.isNotEmpty) {
          _selectedDevice = list.first;
        }
      });
    }
  }

  Future<void> _runSingleScanCycle() async {
    final targetId = _qrCodeController.text.trim();
    final devices = await _bleService.scanForHardwareDevices(
      targetHardwareId: targetId.isNotEmpty ? targetId : null,
      triggerWebBle: false,
    );

    if (mounted) {
      setState(() {
        _isScanning = false;
        _mergeDevices(devices);
      });
    }
  }

  Future<void> _detectCurrentWifi() async {
    setState(() => _isScanningWifi = true);
    try {
      final res = await http.get(Uri.parse('${ApiConfig.baseUrl}/api/wifi/current')).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true) {
          final ssid = (data['currentSsid'] ?? '').toString();
          final networks = (data['networks'] as List?)?.map((e) => e.toString()).toList() ?? [];
          final bIp = (data['brokerIp'] ?? '').toString();
          final bPort = (data['brokerPort'] as num?)?.toInt() ?? 1883;

          if (mounted) {
            setState(() {
              _isScanningWifi = false;
              _currentWifiSsid = ssid;
              _availableNetworks = networks;
              _brokerIp = bIp.isNotEmpty ? bIp : (Uri.tryParse(ApiConfig.baseUrl)?.host ?? '');
              _brokerPort = bPort;
              if (_ssidController.text.isEmpty && ssid.isNotEmpty) {
                _ssidController.text = ssid;
              }
            });
            return;
          }
        }
      }
    } catch (_) {}

    if (mounted) {
      setState(() {
        _isScanningWifi = false;
      });
    }
  }

  /// Lấy tọa độ GPS chính xác trực tiếp từ điện thoại của người dùng (Xin quyền OS chuẩn ngay khi mở)
  Future<void> _getCurrentGpsLocation({bool promptIfDenied = true, bool showSuccessSnackbar = false}) async {
    setState(() => _isGettingLocation = true);
    try {
      final result = await getDeviceGpsLocation(requestPermissionIfDenied: promptIfDenied);

      if (result.success && result.coordinates != null && mounted) {
        final coords = result.coordinates!;
        setState(() {
          _latController.text = coords.lat.toStringAsFixed(6);
          _lngController.text = coords.lng.toStringAsFixed(6);
          if (coords.address != null && coords.address!.isNotEmpty) {
            _addressController.text = coords.address!;
          }
        });

        if (showSuccessSnackbar) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text("Đã lấy tọa độ GPS vệ tinh điện thoại: ${coords.lat.toStringAsFixed(5)}, ${coords.lng.toStringAsFixed(5)}"),
              backgroundColor: AppTheme.emeraldSuccess,
              duration: const Duration(seconds: 3),
            ),
          );
        }
        return;
      }

      if (promptIfDenied && mounted) {
        if (result.needsOpenSettings) {
          _showLocationSettingsDialog(result.errorMessage ?? "Vui lòng bật định vị GPS trong Cài đặt của điện thoại để lấy tọa độ chính xác.");
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result.errorMessage ?? "Không thể lấy vị trí GPS! Hãy kiểm tra quyền vị trí trên máy."),
              backgroundColor: AppTheme.roseDanger,
              duration: const Duration(seconds: 4),
            ),
          );
        }
      }
    } catch (e) {
      debugPrint("Lỗi lấy tọa độ từ thiết bị/điện thoại: $e");
      if (promptIfDenied && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Không thể xác định vị trí hiện tại. Vui lòng thử lại!"),
            backgroundColor: AppTheme.roseDanger,
            duration: Duration(seconds: 4),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isGettingLocation = false);
    }
  }

  void _showLocationSettingsDialog(String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: AppTheme.amberWarning, width: 1.5),
        ),
        title: const Row(
          children: [
            Icon(Icons.location_off_rounded, color: AppTheme.amberWarning, size: 24),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                "Yêu Cầu Bật Định Vị GPS",
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Text(
          message,
          style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Đóng", style: TextStyle(color: AppTheme.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.cyanAccent,
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final opened = await Geolocator.openAppSettings();
                if (!opened) {
                  await Geolocator.openLocationSettings();
                }
              } catch (_) {
                await Geolocator.openLocationSettings();
              }
            },
            child: const Text("Mở Cài Đặt", style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _openWifiPickerSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => WifiPickerSheet(
        availableNetworks: _availableNetworks,
        currentWifiSsid: _currentWifiSsid,
        selectedSsid: _ssidController.text,
        isScanning: _isScanningWifi,
        onRefresh: _detectCurrentWifi,
        onSelectNetwork: (ssid) {
          setState(() => _ssidController.text = ssid);
        },
      ),
    );
  }

  Future<void> _runProvisioningPipeline() async {
    // 1. Kiểm tra thiết bị BLE đã được chọn
    if (_selectedDevice == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Vui lòng chọn thiết bị BLE cần ghép nối từ danh sách phía trên."),
          backgroundColor: AppTheme.roseDanger,
          duration: Duration(seconds: 3),
        ),
      );
      return;
    }

    final ssid = _ssidController.text.trim();
    final pass = _passwordController.text;
    final location = _locationController.text.trim();
    final address = _addressController.text.trim();
    final latStr = _latController.text.trim();
    final lngStr = _lngController.text.trim();

    // 2. Kiểm tra tính hợp lệ của Wi-Fi (SSID)
    if (ssid.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Vui lòng chọn hoặc nhập tên mạng Wi-Fi (SSID)."),
          backgroundColor: AppTheme.roseDanger,
        ),
      );
      return;
    }

    // 2.1. Cảnh báo mạng 5GHz không tương thích bo mạch ESP32
    final upperSsid = ssid.toUpperCase();
    if (upperSsid.contains('5G') || upperSsid.contains('5GHZ')) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Cảnh báo: Mạng Wi-Fi '$ssid' có vẻ là băng tần 5GHz. Bo mạch ESP32 chỉ hỗ trợ sóng 2.4GHz! Vui lòng chọn mạng Wi-Fi 2.4GHz để ghép nối thành công."),
          backgroundColor: AppTheme.amberWarning,
          duration: const Duration(seconds: 4),
        ),
      );
      return;
    }

    // 2.2. Kiểm tra ký tự phân tách đặc biệt (tránh làm vỡ cú pháp nạp của bo mạch)
    if (ssid.contains(',') || ssid.contains('/') || pass.contains(',') || pass.contains('/')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Tên Wi-Fi hoặc mật khẩu không được chứa dấu phẩy ',' hoặc gạch chéo '/' vì sẽ làm sai cú pháp phân tích của vi điều khiển ESP32."),
          backgroundColor: AppTheme.roseDanger,
          duration: Duration(seconds: 4),
        ),
      );
      return;
    }

    // 3. Kiểm tra mật khẩu Wi-Fi
    if (pass.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Vui lòng nhập mật khẩu Wi-Fi."),
          backgroundColor: AppTheme.roseDanger,
        ),
      );
      return;
    }

    if (pass.length < 8 || pass.length > 63) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Mật khẩu Wi-Fi không hợp lệ! Chuẩn bảo mật WPA2 yêu cầu từ 8 đến 63 ký tự."),
          backgroundColor: AppTheme.roseDanger,
        ),
      );
      return;
    }

    // 3.1. Kiểm tra tính hợp lệ & kết nối Wi-Fi TRƯỚC TẤT CẢ CÁC BƯỚC (Trước khi kết nối BLE với thiết bị)
    final wifiPreCheck = await _bleService.checkWifiValidity(ssid: ssid, password: pass);
    if (wifiPreCheck != null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Kiểm tra Wi-Fi thất bại: $wifiPreCheck"),
            backgroundColor: AppTheme.roseDanger,
            duration: const Duration(seconds: 4),
          ),
        );
      }
      return;
    }

    // 4. Kiểm tra vị trí lắp đặt
    if (location.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Vui lòng nhập vị trí / khu vực lắp đặt (ví dụ: Cửa chính, Tầng 1, v.v.)."),
          backgroundColor: AppTheme.roseDanger,
        ),
      );
      return;
    }

    // 5. Kiểm tra thông tin GPS bắt buộc
    if (address.isEmpty || latStr.isEmpty || lngStr.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Chưa có thông tin tọa độ GPS! Đang tự động xin quyền và lấy vị trí, vui lòng đợi trong giây lát..."),
          backgroundColor: AppTheme.amberWarning,
          duration: Duration(seconds: 3),
        ),
      );
      await _getCurrentGpsLocation(promptIfDenied: true, showSuccessSnackbar: false);
      // Kiểm tra lại sau khi thử lấy GPS
      if (_latController.text.trim().isEmpty || _lngController.text.trim().isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("Không thể lấy tọa độ GPS! Vui lòng ấn nút 'Lấy GPS' hoặc bật định vị trên máy."),
              backgroundColor: AppTheme.roseDanger,
              duration: Duration(seconds: 4),
            ),
          );
        }
        return;
      }
    }

    _progressSmoothTimer?.cancel();
    setState(() {
      _isProvisioning = true;
      _provisioningProgress = 0.01;
      _targetProgress = 0.15;
      _provisioningStep = "Giai đoạn 1/3: Đang kiểm tra tính hợp lệ & kết nối mạng Wi-Fi [$ssid]...";
      _pairingResult = null;
    });

    StateSetter? dialogSetState;

    // Timer chạy mượt mà từng 1% một (0% -> 100%)
    _progressSmoothTimer = Timer.periodic(const Duration(milliseconds: 32), (timer) {
      if (!mounted || !_isProvisioning) {
        timer.cancel();
        return;
      }
      if (_provisioningProgress < _targetProgress) {
        final next = (_provisioningProgress + 0.01).clamp(0.0, 1.0);
        final rounded = double.parse(next.toStringAsFixed(2));
        setState(() {
          _provisioningProgress = rounded;
        });
        dialogSetState?.call(() {});
      } else if (_provisioningProgress >= 1.0 && _pairingResult != null) {
        timer.cancel();
      }
    });

    final locationStr = _locationController.text.trim().isNotEmpty ? _locationController.text.trim() : "Khu vực chính";
    final addressStr = _addressController.text.trim().isNotEmpty ? _addressController.text.trim() : locationStr;
    final double lat = double.tryParse(_latController.text.trim()) ?? 21.028511;
    final double lng = double.tryParse(_lngController.text.trim()) ?? 105.854167;

    _bleService.provisionDevice(
      targetDevice: _selectedDevice!,
      wifiSsid: ssid,
      wifiPassword: pass,
      location: locationStr,
      address: addressStr,
      lat: lat,
      lng: lng,
      method: _selectedMethod,
      brokerIp: _brokerIp,
      brokerPort: _brokerPort,
      isCancelled: () => !_isProvisioning,
      onProgress: (step, progress) {
        if (mounted && _isProvisioning) {
          setState(() {
            _provisioningStep = step;
            _targetProgress = progress;
          });
          dialogSetState?.call(() {});
        }
      },
    ).then((result) async {
      if (mounted && _isProvisioning) {
        if (!result.success) {
          _progressSmoothTimer?.cancel();
          setState(() {
            _isProvisioning = false;
            _pairingResult = result;
          });
          dialogSetState?.call(() {});
          return;
        }

        // Tăng dần 1% một chạm 100%
        setState(() {
          _targetProgress = 1.0;
          _provisioningStep = "Ghép nối thiết bị thành công 100%!";
        });
        dialogSetState?.call(() {});

        while (mounted && _isProvisioning && _provisioningProgress < 1.0) {
          await Future.delayed(const Duration(milliseconds: 30));
        }

        if (mounted) {
          _progressSmoothTimer?.cancel();
          setState(() {
            _isProvisioning = false;
            _provisioningProgress = 1.0;
            _pairingResult = result;
          });
          dialogSetState?.call(() {});
        }
      }
    }).catchError((err) {
      if (mounted && _isProvisioning) {
        _progressSmoothTimer?.cancel();
        setState(() {
          _isProvisioning = false;
          _pairingResult = PairingResult(
            success: false,
            hardwareId: _selectedDevice?.hardwareId ?? "",
            modelName: _selectedDevice?.modelName ?? "",
            ownerName: "",
            warrantyCode: "",
            warrantyUntil: "",
            errorMessage: "Lỗi ghép nối thiết bị: $err",
          );
        });
        dialogSetState?.call(() {});
      }
    });

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) {
          dialogSetState = setDialogState;
          return PairingProgressDialog(
            isProvisioning: _isProvisioning,
            provisioningProgress: _provisioningProgress,
            provisioningStep: _provisioningStep,
            pairingResult: _pairingResult,
            wifiSsid: _ssidController.text,
            onCancel: () {
              _progressSmoothTimer?.cancel();
              setState(() {
                _isProvisioning = false;
                _provisioningProgress = 0.0;
                _pairingResult = null;
              });
              Navigator.of(ctx).pop();
            },
            onDone: () async {
              await IoTGatewayClient().fetchDevicesFromBackend();
              if (mounted) {
                Navigator.of(context).pop(true);
              }
            },
            onControlDoor: (hwId) async {
              await IoTGatewayClient().fetchDevicesFromBackend();
              DeviceItem? dev = IoTGatewayClient().findByHardwareId(hwId);
              if (dev == null) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text("Không tìm thấy thông tin thiết bị [$hwId] từ máy chủ CSDL."),
                      backgroundColor: AppTheme.roseDanger,
                    ),
                  );
                }
                return;
              }

              if (mounted) {
                if (dev.category == DeviceCategory.rollerDoor) {
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(builder: (context) => RollerDoorControlScreen(device: dev)),
                  );
                } else {
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(builder: (context) => DeviceDetailScreen(device: dev)),
                  );
                }
              }
            },
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text("Ghép Nối Thiết Bị IoT", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // BLE Devices Discovered List
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text("THIẾT BỊ BLE TÌM THẤY", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                TextButton.icon(
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    visualDensity: VisualDensity.compact,
                    backgroundColor: AppTheme.cyanAccent.withValues(alpha: 0.12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: _isScanning ? null : _triggerScan,
                  icon: _isScanning
                      ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.cyanAccent))
                      : const Icon(Icons.refresh, size: 14, color: AppTheme.cyanAccent),
                  label: Text(
                    _isScanning ? "Đang quét..." : "Quét Lại BLE",
                    style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Banner cảnh báo trạng thái Bluetooth trên điện thoại
            if (!kIsWeb && _adapterState == BluetoothAdapterState.off)
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.amberWarning.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.amberWarning),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.bluetooth_disabled, color: AppTheme.amberWarning, size: 20),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        "Bluetooth trên điện thoại đang TẮT. Vui lòng bật Bluetooth trong phần Cài đặt máy (không chỉ vuốt Control Center).",
                        style: TextStyle(color: Colors.white, fontSize: 11),
                      ),
                    ),
                  ],
                ),
              ),

            if (!kIsWeb && _adapterState == BluetoothAdapterState.unauthorized)
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.roseDanger.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.roseDanger),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.security, color: AppTheme.roseDanger, size: 20),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        "Ứng dụng chưa được cấp quyền Bluetooth. Vui lòng vào Cài đặt -> Austec -> Bật quyền Bluetooth.",
                        style: TextStyle(color: Colors.white, fontSize: 11),
                      ),
                    ),
                  ],
                ),
              ),

            if (_discoveredDevices.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: AppTheme.glassBox(radius: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _isScanning
                          ? "Đang dò tìm sóng Bluetooth thiết bị Austec gần bạn..."
                          : "Chưa bắt được sóng Bluetooth nào gần bạn.",
                      style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      "Mẹo: Hãy chắc chắn bo mạch ESP32 đã cấp nguồn. Nếu là thiết bị mới hoặc vừa reset (giữ nút 10 giây), bo mạch sẽ phát sóng liên tục.",
                      style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontStyle: FontStyle.italic),
                    ),
                  ],
                ),
              )
            else
              Column(
                children: _discoveredDevices.map((dev) {
                  final isSelected = _selectedDevice?.hardwareId == dev.hardwareId;
                  final accent = dev.profile.accentColor;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      color: isSelected ? accent.withValues(alpha: 0.15) : AppTheme.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: isSelected ? accent : AppTheme.cardBorder),
                    ),
                    child: ListTile(
                      dense: true,
                      leading: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: accent.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: accent.withValues(alpha: 0.3)),
                        ),
                        child: Icon(dev.profile.icon, color: accent, size: 20),
                      ),
                      title: Row(
                        children: [
                          Expanded(
                            child: Text(
                              dev.modelName,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: accent.withValues(alpha: 0.18),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: accent.withValues(alpha: 0.45)),
                            ),
                            child: Text(
                              dev.category == DeviceCategory.camera
                                  ? "CAMERA AI"
                                  : dev.category == DeviceCategory.rollerDoor
                                      ? "CỬA CUỐN"
                                      : "THIẾT BỊ",
                              style: TextStyle(
                                color: accent,
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                      subtitle: Text(
                        "ID: ${dev.hardwareId} • Sóng: ${dev.rssi} dBm",
                        style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
                      ),
                      trailing: isSelected ? Icon(Icons.check_circle, color: accent, size: 20) : null,
                      onTap: () => setState(() => _selectedDevice = dev),
                    ),
                  );
                }).toList(),
              ),

            const SizedBox(height: 18),

            // Wi-Fi Configuration Card
            const Text("CẤU HÌNH MẠNG WI-FI 2.4GHZ", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),

            Container(
              padding: const EdgeInsets.all(14),
              decoration: AppTheme.glassBox(radius: 14),
              child: Column(
                children: [
                  TextField(
                    controller: _ssidController,
                    readOnly: true,
                    onTap: _openWifiPickerSheet,
                    decoration: InputDecoration(
                      labelText: "Tên mạng Wi-Fi (SSID)",
                      hintText: "Chọn mạng Wi-Fi",
                      suffixIcon: IconButton(icon: const Icon(Icons.arrow_drop_down), onPressed: _openWifiPickerSheet),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    decoration: InputDecoration(
                      labelText: "Mật khẩu Wi-Fi",
                      hintText: "Nhập mật khẩu Wi-Fi",
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword ? Icons.visibility_off : Icons.visibility,
                          size: 20,
                          color: AppTheme.textMuted,
                        ),
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),

            // Vị trí lắp đặt thiết bị
            const Text("VỊ TRÍ / KHU VỰC LẮP ĐẶT", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),

            Container(
              padding: const EdgeInsets.all(14),
              decoration: AppTheme.glassBox(radius: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: _locationController,
                    decoration: const InputDecoration(
                      labelText: "Vị trí lắp đặt",
                      prefixIcon: Icon(Icons.meeting_room_outlined, color: AppTheme.cyanAccent, size: 20),
                      hintText: "Nhập vị trí lắp đặt",
                    ),
                  ),
                  const SizedBox(height: 14),
                  Divider(color: AppTheme.cardBorder, height: 1),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "TỌA ĐỘ GPS (BẢN ĐỒ DASHBOARD)",
                        style: TextStyle(color: AppTheme.cyanAccent, fontSize: 11.5, fontWeight: FontWeight.bold),
                      ),
                      InkWell(
                        onTap: _isGettingLocation
                            ? null
                            : () => _getCurrentGpsLocation(promptIfDenied: true, showSuccessSnackbar: true),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTheme.cyanAccent.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.4)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              _isGettingLocation
                                  ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 1.5, color: AppTheme.cyanAccent))
                                  : const Icon(Icons.my_location, color: AppTheme.cyanAccent, size: 14),
                              const SizedBox(width: 4),
                              const Text(
                                "Lấy GPS",
                                style: TextStyle(color: AppTheme.cyanAccent, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _addressController,
                    readOnly: true,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      labelText: "Địa chỉ lắp đặt (Tự động GPS)",
                      prefixIcon: const Icon(Icons.location_on_outlined, color: AppTheme.cyanAccent, size: 20),
                      hintText: _isGettingLocation ? "Đang tự động xác định địa chỉ..." : "Địa chỉ tự động từ GPS",
                      suffixIcon: _isGettingLocation
                          ? const Padding(
                              padding: EdgeInsets.all(12),
                              child: SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.cyanAccent),
                              ),
                            )
                          : const Icon(Icons.lock_outline, color: AppTheme.textMuted, size: 16),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _latController,
                          readOnly: true,
                          style: const TextStyle(color: Colors.white, fontSize: 13),
                          decoration: InputDecoration(
                            labelText: "Vĩ độ (Latitude)",
                            prefixIcon: const Icon(Icons.explore_outlined, color: AppTheme.cyanAccent, size: 18),
                            hintText: _isGettingLocation ? "Đang lấy..." : "Tự động GPS",
                            suffixIcon: const Icon(Icons.lock_outline, color: AppTheme.textMuted, size: 16),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: _lngController,
                          readOnly: true,
                          style: const TextStyle(color: Colors.white, fontSize: 13),
                          decoration: InputDecoration(
                            labelText: "Kinh độ (Longitude)",
                            prefixIcon: const Icon(Icons.explore_outlined, color: AppTheme.cyanAccent, size: 18),
                            hintText: _isGettingLocation ? "Đang lấy..." : "Tự động GPS",
                            suffixIcon: const Icon(Icons.lock_outline, color: AppTheme.textMuted, size: 16),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Start Provisioning Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.cyanAccent,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _runProvisioningPipeline,
                icon: const Icon(Icons.bolt, size: 20),
                label: const Text("BẮT ĐẦU GHÉP NỐI THIẾT BỊ", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
