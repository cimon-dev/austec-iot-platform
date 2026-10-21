import 'package:flutter/material.dart';
import '../../core/constants/app_theme.dart';
import '../../core/services/ble_provisioning_service.dart';

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

  // Form controllers
  final TextEditingController _qrCodeController = TextEditingController(text: "AT-DOOR-99142C");
  final TextEditingController _ssidController = TextEditingController(text: "Nha_Austec_5G");
  final TextEditingController _passwordController = TextEditingController(text: "austec@2026");

  bool _isProvisioning = false;
  double _provisioningProgress = 0.0;
  String _provisioningStep = "";
  PairingResult? _pairingResult;

  @override
  void initState() {
    super.initState();
    _startBleScan();
  }

  void _startBleScan([String? targetId]) async {
    setState(() {
      _isScanning = true;
      _discoveredDevices = [];
    });

    final devices = await _bleService.scanForHardwareDevices(targetHardwareId: targetId);

    if (mounted) {
      setState(() {
        _isScanning = false;
        _discoveredDevices = devices;
      });
    }
  }

  void _runProvisioningPipeline() async {
    if (_selectedDevice == null) return;

    setState(() {
      _isProvisioning = true;
      _provisioningProgress = 0.1;
      _provisioningStep = "Khởi tạo tiến trình ghép nối...";
    });

    final result = await _bleService.provisionDevice(
      targetDevice: _selectedDevice!,
      wifiSsid: _ssidController.text,
      wifiPassword: _passwordController.text,
      onProgress: (step, progress) {
        if (mounted) {
          setState(() {
            _provisioningStep = step;
            _provisioningProgress = progress;
          });
        }
      },
    );

    if (mounted) {
      setState(() {
        _isProvisioning = false;
        _pairingResult = result;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
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
            // STEP 1: SCAN QR CODE
            _buildSectionHeader("1. Quét Mã QR Tem Xuất Xưởng (Hardware ID)", Icons.qr_code_2),
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
                          style: const TextStyle(color: Colors.white, fontFamily: "monospace"),
                          decoration: InputDecoration(
                            labelText: "Hardware ID (quét từ tem)",
                            labelStyle: TextStyle(color: AppTheme.textSecondary),
                            filled: true,
                            fillColor: AppTheme.surface,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            prefixIcon: const Icon(Icons.qr_code, color: AppTheme.cyanAccent),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.cyanAccent,
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () {
                          _startBleScan(_qrCodeController.text.trim());
                        },
                        child: const Text("Xác thực", style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "Mỗi bo mạch Austec được định danh duy nhất bằng Hardware ID in chìm trên tem bảo hành chống giả.",
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // STEP 2: BLE DISCOVERY
            _buildSectionHeader("2. Quét Sóng Bluetooth BLE (Khớp UUID)", Icons.bluetooth_searching),
            const SizedBox(height: 10),
            if (_isScanning)
              Container(
                padding: const EdgeInsets.all(20),
                decoration: AppTheme.glassBox(),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.cyanAccent)),
                    const SizedBox(width: 12),
                    Text("Đang quét radar BLE xung quanh...", style: TextStyle(color: AppTheme.textSecondary)),
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
                      });
                    },
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(16),
                      decoration: AppTheme.glassBox(
                        borderColor: isSelected ? AppTheme.cyanAccent : AppTheme.cardBorder,
                        color: isSelected ? AppTheme.cyanAccent.withOpacity(0.08) : AppTheme.surfaceGlass,
                        glow: isSelected,
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.devices_other,
                            color: isSelected ? AppTheme.cyanAccent : AppTheme.textSecondary,
                            size: 28,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
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
                                Text(
                                  dev.modelName,
                                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
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

            // STEP 3: CONFIGURE HOME WIFI & PROVISION
            _buildSectionHeader("3. Cấu Hình Mạng WiFi Gia Đình & Kích Hoạt", Icons.wifi),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: AppTheme.glassBox(),
              child: Column(
                children: [
                  TextField(
                    controller: _ssidController,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: "Tên mạng WiFi (2.4GHz / 5GHz)",
                      labelStyle: TextStyle(color: AppTheme.textSecondary),
                      filled: true,
                      fillColor: AppTheme.surface,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.wifi, color: AppTheme.cyanAccent),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _passwordController,
                    obscureText: true,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: "Mật khẩu WiFi",
                      labelStyle: TextStyle(color: AppTheme.textSecondary),
                      filled: true,
                      fillColor: AppTheme.surface,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.password, color: AppTheme.cyanAccent),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Provision Button or Progress
                  if (_isProvisioning)
                    Column(
                      children: [
                        LinearProgressIndicator(
                          value: _provisioningProgress,
                          backgroundColor: AppTheme.surface,
                          valueColor: const AlwaysStoppedAnimation(AppTheme.cyanAccent),
                          minHeight: 8,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          _provisioningStep,
                          style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ],
                    )
                  else if (_pairingResult != null)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: AppTheme.glassBox(
                        color: AppTheme.emeraldSuccess.withOpacity(0.12),
                        borderColor: AppTheme.emeraldSuccess,
                      ),
                      child: Column(
                        children: [
                          const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.verified, color: AppTheme.emeraldSuccess, size: 24),
                              SizedBox(width: 8),
                              Text(
                                "KÍCH HOẠT THÀNH CÔNG 100%",
                                style: TextStyle(color: AppTheme.emeraldSuccess, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            "Thiết bị: ${_pairingResult!.hardwareId} (${_pairingResult!.modelName})",
                            style: const TextStyle(color: Colors.white, fontSize: 12),
                          ),
                          Text(
                            "Mã bảo hành điện tử: ${_pairingResult!.warrantyCode}",
                            style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 12, fontFamily: "monospace"),
                          ),
                          Text(
                            "Hạn bảo hành chính hãng: ${_pairingResult!.warrantyUntil}",
                            style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                          ),
                          const SizedBox(height: 14),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.emeraldSuccess,
                              foregroundColor: Colors.black,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: () => Navigator.of(context).pop(),
                            child: const Text("Về Màn Hình Chính Điều Khiển", style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    )
                  else
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
                        onPressed: _selectedDevice == null ? null : _runProvisioningPipeline,
                        child: Text(
                          _selectedDevice == null
                              ? "Vui lòng chọn 1 thiết bị BLE ở trên"
                              : "Bắt Đầu Ghép Nối & Kích Hoạt Bảo Hành 24T",
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
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
