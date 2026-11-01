import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/services/auth_service.dart';
import '../../cskh/domain/entities/chat_device_item.dart';
import '../models/conversation_item.dart';
import '../models/chat_message_model.dart';
import '../models/chat_attachment.dart';
import '../services/chat_service.dart';
import '../widgets/chat_bubble.dart';
import '../widgets/attachment_sheet.dart';

class ChatRoomScreen extends StatefulWidget {
  final ConversationItem conversation;
  final ChatDeviceItem? initialDevice;
  final String? initialPrompt;

  const ChatRoomScreen({
    super.key,
    required this.conversation,
    this.initialDevice,
    this.initialPrompt,
  });

  @override
  State<ChatRoomScreen> createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends State<ChatRoomScreen> {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final ChatService _chatService = ChatService();

  late ConversationItem _conversation;
  final List<ChatMessageModel> _messages = [];
  final List<ChatAttachment> _pendingAttachments = [];

  bool _isLoading = true;
  bool _isWsConnected = false;
  ChatDeviceItem? _selectedDevice;

  @override
  void initState() {
    super.initState();
    _conversation = widget.conversation;
    _selectedDevice = widget.initialDevice;

    if (widget.initialPrompt != null && widget.initialPrompt!.isNotEmpty) {
      _textController.text = widget.initialPrompt!;
    }

    // 1. Nạp lịch sử tin nhắn từ REST API
    _loadMessageHistory();

    // 2. KHỞI TẠO WEBSOCKET VÀ VÀO PHÒNG CHAT (CHỈ KHI VÀO MÀN HÌNH NÀY)
    _initWebSocketRoom();
  }

  void _initWebSocketRoom() {
    _chatService.connectToConversation(
      _conversation.id,
      onMessageReceived: (incoming) {
        if (!mounted) return;
        setState(() {
          _addOrUpdateMessage(incoming);
        });
        _scrollToBottom();
      },
      onMessageAck: (ack) {
        if (!mounted) return;
        setState(() {
          _addOrUpdateMessage(ack);
        });
      },
      onStatusChanged: (connected) {
        if (mounted) setState(() => _isWsConnected = connected);
      },
    );
  }

  Future<void> _loadMessageHistory() async {
    final msgs = await _chatService.fetchMessages(_conversation.id);
    if (!mounted) return;

    setState(() {
      _messages.clear();
      for (final m in msgs) {
        _addOrUpdateMessage(m);
      }
      _isLoading = false;
    });
    _scrollToBottom();
  }

  // Deduplication chuẩn hóa theo ID hoặc clientTempId
  void _addOrUpdateMessage(ChatMessageModel msg) {
    final idx = _messages.indexWhere((existing) {
      if (existing.id != null && msg.id != null && existing.id.toString() == msg.id.toString()) {
        return true;
      }
      if (existing.clientTempId != null &&
          msg.clientTempId != null &&
          existing.clientTempId == msg.clientTempId) {
        return true;
      }
      return false;
    });

    if (idx >= 0) {
      _messages[idx] = msg;
    } else {
      _messages.add(msg);
    }
  }

  @override
  void dispose() {
    // THOÁT KHỎI PHÒNG VÀ ĐÓNG SOCKET KHI RỜI MÀN HÌNH CHAT
    _chatService.disconnect();
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _handleSendMessage() {
    final text = _textController.text.trim();
    if (text.isEmpty && _pendingAttachments.isEmpty) return;

    final user = AuthService().currentUser;
    final currentUserId = user?.id ?? '00000000-0000-0000-0000-000000000001';
    final tempId = 'temp_${DateTime.now().millisecondsSinceEpoch}_${(1000 + (DateTime.now().microsecond % 9000))}';
    final attachmentsToSend = List<ChatAttachment>.from(_pendingAttachments);

    final optimisticMsg = ChatMessageModel(
      id: tempId,
      conversationId: _conversation.id,
      senderId: currentUserId,
      senderRole: user?.role ?? 'CUSTOMER',
      senderName: user?.fullName ?? 'Tôi',
      messageType: attachmentsToSend.isNotEmpty
          ? (attachmentsToSend[0].mediaType == 'video'
              ? 'VIDEO'
              : attachmentsToSend[0].mediaType == 'file'
                  ? 'FILE'
                  : 'IMAGE')
          : 'TEXT',
      content: text,
      attachments: attachmentsToSend,
      clientTempId: tempId,
      metadata: _selectedDevice != null ? {'selectedDevice': _selectedDevice!.toJson()} : {},
      createdAt: DateTime.now().toIso8601String(),
      isSending: true,
      isMe: true,
    );

    setState(() {
      _messages.add(optimisticMsg);
      _textController.clear();
      _pendingAttachments.clear();
    });
    _scrollToBottom();

    _chatService.sendChatMessage(
      conversationId: _conversation.id,
      content: text,
      clientTempId: tempId,
      messageType: optimisticMsg.messageType,
      attachments: attachmentsToSend,
      metadata: optimisticMsg.metadata,
    );
  }

  void _openAttachmentSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => AttachmentSelectionSheet(
        showTelemetryOption: _conversation.isCskh,
        onAttachmentSelected: (att) {
          setState(() {
            _pendingAttachments.add(att);
          });
        },
        onAttachTelemetry: _attachDeviceTelemetry,
      ),
    );
  }

