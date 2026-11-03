import 'package:flutter/material.dart';
import '../../../core/constants/app_theme.dart';
import '../../../core/services/auth_service.dart';
import '../../cskh/domain/entities/chat_device_item.dart';
import '../models/conversation_item.dart';
import '../models/chat_message_model.dart';
import '../models/chat_attachment.dart';
import '../services/chat_service.dart';
import 'package:image_picker/image_picker.dart';
import '../widgets/chat_bubble.dart';
import '../widgets/file_and_device_sheet.dart';
import 'chat_settings_screen.dart';

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

    // Nếu là cuộc trò chuyện nháp (chưa gửi tin nhắn nào), không nạp tin nhắn hay socket
    if (_conversation.isDraft) {
      _isLoading = false;
    } else {
      // 1. Nạp lịch sử tin nhắn từ REST API
      _loadMessageHistory();

      // 2. KHỞI TẠO WEBSOCKET VÀ VÀO PHÒNG CHAT (CHỈ KHI VÀO MÀN HÌNH NÀY)
      _initWebSocketRoom();
    }
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

  Future<void> _handleSendMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty && _pendingAttachments.isEmpty) return;

    // Nếu đang là phòng nháp (Lazy creation từ tìm kiếm), khởi tạo phòng thật trên backend ngay tại đây!
    if (_conversation.isDraft && _conversation.draftTargetUserId != null) {
      final realConvId = await _chatService.createDirectChat(_conversation.draftTargetUserId!);
      if (realConvId == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("Không thể khởi tạo cuộc trò chuyện, vui lòng thử lại sau!")),
          );
        }
        return;
      }

      _conversation = _conversation.copyWith(
        id: realConvId,
        isDraft: false,
      );
      _initWebSocketRoom();
    }

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

  Future<void> _pickFromPhotoGallery() async {
    try {
      final picker = ImagePicker();
      final List<XFile> images = await picker.pickMultiImage(
        imageQuality: 85,
        maxWidth: 2048,
        maxHeight: 2048,
      );
      if (images.isNotEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text("Đang tải ${images.length} hình ảnh lên..."),
              duration: const Duration(seconds: 2),
            ),
          );
        }
        for (final img in images) {
          final bytes = await img.readAsBytes();
          final att = await _chatService.uploadAttachment(bytes, img.name);
          if (att != null && mounted) {
            setState(() {
              _pendingAttachments.add(att);
            });
          }
        }
      }
    } catch (e) {
      debugPrint('[ChatRoomScreen] _pickFromPhotoGallery error: $e');
    }
  }

  void _openFileAndDeviceSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => FileAndDeviceSheet(
        onAttachmentSelected: (att) {
          setState(() {
            _pendingAttachments.add(att);
          });
        },
        onDeviceSelected: (device) {
          _sendDeviceConsultationMessage(device);
        },
      ),
    );
  }

  Future<void> _sendDeviceConsultationMessage(ChatDeviceItem dev) async {
    // Nếu là phòng nháp, khởi tạo phòng trước
    if (_conversation.isDraft && _conversation.draftTargetUserId != null) {
      final realConvId = await _chatService.createDirectChat(_conversation.draftTargetUserId!);
      if (realConvId == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("Không thể khởi tạo cuộc trò chuyện, vui lòng thử lại sau!")),
          );
        }
        return;
      }
      _conversation = _conversation.copyWith(
        id: realConvId,
        isDraft: false,
      );
      _initWebSocketRoom();
    }

    final user = AuthService().currentUser;
    final currentUserId = user?.id ?? '00000000-0000-0000-0000-000000000001';
    final tempId = 'temp_${DateTime.now().millisecondsSinceEpoch}_dev';
    final content = dev.isOwned
        ? "Yêu cầu hỗ trợ kỹ thuật về thiết bị đang dùng: ${dev.deviceName}"
        : "Quan tâm tư vấn báo giá & thông số thiết bị hệ thống: ${dev.deviceName}";

    final devMsg = ChatMessageModel(
      id: tempId,
      conversationId: _conversation.id,
      senderId: currentUserId,
      senderRole: user?.role ?? 'CUSTOMER',
      senderName: user?.fullName ?? 'Tôi',
      messageType: 'DEVICE_SNAPSHOT',
      content: content,
      clientTempId: tempId,
      metadata: {
        'hardwareId': dev.hardwareId,
        'model': dev.modelName,
        'deviceName': dev.deviceName,
        'isOwned': dev.isOwned,
        'price': dev.price,
        'specs': dev.specs,
        'categoryTag': dev.categoryTag,
        'imageUrl': dev.imageUrl,
      },
      createdAt: DateTime.now().toIso8601String(),
      isSending: true,
      isMe: true,
    );

    setState(() {
      _messages.add(devMsg);
    });
    _scrollToBottom();

    _chatService.sendChatMessage(
      conversationId: _conversation.id,
      content: devMsg.content,
      clientTempId: tempId,
      messageType: 'DEVICE_SNAPSHOT',
      metadata: devMsg.metadata,
    );
  }

  void _openChatSettings() async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => ChatSettingsScreen(
          conversation: _conversation,
          messages: _messages,
        ),
      ),
    );
    if (result == true && mounted) {
      // Nếu đã rời nhóm hoặc có thay đổi thoát phòng chat
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode;
    final bgCol = isDark ? AppTheme.background : AppTheme.lightBackground;
    final textCol = isDark ? Colors.white : AppTheme.lightTextPrimary;
    final subTextCol = isDark ? AppTheme.textSecondary : AppTheme.lightTextSecondary;
    final cardBg = isDark ? AppTheme.surfaceDark : Colors.white;
    final cardBorder = isDark ? AppTheme.cardBorder : AppTheme.lightBorder;

    return Scaffold(
      backgroundColor: bgCol,
      appBar: AppBar(
        backgroundColor: cardBg,
        elevation: 0,
        titleSpacing: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new, color: textCol, size: 18),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: InkWell(
          onTap: _openChatSettings,
          child: Row(
            children: [
              _buildAppBarAvatar(isDark, cardBorder, textCol),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _conversation.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: textCol, fontSize: 13.5, fontWeight: FontWeight.bold),
                    ),
                    Row(
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _isWsConnected ? AppTheme.emeraldSuccess : Colors.orange,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _isWsConnected ? (_conversation.isGroup ? "${_conversation.memberCount} thành viên" : "Trực tuyến 24/7") : "Đang kết nối...",
                          style: TextStyle(
                            color: _isWsConnected ? AppTheme.emeraldSuccess : Colors.orange,
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
          IconButton(
            icon: Icon(Icons.settings_outlined, color: textCol, size: 22),
            tooltip: "Cài đặt cuộc trò chuyện",
            onPressed: _openChatSettings,
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Message List
            Expanded(
              child: _isLoading
                  ? Center(
                      child: CircularProgressIndicator(strokeWidth: 2, color: textCol),
                    )
                  : _messages.isEmpty
                      ? _buildEmptyState(subTextCol)
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
            if (_pendingAttachments.isNotEmpty) _buildPendingAttachmentsBar(isDark, cardBg, cardBorder, textCol),

            // Chat Input Bar
            _buildInputBar(isDark, cardBg, cardBorder, textCol, subTextCol),
          ],
        ),
      ),
    );
  }

  Widget _buildAppBarAvatar(bool isDark, Color cardBorder, Color textCol) {
    if (_conversation.isCskh) {
      return Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
          border: Border.all(color: cardBorder, width: 1.2),
        ),
        child: Icon(Icons.support_agent_rounded, color: textCol, size: 20),
      );
    }

    if (_conversation.isGroup) {
      return Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
          border: Border.all(color: cardBorder, width: 1.2),
        ),
        child: Icon(Icons.group_rounded, color: textCol, size: 20),
      );
    }

    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
        border: Border.all(color: cardBorder, width: 1.2),
      ),
      child: Center(
        child: Text(
          _conversation.title.isNotEmpty ? _conversation.title[0].toUpperCase() : 'U',
          style: TextStyle(color: textCol, fontSize: 14, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  Widget _buildEmptyState(Color subTextCol) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _conversation.isCskh ? Icons.support_agent_rounded : Icons.forum_outlined,
            color: subTextCol.withValues(alpha: 0.3),
            size: 54,
          ),
          const SizedBox(height: 12),
          Text(
            _conversation.isCskh
                ? "Kết nối trực tiếp Kỹ thuật viên & CSKH Austec"
                : "Bắt đầu cuộc trò chuyện ngay bây giờ",
            style: TextStyle(color: subTextCol, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildPendingAttachmentsBar(bool isDark, Color cardBg, Color cardBorder, Color textCol) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      color: cardBg,
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
                      color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: cardBorder),
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
                          color: textCol,
                          size: 14,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          att.name,
                          style: TextStyle(color: textCol, fontSize: 10),
                        ),
                        const SizedBox(width: 4),
                        InkWell(
                          onTap: () => setState(() => _pendingAttachments.remove(att)),
                          child: Icon(Icons.close, color: textCol, size: 14),
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

  Widget _buildInputBar(bool isDark, Color cardBg, Color cardBorder, Color textCol, Color subTextCol) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: cardBg,
        border: Border(top: BorderSide(color: cardBorder)),
      ),
      child: Row(
        children: [
          // Nút 1: Mở trực tiếp kho ảnh người dùng (giống Messenger, Zalo)
          IconButton(
            icon: Icon(Icons.image_rounded, color: textCol, size: 24),
            tooltip: "Kho ảnh thiết bị",
            onPressed: _pickFromPhotoGallery,
          ),
          // Nút 2: Tệp tin & Hỏi tư vấn thiết bị hệ thống
          IconButton(
            icon: Icon(Icons.attach_file_rounded, color: textCol, size: 23),
            tooltip: "Gửi tệp / Hỏi tư vấn thiết bị",
            onPressed: _openFileAndDeviceSheet,
          ),

          // Ô nhập nội dung
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E2024) : const Color(0xFFF4F4F5),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: cardBorder),
              ),
              child: TextField(
                controller: _textController,
                maxLines: null,
                style: TextStyle(color: textCol, fontSize: 13),
                decoration: InputDecoration(
                  hintText: "Nhập tin nhắn...",
                  hintStyle: TextStyle(color: subTextCol, fontSize: 12.5),
                  border: InputBorder.none,
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(vertical: 10),
                ),
                onSubmitted: (_) => _handleSendMessage(),
              ),
            ),
          ),
          const SizedBox(width: 6),

          // Nút Gửi Tin Nhắn (Brand Blue)
          InkWell(
            onTap: _handleSendMessage,
            borderRadius: BorderRadius.circular(20),
            child: Container(
              width: 38,
              height: 38,
              decoration: const BoxDecoration(
                color: AppTheme.brandBlue,
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
