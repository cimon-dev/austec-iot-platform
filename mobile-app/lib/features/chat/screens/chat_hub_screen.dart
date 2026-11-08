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
        title: 'HỖ TRỢ KỸ THUẬT & CSKH AUSTEC 24/7',
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

    final isDark = AppTheme.isDarkMode;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final subTextCol = isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary;
    final cardBg = isDark ? AppTheme.surfaceDark : Colors.white;
    final cardBorder = isDark ? AppTheme.cardBorder : AppTheme.lightBorder;

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
            backgroundColor: cardBg,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: cardBorder),
            ),
            title: Row(
              children: [
                Icon(Icons.person_search_rounded, color: textCol, size: 20),
                const SizedBox(width: 8),
                Text("Tìm người dùng để nhắn tin", style: TextStyle(color: textCol, fontSize: 14, fontWeight: FontWeight.bold)),
              ],
            ),
            content: SizedBox(
              width: 320,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: searchCtrl,
                    style: TextStyle(color: textCol, fontSize: 12),
                    decoration: InputDecoration(
                      hintText: "Nhập Số điện thoại hoặc Email...",
                      hintStyle: TextStyle(color: subTextCol, fontSize: 11.5),
                      suffixIcon: IconButton(
                        icon: Icon(Icons.search, color: textCol),
                        onPressed: () => doSearch(searchCtrl.text),
                      ),
                      filled: true,
                      fillColor: isDark ? const Color(0xFF1E2024) : const Color(0xFFF4F4F5),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: cardBorder)),
                    ),
                    onSubmitted: doSearch,
                  ),
                  const SizedBox(height: 10),
                  if (searching)
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: CircularProgressIndicator(strokeWidth: 2, color: textCol),
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
                            title: Text(u['fullName'] ?? '', style: TextStyle(color: textCol, fontSize: 12, fontWeight: FontWeight.bold)),
                            subtitle: Text(u['phoneNumber'] ?? u['email'] ?? '', style: TextStyle(color: subTextCol, fontSize: 10.5)),
                            trailing: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.brandBlue,
                                foregroundColor: Colors.white,
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

    final isDark = AppTheme.isDarkMode;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final subTextCol = isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary;
    final cardBg = isDark ? AppTheme.surfaceDark : Colors.white;
    final cardBorder = isDark ? AppTheme.cardBorder : AppTheme.lightBorder;

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
            backgroundColor: cardBg,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: cardBorder),
            ),
            title: Row(
              children: [
                Icon(Icons.group_add_rounded, color: textCol, size: 20),
                const SizedBox(width: 8),
                Text("Tạo nhóm trò chuyện mới", style: TextStyle(color: textCol, fontSize: 14, fontWeight: FontWeight.bold)),
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
                      style: TextStyle(color: textCol, fontSize: 12),
                      decoration: InputDecoration(
                        hintText: "Đặt tên nhóm (VD: Gia đình, Kỹ thuật công trình...)",
                        hintStyle: TextStyle(color: subTextCol, fontSize: 11),
                        filled: true,
                        fillColor: isDark ? const Color(0xFF1E2024) : const Color(0xFFF4F4F5),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: cardBorder)),
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Thành viên đã chọn
                    if (selectedMembers.isNotEmpty) ...[
                      Text("Đã chọn:", style: TextStyle(color: subTextCol, fontSize: 10.5, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: selectedMembers.map((m) {
                          return Chip(
                            backgroundColor: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
                            side: BorderSide(color: cardBorder),
                            padding: EdgeInsets.zero,
                            label: Text(m['fullName'] ?? '', style: TextStyle(color: textCol, fontSize: 10)),
                            deleteIcon: Icon(Icons.close, size: 12, color: subTextCol),
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
                      style: TextStyle(color: textCol, fontSize: 12),
                      decoration: InputDecoration(
                        hintText: "Tìm thành viên theo SĐT hoặc Email...",
                        hintStyle: TextStyle(color: subTextCol, fontSize: 11),
                        suffixIcon: IconButton(
                          icon: Icon(Icons.search, color: textCol),
                          onPressed: () => doSearch(searchCtrl.text),
                        ),
                        filled: true,
                        fillColor: isDark ? const Color(0xFF1E2024) : const Color(0xFFF4F4F5),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: cardBorder)),
                      ),
                      onSubmitted: doSearch,
                    ),
                    const SizedBox(height: 8),

                    if (searching)
                      Center(child: Padding(padding: const EdgeInsets.all(8), child: CircularProgressIndicator(strokeWidth: 2, color: textCol)))
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
                              title: Text(u['fullName'] ?? '', style: TextStyle(color: textCol, fontSize: 11.5, fontWeight: FontWeight.bold)),
                              subtitle: Text(u['phoneNumber'] ?? u['email'] ?? '', style: TextStyle(color: subTextCol, fontSize: 10)),
                              trailing: IconButton(
                                icon: Icon(
                                  isAdded ? Icons.check_circle : Icons.add_circle_outline,
                                  color: isAdded ? AppTheme.brandBlue : textCol,
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
                child: Text("Hủy", style: TextStyle(color: subTextCol)),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.brandBlue,
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
    final isDark = AppTheme.isDarkMode;
    final bgCol = isDark ? AppTheme.background : AppTheme.lightBackground;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final subTextCol = isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary;
    final cardBg = isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface;
    final cardBorder = isDark ? AppTheme.cardBorder : AppTheme.lightBorder;

    // Tách riêng CSKH conversation và danh sách các cuộc trò chuyện khác
    final cskhConv = _conversations.firstWhere(
      (c) => c.isCskh,
      orElse: () => ConversationItem(
        id: 'cskh-conv-${AuthService().currentUser?.id ?? "usr-default"}',
        type: 'CSKH',
        title: 'HỖ TRỢ KỸ THUẬT & CSKH AUSTEC 24/7',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        lastMessage: 'Dạ em chào Quý khách! Kỹ thuật viên Austec đã sẵn sàng hỗ trợ trực tuyến 24/7.',
      ),
    );

    final otherConversations = _conversations.where((c) => !c.isCskh).toList();

    return Scaffold(
      backgroundColor: bgCol,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadConversations,
          color: textCol,
          backgroundColor: cardBg,
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
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "Tin Nhắn & Liên Lạc",
                                style: TextStyle(color: textCol, fontSize: 18, fontWeight: FontWeight.bold),
                              ),
                              Text(
                                "Hỗ trợ kỹ thuật & nhóm trò chuyện",
                                style: TextStyle(color: subTextCol, fontSize: 11),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
                              border: Border.all(color: cardBorder),
                            ),
                            child: Icon(Icons.forum_rounded, color: textCol, size: 18),
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
                                  color: AppTheme.brandBlue,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.person_add_rounded, color: Colors.white, size: 16),
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
                                  color: AppTheme.brandBlue.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: AppTheme.brandBlue.withValues(alpha: 0.3)),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.group_add_rounded, color: AppTheme.brandBlue, size: 16),
                                    const SizedBox(width: 6),
                                    Text("Tạo nhóm mới", style: TextStyle(color: isDark ? const Color(0xFF60A5FA) : AppTheme.brandBlue, fontSize: 11.5, fontWeight: FontWeight.bold)),
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

              // 2. KHỐI CSKH GHIM ĐẦU (PINNED CONVERSATION MONOCHROME)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  child: InkWell(
                    onTap: () => _openCskhChat(),
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: cardBorder, width: 1.2),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                              border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                            ),
                            child: const Icon(Icons.support_agent_rounded, color: Color(0xFFF59E0B), size: 24),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      "HỖ TRỢ KỸ THUẬT & CSKH AUSTEC",
                                      style: TextStyle(color: textCol, fontSize: 13, fontWeight: FontWeight.bold),
                                    ),
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(4),
                                        border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                                      ),
                                      child: const Text("24/7", style: TextStyle(color: Color(0xFFF59E0B), fontSize: 8.5, fontWeight: FontWeight.bold)),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  cskhConv.lastMessage ?? "Kỹ thuật viên Austec sẵn sàng hỗ trợ trực tuyến",
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(color: subTextCol, fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                          Icon(Icons.arrow_forward_ios_rounded, color: subTextCol, size: 14),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

              // 3. TIÊU ĐỀ DANH SÁCH CUỘC HỘI THOẠI
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 18, 16, 6),
                  child: Text(
                    "CUỘC TRÒ CHUYỆN GẦN ĐÂY",
                    style: TextStyle(
                      color: subTextCol,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
              ),

              // 4. DANH SÁCH CÁC CUỘC TRÒ CHUYỆN
              if (_isLoading)
                SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator(strokeWidth: 2, color: textCol)),
                )
              else if (otherConversations.isEmpty)
                SliverToBoxAdapter(
                  child: Container(
                    margin: const EdgeInsets.all(24),
                    padding: const EdgeInsets.all(20),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: cardBorder),
                    ),
                    child: Column(
                      children: [
                        Icon(Icons.chat_bubble_outline_rounded, color: subTextCol, size: 40),
                        const SizedBox(height: 10),
                        Text(
                          "Chưa có cuộc trò chuyện riêng nào",
                          style: TextStyle(color: textCol, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          "Nhấn 'Nhắn tin mới' hoặc 'Tạo nhóm mới' ở trên để kết nối bạn bè & đồng nghiệp!",
                          textAlign: TextAlign.center,
                          style: TextStyle(color: subTextCol, fontSize: 11),
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
    final isDark = AppTheme.isDarkMode;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final subTextCol = isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary;
    final cardBg = isDark ? AppTheme.surfaceGlass : AppTheme.lightSurface;
    final cardBorder = isDark ? AppTheme.cardBorder : AppTheme.lightBorder;

    final isGroup = item.isGroup;
    final title = item.title;
    final initial = title.isNotEmpty ? title[0].toUpperCase() : 'U';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cardBorder),
      ),
      child: ListTile(
        onTap: () => _openChatRoom(item),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        leading: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
            border: Border.all(color: cardBorder),
          ),
          child: Center(
            child: isGroup
                ? Icon(Icons.group_rounded, color: textCol, size: 20)
                : Text(
                    initial,
                    style: TextStyle(color: textCol, fontSize: 15, fontWeight: FontWeight.bold),
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
                style: TextStyle(color: textCol, fontSize: 13, fontWeight: FontWeight.bold),
              ),
            ),
            if (isGroup) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  "${item.memberCount} TV",
                  style: TextStyle(color: subTextCol, fontSize: 9, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ],
        ),
        subtitle: Text(
          item.lastMessage ?? "Bắt đầu cuộc trò chuyện...",
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(color: subTextCol, fontSize: 11),
        ),
        trailing: Text(
          item.timeFormatted,
          style: TextStyle(color: subTextCol, fontSize: 10),
        ),
      ),
    );
  }
}
