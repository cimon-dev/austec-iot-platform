import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/models/device_model.dart';
import '../../../core/services/auth_service.dart';
import '../../cskh/domain/entities/chat_device_item.dart';
import '../models/conversation_item.dart';
import '../services/chat_service.dart';
import 'chat_room_screen.dart';

class ChatHubScreen extends StatefulWidget {
  final Function(ProductItem)? onConsultProduct;
  final ChatDeviceItem? prefilledDevice;
  final String? prefilledPrompt;

  const ChatHubScreen({
    super.key,
    this.onConsultProduct,
    this.prefilledDevice,
    this.prefilledPrompt,
  });

  @override
  State<ChatHubScreen> createState() => _ChatHubScreenState();
}

class _ChatHubScreenState extends State<ChatHubScreen> {
  final ChatService _chatService = ChatService();
  final TextEditingController _searchController = TextEditingController();

  List<ConversationItem> _conversations = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadConversations();

    // Nếu có prefilledDevice hoặc prompt từ gian hàng / thiết bị, tự động mở phòng CSKH
    if (widget.prefilledDevice != null || (widget.prefilledPrompt != null && widget.prefilledPrompt!.isNotEmpty)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _openCskhChat(initialDevice: widget.prefilledDevice, prompt: widget.prefilledPrompt);
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadConversations() async {
    final list = await _chatService.fetchConversations();
    if (!mounted) return;
    setState(() {
      _conversations = list;
      _isLoading = false;
    });
  }

  void _openChatRoom(ConversationItem conversation, {ChatDeviceItem? device, String? prompt}) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ChatRoomScreen(
          conversation: conversation,
          initialDevice: device,
          initialPrompt: prompt,
        ),
      ),
    );
    // Khi quay lại danh sách, reload lại danh sách cuộc trò chuyện
    _loadConversations();
  }

  void _openCskhChat({ChatDeviceItem? initialDevice, String? prompt}) {
    final cskh = _conversations.firstWhere(
      (c) => c.isCskh,
      orElse: () => ConversationItem(
        id: 'cskh-conv-${AuthService().currentUser?.id ?? "usr-default"}',
        type: 'CSKH',
        title: 'Hỗ trợ Kỹ thuật & CSKH Austec 24/7',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        lastMessage: 'Dạ em chào Quý khách! Kỹ thuật viên Austec đã sẵn sàng hỗ trợ trực tuyến 24/7.',
      ),
    );
    _openChatRoom(cskh, device: initialDevice, prompt: prompt);
  }

  void _openNewDirectChatDialog() {
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
                Icon(Icons.person_search_rounded, color: AppTheme.cyanAccent, size: 20),
                SizedBox(width: 8),
                Text("Tìm người dùng để nhắn tin", style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
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
                      hintText: "Nhập Số điện thoại hoặc Email...",
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
                      constraints: const BoxConstraints(maxHeight: 200),
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
                                backgroundColor: AppTheme.cyanAccent,
                                foregroundColor: Colors.black,
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              ),
                              onPressed: () {
                                Navigator.of(dlgCtx).pop();
                                final draftConv = ConversationItem(
                                  id: 'draft_${u['id']}',
                                  type: 'DIRECT',
                                  title: u['fullName'] ?? 'Người dùng Austec',
                                  avatarUrl: u['avatarUrl'],
                                  isDraft: true,
                                  draftTargetUserId: u['id'].toString(),
                                );
                                _openChatRoom(draftConv);
                              },
                              child: const Text("Nhắn tin", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
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

  void _openCreateGroupDialog() {
    final titleCtrl = TextEditingController();
    final searchCtrl = TextEditingController();
    List<Map<String, dynamic>> searchResults = [];
    final List<Map<String, dynamic>> selectedMembers = [];
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
                Icon(Icons.group_add_rounded, color: AppTheme.purpleAccent, size: 20),
                SizedBox(width: 8),
                Text("Tạo nhóm trò chuyện mới", style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
              ],
            ),
            content: SizedBox(
              width: 320,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      controller: titleCtrl,
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                      decoration: InputDecoration(
                        hintText: "Đặt tên nhóm (VD: Gia đình, Kỹ thuật công trình...)",
                        hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                        filled: true,
                        fillColor: Colors.black38,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Thành viên đã chọn
                    if (selectedMembers.isNotEmpty) ...[
                      const Text("Đã chọn:", style: TextStyle(color: AppTheme.textSecondary, fontSize: 10.5, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: selectedMembers.map((m) {
                          return Chip(
                            backgroundColor: AppTheme.purpleAccent.withValues(alpha: 0.2),
                            side: const BorderSide(color: AppTheme.purpleAccent),
                            padding: EdgeInsets.zero,
                            label: Text(m['fullName'] ?? '', style: const TextStyle(color: Colors.white, fontSize: 10)),
                            deleteIcon: const Icon(Icons.close, size: 12, color: Colors.white70),
                            onDeleted: () {
                              setDlgState(() => selectedMembers.remove(m));
                            },
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 10),
                    ],

                    // Tìm kiếm để thêm thành viên
                    TextField(
                      controller: searchCtrl,
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                      decoration: InputDecoration(
                        hintText: "Tìm thành viên theo SĐT hoặc Email...",
                        hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.search, color: AppTheme.purpleAccent),
                          onPressed: () => doSearch(searchCtrl.text),
                        ),
                        filled: true,
                        fillColor: Colors.black38,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                      ),
                      onSubmitted: doSearch,
                    ),
                    const SizedBox(height: 8),

                    if (searching)
                      const Center(child: Padding(padding: EdgeInsets.all(8), child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.purpleAccent)))
                    else ...[
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxHeight: 140),
                        child: ListView.builder(
                          shrinkWrap: true,
                          itemCount: searchResults.length,
                          itemBuilder: (c, i) {
                            final u = searchResults[i];
                            final isAdded = selectedMembers.any((m) => m['id'] == u['id']);
                            return ListTile(
                              dense: true,
                              contentPadding: EdgeInsets.zero,
                              title: Text(u['fullName'] ?? '', style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                              subtitle: Text(u['phoneNumber'] ?? u['email'] ?? '', style: const TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                              trailing: IconButton(
                                icon: Icon(
                                  isAdded ? Icons.check_circle : Icons.add_circle_outline,
                                  color: isAdded ? AppTheme.cyanAccent : AppTheme.purpleAccent,
                                  size: 20,
                                ),
                                onPressed: () {
                                  setDlgState(() {
                                    if (isAdded) {
                                      selectedMembers.removeWhere((m) => m['id'] == u['id']);
                                    } else {
                                      selectedMembers.add(u);
                                    }
                                  });
                                },
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dlgCtx).pop(),
                child: const Text("Hủy", style: TextStyle(color: Colors.white60)),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.purpleAccent,
                  foregroundColor: Colors.white,
                ),
                onPressed: () async {
                  final title = titleCtrl.text.trim();
                  if (title.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Vui lòng đặt tên cho nhóm!")));
                    return;
                  }
                  if (selectedMembers.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Vui lòng chọn ít nhất 1 thành viên!")));
                    return;
                  }

                  final memberIds = selectedMembers.map((m) => m['id'].toString()).toList();
                  final convId = await _chatService.createGroupChat(title, memberIds);
                  if (context.mounted && convId != null) {
                    Navigator.of(dlgCtx).pop();
                    final conv = await _chatService.fetchConversationById(convId);
                    if (conv != null && mounted) {
                      _openChatRoom(conv);
                    }
                  }
                },
                child: const Text("Tạo nhóm", style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Tách riêng CSKH conversation và danh sách các cuộc trò chuyện khác
    final cskhConv = _conversations.firstWhere(
      (c) => c.isCskh,
      orElse: () => ConversationItem(
        id: 'cskh-conv-${AuthService().currentUser?.id ?? "usr-default"}',
        type: 'CSKH',
        title: 'Hỗ trợ Kỹ thuật & CSKH Austec 24/7',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        lastMessage: 'Dạ em chào Quý khách! Kỹ thuật viên Austec đã sẵn sàng hỗ trợ trực tuyến 24/7.',
      ),
    );

    final otherConversations = _conversations.where((c) => !c.isCskh).toList();

    return Scaffold(
      backgroundColor: const Color(0xFF0B132B),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadConversations,
          color: AppTheme.cyanAccent,
          backgroundColor: const Color(0xFF0F172A),
          child: CustomScrollView(
            slivers: [
              // 1. TOP HEADER & CÔNG CỤ TÌM KIẾM
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
                                "Tin Nhắn & Liên Lạc",
                                style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                              ),
                              Text(
                                "Hỗ trợ kỹ thuật 1-1, chat người dùng & nhóm riêng",
                                style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: AppTheme.cyanGradient,
                            ),
                            child: const Icon(Icons.forum_rounded, color: Colors.white, size: 20),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // NÚT TẠO NHÓM MỚI VÀ NHẮN TIN 1-1
                      Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: _openNewDirectChatDialog,
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 10),
                                decoration: BoxDecoration(
                                  color: AppTheme.surfaceGlass,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.6)),
                                ),
                                child: const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.person_add_rounded, color: AppTheme.cyanAccent, size: 16),
                                    SizedBox(width: 6),
                                    Text("Nhắn tin mới", style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: InkWell(
                              onTap: _openCreateGroupDialog,
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 10),
                                decoration: BoxDecoration(
                                  color: AppTheme.surfaceGlass,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: AppTheme.purpleAccent.withValues(alpha: 0.6)),
                                ),
                                child: const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.group_add_rounded, color: AppTheme.purpleAccent, size: 16),
                                    SizedBox(width: 6),
                                    Text("Tạo nhóm mới", style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // 2. KHỐI CSKH GHIM ĐẦU (PINNED CONVERSATION)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  child: InkWell(
                    onTap: () => _openCskhChat(),
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            const Color(0xFF1E1B4B).withValues(alpha: 0.8),
                            const Color(0xFF0F172A),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.purpleAccent.withValues(alpha: 0.7), width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.purpleAccent.withValues(alpha: 0.25),
                            blurRadius: 14,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: AppTheme.purpleGradient,
                              border: Border.all(color: Colors.white, width: 1.5),
                            ),
                            child: const Icon(Icons.support_agent_rounded, color: Colors.white, size: 28),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Text(
                                      "Hỗ trợ Kỹ thuật & CSKH Austec",
                                      style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                                    ),
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                      decoration: BoxDecoration(
                                        color: AppTheme.cyanAccent.withValues(alpha: 0.2),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Text("24/7", style: TextStyle(color: AppTheme.cyanAccent, fontSize: 8.5, fontWeight: FontWeight.bold)),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  cskhConv.lastMessage ?? "Kỹ thuật viên Austec sẵn sàng hỗ trợ trực tuyến",
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.arrow_forward_ios_rounded, color: AppTheme.purpleAccent, size: 16),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

              // 3. TIÊU ĐỀ DANH SÁCH CUỘC HỘI THOẠI
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.fromLTRB(16, 18, 16, 6),
                  child: Text(
                    "CUỘC TRÒ CHUYỆN GẦN ĐÂY",
                    style: TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
              ),

              // 4. DANH SÁCH CÁC CUỘC TRÒ CHUYỆN
              if (_isLoading)
                const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.cyanAccent)),
                )
              else if (otherConversations.isEmpty)
                SliverToBoxAdapter(
                  child: Container(
                    margin: const EdgeInsets.all(24),
                    padding: const EdgeInsets.all(20),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceGlass,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.cardBorder),
                    ),
                    child: const Column(
                      children: [
                        Icon(Icons.chat_bubble_outline_rounded, color: Colors.white24, size: 40),
                        SizedBox(height: 10),
                        Text(
                          "Chưa có cuộc trò chuyện riêng nào",
                          style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                        SizedBox(height: 4),
                        Text(
                          "Nhấn 'Nhắn tin mới' hoặc 'Tạo nhóm mới' ở trên để kết nối bạn bè & đồng nghiệp!",
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                )
              else
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final item = otherConversations[index];
                      return _buildConversationTile(item);
                    },
                    childCount: otherConversations.length,
                  ),
                ),

              const SliverToBoxAdapter(child: SizedBox(height: 80)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildConversationTile(ConversationItem item) {
    final isGroup = item.isGroup;
    final title = item.title;
    final initial = title.isNotEmpty ? title[0].toUpperCase() : 'U';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.surfaceGlass,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.cardBorder),
      ),
      child: ListTile(
        onTap: () => _openChatRoom(item),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: isGroup ? AppTheme.purpleGradient : AppTheme.cyanGradient,
            border: Border.all(
              color: isGroup ? AppTheme.purpleAccent : AppTheme.cyanAccent,
              width: 1.2,
            ),
          ),
          child: Center(
            child: isGroup
                ? const Icon(Icons.group_rounded, color: Colors.white, size: 22)
                : Text(
                    initial,
                    style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
          ),
        ),
        title: Row(
          children: [
            Expanded(
              child: Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
              ),
            ),
            if (isGroup) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppTheme.purpleAccent.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.purpleAccent.withValues(alpha: 0.4)),
                ),
                child: Text(
                  "${item.memberCount} TV",
                  style: const TextStyle(color: AppTheme.purpleAccent, fontSize: 9, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ],
        ),
        subtitle: Text(
          item.lastMessage ?? "Bắt đầu cuộc trò chuyện...",
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
        ),
        trailing: Text(
          item.timeFormatted,
          style: const TextStyle(color: AppTheme.textMuted, fontSize: 10),
        ),
      ),
    );
  }
}
