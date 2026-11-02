import 'dart:async';
import 'dart:convert';
import 'dart:js_interop';
import 'package:http/http.dart' as http;
import 'device_location_service_stub.dart';
export 'device_location_service_stub.dart';

@JS('austecLocation')
external AustecLocation? get austecLocation;

@JS()
extension type AustecLocation(JSObject _) implements JSObject {
  external bool isSupported();
  external JSPromise<JSString> getCurrentPosition();
}

/// Lấy tọa độ GPS chính xác trực tiếp từ điện thoại / trình duyệt người dùng
Future<DeviceCoordinates?> getDeviceCoordinates() async {
  try {
    final locObj = austecLocation;
    if (locObj != null && locObj.isSupported()) {
      final jsString = await locObj.getCurrentPosition().toDart;
      final parsed = jsonDecode(jsString.toDart) as Map<String, dynamic>;
      if (parsed['success'] == true) {
        final lat = (parsed['lat'] as num?)?.toDouble();
        final lng = (parsed['lng'] as num?)?.toDouble();
        if (lat != null && lng != null) {
          // Reverse geocoding qua OpenStreetMap Nominatim từ tọa độ GPS thực
          String? address;
          try {
            final geoRes = await http.get(
              Uri.parse('https://nominatim.openstreetmap.org/reverse?format=json&lat=$lat&lon=$lng&zoom=18&addressdetails=1'),
              headers: {'User-Agent': 'AustecIoT/2.0'},
            ).timeout(const Duration(seconds: 3));
            if (geoRes.statusCode == 200) {
              final geoData = jsonDecode(utf8.decode(geoRes.bodyBytes));
              final displayName = geoData['display_name']?.toString();
              if (displayName != null && displayName.isNotEmpty) {
                // Rút gọn địa chỉ hiển thị gọn gàng
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
      }
    }
  } catch (_) {}

  // Fallback: Lấy vị trí từ mạng IP của chính thiết bị người dùng (Client-side, không qua Server BE)
  try {
    final res = await http.get(Uri.parse('https://freeipapi.com/api/json')).timeout(const Duration(seconds: 4));
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      final lat = (data['latitude'] as num?)?.toDouble();
      final lng = (data['longitude'] as num?)?.toDouble();
      final city = data['cityName']?.toString();
      if (lat != null && lng != null) {
        return DeviceCoordinates(
          lat: lat,
          lng: lng,
          address: (city != null && city.isNotEmpty) ? "$city, Việt Nam" : null,
          isGpsHardware: false,
        );
      }
    }
  } catch (_) {}

  return null;
}
