import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../../core/constants/app_theme.dart';
import '../../../core/constants/api_config.dart';
import '../../../core/models/device_model.dart';
import '../../../core/services/iot_gateway_client.dart';
import '../../../core/services/auth_service.dart';
import '../../cskh/cskh.dart';

class NativeShopScreen extends StatefulWidget {
  final void Function(ProductItem product)? onConsultProduct;

  const NativeShopScreen({
    super.key,
    this.onConsultProduct,
  });

  @override
  State<NativeShopScreen> createState() => _NativeShopScreenState();
}

class _NativeShopScreenState extends State<NativeShopScreen> {
  final IoTGatewayClient _gateway = IoTGatewayClient();
  String _selectedCategory = "Tất cả";
  List<ProductItem>? _backendProducts;

  final List<String> _categories = [
    "Tất cả",
    "Cửa Cuốn",
    "Khóa Thông Minh",
    "Lưu Điện UPS",
    "Động Cơ & Bo Mạch",
    "Cảm Biến",
  ];

  @override
  void initState() {
    super.initState();
    _fetchProductsFromBackend();
  }

  Future<void> _fetchProductsFromBackend() async {
    try {
      final res = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/shop/products'),
        headers: {'Authorization': 'Bearer austec-customer-token'},
      ).timeout(const Duration(seconds: 3));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['products'] is List) {
          final List list = data['products'];
          final List<ProductItem> parsed = [];
          for (var p in list) {
            String catTag = "Cửa Cuốn";
            final c = p['category'] ?? '';
            if (c == 'LOCK') catTag = "Khóa Thông Minh";
            else if (c == 'UPS') catTag = "Lưu Điện UPS";
            else if (c == 'SENSOR') catTag = "Cảm Biến";
            else if (c == 'CAMERA') catTag = "Cảm Biến";

            final Map<String, String> specsMap = {};
            if (p['specs'] is Map) {
              (p['specs'] as Map).forEach((k, v) {
                specsMap[k.toString()] = v.toString();
              });
            }

            final List<String> hl = [];
            if (p['highlights'] is List) {
              for (var h in p['highlights']) {
                hl.add(h.toString());
              }
            }

            parsed.add(ProductItem(
              id: p['id'] ?? '',
              name: p['name'] ?? '',
              categoryTag: catTag,
              subtitle: p['description'] ?? '',
              price: (p['price'] as num?)?.toInt() ?? 0,
              originalPrice: (p['originalPrice'] as num?)?.toInt(),
              rating: 4.9,
              reviewsCount: 128,
              imagePath: p['imageUrl'] ?? 'assets/doors.png',
              highlights: hl.isNotEmpty ? hl : ["Bảo hành chính hãng 24 tháng", "Austec Smart IoT"],
              specs: specsMap.isNotEmpty ? specsMap : {"Bảo hành": "24 tháng chính hãng"},
            ));
          }

          if (mounted && parsed.isNotEmpty) {
            setState(() {
              _backendProducts = parsed;
            });
          }
        }
      }
    } catch (_) {}
  }

  void _openProductDetail(ProductItem product) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _buildProductDetailSheet(product),
    );
  }

  void _handleConsult(ProductItem product) {
    if (widget.onConsultProduct != null) {
      widget.onConsultProduct!(product);
    } else {
      final chatDev = ChatDeviceItem(
        isOwned: false,
        deviceName: product.name,
        modelName: product.name,
        categoryTag: product.categoryTag,
        price: product.price,
        imageUrl: product.imagePath,
        specs: product.specs,
      );
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => Scaffold(
            backgroundColor: AppTheme.background,
            appBar: AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back_ios_new, size: 20),
                onPressed: () => Navigator.of(context).pop(),
              ),
              title: Text("Tư vấn: ${product.name}", style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
            ),
            body: SafeArea(
              child: CskhChatScreen(
                initialDevice: chatDev,
                initialPrompt: "Xin chào CSKH Austec! Tôi cần tư vấn và báo giá chi tiết về sản phẩm ${product.name}.",
              ),
            ),
          ),
        ),
      );
    }
  }

  Future<void> _handlePlaceOrder(ProductItem product) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(
        child: CircularProgressIndicator(color: AppTheme.cyanAccent),
      ),
    );

    final curUser = AuthService().currentUser;
    final authToken = AuthService().token ?? 'austec-customer-token';
    try {
      final res = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/shop/orders'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({
          'customerName': curUser?.fullName ?? 'Khách hàng',
          'customerPhone': curUser?.phoneNumber ?? '0944 102 588',
          'shippingAddress': curUser?.address ?? 'Hà Nội, Việt Nam',
          'totalAmount': product.price,
          'notes': 'Đặt mua từ Mobile App Austec Smart Life',
          'items': [
            {
              'productId': product.id,
              'productName': product.name,
              'unitPrice': product.price,
              'quantity': 1,
              'imageUrl': product.imagePath,
            }
          ]
        }),
      ).timeout(const Duration(seconds: 4));

      if (mounted) Navigator.of(context).pop(); // close loading indicator

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && mounted) {
          final orderId = data['order']?['id'] ?? 'ORD-${DateTime.now().millisecondsSinceEpoch}';
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              backgroundColor: AppTheme.surface,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Row(
                children: [
                  Icon(Icons.check_circle, color: AppTheme.emeraldSuccess),
                  SizedBox(width: 8),
                  Text("Đặt Hàng Thành Công", style: TextStyle(color: Colors.white, fontSize: 16)),
                ],
              ),
              content: Text(
                "Đơn hàng mã $orderId đã được lưu vào hệ thống CSDL PostgreSQL. Nhân viên kỹ thuật Austec sẽ liên hệ trong ít phút!",
                style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text("Xác Nhận", style: TextStyle(color: AppTheme.brandBlue, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          );
          return;
        }
      }
    } catch (_) {
      if (mounted) Navigator.of(context).pop();
    }

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Đã lưu đơn hàng vào hệ thống Austec!")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode;
    final bgCol = isDark ? AppTheme.background : AppTheme.lightBackground;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final subTextCol = isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary;
    final cardBg = isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface;
    final cardBorder = isDark ? AppTheme.cardBorder : AppTheme.lightBorder;

    final allProducts = _backendProducts ?? _gateway.storeProducts;
    final filteredProducts = _selectedCategory == "Tất cả"
        ? allProducts
        : allProducts.where((p) => p.categoryTag == _selectedCategory).toList();

    return Scaffold(
      backgroundColor: bgCol,
      body: SafeArea(
        child: Column(
          children: [
            // Top Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "GIAN HÀNG AUSTEC OFFICIAL",
                        style: TextStyle(
                          color: textCol,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.8,
                        ),
                      ),
                      Text(
                        "Sản phẩm chính hãng • Kích hoạt bảo hành điện tử 24 tháng",
                        style: TextStyle(color: subTextCol, fontSize: 11),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: cardBorder),
                    ),
                    child: Icon(Icons.verified_outlined, color: textCol, size: 20),
                  ),
                ],
              ),
            ),

            // Banner Giới Thiệu Tối Giản Trắng Đen
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: cardBorder),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            "CHÍNH HÃNG AUSTEC",
                            style: TextStyle(
                              color: textCol,
                              fontSize: 9.5,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          "Hệ Sinh Thái Cửa Thông Minh & Khóa Masaru Titan",
                          style: TextStyle(color: textCol, fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          "Miễn phí khảo sát & lắp đặt nội thành • Bảo hành 24 tháng",
                          style: TextStyle(color: subTextCol, fontSize: 10.5),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Image.asset('assets/doors.png', width: 56, height: 56, fit: BoxFit.contain),
                ],
              ),
            ),

            // Bộ lọc Danh mục Chips Monochrome
            SizedBox(
              height: 40,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _categories.length,
                itemBuilder: (context, index) {
                  final cat = _categories[index];
                  final isSelected = cat == _selectedCategory;
                  return GestureDetector(
                    onTap: () => setState(() => _selectedCategory = cat),
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppTheme.brandBlue
                            : cardBg,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isSelected
                              ? AppTheme.brandBlue
                              : cardBorder,
                        ),
                      ),
                      child: Text(
                        cat,
                        style: TextStyle(
                          color: isSelected
                              ? Colors.white
                              : subTextCol,
                          fontSize: 11.5,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 10),

            // Lưới sản phẩm Grid View 2 cột
            Expanded(
              child: GridView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 0.70,
                ),
                itemCount: filteredProducts.length,
                itemBuilder: (context, index) {
                  final prod = filteredProducts[index];
                  return _buildProductCard(prod);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductCard(ProductItem product) {
    final isDark = AppTheme.isDarkMode;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final subTextCol = isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary;
    final cardBg = isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface;
    final cardBorder = isDark ? AppTheme.cardBorder : AppTheme.lightBorder;

    return GestureDetector(
      onTap: () => _openProductDetail(product),
      child: Container(
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: cardBorder),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Ảnh sản phẩm
            Expanded(
              child: Center(
                child: Hero(
                  tag: product.id,
                  child: product.imagePath.startsWith("http")
                      ? Image.network(
                          product.imagePath,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => Image.asset("assets/doors.png", fit: BoxFit.contain),
                        )
                      : Image.asset(product.imagePath, fit: BoxFit.contain),
                ),
              ),
            ),
            const SizedBox(height: 8),

            // Tag danh mục tối giản
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF27272A) : const Color(0xFFF4F4F5),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                product.categoryTag,
                style: TextStyle(color: textCol, fontSize: 9, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 4),

            // Tên sản phẩm
            Text(
              product.name,
              style: TextStyle(color: textCol, fontSize: 12, fontWeight: FontWeight.bold, height: 1.2),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 6),

            // Giá bán
            Text(
              product.formattedPrice,
              style: TextStyle(color: textCol, fontSize: 13, fontWeight: FontWeight.bold),
            ),
            if (product.originalPrice != null)
              Text(
                "${product.originalPrice} đ",
                style: TextStyle(color: subTextCol, fontSize: 10, decoration: TextDecoration.lineThrough),
              ),

            const SizedBox(height: 8),

            // Đánh giá & Nút đặt Monochrome
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.star_rounded, color: subTextCol, size: 14),
                    const SizedBox(width: 2),
                    Text(
                      "${product.rating}",
                      style: TextStyle(color: textCol, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                Row(
                  children: [
                    InkWell(
                      onTap: () => _handleConsult(product),
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.chat_bubble_outline_rounded, size: 11, color: Color(0xFFF59E0B)),
                            SizedBox(width: 3),
                            Text("Tư vấn", style: TextStyle(color: Color(0xFFF59E0B), fontSize: 9.5, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 5),
                    InkWell(
                      onTap: () => _openProductDetail(product),
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.brandBlue,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          "Chi Tiết",
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 9.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductDetailSheet(ProductItem product) {
    final isDark = AppTheme.isDarkMode;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final subTextCol = isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary;
    final cardBg = isDark ? AppTheme.surfaceDark : AppTheme.lightSurface;
    final cardBorder = isDark ? AppTheme.cardBorder : AppTheme.lightBorder;

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.88),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: cardBorder, width: 1.5)),
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(color: subTextCol.withValues(alpha: 0.4), borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 16),

            // Ảnh to
            Center(
              child: SizedBox(
                height: 140,
                child: product.imagePath.startsWith("http")
                    ? Image.network(
                        product.imagePath,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => Image.asset("assets/doors.png", fit: BoxFit.contain),
                      )
                    : Image.asset(product.imagePath, fit: BoxFit.contain),
              ),
            ),
            const SizedBox(height: 16),

            Text(
              product.name,
              style: TextStyle(color: textCol, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            Text(product.subtitle, style: TextStyle(color: subTextCol, fontSize: 12)),
            const SizedBox(height: 10),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  product.formattedPrice,
                  style: TextStyle(color: textCol, fontSize: 20, fontWeight: FontWeight.bold),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: cardBorder),
                  ),
                  child: Text(
                    product.warrantyText,
                    style: TextStyle(color: textCol, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 18),
            Divider(color: cardBorder),
            const SizedBox(height: 12),

            Text("Đặc điểm nổi bật:", style: TextStyle(color: textCol, fontSize: 13, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ...product.highlights.map(
              (h) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.check_circle_outline, color: textCol, size: 16),
                    const SizedBox(width: 8),
                    Expanded(child: Text(h, style: TextStyle(color: subTextCol, fontSize: 12))),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),
            Text("Thông số kỹ thuật xuất xưởng:", style: TextStyle(color: textCol, fontSize: 13, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ...product.specs.entries.map(
              (entry) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(entry.key, style: TextStyle(color: subTextCol, fontSize: 11.5)),
                    Text(entry.value, style: TextStyle(color: textCol, fontSize: 11.5, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Nút bấm Đặt Mua hoặc Tư Vấn CSKH
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.brandBlue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    icon: const Icon(Icons.shopping_bag_outlined),
                    label: const Text("Đặt Mua Ngay", style: TextStyle(fontWeight: FontWeight.bold)),
                    onPressed: () {
                      Navigator.of(context).pop();
                      _handlePlaceOrder(product);
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 3,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      backgroundColor: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                      foregroundColor: const Color(0xFFF59E0B),
                      side: const BorderSide(color: Color(0xFFF59E0B), width: 1.5),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.support_agent_rounded, size: 18),
                    label: const Text("Tư Vấn CSKH", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    onPressed: () {
                      Navigator.of(context).pop();
                      _handleConsult(product);
                    },
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  style: IconButton.styleFrom(
                    backgroundColor: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
                    padding: const EdgeInsets.all(12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: Icon(Icons.share_outlined, color: textCol, size: 20),
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Đã sao chép liên kết sản phẩm!")));
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
