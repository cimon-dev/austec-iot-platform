import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import '../../../core/constants/api_config.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/network/api_client.dart';

/// Widget phát luồng video thật từ MediaMTX WebRTC (WHEP HTTP page :8889/live/<hwId>).
/// Tối ưu state: Lưu cache WebViewController theo hardwareId để khi bấm phóng to hoặc
/// xem chi tiết không phải kết nối lại từ đầu.
/// Tự động ẩn thông báo lỗi kỹ thuật thô của MediaMTX (stream not found) và thay bằng loading tinh tế.
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

  static final Map<String, Map<String, dynamic>> _cachedStreamEndpoints = {};

  static void clearCacheFor(String hardwareId) {
    _cachedStreamEndpoints.remove(hardwareId);
  }

  static void clearAllCache() {
    _cachedStreamEndpoints.clear();
  }

  @override
  State<CameraWebRtcPlayer> createState() => _CameraWebRtcPlayerState();
}

class _CameraWebRtcPlayerState extends State<CameraWebRtcPlayer> {
  WebViewController? _controller;
  bool _isLoading = false;
  bool _isVideoReady = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    if (widget.isActive) {
      _resolveAndLoadStream();
    }
  }

  @override
  void dispose() {
    try {
      _controller?.loadRequest(Uri.parse('about:blank'));
    } catch (_) {}
    _controller = null;
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant CameraWebRtcPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (!widget.isActive) {
      if (oldWidget.isActive) {
        try {
          _controller?.loadRequest(Uri.parse('about:blank'));
        } catch (_) {}
        setState(() {
          _controller = null;
          _isLoading = false;
          _isVideoReady = false;
          _errorMessage = null;
        });
      }
      return;
    }

    final shouldReload = !oldWidget.isActive ||
        oldWidget.hardwareId != widget.hardwareId ||
        oldWidget.reloadNonce != widget.reloadNonce;
    if (shouldReload) {
      if (oldWidget.reloadNonce != widget.reloadNonce) {
        CameraWebRtcPlayer.clearCacheFor(widget.hardwareId);
      }
      _resolveAndLoadStream();
    }
  }

  Future<void> _resolveAndLoadStream() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _isVideoReady = false;
      _errorMessage = null;
    });

    String rawWebRtcUrl = '';

    // Chế độ Hybrid: App dùng Backend Render cho Auth/Devices/MQTT, riêng luồng Camera đi thẳng MediaMTX
    final cachedEndpoints = CameraWebRtcPlayer._cachedStreamEndpoints[widget.hardwareId];
    if (cachedEndpoints != null && cachedEndpoints['webrtc'] != null) {
      rawWebRtcUrl = cachedEndpoints['webrtc']?.toString().trim() ?? '';
    } else {
      final directMediaBase = ApiConfig.resolvedMediaMtxBaseUrl;
      if (directMediaBase != null) {
        rawWebRtcUrl = '$directMediaBase/live/${widget.hardwareId}';
        final directUri = Uri.tryParse(rawWebRtcUrl);
        final mediaHost = directUri?.host ?? '';
        final epData = {
          'webrtc': rawWebRtcUrl,
          if (mediaHost.isNotEmpty) ...{
            'rtsp': 'rtsp://$mediaHost:${ApiConfig.defaultMediaMtxRtspPort}/live/${widget.hardwareId}',
            'hls': 'http://$mediaHost:${ApiConfig.defaultMediaMtxHlsPort}/live/${widget.hardwareId}/index.m3u8',
          },
        };
        CameraWebRtcPlayer._cachedStreamEndpoints[widget.hardwareId] = epData;
        widget.onStreamInfoLoaded?.call({
          'success': true,
          'hardwareId': widget.hardwareId,
          'streamType': 'webrtc',
          'mediaHost': mediaHost,
          'endpoints': epData,
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
        CameraWebRtcPlayer._cachedStreamEndpoints[widget.hardwareId] = endpoints;
        widget.onStreamInfoLoaded?.call(data);
        rawWebRtcUrl = endpoints['webrtc']?.toString().trim() ?? '';
      }
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

    late final WebViewController controller;
    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..addJavaScriptChannel(
        'AustecStreamChannel',
        onMessageReceived: (JavaScriptMessage msg) {
          if (msg.message == 'PLAYING' && mounted) {
            setState(() {
              _isVideoReady = true;
              _isLoading = false;
            });
          }
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (!mounted) return;
            setState(() {
              _isLoading = true;
              _errorMessage = null;
            });
          },
          onPageFinished: (url) {
            if (!mounted) return;
            // Tiêm CSS ẩn triệt để text báo lỗi của MediaMTX (stream not found, retry...)
            // Đồng thời kích hoạt script giám sát phát video thực tế
            controller.runJavaScript("""
              (function() {
                try {
                  const style = document.createElement('style');
                  style.innerHTML = `
                    body, html { background: #000000 !important; color: transparent !important; margin: 0; padding: 0; overflow: hidden; width: 100%; height: 100%; }
                    div, p, span, h1, h2, h3 { color: transparent !important; user-select: none !important; }
                    video { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; }
                  `;
                  document.head.appendChild(style);

                  function checkVideoPlaying() {
                    const v = document.querySelector('video');
                    if (v) {
                      v.addEventListener('playing', function() {
                        if (window.AustecStreamChannel) {
                          window.AustecStreamChannel.postMessage('PLAYING');
                        }
                      });
                      if (v.readyState >= 2 && v.currentTime > 0) {
                        if (window.AustecStreamChannel) {
                          window.AustecStreamChannel.postMessage('PLAYING');
                        }
                        return;
                      }
                    }
                    setTimeout(checkVideoPlaying, 350);
                  }
                  checkVideoPlaying();
                } catch(e) {}
              })();
            """);
          },
          onWebResourceError: (WebResourceError error) {
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
              'Camera đang tạm dừng',
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
            const Icon(Icons.error_outline_rounded, color: AppTheme.amberWarning, size: 32),
            const SizedBox(height: 8),
            Text(
              _errorMessage!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70, fontSize: 11),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: () {
                CameraWebRtcPlayer.clearCacheFor(widget.hardwareId);
                _resolveAndLoadStream();
              },
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
            SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.cyanAccent),
            ),
            SizedBox(height: 8),
            Text(
              'Đang kết nối camera...',
              style: TextStyle(color: Colors.white60, fontSize: 11),
            ),
          ],
        ),
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        WebViewWidget(controller: _controller!),
        // Lớp che loading tinh tế: Chỉ biến mất khi khung hình video thực tế đã xuất hiện
        if (!_isVideoReady || _isLoading)
          Container(
            color: Colors.black,
            alignment: Alignment.center,
            child: const Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 26,
                  height: 26,
                  child: CircularProgressIndicator(strokeWidth: 2.2, color: AppTheme.cyanAccent),
                ),
                SizedBox(height: 8),
                Text(
                  'Đang tải luồng camera...',
                  style: TextStyle(color: Colors.white70, fontSize: 11),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
