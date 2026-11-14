import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/models/device_model.dart';
import '../../../core/services/iot_gateway_client.dart';
import 'device_detail_screen.dart';
import 'device_settings_screen.dart';
import '../../provisioning/screens/provisioning_screen.dart';
import 'roller_door_control_screen.dart';
import 'bms_landscape_screen.dart';
import 'smartmetter_detail_screen.dart';
import '../widgets/camera_webrtc_player.dart';

class CategoryDeviceListSheet extends StatefulWidget {
  final CategoryMeta categoryMeta;

  const CategoryDeviceListSheet({super.key, required this.categoryMeta});

  @override
  State<CategoryDeviceListSheet> createState() => _CategoryDeviceListSheetState();
}

class _CategoryDeviceListSheetState extends State<CategoryDeviceListSheet> with WidgetsBindingObserver {
  final IoTGatewayClient _gateway = IoTGatewayClient();
  bool _isProcessing = false;

  // Quản lý phân trang & luồng trực tiếp Camera (4-6 thiết bị / lần)
  final ScrollController _scrollController = ScrollController();
  final Set<String> _activeStreamingCameras = {};
  final List<DeviceItem> _pagedCameras = [];
  bool _isLoadingCameras = false;
  bool _hasMoreCameras = true;
  int _cameraOffset = 0;
  static const int _batchSize = 5; // 4-6 camera mỗi lần
  StreamSubscription<DeviceItem>? _deviceUpdateSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    _deviceUpdateSub = _gateway.onDeviceUpdated.listen((_) {
      if (mounted) setState(() {});
    });

