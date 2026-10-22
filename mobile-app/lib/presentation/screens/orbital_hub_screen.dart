import 'package:flutter/material.dart';
import 'dart:async';
import '../../core/constants/app_theme.dart';
import '../../core/models/device_model.dart';
import '../../core/services/iot_gateway_client.dart';
import 'category_device_list_sheet.dart';
import 'native_shop_screen.dart';
import 'cskh_chat_screen.dart';
import 'provisioning_screen.dart';
import 'app_settings_screen.dart';
import '../../core/services/auth_service.dart';

class OrbitalHubScreen extends StatefulWidget {
  const OrbitalHubScreen({super.key});

  @override
  State<OrbitalHubScreen> createState() => _OrbitalHubScreenState();
}

class _OrbitalHubScreenState extends State<OrbitalHubScreen> with SingleTickerProviderStateMixin {
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
      _cskhPrefilledPrompt = "Xin chào CSKH Austec! Tôi cần tư vấn và báo giá chi tiết về sản phẩm ${product.name}.";
      _selectedBottomNavIndex = 2; // Chuyển sang Tab CSKH Chat (Navbar giữ nguyên)
    });
  }

  // Thời gian thực
  late Timer _clockTimer;
  String _timeString = "";
  String _dateString = "";

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);

    final now = DateTime.now();
    _timeString = "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}";
    _dateString = "${now.day.toString().padLeft(2, '0')}/${now.month.toString().padLeft(2, '0')}/${now.year}";

    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) => _updateClock());
    
    // Nạp danh sách thiết bị thật của người dùng từ Backend API
    _gateway.fetchDevicesFromBackend(token: AuthService().token).then((_) {
      if (mounted) setState(() {});
    });
  }

  void _updateClock() {
    final now = DateTime.now();
    if (mounted) {
      setState(() {
        _timeString = "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}";
        _dateString = "${now.day.toString().padLeft(2, '0')}/${now.month.toString().padLeft(2, '0')}/${now.year}";
      });
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _clockTimer.cancel();
    super.dispose();
  }

  void _toggleTheme() {
    setState(() {
      AppTheme.isDarkMode = !AppTheme.isDarkMode;
    });
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
        title: Text(AppTheme.t("search_device"), style: TextStyle(color: isDark ? Colors.white : Colors.black, fontSize: 16)),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: TextStyle(color: isDark ? Colors.white : Colors.black),
          decoration: InputDecoration(
            hintText: "Nhập tên hoặc mã thiết bị...",
            hintStyle: TextStyle(color: isDark ? AppTheme.textMuted : Colors.grey),
            prefixIcon: const Icon(Icons.search, color: AppTheme.cyanAccent),
            enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: isDark ? AppTheme.cardBorder : Colors.grey[300]!)),
            focusedBorder: const OutlineInputBorder(borderSide: BorderSide(color: AppTheme.cyanAccent)),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(AppTheme.t("cancel")),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.cyanAccent, foregroundColor: Colors.black),
            onPressed: () {
              Navigator.of(ctx).pop();
              final q = controller.text.trim().toLowerCase();
              if (q.isNotEmpty) {
                final found = _gateway.devices.where((d) => d.name.toLowerCase().contains(q) || d.hardwareId.toLowerCase().contains(q)).toList();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text("Tìm thấy ${found.length} thiết bị phù hợp với '$q'"),
                    backgroundColor: isDark ? AppTheme.surfaceGlass : Colors.grey[800],
                    behavior: SnackBarBehavior.floating,
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

  void _openNotificationCenter() {
    final isDark = AppTheme.isDarkMode;
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDark ? AppTheme.surface : AppTheme.lightSurface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border(top: BorderSide(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder, width: 1.5)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: isDark ? AppTheme.textMuted : Colors.grey[400], borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                const Icon(Icons.notifications_active, color: AppTheme.cyanAccent, size: 20),
                const SizedBox(width: 8),
                Text(
                  AppTheme.t("notifications"),
                  style: TextStyle(color: isDark ? Colors.white : AppTheme.lightTextPrimary, fontSize: 15, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 14),
            _buildNotiItem("Cửa Cuốn Mặt Tiền (amtuong834) đã đóng an toàn 100%", "Lúc 08:15 • Remote RF #1", Icons.check_circle, AppTheme.emeraldSuccess, isDark),
            _buildNotiItem("Chế độ Khóa Trẻ Em đã được kích hoạt", "Lúc 10:05 • App Mobile", Icons.security, AppTheme.cyanAccent, isDark),
            _buildNotiItem("Nhiệt độ phòng khách đạt 32°C • Độ ẩm 68%", "Lúc 11:20 • Cảm biến Môi Trường", Icons.thermostat, AppTheme.amberWarning, isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildNotiItem(String title, String time, IconData icon, Color color, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.background : AppTheme.lightBackground,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? AppTheme.cardBorder : AppTheme.lightBorder),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(color: isDark ? Colors.white : AppTheme.lightTextPrimary, fontSize: 12, fontWeight: FontWeight.w600),
                ),
                Text(
                  time,
                  style: TextStyle(color: isDark ? AppTheme.textMuted : AppTheme.lightTextSecondary, fontSize: 10),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode;
    final bgCol = isDark ? AppTheme.background : AppTheme.lightBackground;

    return Scaffold(
      backgroundColor: bgCol,
      body: Stack(
        children: [
          // Nền Cyberpunk Ambient Glow nếu ở Dark Mode
          if (isDark) ...[
            Positioned(
              top: -100,
              left: -80,
              child: Container(
                width: 320,
                height: 320,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [AppTheme.blueAccent.withValues(alpha: 0.16), Colors.transparent],
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: 80,
              right: -100,
              child: Container(
                width: 340,
                height: 340,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [AppTheme.cyanAccent.withValues(alpha: 0.12), Colors.transparent],
                  ),
                ),
              ),
            ),
          ],

          SafeArea(
            child: Column(
              children: [
                // NỘI DUNG CHÍNH (THEO TAB ĐƯỢC CHỌN)
                Expanded(
                  child: _selectedBottomNavIndex == 0
                      ? _buildControlPageWithBackground(isDark)
                      : _selectedBottomNavIndex == 1
                          ? NativeShopScreen(onConsultProduct: _handleConsultProduct)
                          : _selectedBottomNavIndex == 2
                              ? CskhChatScreen(
                                  initialDevice: _cskhPrefilledDevice,
                                  initialPrompt: _cskhPrefilledPrompt,
                                )
                              : AppSettingsScreen(
                                  onThemeChanged: _toggleTheme,
                                  onLanguageChanged: _toggleLanguage,
                                ),
                ),

                // BOTTOM NAVIGATION BAR
                _buildBottomNavBar(isDark),
              ],
            ),
          ),

          // NÚT CSKH CHAT NỔI (CHỈ HIỂN THỊ TẠI TRANG ĐIỀU KHIỂN)
          if (_selectedBottomNavIndex == 0) _buildFloatingChatBubble(),
        ],
      ),
    );
  }

  // TRANG ĐIỀU KHIỂN: Nền là assets/background1.png (trước đây là nền Nhà của tôi) và Hero Header tích hợp trên assets/header.png
  Widget _buildControlPageWithBackground(bool isDark) {
    return Stack(
      children: [
        // 1. NỀN DỰ ÁN CỦA TOÀN BỘ TRANG ĐIỀU KHIỂN (assets/background1.png)
        Positioned.fill(
          child: Image.asset(
            "assets/background1.png",
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) {
              return Container(color: isDark ? AppTheme.background : AppTheme.lightBackground);
            },
          ),
        ),

        // Lớp phủ Gradient tối nhẹ để các nút danh mục và chữ nổi bật sắc nét
        Positioned.fill(
          child: Container(
            color: Colors.black.withValues(alpha: isDark ? 0.65 : 0.45),
          ),
        ),

        // 2. NỘI DUNG TRANG ĐIỀU KHIỂN
        Column(
          children: [
            // HERO BANNER TÍCH HỢP (assets/header.png): Hiển thị trực tiếp Lời chào, Vị trí/Nhiệt độ, Thời gian và Thanh công cụ
            _buildControlHeroHeader(isDark),

            // KHÔNG GIAN BỐ CỤC CHÍNH (CỐ ĐỊNH NHÀ CỦA TÔI & CÁC DANH MỤC)
            Expanded(
              child: _buildFixedHubLayout(isDark),
            ),
          ],
        ),
      ],
    );
  }

  // Hero Header trên ảnh header.png: Hiển thị Avatar, Lời chào, Thời gian, Nút công cụ trực tiếp trên ảnh
  Widget _buildControlHeroHeader(bool isDark) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.5), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: AppTheme.cyanAccent.withValues(alpha: 0.2),
            blurRadius: 14,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(17),
        child: Stack(
          children: [
            // 1. Ảnh nền ngôi nhà thông minh header.png
            Positioned.fill(
              child: Image.asset(
                "assets/header.png",
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  );
                },
              ),
            ),

            // 2. Lớp phủ Gradient tối để tương phản chữ và icon
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.black.withValues(alpha: 0.42),
                      Colors.black.withValues(alpha: 0.8),
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
              ),
            ),

            // 3. Nội dung hiển thị trực tiếp trên hình ảnh
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Hàng 1: Avatar, Lời chào, Vị trí/Nhiệt độ & Đồng hồ thời gian thực
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Avatar & Lời chào
                      Row(
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: AppTheme.cyanGradient,
                              border: Border.all(color: Colors.white, width: 1.5),
                              boxShadow: [
                                BoxShadow(
                                  color: AppTheme.cyanAccent.withValues(alpha: 0.4),
                                  blurRadius: 8,
                                ),
                              ],
                            ),
                            child: const Icon(Icons.person, color: Colors.white, size: 22),
                          ),
                          const SizedBox(width: 10),
                          Builder(
                            builder: (context) {
                              final user = AuthService().currentUser;
                              final userName = user?.fullName ?? "Nguyễn Văn An";
                              final userProvince = user?.province ?? "Hà Nội";

                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    "${AppTheme.t("welcome")}, $userName",
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.bold,
                                      shadows: [
                                        Shadow(color: Colors.black, blurRadius: 4, offset: Offset(0, 1)),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Row(
                                    children: [
                                      const Icon(Icons.location_on_outlined, color: AppTheme.cyanAccent, size: 12),
                                      const SizedBox(width: 2),
                                      Text(
                                        "$userProvince • 30°C • Bình thường",
                                        style: const TextStyle(
                                          color: Colors.white70,
                                          fontSize: 10.5,
                                          shadows: [
                                            Shadow(color: Colors.black, blurRadius: 4, offset: Offset(0, 1)),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              );
                            },
                          ),
                        ],
                      ),

                      // Đồng hồ thời gian thực
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.65),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.5)),
                        ),
                        child: Column(
                          children: [
                            Text(
                              _timeString,
                              style: const TextStyle(
                                color: AppTheme.cyanAccent,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                fontFamily: "monospace",
                              ),
                            ),
                            Text(
                              _dateString,
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 8.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 8),
                  Container(height: 1, color: Colors.white.withValues(alpha: 0.15)),
                  const SizedBox(height: 6),

                  // Hàng 2: Thanh công cụ Dark/Light, Ngôn ngữ, Tìm kiếm, Chuông, Ghép nối
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Nút Chuyển Đổi Dark / Light Mode
                      InkWell(
                        onTap: _toggleTheme,
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                          ),
                          child: Row(
                            children: [
                              Icon(isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded, size: 14, color: isDark ? AppTheme.cyanAccent : Colors.orange),
                              const SizedBox(width: 4),
                              Text(
                                isDark ? AppTheme.t("dark_mode") : AppTheme.t("light_mode"),
                                style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Nút Chuyển Đổi Ngôn Ngữ (VI / EN)
                      InkWell(
                        onTap: _toggleLanguage,
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppTheme.purpleAccent.withValues(alpha: 0.5)),
                          ),
                          child: Row(
                            children: [
                              Text(AppTheme.currentLang == "vi" ? "🇻🇳" : "🇬🇧", style: const TextStyle(fontSize: 12)),
                              const SizedBox(width: 4),
                              Text(
                                AppTheme.currentLang == "vi" ? "VI" : "EN",
                                style: const TextStyle(color: AppTheme.purpleAccent, fontSize: 10.5, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Cụm Nút Tìm kiếm, Chuông thông báo, Ghép nối thiết bị
                      Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.search, size: 19, color: Colors.white),
                            tooltip: AppTheme.t("search_device"),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
                            onPressed: _openSearchDialog,
                          ),
                          const SizedBox(width: 2),
                          IconButton(
                            icon: const Icon(Icons.notifications_none_rounded, size: 19, color: AppTheme.cyanAccent),
                            tooltip: AppTheme.t("notifications"),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
                            onPressed: _openNotificationCenter,
                          ),
                          const SizedBox(width: 4),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.cyanAccent,
                              foregroundColor: Colors.black,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              minimumSize: const Size(0, 28),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            icon: const Icon(Icons.add, size: 14),
                            label: Text(
                              AppTheme.t("add_device"),
                              style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold),
                            ),
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (context) => const ProvisioningScreen()),
                              );
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
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
                      // Vòng ngoài lớn phát sáng
                      Container(
                        width: 220 + pulseVal * 12,
                        height: 220 + pulseVal * 12,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppTheme.cyanAccent.withValues(alpha: 0.2 + pulseVal * 0.2),
                            width: 1.5,
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
                            color: AppTheme.blueAccent.withValues(alpha: 0.35),
                            width: 1.2,
                          ),
                        ),
                      ),
                      // Lõi trung tâm Nhà Của Tôi
                      Container(
                        width: 130,
                        height: 130,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: const RadialGradient(
                            colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                          ),
                          border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.6), width: 1.5),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.cyanAccent.withValues(alpha: 0.3),
                              blurRadius: 20,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.home_work_rounded, color: Colors.white, size: 38),
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.75),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppTheme.cyanAccent, width: 1.2),
                              ),
                              child: Text(
                                AppTheme.t("my_home"),
                                style: const TextStyle(
                                  color: AppTheme.cyanAccent,
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 1.2,
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

            // 2. Các Khối Danh Mục Xung Quanh CỐ ĐỊNH (Fixed Offsets, hoàn toàn KHÔNG di chuyển/xoay)
            ...categories.map((cat) {
              final catDevices = _gateway.getDevicesByCategory(cat.category);
              final posX = center.dx + cat.offsetX - 46;
              final posY = center.dy + cat.offsetY - 42;

              return Positioned(
                left: posX,
                top: posY,
                child: _buildFixedCategorySphere(cat, catDevices.length, isDark, textCol),
              );
            }),
          ],
        );
      },
    );
  }

  // Khối danh mục hình vuông bo góc cố định
  Widget _buildFixedCategorySphere(CategoryMeta cat, int deviceCount, bool isDark, Color textCol) {
    final borderColor = cat.neonColor;

    return InkWell(
      onTap: () => _openCategoryDevices(cat),
      borderRadius: BorderRadius.circular(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 92,
            height: 78,
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: borderColor, width: 1.8),
              boxShadow: [
                BoxShadow(
                  color: borderColor.withValues(alpha: 0.35),
                  blurRadius: 12,
                  spreadRadius: 1,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Icon danh mục
                SizedBox(
                  width: 26,
                  height: 26,
                  child: Image.asset(
                    cat.assetPath,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) {
                      return Icon(_getCategoryFallbackIcon(cat.category), color: borderColor, size: 22);
                    },
                  ),
                ),
                const SizedBox(height: 4),

                // Tên danh mục (Được format ngắt dòng 2 hàng thông minh, không bao giờ bị cắt chữ ...)
                Text(
                  _formatCategoryTitle(cat.title),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: textCol,
                    fontSize: 9.5,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.3,
                    height: 1.15,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 4),

          // Huy hiệu số lượng thiết bị
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: borderColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: borderColor.withValues(alpha: 0.6), width: 1),
            ),
            child: Text(
              "$deviceCount ${AppTheme.t("devices")}",
              style: TextStyle(
                color: borderColor,
                fontSize: 8.5,
                fontWeight: FontWeight.bold,
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
      case "AI CAMERA":
        return "AI\nCAMERA";
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

  // Floating Chat Bubble CSKH
  Widget _buildFloatingChatBubble() {
    return Positioned(
      right: 18,
      bottom: 80,
      child: InkWell(
        onTap: () {
          setState(() {
            _selectedBottomNavIndex = 2; // Chuyển sang Tab CSKH Chat
          });
        },
        borderRadius: BorderRadius.circular(30),
        child: Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            gradient: AppTheme.cyanGradient,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: AppTheme.cyanAccent.withValues(alpha: 0.45),
                blurRadius: 14,
                spreadRadius: 2,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: const Center(
            child: Icon(
              Icons.chat_bubble_rounded,
              color: Colors.white,
              size: 26,
            ),
          ),
        ),
      ),
    );
  }

  // Bottom Navigation Bar (4 Tab: Điều khiển, Gian hàng, Tin nhắn, Cài đặt)
  Widget _buildBottomNavBar(bool isDark) {
    final bg = isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface;
    final border = isDark ? AppTheme.cardBorder : AppTheme.lightBorder;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: border, width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildNavItem(0, Icons.grid_view_rounded, AppTheme.t("control"), isDark),
          _buildNavItem(1, Icons.storefront_rounded, AppTheme.t("shop"), isDark),
          _buildNavItem(2, Icons.forum_rounded, AppTheme.t("chat"), isDark),
          _buildNavItem(3, Icons.settings_rounded, AppTheme.currentLang == 'vi' ? "Cài đặt" : "Settings", isDark),
        ],
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label, bool isDark) {
    final isSelected = _selectedBottomNavIndex == index;
    final activeColor = AppTheme.cyanAccent;
    final inactiveColor = isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary;

    return InkWell(
      onTap: () {
        setState(() {
          _selectedBottomNavIndex = index;
        });
      },
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? activeColor.withValues(alpha: 0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? activeColor.withValues(alpha: 0.4) : Colors.transparent,
            width: 1,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: isSelected ? activeColor : inactiveColor, size: 20),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? activeColor : inactiveColor,
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
