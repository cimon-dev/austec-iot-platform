import 'package:flutter/material.dart';
import '../../core/constants/app_theme.dart';

class FamilyMember {
  final String name;
  final String phone;
  final String role; // 'ADMIN' | 'MEMBER' | 'GUEST'
  final String timeWindow;

  FamilyMember({
    required this.name,
    required this.phone,
    required this.role,
    this.timeWindow = "Toàn thời gian (24/7)",
  });
}

class FamilySharingScreen extends StatefulWidget {
  const FamilySharingScreen({super.key});

  @override
  State<FamilySharingScreen> createState() => _FamilySharingScreenState();
}

class _FamilySharingScreenState extends State<FamilySharingScreen> {
  final List<FamilyMember> _members = [
    FamilyMember(name: "Nguyễn Văn Nam (Chủ nhà)", phone: "0912345678", role: "ADMIN"),
    FamilyMember(name: "Trần Thị Mai (Vợ)", phone: "0988776655", role: "MEMBER"),
    FamilyMember(name: "Nguyễn Tuấn Anh (Con trai)", phone: "0905112233", role: "MEMBER"),
    FamilyMember(name: "Bác Giúp Việc (Khách)", phone: "0934112233", role: "GUEST", timeWindow: "T2-T6: 08:00 - 18:00"),
  ];

  String? _transferOtp;

  void _generateTransferOtp() {
    setState(() {
      _transferOtp = "889241";
    });

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: const Text("Chuyển Giao Quyền Sở Hữu", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              "Mã OTP chuyển nhượng thiết bị có hiệu lực trong 15 phút. Người mua mới mở App Austec và quét mã này:",
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: AppTheme.background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.cyanAccent),
              ),
              child: Text(
                _transferOtp!,
                style: const TextStyle(
                  color: AppTheme.cyanAccent,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 6,
                  fontFamily: "monospace",
                ),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              "Sau khi người nhận xác nhận, tài khoản hiện tại sẽ tự động bàn giao toàn bộ lịch sử bảo hành sạch sẽ.",
              style: TextStyle(color: AppTheme.amberWarning, fontSize: 11),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text("Đóng", style: TextStyle(color: AppTheme.cyanAccent)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Thành Viên Gia Đình",
                    style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    "Phân quyền điều khiển theo giờ & vai trò",
                    style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                  ),
                ],
              ),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.cyanAccent,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.person_add, size: 16),
                label: const Text("Mời thêm", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Mở camera quét mã QR lời mời gia đình!")),
                  );
                },
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Member List
          Expanded(
            child: ListView.builder(
              itemCount: _members.length,
              itemBuilder: (context, index) {
                final m = _members[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: AppTheme.glassBox(),
                  child: Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: m.role == "ADMIN"
                            ? AppTheme.cyanAccent
                            : m.role == "MEMBER"
                                ? AppTheme.blueAccent
                                : AppTheme.amberWarning,
                        radius: 20,
                        child: Text(
                          m.name[0],
                          style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              m.name,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            Text(
                              "${m.phone} • ${m.timeWindow}",
                              style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: m.role == "ADMIN"
                              ? AppTheme.cyanAccent.withOpacity(0.12)
                              : m.role == "MEMBER"
                                  ? AppTheme.blueAccent.withOpacity(0.12)
                                  : AppTheme.amberWarning.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          m.role,
                          style: TextStyle(
                            color: m.role == "ADMIN"
                                ? AppTheme.cyanAccent
                                : m.role == "MEMBER"
                                    ? AppTheme.blueAccent
                                    : AppTheme.amberWarning,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),

          // Ownership Transfer Box
          Container(
            padding: const EdgeInsets.all(16),
            decoration: AppTheme.glassBox(
              color: AppTheme.amberWarning.withOpacity(0.08),
              borderColor: AppTheme.amberWarning.withOpacity(0.4),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.swap_horizontal_circle, color: AppTheme.amberWarning, size: 20),
                    SizedBox(width: 8),
                    Text(
                      "Chuyển nhượng / Bán lại thiết bị",
                      style: TextStyle(color: AppTheme.amberWarning, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  "Khi bán nhà hoặc nhượng lại thiết bị thông minh, sử dụng tính năng này để bàn giao quyền sở hữu.",
                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.amberWarning,
                      side: const BorderSide(color: AppTheme.amberWarning),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: _generateTransferOtp,
                    child: const Text("Tạo Mã OTP Chuyển Giao Quyền Sở Hữu (15 Phút)"),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
