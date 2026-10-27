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

  @override
  void initState() {
    super.initState();
    _scanning = widget.isScanning;
  }

  @override
  Widget build(BuildContext context) {
    final filtered = widget.availableNetworks
        .where((n) => n.toLowerCase().contains(_searchFilter.toLowerCase()))
        .toList();

    return Container(
      height: MediaQuery.of(context).size.height * 0.72,
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
                    "Danh Sách Wi-Fi Quét Được (${widget.availableNetworks.length})",
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
              hintText: "Tìm kiếm mạng Wi-Fi...",
              hintStyle: const TextStyle(color: AppTheme.textMuted),
              prefixIcon: const Icon(Icons.search, color: AppTheme.cyanAccent, size: 18),
              filled: true,
              fillColor: AppTheme.surfaceDark,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            ),
          ),
          const SizedBox(height: 14),
          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Text(
                      widget.availableNetworks.isEmpty
                          ? "Không tìm thấy mạng Wi-Fi nào. Vui lòng bấm 'Quét lại'."
                          : "Không có mạng nào khớp với từ khóa tìm kiếm.",
                      style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
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
                                "Mạng đang kết nối • Băng tần 2.4 GHz",
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
        ],
      ),
    );
  }
}
