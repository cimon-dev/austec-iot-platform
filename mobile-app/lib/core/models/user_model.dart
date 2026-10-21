class UserModel {
  final String id;
  final String fullName;
  final String email;
  final String phoneNumber;
  final String address;
  final String province;
  final String role;
  final String token;

  const UserModel({
    required this.id,
    required this.fullName,
    required this.email,
    required this.phoneNumber,
    this.address = '',
    this.province = 'Hà Nội',
    this.role = 'CUSTOMER',
    required this.token,
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
      token: token ?? json['token']?.toString() ?? '',
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
    'token': token,
  };
}
