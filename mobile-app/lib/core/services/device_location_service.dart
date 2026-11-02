import 'dart:async';
import 'dart:convert';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;

class DeviceCoordinates {
  final double lat;
  final double lng;
  final String? address;
  final bool isGpsHardware;

  DeviceCoordinates({
    required this.lat,
    required this.lng,
    this.address,
    this.isGpsHardware = true,
  });
}

/// Lấy tọa độ GPS chính xác trực tiếp từ điện thoại (iOS / Android / Web)
Future<DeviceCoordinates?> getDeviceCoordinates() async {
  // 1. Kiểm tra xem dịch vụ vị trí (GPS) trên thiết bị có đang bật không
  bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
  if (!serviceEnabled) {
    throw Exception('Dịch vụ định vị GPS trên điện thoại đang tắt. Vui lòng bật GPS trong Cài đặt thiết bị!');
  }

  // 2. Kiểm tra và yêu cầu quyền truy cập vị trí trên điện thoại
  LocationPermission permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
    if (permission == LocationPermission.denied) {
      throw Exception('Quyền truy cập vị trí GPS bị từ chối trên thiết bị!');
    }
  }

  if (permission == LocationPermission.deniedForever) {
    throw Exception('Quyền vị trí bị từ chối vĩnh viễn. Vui lòng vào Cài đặt ứng dụng trên điện thoại để cấp quyền Vị trí!');
  }

  // 3. Lấy vị trí GPS chính xác cao từ phần cứng điện thoại
  final position = await Geolocator.getCurrentPosition(
    locationSettings: const LocationSettings(
      accuracy: LocationAccuracy.high,
      timeLimit: Duration(seconds: 15),
    ),
  );

  final double lat = position.latitude;
  final double lng = position.longitude;

  // 4. Reverse geocoding để lấy tên địa chỉ chi tiết
  String? address;
  try {
    final geoRes = await http.get(
      Uri.parse('https://nominatim.openstreetmap.org/reverse?format=json&lat=$lat&lon=$lng&zoom=18&addressdetails=1'),
      headers: {'User-Agent': 'AustecIoT/2.0'},
    ).timeout(const Duration(seconds: 4));
    if (geoRes.statusCode == 200) {
      final geoData = jsonDecode(utf8.decode(geoRes.bodyBytes));
      final displayName = geoData['display_name']?.toString();
      if (displayName != null && displayName.isNotEmpty) {
        address = displayName;
      }
    }
  } catch (_) {}

  return DeviceCoordinates(
    lat: lat,
    lng: lng,
    address: address,
    isGpsHardware: true,
  );
}
