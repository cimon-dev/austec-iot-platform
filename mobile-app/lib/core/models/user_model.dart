class UserModel {
  final String id;
  final String fullName;
  final String email;
  final String phoneNumber;
  final String address;
  final String province;
  final String role;
  final String? avatarUrl;
  final String token;
  final bool googleLinked;
  final bool hasPassword;
  final bool emailVerified;
  final bool phoneVerified;
  final String approvalStatus;

  const UserModel({
    required this.id,
    required this.fullName,
    required this.email,
    required this.phoneNumber,
    this.address = '',
    this.province = 'Hà Nội',
    this.role = 'CUSTOMER',
    this.avatarUrl,
    required this.token,
    this.googleLinked = false,
    this.hasPassword = true,
    this.emailVerified = false,
    this.phoneVerified = false,
    this.approvalStatus = 'APPROVED',
  });

  factory UserModel.fromJson(Map<String, dynamic> json, {String? token}) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? json['name']?.toString() ?? 'Khách Hàng Austec',
      email: json['email']?.toString() ?? '',
      phoneNumber: json['phoneNumber']?.toString() ?? json['phone']?.toString() ?? '',
      address: json['address']?.toString() ?? '',
      province: json['province']?.toString() ?? 'Hà Nội',
      role: json['role']?.toString() ?? 'CUSTOMER',
      avatarUrl: json['avatarUrl']?.toString() ?? json['avatar_url']?.toString(),
      token: token ?? json['token']?.toString() ?? '',
      googleLinked: json['googleLinked'] == true || json['google_id'] != null,
      hasPassword: json['hasPassword'] != false,
      emailVerified: json['emailVerified'] == true || json['email_verified'] == true,
      phoneVerified: json['phoneVerified'] == true || json['phone_verified'] == true,
      approvalStatus: json['approvalStatus']?.toString() ?? 'APPROVED',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'fullName': fullName,
    'email': email,
    'phoneNumber': phoneNumber,
    'address': address,
    'province': province,
    'role': role,
    'avatarUrl': avatarUrl,
    'token': token,
    'googleLinked': googleLinked,
    'hasPassword': hasPassword,
    'emailVerified': emailVerified,
    'phoneVerified': phoneVerified,
    'approvalStatus': approvalStatus,
  };

  UserModel copyWith({
    String? id,
    String? fullName,
    String? email,
    String? phoneNumber,
    String? address,
    String? province,
    String? role,
    String? avatarUrl,
    String? token,
    bool? googleLinked,
    bool? hasPassword,
    bool? emailVerified,
    bool? phoneVerified,
    String? approvalStatus,
  }) {
    return UserModel(
      id: id ?? this.id,
      fullName: fullName ?? this.fullName,
      email: email ?? this.email,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      address: address ?? this.address,
      province: province ?? this.province,
      role: role ?? this.role,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      token: token ?? this.token,
      googleLinked: googleLinked ?? this.googleLinked,
      hasPassword: hasPassword ?? this.hasPassword,
      emailVerified: emailVerified ?? this.emailVerified,
      phoneVerified: phoneVerified ?? this.phoneVerified,
      approvalStatus: approvalStatus ?? this.approvalStatus,
    );
  }
}
