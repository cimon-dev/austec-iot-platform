import 'package:flutter/material.dart';
import 'dart:async';
import '../../../core/constants/app_theme.dart';
import '../../../core/models/device_model.dart';
import '../../../core/services/iot_gateway_client.dart';
import 'category_device_list_sheet.dart';
import '../../shop/screens/native_shop_screen.dart';
import '../../cskh/cskh.dart';
import '../../chat/screens/chat_hub_screen.dart';
import '../../provisioning/screens/provisioning_screen.dart';
import '../../settings/screens/app_settings_screen.dart';
import '../../profile/screens/user_profile_screen.dart';
import '../../../core/constants/api_config.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/app_update_service.dart';
import '../../../core/utils/app_toast.dart';

class OrbitalHubScreen extends StatefulWidget {
  const OrbitalHubScreen({super.key});

  @override
  State<OrbitalHubScreen> createState() => _OrbitalHubScreenState();
}

class _OrbitalHubScreenState extends State<OrbitalHubScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  final IoTGatewayClient _gateway = IoTGatewayClient();
  int _selectedBottomNavIndex = 0;

  ChatDeviceItem? _cskhPrefilledDevice;
  String? _cskhPrefilledPrompt;

  void _handleConsultProduct(ProductItem product) {
    final chatDev = ChatDeviceItem(
      isOwned: false,
      deviceName: product.name,
      modelName: product.name,
      categoryTag: product.categoryTag,
      price: product.price,
      imageUrl: product.imagePath,
      specs: product.specs,
    );
    setState(() {
      _cskhPrefilledDevice = chatDev;
      _cskhPrefilledPrompt =
          "Xin chào CSKH Austec! Tôi cần tư vấn và báo giá chi tiết về sản phẩm ${product.name}.";
      _selectedBottomNavIndex =
          2; // Chuyển sang Tab CSKH Chat (Navbar giữ nguyên)
    });
  }

  // Thời gian thực
  late Timer _clockTimer;
  String _timeString = "";
  String _dateString = "";

  // Trạng thái nút chat CSKH kéo thả & vuốt đóng
  Offset? _chatButtonOffset;
  bool _isDraggingChat = false;
  double _chatDragDistance = 0.0;
  bool _isChatButtonDismissed = false;

  StreamSubscription? _deviceUpdateSub;
  List<dynamic> _realNotifications = [];
  Timer? _notiTimer;

  Future<void> _fetchNotifications() async {
    try {
      final res = await ApiClient().get('/api/notifications');
      if (res.success &&
          res.data != null &&
          res.data['notifications'] is List) {
        if (mounted) {
          setState(() {
            _realNotifications = res.data['notifications'];
          });
        }
      }
    } catch (e) {
      debugPrint("[OrbitalHubScreen] Error fetching notifications: $e");
    }
  }

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: AppMotion.normal,
    );

    final now = DateTime.now();
    _timeString =
        "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}";
    _dateString =
        "${now.day.toString().padLeft(2, '0')}/${now.month.toString().padLeft(2, '0')}/${now.year}";

    _clockTimer =
        Timer.periodic(const Duration(seconds: 1), (_) => _updateClock());

    // Nạp thông báo thật từ API và định kỳ kiểm tra thông báo mới
    _fetchNotifications();
    _notiTimer = Timer.periodic(
        const Duration(seconds: 15), (_) => _fetchNotifications());

    // Lắng nghe luồng cập nhật thiết bị thời gian thực & Local Cache
    _deviceUpdateSub = _gateway.onDeviceUpdated.listen((_) {
      if (mounted) setState(() {});
    });

    // Nạp danh sách thiết bị thật của người dùng từ Backend API (kèm offline fallback)
    _gateway.fetchDevicesFromBackend(token: AuthService().token).then((_) {
      if (mounted) setState(() {});
    });

    // Tự động kiểm tra bản cập nhật mới và hiển thị popup tải OTA nếu có
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Future.delayed(const Duration(milliseconds: 1500), () {
        if (mounted) {
          AppUpdateService().checkForUpdatesAndPrompt(context);
        }
      });
    });
  }

  void _updateClock() {
    final now = DateTime.now();
    if (mounted) {
      setState(() {
        _timeString =
            "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}";
        _dateString =
            "${now.day.toString().padLeft(2, '0')}/${now.month.toString().padLeft(2, '0')}/${now.year}";
      });
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _clockTimer.cancel();
    _notiTimer?.cancel();
    _deviceUpdateSub?.cancel();
    super.dispose();
  }

  void _toggleTheme() {
    AppTheme.toggleTheme();
    setState(() {});
  }

  void _toggleLanguage() {
    setState(() {
      AppTheme.currentLang = AppTheme.currentLang == "vi" ? "en" : "vi";
    });
  }

  void _openCategoryDevices(CategoryMeta categoryMeta) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => CategoryDeviceListSheet(categoryMeta: categoryMeta),
    );
  }

  void _openSearchDialog() {
    final isDark = AppTheme.isDarkMode;
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppTheme.surfaceDark : Colors.white,
        title: Text(AppTheme.t("search_device"),
            style: TextStyle(
                color: isDark ? Colors.white : Colors.black, fontSize: 16)),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: TextStyle(color: isDark ? Colors.white : Colors.black),
          decoration: InputDecoration(
            hintText: "Nhập tên hoặc mã thiết bị...",
            hintStyle:
                TextStyle(color: isDark ? AppTheme.textMuted : Colors.grey),
            prefixIcon: const Icon(Icons.search, color: AppTheme.cyanAccent),
            enabledBorder: OutlineInputBorder(
                borderSide: BorderSide(
                    color: isDark ? AppTheme.cardBorder : Colors.grey[300]!)),
            focusedBorder: const OutlineInputBorder(
                borderSide: BorderSide(color: AppTheme.cyanAccent)),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(AppTheme.t("cancel")),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.cyanAccent,
                foregroundColor: Colors.black),
            onPressed: () {
              Navigator.of(ctx).pop();
              final q = controller.text.trim().toLowerCase();
              if (q.isNotEmpty) {
                final found = _gateway.devices
                    .where((d) =>
                        d.name.toLowerCase().contains(q) ||
                        d.hardwareId.toLowerCase().contains(q))
                    .toList();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                        "Tìm thấy ${found.length} thiết bị phù hợp với '$q'"),
                    backgroundColor: isDark
                        ? const Color(0xFF1E1E22)
                        : const Color(0xFF0F172A),
                    behavior: SnackBarBehavior.floating,
                    dismissDirection: DismissDirection.horizontal,
                    duration: const Duration(milliseconds: 2500),
                  ),
                );
              }
            },
            child: Text(AppTheme.t("search_device")),
          ),
        ],
      ),
    );
  }

  IconData _getNotiIcon(String? category) {
    switch (category) {
      case 'OTA_UPDATE':
        return Icons.system_update_rounded;
      case 'MAINTENANCE':
        return Icons.build_circle_rounded;
      case 'ALERT':
        return Icons.warning_amber_rounded;
      case 'PROMO':
        return Icons.card_giftcard_rounded;
      default:
        return Icons.notifications_active_rounded;
    }
  }

  Color _getNotiColor(String? category) {
    switch (category) {
      case 'OTA_UPDATE':
        return AppTheme.cyanAccent;
      case 'MAINTENANCE':
        return AppTheme.amberWarning;
      case 'ALERT':
        return Colors.redAccent;
      case 'PROMO':
        return AppTheme.emeraldSuccess;
      default:
        return AppTheme.brandBlue;
    }
  }

  void _openNotificationCenter() {
    _fetchNotifications();
    final isDark = AppTheme.isDarkMode;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setSheetState) => Container(
          padding: const EdgeInsets.all(20),
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.75,
          ),
          decoration: BoxDecoration(
            color: isDark ? AppTheme.surface : AppTheme.lightSurface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            border: Border(
                top: BorderSide(
                    color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder,
                    width: 1.5)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? AppTheme.textMuted : Colors.grey[400],
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
                      const Icon(Icons.notifications_active,
                          color: AppTheme.cyanAccent, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        AppTheme.t("notifications"),
                        style: TextStyle(
                          color:
                              isDark ? Colors.white : AppTheme.lightTextPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  if (_realNotifications.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.cyanAccent.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        "${_realNotifications.length} thông báo",
                        style: const TextStyle(
                          color: AppTheme.cyanAccent,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 14),

              // Danh sách thông báo thực từ API
              if (_realNotifications.isEmpty)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 36),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.notifications_none_rounded,
                          size: 42,
                          color: isDark ? AppTheme.textMuted : Colors.grey[400],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          "Không có thông báo mới",
                          style: TextStyle(
                            color: isDark
                                ? Colors.white
                                : AppTheme.lightTextPrimary,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          "Bạn đã cập nhật tất cả thông tin mới nhất từ hệ thống.",
                          style: TextStyle(
                            color: isDark
                                ? AppTheme.textMuted
                                : AppTheme.lightTextSecondary,
                            fontSize: 11,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                )
              else
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: _realNotifications.length,
                    itemBuilder: (context, index) {
                      final noti = _realNotifications[index];
                      final title =
                          noti['title']?.toString() ?? 'Thông báo hệ thống';
                      final message = noti['message']?.toString() ?? '';
                      final time = noti['sentAt']?.toString() ??
                          noti['createdAt']?.toString() ??
                          '';
                      final category = noti['category']?.toString() ?? 'SYSTEM';
                      final isRead = noti['isRead'] == true;
                      final id = noti['id'];

                      return InkWell(
                        onTap: () {
                          if (!isRead && id != null) {
                            ApiClient().put('/api/notifications/$id/read');
                            setSheetState(() {
                              noti['isRead'] = true;
                            });
                            setState(() {
                              noti['isRead'] = true;
                            });
                          }
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isDark
                                ? AppTheme.background
                                : AppTheme.lightBackground,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isRead
                                  ? (isDark
                                      ? AppTheme.cardBorder
                                      : AppTheme.lightBorder)
                                  : AppTheme.cyanAccent.withValues(alpha: 0.4),
                              width: isRead ? 1.0 : 1.5,
                            ),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: _getNotiColor(category)
                                      .withValues(alpha: 0.12),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  _getNotiIcon(category),
                                  color: _getNotiColor(category),
                                  size: 18,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            title,
                                            style: TextStyle(
                                              color: isDark
                                                  ? Colors.white
                                                  : AppTheme.lightTextPrimary,
                                              fontSize: 12,
                                              fontWeight: isRead
                                                  ? FontWeight.w500
                                                  : FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                        if (!isRead)
                                          Container(
                                            width: 6,
                                            height: 6,
                                            margin:
                                                const EdgeInsets.only(left: 6),
                                            decoration: const BoxDecoration(
                                              color: AppTheme.cyanAccent,
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                      ],
                                    ),
                                    if (message.isNotEmpty &&
                                        message != title) ...[
                                      const SizedBox(height: 2),
                                      Text(
                                        message,
                                        style: TextStyle(
                                          color: isDark
                                              ? AppTheme.textMuted
                                              : AppTheme.lightTextSecondary,
                                          fontSize: 11,
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                    const SizedBox(height: 4),
                                    Text(
                                      time,
                                      style: TextStyle(
                                        color: isDark
                                            ? AppTheme.textMuted
                                                .withValues(alpha: 0.7)
                                            : Colors.grey[500],
                                        fontSize: 10,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode;
    final bgCol = isDark ? AppTheme.background : AppTheme.lightBackground;
    final screenSize = MediaQuery.of(context).size;
    final bottomInset = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: bgCol,
      body: Stack(
        children: [
          SafeArea(
            bottom: false,
            child: Column(
              children: [
                // NỘI DUNG CHÍNH (THEO TAB ĐƯỢC CHỌN)
                Expanded(
                  child: _selectedBottomNavIndex == 0
                      ? _buildControlPageWithBackground(isDark)
                      : _selectedBottomNavIndex == 1
                          ? NativeShopScreen(
                              onConsultProduct: _handleConsultProduct)
                          : _selectedBottomNavIndex == 2
                              ? ChatHubScreen(
                                  prefilledDevice: _cskhPrefilledDevice,
                                  prefilledPrompt: _cskhPrefilledPrompt,
                                  onConsultProduct: _handleConsultProduct,
                                )
                              : AppSettingsScreen(
                                  onThemeChanged: _toggleTheme,
                                  onLanguageChanged: _toggleLanguage,
                                ),
                ),

                // BOTTOM NAVIGATION BAR (Flush tràn viền, không khung pill bao quanh)
                _buildBottomNavBar(isDark),
              ],
            ),
          ),

          // NÚT CSKH CHAT NỔI KÉO THẢ & VÙNG VUỐT ĐÓNG (NẰM TRÊN THANH ĐIỀU HƯỚNG ĐÁY)
          if (_selectedBottomNavIndex == 0) ...[
            _buildDismissZone(screenSize, bottomInset),
            _buildFloatingChatBubble(screenSize, bottomInset, isDark),
          ],
        ],
      ),
    );
  }

  // Trang điều khiển chính: Khôi phục nền đặc trưng AUSTEC + lớp phủ tối nhẹ giữ độ tương phản
  Widget _buildControlPageWithBackground(bool isDark) {
    return Stack(
      children: [
        Positioned.fill(
          child: Image.asset(
            "assets/austec_banner_new.png",
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) {
              return Container(color: AppTheme.dynamicBackground);
            },
          ),
        ),
        Positioned.fill(
          child: Container(
            color: Colors.black.withValues(alpha: isDark ? 0.65 : 0.45),
          ),
        ),
        Column(
          children: [
            _buildPureHeroBanner(isDark),
            _buildUserProfileAndControlCard(isDark),
            Expanded(
              child: _buildFixedHubLayout(isDark),
            ),
          ],
        ),
      ],
    );
  }

  // 1. Ảnh quảng bá độc lập (Pure Hero Banner) ở trên cùng: Chiều cao bằng khoảng 3/4 so với trước, dạng cover full khung chứa không che khuất phía dưới
  Widget _buildPureHeroBanner(bool isDark) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      decoration: BoxDecoration(
        color: isDark
            ? const Color(0xFF141417).withValues(alpha: 0.45)
            : Colors.white.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? const Color(0xFF27272A) : const Color(0xFFCBD5E1),
          width: 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.08),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(13),
        child: AspectRatio(
          aspectRatio: 800 /
              (450 *
                  0.75), // Giảm chiều cao xuống khoảng 3/4 để thoáng không gian bên dưới
          child: Image.asset(
            "assets/header.png",
            width: double.infinity,
            fit: BoxFit.cover, // Full hình trong khung chứa tương ứng
            alignment: Alignment.center,
            errorBuilder: (context, error, stackTrace) {
              return Container(
                color:
                    isDark ? const Color(0xFF141417) : const Color(0xFFE2E8F0),
              );
            },
          ),
        ),
      ),
    );
  }

  // Khối thông tin người dùng, lời chào & thời gian dạng trong suốt trên nền app
  Widget _buildUserProfileAndControlCard(bool isDark) {
    final user = AuthService().currentUser;
    final userName = user?.fullName ?? "Chủ nhà";
    final userProvince = user?.province ?? "Hà Nội";
    final cardBorder = Colors.white.withValues(alpha: isDark ? 0.16 : 0.26);
    final cardBg = isDark
        ? Colors.black.withValues(alpha: 0.28)
        : Colors.black.withValues(alpha: 0.20);
    const textCol = Colors.white;
    const subTextCol = Color(0xFFCBD5E1);
    final pillBg = Colors.black.withValues(alpha: 0.30);

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 3),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cardBorder, width: 1.0),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  InkWell(
                    onTap: () async {
                      await Navigator.of(context).push(
                        MaterialPageRoute(
                            builder: (_) => const UserProfileScreen()),
                      );
                      if (mounted) setState(() {});
                    },
                    borderRadius: BorderRadius.circular(18),
                    child: Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.black.withValues(alpha: 0.35),
                        border: Border.all(
                            color: AppTheme.cyanAccent.withValues(alpha: 0.65),
                            width: 1.4),
                      ),
                      child: ClipOval(
                        child: (user?.avatarUrl != null &&
                                user!.avatarUrl!.isNotEmpty)
                            ? Image.network(
                                user.avatarUrl!.startsWith('http')
                                    ? user.avatarUrl!
                                    : '${ApiConfig.baseUrl}${user.avatarUrl!}',
                                width: 34,
                                height: 34,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(
                                    Icons.person_rounded,
                                    color: textCol,
                                    size: 18),
                              )
                            : const Icon(Icons.person_rounded,
                                color: textCol, size: 18),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "${AppTheme.t("welcome")}, $userName",
                        style: const TextStyle(
                          color: textCol,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          shadows: [
                            Shadow(
                                color: Colors.black54,
                                blurRadius: 4,
                                offset: Offset(0, 1)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 1),
                      Row(
                        children: [
                          const Icon(Icons.location_on_outlined,
                              color: AppTheme.cyanAccent, size: 12),
                          const SizedBox(width: 3),
                          Text(
                            "$userProvince · 30°C",
                            style: AppTheme.tabular(
                              const TextStyle(
                                color: subTextCol,
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),

              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: pillBg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: cardBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      _timeString,
                      style: AppTheme.tabular(
                        const TextStyle(
                          color: textCol,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          fontFamily: "monospace",
                        ),
                      ),
                    ),
                    Text(
                      _dateString,
                      style: AppTheme.tabular(
                        const TextStyle(
                          color: subTextCol,
                          fontSize: 9.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 7),
          Divider(color: cardBorder, height: 1),
          const SizedBox(height: 6),

          Row(
            children: [
              InkWell(
                onTap: _toggleTheme,
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                  decoration: BoxDecoration(
                    color: pillBg,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: cardBorder),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                        size: 13,
                        color: isDark ? AppTheme.cyanAccent : Colors.amber[300],
                      ),
                      const SizedBox(width: 4),
                      Text(
                        isDark
                            ? (AppTheme.currentLang == "vi" ? "Tối" : "Dark")
                            : (AppTheme.currentLang == "vi" ? "Sáng" : "Light"),
                        style: const TextStyle(
                            color: textCol,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(width: 6),

              InkWell(
                onTap: _toggleLanguage,
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                  decoration: BoxDecoration(
                    color: pillBg,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: cardBorder),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.translate_rounded, size: 13, color: AppTheme.cyanAccent),
                      const SizedBox(width: 4),
                      Text(
                        AppTheme.currentLang == "vi" ? "VI" : "EN",
                        style: const TextStyle(
                            color: textCol,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(width: 4),

              IconButton(
                icon: const Icon(Icons.search_rounded, size: 18, color: textCol),
                tooltip: AppTheme.t("search_device"),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                onPressed: _openSearchDialog,
              ),

              IconButton(
                icon: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    const Icon(Icons.notifications_none_rounded,
                        size: 18, color: textCol),
                    if (_realNotifications.any((n) => n['isRead'] != true))
                      Positioned(
                        top: 0,
                        right: 0,
                        child: Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: AppTheme.cyanAccent,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                  ],
                ),
                tooltip: AppTheme.t("notifications"),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                onPressed: _openNotificationCenter,
              ),

              const Spacer(),

              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.brandBlue,
                  foregroundColor: Colors.white,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  minimumSize: const Size(0, 28),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8)),
                  elevation: 0,
                ),
                icon: const Icon(Icons.add_rounded, size: 14),
                label: Text(
                  AppTheme.currentLang == "vi" ? "Thêm thiết bị" : "Add device",
                  style: const TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w600),
                ),
                onPressed: () async {
                  await Navigator.of(context).push(
                    MaterialPageRoute(
                        builder: (context) => const ProvisioningScreen()),
                  );
                  await _gateway.fetchDevicesFromBackend();
                  if (mounted) setState(() {});
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  // 3. Bố Cục Tâm & Các Khối Xung Quanh CỐ ĐỊNH (Tâm Nhà Của Tôi & 7 Danh Mục Xung Quanh)
  Widget _buildFixedHubLayout(bool isDark) {
    final categories = _gateway.categories;
    final textCol = Colors.white;

    return LayoutBuilder(
      builder: (context, constraints) {
        final w = constraints.maxWidth;
        final h = constraints.maxHeight;
        final center = Offset(w / 2, h / 2 - 8);

        return Stack(
          alignment: Alignment.center,
          children: [
            // 1. Tâm "NHÀ CỦA TÔI" & Các vòng đồng tâm phát sáng
            Positioned(
              left: center.dx - 120,
              top: center.dy - 120,
              width: 240,
              height: 240,
              child: AnimatedBuilder(
                animation: _pulseController,
                builder: (context, child) {
                  final pulseVal = _pulseController.value;
                  return Stack(
                    alignment: Alignment.center,
                    children: [
                      // Vòng ngoài lớn (Subtle monochrome ring)
                      Container(
                        width: 220 + pulseVal * 8,
                        height: 220 + pulseVal * 8,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: (isDark ? Colors.white : Colors.black)
                                .withValues(alpha: 0.08 + pulseVal * 0.05),
                            width: 1.0,
                          ),
                        ),
                      ),
                      // Vòng nhỡ
                      Container(
                        width: 170,
                        height: 170,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: (isDark ? Colors.white : Colors.black)
                                .withValues(alpha: 0.12),
                            width: 1.0,
                          ),
                        ),
                      ),
                      // Lõi trung tâm Nhà Của Tôi (gọn hơn + điểm nhấn xanh Austec)
                      Container(
                        width: 112,
                        height: 112,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: RadialGradient(
                            colors: isDark
                                ? const [Color(0xFF1E293B), Color(0xFF0F172A)]
                                : const [Color(0xFFFFFFFF), Color(0xFFEFF6FF)],
                          ),
                          border: Border.all(
                            color: AppTheme.brandBlue.withValues(alpha: isDark ? 0.55 : 0.45),
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.brandBlue
                                  .withValues(alpha: isDark ? 0.28 : 0.14),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.home_work_rounded,
                              color: isDark ? AppTheme.cyanAccent : AppTheme.brandBlue,
                              size: 32,
                            ),
                            const SizedBox(height: 5),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 3),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? const Color(0xFF090A0C)
                                    : Colors.white,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: AppTheme.brandBlue.withValues(alpha: 0.35),
                                  width: 1.0,
                                ),
                              ),
                              child: Text(
                                AppTheme.t("my_home"),
                                style: TextStyle(
                                  color: isDark ? Colors.white : AppTheme.brandBlue,
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1.0,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),

            // 2. Các Khối Danh Mục Xung Quanh CỐ ĐỊNH (Thon gọn, điểm nhấn xanh)
            ...categories.map((cat) {
              final catDevices = _gateway.getDevicesByCategory(cat.category);
              final posX = center.dx + cat.offsetX - 41;
              final posY = center.dy + cat.offsetY - 36;

              return Positioned(
                left: posX,
                top: posY,
                child: _buildFixedCategorySphere(
                    cat, catDevices.length, isDark, textCol),
              );
            }),
          ],
        );
      },
    );
  }

  // Khối danh mục thon gọn hơn (82x66), icon xanh hài hòa
  Widget _buildFixedCategorySphere(
      CategoryMeta cat, int deviceCount, bool isDark, Color textCol) {
    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.16)
        : const Color(0xFFCBD5E1);

    return InkWell(
      onTap: () => _openCategoryDevices(cat),
      borderRadius: BorderRadius.circular(14),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 82,
            height: 66,
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 5),
            decoration: BoxDecoration(
              color: isDark
                  ? const Color(0xFF141821).withValues(alpha: 0.90)
                  : Colors.white.withValues(alpha: 0.94),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: borderColor, width: 1.1),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.28 : 0.08),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 22,
                  height: 22,
                  child: Image.asset(
                    cat.assetPath,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) {
                      return Icon(_getCategoryFallbackIcon(cat.category),
                          color: isDark ? AppTheme.cyanAccent : AppTheme.brandBlue,
                          size: 20);
                    },
                  ),
                ),
                const SizedBox(height: 3),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    _formatCategoryTitle(cat.title),
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    softWrap: false,
                    style: TextStyle(
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.2,
                      height: 1.12,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 3),

          // Huy hiệu số lượng thiết bị
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
            decoration: BoxDecoration(
              color: deviceCount > 0
                  ? (isDark
                      ? const Color(0xFF1E3A8A).withValues(alpha: 0.55)
                      : const Color(0xFFEFF6FF))
                  : (isDark
                      ? Colors.black.withValues(alpha: 0.45)
                      : Colors.white.withValues(alpha: 0.85)),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: deviceCount > 0
                    ? AppTheme.brandBlue.withValues(alpha: 0.45)
                    : (isDark
                        ? Colors.white.withValues(alpha: 0.14)
                        : const Color(0xFFCBD5E1)),
                width: 1,
              ),
            ),
            child: Text(
              "$deviceCount ${AppTheme.t("devices")}",
              style: TextStyle(
                color: deviceCount > 0
                    ? (isDark ? const Color(0xFF93C5FD) : AppTheme.brandBlue)
                    : (isDark
                        ? const Color(0xFFCBD5E1)
                        : const Color(0xFF475569)),
                fontSize: 8.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Định dạng tên danh mục để ngắt dòng đẹp mắt
  String _formatCategoryTitle(String rawTitle) {
    switch (rawTitle.toUpperCase().trim()) {
      case "ENERGY MANAGE":
        return "ENERGY\nMANAGE";
      case "LIGHT & SWITCH":
        return "LIGHT &\nSWITCH";
      case "OTHERS CONTROL":
        return "OTHERS\nCONTROL";
      case "DATA ANALYTICS":
        return "DATA\nANALYTICS";
      case "CAMERA":
      case "AI CAMERA":
        return "CAMERA";
      default:
        return rawTitle;
    }
  }

  IconData _getCategoryFallbackIcon(DeviceCategory category) {
    switch (category) {
      case DeviceCategory.rollerDoor:
        return Icons.roller_shades_closed_outlined;
      case DeviceCategory.energyManage:
        return Icons.electric_meter_rounded;
      case DeviceCategory.environment:
        return Icons.cloud_outlined;
      case DeviceCategory.othersControl:
        return Icons.developer_board_rounded;
      case DeviceCategory.dataAnalytics:
        return Icons.analytics_outlined;
      case DeviceCategory.lightSwitch:
        return Icons.lightbulb_outline_rounded;
      case DeviceCategory.camera:
        return Icons.videocam_outlined;
    }
  }

  // 1. Vùng nhả đáy màn hình để đóng nút chat CSKH (Nằm phía trên thanh điều hướng đáy)
  Widget _buildDismissZone(Size screenSize, double bottomInset) {
    if (!_isDraggingChat || _isChatButtonDismissed) {
      return const SizedBox.shrink();
    }

    final dismissBottom = 72.0 + bottomInset;
    final currentOffset = _chatButtonOffset ??
        Offset(
            screenSize.width - 68, screenSize.height - (dismissBottom + 100));
    final isOver = currentOffset.dy > screenSize.height - (dismissBottom + 64);

    return Positioned(
      bottom: dismissBottom,
      left: screenSize.width / 2 - 75,
      child: IgnorePointer(
        ignoring: true,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: 150,
          height: 48,
          decoration: BoxDecoration(
            color: isOver
                ? const Color(0xFFDC2626).withValues(alpha: 0.95)
                : Colors.black.withValues(alpha: 0.8),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: isOver ? Colors.white : Colors.white24,
              width: 1.4,
            ),
            boxShadow: [
              BoxShadow(
                color: (isOver ? const Color(0xFFDC2626) : Colors.black)
                    .withValues(alpha: 0.5),
                blurRadius: 12,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.close_rounded, color: Colors.white, size: 18),
              SizedBox(width: 6),
              Text(
                "Thả để đóng",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 11.5,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // 2. Nút Chat CSKH Nổi Kéo Thả Tự Do & Hút Mép Màn Hình
  Widget _buildFloatingChatBubble(
      Size screenSize, double bottomInset, bool isDark) {
    if (_isChatButtonDismissed) return const SizedBox.shrink();

    final dismissBottom = 72.0 + bottomInset;
    final defaultOffset = Offset(
        screenSize.width - 68, screenSize.height - (dismissBottom + 100));
    final currentOffset = _chatButtonOffset ?? defaultOffset;
    final isOverDismissZone = _isDraggingChat &&
        (currentOffset.dy > screenSize.height - (dismissBottom + 64));

    return Positioned(
      left: currentOffset.dx,
      top: currentOffset.dy,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onPanStart: (_) {
          setState(() {
            _isDraggingChat = true;
            _chatDragDistance = 0.0;
          });
        },
        onPanUpdate: (details) {
          _chatDragDistance += details.delta.distance;
          setState(() {
            final newX = currentOffset.dx + details.delta.dx;
            final newY = currentOffset.dy + details.delta.dy;
            _chatButtonOffset = Offset(
              newX.clamp(12.0, screenSize.width - 64),
              newY.clamp(60.0, screenSize.height - (dismissBottom + 16)),
            );
          });
        },
        onPanEnd: (_) {
          if (isOverDismissZone) {
            setState(() {
              _isChatButtonDismissed = true;
              _isDraggingChat = false;
              _chatDragDistance = 0.0;
            });
            AppToast.showInfo("Đã ẩn nút CSKH. Bạn có thể mở lại tại tab Tin nhắn.");
          } else {
            // Snap to nearest side edge (left or right)
            final snapX = (currentOffset.dx + 26 < screenSize.width / 2)
                ? 16.0
                : (screenSize.width - 68);
            setState(() {
              _chatButtonOffset = Offset(
                  snapX,
                  currentOffset.dy
                      .clamp(80.0, screenSize.height - (dismissBottom + 70)));
              _isDraggingChat = false;
              _chatDragDistance = 0.0;
            });
          }
        },
        onTap: () {
          // Chỉ mở tab Tin nhắn CSKH nếu chạm nhẹ tại chỗ (không phải đang kéo thả)
          if (!_isDraggingChat && _chatDragDistance < 8.0) {
            setState(() {
              _selectedBottomNavIndex = 2; // Chuyển sang Tab CSKH Chat
            });
          }
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            color: AppTheme.brandBlue,
            shape: BoxShape.circle,
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.35),
              width: 1.4,
            ),
            boxShadow: [
              BoxShadow(
                color: AppTheme.brandBlue.withValues(alpha: 0.4),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: const Center(
            child: Icon(
              Icons.support_agent_rounded,
              color: Colors.white,
              size: 25,
            ),
          ),
        ),
      ),
    );
  }

  // 3. Bottom Navigation Bar (4 Tab: Điều khiển, Gian hàng, Tin nhắn, Cài đặt) - Gọn gàng, loại bỏ viền bao quanh
  Widget _buildBottomNavBar(bool isDark) {
    final bg = isDark ? const Color(0xFF141417) : Colors.white;
    final topBorder =
        isDark ? const Color(0xFF27272A) : const Color(0xFFE2E8F0);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: bg,
        border: Border(top: BorderSide(color: topBorder, width: 1.0)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(
                  0, Icons.grid_view_rounded, AppTheme.t("control"), isDark),
              _buildNavItem(
                  1, Icons.storefront_rounded, AppTheme.t("shop"), isDark),
              _buildNavItem(2, Icons.forum_rounded, AppTheme.t("chat"), isDark),
              _buildNavItem(
                  3,
                  Icons.settings_rounded,
                  AppTheme.currentLang == 'vi' ? "Cài đặt" : "Settings",
                  isDark),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label, bool isDark) {
    final isSelected = _selectedBottomNavIndex == index;
    final activeTextColor = AppTheme.dynamicAccent;
    final inactiveTextColor =
        isDark ? const Color(0xFF71717A) : const Color(0xFF94A3B8);

    return InkWell(
      onTap: () {
        setState(() {
          _selectedBottomNavIndex = index;
          if (index == 2) {
            _isChatButtonDismissed =
                false; // Phục hồi nút chat khi người dùng vào tab Chat
          }
        });
      },
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isSelected ? activeTextColor : inactiveTextColor,
              size: 22,
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? activeTextColor : inactiveTextColor,
                fontSize: 10.5,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
