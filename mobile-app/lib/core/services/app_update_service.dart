import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:ota_update/ota_update.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:austec_iot_mobile/core/constants/api_config.dart';
import 'package:austec_iot_mobile/core/constants/app_theme.dart';

/// Dữ liệu thông tin phiên bản mới từ Backend
class AppUpdateInfo {
  final String latestVersion;
  final int buildCode;
  final String minRequiredVersion;
  final int minRequiredBuild;
  final String apkUrl;
  final String directApkUrl;
  final String releaseNotes;
  final bool forceUpdate;
  final String? publishedAt;

  AppUpdateInfo({
    required this.latestVersion,
    required this.buildCode,
    required this.minRequiredVersion,
    required this.minRequiredBuild,
    required this.apkUrl,
    required this.directApkUrl,
    required this.releaseNotes,
    required this.forceUpdate,
    this.publishedAt,
  });

  factory AppUpdateInfo.fromJson(Map<String, dynamic> json) {
    return AppUpdateInfo(
      latestVersion: json['latestVersion']?.toString() ?? '1.0.0',
      buildCode: (json['buildCode'] as num?)?.toInt() ?? 1,
      minRequiredVersion: json['minRequiredVersion']?.toString() ?? '1.0.0',
      minRequiredBuild: (json['minRequiredBuild'] as num?)?.toInt() ?? 1,
      apkUrl: json['apkUrl']?.toString() ?? '',
      directApkUrl: json['directApkUrl']?.toString() ?? '',
      releaseNotes: json['releaseNotes']?.toString() ?? 'Có phiên bản mới với nhiều tính năng nâng cấp và sửa lỗi.',
      forceUpdate: json['forceUpdate'] == true,
      publishedAt: json['publishedAt']?.toString(),
    );
  }
}

/// Service quản lý kiểm tra và cập nhật ứng dụng tự động (In-App OTA)
class AppUpdateService {
  static final AppUpdateService _instance = AppUpdateService._internal();
  factory AppUpdateService() => _instance;
  AppUpdateService._internal();

  bool _isChecking = false;
  bool _dialogShowing = false;
  DateTime? _lastAutoCheck;

  /// So sánh phiên bản dạng X.Y.Z (Ví dụ 2.1.0 với 2.0.0)
  static bool isSemanticNewer(String remote, String local) {
    try {
      final rParts = remote.split('.').map((e) => int.tryParse(e) ?? 0).toList();
      final lParts = local.split('.').map((e) => int.tryParse(e) ?? 0).toList();
      while (rParts.length < 3) {
        rParts.add(0);
      }
      while (lParts.length < 3) {
        lParts.add(0);
      }
      for (int i = 0; i < 3; i++) {
        if (rParts[i] > lParts[i]) return true;
        if (rParts[i] < lParts[i]) return false;
      }
    } catch (_) {}
    return false;
  }

  /// Lấy thông tin phiên bản từ Backend và so sánh với máy hiện tại
  Future<Map<String, dynamic>?> checkUpdate() async {
    if (_isChecking) return null;
    _isChecking = true;
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentBuild = int.tryParse(packageInfo.buildNumber) ?? 0;
      final currentVersion = packageInfo.version;

      final url = Uri.parse('${ApiConfig.baseUrl}/api/system/app-version');
      final res = await http.get(url).timeout(const Duration(seconds: 6));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is Map<String, dynamic> && data['success'] == true) {
          final info = AppUpdateInfo.fromJson(data);
          final hasNewerBuild = info.buildCode > currentBuild;
          final hasNewerVersion = isSemanticNewer(info.latestVersion, currentVersion);

          final hasUpdate = hasNewerBuild || hasNewerVersion;

          return {
            'hasUpdate': hasUpdate,
            'updateInfo': info,
            'packageInfo': packageInfo,
          };
        }
      }
    } catch (e) {
      debugPrint('[AppUpdateService] Lỗi kiểm tra cập nhật: $e');
    } finally {
      _isChecking = false;
    }
    return null;
  }

  /// Kiểm tra và hiển thị hộp thoại cập nhật nếu có bản mới
  Future<void> checkForUpdatesAndPrompt(BuildContext context, {bool manualTrigger = false}) async {
    // Tránh kiểm tra quá dồn dập
    if (!manualTrigger && _lastAutoCheck != null) {
      if (DateTime.now().difference(_lastAutoCheck!).inMinutes < 15) {
        return;
      }
    }

    final result = await checkUpdate();
    if (!context.mounted) return;

    if (result != null && result['hasUpdate'] == true) {
      final info = result['updateInfo'] as AppUpdateInfo;
      final packageInfo = result['packageInfo'] as PackageInfo;

      if (!_dialogShowing) {
        _dialogShowing = true;
        _lastAutoCheck = DateTime.now();
        await showDialog(
          context: context,
          barrierDismissible: !info.forceUpdate,
          builder: (ctx) => AppUpdateDialog(
            updateInfo: info,
            packageInfo: packageInfo,
          ),
        );
        _dialogShowing = false;
      }
    } else if (manualTrigger) {
      final packageInfo = await PackageInfo.fromPlatform().catchError((_) => PackageInfo(
            appName: 'Austec',
            packageName: '',
            version: '2.1.0',
            buildNumber: '13',
          ));
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Ứng dụng đang ở phiên bản mới nhất: v${packageInfo.version} (Build ${packageInfo.buildNumber})',
            style: const TextStyle(color: Colors.white),
          ),
          backgroundColor: AppTheme.surface,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    }
  }
}

