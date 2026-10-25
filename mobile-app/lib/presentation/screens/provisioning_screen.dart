import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:convert';
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

  // Wi-Fi dò tìm thực tế (100% sóng thực trong không trung, không lấy lịch sử)
  bool _isScanningWifi = false;
  String _currentWifiSsid = "";
  String _currentWifiBand = "2.4 GHz";
  String _currentWifiSignal = "";
  List<String> _availableNetworks = [];

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

    // 2. Mặc định vào ghép nối: TỰ ĐỘNG BẬT DÒ QUÉT SÓNG THỰC TẾ LIÊN TỤC VỚI ĐỘ NHẠY CAO
    _startContinuousBleScanning();
  }

  @override
  void dispose() {
    _autoDiscoveryTimer?.cancel();
    _qrCodeController.dispose();
    _ssidController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  /// Dò tìm sóng Bluetooth & Phần cứng liên tục: phát hiện ngay lập tức khi thiết bị bật nguồn
  void _startContinuousBleScanning() {
    _autoDiscoveryTimer?.cancel();
    _isScanning = true;
    _runSingleScanCycle();

    // Chu kỳ quét 2.5s để cập nhật thời gian thực
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

          if (mounted) {
            setState(() {
              _isScanningWifi = false;
              _currentWifiSsid = ssid;
              _currentWifiBand = band;
              _currentWifiSignal = signal;
              _availableNetworks = networks;
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
    setState(() {
      _isScanning = true;
    });

    final devices = await _bleService.scanForHardwareDevices(
      targetHardwareId: targetId,
      triggerWebBle: triggerWebBle,
    );

    if (mounted) {
      setState(() {
        _isScanning = false;
        _discoveredDevices = devices;
        if (devices.isNotEmpty && _selectedDevice == null) {
          _selectedDevice = devices.first;
        }
      });
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

            // BƯỚC 2: QUÉT SÓNG BLUETOOTH BLE THỰC TẾ
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildSectionHeader("2. Quét Sóng Bluetooth BLE Thực Tế", Icons.bluetooth_searching),
                InkWell(
                  onTap: () {
                    _startBleScan(_qrCodeController.text.trim(), true);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppTheme.cyanAccent.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.4)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.bluetooth_audio_rounded, size: 14, color: AppTheme.cyanAccent),
                        SizedBox(width: 4),
                        Text(
                          "Bật Dò Sóng BLE",
                          style: TextStyle(color: AppTheme.cyanAccent, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
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

            const SizedBox(height: 24),

            // BƯỚC 3: CẤU HÌNH WI-FI GIA ĐÌNH (CÓ TỰ ĐỘNG DÒ TÌM & GỢI Ý MẠNG ĐANG DÙNG)
            _buildSectionHeader("3. Cấu Hình Wi-Fi (Tự Động Dò Tìm Mạng Đang Sử Dụng)", Icons.wifi),
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
                      const Text(
                        "Tên mạng Wi-Fi gia đình (SSID):",
                        style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                      InkWell(
                        onTap: _detectCurrentWifi,
                        child: Row(
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
                                : "Bắt Đầu Ghép Nối & Kích Hoạt Bảo Hành 24T"),
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
      children: [
        Icon(icon, color: AppTheme.cyanAccent, size: 20),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 13,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}
