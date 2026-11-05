import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../../core/constants/app_theme.dart';
import '../../../core/constants/api_config.dart';
import '../../../core/models/device_model.dart';
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
  bool _isLoading = true;
  String? _errorMessage;
  List<ProductItem>? _backendProducts;

  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = "";
  String _selectedCategory = "Tất cả danh mục";
  String _selectedRatingFilter = "ALL";

  final List<String> _categoryOptions = [
    "Tất cả danh mục",
    "Cửa Cuốn",
    "Khóa Masaru",
    "Lưu Điện UPS",
    "Động Cơ & Bo Mạch",
    "Cảm Biến & Camera",
    "Phụ Kiện",
  ];

  final List<Map<String, String>> _ratingOptions = [
    {"value": "ALL", "label": "Tất cả sao"},
    {"value": "5", "label": "5 ★ Tuyệt đối"},
    {"value": "4", "label": "Từ 4 ★ trở lên"},
    {"value": "3", "label": "Từ 3 ★ trở lên"},
  ];

  @override
  void initState() {
    super.initState();
    _fetchProductsFromBackend();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchProductsFromBackend() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final token = AuthService().token ?? 'austec-customer-token';
      final res = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/shop/products'),
        headers: {'Authorization': 'Bearer $token'},
      ).timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['products'] is List) {
          final List list = data['products'];
          final List<ProductItem> parsed = [];
          for (var p in list) {
            final rawCat = (p['categoryTag'] ?? p['category'] ?? '').toString();
            String catTag = "Phụ Kiện";
            if (rawCat.contains('Khóa') || rawCat == 'LOCK') {
              catTag = "Khóa Masaru";
            } else if (rawCat.contains('UPS') || rawCat.contains('Lưu Điện')) {
              catTag = "Lưu Điện UPS";
            } else if (rawCat.contains('Cảm Biến') || rawCat == 'SENSOR' || rawCat.contains('Camera') || rawCat == 'CAMERA' || rawCat.contains('AI Camera')) {
              catTag = "Cảm Biến & Camera";
            } else if (rawCat.contains('Động Cơ') || rawCat.contains('Bo Mạch') || rawCat == 'MOTOR') {
              catTag = "Động Cơ & Bo Mạch";
            } else if (rawCat.contains('Cửa') || rawCat == 'DOOR') {
              catTag = "Cửa Cuốn";
            } else if (rawCat.isNotEmpty) {
              catTag = rawCat;
            }

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

            final subtitle = (p['subtitle'] ?? p['description'] ?? '').toString();

            parsed.add(ProductItem(
              id: p['id']?.toString() ?? '',
              name: p['name']?.toString() ?? '',
              categoryTag: catTag,
              subtitle: subtitle.isNotEmpty ? subtitle : "Sản phẩm chính hãng Austec",
              price: (p['price'] as num?)?.toInt() ?? 0,
              originalPrice: (p['originalPrice'] as num?)?.toInt(),
              rating: (p['rating'] as num?)?.toDouble() ?? 5.0,
              reviewsCount: (p['reviewsCount'] as num?)?.toInt() ?? 0,
              imagePath: p['imageUrl']?.toString() ?? 'assets/doors.png',
              highlights: hl.isNotEmpty ? hl : ["Bảo hành chính hãng 24 tháng", "Austec Smart IoT"],
              specs: specsMap.isNotEmpty ? specsMap : {"Bảo hành": "24 tháng chính hãng"},
            ));
          }

          if (mounted) {
            setState(() {
              _backendProducts = parsed;
              _isLoading = false;
            });
          }
          return;
        }
      }

      if (mounted) {
        setState(() {
          _backendProducts = [];
          _isLoading = false;
          _errorMessage = "Không thể tải danh sách sản phẩm từ máy chủ";
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _backendProducts = [];
          _isLoading = false;
          _errorMessage = "Lỗi kết nối máy chủ: $e";
        });
      }
    }
  }

  void _openProductDetail(ProductItem product) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ProductDetailSheet(
        product: product,
        onConsult: () {
          Navigator.of(ctx).pop();
          _handleConsult(product);
        },
        onPlaceOrder: () {
          Navigator.of(ctx).pop();
          _handlePlaceOrder(product);
        },
        onReviewUpdated: () {
          _fetchProductsFromBackend();
        },
      ),
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

      if (mounted) Navigator.of(context).pop();

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
                "Đơn hàng mã $orderId đã được lưu vào hệ thống. Bạn có thể đánh giá thiết bị này sau khi nhận hàng!",
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

    final allProducts = _backendProducts ?? [];
    final filteredProducts = allProducts.where((p) {
      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.trim().toLowerCase();
        final match = p.name.toLowerCase().contains(q) ||
            p.subtitle.toLowerCase().contains(q) ||
            p.categoryTag.toLowerCase().contains(q);
        if (!match) return false;
      }
      if (_selectedCategory != "Tất cả danh mục" && p.categoryTag != _selectedCategory) {
        return false;
      }
      if (_selectedRatingFilter == "5" && p.rating < 4.9) return false;
      if (_selectedRatingFilter == "4" && p.rating < 3.9) return false;
      if (_selectedRatingFilter == "3" && p.rating < 2.9) return false;
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: bgCol,
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "GIAN HÀNG THIẾT BỊ",
                        style: TextStyle(
                          color: textCol,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.8,
                        ),
                      ),
                      Text(
                        "Thiết bị chính hãng Austec • Bảo hành điện tử",
                        style: TextStyle(color: subTextCol, fontSize: 11),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: Icon(Icons.refresh_rounded, color: textCol, size: 20),
                    onPressed: _fetchProductsFromBackend,
                    tooltip: "Làm mới",
                  ),
                ],
              ),
            ),

            // Search Bar Input
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Container(
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: cardBorder),
                ),
                child: TextField(
                  controller: _searchController,
                  style: TextStyle(color: textCol, fontSize: 13),
                  onChanged: (val) => setState(() => _searchQuery = val),
                  decoration: InputDecoration(
                    hintText: "Tìm kiếm sản phẩm, thiết bị...",
                    hintStyle: TextStyle(color: subTextCol, fontSize: 12.5),
                    prefixIcon: Icon(Icons.search_rounded, color: subTextCol, size: 18),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: Icon(Icons.close_rounded, color: subTextCol, size: 16),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = "");
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                  ),
                ),
              ),
            ),

            // Filter Comboboxes Row (Category & Rating)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: Row(
                children: [
                  // Category Combobox
                  Expanded(
                    flex: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: cardBorder),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _selectedCategory,
                          isExpanded: true,
                          dropdownColor: isDark ? AppTheme.surfaceDark : AppTheme.lightSurface,
                          icon: Icon(Icons.keyboard_arrow_down_rounded, color: subTextCol, size: 18),
                          style: TextStyle(color: textCol, fontSize: 12, fontWeight: FontWeight.w600),
                          onChanged: (val) {
                            if (val != null) setState(() => _selectedCategory = val);
                          },
                          items: _categoryOptions.map((cat) {
                            return DropdownMenuItem<String>(
                              value: cat,
                              child: Text(cat, overflow: TextOverflow.ellipsis),
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Rating Combobox
                  Expanded(
                    flex: 5,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: cardBorder),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _selectedRatingFilter,
                          isExpanded: true,
                          dropdownColor: isDark ? AppTheme.surfaceDark : AppTheme.lightSurface,
                          icon: Icon(Icons.keyboard_arrow_down_rounded, color: subTextCol, size: 18),
                          style: TextStyle(color: textCol, fontSize: 12, fontWeight: FontWeight.w600),
                          onChanged: (val) {
                            if (val != null) setState(() => _selectedRatingFilter = val);
                          },
                          items: _ratingOptions.map((r) {
                            return DropdownMenuItem<String>(
                              value: r['value']!,
                              child: Text(r['label']!, overflow: TextOverflow.ellipsis),
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 6),

            // Main Product Grid or Loading State
            Expanded(
              child: _isLoading
                  ? _buildLoadingState(textCol, subTextCol)
                  : _errorMessage != null && allProducts.isEmpty
                      ? _buildErrorState(textCol, subTextCol)
                      : filteredProducts.isEmpty
                          ? _buildEmptyState(textCol, subTextCol)
                          : GridView.builder(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                crossAxisSpacing: 10,
                                mainAxisSpacing: 10,
                                childAspectRatio: 0.72,
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

  Widget _buildLoadingState(Color textCol, Color subTextCol) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            width: 32,
            height: 32,
            child: CircularProgressIndicator(strokeWidth: 2.5, color: AppTheme.cyanAccent),
          ),
          const SizedBox(height: 14),
          Text(
            "Đang tải sản phẩm từ hệ thống...",
            style: TextStyle(color: subTextCol, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(Color textCol, Color subTextCol) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wifi_off_rounded, color: subTextCol, size: 36),
            const SizedBox(height: 10),
            Text(
              _errorMessage ?? "Không thể tải danh sách sản phẩm",
              textAlign: TextAlign.center,
              style: TextStyle(color: textCol, fontSize: 13),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.brandBlue,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: _fetchProductsFromBackend,
              child: const Text("Thử lại", style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(Color textCol, Color subTextCol) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.inventory_2_outlined, color: subTextCol, size: 36),
            const SizedBox(height: 10),
            Text(
              "Không tìm thấy sản phẩm nào phù hợp",
              style: TextStyle(color: textCol, fontSize: 13, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              "Thử đổi từ khóa hoặc bộ lọc tìm kiếm",
              style: TextStyle(color: subTextCol, fontSize: 11),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () {
                _searchController.clear();
                setState(() {
                  _searchQuery = "";
                  _selectedCategory = "Tất cả danh mục";
                  _selectedRatingFilter = "ALL";
                });
              },
              child: const Text("Đặt lại bộ lọc", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 12)),
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
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: cardBorder),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
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
            const SizedBox(height: 6),

            // Minimal Category Tag
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF27272A) : const Color(0xFFF4F4F5),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                product.categoryTag,
                style: TextStyle(color: textCol, fontSize: 8.5, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 4),

            // Product Name
            Text(
              product.name,
              style: TextStyle(color: textCol, fontSize: 11.5, fontWeight: FontWeight.bold, height: 1.2),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),

            // Price & Original Price
            Row(
              children: [
                Text(
                  product.formattedPrice,
                  style: TextStyle(color: textCol, fontSize: 12, fontWeight: FontWeight.bold),
                ),
                const SizedBox(width: 4),
                if (product.originalPrice != null)
                  Expanded(
                    child: Text(
                      "${product.originalPrice} đ",
                      style: TextStyle(color: subTextCol, fontSize: 9, decoration: TextDecoration.lineThrough),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
              ],
            ),

            const SizedBox(height: 6),

            // Rating Stars & Action Buttons Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 14),
                    const SizedBox(width: 2),
                    Text(
                      product.rating.toStringAsFixed(1),
                      style: TextStyle(color: textCol, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                    if (product.reviewsCount > 0)
                      Text(
                        " (${product.reviewsCount})",
                        style: TextStyle(color: subTextCol, fontSize: 9),
                      ),
                  ],
                ),
                Row(
                  children: [
                    InkWell(
                      onTap: () => _handleConsult(product),
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3.5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                        ),
                        child: const Text(
                          "Tư vấn",
                          style: TextStyle(color: Color(0xFFF59E0B), fontSize: 9.5, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    InkWell(
                      onTap: () => _openProductDetail(product),
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3.5),
                        decoration: BoxDecoration(
                          color: AppTheme.brandBlue,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          "Chi tiết",
                          style: TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold),
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
}

/// Dedicated Stateful Bottom Sheet for Product Detail & Reviews
class ProductDetailSheet extends StatefulWidget {
  final ProductItem product;
  final VoidCallback onConsult;
  final VoidCallback onPlaceOrder;
  final VoidCallback onReviewUpdated;

  const ProductDetailSheet({
    super.key,
    required this.product,
    required this.onConsult,
    required this.onPlaceOrder,
    required this.onReviewUpdated,
  });

  @override
  State<ProductDetailSheet> createState() => _ProductDetailSheetState();
}

class _ProductDetailSheetState extends State<ProductDetailSheet> {
  bool _isLoadingReviews = true;
  List<ShopReviewItem> _reviews = [];
  ProductReviewStats? _stats;
  bool _canReview = false;
  String? _reviewReason;
  bool _hasReviewed = false;
  ShopReviewItem? _myReview;
  bool _isAdmin = false;

  @override
  void initState() {
    super.initState();
    _fetchReviews();
  }

  Future<void> _fetchReviews() async {
    setState(() => _isLoadingReviews = true);
    try {
      final token = AuthService().token ?? 'austec-customer-token';
      final res = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/shop/products/${widget.product.id}/reviews?includeHidden=true'),
        headers: {'Authorization': 'Bearer $token'},
      ).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true) {
          final List list = data['reviews'] ?? [];
          final reviews = list.map((r) => ShopReviewItem.fromJson(r)).toList();
          final stats = data['stats'] != null ? ProductReviewStats.fromJson(data['stats']) : null;
          final myReviewJson = data['myReview'];

          if (mounted) {
            setState(() {
              _reviews = reviews;
              _stats = stats;
              _canReview = data['canReview'] == true;
              _reviewReason = data['reviewReason'];
              _hasReviewed = data['hasReviewed'] == true;
              _myReview = myReviewJson != null ? ShopReviewItem.fromJson(myReviewJson) : null;
              _isAdmin = data['isAdmin'] == true;
              _isLoadingReviews = false;
            });
          }
          return;
        }
      }
    } catch (_) {}

    if (mounted) {
      setState(() => _isLoadingReviews = false);
    }
  }

  void _showReviewModal({ShopReviewItem? existing}) {
    int rating = existing?.rating ?? 5;
    final textController = TextEditingController(text: existing?.comment ?? "");
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setModalState) {
          final isDark = AppTheme.isDarkMode;
          final cardBg = isDark ? AppTheme.surfaceDark : AppTheme.lightSurface;
          final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
          final subTextCol = isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary;

          return Container(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 18,
              bottom: MediaQuery.of(dialogCtx).viewInsets.bottom + 20,
            ),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              border: Border(top: BorderSide(color: AppTheme.cyanAccent.withValues(alpha: 0.3))),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(color: subTextCol.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  existing != null ? "Chỉnh Sửa Nhận Xét Của Bạn" : "Đánh Giá & Nhận Xét Thiết Bị",
                  style: TextStyle(color: textCol, fontSize: 15, fontWeight: FontWeight.bold),
                ),
                Text(
                  widget.product.name,
                  style: TextStyle(color: subTextCol, fontSize: 11),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 14),

                // Star Picker
                Center(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(5, (idx) {
                      final starValue = idx + 1;
                      return IconButton(
                        iconSize: 32,
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        icon: Icon(
                          starValue <= rating ? Icons.star_rounded : Icons.star_outline_rounded,
                          color: const Color(0xFFF59E0B),
                        ),
                        onPressed: () {
                          setModalState(() => rating = starValue);
                        },
                      );
                    }),
                  ),
                ),
                Center(
                  child: Text(
                    "$rating / 5 sao",
                    style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(height: 14),

                // Comment Text Field
                TextField(
                  controller: textController,
                  maxLines: 3,
                  style: TextStyle(color: textCol, fontSize: 12.5),
                  decoration: InputDecoration(
                    hintText: "Chia sẻ trải nghiệm vận hành thực tế của bạn...",
                    hintStyle: TextStyle(color: subTextCol, fontSize: 11.5),
                    filled: true,
                    fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                    contentPadding: const EdgeInsets.all(12),
                  ),
                ),
                const SizedBox(height: 16),

                // Submit Button
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: isSubmitting ? null : () => Navigator.of(dialogCtx).pop(),
                      child: Text("Hủy", style: TextStyle(color: subTextCol)),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.brandBlue,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              final comment = textController.text.trim();
                              if (comment.isEmpty) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text("Vui lòng nhập nội dung nhận xét!")),
                                );
                                return;
                              }

                              setModalState(() => isSubmitting = true);
                              final token = AuthService().token ?? 'austec-customer-token';

                              try {
                                http.Response res;
                                if (existing != null) {
                                  // Update existing review
                                  res = await http.put(
                                    Uri.parse('${ApiConfig.baseUrl}/api/shop/products/${widget.product.id}/reviews/${existing.id}'),
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': 'Bearer $token',
                                    },
                                    body: jsonEncode({'rating': rating, 'comment': comment}),
                                  );
                                } else {
                                  // Create new review
                                  res = await http.post(
                                    Uri.parse('${ApiConfig.baseUrl}/api/shop/products/${widget.product.id}/reviews'),
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': 'Bearer $token',
                                    },
                                    body: jsonEncode({'rating': rating, 'comment': comment}),
                                  );
                                }

                                if (res.statusCode == 200) {
                                  final data = jsonDecode(res.body);
                                  if (data['success'] == true) {
                                    if (mounted) {
                                      Navigator.of(dialogCtx).pop();
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text(data['message'] ?? "Lưu nhận xét thành công!")),
                                      );
                                      _fetchReviews();
                                      widget.onReviewUpdated();
                                    }
                                    return;
                                  }
                                } else {
                                  final data = jsonDecode(res.body);
                                  if (mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text(data['error'] ?? "Không thể gửi nhận xét")),
                                    );
                                  }
                                }
                              } catch (e) {
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text("Lỗi: $e")),
                                  );
                                }
                              } finally {
                                if (dialogCtx.mounted) {
                                  setModalState(() => isSubmitting = false);
                                }
                              }
                            },
                      child: isSubmitting
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Text(existing != null ? "Lưu Cập Nhật" : "Gửi Đánh Giá", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _toggleReviewVisibility(ShopReviewItem review) async {
    final token = AuthService().token ?? 'austec-customer-token';
    try {
      final res = await http.patch(
        Uri.parse('${ApiConfig.baseUrl}/api/shop/admin/reviews/${review.id}/toggle-visibility'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(data['message'] ?? "Đã cập nhật trạng thái nhận xét!")),
          );
          _fetchReviews();
          widget.onReviewUpdated();
        }
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final subTextCol = isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary;
    final cardBg = isDark ? AppTheme.surfaceDark : AppTheme.lightSurface;
    final cardBorder = isDark ? AppTheme.cardBorder : AppTheme.lightBorder;

    final curUser = AuthService().currentUser;
    final product = widget.product;

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.90),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
        border: Border(top: BorderSide(color: cardBorder, width: 1.5)),
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: subTextCol.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 14),

            // Product Photo
            Center(
              child: SizedBox(
                height: 130,
                child: product.imagePath.startsWith("http")
                    ? Image.network(
                        product.imagePath,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => Image.asset("assets/doors.png", fit: BoxFit.contain),
                      )
                    : Image.asset(product.imagePath, fit: BoxFit.contain),
              ),
            ),
            const SizedBox(height: 14),

            Text(
              product.name,
              style: TextStyle(color: textCol, fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Text(product.subtitle, style: TextStyle(color: subTextCol, fontSize: 11.5)),
            const SizedBox(height: 8),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  product.formattedPrice,
                  style: TextStyle(color: textCol, fontSize: 18, fontWeight: FontWeight.bold),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: cardBorder),
                  ),
                  child: Text(
                    product.warrantyText,
                    style: TextStyle(color: textCol, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 14),
            Divider(color: cardBorder),
            const SizedBox(height: 10),

            // Highlights
            if (product.highlights.isNotEmpty) ...[
              Text("Đặc điểm nổi bật:", style: TextStyle(color: textCol, fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              ...product.highlights.map(
                (h) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2.5),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.check_circle_outline, color: textCol, size: 14),
                      const SizedBox(width: 6),
                      Expanded(child: Text(h, style: TextStyle(color: subTextCol, fontSize: 11.5))),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],

            // Specs
            if (product.specs.isNotEmpty) ...[
              Text("Thông số kỹ thuật:", style: TextStyle(color: textCol, fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              ...product.specs.entries.map(
                (entry) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2.5),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(entry.key, style: TextStyle(color: subTextCol, fontSize: 11)),
                      Text(entry.value, style: TextStyle(color: textCol, fontSize: 11, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),
            ],

            // Buttons: Đặt Mua & Tư Vấn
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.brandBlue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 11),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      elevation: 0,
                    ),
                    icon: const Icon(Icons.shopping_bag_outlined, size: 16),
                    label: const Text("Đặt Mua Ngay", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    onPressed: widget.onPlaceOrder,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 3,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      backgroundColor: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                      foregroundColor: const Color(0xFFF59E0B),
                      side: const BorderSide(color: Color(0xFFF59E0B), width: 1.2),
                      padding: const EdgeInsets.symmetric(vertical: 11),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.support_agent_rounded, size: 16),
                    label: const Text("Tư Vấn CSKH", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11.5)),
                    onPressed: widget.onConsult,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),
            Divider(color: cardBorder),
            const SizedBox(height: 14),

            // ====================================================
            // SECTION: REVIEWS & RATINGS (ĐÁNH GIÁ & BÌNH LUẬN)
            // ====================================================
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 20),
                    const SizedBox(width: 4),
                    Text(
                      _stats != null ? _stats!.averageRating.toStringAsFixed(1) : product.rating.toStringAsFixed(1),
                      style: TextStyle(color: textCol, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      "(${_stats?.totalReviews ?? _reviews.length} đánh giá)",
                      style: TextStyle(color: subTextCol, fontSize: 11),
                    ),
                  ],
                ),

                // Button Write / Edit Review if eligible
                if (_canReview)
                  InkWell(
                    onTap: () => _showReviewModal(existing: _myReview),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: AppTheme.cyanAccent.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.5)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _hasReviewed ? Icons.edit_note_rounded : Icons.rate_review_outlined,
                            size: 14,
                            color: AppTheme.cyanAccent,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _hasReviewed ? "Sửa nhận xét" : "Viết nhận xét",
                            style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),

            if (!_canReview) ...[
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, size: 14, color: subTextCol),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        _reviewReason ?? "Chỉ người đã đặt mua hoặc sở hữu thiết bị mới được đánh giá.",
                        style: TextStyle(color: subTextCol, fontSize: 10.5),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 12),

            // Review List
            if (_isLoadingReviews)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.cyanAccent),
                  ),
                ),
              )
            else if (_reviews.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  child: Text(
                    "Chưa có nhận xét nào cho thiết bị này.",
                    style: TextStyle(color: subTextCol, fontSize: 11.5),
                  ),
                ),
              )
            else
              ..._reviews.map((r) {
                final isMyReview = curUser != null && r.userId == curUser.id;

                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF182234) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: r.isHidden
                          ? AppTheme.roseDanger.withValues(alpha: 0.4)
                          : isMyReview
                              ? AppTheme.cyanAccent.withValues(alpha: 0.3)
                              : cardBorder,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 11,
                                backgroundColor: isMyReview ? AppTheme.cyanAccent : AppTheme.brandBlue,
                                child: Text(
                                  r.userName.isNotEmpty ? r.userName[0].toUpperCase() : 'U',
                                  style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                isMyReview ? "${r.userName} (Bạn)" : r.userName,
                                style: TextStyle(color: textCol, fontSize: 11.5, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(width: 4),
                              if (r.isVerifiedBuyer)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: AppTheme.emeraldSuccess.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    "✓ Đã mua",
                                    style: TextStyle(color: AppTheme.emeraldSuccess, fontSize: 8.5, fontWeight: FontWeight.bold),
                                  ),
                                ),
                            ],
                          ),

                          // Edit or Admin Hide actions
                          Row(
                            children: [
                              if (isMyReview)
                                InkWell(
                                  onTap: () => _showReviewModal(existing: r),
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                    child: Row(
                                      children: [
                                        Icon(Icons.edit_outlined, size: 12, color: AppTheme.cyanAccent),
                                        const SizedBox(width: 2),
                                        Text("Sửa", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 10)),
                                      ],
                                    ),
                                  ),
                                ),
                              if (_isAdmin) ...[
                                const SizedBox(width: 4),
                                InkWell(
                                  onTap: () => _toggleReviewVisibility(r),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: r.isHidden
                                          ? AppTheme.emeraldSuccess.withValues(alpha: 0.15)
                                          : AppTheme.roseDanger.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      r.isHidden ? "Hiện nhận xét" : "Ẩn nhận xét",
                                      style: TextStyle(
                                        color: r.isHidden ? AppTheme.emeraldSuccess : AppTheme.roseDanger,
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),

                      // Rating Stars & Date
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: List.generate(5, (starIdx) {
                              return Icon(
                                starIdx < r.rating ? Icons.star_rounded : Icons.star_outline_rounded,
                                color: const Color(0xFFF59E0B),
                                size: 13,
                              );
                            }),
                          ),
                          if (r.isHidden)
                            Text(
                              "[Đã ẩn bởi Admin]",
                              style: TextStyle(color: AppTheme.roseDanger, fontSize: 9.5, fontWeight: FontWeight.bold),
                            )
                          else if (r.createdAt.isNotEmpty)
                            Text(
                              r.createdAt.length >= 10 ? r.createdAt.substring(0, 10) : r.createdAt,
                              style: TextStyle(color: subTextCol, fontSize: 9.5),
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),

                      // Comment Text
                      Text(
                        r.comment,
                        style: TextStyle(color: textCol, fontSize: 11.5, height: 1.3),
                      ),
                    ],
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}
