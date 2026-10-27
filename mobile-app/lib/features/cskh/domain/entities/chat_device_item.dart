class ChatDeviceItem {
  final bool isOwned;
  final String? hardwareId;
  final String deviceName;
  final String modelName;
  final String categoryTag;
  final Map<String, String>? specs;
  final String? imageUrl;
  final int? price;

  ChatDeviceItem({
    required this.isOwned,
    this.hardwareId,
    required this.deviceName,
    required this.modelName,
    required this.categoryTag,
    this.specs,
    this.imageUrl,
    this.price,
  });

  Map<String, dynamic> toJson() => {
    'isOwned': isOwned,
    'hardwareId': hardwareId,
    'deviceName': deviceName,
    'modelName': modelName,
    'categoryTag': categoryTag,
    'specs': specs,
    'imageUrl': imageUrl,
    'price': price,
  };

  factory ChatDeviceItem.fromJson(Map<String, dynamic> json) => ChatDeviceItem(
    isOwned: json['isOwned'] == true,
    hardwareId: json['hardwareId']?.toString(),
    deviceName: (json['deviceName'] ?? json['modelName'] ?? 'Thiết bị Austec').toString(),
    modelName: (json['modelName'] ?? 'Austec Device').toString(),
    categoryTag: (json['categoryTag'] ?? 'SMART HOME').toString(),
    specs: json['specs'] is Map ? Map<String, String>.from(json['specs']) : null,
    imageUrl: json['imageUrl']?.toString(),
    price: json['price'] is num ? (json['price'] as num).toInt() : null,
  );
}