/// Dialog cập nhật ứng dụng với thanh tiến trình tròn tải xuống
class AppUpdateDialog extends StatefulWidget {
  final AppUpdateInfo updateInfo;
  final PackageInfo packageInfo;

  const AppUpdateDialog({
    super.key,
    required this.updateInfo,
    required this.packageInfo,
  });

  @override
  State<AppUpdateDialog> createState() => _AppUpdateDialogState();
}

class _AppUpdateDialogState extends State<AppUpdateDialog> {
  bool _isDownloading = false;
  double _downloadPercent = 0.0;
  String _statusText = 'Sẵn sàng tải bản cập nhật...';
  String? _errorMessage;

  void _startOtaUpdate() {
    if (_isDownloading) return;

    setState(() {
      _isDownloading = true;
      _downloadPercent = 0.0;
      _statusText = 'Đang kết nối máy chủ tải...';
      _errorMessage = null;
    });

    final targetUrl = widget.updateInfo.directApkUrl.isNotEmpty
        ? widget.updateInfo.directApkUrl
        : widget.updateInfo.apkUrl;

    try {
      OtaUpdate()
          .execute(
        targetUrl,
        destinationFilename: 'Austec_IoT_v${widget.updateInfo.latestVersion}.apk',
      )
          .listen(
        (OtaEvent event) {
          if (!mounted) return;
          switch (event.status) {
            case OtaStatus.DOWNLOADING:
              final val = double.tryParse(event.value ?? '0') ?? 0;
              setState(() {
                _downloadPercent = val;
                _statusText = 'Đang tải gói cập nhật (${val.toInt()}%)...';
              });
              break;

            case OtaStatus.INSTALLING:
            case OtaStatus.INSTALLATION_DONE:
              setState(() {
                _downloadPercent = 100.0;
                _statusText = 'Đang mở màn hình cài đặt của Android...';
              });
              break;

            case OtaStatus.ALREADY_RUNNING_ERROR:
              setState(() {
                _statusText = 'Tiến trình tải đang chạy...';
              });
              break;

            case OtaStatus.PERMISSION_NOT_GRANTED_ERROR:
              setState(() {
                _isDownloading = false;
                _errorMessage =
                    'Quyền cài đặt ứng dụng chưa được cấp. Vui lòng bật "Cho phép cài đặt từ nguồn này" trong Cài đặt Android.';
              });
              break;

            case OtaStatus.INTERNAL_ERROR:
            case OtaStatus.DOWNLOAD_ERROR:
            case OtaStatus.CHECKSUM_ERROR:
            default:
              setState(() {
                _isDownloading = false;
                _errorMessage =
                    'Không thể hoàn tất tải gói cài đặt (${event.status.name}). Bạn có thể mở tải trực tiếp qua trình duyệt.';
              });
              break;
          }
        },
        onError: (err) {
          if (!mounted) return;
          setState(() {
            _isDownloading = false;
            _errorMessage = 'Lỗi kết nối tải: $err';
          });
        },
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isDownloading = false;
        _errorMessage = 'Lỗi khởi chạy OTA: $e';
      });
    }
  }

  Future<void> _openBrowserDownload() async {
    final rawUrl = widget.updateInfo.directApkUrl.isNotEmpty
        ? widget.updateInfo.directApkUrl
        : widget.updateInfo.apkUrl;

    final uri = Uri.parse(rawUrl);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Không thể mở trình duyệt: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentText = 'v${widget.packageInfo.version} (${widget.packageInfo.buildNumber})';
    final targetText = 'v${widget.updateInfo.latestVersion} (Build ${widget.updateInfo.buildCode})';

    return PopScope(
      canPop: !widget.updateInfo.forceUpdate && !_isDownloading,
      child: Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF14171F),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: AppTheme.brandBlue.withValues(alpha: 0.35),
              width: 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.6),
                blurRadius: 28,
                spreadRadius: 4,
                offset: const Offset(0, 10),
              ),
              BoxShadow(
                color: AppTheme.brandBlue.withValues(alpha: 0.08),
                blurRadius: 20,
                spreadRadius: 2,
              ),
            ],
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header Icon
              Container(
                width: 68,
                height: 68,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [
                      AppTheme.brandBlue.withValues(alpha: 0.25),
                      const Color(0xFF00E5FF).withValues(alpha: 0.2),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  border: Border.all(
                    color: AppTheme.brandBlue.withValues(alpha: 0.6),
                    width: 1.5,
                  ),
                ),
                child: const Icon(
                  Icons.system_update_rounded,
                  color: AppTheme.brandBlue,
                  size: 34,
                ),
              ),
              const SizedBox(height: 16),

              // Title
              const Text(
                'CẬP NHẬT ỨNG DỤNG',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 8),

              // Version Tags
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      currentText,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.6),
                        fontSize: 12,
                        decoration: TextDecoration.lineThrough,
                      ),
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 6),
                      child: Icon(Icons.arrow_forward_rounded, size: 14, color: AppTheme.brandBlue),
                    ),
                    Text(
                      targetText,
                      style: const TextStyle(
                        color: AppTheme.brandBlue,
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Downloading UI or Changelog UI
              if (_isDownloading) ...[
                const SizedBox(height: 10),
                // Tiến trình tròn tải xuống (Circular Progress Indicator)
                SizedBox(
                  width: 124,
                  height: 124,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      SizedBox(
                        width: 124,
                        height: 124,
                        child: CircularProgressIndicator(
                          value: _downloadPercent > 0 ? (_downloadPercent / 100.0).clamp(0.0, 1.0) : null,
                          strokeWidth: 8,
                          backgroundColor: Colors.white.withValues(alpha: 0.08),
                          valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.brandBlue),
                        ),
                      ),
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '${_downloadPercent.toInt()}%',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 26,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'ĐANG TẢI',
                            style: TextStyle(
                              color: AppTheme.brandBlue.withValues(alpha: 0.85),
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 1,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  _statusText,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.8),
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Vui lòng giữ ứng dụng mở cho đến khi xuất hiện thông báo cài đặt của Android.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.4),
                    fontSize: 11,
                  ),
                ),
              ] else ...[
                // Changelog Box
                Container(
                  constraints: const BoxConstraints(maxHeight: 140),
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.03),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                  ),
                  child: SingleChildScrollView(
                    child: Text(
                      widget.updateInfo.releaseNotes,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.85),
                        fontSize: 13,
                        height: 1.45,
                      ),
                    ),
                  ),
                ),
              ],

              // Error Message if any
              if (_errorMessage != null) ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.redAccent.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.redAccent.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(color: Colors.redAccent, fontSize: 11.5),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 22),

              // Action Buttons
              if (!_isDownloading) ...[
                Row(
                  children: [
                    if (!widget.updateInfo.forceUpdate) ...[
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.of(context).pop(),
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: Colors.white.withValues(alpha: 0.2)),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: Text(
                            'Để sau',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.7),
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                    ],
                    Expanded(
                      flex: widget.updateInfo.forceUpdate ? 1 : 1,
                      child: ElevatedButton(
                        onPressed: _startOtaUpdate,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.brandBlue,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          elevation: 3,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: const Text(
                          'CẬP NHẬT NGAY',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                // Browser Fallback link if error occurs
                if (_errorMessage != null) ...[
                  const SizedBox(height: 10),
                  TextButton.icon(
                    onPressed: _openBrowserDownload,
                    icon: const Icon(Icons.open_in_browser_rounded, size: 16, color: Color(0xFF00E5FF)),
                    label: const Text(
                      'Tải trực tiếp bằng trình duyệt',
                      style: TextStyle(color: Color(0xFF00E5FF), fontSize: 12.5),
                    ),
                  ),
                ],
              ] else if (_errorMessage != null) ...[
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.of(context).pop(),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.white24),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          padding: const EdgeInsets.symmetric(vertical: 13),
                        ),
                        child: const Text('Đóng', style: TextStyle(color: Colors.white70)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _openBrowserDownload,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00E5FF),
                          foregroundColor: Colors.black,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          padding: const EdgeInsets.symmetric(vertical: 13),
                        ),
                        child: const Text('Tải trình duyệt', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
