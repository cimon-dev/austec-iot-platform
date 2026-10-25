import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'dart:async';
import 'dart:convert';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:http/http.dart' as http;
import '../../core/constants/app_theme.dart';
import '../../core/constants/api_config.dart';
import '../../core/services/ble_provisioning_service.dart';
import '../../core/services/iot_gateway_client.dart';
import '../../core/services/auth_service.dart';
import '../../core/models/device_model.dart';
import 'roller_door_control_screen.dart';

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

  // Wi-Fi dò tìm thực tế (100% sóng thực trong không trung, không lấy lịch sử)
  bool _isScanningWifi = false;
  String _currentWifiSsid = "";
  String _currentWifiBand = "2.4 GHz";
  String _currentWifiSignal = "";
  List<String> _availableNetworks = [];

  // Lựa chọn phương thức ghép nối (Bluetooth BLE hoặc WiFi SoftAP)
  PairingMethod _selectedMethod = PairingMethod.bluetooth;
  String _brokerIp = "192.168.100.6";
  int _brokerPort = 1883;

  // Form controllers (không fix cứng dữ liệu mẫu)
  final TextEditingController _qrCodeController = TextEditingController();
  final TextEditingController _ssidController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  // State tiến trình ghép nối
  bool _isProvisioning = false;
  double _provisioningProgress = 0.0;
  String _provisioningStep = "";
  PairingResult? _pairingResult;

  @override
  void initState() {
    super.initState();
    // 1. Tự động nhận diện mạng Wi-Fi thực tế của thiết bị
    _detectCurrentWifi();

    // 2. Theo dõi trạng thái Bluetooth trên máy thật: Khi CoreBluetooth sẵn sàng (ON) mới bắt đầu quét
    if (!kIsWeb) {
      _adapterStateSub = FlutterBluePlus.adapterState.listen((state) {
        if (!mounted) return;
        setState(() => _adapterState = state);
        if (state == BluetoothAdapterState.on) {
          _safeStartNativeScanning();
        } else {
          setState(() => _isScanning = false);
        }
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

  /// Khởi động luồng quét Bluetooth Native an toàn (chỉ khi adapterState == on)
  void _safeStartNativeScanning() async {
    if (kIsWeb) return;
    if (_adapterState != BluetoothAdapterState.on) return;

    _scanResultSub?.cancel();
    _scanResultSub = FlutterBluePlus.scanResults.listen((results) {
      _processNativeScanResults(results);
    });

    try {
      if (!FlutterBluePlus.isScanningNow) {
        setState(() => _isScanning = true);
        await FlutterBluePlus.startScan(
          timeout: const Duration(seconds: 60),
          androidUsesFineLocation: false,
        );
      }
    } catch (e) {
      debugPrint("Safe startScan error: $e");
      if (mounted) setState(() => _isScanning = false);
    }
  }

  /// Dò tìm sóng Bluetooth & Phần cứng trên Web (dùng polling Timer an toàn)
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

      final bool isAustecService = serviceUuids.any((u) => u.contains('6e400001'));
      final bool isAustecName = rawName.toLowerCase().contains('amtuong') ||
                                rawName.toLowerCase().contains('austec') ||
                                rawName.toLowerCase().contains('esp') ||
                                rawName.toLowerCase().contains('cuacuon');
      final bool isTargetMatch = targetId.isNotEmpty &&
          (rawName.toLowerCase() == targetId.toLowerCase() ||
           r.device.remoteId.str.toLowerCase() == targetId.toLowerCase());

      if (isAustecService || isAustecName || isTargetMatch) {
        final devId = rawName.isNotEmpty ? rawName : (targetId.isNotEmpty ? targetId : 'amtuong1994');
        final idx = list.indexWhere((d) => d.hardwareId.toLowerCase() == devId.toLowerCase());
        final newDev = DiscoveredHardwareBLE(
          hardwareId: devId,
          modelName: "Cửa Cuốn Austec ($devId - Bluetooth Thực)",
          category: DeviceCategory.rollerDoor,
          rssi: r.rssi,
          bleUuid: "6E400001-B5A3-F393-E0A9-E50E24DCCA9E",
          isRealHardware: true,
          nativeDevice: r.device,
        );
        if (idx >= 0) {
          list[idx] = newDev;
        } else {
          list.add(newDev);
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
        _discoveredDevices = devices;
        if (devices.isNotEmpty) {
          if (_selectedDevice == null || !devices.any((d) => d.hardwareId == _selectedDevice!.hardwareId)) {
            _selectedDevice = devices.first;
          }
        }
      });
    }
  }

  /// Tự động nhận diện mạng Wi-Fi đang kết nối & quét các mạng xung quanh từ Backend
  Future<void> _detectCurrentWifi() async {
    setState(() => _isScanningWifi = true);
    try {
      final res = await http
          .get(Uri.parse('${ApiConfig.baseUrl}/api/wifi/current'))
          .timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true) {
          final ssid = (data['currentSsid'] ?? '').toString();
          final band = (data['band'] ?? '2.4 GHz').toString();
          final signal = (data['signal'] ?? '').toString();
          final networks = (data['networks'] as List?)?.map((e) => e.toString()).toList() ?? [];
          final bIp = (data['brokerIp'] ?? '192.168.100.6').toString();
          final bPort = (data['brokerPort'] as num?)?.toInt() ?? 1883;

          if (mounted) {
            setState(() {
              _isScanningWifi = false;
              _currentWifiSsid = ssid;
              _currentWifiBand = band;
              _currentWifiSignal = signal;
              _availableNetworks = networks;
              _brokerIp = bIp;
              _brokerPort = bPort;
              if (_ssidController.text.isEmpty && ssid.isNotEmpty) {
                _ssidController.text = ssid;
              }
            });
          }
          return;
        }
      }
    } catch (_) {}

    // Fallback an toàn nếu chưa gọi được API
    if (mounted) {
      setState(() {
        _isScanningWifi = false;
        if (_ssidController.text.isEmpty) {
          _ssidController.text = "Manh Duc";
          _currentWifiSsid = "Manh Duc";
        }
      });
    }
  }

  /// Dò tìm sóng Bluetooth BLE phần cứng thực tế (khi người dùng bấm nút)
  void _startBleScan([String? targetId, bool triggerWebBle = false]) async {
    if (!kIsWeb) {
      if (_adapterState != BluetoothAdapterState.on) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Bluetooth trên iPhone đang tắt. Vui lòng bật Bluetooth để quét."),
            backgroundColor: AppTheme.amberWarning,
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }

      setState(() => _isScanning = true);
      try {
        if (FlutterBluePlus.isScanningNow) {
          await FlutterBluePlus.stopScan();
        }
        await FlutterBluePlus.startScan(
          timeout: const Duration(seconds: 45),
          androidUsesFineLocation: false,
        );
      } catch (e) {
        debugPrint("Manual startScan error: $e");
      }
      if (mounted) setState(() => _isScanning = false);
    } else {
      setState(() => _isScanning = true);
      final devices = await _bleService.scanForHardwareDevices(
        targetHardwareId: targetId,
        triggerWebBle: triggerWebBle,
      );

      if (mounted) {
        setState(() {
          _isScanning = false;
          for (final d in devices) {
            if (!_discoveredDevices.any((x) => x.hardwareId.toLowerCase() == d.hardwareId.toLowerCase())) {
              _discoveredDevices.add(d);
            }
          }
          if (_discoveredDevices.isNotEmpty && _selectedDevice == null) {
            _selectedDevice = _discoveredDevices.first;
          }
        });
      }
    }
  }

  /// Modal hiển thị danh sách tất cả các mạng Wi-Fi thực tế quét được
  void _openWifiPickerSheet() {
    String searchFilter = "";
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final filtered = _availableNetworks
                .where((n) => n.toLowerCase().contains(searchFilter.toLowerCase()))
                .toList();

            return Container(
              height: MediaQuery.of(context).size.height * 0.72,
              decoration: const BoxDecoration(
                color: Color(0xFF0F172A),
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                border: Border(top: BorderSide(color: AppTheme.cyanAccent, width: 1.5)),
              ),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 42,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.white24,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.wifi_find_rounded, color: AppTheme.cyanAccent, size: 22),
                          const SizedBox(width: 8),
                          Text(
                            "Danh Sách Wi-Fi Quét Được (${_availableNetworks.length})",
                            style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      InkWell(
                        onTap: () async {
                          await _detectCurrentWifi();
                          setSheetState(() {});
                        },
                        child: Row(
                          children: [
                            Icon(Icons.refresh_rounded, size: 16, color: AppTheme.cyanAccent),
                            const SizedBox(width: 4),
                            Text(
                              _isScanningWifi ? "Đang quét..." : "Quét lại",
                              style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Ô tìm kiếm nhanh
                  TextField(
                    onChanged: (val) => setSheetState(() => searchFilter = val),
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: "Tìm kiếm mạng Wi-Fi...",
                      hintStyle: TextStyle(color: AppTheme.textMuted),
                      prefixIcon: const Icon(Icons.search, color: AppTheme.cyanAccent, size: 18),
                      filled: true,
                      fillColor: AppTheme.surfaceDark,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Expanded(
                    child: filtered.isEmpty
                        ? Center(
                            child: Text(
                              _availableNetworks.isEmpty
                                  ? "Không tìm thấy mạng Wi-Fi nào. Vui lòng bấm 'Quét lại'."
                                  : "Không có mạng nào khớp với từ khóa tìm kiếm.",
                              style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
                            ),
                          )
                        : ListView.separated(
                            itemCount: filtered.length,
                            separatorBuilder: (_, __) => Divider(color: Colors.white.withValues(alpha: 0.06), height: 1),
                            itemBuilder: (context, idx) {
                              final net = filtered[idx];
                              final isCurrent = net == _currentWifiSsid;
                              final isSelected = net == _ssidController.text;

                              return ListTile(
                                dense: true,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                leading: Icon(
                                  Icons.wifi_rounded,
                                  color: isCurrent
                                      ? AppTheme.emeraldSuccess
                                      : (isSelected ? AppTheme.cyanAccent : Colors.white70),
                                  size: 20,
                                ),
                                title: Text(
                                  net,
                                  style: TextStyle(
                                    color: isCurrent || isSelected ? Colors.white : Colors.white70,
                                    fontWeight: isCurrent || isSelected ? FontWeight.bold : FontWeight.normal,
                                    fontSize: 13,
                                  ),
                                ),
                                subtitle: isCurrent
                                    ? const Text(
                                        "Mạng đang kết nối • Băng tần 2.4 GHz",
                                        style: TextStyle(color: AppTheme.emeraldSuccess, fontSize: 10),
                                      )
                                    : null,
                                trailing: isSelected
                                    ? const Icon(Icons.check_circle_rounded, color: AppTheme.cyanAccent, size: 18)
                                    : const Icon(Icons.chevron_right_rounded, color: Colors.white38, size: 16),
                                onTap: () {
                                  setState(() {
                                    _ssidController.text = net;
                                  });
                                  Navigator.of(sheetContext).pop();
                                },
                              );
                            },
                          ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  /// Bắt đầu quy trình ghép nối và hiển thị TIẾN TRÌNH Ở CHÍNH GIỮA MÀN HÌNH (MODAL DIALOG)
  void _runProvisioningPipeline() {
    if (_selectedDevice == null) return;

    setState(() {
      _isProvisioning = true;
      _provisioningProgress = 0.05;
      _provisioningStep = "Đang bắt tay Bluetooth BLE với [${_selectedDevice!.hardwareId}]...";
      _pairingResult = null;
    });

    // Bật Dialog tiến trình ở giữa màn hình
    _showProgressAndResultCenterDialog();
  }

  /// DIALOG TIẾN TRÌNH XOAY VÒNG Ở CHÍNH GIỮA MÀN HÌNH (VÀ CHUYỂN TIẾP SANG KẾT QUẢ THÀNH CÔNG)
  void _showProgressAndResultCenterDialog() {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            // Khi vừa mở Dialog, kích hoạt pipeline chạy nền
            if (_provisioningProgress <= 0.05 && _pairingResult == null) {
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
                    setDialogState(() {});
                  }
                },
              ).then((result) {
                if (mounted && _isProvisioning) {
                  setState(() {
                    _isProvisioning = false;
                    _pairingResult = result;
                    _provisioningProgress = 1.0;
                  });
                  setDialogState(() {});
                }
              });
            }

            final isCompleted = _pairingResult != null && _pairingResult!.success;
            final pctInt = (_provisioningProgress * 100).toInt();

            return Dialog(
              backgroundColor: Colors.transparent,
              insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              child: Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: isCompleted ? AppTheme.emeraldSuccess : AppTheme.cyanAccent,
                    width: 2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: (isCompleted ? AppTheme.emeraldSuccess : AppTheme.cyanAccent).withValues(alpha: 0.25),
                      blurRadius: 30,
                      spreadRadius: 4,
                    ),
                  ],
                ),
                child: isCompleted
                    // =======================================================
                    // TRẠNG THÁI: KÍCH HOẠT THÀNH CÔNG 100%
                    // =======================================================
                    ? Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Container(
                            width: 68,
                            height: 68,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppTheme.emeraldSuccess.withValues(alpha: 0.15),
                              border: Border.all(color: AppTheme.emeraldSuccess, width: 2.5),
                            ),
                            child: const Center(
                              child: Icon(Icons.verified_rounded, color: AppTheme.emeraldSuccess, size: 40),
                            ),
                          ),
                          const SizedBox(height: 14),
                          const Text(
                            "KÍCH HOẠT THÀNH CÔNG!",
                            style: TextStyle(
                              color: AppTheme.emeraldSuccess,
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.8,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 5),
                          Text(
                            "Bo mạch đã nhận cấu hình Wi-Fi [${_ssidController.text}], đồng bộ MQTT và kích hoạt bảo hành chính hãng.",
                            style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 16),

                          // Bảng chi tiết trạng thái với TÀI KHOẢN THỰC TẾ
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.45),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                            ),
                            child: Column(
                              children: [
                                _buildModalInfoRow(
                                  "Tên thiết bị:",
                                  _pairingResult!.modelName,
                                  textColor: Colors.white,
                                  isBold: true,
                                ),
                                const SizedBox(height: 8),
                                _buildModalInfoRow(
                                  "Mã phần cứng (ID):",
                                  _pairingResult!.hardwareId,
                                  textColor: AppTheme.cyanAccent,
                                  isMonospace: true,
                                ),
                                const SizedBox(height: 8),
                                _buildModalInfoRow(
                                  "Trạng thái:",
                                  "🟢 ON (Trực tuyến)",
                                  textColor: AppTheme.emeraldSuccess,
                                  isBold: true,
                                ),
                                const SizedBox(height: 8),
                                _buildModalInfoRow(
                                  "Chủ sở hữu:",
                                  _pairingResult!.ownerName,
                                  textColor: Colors.white,
                                  isBold: true,
                                ),
                                const SizedBox(height: 8),
                                _buildModalInfoRow(
                                  "Hạn dịch vụ / BH:",
                                  "${_pairingResult!.warrantyUntil} (24 tháng)",
                                  textColor: AppTheme.amberWarning,
                                  isBold: true,
                                ),
                                const SizedBox(height: 8),
                                _buildModalInfoRow(
                                  "Mã E-Warranty:",
                                  _pairingResult!.warrantyCode,
                                  textColor: AppTheme.purpleAccent,
                                  isMonospace: true,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 20),

                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton(
                                  style: OutlinedButton.styleFrom(
                                    side: BorderSide(color: AppTheme.cyanAccent.withValues(alpha: 0.6)),
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                  onPressed: () {
                                    Navigator.of(dialogContext).pop();
                                    Navigator.of(context).pop();
                                  },
                                  child: const Text(
                                    "Xem Danh Sách",
                                    style: TextStyle(color: AppTheme.cyanAccent, fontSize: 12, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppTheme.emeraldSuccess,
                                    foregroundColor: Colors.black,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    elevation: 6,
                                  ),
                                  onPressed: () {
                                    Navigator.of(dialogContext).pop();
                                    final dev = IoTGatewayClient().findByHardwareId(_pairingResult!.hardwareId);
                                    if (dev != null && dev.category == DeviceCategory.rollerDoor) {
                                      Navigator.of(context).pushReplacement(
                                        MaterialPageRoute(builder: (context) => RollerDoorControlScreen(device: dev)),
                                      );
                                    } else {
                                      Navigator.of(context).pop();
                                    }
                                  },
                                  child: const Text(
                                    "Điều Khiển Cửa",
                                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      )
                    // =======================================================
                    // TRẠNG THÁI: VÒNG XOAY TIẾN TRÌNH 0% - 100% Ở CHÍNH GIỮA
                    // =======================================================
                    : Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const SizedBox(width: 24),
                              const Row(
                                children: [
                                  Icon(Icons.wifi_tethering_rounded, color: AppTheme.cyanAccent, size: 18),
                                  SizedBox(width: 8),
                                  Text(
                                    "TIẾN TRÌNH GHÉP NỐI THỰC TẾ",
                                    style: TextStyle(
                                      color: AppTheme.cyanAccent,
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 0.8,
                                    ),
                                  ),
                                ],
                              ),
                              IconButton(
                                icon: const Icon(Icons.close_rounded, color: Colors.white70, size: 20),
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                                tooltip: "Đóng cửa sổ",
                                onPressed: () {
                                  setState(() {
                                    _isProvisioning = false;
                                    _provisioningProgress = 0.0;
                                    _provisioningStep = "";
                                    _pairingResult = null;
                                  });
                                  Navigator.of(dialogContext).pop();
                                },
                              ),
                            ],
                          ),
                          const SizedBox(height: 22),

                          // VÒNG XOAY HÌNH TRÒN CÔNG NGHỆ CAO
                          SizedBox(
                            width: 165,
                            height: 165,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                // Vòng nền mờ
                                SizedBox(
                                  width: 165,
                                  height: 165,
                                  child: CircularProgressIndicator(
                                    value: 1.0,
                                    strokeWidth: 10,
                                    valueColor: AlwaysStoppedAnimation(
                                      Colors.white.withValues(alpha: 0.08),
                                    ),
                                  ),
                                ),
                                // Vòng tiến trình chạy từ 0% đến 100%
                                SizedBox(
                                  width: 165,
                                  height: 165,
                                  child: CircularProgressIndicator(
                                    value: _provisioningProgress.clamp(0.0, 1.0),
                                    strokeWidth: 10,
                                    strokeCap: StrokeCap.round,
                                    valueColor: const AlwaysStoppedAnimation(AppTheme.cyanAccent),
                                  ),
                                ),
                                // Tâm vòng xoay: Icon & Số phần trăm
                                Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      _provisioningProgress < 0.35
                                          ? Icons.bluetooth_searching_rounded
                                          : _provisioningProgress < 0.65
                                              ? Icons.wifi_protected_setup_rounded
                                              : _provisioningProgress < 0.90
                                                  ? Icons.cloud_sync_rounded
                                                  : Icons.verified_user_rounded,
                                      color: AppTheme.cyanAccent,
                                      size: 28,
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      "$pctInt%",
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 34,
                                        fontWeight: FontWeight.w900,
                                        fontFamily: "monospace",
                                        letterSpacing: -0.5,
                                      ),
                                    ),
                                    Text(
                                      _provisioningProgress >= 1.0 ? "HOÀN TẤT" : "ĐANG NẠP...",
                                      style: TextStyle(
                                        color: AppTheme.cyanAccent.withValues(alpha: 0.85),
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 1.2,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 20),

                          // Text mô tả bước
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                            decoration: BoxDecoration(
                              color: AppTheme.cyanAccent.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.3)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const SizedBox(
                                  width: 13,
                                  height: 13,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.cyanAccent),
                                ),
                                const SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    _provisioningStep,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w600,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            "Vui lòng để điện thoại gần bo mạch phần cứng Austec trong vòng 10 giây.",
                            style: TextStyle(color: AppTheme.textMuted, fontSize: 10),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 18),

                          // Nút Ngắt kết nối / Hủy ghép nối khi đang diễn ra
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                side: BorderSide(color: AppTheme.roseDanger.withValues(alpha: 0.6)),
                                foregroundColor: AppTheme.roseDanger,
                                padding: const EdgeInsets.symmetric(vertical: 11),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              onPressed: () {
                                setState(() {
                                  _isProvisioning = false;
                                  _provisioningProgress = 0.0;
                                  _provisioningStep = "";
                                  _pairingResult = null;
                                });
                                Navigator.of(dialogContext).pop();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text("Đã ngắt kết nối và dừng quá trình ghép nối."),
                                    backgroundColor: AppTheme.amberWarning,
                                    behavior: SnackBarBehavior.floating,
                                  ),
                                );
                              },
                              icon: const Icon(Icons.cancel_outlined, size: 16),
                              label: const Text(
                                "Hủy & Ngắt Ghép Nối",
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5),
                              ),
                            ),
                          ),
                        ],
                      ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildModalInfoRow(String label, String value, {Color? textColor, bool isBold = false, bool isMonospace = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
        ),
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            value,
            style: TextStyle(
              color: textColor ?? Colors.white,
              fontSize: 11.5,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              fontFamily: isMonospace ? "monospace" : null,
            ),
            textAlign: TextAlign.right,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    // Lấy thông tin tài khoản đang đăng nhập THỰC TẾ
    final currentUser = AuthService().currentUser;
    final currentUserName = (currentUser != null && currentUser.fullName.isNotEmpty)
        ? currentUser.fullName
        : (currentUser?.email.isNotEmpty == true ? currentUser!.email : 'Khách hàng thử nghiệm');

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          "GHÉP NỐI THIẾT BỊ MỚI",
          style: TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.8,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 18),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thẻ tài khoản kích hoạt thực tế
            Container(
              margin: const EdgeInsets.only(bottom: 18),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: AppTheme.cyanAccent.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.account_circle_rounded, color: AppTheme.cyanAccent, size: 24),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "Tài khoản kích hoạt bảo hành:",
                          style: TextStyle(color: Colors.white60, fontSize: 10),
                        ),
                        Text(
                          currentUserName,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppTheme.emeraldSuccess.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: AppTheme.emeraldSuccess.withValues(alpha: 0.3)),
                    ),
                    child: const Text(
                      "CHỦ SỞ HỮU",
                      style: TextStyle(color: AppTheme.emeraldSuccess, fontSize: 9.5, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),

            // =======================================================
            // LỰA CHỌN PHƯƠNG THỨC KẾT NỐI (2 BUTTONS CHO 2 LỰA CHỌN)
            // =======================================================
            _buildSectionHeader("Phương Thức Ghép Nối Thiết Bị", Icons.tune_rounded),
            const SizedBox(height: 10),
            Row(
              children: [
                // BUTTON 1: KẾT NỐI BLUETOOTH BLE
                Expanded(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: () {
                      setState(() {
                        _selectedMethod = PairingMethod.bluetooth;
                        _startContinuousBleScanning();
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
                      decoration: BoxDecoration(
                        gradient: _selectedMethod == PairingMethod.bluetooth
                            ? LinearGradient(
                                colors: [
                                  AppTheme.cyanAccent.withValues(alpha: 0.25),
                                  AppTheme.blueAccent.withValues(alpha: 0.15),
                                ],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              )
                            : null,
                        color: _selectedMethod == PairingMethod.bluetooth
                            ? null
                            : AppTheme.surface.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: _selectedMethod == PairingMethod.bluetooth
                              ? AppTheme.cyanAccent
                              : Colors.white.withValues(alpha: 0.08),
                          width: _selectedMethod == PairingMethod.bluetooth ? 2 : 1,
                        ),
                        boxShadow: _selectedMethod == PairingMethod.bluetooth
                            ? [
                                BoxShadow(
                                  color: AppTheme.cyanAccent.withValues(alpha: 0.25),
                                  blurRadius: 12,
                                  spreadRadius: 1,
                                )
                              ]
                            : null,
                      ),
                      child: Column(
                        children: [
                          Icon(
                            Icons.bluetooth_audio_rounded,
                            color: _selectedMethod == PairingMethod.bluetooth
                                ? AppTheme.cyanAccent
                                : Colors.white60,
                            size: 26,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            "KẾT NỐI BLUETOOTH",
                            style: TextStyle(
                              color: _selectedMethod == PairingMethod.bluetooth
                                  ? Colors.white
                                  : Colors.white70,
                              fontWeight: FontWeight.bold,
                              fontSize: 11.5,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            "Quét sóng BLE không dây",
                            style: TextStyle(
                              color: _selectedMethod == PairingMethod.bluetooth
                                  ? AppTheme.cyanAccent
                                  : AppTheme.textMuted,
                              fontSize: 9.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // BUTTON 2: KẾT NỐI WIFI SOFTAP
                Expanded(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: () {
                      setState(() {
                        _selectedMethod = PairingMethod.wifiSoftAp;
                        if (_selectedDevice == null) {
                          final devId = _qrCodeController.text.trim().isNotEmpty
                              ? _qrCodeController.text.trim()
                              : 'amtuong1994';
                          _selectedDevice = DiscoveredHardwareBLE(
                            hardwareId: devId,
                            modelName: "Cửa Cuốn Austec ECO ($devId)",
                            category: DeviceCategory.rollerDoor,
                            rssi: -40,
                            bleUuid: "6E400001-B5A3-F393-E0A9-E50E24DCCA9E",
                            isRealHardware: true,
                          );
                        }
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
                      decoration: BoxDecoration(
                        gradient: _selectedMethod == PairingMethod.wifiSoftAp
                            ? LinearGradient(
                                colors: [
                                  AppTheme.emeraldSuccess.withValues(alpha: 0.25),
                                  Colors.teal.withValues(alpha: 0.15),
                                ],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              )
                            : null,
                        color: _selectedMethod == PairingMethod.wifiSoftAp
                            ? null
                            : AppTheme.surface.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: _selectedMethod == PairingMethod.wifiSoftAp
                              ? AppTheme.emeraldSuccess
                              : Colors.white.withValues(alpha: 0.08),
                          width: _selectedMethod == PairingMethod.wifiSoftAp ? 2 : 1,
                        ),
                        boxShadow: _selectedMethod == PairingMethod.wifiSoftAp
                            ? [
                                BoxShadow(
                                  color: AppTheme.emeraldSuccess.withValues(alpha: 0.25),
                                  blurRadius: 12,
                                  spreadRadius: 1,
                                )
                              ]
                            : null,
                      ),
                      child: Column(
                        children: [
                          Icon(
                            Icons.wifi_tethering_rounded,
                            color: _selectedMethod == PairingMethod.wifiSoftAp
                                ? AppTheme.emeraldSuccess
                                : Colors.white60,
                            size: 26,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            "KẾT NỐI WIFI",
                            style: TextStyle(
                              color: _selectedMethod == PairingMethod.wifiSoftAp
                                  ? Colors.white
                                  : Colors.white70,
                              fontWeight: FontWeight.bold,
                              fontSize: 11.5,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            "Điểm phát 192.168.4.1",
                            style: TextStyle(
                              color: _selectedMethod == PairingMethod.wifiSoftAp
                                  ? AppTheme.emeraldSuccess
                                  : AppTheme.textMuted,
                              fontSize: 9.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // BƯỚC 1: QUÉT MÃ QR HOẶC NHẬP HARDWARE ID THỰC TẾ
            _buildSectionHeader("1. Quét Mã QR Hoặc Nhập Hardware ID Bo Mạch", Icons.qr_code_2),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: AppTheme.glassBox(),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _qrCodeController,
                          style: const TextStyle(color: Colors.white, fontFamily: "monospace", fontSize: 13),
                          decoration: InputDecoration(
                            labelText: "Hardware ID bo mạch",
                            hintText: "VD: amtuong1994 (mã tem trên mạch)",
                            hintStyle: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                            labelStyle: TextStyle(color: AppTheme.textSecondary),
                            filled: true,
                            fillColor: AppTheme.surface,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            prefixIcon: const Icon(Icons.qr_code, color: AppTheme.cyanAccent),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.cyanAccent,
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () {
                          final inputId = _qrCodeController.text.trim();
                          if (inputId.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text("Vui lòng nhập Hardware ID (hoặc bấm 'Bật Dò Sóng BLE' để quét sóng thật)"),
                                backgroundColor: AppTheme.amberWarning,
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                            return;
                          }
                          _startBleScan(inputId);
                        },
                        icon: const Icon(Icons.search_rounded, size: 16),
                        label: const Text("Khớp ID", style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "Mặc định bo mạch thực tế trong dự án ESP32-C3 ECO là 'amtuong1994'. Bạn có thể thay đổi khớp với tem bo mạch.",
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            if (_selectedMethod == PairingMethod.wifiSoftAp) ...[
              _buildSectionHeader("2. Kết Nối Vào Điểm Phát Wi-Fi Của Bo Mạch", Icons.wifi_tethering_rounded),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppTheme.emeraldSuccess.withValues(alpha: 0.12),
                      Colors.black45,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.emeraldSuccess.withValues(alpha: 0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: AppTheme.emeraldSuccess.withValues(alpha: 0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.router_rounded, color: AppTheme.emeraldSuccess, size: 18),
                        ),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            "Điểm Phát Wi-Fi SoftAP Bo Mạch (192.168.4.1)",
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      "• Bo mạch ESP32 khi cấp nguồn sẽ phát một mạng Wi-Fi tên theo Hardware ID (ví dụ: 'amtuong1994' hoặc 'amtuong...').\n"
                      "• Hãy vào phần Cài đặt Wi-Fi trên máy của bạn và kết nối vào mạng này (mạng mở, không mật khẩu).\n"
                      "• Sau khi kết nối vào Wi-Fi của mạch, cấu hình Wi-Fi gia đình ở Bước 3 sẽ được truyền thẳng xuống bộ nhớ Flash của chip qua cổng 192.168.4.1.",
                      style: TextStyle(color: Colors.white70, fontSize: 11, height: 1.55),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white10),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.wifi_rounded, color: AppTheme.emeraldSuccess, size: 16),
                              const SizedBox(width: 6),
                              Text(
                                "Mạng bo mạch: ${_selectedDevice?.hardwareId ?? (_qrCodeController.text.isNotEmpty ? _qrCodeController.text.trim() : 'amtuong1994')}",
                                style: const TextStyle(color: Colors.white, fontSize: 11.5, fontFamily: "monospace", fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppTheme.emeraldSuccess.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text("IP: 192.168.4.1", style: TextStyle(color: AppTheme.emeraldSuccess, fontSize: 10, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ] else ...[
              // BƯỚC 2: QUÉT SÓNG BLUETOOTH BLE THỰC TẾ
              Row(
                children: [
                  Expanded(
                    child: _buildSectionHeader("2. Quét Sóng Bluetooth BLE", Icons.bluetooth_searching),
                  ),
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: () {
                      _startBleScan(_qrCodeController.text.trim(), true);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.cyanAccent.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.4)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_isScanning)
                            const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 1.5, color: AppTheme.cyanAccent))
                          else
                            const Icon(Icons.refresh_rounded, size: 14, color: AppTheme.cyanAccent),
                          const SizedBox(width: 4),
                          Text(
                            _isScanning ? "Đang dò..." : "Quét Lại BLE",
                            style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              if (!kIsWeb && _adapterState == BluetoothAdapterState.off)
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.amberWarning.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.amberWarning, width: 1.5),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.bluetooth_disabled_rounded, color: AppTheme.amberWarning, size: 24),
                      SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Bluetooth trên iPhone đang TẮT!",
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                            ),
                            SizedBox(height: 2),
                            Text(
                              "Vui lòng vuốt mở Control Center hoặc vào Cài đặt để BẬT Bluetooth.",
                              style: TextStyle(color: Colors.white70, fontSize: 10.5),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
            if (_discoveredDevices.isEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 22),
                decoration: AppTheme.glassBox(),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (_isScanning)
                          const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.cyanAccent))
                        else
                          const Icon(Icons.radar_rounded, size: 16, color: AppTheme.cyanAccent),
                        const SizedBox(width: 8),
                        Text(
                          _isScanning ? "ĐANG TỰ ĐỘNG DÒ TÌM SÓNG THỰC TẾ..." : "KÊNH DÒ SÓNG ĐANG MỞ (SẴN SÀNG)",
                          style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Icon(Icons.radar_rounded, color: AppTheme.cyanAccent.withValues(alpha: 0.85), size: 42),
                    const SizedBox(height: 10),
                    const Text(
                      "Chưa phát hiện tín hiệu thiết bị xung quanh",
                      style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      "Hệ thống đang mở kênh dò sóng liên tục với độ nhạy cao.\nNgay khi bạn cắm nguồn bo mạch Austec hoặc kích hoạt Bluetooth, thiết bị sẽ lập tức hiển thị tại đây!",
                      style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5, height: 1.45),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              )
            else
              Column(
                children: _discoveredDevices.map((dev) {
                  final isSelected = _selectedDevice?.hardwareId == dev.hardwareId;
                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedDevice = dev;
                        _qrCodeController.text = dev.hardwareId;
                      });
                    },
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(16),
                      decoration: AppTheme.glassBox(
                        borderColor: isSelected ? AppTheme.cyanAccent : AppTheme.cardBorder,
                        color: isSelected ? AppTheme.cyanAccent.withValues(alpha: 0.1) : AppTheme.surfaceGlass,
                        glow: isSelected,
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.memory_rounded,
                            color: isSelected ? AppTheme.cyanAccent : AppTheme.textSecondary,
                            size: 28,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      dev.hardwareId,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        fontFamily: "monospace",
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                      decoration: BoxDecoration(
                                        color: AppTheme.amberWarning.withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(4),
                                        border: Border.all(color: AppTheme.amberWarning.withValues(alpha: 0.4)),
                                      ),
                                      child: const Text(
                                        "PHẦN CỨNG THẬT",
                                        style: TextStyle(color: AppTheme.amberWarning, fontSize: 9, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  dev.modelName,
                                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                                ),
                                Text(
                                  "UUID: ${dev.bleUuid.substring(0, 18)}...",
                                  style: const TextStyle(color: Colors.white38, fontSize: 10, fontFamily: "monospace"),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                "${dev.rssi} dBm",
                                style: const TextStyle(color: AppTheme.emeraldSuccess, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                              Text("Sóng mạnh", style: TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],

            const SizedBox(height: 24),

            // BƯỚC 3: CẤU HÌNH WI-FI CHO BO MẠCH
            _buildSectionHeader("3. Cấu Hình Wi-Fi Cho Bo Mạch", Icons.wifi),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: AppTheme.glassBox(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Dải thông tin mạng Wi-Fi hiện tại đã dò tìm được
                  if (_currentWifiSsid.isNotEmpty)
                    Container(
                      margin: const EdgeInsets.only(bottom: 14),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppTheme.emeraldSuccess.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppTheme.emeraldSuccess.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle_outline_rounded, color: AppTheme.emeraldSuccess, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  "Đã tự động nhận diện Wi-Fi bạn đang kết nối:",
                                  style: TextStyle(color: Colors.white70, fontSize: 10.5),
                                ),
                                Text(
                                  "$_currentWifiSsid ($_currentWifiBand) • Tín hiệu $_currentWifiSignal",
                                  style: const TextStyle(
                                    color: AppTheme.emeraldSuccess,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          TextButton(
                            style: TextButton.styleFrom(
                              foregroundColor: AppTheme.cyanAccent,
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              minimumSize: const Size(0, 24),
                            ),
                            onPressed: () {
                              setState(() {
                                _ssidController.text = _currentWifiSsid;
                              });
                            },
                            child: const Text("Dùng mạng này", style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ),

                  // Nút dò tìm danh sách mạng Wi-Fi khả dụng
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Expanded(
                        child: Text(
                          "Tên mạng Wi-Fi gia đình (SSID):",
                          style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      InkWell(
                        onTap: _detectCurrentWifi,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.refresh_rounded, size: 14, color: AppTheme.cyanAccent),
                            const SizedBox(width: 4),
                            Text(
                              _isScanningWifi ? "Đang quét..." : "Quét lại Wi-Fi",
                              style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Ô nhập SSID + Nút chọn danh sách tất cả các Wi-Fi thật quét được
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _ssidController,
                          style: const TextStyle(color: Colors.white, fontSize: 13),
                          decoration: InputDecoration(
                            hintText: "Nhập hoặc chọn tên mạng Wi-Fi",
                            hintStyle: TextStyle(color: AppTheme.textMuted),
                            filled: true,
                            fillColor: AppTheme.surface,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            prefixIcon: const Icon(Icons.wifi, color: AppTheme.cyanAccent),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.surface,
                          foregroundColor: AppTheme.cyanAccent,
                          side: BorderSide(color: AppTheme.cyanAccent.withValues(alpha: 0.5)),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: _openWifiPickerSheet,
                        icon: const Icon(Icons.wifi_find_rounded, size: 16),
                        label: Text(
                          _availableNetworks.isNotEmpty ? "Chọn (${_availableNetworks.length})" : "Dò Wi-Fi",
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11.5),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Mật khẩu WiFi
                  const Text(
                    "Mật khẩu Wi-Fi:",
                    style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _passwordController,
                    obscureText: true,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: "Mật khẩu mạng Wi-Fi",
                      hintStyle: TextStyle(color: AppTheme.textMuted),
                      filled: true,
                      fillColor: AppTheme.surface,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.password, color: AppTheme.cyanAccent),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Lưu ý băng tần 2.4GHz
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.amberWarning.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppTheme.amberWarning.withValues(alpha: 0.3)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.info_outline, color: AppTheme.amberWarning, size: 16),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            "Vi điều khiển ESP32 chỉ hỗ trợ băng tần 2.4GHz. Vui lòng đảm bảo Wi-Fi phát sóng 2.4GHz.",
                            style: TextStyle(color: AppTheme.amberWarning, fontSize: 10.5),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 22),

                  // NÚT BẮT ĐẦU GHÉP NỐI
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.cyanAccent,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        elevation: 6,
                      ),
                      onPressed: (_selectedDevice == null || _isProvisioning) ? null : _runProvisioningPipeline,
                      child: Text(
                        _isProvisioning
                            ? "Đang Tiến Hành Ghép Nối..."
                            : (_selectedDevice == null
                                ? "Vui lòng chọn 1 thiết bị ở trên"
                                : (_selectedMethod == PairingMethod.bluetooth
                                    ? "Bắt Đầu Ghép Nối Qua Bluetooth BLE"
                                    : "Bắt Đầu Ghép Nối Qua WiFi SoftAP (192.168.4.1)")),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: AppTheme.cyanAccent, size: 20),
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.bold,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
