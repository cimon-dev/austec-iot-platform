import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/services/ble_provisioning_service.dart';

class PairingProgressDialog extends StatelessWidget {
  final bool isProvisioning;
  final double provisioningProgress;
  final String provisioningStep;
  final PairingResult? pairingResult;
  final String wifiSsid;
  final VoidCallback onCancel;
  final Function(String hardwareId) onControlDoor;

  const PairingProgressDialog({
    super.key,
    required this.isProvisioning,
    required this.provisioningProgress,
    required this.provisioningStep,
    required this.pairingResult,
    required this.wifiSsid,
    required this.onCancel,
    required this.onControlDoor,
  });

  @override
  Widget build(BuildContext context) {
    final isCompleted = pairingResult != null && pairingResult!.success;
    final pctInt = (provisioningProgress * 100).toInt();

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: isCompleted ? AppTheme.emeraldSuccess : AppTheme.cyanAccent,
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: (isCompleted ? AppTheme.emeraldSuccess : AppTheme.cyanAccent).withValues(alpha: 0.25),
              blurRadius: 30,
              spreadRadius: 4,
            ),
          ],
        ),
        child: isCompleted
            ? Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    width: 68,
                    height: 68,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppTheme.emeraldSuccess.withValues(alpha: 0.15),
                      border: Border.all(color: AppTheme.emeraldSuccess, width: 2.5),
                    ),
                    child: const Center(
                      child: Icon(Icons.verified_rounded, color: AppTheme.emeraldSuccess, size: 40),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    "KÍCH HOẠT THÀNH CÔNG!",
                    style: TextStyle(
                      color: AppTheme.emeraldSuccess,
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.8,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 5),
                  Text(
                    "Bo mạch đã nhận cấu hình Wi-Fi [$wifiSsid], đồng bộ MQTT và kích hoạt bảo hành.",
                    style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.45),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                    ),
                    child: Column(
                      children: [
                        _buildInfoRow("Tên thiết bị:", pairingResult!.modelName, textColor: Colors.white, isBold: true),
                        const SizedBox(height: 8),
                        _buildInfoRow("Mã phần cứng (ID):", pairingResult!.hardwareId, textColor: AppTheme.cyanAccent, isMonospace: true),
                        const SizedBox(height: 8),
                        _buildInfoRow("Trạng thái:", "🟢 ON (Trực tuyến)", textColor: AppTheme.emeraldSuccess, isBold: true),
                        const SizedBox(height: 8),
                        _buildInfoRow("Chủ sở hữu:", pairingResult!.ownerName, textColor: Colors.white, isBold: true),
                        const SizedBox(height: 8),
                        _buildInfoRow("Hạn dịch vụ / BH:", "${pairingResult!.warrantyUntil} (24 tháng)", textColor: AppTheme.amberWarning, isBold: true),
                        const SizedBox(height: 8),
                        _buildInfoRow("Mã E-Warranty:", pairingResult!.warrantyCode, textColor: AppTheme.purpleAccent, isMonospace: true),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: AppTheme.cyanAccent.withValues(alpha: 0.6)),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: () => Navigator.of(context).pop(),
                          child: const Text("Đóng", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.emeraldSuccess,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: () {
                            Navigator.of(context).pop();
                            onControlDoor(pairingResult!.hardwareId);
                          },
                          child: const Text("Điều Khiển Cửa", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ],
              )
            : Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const SizedBox(width: 24),
                      const Row(
                        children: [
                          Icon(Icons.wifi_tethering_rounded, color: AppTheme.cyanAccent, size: 18),
                          SizedBox(width: 8),
                          Text(
                            "TIẾN TRÌNH GHÉP NỐI THỰC TẾ",
                            style: TextStyle(
                              color: AppTheme.cyanAccent,
                              fontSize: 12.5,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, color: Colors.white70, size: 20),
                        onPressed: onCancel,
                      ),
                    ],
                  ),
                  const SizedBox(height: 22),
                  SizedBox(
                    width: 140,
                    height: 140,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox(
                          width: 140,
                          height: 140,
                          child: CircularProgressIndicator(
                            value: provisioningProgress,
                            strokeWidth: 8,
                            backgroundColor: Colors.white10,
                            valueColor: const AlwaysStoppedAnimation(AppTheme.cyanAccent),
                          ),
                        ),
                        Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              "$pctInt%",
                              style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                            ),
                            const Text("Hoàn thành", style: TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    provisioningStep,
                    style: const TextStyle(color: AppTheme.cyanAccent, fontSize: 12, fontWeight: FontWeight.w600),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: onCancel,
                    child: const Text("Hủy tiến trình", style: TextStyle(color: AppTheme.roseDanger, fontSize: 11)),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {Color? textColor, bool isBold = false, bool isMonospace = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
        Flexible(
          child: Text(
            value,
            style: TextStyle(
              color: textColor ?? Colors.white,
              fontSize: 11,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              fontFamily: isMonospace ? 'monospace' : null,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
