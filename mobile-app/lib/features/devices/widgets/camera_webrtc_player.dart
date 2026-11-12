import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import '../../../core/constants/api_config.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/network/api_client.dart';

/// Widget phát luồng video thật từ MediaMTX WebRTC (WHEP HTTP page :8889/live/<hwId>).
/// Nguyên tắc: KHÔNG fallback sang snapshot hay dữ liệu giả. Nếu backend hoặc MediaMTX
/// không kết nối được, hiển thị thẳng lỗi thật để dễ chẩn đoán (Wi-Fi/Firewall/IP).
class CameraWebRtcPlayer extends StatefulWidget {
  final String hardwareId;
  final bool isActive;
  final int reloadNonce;
  final ValueChanged<Map<String, dynamic>>? onStreamInfoLoaded;

  const CameraWebRtcPlayer({
    super.key,
    required this.hardwareId,
    this.isActive = true,
    this.reloadNonce = 0,
    this.onStreamInfoLoaded,
  });

  @override
  State<CameraWebRtcPlayer> createState() => _CameraWebRtcPlayerState();
}

class _CameraWebRtcPlayerState extends State<CameraWebRtcPlayer> {
  WebViewController? _controller;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    if (widget.isActive) {
      _resolveAndLoadStream();
    }
  }

  @override
  void didUpdateWidget(covariant CameraWebRtcPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (!widget.isActive) {
      if (oldWidget.isActive) {
        setState(() {
          _controller = null;
          _isLoading = false;
          _errorMessage = null;
        });
      }
      return;
    }

    final shouldReload = !oldWidget.isActive ||
        oldWidget.hardwareId != widget.hardwareId ||
        oldWidget.reloadNonce != widget.reloadNonce;
    if (shouldReload) {
      _resolveAndLoadStream();
    }
  }

  Future<void> _resolveAndLoadStream() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    String rawWebRtcUrl = '';

    // Chế độ Hybrid: App dùng Backend Render cho Auth/Devices/MQTT, riêng luồng Camera đi thẳng MediaMTX (từ cấu hình tay hoặc .env)
    final directMediaBase = ApiConfig.resolvedMediaMtxBaseUrl;
    if (directMediaBase != null) {
      rawWebRtcUrl = '$directMediaBase/live/${widget.hardwareId}';
      final directUri = Uri.tryParse(rawWebRtcUrl);
      final mediaHost = directUri?.host ?? '';
      widget.onStreamInfoLoaded?.call({
        'success': true,
        'hardwareId': widget.hardwareId,
        'streamType': 'webrtc',
        'mediaHost': mediaHost,
        'endpoints': {
          'webrtc': rawWebRtcUrl,
          if (mediaHost.isNotEmpty) ...{
            'rtsp': 'rtsp://$mediaHost:${ApiConfig.defaultMediaMtxRtspPort}/live/${widget.hardwareId}',
            'hls': 'http://$mediaHost:${ApiConfig.defaultMediaMtxHlsPort}/live/${widget.hardwareId}/index.m3u8',
          },
        },
      });
    } else {
      final response = await ApiClient().get('/api/devices/${widget.hardwareId}/camera/stream');
      if (!mounted || !widget.isActive) return;

      if (!response.success || response.data is! Map) {
        setState(() {
          _isLoading = false;
          _controller = null;
          _errorMessage = response.message ??
              'Backend trả về HTTP ${response.statusCode} khi lấy cấu hình WebRTC';
        });
        return;
      }

      final data = Map<String, dynamic>.from(response.data as Map);
      final rawEndpoints = data['endpoints'];
      if (rawEndpoints is! Map) {
        setState(() {
          _isLoading = false;
          _controller = null;
          _errorMessage = 'Backend thiếu object endpoints trong /camera/stream';
        });
        return;
      }

      final endpoints = Map<String, dynamic>.from(rawEndpoints);
      widget.onStreamInfoLoaded?.call(data);
      rawWebRtcUrl = endpoints['webrtc']?.toString().trim() ?? '';
    }

    final parsed = Uri.tryParse(rawWebRtcUrl);
    if (parsed == null || (parsed.scheme != 'http' && parsed.scheme != 'https')) {
      setState(() {
        _isLoading = false;
        _controller = null;
        _errorMessage = 'URL endpoints.webrtc không hợp lệ: "$rawWebRtcUrl"';
      });
      return;
    }

    final playerUri = parsed.replace(
      queryParameters: {
        ...parsed.queryParameters,
        'controls': 'false',
        'muted': 'true',
        'autoplay': 'true',
        'playsinline': 'true',
      },
    );

    if (kIsWeb) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'WebRTC player tích hợp hỗ trợ Android/iOS. Mở trực tiếp: $playerUri';
      });
      return;
    }

    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (!mounted) return;
            setState(() {
              _isLoading = true;
              _errorMessage = null;
            });
          },
          onPageFinished: (_) {
            if (!mounted) return;
            setState(() {
              _isLoading = false;
            });
          },
          onWebResourceError: (WebResourceError error) {
            // Chỉ báo lỗi nếu chính trang player WebRTC (:8889) không mở được
            if (error.isForMainFrame != true || !mounted) return;
            setState(() {
              _isLoading = false;
              _errorMessage =
                  'Không kết nối được MediaMTX (${playerUri.host}:${playerUri.port}): ${error.description}';
            });
          },
          onHttpError: (HttpResponseError error) {
            final reqUri = error.request?.uri;
            final isMainDoc = reqUri != null &&
                reqUri.host == playerUri.host &&
                reqUri.port == playerUri.port &&
                reqUri.path == playerUri.path;
            // Không chặn subresource 404 (/whep) vì trang MediaMTX tự retry mỗi 2s khi chờ camera đẩy RTSP lên
            if (!isMainDoc || !mounted) return;
            final code = error.response?.statusCode ?? 0;
            if (code >= 400) {
              setState(() {
                _isLoading = false;
                _errorMessage = 'MediaMTX trả về HTTP $code tại $playerUri';
              });
            }
          },
        ),
      );

    if (controller.platform is AndroidWebViewController) {
      final androidCtrl = controller.platform as AndroidWebViewController;
      await androidCtrl.setMediaPlaybackRequiresUserGesture(false);
    }

    await controller.loadRequest(playerUri);
    if (!mounted || !widget.isActive) return;
    setState(() {
      _controller = controller;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isActive) {
      return Container(
        color: Colors.black,
        alignment: Alignment.center,
        padding: const EdgeInsets.all(16),
        child: const Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.videocam_off_rounded, color: Colors.white38, size: 36),
            SizedBox(height: 8),
            Text(
              'Camera đang tạm dừng (mã 14)',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white60, fontSize: 12),
            ),
          ],
        ),
      );
    }

    if (_errorMessage != null) {
      return Container(
        color: Colors.black,
        alignment: Alignment.center,
        padding: const EdgeInsets.all(14),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline_rounded, color: AppTheme.roseDanger, size: 34),
            const SizedBox(height: 8),
            Text(
              _errorMessage!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70, fontSize: 11.5),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: _resolveAndLoadStream,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.cyanAccent,
                side: const BorderSide(color: AppTheme.cyanAccent),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              ),
              icon: const Icon(Icons.refresh_rounded, size: 16),
              label: const Text('Thử lại', style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
      );
    }

    if (_controller == null) {
      return Container(
        color: Colors.black,
        alignment: Alignment.center,
        child: const Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(strokeWidth: 2, color: AppTheme.cyanAccent),
            SizedBox(height: 10),
            Text(
              'Đang kết nối MediaMTX WebRTC...',
              style: TextStyle(color: Colors.white54, fontSize: 11.5),
            ),
          ],
        ),
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        WebViewWidget(controller: _controller!),
        if (_isLoading)
          Container(
            color: Colors.black54,
            alignment: Alignment.center,
            child: const CircularProgressIndicator(strokeWidth: 2, color: AppTheme.cyanAccent),
          ),
      ],
    );
  }
}
