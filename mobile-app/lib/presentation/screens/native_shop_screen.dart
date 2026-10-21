import 'package:flutter/material.dart';
import '../../core/constants/app_theme.dart';
import '../../core/models/device_model.dart';
import '../../core/services/iot_gateway_client.dart';
import 'cskh_chat_screen.dart';

class NativeShopScreen extends StatefulWidget {
  const NativeShopScreen({super.key});

  @override
  State<NativeShopScreen> createState() => _NativeShopScreenState();
}

class _NativeShopScreenState extends State<NativeShopScreen> {
  final IoTGatewayClient _gateway = IoTGatewayClient();
  String _selectedCategory = "Tất cả";

  final List<String> _categories = [
    "Tất cả",
    "Cửa Cuốn",
    "Khóa Thông Minh",
    "Lưu Điện UPS",
    "Động Cơ & Bo Mạch",
    "Cảm Biến",
  ];

  void _openProductDetail(ProductItem product) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _buildProductDetailSheet(product),
    );
  }

  @override
  Widget build(BuildContext context) {
    final allProducts = _gateway.storeProducts;
    final filteredProducts = _selectedCategory == "Tất cả"
        ? allProducts
        : allProducts.where((p) => p.categoryTag == _selectedCategory).toList();

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            // Top Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "GIAN HÀNG AUSTEC OFFICIAL",
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.8,
                        ),
                      ),
                      Text(
                        "Sản phẩm chính hãng • Kích hoạt bảo hành điện tử 24 tháng",
                        style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: AppTheme.glassBox(radius: 12),
                    child: const Icon(Icons.verified, color: AppTheme.cyanAccent, size: 20),
                  ),
                ],
              ),
            ),

            // Banner Khuyến Mãi & Giới Thiệu
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E3A8A), Color(0xFF0F172A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppTheme.blueAccent.withOpacity(0.5)),
                boxShadow: [
                  BoxShadow(color: AppTheme.blueAccent.withOpacity(0.2), blurRadius: 16, offset: const Offset(0, 4)),
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
                          decoration: BoxDecoration(color: AppTheme.amberWarning, borderRadius: BorderRadius.circular(6)),
                          child: const Text("ƯU ĐÃI CHÍNH HÃNG", style: TextStyle(color: Colors.black, fontSize: 9.5, fontWeight: FontWeight.bold)),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          "Hệ Sinh Thái Cửa Thông Minh & Khóa Masaru Titan",
                          style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          "Miễn phí khảo sát & lắp đặt nội thành • Bảo hành 24 tháng",
                          style: TextStyle(color: AppTheme.textSecondary, fontSize: 10.5),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Image.asset('assets/doors.png', width: 60, height: 60, fit: BoxFit.contain),
                ],
              ),
            ),

            // Bộ lọc Danh mục Chips
            SizedBox(
              height: 42,
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
                        color: isSelected ? AppTheme.cyanAccent : AppTheme.surfaceGlass,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: isSelected ? AppTheme.cyanAccent : AppTheme.cardBorder),
                      ),
                      child: Text(
                        cat,
                        style: TextStyle(
                          color: isSelected ? Colors.black : Colors.white,
                          fontSize: 11.5,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 12),

            // Lưới sản phẩm Grid View 2 cột
            Expanded(
              child: GridView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 0.68,
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
    return GestureDetector(
      onTap: () => _openProductDetail(product),
      child: Container(
        decoration: AppTheme.glassBox(
          color: AppTheme.surfaceGlass,
          borderColor: AppTheme.cardBorder,
          radius: 16,
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
                  child: Image.asset(product.imagePath, fit: BoxFit.contain),
                ),
              ),
            ),
            const SizedBox(height: 8),

            // Tag danh mục
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppTheme.cyanAccent.withOpacity(0.12),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                product.categoryTag,
                style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 9, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 4),

            // Tên sản phẩm
            Text(
              product.name,
              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold, height: 1.2),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 6),

            // Giá bán
            Text(
              product.formattedPrice,
              style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 13, fontWeight: FontWeight.bold),
            ),
            if (product.originalPrice != null)
              Text(
                "${product.originalPrice} đ",
                style: const TextStyle(color: AppTheme.textMuted, fontSize: 10, decoration: TextDecoration.lineThrough),
              ),

            const SizedBox(height: 8),

            // Đánh giá & Nút đặt
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.star, color: AppTheme.amberWarning, size: 12),
                    const SizedBox(width: 2),
                    Text(
                      "${product.rating}",
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.blueAccent,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text("Chi Tiết", style: TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductDetailSheet(ProductItem product) {
    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.88),
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(top: BorderSide(color: AppTheme.cardBorder, width: 1.5)),
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(color: AppTheme.textMuted, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 16),

            // Ảnh to
            Center(
              child: SizedBox(
                height: 140,
                child: Image.asset(product.imagePath, fit: BoxFit.contain),
              ),
            ),
            const SizedBox(height: 16),

            Text(
              product.name,
              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            Text(product.subtitle, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
            const SizedBox(height: 10),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  product.formattedPrice,
                  style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 20, fontWeight: FontWeight.bold),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.emeraldSuccess.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.emeraldSuccess.withOpacity(0.4)),
                  ),
                  child: Text(
                    product.warrantyText,
                    style: const TextStyle(color: AppTheme.emeraldSuccess, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 18),
            const Divider(color: AppTheme.cardBorder),
            const SizedBox(height: 12),

            const Text("Đặc điểm nổi bật:", style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ...product.highlights.map(
              (h) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.check_circle_outline, color: AppTheme.cyanAccent, size: 16),
                    const SizedBox(width: 8),
                    Expanded(child: Text(h, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12))),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),
            const Text("Thông số kỹ thuật xuất xưởng:", style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ...product.specs.entries.map(
              (entry) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(entry.key, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11.5)),
                    Text(entry.value, style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Nút bấm liên hệ CSKH hoặc đặt mua
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.cyanAccent,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.support_agent_rounded),
                    label: const Text("Tư Vấn & Khảo Sát", style: TextStyle(fontWeight: FontWeight.bold)),
                    onPressed: () {
                      Navigator.of(context).pop();
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => const Scaffold(backgroundColor: AppTheme.background, body: SafeArea(child: CskhChatScreen())),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 12),
                IconButton(
                  style: IconButton.styleFrom(
                    backgroundColor: AppTheme.surfaceGlass,
                    padding: const EdgeInsets.all(14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.share_outlined, color: Colors.white),
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
