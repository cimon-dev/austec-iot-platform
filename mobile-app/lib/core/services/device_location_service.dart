import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
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
/// Tự động xử lý an toàn không để bị lỗi MissingPluginException trên các bản build
Future<DeviceCoordinates?> getDeviceCoordinates() async {
  // 1. Thử dùng native Geolocator của điện thoại (iOS / Android / Web)
  try {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (serviceEnabled) {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.whileInUse || permission == LocationPermission.always) {
        final position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 6),
          ),
        );
        return await _reverseGeocode(position.latitude, position.longitude, true, null);
      }
    }
  } catch (e) {
    debugPrint("[LocationService] Native Geolocator chưa liên kết hoặc lỗi: $e");
  }

  // 2. Dự phòng an toàn qua HTTPS Geolocation (Không phụ thuộc plugin native, chạy hoàn hảo trên iOS/Android/Web)
  try {
    final res = await http.get(Uri.parse('https://ipwho.is/')).timeout(const Duration(seconds: 5));
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      if (data['success'] == true) {
        final double lat = (data['latitude'] as num).toDouble();
        final double lng = (data['longitude'] as num).toDouble();
        final city = data['city']?.toString() ?? '';
        final region = data['region']?.toString() ?? '';
        final country = data['country']?.toString() ?? 'Việt Nam';
        final fallbackAddr = [city, region, country].where((s) => s.isNotEmpty).join(', ');
        return await _reverseGeocode(lat, lng, false, fallbackAddr.isNotEmpty ? fallbackAddr : null);
      }
    }
  } catch (e) {
    debugPrint("[LocationService] ipwho.is error: $e");
  }

  try {
    final res = await http.get(Uri.parse('https://freeipapi.com/api/json')).timeout(const Duration(seconds: 5));
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      final double? lat = (data['latitude'] as num?)?.toDouble();
      final double? lng = (data['longitude'] as num?)?.toDouble();
      if (lat != null && lng != null) {
        final city = data['cityName']?.toString() ?? '';
        final region = data['regionName']?.toString() ?? '';
        final country = data['countryName']?.toString() ?? 'Việt Nam';
        final fallbackAddr = [city, region, country].where((s) => s.isNotEmpty).join(', ');
        return await _reverseGeocode(lat, lng, false, fallbackAddr.isNotEmpty ? fallbackAddr : null);
      }
    }
  } catch (e) {
    debugPrint("[LocationService] freeipapi error: $e");
  }

  return null;
}

Future<DeviceCoordinates> _reverseGeocode(double lat, double lng, bool isGps, String? fallbackHint) async {
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
    address: address ?? fallbackHint ?? "Khu vực toạ độ ($lat, $lng)",
    isGpsHardware: isGps,
  );
}