    if (widget.categoryMeta.category == DeviceCategory.camera) {
      _loadInitialCameraBatch();
      _scrollController.addListener(_onScroll);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _deviceUpdateSub?.cancel();
    _scrollController.dispose();

    // Dừng toàn bộ luồng camera khi thoát danh sách (Gửi mã 14)
    if (widget.categoryMeta.category == DeviceCategory.camera) {
      for (final hwId in _activeStreamingCameras) {
        _gateway.sendCommand(hardwareId: hwId, action: "STREAM_STOP");
      }
    }
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (widget.categoryMeta.category == DeviceCategory.camera) {
      if (state == AppLifecycleState.paused || state == AppLifecycleState.detached || state == AppLifecycleState.hidden) {
        // Đóng ứng dụng hoặc xuống nền: Gửi mã 14 dừng stream
        for (final hwId in _activeStreamingCameras) {
          _gateway.sendCommand(hardwareId: hwId, action: "STREAM_STOP");
        }
      } else if (state == AppLifecycleState.resumed) {
        // Mở lại ứng dụng: Kích hoạt lại mã 13
        for (final hwId in _activeStreamingCameras) {
          _gateway.sendCommand(hardwareId: hwId, action: "STREAM_START");
        }
      }
    }
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 80) {
      _loadMoreCameras();
    }
  }

  Future<void> _loadInitialCameraBatch() async {
    setState(() => _isLoadingCameras = true);
    final batch = await _gateway.fetchCamerasPaged(limit: _batchSize, offset: 0);
    if (!mounted) return;
    setState(() {
      _pagedCameras.clear();
      _pagedCameras.addAll(batch);
      _cameraOffset = batch.length;
      _hasMoreCameras = batch.length >= _batchSize;
      _isLoadingCameras = false;
    });

    // Gửi mã 13 (STREAM_START) cho đợt camera đầu tiên và các camera đã lưu
    for (final cam in batch) {
      _activeStreamingCameras.add(cam.hardwareId);
      _gateway.sendCommand(hardwareId: cam.hardwareId, action: "STREAM_START");
    }
    final localCams = _gateway.getDevicesByCategory(DeviceCategory.camera);
    for (final cam in localCams) {
      if (!_activeStreamingCameras.contains(cam.hardwareId)) {
        _activeStreamingCameras.add(cam.hardwareId);
        _gateway.sendCommand(hardwareId: cam.hardwareId, action: "STREAM_START");
      }
    }
  }

  Future<void> _loadMoreCameras() async {
    if (_isLoadingCameras || !_hasMoreCameras) return;
    setState(() => _isLoadingCameras = true);
    final nextBatch = await _gateway.fetchCamerasPaged(limit: _batchSize, offset: _cameraOffset);
    if (!mounted) return;
    setState(() {
      _pagedCameras.addAll(nextBatch);
      _cameraOffset += nextBatch.length;
      _hasMoreCameras = nextBatch.length >= _batchSize;
      _isLoadingCameras = false;
    });

    // Gửi mã 13 (STREAM_START) CHỈ cho các camera mới được tải
    for (final cam in nextBatch) {
      if (!_activeStreamingCameras.contains(cam.hardwareId)) {
        _activeStreamingCameras.add(cam.hardwareId);
        _gateway.sendCommand(hardwareId: cam.hardwareId, action: "STREAM_START");
      }
    }
  }

  Future<void> _executePreviewAction(DeviceItem device, String action, [Map<String, dynamic>? params]) async {
    setState(() => _isProcessing = true);
    final res = await _gateway.sendCommand(
      hardwareId: device.hardwareId,
      action: action,
      parameters: params,
    );
    if (mounted) {
      setState(() => _isProcessing = false);
      final isBle = !device.isOnline;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              if (isBle) ...[
                const Icon(Icons.bluetooth_audio_rounded, color: Colors.black, size: 18),
                const SizedBox(width: 8),
              ],
              Expanded(
                child: Text(
                  "${res.message}${isBle ? ' (Lệnh phát qua BLE tầm gần)' : ''} • ${res.latencyMs}ms",
                  style: TextStyle(
                    color: isBle ? Colors.black : Colors.white,
                    fontWeight: isBle ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
              ),
            ],
          ),
          backgroundColor: isBle ? AppTheme.amberWarning : (AppTheme.isDarkMode ? AppTheme.surfaceGlass : Colors.grey[800]),
          duration: const Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _showRenameDialog(DeviceItem device) {
    final controller = TextEditingController(text: device.name);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.isDarkMode ? AppTheme.surfaceDark : Colors.white,
        title: Text(
          AppTheme.t("rename_device"),
          style: TextStyle(color: AppTheme.isDarkMode ? Colors.white : Colors.black),
        ),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: TextStyle(color: AppTheme.isDarkMode ? Colors.white : Colors.black),
          decoration: InputDecoration(
            labelText: "Tên thiết bị mới",
            labelStyle: const TextStyle(color: AppTheme.cyanAccent),
            enabledBorder: OutlineInputBorder(
              borderSide: BorderSide(color: AppTheme.isDarkMode ? AppTheme.cardBorder : Colors.grey[300]!),
            ),
            focusedBorder: const OutlineInputBorder(
              borderSide: BorderSide(color: AppTheme.cyanAccent),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(AppTheme.t("cancel")),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.brandBlue, foregroundColor: Colors.white),
            onPressed: () async {
              if (controller.text.trim().isNotEmpty) {
                final newName = controller.text.trim();
                Navigator.of(ctx).pop();
                final ok = await _gateway.updateDeviceName(device.hardwareId, newName);
                if (mounted) {
                  setState(() {});
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(ok ? "Đã cập nhật tên thiết bị thành công!" : "Đã cập nhật tên thiết bị."),
                      backgroundColor: ok ? AppTheme.emeraldSuccess : AppTheme.blueAccent,
                    ),
                  );
                }
              }
            },
            child: Text(AppTheme.t("save")),
          ),
        ],
      ),
    );
  }

  void _showDeleteDialog(DeviceItem device) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.isDarkMode ? AppTheme.surfaceDark : Colors.white,
        title: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, color: AppTheme.crimsonDanger),
            const SizedBox(width: 8),
            Text(
              AppTheme.t("delete_device"),
              style: TextStyle(color: AppTheme.isDarkMode ? Colors.white : Colors.black),
            ),
          ],
        ),
        content: Text(
          "Bạn có chắc muốn xóa thiết bị '${device.name}' (${device.hardwareId}) khỏi tài khoản?",
          style: TextStyle(color: AppTheme.isDarkMode ? AppTheme.textSecondary : Colors.grey[700]),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(AppTheme.t("cancel")),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.crimsonDanger, foregroundColor: Colors.white),
            onPressed: () async {
              Navigator.of(ctx).pop();
              final ok = await _gateway.unpairDevice(device.hardwareId);
              if (mounted) {
                setState(() {});
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(ok ? "Đã hủy liên kết và xóa thiết bị thành công!" : "Đã gỡ thiết bị khỏi danh sách."),
                    backgroundColor: AppTheme.crimsonDanger,
                  ),
                );
              }
            },
            child: Text(AppTheme.t("delete_device")),
          ),
        ],
      ),
    );
  }

  void _navigateToDetail(DeviceItem device) {
    if (device.category == DeviceCategory.rollerDoor) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (context) => RollerDoorControlScreen(device: device)),
      ).then((_) => setState(() {}));
    } else if (device.category == DeviceCategory.dataAnalytics || device.modelCode.contains('BMS') || device.hardwareId.contains('BMS')) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (context) => BmsLandscapeScreen(device: device)),
      ).then((_) => setState(() {}));
    } else if (device.category == DeviceCategory.energyManage || device.modelCode.contains('SmartMetter') || device.hardwareId.contains('SmartMetter')) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (context) => SmartMetterDetailScreen(device: device)),
      ).then((_) => setState(() {}));
    } else {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => DeviceDetailScreen(
            device: device,
            isAlreadyStreaming: _activeStreamingCameras.contains(device.hardwareId),
          ),
        ),
      ).then((_) => setState(() {}));
    }
  }

  void _navigateToSettings(DeviceItem device) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => DeviceSettingsScreen(device: device)),
    ).then((_) => setState(() {}));
  }

  void _showZoomDialog(DeviceItem device) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 20),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Container(
              width: double.infinity,
              constraints: BoxConstraints(maxHeight: MediaQuery.of(ctx).size.height * 0.78),
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.cyanAccent, width: 2),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.cyanAccent.withValues(alpha: 0.35),
                    blurRadius: 24,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: InteractiveViewer(
                  minScale: 1.0,
                  maxScale: 6.0,
                  panEnabled: true,
                  scaleEnabled: true,
                  child: CameraWebRtcPlayer(
                    hardwareId: device.hardwareId,
                    isActive: true,
                  ),
                ),
              ),
            ),
            // Header overlay
            Positioned(
              top: 14,
              left: 16,
              right: 16,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.75),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.5)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(shape: BoxShape.circle, color: AppTheme.emeraldSuccess),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          "${device.name} • Thu phóng 1x - 6x",
                          style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_fullscreen_rounded, color: Colors.white, size: 22),
                    style: IconButton.styleFrom(backgroundColor: Colors.black.withValues(alpha: 0.75)),
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
                ],
              ),
            ),
            // Tip overlay
            Positioned(
              bottom: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.75),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white24),
                ),
                child: const Text(
                  "Chụm / Mở 2 ngón tay để phóng to và di chuyển để soi chi tiết",
                  style: TextStyle(color: Colors.white70, fontSize: 11),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isCameraCategory = widget.categoryMeta.category == DeviceCategory.camera;
    final isSwitchCategory = widget.categoryMeta.category == DeviceCategory.lightSwitch;
    final devices = isCameraCategory
        ? (_pagedCameras.isNotEmpty ? _pagedCameras : _gateway.getDevicesByCategory(DeviceCategory.camera))
        : _gateway.getDevicesByCategory(widget.categoryMeta.category);
    final isDark = AppTheme.isDarkMode;
    final bgCol = isDark ? AppTheme.background : AppTheme.lightBackground;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.90),
      decoration: BoxDecoration(
        color: bgCol,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
        border: Border(
          top: BorderSide(
            color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder,
            width: 1.5,
          ),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          const SizedBox(height: 12),
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: isDark ? AppTheme.textMuted : Colors.grey[400],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Header danh mục (Monochrome B&W)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      padding: const EdgeInsets.all(7),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isDark ? const Color(0xFF3F3F46) : const Color(0xFFD4D4D8),
                          width: 1.2,
                        ),
                      ),
                      child: Image.asset(widget.categoryMeta.assetPath, fit: BoxFit.contain),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.categoryMeta.title,
                          style: TextStyle(
                            color: isDark ? Colors.white : const Color(0xFF090A0C),
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.8,
                          ),
                        ),
                        Text(
                          isCameraCategory
                              ? "Tải theo đợt 4-6 cam • Lướt để xem thêm"
                              : "${widget.categoryMeta.subtitle} • ${devices.length} ${AppTheme.t("devices")}",
                          style: TextStyle(
                            color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                // Nút Thêm thiết bị vào danh mục
                IconButton(
                  icon: const Icon(
                    Icons.add_circle_outline,
                    color: AppTheme.brandBlue,
                  ),
                  tooltip: AppTheme.t("add_device"),
                  onPressed: () async {
                    await Navigator.of(context).push(
                      MaterialPageRoute(builder: (context) => const ProvisioningScreen()),
                    );
                    await _gateway.fetchDevicesFromBackend();
                    if (mounted) setState(() {});
                  },
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),
          Divider(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder, height: 1),

          // Danh Sách Thiết Bị Sở Hữu
          Expanded(
            child: (devices.isEmpty && isCameraCategory && _isLoadingCameras)
                ? const Center(
                    child: CircularProgressIndicator(color: AppTheme.cyanAccent),
                  )
                : devices.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.devices_other,
                              color: (isDark ? AppTheme.textMuted : Colors.grey).withValues(alpha: 0.5),
                              size: 48,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              "Chưa có thiết bị nào trong danh mục này",
                              style: TextStyle(color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary),
                            ),
                            const SizedBox(height: 12),
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.brandBlue, foregroundColor: Colors.white),
                              icon: const Icon(Icons.add),
                              label: Text(AppTheme.t("add_device")),
                              onPressed: () async {
                                await Navigator.of(context).push(
                                  MaterialPageRoute(builder: (context) => const ProvisioningScreen()),
                                );
                                await _gateway.fetchDevicesFromBackend();
                                if (mounted) setState(() {});
                              },
                            ),
                          ],
                        ),
                      )
                    : isSwitchCategory
                        ? GridView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              crossAxisSpacing: 10,
                              mainAxisSpacing: 10,
                              childAspectRatio: 1.05,
                            ),
                            itemCount: devices.length,
                            itemBuilder: (context, index) {
                              return _buildLightSwitchBlock(devices[index], isDark, textCol);
                            },
                          )
                        : ListView.builder(
                            controller: isCameraCategory ? _scrollController : null,
                            padding: const EdgeInsets.all(16),
                            itemCount: devices.length + (isCameraCategory && _isLoadingCameras ? 1 : 0),
                            itemBuilder: (context, index) {
                          if (index >= devices.length) {
                            return Center(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.cyanAccent),
                                    ),
                                    const SizedBox(width: 10),
                                    Text(
                                      "Đang tải thêm camera...",
                                      style: TextStyle(color: isDark ? AppTheme.textSecondary : Colors.grey[700], fontSize: 11.5),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }

                          final dev = devices[index];
                          if (isCameraCategory || dev.category == DeviceCategory.camera) {
                            return _buildCameraDeviceCard(dev, isDark, textCol);
                          } else if (isSwitchCategory || dev.category == DeviceCategory.lightSwitch) {
                            return _buildLightSwitchBlock(dev, isDark, textCol);
                          } else if (dev.category == DeviceCategory.dataAnalytics || dev.modelCode.contains('BMS') || dev.hardwareId.contains('BMS')) {
                            return _buildBmsPreviewCard(dev, isDark, textCol);
                          } else if (dev.category == DeviceCategory.energyManage || dev.modelCode.contains('SmartMetter') || dev.hardwareId.contains('SmartMetter')) {
                            return _buildSmartMetterPreviewCard(dev, isDark, textCol);
                          }
                          return _buildDeviceCard(dev, isDark, textCol);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  // 1. Khối Giao Diện Công Tắc Dạng Chữ Nhật Ngang (Cân đối 2 bên, có Chi tiết & Cài đặt)
  Widget _buildLightSwitchBlock(DeviceItem device, bool isDark, Color textCol) {
    final isOn = device.isRelayOn;
    final cardBg = isDark ? const Color(0xFF141924) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF26324A) : const Color(0xFFE2E8F0);

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isOn ? AppTheme.cyanAccent : cardBorder, width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Dòng 1: Tên thiết bị + Nút 3 chấm
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  device.name,
                  style: TextStyle(
                    color: textCol,
                    fontSize: 12.5,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              PopupMenuButton<String>(
                icon: Icon(
                  Icons.more_vert_rounded,
                  color: isDark ? AppTheme.textSecondary : Colors.grey[600],
                  size: 17,
                ),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                color: isDark ? AppTheme.surfaceDark : Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                onSelected: (val) {
                  if (val == 'rename') _showRenameDialog(device);
                  if (val == 'delete') _showDeleteDialog(device);
                  if (val == 'details') _navigateToDetail(device);
                  if (val == 'settings') _navigateToSettings(device);
                },
                itemBuilder: (context) => [
                  PopupMenuItem(
                    value: 'details',
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline_rounded, size: 16, color: AppTheme.brandBlue),
                        const SizedBox(width: 8),
                        Text("Xem chi tiết", style: TextStyle(color: textCol, fontSize: 13)),
                      ],
                    ),
                  ),
                  PopupMenuItem(
                    value: 'settings',
                    child: Row(
                      children: [
                        const Icon(Icons.settings_outlined, size: 16, color: AppTheme.cyanAccent),
                        const SizedBox(width: 8),
                        Text("Cài đặt", style: TextStyle(color: textCol, fontSize: 13)),
                      ],
                    ),
                  ),
                  if (device.canConfig)
                    PopupMenuItem(
                      value: 'rename',
                      child: Row(
                        children: [
                          const Icon(Icons.edit_outlined, size: 16, color: AppTheme.cyanAccent),
                          const SizedBox(width: 8),
                          Text(AppTheme.t("rename_device"), style: TextStyle(color: textCol, fontSize: 13)),
                        ],
                      ),
                    ),
                  if (device.isOwner)
                    PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          const Icon(Icons.delete_outline, size: 16, color: AppTheme.crimsonDanger),
                          const SizedBox(width: 8),
                          Text(AppTheme.t("delete_device"), style: const TextStyle(color: AppTheme.crimsonDanger, fontSize: 13)),
                        ],
                      ),
                    ),
                ],
              ),
            ],
          ),

          // Dòng 2: Nút Switch và Trạng thái BẬT/TẮT cân xứng 2 bên
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
            decoration: BoxDecoration(
              color: (isOn ? AppTheme.cyanAccent : Colors.grey).withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: (isOn ? AppTheme.cyanAccent : Colors.grey).withValues(alpha: 0.25),
                width: 0.8,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  isOn ? "ĐANG BẬT" : "ĐANG TẮT",
                  style: TextStyle(
                    color: isOn ? AppTheme.cyanAccent : Colors.grey,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Transform.scale(
                  scale: 0.88,
                  child: Switch(
                    value: isOn,
                    activeTrackColor: AppTheme.cyanAccent.withValues(alpha: 0.45),
                    activeThumbColor: AppTheme.cyanAccent,
                    inactiveTrackColor: isDark ? Colors.grey[800] : Colors.grey[300],
                    inactiveThumbColor: Colors.grey,
                    onChanged: _isProcessing
                        ? null
                        : (newVal) {
                            setState(() {
                              device.isRelayOn = newVal;
                            });
                            _executePreviewAction(device, newVal ? "TURN_ON" : "TURN_OFF");
                          },
                  ),
                ),
              ],
            ),
          ),

          // Dòng 3: 2 Nút chuẩn [Chi tiết] và [Cài đặt]
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 28,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.brandBlue,
                      foregroundColor: Colors.white,
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                      elevation: 0,
                    ),
                    onPressed: () => _navigateToDetail(device),
                    child: const Text("Chi tiết", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: SizedBox(
                  height: 28,
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: isDark ? Colors.white : AppTheme.lightTextPrimary,
                      side: BorderSide(color: isDark ? const Color(0xFF2E3B55) : Colors.grey[400]!),
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                    ),
                    onPressed: () => _navigateToSettings(device),
                    child: const Text("Cài đặt", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // 2. Thẻ Hiển Thị Camera Sở Hữu (Hỗ Trợ Live Stream, Thu Phóng, Chi Tiết, Cài Đặt)
  Widget _buildCameraDeviceCard(DeviceItem device, bool isDark, Color textCol) {
    final cardBg = isDark ? const Color(0xFF141924) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF26324A) : const Color(0xFFE2E8F0);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _activeStreamingCameras.contains(device.hardwareId)
              ? AppTheme.cyanAccent
              : cardBorder,
          width: 1.2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tiêu đề & 3-dots popup menu
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: 44,
                height: 44,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.cyanAccent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.35)),
                ),
                child: const Icon(Icons.videocam_rounded, color: AppTheme.cyanAccent, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: device.isOnline ? AppTheme.emeraldSuccess : Colors.grey,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            device.name,
                            style: TextStyle(
                              color: textCol,
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.cyanAccent.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            "CAMERA",
                            style: TextStyle(
                              color: AppTheme.cyanAccent,
                              fontSize: 9.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          device.hardwareId,
                          style: const TextStyle(
                            color: AppTheme.cyanAccent,
                            fontSize: 11,
                            fontFamily: "monospace",
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.emeraldSuccess.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.emeraldSuccess.withValues(alpha: 0.35)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(shape: BoxShape.circle, color: AppTheme.emeraldSuccess),
                    ),
                    const SizedBox(width: 4),
                    const Text(
                      "LIVE",
                      style: TextStyle(color: AppTheme.emeraldSuccess, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              PopupMenuButton<String>(
                icon: Icon(Icons.more_vert, color: isDark ? AppTheme.textSecondary : Colors.grey[700], size: 20),
                color: isDark ? AppTheme.surfaceDark : Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                onSelected: (val) {
                  if (val == 'rename') _showRenameDialog(device);
                  if (val == 'delete') _showDeleteDialog(device);
                },
                itemBuilder: (context) => [
                  if (device.canConfig)
                    PopupMenuItem(
                      value: 'rename',
                      child: Row(
                        children: [
                          const Icon(Icons.edit_outlined, size: 18, color: AppTheme.cyanAccent),
                          const SizedBox(width: 8),
                          Text(AppTheme.t("rename_device"), style: TextStyle(color: textCol)),
                        ],
                      ),
                    ),
                  if (device.isOwner)
                    PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          const Icon(Icons.delete_outline, size: 18, color: AppTheme.crimsonDanger),
                          const SizedBox(width: 8),
                          Text(AppTheme.t("delete_device"), style: const TextStyle(color: AppTheme.crimsonDanger)),
                        ],
                      ),
                    ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Màn hình xem Camera trực tiếp (Live Stream Container)
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: InkWell(
              onTap: () => _showZoomDialog(device),
              child: Container(
                height: 200,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.black,
                  border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.3)),
                ),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    CameraWebRtcPlayer(
                      hardwareId: device.hardwareId,
                      isActive: _activeStreamingCameras.contains(device.hardwareId),
                    ),
                    Positioned(
                      top: 10,
                      left: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.red.withValues(alpha: 0.85),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.circle, color: Colors.white, size: 8),
                            SizedBox(width: 4),
                            Text(
                              "LIVE REC",
                              style: TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: InkWell(
                        onTap: () => _showZoomDialog(device),
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.65),
                            shape: BoxShape.circle,
                            border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.6)),
                          ),
                          child: const Icon(Icons.fullscreen_rounded, color: AppTheme.cyanAccent, size: 20),
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Colors.black.withValues(alpha: 0.8), Colors.transparent],
                            begin: Alignment.bottomCenter,
                            end: Alignment.topCenter,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              device.roomName,
                              style: const TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.w600),
                            ),
                            const Text(
                              "Nhấn để phóng to",
                              style: TextStyle(color: AppTheme.cyanAccent, fontSize: 9.5),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          const SizedBox(height: 12),

          // Hàng 2 nút điều khiển chuẩn hóa: Chi tiết & Cài đặt (bỏ nút phóng to vì đã có icon góc trên)
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.brandBlue,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                  icon: const Icon(Icons.info_outline_rounded, size: 16),
                  label: const Text("Chi tiết", style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                  onPressed: () => _navigateToDetail(device),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: isDark ? Colors.white : AppTheme.lightTextPrimary,
                    side: BorderSide(color: isDark ? AppTheme.cardBorder : Colors.grey[400]!),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.settings_outlined, size: 16),
                  label: const Text("Cài đặt", style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                  onPressed: () => _navigateToSettings(device),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDeviceCard(DeviceItem device, bool isDark, Color textCol) {
    final cardBg = isDark ? const Color(0xFF141924) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF26324A) : const Color(0xFFE2E8F0);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder, width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tiêu đề thiết bị & 3-dots popup menu
          // Hàng 1 & 2: Icon đại diện + Tên thiết bị (Full Width, maxLines: 2) + Tag Âm tường + ID + Trạng thái tóm tắt
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icon đại diện (Monochrome B&W)
              Container(
                width: 42,
                height: 42,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isDark ? const Color(0xFF3F3F46) : const Color(0xFFD4D4D8),
                    width: 1.0,
                  ),
                ),
                child: Icon(
                  device.category == DeviceCategory.rollerDoor
                      ? Icons.roller_shades_closed_outlined
                      : Icons.device_hub_rounded,
                  color: isDark ? Colors.white : const Color(0xFF090A0C),
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),

              // Tên thiết bị chiếm toàn bộ không gian, cho phép 2 dòng nếu tên dài
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      device.name,
                      style: TextStyle(
                        color: textCol,
                        fontSize: 14.5,
                        fontWeight: FontWeight.bold,
                        height: 1.25,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 5),

                    // Hàng tag Âm tường + Mã phần cứng + Trạng thái tóm tắt
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(
                              color: isDark ? const Color(0xFF3F3F46) : const Color(0xFFD4D4D8),
                              width: 1.0,
                            ),
                          ),
                          child: Text(
                            "ÂM TƯỜNG",
                            style: TextStyle(
                              color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF52525B),
                              fontSize: 9.5,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          device.hardwareId.replaceAll('amtuong', ''),
                          style: TextStyle(
                            color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF71717A),
                            fontSize: 11,
                            fontFamily: "monospace",
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const Spacer(),
                        // Trạng thái tóm tắt (Monochrome B&W)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF27272A) : const Color(0xFFF4F4F5),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: isDark ? const Color(0xFF3F3F46) : const Color(0xFFD4D4D8),
                              width: 1.0,
                            ),
                          ),
                          child: Text(
                            device.stateSummary,
                            style: TextStyle(
                              color: isDark ? Colors.white : const Color(0xFF090A0C),
                              fontSize: 9.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // 3-dots popup menu (Đổi tên, Xóa thiết bị)
              PopupMenuButton<String>(
                icon: Icon(
                  Icons.more_vert,
                  color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary,
                  size: 20,
                ),
                color: isDark ? AppTheme.surfaceDark : Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                onSelected: (value) {
                  if (value == 'rename') {
                    _showRenameDialog(device);
                  } else if (value == 'delete') {
                    _showDeleteDialog(device);
                  }
                },
                itemBuilder: (context) => [
                  if (device.canConfig)
                    PopupMenuItem(
                      value: 'rename',
                      child: Row(
                        children: [
                          Icon(Icons.edit_outlined, size: 18, color: isDark ? Colors.white : Colors.black87),
                          const SizedBox(width: 8),
                          Text(AppTheme.t("rename_device"), style: TextStyle(color: textCol)),
                        ],
                      ),
                    ),
                  if (device.isOwner)
                    PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          const Icon(Icons.delete_outline, size: 18, color: AppTheme.crimsonDanger),
                          const SizedBox(width: 8),
                          Text(AppTheme.t("delete_device"), style: const TextStyle(color: AppTheme.crimsonDanger)),
                        ],
                      ),
                    ),
                ],
              ),
            ],
          ),

          // DẢI THÔNG TIN QUẢN TRỊ: TRẠNG THÁI ON/OFF (CÓ MÀU DUY NHẤT), AI SỞ HỮU, HẠN BẢO HÀNH
          Container(
            margin: const EdgeInsets.only(top: 10, bottom: 4),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.surface.withValues(alpha: 0.6) : AppTheme.lightBackground,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // 1. Trạng thái ON / OFF (DUY NHẤT CÓ MÀU THEO YÊU CẦU CỦA USER)
                Row(
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: device.isOnline ? const Color(0xFF22C55E) : const Color(0xFF71717A),
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      device.isOnline ? "ON" : "OFF",
                      style: TextStyle(
                        color: device.isOnline ? const Color(0xFF22C55E) : const Color(0xFF71717A),
                        fontSize: 10.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                // 2. Ai sở hữu (Monochrome B&W)
                Row(
                  children: [
                    Icon(
                      Icons.person_outline_rounded,
                      size: 13,
                      color: isDark ? Colors.white60 : Colors.black54,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      device.ownerName,
                      style: TextStyle(
                        color: isDark ? Colors.white70 : Colors.black87,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                // 3. Ngày gia hạn / bảo hành (Monochrome B&W)
                Row(
                  children: [
                    Icon(
                      Icons.calendar_month_rounded,
                      size: 12,
                      color: isDark ? Colors.white60 : Colors.black54,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      "Hạn: ${device.warrantyUntil.length >= 10 ? device.warrantyUntil.substring(0, 10) : device.warrantyUntil}",
                      style: TextStyle(
                        color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Note hướng dẫn khi thiết bị Ngoại tuyến (OFF)
          if (!device.isOnline)
            Container(
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              decoration: BoxDecoration(
                color: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.bluetooth_searching_rounded,
                    color: isDark ? Colors.white70 : Colors.black87,
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "Thiết bị đang Ngoại tuyến Wi-Fi. Hãy đến gần (< 15m) và bật Bluetooth để điều khiển trực tiếp qua BLE.",
                      style: TextStyle(
                        color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary,
                        fontSize: 10.5,
                        height: 1.3,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 8),
          Divider(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder, height: 1),
          const SizedBox(height: 12),

          // 4 Nút Bấm Preview Điều Khiển Nhanh (ẨN KHI KHÔNG CÓ QUYỀN canPerformControl)
          if (device.canPerformControl) ...[
            if (device.category == DeviceCategory.rollerDoor)
              _buildRollerDoorPreviewButtons(device)
            else if (device.category == DeviceCategory.lightSwitch)
              _buildLightSwitchPreviewButtons(device)
            else if (device.category == DeviceCategory.camera)
              _buildCameraPreviewButtons(device)
            else if (device.category == DeviceCategory.environment)
              _buildSensorPreviewStats(device)
            else if (device.category == DeviceCategory.energyManage)
              _buildUpsPreviewButtons(device)
            else
              _buildLockPreviewButtons(device),
          ] else ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
              ),
              child: Row(
                children: [
                  const Icon(Icons.lock_outline_rounded, color: AppTheme.amberWarning, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      device.isWithinAllowedSchedule
                          ? "Quyền điều khiển đã bị chủ nhà tạm khóa"
                          : "Ngoài khung giờ được phép điều khiển (${device.accessStartTime} - ${device.accessEndTime})",
                      style: const TextStyle(color: AppTheme.amberWarning, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 12),

          // Hàng 2 Nút Chuẩn Hóa: [Chi tiết] và [Cài đặt]
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.brandBlue,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                  icon: const Icon(Icons.tune_rounded, color: Colors.white, size: 16),
                  label: Text(
                    AppTheme.t("details"),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12.5,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  onPressed: () => _navigateToDetail(device),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: isDark ? Colors.white : AppTheme.lightTextPrimary,
                    side: BorderSide(color: isDark ? AppTheme.cardBorder : Colors.grey[400]!),
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.settings_outlined, size: 16),
                  label: const Text(
                    "Cài đặt",
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  onPressed: () => _navigateToSettings(device),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showLockedNotice() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Cửa đang KHÓA AN TOÀN TRẺ EM! Các nút Mở/Dừng/Đóng đã bị vô hiệu hóa. Vui lòng mở khóa trước."),
        backgroundColor: AppTheme.amberWarning,
        behavior: SnackBarBehavior.floating,
        duration: Duration(seconds: 2),
      ),
    );
  }

  // 1. Cửa cuốn 4 preview buttons: KHÓA (Đỏ), MỞ (Xanh lá), DỪNG (Vàng), ĐÓNG (Xanh lam) - ONLY ICON TRÁNH DẤU 3 CHẤM
  Widget _buildRollerDoorPreviewButtons(DeviceItem device) {
    final isChildLock = device.isChildLockActive;

    return Row(
      children: [
        // 1. Khóa an toàn trẻ em - MÀU ĐỎ (ONLY ICON)
        Expanded(
          child: _buildIndustrialDoorIconButton(
            tooltip: isChildLock ? "Đã khóa an toàn" : "Khóa an toàn",
            icon: isChildLock ? Icons.lock_rounded : Icons.lock_outline_rounded,
            isActive: isChildLock,
            baseColor: const Color(0xFFEF4444),
            activeColor: const Color(0xFFEF4444),
            onTap: () => _executePreviewAction(device, "TOGGLE_CHILD_LOCK"),
          ),
        ),
        const SizedBox(width: 8),
        // 2. Mở cửa - MÀU XANH LÁ (ONLY ICON)
        Expanded(
          child: Opacity(
            opacity: isChildLock ? 0.35 : 1.0,
            child: _buildIndustrialDoorIconButton(
              tooltip: "Mở cửa",
              icon: Icons.arrow_upward_rounded,
              baseColor: const Color(0xFF10B981),
              isDisabled: isChildLock,
              onTap: isChildLock ? _showLockedNotice : () => _executePreviewAction(device, "OPEN_DOOR"),
            ),
          ),
        ),
        const SizedBox(width: 8),
        // 3. Dừng - MÀU VÀNG (ONLY ICON)
        Expanded(
          child: Opacity(
            opacity: isChildLock ? 0.35 : 1.0,
            child: _buildIndustrialDoorIconButton(
              tooltip: "Dừng",
              icon: Icons.pause_rounded,
              baseColor: const Color(0xFFF59E0B),
              isDisabled: isChildLock,
              onTap: isChildLock ? _showLockedNotice : () => _executePreviewAction(device, "STOP_DOOR"),
            ),
          ),
        ),
        const SizedBox(width: 8),
        // 4. Đóng cửa - MÀU XANH LAM (ONLY ICON)
        Expanded(
          child: Opacity(
            opacity: isChildLock ? 0.35 : 1.0,
            child: _buildIndustrialDoorIconButton(
              tooltip: "Đóng cửa",
              icon: Icons.arrow_downward_rounded,
              baseColor: const Color(0xFF3B82F6),
              isDisabled: isChildLock,
              onTap: isChildLock ? _showLockedNotice : () => _executePreviewAction(device, "CLOSE_DOOR"),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildIndustrialDoorIconButton({
    required String tooltip,
    required IconData icon,
    required VoidCallback onTap,
    bool isActive = false,
    bool isDisabled = false,
    Color? activeColor,
    Color? baseColor,
  }) {
    final isDark = AppTheme.isDarkMode;
    final primaryColor = isActive ? (activeColor ?? baseColor ?? AppTheme.brandBlue) : (baseColor ?? AppTheme.brandBlue);
    final borderColor = isActive
        ? primaryColor
        : primaryColor.withValues(alpha: isDark ? 0.5 : 0.35);
    final bgColor = isActive
        ? primaryColor.withValues(alpha: 0.22)
        : primaryColor.withValues(alpha: isDark ? 0.12 : 0.08);

    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: (_isProcessing || isDisabled) ? (isDisabled ? onTap : null) : onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          height: 42,
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: borderColor, width: 1.2),
          ),
          child: Center(
            child: Icon(icon, color: primaryColor, size: 22),
          ),
        ),
      ),
    );
  }

  Widget _buildCompactActionButton({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
    bool isDisabled = false,
  }) {
    return InkWell(
      onTap: (_isProcessing || isDisabled) ? (isDisabled ? onTap : null) : onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 72,
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.35)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }

  // 2. Chiếu sáng Preview buttons
  Widget _buildLightSwitchPreviewButtons(DeviceItem device) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _buildCompactActionButton(
          label: "BẬT TẤT CẢ",
          icon: Icons.lightbulb_rounded,
          color: AppTheme.cyanAccent,
          onTap: () => _executePreviewAction(device, "TURN_ON"),
        ),
        _buildCompactActionButton(
          label: "TẮT TẤT CẢ",
          icon: Icons.lightbulb_outline_rounded,
          color: Colors.grey,
          onTap: () => _executePreviewAction(device, "TURN_OFF"),
        ),
      ],
    );
  }

  // 3. Camera Preview buttons
  Widget _buildCameraPreviewButtons(DeviceItem device) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _buildCompactActionButton(
          label: "XEM TRỰC TIẾP",
          icon: Icons.videocam_rounded,
          color: AppTheme.cyanAccent,
          onTap: () => _executePreviewAction(device, "STREAM_START"),
        ),
        _buildCompactActionButton(
          label: "CHỤP ẢNH",
          icon: Icons.camera_alt_rounded,
          color: AppTheme.purpleAccent,
          onTap: () => _executePreviewAction(device, "TAKE_SNAPSHOT"),
        ),
      ],
    );
  }

  // 4. Môi trường Preview
  Widget _buildSensorPreviewStats(DeviceItem device) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _buildStatChip(Icons.thermostat_rounded, "Nhiệt độ", "31.5 °C", AppTheme.amberWarning),
        _buildStatChip(Icons.water_drop_rounded, "Độ ẩm", "65 %", AppTheme.cyanAccent),
        _buildStatChip(Icons.air_rounded, "AQI", "42 Tốt", AppTheme.emeraldSuccess),
      ],
    );
  }

  // 5. Năng lượng UPS Preview
  Widget _buildUpsPreviewButtons(DeviceItem device) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _buildStatChip(Icons.battery_charging_full_rounded, "Pin dự phòng", "92%", AppTheme.emeraldSuccess),
        _buildStatChip(Icons.bolt_rounded, "Điện lưới", "220V Ổn định", AppTheme.cyanAccent),
      ],
    );
  }

  // 6. Khóa an toàn / Khác
  Widget _buildLockPreviewButtons(DeviceItem device) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _buildCompactActionButton(
          label: "MỞ KHÓA",
          icon: Icons.lock_open_rounded,
          color: AppTheme.emeraldSuccess,
          onTap: () => _executePreviewAction(device, "UNLOCK"),
        ),
        _buildCompactActionButton(
          label: "KHÓA LẠI",
          icon: Icons.lock_rounded,
          color: AppTheme.amberWarning,
          onTap: () => _executePreviewAction(device, "LOCK"),
        ),
      ],
    );
  }

  Widget _buildStatChip(IconData icon, String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: 6),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 9.5)),
              Text(value, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }

  // 3. BMS Lithium Preview Card (Chuẩn theo ảnh mẫu, 4 nút xoay ngang sang BmsLandscapeScreen)
  Widget _buildBmsPreviewCard(DeviceItem device, bool isDark, Color textCol) {
    final cardBg = isDark ? const Color(0xFF141924) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF26324A) : const Color(0xFFE2E8F0);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder, width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Logo/Title + ĐANG XẢ
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppTheme.emeraldSuccess.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.battery_charging_full_rounded, color: AppTheme.emeraldSuccess, size: 20),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        device.name,
                        style: TextStyle(color: textCol, fontSize: 14.5, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        device.hardwareId,
                        style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 10.5, fontFamily: "monospace"),
                      ),
                    ],
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.cyanAccent.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppTheme.cyanAccent),
                ),
                child: const Text(
                  "ĐANG XẢ",
                  style: TextStyle(color: AppTheme.cyanAccent, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Giữa: Vòng đo SOC + Thông số chính
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF0F131D) : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                // Vòng SOC 95%
                Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: AppTheme.emeraldSuccess, width: 6),
                  ),
                  child: const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          "95%",
                          style: TextStyle(color: AppTheme.emeraldSuccess, fontSize: 22, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          "SOC",
                          style: TextStyle(color: AppTheme.amberWarning, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                // 4 thông số gọn gàng 2 cột
                Expanded(
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: _buildBmsMiniStat("ĐIỆN ÁP TỔNG", "52.8 V", "16S | TB: 3.30V", isDark),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: _buildBmsMiniStat("DÒNG ĐIỆN", "-68.5 A", "GH: 150A", isDark),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Expanded(
                            child: _buildBmsMiniStat("CÔNG SUẤT", "3.62 kW", "142.5/150Ah", isDark),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: _buildBmsMiniStat("NHIỆT & LỆCH", "34.5°C", "ΔV: 0.012V", isDark),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // 4 nút chuẩn ảnh mẫu: [16 Cell], [Biểu đồ], [Sự cố], [Cài đặt]
          Row(
            children: [
              Expanded(
                child: _buildBmsTabLauncherButton("[16 Cell]", () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (context) => BmsLandscapeScreen(device: device, initialTab: 0)),
                  ).then((_) => setState(() {}));
                }),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: _buildBmsTabLauncherButton("[Biểu đồ]", () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (context) => BmsLandscapeScreen(device: device, initialTab: 1)),
                  ).then((_) => setState(() {}));
                }),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: _buildBmsTabLauncherButton("[Sự cố]", () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (context) => BmsLandscapeScreen(device: device, initialTab: 2)),
                  ).then((_) => setState(() {}));
                }),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: _buildBmsTabLauncherButton("[Cài đặt]", () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (context) => BmsLandscapeScreen(device: device, initialTab: 3)),
                  ).then((_) => setState(() {}));
                }),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBmsMiniStat(String title, String value, String sub, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF141A26) : Colors.white,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: isDark ? const Color(0xFF26324A) : const Color(0xFFCBD5E1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 8.5, fontWeight: FontWeight.bold)),
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
          Text(sub, style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 8.5)),
        ],
      ),
    );
  }

  Widget _buildBmsTabLauncherButton(String label, VoidCallback onTap) {
    return SizedBox(
      height: 34,
      child: OutlinedButton(
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: Color(0xFF00E5FF), width: 1.2),
          backgroundColor: const Color(0xFF00E5FF).withValues(alpha: 0.12),
          foregroundColor: const Color(0xFF00E5FF),
          padding: EdgeInsets.zero,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
        onPressed: onTap,
        child: Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
      ),
    );
  }

  // 4. SmartMetter Preview Card (Công tơ điện tử chống giật: LCD tóm tắt, Chi tiết, Cài đặt)
  Widget _buildSmartMetterPreviewCard(DeviceItem device, bool isDark, Color textCol) {
    final cardBg = isDark ? const Color(0xFF141924) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF26324A) : const Color(0xFFE2E8F0);
    final isOn = device.currentProperties['is_meter_on'] != false;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder, width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppTheme.amberWarning.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.bolt_rounded, color: AppTheme.amberWarning, size: 20),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        device.name,
                        style: TextStyle(color: textCol, fontSize: 14.5, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        device.hardwareId,
                        style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 10.5, fontFamily: "monospace"),
                      ),
                    ],
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isOn ? AppTheme.emeraldSuccess.withValues(alpha: 0.15) : AppTheme.crimsonDanger.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: isOn ? AppTheme.emeraldSuccess : AppTheme.crimsonDanger),
                ),
                child: Text(
                  isOn ? "ĐANG CẤP ĐIỆN" : "ĐÃ NGẮT ĐIỆN",
                  style: TextStyle(color: isOn ? AppTheme.emeraldSuccess : AppTheme.crimsonDanger, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // LCD Tóm tắt
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFF081820),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF1E3A4B)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildMetterStatItem("ĐIỆN NĂNG", "1,482.6", "kWh", const Color(0xFF38BDF8)),
                _buildMetterStatItem("ĐIỆN ÁP", "221.8", "V", const Color(0xFF34D399)),
                _buildMetterStatItem("DÒNG ĐIỆN", "18.4", "A", const Color(0xFFFBBF24)),
                _buildMetterStatItem("CÔNG SUẤT", "4.08", "kW", const Color(0xFFF43F5E)),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // 2 Nút chuẩn [Chi tiết] và [Cài đặt]
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.brandBlue,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    elevation: 0,
                  ),
                  icon: const Icon(Icons.tune_rounded, size: 16),
                  label: const Text("Chi tiết", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  onPressed: () => _navigateToDetail(device),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: isDark ? Colors.white : AppTheme.lightTextPrimary,
                    side: BorderSide(color: isDark ? AppTheme.cardBorder : Colors.grey[400]!),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(Icons.settings_outlined, size: 16),
                  label: const Text("Cài đặt", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  onPressed: () => _navigateToSettings(device),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetterStatItem(String label, String value, String unit, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 8.5, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(value, style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.bold, fontFamily: "monospace")),
            const SizedBox(width: 2),
            Text(unit, style: TextStyle(color: color.withValues(alpha: 0.7), fontSize: 8.5)),
          ],
        ),
      ],
    );
  }
}
