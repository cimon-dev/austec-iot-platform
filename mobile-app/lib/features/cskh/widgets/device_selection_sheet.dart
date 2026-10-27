import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../domain/entities/chat_device_item.dart';

class DeviceSelectionSheet extends StatefulWidget {
  final ChatDeviceItem? currentlySelected;
  final List<ChatDeviceItem> ownedDevices;
  final List<ChatDeviceItem> unownedDevices;
  final Function(ChatDeviceItem? selected) onSelectDevice;

  const DeviceSelectionSheet({
    super.key,
    required this.currentlySelected,
    required this.ownedDevices,
    required this.unownedDevices,
    required this.onSelectDevice,
  });

  @override
  State<DeviceSelectionSheet> createState() => _DeviceSelectionSheetState();
}

class _DeviceSelectionSheetState extends State<DeviceSelectionSheet> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.72,
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
        border: Border(top: BorderSide(color: AppTheme.cardBorder)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.devices, color: AppTheme.cyanAccent, size: 20),
                  SizedBox(width: 8),
                  Text(
                    "CHỌN THIẾT BỊ HỖ TRỢ (COMBOBOX)",
                    style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 0.3),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close, color: Colors.white60, size: 20),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const Text(
            "Chọn thiết bị bạn đang cần giải đáp sự cố hoặc sản phẩm cần tư vấn mới (không bắt buộc).",
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 11, height: 1.4),
          ),
          const SizedBox(height: 12),

          // Option: Không chọn thiết bị nào
          InkWell(
            onTap: () {
              widget.onSelectDevice(null);
              Navigator.of(context).pop();
            },
            borderRadius: BorderRadius.circular(10),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: widget.currentlySelected == null ? AppTheme.cyanAccent.withValues(alpha: 0.12) : AppTheme.surface,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: widget.currentlySelected == null ? AppTheme.cyanAccent : AppTheme.cardBorder,
                  width: widget.currentlySelected == null ? 1.5 : 1,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.not_interested,
                    color: widget.currentlySelected == null ? AppTheme.cyanAccent : AppTheme.textMuted,
                    size: 18,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Không chọn thiết bị nào (Mặc định)",
                          style: TextStyle(
                            color: widget.currentlySelected == null ? Colors.white : AppTheme.textSecondary,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const Text(
                          "Hỏi tư vấn chung, hỗ trợ tài khoản hoặc bảo hành tổng quan",
                          style: TextStyle(color: AppTheme.textMuted, fontSize: 10),
                        ),
                      ],
                    ),
                  ),
                  if (widget.currentlySelected == null)
                    const Icon(Icons.check_circle, color: AppTheme.cyanAccent, size: 18),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Tabs: Đã sở hữu vs Chưa sở hữu
          Container(
            height: 38,
            decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(10),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                color: AppTheme.blueAccent,
                borderRadius: BorderRadius.circular(10),
              ),
              labelColor: Colors.white,
              unselectedLabelColor: AppTheme.textMuted,
              labelStyle: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold),
              tabs: [
                Tab(text: "Thiết bị đã sở hữu (${widget.ownedDevices.length})"),
                Tab(text: "Tư vấn mới / Chưa sở hữu (${widget.unownedDevices.length})"),
              ],
            ),
          ),
          const SizedBox(height: 12),

          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildDeviceList(widget.ownedDevices, isOwnedTab: true),
                _buildDeviceList(widget.unownedDevices, isOwnedTab: false),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDeviceList(List<ChatDeviceItem> list, {required bool isOwnedTab}) {
    if (list.isEmpty) {
      return Center(
        child: Text(
          isOwnedTab ? "Chưa có thiết bị nào được liên kết tài khoản" : "Không có sản phẩm khả dụng",
          style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
        ),
      );
    }

    return ListView.separated(
      itemCount: list.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (ctx, idx) {
        final item = list[idx];
        final isSelected = widget.currentlySelected?.deviceName == item.deviceName;

        return InkWell(
          onTap: () {
            widget.onSelectDevice(item);
            Navigator.of(context).pop();
          },
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isSelected ? AppTheme.cyanAccent.withValues(alpha: 0.12) : AppTheme.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected ? AppTheme.cyanAccent : AppTheme.cardBorder,
              ),
            ),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    width: 48,
                    height: 48,
                    color: Colors.black26,
                    child: Image.network(
                      item.imageUrl ?? 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80',
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Icon(Icons.devices, color: Colors.white54),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: item.isOwned ? AppTheme.emeraldSuccess.withValues(alpha: 0.15) : AppTheme.amberWarning.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              item.isOwned ? "ĐÃ SỞ HỮU" : "TƯ VẤN MỚI",
                              style: TextStyle(
                                color: item.isOwned ? AppTheme.emeraldSuccess : AppTheme.amberWarning,
                                fontSize: 8.5,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            item.categoryTag,
                            style: const TextStyle(color: AppTheme.textMuted, fontSize: 9.5, fontFamily: 'monospace'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        item.deviceName,
                        style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        item.isOwned
                            ? "Serial: ${item.hardwareId ?? 'Chưa gán'}"
                            : item.price != null
                                ? "Giá tham khảo: ${item.price!.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]}.')} đ"
                                : "Liên hệ báo giá ưu đãi",
                        style: TextStyle(
                          color: item.isOwned ? AppTheme.cyanAccent : Colors.amber.shade300,
                          fontSize: 10.5,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ),
                if (isSelected)
                  const Icon(Icons.check_circle, color: AppTheme.cyanAccent, size: 20)
                else
                  const Icon(Icons.chevron_right, color: AppTheme.textMuted, size: 18),
              ],
            ),
          ),
        );
      },
    );
  }
}
