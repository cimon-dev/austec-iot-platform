import 'dart:convert';
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
    this.isGpsHardware = false,
  });
}

/// Fallback lấy vị trí từ thiết bị (không phụ thuộc máy chủ backend)
Future<DeviceCoordinates?> getDeviceCoordinates() async {
  try {
    final res = await http.get(Uri.parse('https://freeipapi.com/api/json')).timeout(const Duration(seconds: 4));
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      final lat = (data['latitude'] as num?)?.toDouble();
      final lng = (data['longitude'] as num?)?.toDouble();
      final city = data['cityName']?.toString();
      if (lat != null && lng != null) {
        String? fullAddr;
        if (city != null && city.isNotEmpty) {
          fullAddr = "$city, Việt Nam";
        }
        return DeviceCoordinates(
          lat: lat,
          lng: lng,
          address: fullAddr,
          isGpsHardware: false,
        );
      }
    }
  } catch (_) {}
  return null;
}
