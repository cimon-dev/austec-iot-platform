import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'dart:async';
import 'dart:convert';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:http/http.dart' as http;
import '../../../core/constants/app_theme.dart';
import '../../../core/constants/api_config.dart';
import '../../../core/services/ble_provisioning_service.dart';
import '../../../core/services/iot_gateway_client.dart';
import '../../../core/models/device_model.dart';
import '../widgets/wifi_picker_sheet.dart';
import '../widgets/pairing_progress_dialog.dart';
import '../../devices/screens/roller_door_control_screen.dart';
import '../../devices/screens/device_detail_screen.dart';

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
  String _brokerIp = "192.168.100.6";
  int _brokerPort = 1883;

  final TextEditingController _qrCodeController = TextEditingController();
  final TextEditingController _ssidController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _isProvisioning = false;
  double _provisioningProgress = 0.0;
  String _provisioningStep = "";
  PairingResult? _pairingResult;

  @override
  void initState() {
    super.initState();
    _detectCurrentWifi();

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
      final serviceUuids = adv.serviceUuids.map((u) => u.toString().toLowerCase().replaceAll('-', '')).toList();

      final bool isAustecService = serviceUuids.any((u) => u.contains('6e400001'));
      final bool isAustecName = rawName.toLowerCase().contains('amtuong') ||
                                rawName.toLowerCase().contains('austec') ||
                                rawName.toLowerCase().contains('esp') ||
                                rawName.toLowerCase().contains('cuacuon') ||
                                rawName.toLowerCase().contains('door');
      final bool isTargetMatch = targetId.isNotEmpty &&
          (rawName.toLowerCase() == targetId.toLowerCase() ||
           r.device.remoteId.str.toLowerCase() == targetId.toLowerCase());

      final bool isAustec = isAustecService || isAustecName || isTargetMatch;
      // Chấp nhận mọi thiết bị Austec/ESP32 hoặc thiết bị BLE có tên xung quanh
      if (isAustec || rawName.isNotEmpty) {
        final devId = rawName.isNotEmpty ? rawName : (targetId.isNotEmpty ? targetId : r.device.remoteId.str);
        final idx = list.indexWhere((d) => d.hardwareId.toLowerCase() == devId.toLowerCase());
        final newDev = DiscoveredHardwareBLE(
          hardwareId: devId,
          modelName: isAustec
              ? "Cửa Cuốn Austec ($devId - Bluetooth Thực)"
              : "Thiết Bị BLE ($devId)",
          category: DeviceCategory.rollerDoor,
          rssi: r.rssi,
          bleUuid: isAustecService ? "6E400001-B5A3-F393-E0A9-E50E24DCCA9E" : "",
          isRealHardware: true,
          nativeDevice: r.device,
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
          final bIp = (data['brokerIp'] ?? '192.168.100.6').toString();
          final bPort = (data['brokerPort'] as num?)?.toInt() ?? 1883;

          if (mounted) {
            setState(() {
              _isScanningWifi = false;
              _currentWifiSsid = ssid;
              _availableNetworks = networks;
              _brokerIp = bIp;
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

  void _runProvisioningPipeline() {
    if (_selectedDevice == null) return;

    setState(() {
      _isProvisioning = true;
      _provisioningProgress = 0.05;
      _provisioningStep = "Đang kết nối Bluetooth BLE với [${_selectedDevice!.hardwareId}]...";
      _pairingResult = null;
    });

    _bleService.provisionDevice(
      targetDevice: _selectedDevice!,
      wifiSsid: _ssidController.text.trim(),
      wifiPassword: _passwordController.text,
      method: _selectedMethod,
      brokerIp: _brokerIp,
      brokerPort: _brokerPort,
      isCancelled: () => !_isProvisioning,
      onProgress: (step, progress) {
        if (mounted && _isProvisioning) {
          setState(() {
            _provisioningStep = step;
            _provisioningProgress = progress;
          });
        }
      },
    ).then((result) {
      if (mounted && _isProvisioning) {
        setState(() {
          _isProvisioning = false;
          _pairingResult = result;
          _provisioningProgress = 1.0;
        });
      }
    });

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => PairingProgressDialog(
        isProvisioning: _isProvisioning,
        provisioningProgress: _provisioningProgress,
        provisioningStep: _provisioningStep,
        pairingResult: _pairingResult,
        wifiSsid: _ssidController.text,
        onCancel: () {
          setState(() {
            _isProvisioning = false;
            _provisioningProgress = 0.0;
            _pairingResult = null;
          });
          Navigator.of(ctx).pop();
        },
        onControlDoor: (hwId) {
          final dev = IoTGatewayClient().findByHardwareId(hwId);
          if (dev != null) {
            if (dev.category == DeviceCategory.rollerDoor) {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (context) => RollerDoorControlScreen(device: dev)),
              );
            } else {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (context) => DeviceDetailScreen(device: dev)),
              );
            }
          } else {
            Navigator.of(context).pop();
          }
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
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      color: isSelected ? AppTheme.cyanAccent.withValues(alpha: 0.15) : AppTheme.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: isSelected ? AppTheme.cyanAccent : AppTheme.cardBorder),
                    ),
                    child: ListTile(
                      dense: true,
                      leading: const Icon(Icons.bluetooth, color: AppTheme.cyanAccent),
                      title: Text(dev.modelName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      subtitle: Text("ID: ${dev.hardwareId} • RSSI: ${dev.rssi} dBm", style: const TextStyle(fontSize: 10, color: AppTheme.textMuted)),
                      trailing: isSelected ? const Icon(Icons.check_circle, color: AppTheme.cyanAccent, size: 20) : null,
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
                      suffixIcon: IconButton(icon: const Icon(Icons.arrow_drop_down), onPressed: _openWifiPickerSheet),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: "Mật khẩu Wi-Fi",
                      prefixIcon: Icon(Icons.lock_outline, size: 18),
                    ),
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
                onPressed: _selectedDevice != null ? _runProvisioningPipeline : null,
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