  void _attachDeviceTelemetry() {
    final dev = _selectedDevice;
    final user = AuthService().currentUser;
    final currentUserId = user?.id ?? '00000000-0000-0000-0000-000000000001';
    final tempId = 'temp_${DateTime.now().millisecondsSinceEpoch}_snap';

    final snapshotMsg = ChatMessageModel(
      id: tempId,
      conversationId: _conversation.id,
      senderId: currentUserId,
      senderRole: 'CUSTOMER',
      senderName: user?.fullName ?? 'Tôi',
      messageType: 'DEVICE_SNAPSHOT',
      content: 'Kèm thông số viễn thám thiết bị từ xa',
      clientTempId: tempId,
      metadata: {
        'hardwareId': dev?.hardwareId ?? 'AT-DOOR-88239A01',
        'model': dev?.modelName ?? 'Cửa cuốn Titadoor A900 Super',
        'isOnline': true,
        'signal': '-65 dBm',
      },
      createdAt: DateTime.now().toIso8601String(),
      isSending: true,
      isMe: true,
    );

    setState(() {
      _messages.add(snapshotMsg);
    });
    _scrollToBottom();

    _chatService.sendChatMessage(
      conversationId: _conversation.id,
      content: snapshotMsg.content,
      clientTempId: tempId,
      messageType: 'DEVICE_SNAPSHOT',
      metadata: snapshotMsg.metadata,
    );
  }

