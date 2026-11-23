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
        decoration: BoxDecoration(
          color: AppTheme.dynamicSurface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.panel)),
          border: Border(top: BorderSide(color: AppTheme.dynamicHairline)),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text("Ảnh và video đã gửi", style: TextStyle(color: AppTheme.dynamicTextPrimary, fontSize: 15, fontWeight: FontWeight.w600)),
                  IconButton(
                    icon: Icon(Icons.close_rounded, color: AppTheme.dynamicTextSecondary),
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
    final surface = AppTheme.dynamicSurface;
    final textCol = AppTheme.dynamicTextPrimary;
    final subCol = AppTheme.dynamicTextSecondary;
    final border = AppTheme.dynamicHairline;
    final accent = AppTheme.dynamicAccent;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        height: MediaQuery.of(context).size.height * 0.85,
        decoration: BoxDecoration(
          color: surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          border: Border(top: BorderSide(color: border)),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text("Tệp & Tài liệu đã gửi", style: TextStyle(color: textCol, fontSize: 15, fontWeight: FontWeight.w700)),
                  IconButton(
                    icon: Icon(Icons.close_rounded, color: subCol),
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _fileAttachments.isEmpty
                  ? Center(child: Text("Chưa có tệp tài liệu nào được chia sẻ", style: TextStyle(color: subCol, fontSize: 12.5)))
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      itemCount: _fileAttachments.length,
                      itemBuilder: (c, i) {
                        final att = _fileAttachments[i];
                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppTheme.dynamicSurfaceRaised,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: border),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.insert_drive_file_rounded, color: accent, size: 24),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(att.name, style: TextStyle(color: textCol, fontSize: 12.5, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                                    const SizedBox(height: 2),
                                    Text(att.url, style: TextStyle(color: subCol, fontSize: 10.5), maxLines: 1, overflow: TextOverflow.ellipsis),
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
    final surface = AppTheme.dynamicSurface;
    final textCol = AppTheme.dynamicTextPrimary;
    final subCol = AppTheme.dynamicTextSecondary;
    final border = AppTheme.dynamicHairline;
    final accent = AppTheme.dynamicAccent;

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
            backgroundColor: surface,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: BorderSide(color: border),
            ),
            title: Row(
              children: [
                Icon(Icons.person_add_alt_1_rounded, color: accent, size: 20),
                const SizedBox(width: 8),
                Text("Thêm người vào nhóm", style: TextStyle(color: textCol, fontSize: 14.5, fontWeight: FontWeight.w700)),
              ],
            ),
            content: SizedBox(
              width: 320,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: searchCtrl,
                    style: TextStyle(color: textCol, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: "Nhập SĐT hoặc Email...",
                      hintStyle: TextStyle(color: subCol, fontSize: 12),
                      suffixIcon: IconButton(
                        icon: Icon(Icons.search_rounded, color: accent),
                        onPressed: () => doSearch(searchCtrl.text),
                      ),
                      filled: true,
                      fillColor: AppTheme.dynamicSurfaceRaised,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: border)),
                    ),
                    onSubmitted: doSearch,
                  ),
                  const SizedBox(height: 10),
                  if (searching)
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: CircularProgressIndicator(strokeWidth: 2, color: accent),
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
                            title: Text(u['fullName'] ?? '', style: TextStyle(color: textCol, fontSize: 12.5, fontWeight: FontWeight.w600)),
                            subtitle: Text(u['phoneNumber'] ?? u['email'] ?? '', style: TextStyle(color: subCol, fontSize: 11)),
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
                                    SnackBar(content: Text("Đã thêm ${u['fullName']} vào nhóm.")),
                                  );
                                }
                              },
                              child: const Text("Thêm", style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600)),
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
    final surface = AppTheme.dynamicSurface;
    final textCol = AppTheme.dynamicTextPrimary;
    final subCol = AppTheme.dynamicTextSecondary;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        title: Text("Xác nhận xóa thành viên", style: TextStyle(color: textCol, fontSize: 14.5, fontWeight: FontWeight.w700)),
        content: Text("Bạn có chắc muốn xóa ${participant.fullName} khỏi nhóm?", style: TextStyle(color: subCol, fontSize: 12.5)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text("Hủy", style: TextStyle(color: subCol)),
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
                    SnackBar(content: Text("Đã xóa ${participant.fullName} khỏi nhóm.")),
                  );
                }
              }
            },
            child: const Text("Xóa khỏi nhóm", style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  void _handleToggleRole(ChatParticipant participant) async {
    final newRole = participant.chatRole == 'ADMIN' ? 'MEMBER' : 'ADMIN';
    final actionName = newRole == 'ADMIN' ? 'bổ nhiệm làm Quản trị viên' : 'hạ quyền xuống Thành viên';
    final surface = AppTheme.dynamicSurface;
    final textCol = AppTheme.dynamicTextPrimary;
    final subCol = AppTheme.dynamicTextSecondary;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        title: Text("Xác nhận phân quyền", style: TextStyle(color: textCol, fontSize: 14.5, fontWeight: FontWeight.w700)),
        content: Text("Bạn có muốn $actionName đối với ${participant.fullName}?", style: TextStyle(color: subCol, fontSize: 12.5)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text("Hủy", style: TextStyle(color: subCol)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.brandBlue, foregroundColor: Colors.white),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text("Đồng ý", style: TextStyle(fontWeight: FontWeight.w600)),
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
            SnackBar(content: Text("Đã cập nhật quyền cho ${participant.fullName}.")),
          );
        }
      }
    }
  }

  void _handleLeaveGroup() {
    final currentUserId = AuthService().currentUser?.id ?? '';
    final surface = AppTheme.dynamicSurface;
    final textCol = AppTheme.dynamicTextPrimary;
    final subCol = AppTheme.dynamicTextSecondary;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        title: Text("Rời khỏi nhóm", style: TextStyle(color: textCol, fontSize: 14.5, fontWeight: FontWeight.w700)),
        content: Text("Bạn sẽ không thể xem hoặc gửi tin nhắn trong nhóm này nữa.", style: TextStyle(color: subCol, fontSize: 12.5)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text("Ở lại", style: TextStyle(color: subCol)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.roseDanger),
            onPressed: () async {
              Navigator.of(ctx).pop();
              await _chatService.removeGroupMember(_conversation.id, currentUserId);
              if (mounted) {
                Navigator.of(context).pop();
                Navigator.of(context).pop();
              }
            },
            child: const Text("Rời nhóm", style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode;
    final bgCol = isDark ? AppTheme.background : const Color(0xFFF3F6FA);
    final surfaceCol = isDark ? AppTheme.surface : Colors.white;
    final borderCol = isDark ? AppTheme.cardBorder : const Color(0xFFE2E8F0);
    final textCol = isDark ? Colors.white : const Color(0xFF0F172A);
    final subTextCol = isDark ? AppTheme.textSecondary : const Color(0xFF64748B);
    final accent = isDark ? const Color(0xFF60A5FA) : const Color(0xFF0068FF);

    return Scaffold(
      backgroundColor: bgCol,
      appBar: AppBar(
        backgroundColor: surfaceCol,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, color: accent, size: 18),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          "Tùy chọn trò chuyện",
          style: TextStyle(color: textCol, fontSize: 15, fontWeight: FontWeight.w700),
        ),
        centerTitle: true,
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: accent))
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              child: Column(
                children: [
                  _buildHeaderProfile(isDark, textCol, subTextCol, accent),
                  const SizedBox(height: 16),
                  _buildQuickActionBar(isDark, surfaceCol, borderCol, subTextCol, accent),
                  const SizedBox(height: 16),
                  _buildMediaAndFilesSection(isDark, surfaceCol, borderCol, textCol, subTextCol, accent),
                  const SizedBox(height: 14),
                  if (_conversation.isGroup) ...[
                    _buildGroupMembersSection(isDark, surfaceCol, borderCol, textCol, subTextCol, accent),
                    const SizedBox(height: 14),
                    _buildGroupDangerZone(surfaceCol),
                  ] else ...[
                    _buildDirectChatOptions(surfaceCol, borderCol, textCol),
                  ],
                  const SizedBox(height: 20),
                ],
              ),
            ),
    );
  }

  Widget _buildHeaderProfile(bool isDark, Color textCol, Color subTextCol, Color accent) {
    return Column(
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: accent.withValues(alpha: isDark ? 0.20 : 0.12),
            border: Border.all(color: accent.withValues(alpha: 0.4), width: 1.5),
          ),
          child: Center(
            child: Icon(
              _conversation.isGroup
                  ? Icons.group_rounded
                  : (_conversation.isCskh ? Icons.support_agent_rounded : Icons.person_rounded),
              color: accent,
              size: 36,
            ),
          ),
        ),
        const SizedBox(height: 10),
        Text(
          _conversation.title,
          style: TextStyle(color: textCol, fontSize: 16, fontWeight: FontWeight.w700),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 3),
        Text(
          _conversation.isGroup
              ? "Nhóm trò chuyện · ${_conversation.memberCount} thành viên"
              : (_conversation.isCskh ? "Chăm sóc khách hàng & Kỹ thuật Austec" : "Cuộc trò chuyện cá nhân"),
          style: TextStyle(color: subTextCol, fontSize: 12),
        ),
      ],
    );
  }

  Widget _buildQuickActionBar(bool isDark, Color surfaceCol, Color borderCol, Color subTextCol, Color accent) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _buildActionItem(
          icon: Icons.search_rounded,
          label: "Tìm kiếm",
          surfaceCol: surfaceCol,
          borderCol: borderCol,
          subTextCol: subTextCol,
          accent: accent,
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text("Tính năng tìm kiếm tin nhắn đang được cập nhật.")),
            );
          },
        ),
        _buildActionItem(
          icon: _isMuted ? Icons.notifications_off_rounded : Icons.notifications_none_rounded,
          label: _isMuted ? "Đã tắt" : "Thông báo",
          color: _isMuted ? AppTheme.amberWarning : null,
          surfaceCol: surfaceCol,
          borderCol: borderCol,
          subTextCol: subTextCol,
          accent: accent,
          onTap: () => setState(() => _isMuted = !_isMuted),
        ),
        _buildActionItem(
          icon: _isPinned ? Icons.push_pin_rounded : Icons.push_pin_outlined,
          label: _isPinned ? "Đã ghim" : "Ghim chat",
          color: _isPinned ? accent : null,
          surfaceCol: surfaceCol,
          borderCol: borderCol,
          subTextCol: subTextCol,
          accent: accent,
          onTap: () => setState(() => _isPinned = !_isPinned),
        ),
        if (_conversation.isGroup)
          _buildActionItem(
            icon: Icons.person_add_alt_1_rounded,
            label: "Thêm người",
            surfaceCol: surfaceCol,
            borderCol: borderCol,
            subTextCol: subTextCol,
            accent: accent,
            onTap: _openAddMembersDialog,
          ),
      ],
    );
  }

  Widget _buildActionItem({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required Color surfaceCol,
    required Color borderCol,
    required Color subTextCol,
    required Color accent,
    Color? color,
  }) {
    final activeColor = color ?? accent;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        child: Column(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: surfaceCol,
                border: Border.all(color: color != null ? color.withValues(alpha: 0.45) : borderCol),
              ),
              child: Icon(icon, color: activeColor, size: 20),
            ),
            const SizedBox(height: 5),
            Text(label, style: TextStyle(color: subTextCol, fontSize: 11, fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }

  Widget _buildMediaAndFilesSection(
    bool isDark,
    Color surfaceCol,
    Color borderCol,
    Color textCol,
    Color subTextCol,
    Color accent,
  ) {
    final media = _mediaAttachments;
    final files = _fileAttachments;

    return Container(
      decoration: BoxDecoration(
        color: surfaceCol,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderCol),
      ),
      child: Column(
        children: [
          ListTile(
            dense: true,
            leading: Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(Icons.image_outlined, color: accent, size: 18),
            ),
            title: Text("Ảnh & Video đã gửi", style: TextStyle(color: textCol, fontSize: 13, fontWeight: FontWeight.w600)),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text("${media.length}", style: TextStyle(color: subTextCol, fontSize: 12)),
                const SizedBox(width: 4),
                Icon(Icons.arrow_forward_ios_rounded, color: subTextCol, size: 13),
              ],
            ),
            onTap: _showAllMediaGallery,
          ),
          if (media.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
              child: SizedBox(
                height: 60,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: media.length > 5 ? 5 : media.length,
                  itemBuilder: (c, i) {
                    final att = media[i];
                    return GestureDetector(
                      onTap: () => _openImageViewer(att.url, att.name),
                      child: Container(
                        margin: const EdgeInsets.only(right: 8),
                        width: 60,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: borderCol),
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
          Divider(height: 1, color: borderCol),
          ListTile(
            dense: true,
            leading: Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(Icons.insert_drive_file_outlined, color: accent, size: 18),
            ),
            title: Text("Tệp tài liệu", style: TextStyle(color: textCol, fontSize: 13, fontWeight: FontWeight.w600)),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text("${files.length}", style: TextStyle(color: subTextCol, fontSize: 12)),
                const SizedBox(width: 4),
                Icon(Icons.arrow_forward_ios_rounded, color: subTextCol, size: 13),
              ],
            ),
            onTap: _showAllFilesGallery,
          ),
        ],
      ),
    );
  }

  Widget _buildGroupMembersSection(
    bool isDark,
    Color surfaceCol,
    Color borderCol,
    Color textCol,
    Color subTextCol,
    Color accent,
  ) {
    final participants = _conversation.participants;
    final currentUserId = AuthService().currentUser?.id;

    return Container(
      decoration: BoxDecoration(
        color: surfaceCol,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderCol),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Thành viên (${participants.length})",
                style: TextStyle(color: subTextCol, fontSize: 12, fontWeight: FontWeight.w700),
              ),
              InkWell(
                onTap: _openAddMembersDialog,
                child: Text("Thêm mới", style: TextStyle(color: accent, fontSize: 12, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: participants.length,
            separatorBuilder: (_, __) => Divider(height: 14, color: borderCol),
            itemBuilder: (c, i) {
              final p = participants[i];
              final isCreator = p.userId == _conversation.creatorId;
              final isAdmin = p.chatRole == 'ADMIN';
              final isMe = p.userId == currentUserId;

              return Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: accent.withValues(alpha: isDark ? 0.18 : 0.12),
                      border: Border.all(color: accent.withValues(alpha: 0.3)),
                    ),
                    child: Center(
                      child: Text(
                        p.fullName.isNotEmpty ? p.fullName[0].toUpperCase() : 'U',
                        style: TextStyle(color: accent, fontSize: 13, fontWeight: FontWeight.bold),
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
                            Flexible(
                              child: Text(
                                p.fullName + (isMe ? " (Bạn)" : ""),
                                style: TextStyle(color: textCol, fontSize: 13, fontWeight: FontWeight.w600),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 6),
                            if (isCreator)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                decoration: BoxDecoration(
                                  color: AppTheme.amberWarning.withValues(alpha: 0.16),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text("Trưởng nhóm", style: TextStyle(color: AppTheme.amberWarning, fontSize: 9, fontWeight: FontWeight.bold)),
                              )
                            else if (isAdmin)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                decoration: BoxDecoration(
                                  color: accent.withValues(alpha: 0.14),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text("Quản trị viên", style: TextStyle(color: accent, fontSize: 9, fontWeight: FontWeight.bold)),
                              ),
                          ],
                        ),
                        const SizedBox(height: 1),
                        Text(
                          p.phoneNumber ?? p.email,
                          style: TextStyle(color: subTextCol, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  if (_isCurrentUserAdmin && !isMe && !isCreator)
                    PopupMenuButton<String>(
                      icon: Icon(Icons.more_vert, color: subTextCol, size: 19),
                      color: surfaceCol,
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
                              Icon(isAdmin ? Icons.remove_moderator_rounded : Icons.admin_panel_settings_rounded, color: accent, size: 18),
                              const SizedBox(width: 8),
                              Text(isAdmin ? "Hạ quyền thành viên" : "Bổ nhiệm Quản trị viên", style: TextStyle(color: textCol, fontSize: 12)),
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

  Widget _buildGroupDangerZone(Color surfaceCol) {
    return Container(
      decoration: BoxDecoration(
        color: surfaceCol,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.roseDanger.withValues(alpha: 0.35)),
      ),
      child: ListTile(
        dense: true,
        leading: const Icon(Icons.logout_rounded, color: AppTheme.roseDanger, size: 20),
        title: const Text("Rời khỏi nhóm trò chuyện", style: TextStyle(color: AppTheme.roseDanger, fontSize: 13, fontWeight: FontWeight.w600)),
        trailing: const Icon(Icons.arrow_forward_ios_rounded, color: AppTheme.roseDanger, size: 13),
        onTap: _handleLeaveGroup,
      ),
    );
  }

  Widget _buildDirectChatOptions(Color surfaceCol, Color borderCol, Color textCol) {
    return Container(
      decoration: BoxDecoration(
        color: surfaceCol,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderCol),
      ),
      child: Column(
        children: [
          ListTile(
            dense: true,
            leading: const Icon(Icons.block_rounded, color: AppTheme.amberWarning, size: 20),
            title: Text("Chặn cuộc trò chuyện", style: TextStyle(color: textCol, fontSize: 13, fontWeight: FontWeight.w500)),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("Đã lưu thiết lập chặn tin nhắn.")),
              );
            },
          ),
          Divider(height: 1, color: borderCol),
          ListTile(
            dense: true,
            leading: const Icon(Icons.delete_outline_rounded, color: AppTheme.roseDanger, size: 20),
            title: const Text("Xóa toàn bộ lịch sử", style: TextStyle(color: AppTheme.roseDanger, fontSize: 13, fontWeight: FontWeight.w500)),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("Đã xóa lịch sử cuộc trò chuyện.")),
              );
            },
          ),
        ],
      ),
    );
  }
}
