import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/models/device_model.dart';
import '../../../core/services/iot_gateway_client.dart';
import '../widgets/camera_webrtc_player.dart';

class CameraLandscapeFullscreenViewer extends StatefulWidget {
  final DeviceItem initialDevice;
  final IoTGatewayClient gateway;

  const CameraLandscapeFullscreenViewer({
    super.key,
    required this.initialDevice,
    required this.gateway,
  });

  @override
  State<CameraLandscapeFullscreenViewer> createState() => _CameraLandscapeFullscreenViewerState();
}

class _CameraLandscapeFullscreenViewerState extends State<CameraLandscapeFullscreenViewer> {
  late List<DeviceItem> _cameras;
  late int _currentIndex;
  late PageController _pageController;

  @override
  void initState() {
    super.initState();
    _cameras = widget.gateway.getDevicesByCategory(DeviceCategory.camera);
    if (_cameras.isEmpty) {
      _cameras = [widget.initialDevice];
    }
    _currentIndex = _cameras.indexWhere((c) => c.hardwareId == widget.initialDevice.hardwareId);
    if (_currentIndex < 0) {
      _currentIndex = 0;
    }
    _pageController = PageController(initialPage: _currentIndex);

    // Ép xoay màn hình nằm ngang khi xem phóng to camera chi tiết
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void dispose() {
    // Trả lại xoay màn hình dọc khi thoát xem camera
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    _pageController.dispose();
    super.dispose();
  }

  void _switchCamera(int newIndex) {
    if (newIndex >= 0 && newIndex < _cameras.length) {
      _pageController.animateToPage(
        newIndex,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void _handleBack() {
    final currentDevice = _cameras[_currentIndex];
    Navigator.of(context).pop(currentDevice);
  }

  @override
  Widget build(BuildContext context) {
    final currentCam = _cameras[_currentIndex];

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) {
          _handleBack();
        }
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          fit: StackFit.expand,
          children: [
            // PageView vuốt đổi Camera ngang
            PageView.builder(
              controller: _pageController,
              itemCount: _cameras.length,
              onPageChanged: (idx) {
                setState(() => _currentIndex = idx);
              },
              itemBuilder: (ctx, idx) {
                return InteractiveViewer(
                  minScale: 1.0,
                  maxScale: 6.0,
                  child: CameraWebRtcPlayer(
                    hardwareId: _cameras[idx].hardwareId,
                    isActive: true,
                  ),
                );
              },
            ),

            // Top Bar Overlay: Nút quay lại, Tên Cam, Bộ chọn chuyển cam, Đóng
            Positioned(
              top: 12,
              left: 16,
              right: 16,
              child: Row(
                children: [
                  // Nút Quay lại
                  InkWell(
                    onTap: _handleBack,
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.75),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 14),
                          SizedBox(width: 4),
                          Text("Quay lại", style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(width: 12),

                  // Huy hiệu Tên Camera & Trạng thái LIVE
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.75),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.5)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(shape: BoxShape.circle, color: AppTheme.emeraldSuccess),
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              "${currentCam.name} (${_currentIndex + 1}/${_cameras.length})",
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            currentCam.roomName.isNotEmpty ? "• ${currentCam.roomName}" : "• Trực tiếp",
                            style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(width: 12),

                  // Cụm phím chuyển Camera góc trên (Previous / Next)
                  if (_cameras.length > 1) ...[
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.75),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.skip_previous_rounded, color: Colors.white, size: 20),
                            tooltip: "Camera trước",
                            onPressed: _currentIndex > 0 ? () => _switchCamera(_currentIndex - 1) : null,
                          ),
                          Container(width: 1, height: 18, color: Colors.white24),
                          IconButton(
                            icon: const Icon(Icons.skip_next_rounded, color: Colors.white, size: 20),
                            tooltip: "Camera sau",
                            onPressed: _currentIndex < _cameras.length - 1 ? () => _switchCamera(_currentIndex + 1) : null,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],

                  // Nút Đóng
                  IconButton(
                    icon: const Icon(Icons.close_fullscreen_rounded, color: Colors.white, size: 20),
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.black.withValues(alpha: 0.75),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                        side: const BorderSide(color: Colors.white24),
                      ),
                    ),
                    onPressed: _handleBack,
                  ),
                ],
              ),
            ),

            // Tip overlay phía dưới
            Positioned(
              bottom: 12,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.75),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white24),
                  ),
                  child: Text(
                    _cameras.length > 1
                        ? "Vuốt ngang hoặc dùng nút góc trên để chuyển camera • Chụm 2 ngón tay để zoom"
                        : "Chụm / Mở 2 ngón tay để thu phóng chi tiết camera",
                    style: const TextStyle(color: Colors.white70, fontSize: 10.5),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