  void _openGroupDetails() async {
    final fullConv = await _chatService.fetchConversationById(_conversation.id);
    if (!mounted) return;
    final conv = fullConv ?? _conversation;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => _buildGroupDetailsSheet(ctx, conv),
    );
  }

  Widget _buildGroupDetailsSheet(BuildContext ctx, ConversationItem conv) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: AppTheme.cardBorder)),
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.group_rounded, color: AppTheme.cyanAccent, size: 22),
                  const SizedBox(width: 8),
                  Text(
                    conv.title,
                    style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close, color: Colors.white60, size: 20),
                onPressed: () => Navigator.of(ctx).pop(),
              ),
            ],
          ),
          Text(
            "${conv.memberCount} thành viên trong nhóm",
            style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
          ),
          const SizedBox(height: 12),

          // Nút thêm thành viên
          ElevatedButton.icon(
            onPressed: () {
              Navigator.of(ctx).pop();
              _openAddMembersDialog();
            },
            icon: const Icon(Icons.person_add_alt_1_rounded, size: 18),
            label: const Text("Thêm thành viên theo SĐT / Email"),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.cyanAccent.withValues(alpha: 0.2),
              foregroundColor: AppTheme.cyanAccent,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
                side: const BorderSide(color: AppTheme.cyanAccent),
              ),
            ),
          ),
          const SizedBox(height: 12),

          const Text("DANH SÁCH THÀNH VIÊN:", style: TextStyle(color: AppTheme.textSecondary, fontSize: 11, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),

          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 220),
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: conv.participants.length,
              itemBuilder: (context, i) {
                final p = conv.participants[i];
                final isAdmin = p.chatRole == 'ADMIN';
                return Container(
                  margin: const EdgeInsets.only(bottom: 6),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceGlass,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.cardBorder),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 14,
                        backgroundColor: isAdmin ? AppTheme.purpleAccent : AppTheme.cyanAccent,
                        child: Text(
                          p.fullName.isNotEmpty ? p.fullName[0].toUpperCase() : 'U',
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(p.fullName, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                            Text(p.phoneNumber ?? p.email, style: const TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                          ],
                        ),
                      ),
                      if (isAdmin) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.purpleAccent.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: AppTheme.purpleAccent.withValues(alpha: 0.5)),
                          ),
                          child: const Text("Trưởng nhóm", style: TextStyle(color: AppTheme.purpleAccent, fontSize: 9.5, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 12),

          // Nút Rời Nhóm
          OutlinedButton.icon(
            onPressed: () async {
              final user = AuthService().currentUser;
              if (user != null) {
                await _chatService.removeGroupMember(_conversation.id, user.id);
                if (mounted) {
                  Navigator.of(ctx).pop();
                  Navigator.of(context).pop();
                }
              }
            },
            icon: const Icon(Icons.exit_to_app_rounded, color: AppTheme.roseDanger, size: 18),
            label: const Text("Rời khỏi nhóm", style: TextStyle(color: AppTheme.roseDanger)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppTheme.roseDanger),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
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
            title: const Text("Thêm thành viên vào nhóm", style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
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
                      hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
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
                                backgroundColor: AppTheme.cyanAccent,
                                foregroundColor: Colors.black,
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              ),
                              onPressed: () async {
                                await _chatService.addGroupMembers(_conversation.id, [u['id'].toString()]);
                                if (context.mounted) {
                                  Navigator.of(dlgCtx).pop();
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B132B),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        titleSpacing: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 18),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: InkWell(
          onTap: _conversation.isGroup ? _openGroupDetails : null,
          child: Row(
            children: [
              _buildAppBarAvatar(),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _conversation.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.white, fontSize: 13.5, fontWeight: FontWeight.bold),
                    ),
                    Row(
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _isWsConnected ? AppTheme.cyanAccent : Colors.orange,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _isWsConnected ? (_conversation.isGroup ? "${_conversation.memberCount} thành viên" : "Trực tuyến 24/7") : "Đang kết nối...",
                          style: TextStyle(
                            color: _isWsConnected ? AppTheme.cyanAccent : Colors.orange,
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          if (_conversation.isGroup)
            IconButton(
              icon: const Icon(Icons.info_outline_rounded, color: Colors.white70, size: 22),
              tooltip: "Chi tiết nhóm",
              onPressed: _openGroupDetails,
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Message List
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.cyanAccent),
                    )
                  : _messages.isEmpty
                      ? _buildEmptyState()
                      : ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          itemCount: _messages.length,
                          itemBuilder: (context, index) {
                            return ChatBubble(message: _messages[index]);
                          },
                        ),
            ),

            // Pending Attachments Preview
            if (_pendingAttachments.isNotEmpty) _buildPendingAttachmentsBar(),

            // Chat Input Bar
            _buildInputBar(),
          ],
        ),
      ),
    );
  }

  Widget _buildAppBarAvatar() {
    if (_conversation.isCskh) {
      return Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: AppTheme.purpleGradient,
          border: Border.all(color: AppTheme.purpleAccent, width: 1.5),
        ),
        child: const Icon(Icons.support_agent_rounded, color: Colors.white, size: 20),
      );
    }

    if (_conversation.isGroup) {
      return Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: AppTheme.cyanGradient,
          border: Border.all(color: AppTheme.cyanAccent, width: 1.5),
        ),
        child: const Icon(Icons.group_rounded, color: Colors.white, size: 20),
      );
    }

    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: AppTheme.cyanGradient,
        border: Border.all(color: AppTheme.cyanAccent, width: 1.5),
      ),
      child: Center(
        child: Text(
          _conversation.title.isNotEmpty ? _conversation.title[0].toUpperCase() : 'U',
          style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _conversation.isCskh ? Icons.support_agent_rounded : Icons.forum_outlined,
            color: Colors.white24,
            size: 54,
          ),
          const SizedBox(height: 12),
          Text(
            _conversation.isCskh
                ? "Kết nối trực tiếp Kỹ thuật viên & CSKH Austec"
                : "Bắt đầu cuộc trò chuyện ngay bây giờ",
            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildPendingAttachmentsBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      color: Colors.black45,
      child: Row(
        children: [
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _pendingAttachments.map((att) {
                  return Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceGlass,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppTheme.cyanAccent.withValues(alpha: 0.5)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          att.mediaType == 'image'
                              ? Icons.image
                              : att.mediaType == 'video'
                                  ? Icons.videocam
                                  : Icons.insert_drive_file,
                          color: AppTheme.cyanAccent,
                          size: 14,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          att.name,
                          style: const TextStyle(color: Colors.white, fontSize: 10),
                        ),
                        const SizedBox(width: 4),
                        InkWell(
                          onTap: () => setState(() => _pendingAttachments.remove(att)),
                          child: const Icon(Icons.close, color: Colors.white60, size: 14),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        border: Border(top: BorderSide(color: AppTheme.cardBorder)),
      ),
      child: Row(
        children: [
          // Nút đính kèm ảnh, video, file
          IconButton(
            icon: const Icon(Icons.add_circle_outline_rounded, color: AppTheme.cyanAccent, size: 24),
            tooltip: "Đính kèm tệp / ảnh / video",
            onPressed: _openAttachmentSheet,
          ),

          // Ô nhập nội dung
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
              ),
              child: TextField(
                controller: _textController,
                maxLines: null,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: const InputDecoration(
                  hintText: "Nhập tin nhắn...",
                  hintStyle: TextStyle(color: AppTheme.textMuted, fontSize: 12.5),
                  border: InputBorder.none,
                  isDense: true,
                  contentPadding: EdgeInsets.symmetric(vertical: 10),
                ),
                onSubmitted: (_) => _handleSendMessage(),
              ),
            ),
          ),
          const SizedBox(width: 6),

          // Nút Gửi
          InkWell(
            onTap: _handleSendMessage,
            borderRadius: BorderRadius.circular(20),
            child: Container(
              width: 38,
              height: 38,
              decoration: const BoxDecoration(
                gradient: AppTheme.cyanGradient,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
            ),
          ),
        ],
      ),
    );
  }
}
