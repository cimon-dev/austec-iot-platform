import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/constants/api_config.dart';
import '../../../core/models/device_model.dart';
import '../../../core/services/iot_gateway_client.dart';
import 'device_detail_screen.dart';
import 'device_settings_screen.dart';
import '../../provisioning/screens/provisioning_screen.dart';
import 'roller_door_control_screen.dart';

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
  Timer? _snapshotRefreshTimer;
  int _snapshotKey = DateTime.now().millisecondsSinceEpoch;
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
      _snapshotRefreshTimer = Timer.periodic(const Duration(milliseconds: 1500), (timer) {
        if (mounted) {
          setState(() {
            _snapshotKey = DateTime.now().millisecondsSinceEpoch;
          });
        }
      });
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _deviceUpdateSub?.cancel();
    _scrollController.dispose();
    _snapshotRefreshTimer?.cancel();

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

    // Gửi mã 13 (STREAM_START) cho đợt camera đầu tiên
    for (final cam in batch) {
      _activeStreamingCameras.add(cam.hardwareId);
      _gateway.sendCommand(hardwareId: cam.hardwareId, action: "STREAM_START");
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
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.cyanAccent, foregroundColor: Colors.black),
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
                  child: Image.network(
                    "${ApiConfig.baseUrl}/api/devices/${device.hardwareId}/camera/snapshot?t=$_snapshotKey",
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) => Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.videocam_outlined, color: AppTheme.cyanAccent, size: 64),
                          const SizedBox(height: 12),
                          Text(
                            device.name,
                            style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 6),
                          const Text("Đang truyền luồng video từ camera...", style: TextStyle(color: Colors.white70, fontSize: 12)),
                        ],
                      ),
                    ),
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
        ? _pagedCameras
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

          // Header danh mục
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
                        color: widget.categoryMeta.neonColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: widget.categoryMeta.neonColor.withValues(alpha: 0.4)),
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
                            color: widget.categoryMeta.neonColor,
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
                  icon: const Icon(Icons.add_circle_outline, color: AppTheme.cyanAccent),
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
                              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.cyanAccent, foregroundColor: Colors.black),
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
                          }
                          return _buildDeviceCard(dev, isDark, textCol);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  // 1. Khối Giao Diện Công Tắc Dạng 1 Khối Có Tên Và Nút Toggle Bật/Tắt
  Widget _buildLightSwitchBlock(DeviceItem device, bool isDark, Color textCol) {
    final isOn = device.isRelayOn;
    final cardBg = isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface;
    final cardBorder = isOn
        ? AppTheme.cyanAccent.withValues(alpha: 0.6)
        : (isDark ? AppTheme.cardBorder : AppTheme.lightBorder);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder, width: isOn ? 1.6 : 1.2),
        boxShadow: [
          BoxShadow(
            color: isOn
                ? AppTheme.cyanAccent.withValues(alpha: isDark ? 0.2 : 0.08)
                : Colors.black.withValues(alpha: isDark ? 0.15 : 0.03),
            blurRadius: isOn ? 14 : 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        children: [
          // Icon công tắc
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: isOn
                  ? AppTheme.cyanAccent.withValues(alpha: 0.18)
                  : (isDark ? Colors.white10 : Colors.grey[200]),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isOn ? AppTheme.cyanAccent : Colors.transparent,
                width: 1.2,
              ),
            ),
            child: Icon(
              Icons.power_settings_new_rounded,
              color: isOn ? AppTheme.cyanAccent : Colors.grey,
              size: 26,
            ),
          ),
          const SizedBox(width: 14),

          // Tên khối công tắc & thông tin phụ
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  device.name,
                  style: TextStyle(
                    color: textCol,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isOn ? AppTheme.emeraldSuccess : Colors.grey,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      isOn ? "ĐANG BẬT" : "ĐANG TẮT",
                      style: TextStyle(
                        color: isOn ? AppTheme.emeraldSuccess : Colors.grey,
                        fontSize: 10.5,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      "• ${device.roomName}",
                      style: TextStyle(
                        color: isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary,
                        fontSize: 10.5,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Menu 3 chấm
          PopupMenuButton<String>(
            icon: Icon(Icons.more_vert, color: isDark ? AppTheme.textSecondary : Colors.grey[700], size: 19),
            color: isDark ? AppTheme.surfaceDark : Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            onSelected: (val) {
              if (val == 'rename') _showRenameDialog(device);
              if (val == 'delete') _showDeleteDialog(device);
              if (val == 'details') _navigateToDetail(device);
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'details',
                child: Row(
                  children: [
                    const Icon(Icons.tune_rounded, size: 18, color: AppTheme.cyanAccent),
                    const SizedBox(width: 8),
                    Text("Xem chi tiết", style: TextStyle(color: textCol)),
                  ],
                ),
              ),
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
          const SizedBox(width: 6),

          // NÚT TOGGLE BẬT TẮT DẠNG KHỐI
          Transform.scale(
            scale: 1.05,
            child: Switch(
              value: isOn,
              activeTrackColor: AppTheme.cyanAccent.withValues(alpha: 0.5),
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
    );
  }

  // 2. Thẻ Hiển Thị Camera Sở Hữu (Hỗ Trợ Live Stream, Thu Phóng, Chi Tiết, Cài Đặt)
  Widget _buildCameraDeviceCard(DeviceItem device, bool isDark, Color textCol) {
    final cardBg = isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface;
    final cardBorder = isDark ? AppTheme.cardBorder : AppTheme.lightBorder;

    return Container(
      margin: const EdgeInsets.only(bottom: 18),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: _activeStreamingCameras.contains(device.hardwareId)
              ? AppTheme.cyanAccent.withValues(alpha: 0.6)
              : cardBorder,
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: AppTheme.cyanAccent.withValues(alpha: isDark ? 0.12 : 0.04),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
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
                            "AI CAMERA",
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
                    Image.network(
                      "${ApiConfig.baseUrl}/api/devices/${device.hardwareId}/camera/snapshot?t=$_snapshotKey",
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.videocam_rounded, color: AppTheme.cyanAccent, size: 44),
                            const SizedBox(height: 6),
                            Text(
                              "LIVE STREAM • ${device.streamResolution}",
                              style: const TextStyle(color: Colors.white70, fontSize: 11),
                            ),
                            const SizedBox(height: 2),
                            const Text("Đang lấy khung hình ESP32-CAM...", style: TextStyle(color: Colors.white38, fontSize: 10)),
                          ],
                        ),
                      ),
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

          // Hàng 3 nút điều khiển theo yêu cầu: Phóng to, Xem chi tiết, Cài đặt
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.cyanAccent.withValues(alpha: 0.15),
                    foregroundColor: AppTheme.cyanAccent,
                    side: const BorderSide(color: AppTheme.cyanAccent),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                  icon: const Icon(Icons.zoom_in_rounded, size: 16),
                  label: const Text("Phóng to", style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                  onPressed: () => _showZoomDialog(device),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.purpleAccent.withValues(alpha: 0.15),
                    foregroundColor: AppTheme.purpleAccent,
                    side: const BorderSide(color: AppTheme.purpleAccent),
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
    final cardBg = isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface;
    final cardBorder = isDark ? AppTheme.cardBorder : AppTheme.lightBorder;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder, width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tiêu đề thiết bị & 3-dots popup menu
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Icon đại diện
              Container(
                width: 44,
                height: 44,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.cyanAccent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.3)),
                ),
                child: Icon(
                  device.category == DeviceCategory.rollerDoor
                      ? Icons.roller_shades_closed_outlined
                      : Icons.device_hub_rounded,
                  color: AppTheme.cyanAccent,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),

              // Tên & Nhãn ÂM TƯỜNG + Hardware ID
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppTheme.emeraldSuccess,
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
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.purpleAccent.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            "ÂM TƯỜNG",
                            style: TextStyle(
                              color: AppTheme.purpleAccent,
                              fontSize: 9.5,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          device.hardwareId.replaceAll('amtuong', ''),
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

              // Trạng thái tóm tắt
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.emeraldSuccess.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.emeraldSuccess.withValues(alpha: 0.3)),
                ),
                child: Text(
                  device.stateSummary,
                  style: const TextStyle(
                    color: AppTheme.emeraldSuccess,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
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

          // DẢI THÔNG TIN QUẢN TRỊ: TRẠNG THÁI ON/OFF, AI SỞ HỮU, NGÀY GIA HẠN/BẢO HÀNH
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
                // 1. Trạng thái ON / OFF & BLE
                Row(
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: device.isOnline ? AppTheme.emeraldSuccess : AppTheme.amberWarning,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      device.isOnline ? "ON" : "OFF (BLE)",
                      style: TextStyle(
                        color: device.isOnline ? AppTheme.emeraldSuccess : AppTheme.amberWarning,
                        fontSize: 10.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                // 2. Ai sở hữu
                Row(
                  children: [
                    const Icon(Icons.person_outline_rounded, size: 13, color: AppTheme.cyanAccent),
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
                // 3. Ngày gia hạn / bảo hành
                Row(
                  children: [
                    const Icon(Icons.calendar_month_rounded, size: 12, color: AppTheme.amberWarning),
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
                color: AppTheme.amberWarning.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.amberWarning.withValues(alpha: 0.35)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.bluetooth_searching_rounded, color: AppTheme.amberWarning, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "Thiết bị đang Ngoại tuyến Wi-Fi. Hãy đến gần (< 15m) và bật Bluetooth để điều khiển trực tiếp qua BLE.",
                      style: TextStyle(
                        color: isDark ? AppTheme.amberWarning : Colors.orange[900],
                        fontSize: 10.5,
                        height: 1.3,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 8),
          Divider(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder, height: 1),
          const SizedBox(height: 12),

          // 4 Nút Bấm Preview Điều Khiển Nhanh
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

          const SizedBox(height: 12),

          // Nút Chuyển Vào Màn Hình Chi Tiết
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: AppTheme.cyanAccent.withValues(alpha: 0.5)),
                padding: const EdgeInsets.symmetric(vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () => _navigateToDetail(device),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.tune_rounded, color: AppTheme.cyanAccent, size: 16),
                  const SizedBox(width: 8),
                  Text(
                    AppTheme.t("details"),
                    style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(width: 4),
                  const Icon(Icons.arrow_forward_ios_rounded, color: AppTheme.cyanAccent, size: 12),
                ],
              ),
            ),
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

  // 1. Cửa cuốn 4 preview buttons: KHÓA, MỞ, DỪNG, ĐÓNG (Chuẩn 44px Row + Expanded chống rớt dòng)
  Widget _buildRollerDoorPreviewButtons(DeviceItem device) {
    final isChildLock = device.isChildLockActive;

    return Row(
      children: [
        // 1. Khóa
        Expanded(
          child: _buildIndustrialDoorButton(
            label: isChildLock ? "Đã khóa" : "Khóa",
            icon: isChildLock ? Icons.lock_rounded : Icons.lock_outline_rounded,
            isActive: isChildLock,
            activeColor: const Color(0xFFF59E0B),
            onTap: () => _executePreviewAction(device, "TOGGLE_CHILD_LOCK"),
          ),
        ),
        const SizedBox(width: 6),
        // 2. Mở cửa
        Expanded(
          child: Opacity(
            opacity: isChildLock ? 0.35 : 1.0,
            child: _buildIndustrialDoorButton(
              label: "Mở cửa",
              icon: Icons.arrow_upward_rounded,
              isDisabled: isChildLock,
              onTap: isChildLock ? _showLockedNotice : () => _executePreviewAction(device, "OPEN_DOOR"),
            ),
          ),
        ),
        const SizedBox(width: 6),
        // 3. Dừng
        Expanded(
          child: Opacity(
            opacity: isChildLock ? 0.35 : 1.0,
            child: _buildIndustrialDoorButton(
              label: "Dừng",
              icon: Icons.pause_rounded,
              isDisabled: isChildLock,
              onTap: isChildLock ? _showLockedNotice : () => _executePreviewAction(device, "STOP_DOOR"),
            ),
          ),
        ),
        const SizedBox(width: 6),
        // 4. Đóng cửa
        Expanded(
          child: Opacity(
            opacity: isChildLock ? 0.35 : 1.0,
            child: _buildIndustrialDoorButton(
              label: "Đóng cửa",
              icon: Icons.arrow_downward_rounded,
              isDisabled: isChildLock,
              onTap: isChildLock ? _showLockedNotice : () => _executePreviewAction(device, "CLOSE_DOOR"),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildIndustrialDoorButton({
    required String label,
    required IconData icon,
    required VoidCallback onTap,
    bool isActive = false,
    bool isDisabled = false,
    Color? activeColor,
  }) {
    final isDark = AppTheme.isDarkMode;
    final borderColor = isActive
        ? (activeColor ?? Colors.white)
        : (isDark ? const Color(0xFF27272A) : const Color(0xFFCBD5E1));
    final bgColor = isActive
        ? (activeColor ?? Colors.white).withValues(alpha: 0.15)
        : (isDark ? const Color(0xFF141417) : const Color(0xFFF8FAFC));
    final textColor = isActive
        ? (activeColor ?? Colors.white)
        : (isDark ? Colors.white : const Color(0xFF0F172A));

    return InkWell(
      onTap: (_isProcessing || isDisabled) ? (isDisabled ? onTap : null) : onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        height: 44,
        padding: const EdgeInsets.symmetric(horizontal: 4),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: borderColor, width: 1.1),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: textColor, size: 15),
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: textColor,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
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
}
