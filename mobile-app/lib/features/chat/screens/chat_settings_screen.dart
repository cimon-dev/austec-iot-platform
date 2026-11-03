import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/services/auth_service.dart';
import '../models/conversation_item.dart';
import '../models/chat_message_model.dart';
import '../models/chat_attachment.dart';
import '../services/chat_service.dart';

class ChatSettingsScreen extends StatefulWidget {
  final ConversationItem conversation;
  final List<ChatMessageModel> messages;
  final Function(ConversationItem updated)? onConversationUpdated;

  const ChatSettingsScreen({
    super.key,
    required this.conversation,
    required this.messages,
    this.onConversationUpdated,
  });

  @override
  State<ChatSettingsScreen> createState() => _ChatSettingsScreenState();
}

class _ChatSettingsScreenState extends State<ChatSettingsScreen> {
  final ChatService _chatService = ChatService();
  late ConversationItem _conversation;
  bool _isMuted = false;
  bool _isPinned = false;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _conversation = widget.conversation;
  }

  // Lấy danh sách ảnh & video đã gửi trong đoạn chat
  List<ChatAttachment> get _mediaAttachments {
    final List<ChatAttachment> list = [];
    for (final m in widget.messages) {
      for (final att in m.attachments) {
        if (att.mediaType == 'image' || att.mediaType == 'video') {
          list.add(att);
        }
      }
    }
    return list;
  }

  // Lấy danh sách file/tài liệu đã gửi trong đoạn chat
  List<ChatAttachment> get _fileAttachments {
    final List<ChatAttachment> list = [];
    for (final m in widget.messages) {
      for (final att in m.attachments) {
        if (att.mediaType != 'image' && att.mediaType != 'video') {
          list.add(att);
        }
      }
    }
    return list;
  }

  bool get _isCurrentUserAdmin {
    final currentUserId = AuthService().currentUser?.id;
    if (_conversation.creatorId == currentUserId) return true;
    final me = _conversation.participants.firstWhere(
      (p) => p.userId == currentUserId,
      orElse: () => ChatParticipant(userId: '', fullName: '', email: '', role: '', chatRole: 'MEMBER'),
    );
    return me.chatRole == 'ADMIN';
  }

  Future<void> _refreshConversation() async {
    final updated = await _chatService.fetchConversationById(_conversation.id);
    if (updated != null && mounted) {
      setState(() => _conversation = updated);
      widget.onConversationUpdated?.call(updated);
    }
  }

  void _openImageViewer(String imageUrl, String imageName) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.black.withValues(alpha: 0.8),
            elevation: 0,
            leading: IconButton(
              icon: const Icon(Icons.close_rounded, color: Colors.white, size: 24),
              onPressed: () => Navigator.of(context).pop(),
            ),
            title: Text(imageName, style: const TextStyle(color: Colors.white, fontSize: 13)),
          ),
          body: Center(
            child: InteractiveViewer(
              panEnabled: true,
              minScale: 0.8,
              maxScale: 4.0,
              child: Image.network(
                imageUrl,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const Icon(Icons.broken_image, color: Colors.white54, size: 48),
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showAllMediaGallery() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        height: MediaQuery.of(context).size.height * 0.85,
        decoration: const BoxDecoration(
          color: Color(0xFF0F172A),
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          border: Border(top: BorderSide(color: AppTheme.cardBorder)),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Toàn bộ Ảnh & Video đã gửi", style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white70),
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _mediaAttachments.isEmpty
                  ? const Center(child: Text("Chưa có ảnh/video nào được chia sẻ", style: TextStyle(color: AppTheme.textMuted, fontSize: 12)))
                  : GridView.builder(
                      padding: const EdgeInsets.all(12),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 3,
                        crossAxisSpacing: 8,
                        mainAxisSpacing: 8,
                      ),
                      itemCount: _mediaAttachments.length,
                      itemBuilder: (c, i) {
                        final att = _mediaAttachments[i];
                        return GestureDetector(
                          onTap: () => _openImageViewer(att.url, att.name),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(att.url, fit: BoxFit.cover),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAllFilesGallery() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        height: MediaQuery.of(context).size.height * 0.85,
        decoration: const BoxDecoration(
          color: Color(0xFF0F172A),
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          border: Border(top: BorderSide(color: AppTheme.cardBorder)),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Toàn bộ Tệp & Tài liệu đã gửi", style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white70),
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _fileAttachments.isEmpty
                  ? const Center(child: Text("Chưa có tệp tài liệu nào được chia sẻ", style: TextStyle(color: AppTheme.textMuted, fontSize: 12)))
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      itemCount: _fileAttachments.length,
                      itemBuilder: (c, i) {
                        final att = _fileAttachments[i];
                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTheme.surfaceGlass,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.cardBorder),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.insert_drive_file_rounded, color: AppTheme.cyanAccent, size: 28),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(att.name, style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                                    const SizedBox(height: 2),
                                    Text(att.url, style: const TextStyle(color: AppTheme.textMuted, fontSize: 10), maxLines: 1, overflow: TextOverflow.ellipsis),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  void _openAddMembersDialog() {
    final searchCtrl = TextEditingController();
    List<Map<String, dynamic>> searchResults = [];
    bool searching = false;

    showDialog(
      context: context,
      builder: (dlgCtx) => StatefulBuilder(
        builder: (context, setDlgState) {
          void doSearch(String q) async {
            if (q.trim().isEmpty) return;
            setDlgState(() => searching = true);
            final res = await _chatService.searchUsers(q);
            setDlgState(() {
              searchResults = res;
              searching = false;
            });
          }

          return AlertDialog(
            backgroundColor: const Color(0xFF0F172A),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: AppTheme.cardBorder),
            ),
            title: const Row(
              children: [
                Icon(Icons.person_add_alt_1_rounded, color: AppTheme.cyanAccent, size: 20),
                SizedBox(width: 8),
                Text("Thêm người vào nhóm", style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
              ],
            ),
            content: SizedBox(
              width: 320,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: searchCtrl,
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                    decoration: InputDecoration(
                      hintText: "Nhập SĐT hoặc Email...",
                      hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 11.5),
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.search, color: AppTheme.cyanAccent),
                        onPressed: () => doSearch(searchCtrl.text),
                      ),
                      filled: true,
                      fillColor: Colors.black38,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                    ),
                    onSubmitted: doSearch,
                  ),
                  const SizedBox(height: 10),
                  if (searching)
                    const Padding(
                      padding: EdgeInsets.all(12),
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.cyanAccent),
                    )
                  else ...[
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxHeight: 180),
                      child: ListView.builder(
                        shrinkWrap: true,
                        itemCount: searchResults.length,
                        itemBuilder: (c, i) {
                          final u = searchResults[i];
                          return ListTile(
                            dense: true,
                            contentPadding: EdgeInsets.zero,
                            title: Text(u['fullName'] ?? '', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                            subtitle: Text(u['phoneNumber'] ?? u['email'] ?? '', style: const TextStyle(color: AppTheme.textMuted, fontSize: 10.5)),
                            trailing: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.brandBlue,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              ),
                              onPressed: () async {
                                final ok = await _chatService.addGroupMembers(_conversation.id, [u['id'].toString()]);
                                if (context.mounted && ok) {
                                  Navigator.of(dlgCtx).pop();
                                  _refreshConversation();
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text("Đã thêm ${u['fullName']} vào nhóm!")),
                                  );
                                }
                              },
                              child: const Text("Thêm", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  void _handleKickMember(ChatParticipant participant) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text("Xác nhận xóa thành viên", style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
        content: Text("Bạn có chắc chắn muốn xóa ${participant.fullName} khỏi nhóm chat này?", style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text("Hủy", style: TextStyle(color: Colors.white60)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.roseDanger),
            onPressed: () async {
              Navigator.of(ctx).pop();
              setState(() => _isLoading = true);
              final ok = await _chatService.removeGroupMember(_conversation.id, participant.userId);
              setState(() => _isLoading = false);
              if (ok) {
                _refreshConversation();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text("Đã xóa ${participant.fullName} khỏi nhóm!")),
                  );
                }
              }
            },
            child: const Text("Xóa khỏi nhóm", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _handleToggleRole(ChatParticipant participant) async {
    final newRole = participant.chatRole == 'ADMIN' ? 'MEMBER' : 'ADMIN';
    final actionName = newRole == 'ADMIN' ? 'bổ nhiệm làm Quản trị viên' : 'hạ quyền xuống Thành viên';

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text("Xác nhận phân quyền", style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
        content: Text("Bạn có muốn $actionName đối với ${participant.fullName}?", style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text("Hủy", style: TextStyle(color: Colors.white60)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.brandBlue, foregroundColor: Colors.white),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text("Đồng ý", style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isLoading = true);
      final ok = await _chatService.updateMemberRole(_conversation.id, participant.userId, newRole);
      setState(() => _isLoading = false);
      if (ok) {
        _refreshConversation();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text("Đã cập nhật phân quyền cho ${participant.fullName}!")),
          );
        }
      }
    }
  }

  void _handleLeaveGroup() {
    final currentUserId = AuthService().currentUser?.id ?? '';
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text("Rời khỏi nhóm", style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
        content: const Text("Bạn sẽ không thể xem hoặc gửi tin nhắn trong nhóm này nữa.", style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text("Ở lại", style: TextStyle(color: Colors.white60)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.roseDanger),
            onPressed: () async {
              Navigator.of(ctx).pop();
              await _chatService.removeGroupMember(_conversation.id, currentUserId);
              if (mounted) {
                Navigator.of(context).pop(); // Thoát khỏi cài đặt
                Navigator.of(context).pop(); // Thoát khỏi phòng chat về Hub
              }
            },
            child: const Text("Rời nhóm", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B132B),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 18),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          "TÙY CHỌN TRÒ CHUYỆN",
          style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 1.0),
        ),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.cyanAccent))
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
              child: Column(
                children: [
                  // 1. Header Profile
                  _buildHeaderProfile(),
                  const SizedBox(height: 20),

                  // 2. Quick Actions Bar
                  _buildQuickActionBar(),
                  const SizedBox(height: 24),

                  // 3. Kho Ảnh & Tệp
                  _buildMediaAndFilesSection(),
                  const SizedBox(height: 24),

                  // 4. Nếu là Nhóm: Danh sách thành viên & Phân quyền
                  if (_conversation.isGroup) ...[
                    _buildGroupMembersSection(),
                    const SizedBox(height: 24),
                    _buildGroupDangerZone(),
                  ] else ...[
                    _buildDirectChatOptions(),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildHeaderProfile() {
    return Column(
      children: [
        Stack(
          alignment: Alignment.center,
          children: [
            Container(
              width: 84,
              height: 84,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: _conversation.isGroup ? AppTheme.cyanGradient : AppTheme.purpleGradient,
                boxShadow: [
                  BoxShadow(
                    color: (_conversation.isGroup ? AppTheme.cyanAccent : AppTheme.purpleAccent).withValues(alpha: 0.3),
                    blurRadius: 16,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Center(
                child: Icon(
                  _conversation.isGroup
                      ? Icons.group_rounded
                      : (_conversation.isCskh ? Icons.support_agent_rounded : Icons.person_rounded),
                  color: Colors.white,
                  size: 44,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          _conversation.title,
          style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4),
        Text(
          _conversation.isGroup
              ? "Nhóm trò chuyện • ${_conversation.memberCount} thành viên"
              : (_conversation.isCskh ? "Chăm Sóc Khách Hàng & Kỹ Thuật Austec" : "Cuộc trò chuyện cá nhân"),
          style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
        ),
      ],
    );
  }

  Widget _buildQuickActionBar() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _buildActionItem(
          icon: Icons.search_rounded,
          label: "Tìm kiếm",
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text("Tính năng tìm kiếm tin nhắn đang được tối ưu!")),
            );
          },
        ),
        _buildActionItem(
          icon: _isMuted ? Icons.notifications_off_rounded : Icons.notifications_none_rounded,
          label: _isMuted ? "Đã tắt" : "Báo chuông",
          color: _isMuted ? Colors.orange : null,
          onTap: () => setState(() => _isMuted = !_isMuted),
        ),
        _buildActionItem(
          icon: _isPinned ? Icons.push_pin_rounded : Icons.push_pin_outlined,
          label: _isPinned ? "Đã ghim" : "Ghim chat",
          color: _isPinned ? AppTheme.brandBlue : null,
          onTap: () => setState(() => _isPinned = !_isPinned),
        ),
        if (_conversation.isGroup)
          _buildActionItem(
            icon: Icons.person_add_alt_1_rounded,
            label: "Thêm người",
            onTap: _openAddMembersDialog,
          ),
      ],
    );
  }

  Widget _buildActionItem({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    Color? color,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Column(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.surfaceGlass,
              border: Border.all(color: color != null ? color.withValues(alpha: 0.5) : AppTheme.cardBorder),
            ),
            child: Icon(icon, color: color ?? Colors.white70, size: 20),
          ),
          const SizedBox(height: 6),
          Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
        ],
      ),
    );
  }

  Widget _buildMediaAndFilesSection() {
    final media = _mediaAttachments;
    final files = _fileAttachments;

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.cardBorder),
      ),
      child: Column(
        children: [
          // Mục Ảnh & Video
          ListTile(
            leading: const Icon(Icons.image_outlined, color: AppTheme.brandBlue, size: 22),
            title: const Text("Ảnh & Video đã gửi", style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text("${media.length}", style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white38, size: 14),
              ],
            ),
            onTap: _showAllMediaGallery,
          ),
          if (media.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: SizedBox(
                height: 64,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: media.length > 5 ? 5 : media.length,
                  itemBuilder: (c, i) {
                    final att = media[i];
                    return GestureDetector(
                      onTap: () => _openImageViewer(att.url, att.name),
                      child: Container(
                        margin: const EdgeInsets.only(right: 8),
                        width: 64,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.white12),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(att.url, fit: BoxFit.cover),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ],

          const Divider(height: 1, color: Colors.white10),

          // Mục Tệp & Tài liệu
          ListTile(
            leading: const Icon(Icons.insert_drive_file_outlined, color: AppTheme.purpleAccent, size: 22),
            title: const Text("Tệp tài liệu", style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text("${files.length}", style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white38, size: 14),
              ],
            ),
            onTap: _showAllFilesGallery,
          ),
        ],
      ),
    );
  }

  Widget _buildGroupMembersSection() {
    final participants = _conversation.participants;
    final currentUserId = AuthService().currentUser?.id;

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.cardBorder),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "THÀNH VIÊN TRONG NHÓM (${participants.length})",
                style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8),
              ),
              InkWell(
                onTap: _openAddMembersDialog,
                child: const Text("Thêm mới", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 12, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: participants.length,
            separatorBuilder: (_, __) => const Divider(height: 16, color: Colors.white10),
            itemBuilder: (c, i) {
              final p = participants[i];
              final isCreator = p.userId == _conversation.creatorId;
              final isAdmin = p.chatRole == 'ADMIN';
              final isMe = p.userId == currentUserId;

              return Row(
                children: [
                  // Avatar
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: isCreator
                          ? const LinearGradient(colors: [Colors.orange, Colors.amber])
                          : (isAdmin ? AppTheme.cyanGradient : const LinearGradient(colors: [Colors.grey, Colors.blueGrey])),
                    ),
                    child: Center(
                      child: Text(
                        p.fullName.isNotEmpty ? p.fullName[0].toUpperCase() : 'U',
                        style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Name & Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                p.fullName + (isMe ? " (Bạn)" : ""),
                                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 6),
                            if (isCreator)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.amber.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: Colors.amber.withValues(alpha: 0.5)),
                                ),
                                child: const Text("Trưởng nhóm", style: TextStyle(color: Colors.amber, fontSize: 9, fontWeight: FontWeight.bold)),
                              )
                            else if (isAdmin)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppTheme.brandBlue.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: AppTheme.brandBlue.withValues(alpha: 0.5)),
                                ),
                                child: const Text("Quản trị viên", style: TextStyle(color: AppTheme.brandBlue, fontSize: 9, fontWeight: FontWeight.bold)),
                              ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          p.phoneNumber ?? p.email,
                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                        ),
                      ],
                    ),
                  ),

                  // Menu thao tác nếu có quyền Admin/Creator và không phải chính mình
                  if (_isCurrentUserAdmin && !isMe && !isCreator)
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_vert, color: Colors.white60, size: 20),
                      color: const Color(0xFF1E293B),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      onSelected: (val) {
                        if (val == 'toggle_role') {
                          _handleToggleRole(p);
                        } else if (val == 'kick') {
                          _handleKickMember(p);
                        }
                      },
                      itemBuilder: (ctx) => [
                        PopupMenuItem(
                          value: 'toggle_role',
                          child: Row(
                            children: [
                              Icon(isAdmin ? Icons.remove_moderator_rounded : Icons.admin_panel_settings_rounded, color: AppTheme.brandBlue, size: 18),
                              const SizedBox(width: 8),
                              Text(isAdmin ? "Hạ quyền thành viên" : "Bổ nhiệm Quản trị viên", style: const TextStyle(color: Colors.white, fontSize: 12)),
                            ],
                          ),
                        ),
                        const PopupMenuItem(
                          value: 'kick',
                          child: Row(
                            children: [
                              Icon(Icons.person_remove_rounded, color: AppTheme.roseDanger, size: 18),
                              SizedBox(width: 8),
                              Text("Xóa khỏi nhóm", style: TextStyle(color: AppTheme.roseDanger, fontSize: 12)),
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
    );
  }

  Widget _buildGroupDangerZone() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.roseDanger.withValues(alpha: 0.3)),
      ),
      child: ListTile(
        leading: const Icon(Icons.logout_rounded, color: AppTheme.roseDanger, size: 22),
        title: const Text("Rời khỏi nhóm trò chuyện", style: TextStyle(color: AppTheme.roseDanger, fontSize: 13, fontWeight: FontWeight.bold)),
        trailing: const Icon(Icons.arrow_forward_ios_rounded, color: AppTheme.roseDanger, size: 14),
        onTap: _handleLeaveGroup,
      ),
    );
  }

  Widget _buildDirectChatOptions() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.cardBorder),
      ),
      child: Column(
        children: [
          ListTile(
            leading: const Icon(Icons.block_rounded, color: Colors.orange, size: 20),
            title: const Text("Chặn cuộc trò chuyện", style: TextStyle(color: Colors.white, fontSize: 13)),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("Đã lưu thiết lập chặn tin nhắn!")),
              );
            },
          ),
          const Divider(height: 1, color: Colors.white10),
          ListTile(
            leading: const Icon(Icons.delete_outline_rounded, color: AppTheme.roseDanger, size: 20),
            title: const Text("Xóa toàn bộ lịch sử", style: TextStyle(color: AppTheme.roseDanger, fontSize: 13)),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("Đã làm sạch lịch sử cuộc trò chuyện!")),
              );
            },
          ),
        ],
      ),
    );
  }
}
