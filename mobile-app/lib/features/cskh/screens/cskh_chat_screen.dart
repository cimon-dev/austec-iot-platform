import 'package:flutter/material.dart';
import '../../../core/services/auth_service.dart';
import '../../chat/models/conversation_item.dart';
import '../../chat/screens/chat_room_screen.dart';
import '../domain/entities/chat_device_item.dart';

/// Màn hình Chat CSKH chuẩn hóa: Chuyển hướng trực tiếp vào ChatRoomScreen
/// của hệ thống Tin nhắn thực tế, đồng bộ 100% bong bóng chat nhiều dòng,
/// đính kèm camera, thư viện ảnh và thiết bị viễn thám.
class CskhChatScreen extends StatelessWidget {
  final ChatDeviceItem? initialDevice;
  final String? initialPrompt;

  const CskhChatScreen({
    super.key,
    this.initialDevice,
    this.initialPrompt,
  });

  @override
  Widget build(BuildContext context) {
    final cskhConv = ConversationItem(
      id: 'cskh-conv-${AuthService().currentUser?.id ?? "usr-default"}',
      type: 'CSKH',
      title: 'HỖ TRỢ KỸ THUẬT & CSKH AUSTEC 24/7',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      lastMessage: 'Dạ em chào Quý khách! Kỹ thuật viên Austec đã sẵn sàng hỗ trợ trực tuyến 24/7.',
    );

    return ChatRoomScreen(
      conversation: cskhConv,
      initialDevice: initialDevice,
      initialPrompt: initialPrompt,
    );
  }
}
