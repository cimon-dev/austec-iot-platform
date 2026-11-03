import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';

class WifiPickerSheet extends StatefulWidget {
  final List<String> availableNetworks;
  final String currentWifiSsid;
  final String selectedSsid;
  final bool isScanning;
  final Future<void> Function() onRefresh;
  final Function(String ssid) onSelectNetwork;

  const WifiPickerSheet({
    super.key,
    required this.availableNetworks,
    required this.currentWifiSsid,
    required this.selectedSsid,
    required this.isScanning,
    required this.onRefresh,
    required this.onSelectNetwork,
  });

  @override
  State<WifiPickerSheet> createState() => _WifiPickerSheetState();
}

class _WifiPickerSheetState extends State<WifiPickerSheet> {
  String _searchFilter = "";
  late bool _scanning;
  final TextEditingController _manualController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _scanning = widget.isScanning;
  }

  @override
  void dispose() {
    _manualController.dispose();
    super.dispose();
  }

  void _showManualInputDialog() {
    _manualController.text = _searchFilter.trim();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppTheme.cyanAccent, width: 1.5),
        ),
        title: const Row(
          children: [
            Icon(Icons.wifi, color: AppTheme.cyanAccent, size: 22),
            SizedBox(width: 8),
            Text("Nhập Tên Mạng Wi-Fi", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Nhập chính xác tên SSID của mạng Wi-Fi 2.4GHz gia đình bạn:",
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _manualController,
              autofocus: true,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: InputDecoration(
                labelText: "Tên Wi-Fi (SSID)",
                hintText: "ví dụ: Manh Duc",
                hintStyle: const TextStyle(color: AppTheme.textMuted),
                filled: true,
                fillColor: AppTheme.surfaceDark,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Hủy", style: TextStyle(color: AppTheme.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.brandBlue,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () {
              final text = _manualController.text.trim();
              if (text.isNotEmpty) {
                Navigator.pop(ctx);
                widget.onSelectNetwork(text);
                Navigator.of(context).pop();
              }
            },
            child: const Text("Xác Nhận", style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cleanFilter = _searchFilter.trim();
    final filtered = widget.availableNetworks
        .where((n) => n.toLowerCase().contains(cleanFilter.toLowerCase()))
        .toList();

    final bool hasExactMatch = cleanFilter.isNotEmpty &&
        widget.availableNetworks.any((n) => n.toLowerCase() == cleanFilter.toLowerCase());

    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: AppTheme.cyanAccent, width: 1.5)),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white24,
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
                  const Icon(Icons.wifi_find_rounded, color: AppTheme.cyanAccent, size: 22),
                  const SizedBox(width: 8),
                  Text(
                    "Chọn Mạng Wi-Fi 2.4GHz (${widget.availableNetworks.length})",
                    style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              InkWell(
                onTap: () async {
                  setState(() => _scanning = true);
                  await widget.onRefresh();
                  if (mounted) setState(() => _scanning = false);
                },
                child: Row(
                  children: [
                    const Icon(Icons.refresh_rounded, size: 16, color: AppTheme.cyanAccent),
                    const SizedBox(width: 4),
                    Text(
                      _scanning ? "Đang quét..." : "Quét lại",
                      style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            onChanged: (val) => setState(() => _searchFilter = val),
            style: const TextStyle(color: Colors.white, fontSize: 13),
            decoration: InputDecoration(
              hintText: "Tìm kiếm hoặc nhập tên Wi-Fi...",
              hintStyle: const TextStyle(color: AppTheme.textMuted),
              prefixIcon: const Icon(Icons.search, color: AppTheme.cyanAccent, size: 18),
              suffixIcon: cleanFilter.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, color: AppTheme.textMuted, size: 18),
                      onPressed: () => setState(() => _searchFilter = ""),
                    )
                  : null,
              filled: true,
              fillColor: AppTheme.surfaceDark,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            ),
          ),
          const SizedBox(height: 10),

          // Tùy chọn nhập thủ công nhanh nếu gõ từ khóa chưa có trong danh sách
          if (cleanFilter.isNotEmpty && !hasExactMatch)
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                color: AppTheme.cyanAccent.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.4)),
              ),
              child: ListTile(
                dense: true,
                leading: const Icon(Icons.add_circle_outline, color: AppTheme.cyanAccent, size: 20),
                title: Text(
                  "Sử dụng tên: \"$cleanFilter\"",
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                ),
                subtitle: const Text("Chọn tên mạng này cho bo mạch", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 11)),
                trailing: const Icon(Icons.check_rounded, color: AppTheme.cyanAccent, size: 20),
                onTap: () {
                  widget.onSelectNetwork(cleanFilter);
                  Navigator.of(context).pop();
                },
              ),
            ),

          Expanded(
            child: filtered.isEmpty && cleanFilter.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.wifi_off_rounded, size: 40, color: AppTheme.textMuted),
                        const SizedBox(height: 12),
                        const Text(
                          "Chưa phát hiện mạng Wi-Fi tự động nào.",
                          style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          "Bạn có thể nhập trực tiếp tên Wi-Fi ở ô phía trên hoặc ấn nút bên dưới.",
                          style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.brandBlue,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          onPressed: _showManualInputDialog,
                          icon: const Icon(Icons.edit, size: 16),
                          label: const Text("Nhập Tên Wi-Fi Thủ Công", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => Divider(color: Colors.white.withValues(alpha: 0.06), height: 1),
                    itemBuilder: (context, idx) {
                      final net = filtered[idx];
                      final isCurrent = net == widget.currentWifiSsid;
                      final isSelected = net == widget.selectedSsid;

                      return ListTile(
                        dense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        leading: Icon(
                          Icons.wifi_rounded,
                          color: isCurrent
                              ? AppTheme.emeraldSuccess
                              : (isSelected ? AppTheme.cyanAccent : Colors.white70),
                          size: 20,
                        ),
                        title: Text(
                          net,
                          style: TextStyle(
                            color: isCurrent || isSelected ? Colors.white : Colors.white70,
                            fontWeight: isCurrent || isSelected ? FontWeight.bold : FontWeight.normal,
                            fontSize: 13,
                          ),
                        ),
                        subtitle: isCurrent
                            ? const Text(
                                "Mạng đang kết nối trên điện thoại • 2.4 GHz",
                                style: TextStyle(color: AppTheme.emeraldSuccess, fontSize: 10),
                              )
                            : null,
                        trailing: isSelected
                            ? const Icon(Icons.check_circle_rounded, color: AppTheme.cyanAccent, size: 18)
                            : const Icon(Icons.chevron_right_rounded, color: Colors.white38, size: 16),
                        onTap: () {
                          widget.onSelectNetwork(net);
                          Navigator.of(context).pop();
                        },
                      );
                    },
                  ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: AppTheme.cyanAccent.withValues(alpha: 0.5)),
                padding: const EdgeInsets.symmetric(vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: _showManualInputDialog,
              icon: const Icon(Icons.edit_note_rounded, color: AppTheme.cyanAccent, size: 18),
              label: const Text("Nhập tên Wi-Fi khác thủ công", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 12, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}
