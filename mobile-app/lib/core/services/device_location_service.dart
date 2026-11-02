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

class LocationFetchResult {
  final bool success;
  final DeviceCoordinates? coordinates;
  final String? errorMessage;
  final bool needsOpenSettings;
  final bool isGpsHardware;

  LocationFetchResult({
    required this.success,
    this.coordinates,
    this.errorMessage,
    this.needsOpenSettings = false,
    this.isGpsHardware = false,
  });
}

/// Lấy tọa độ GPS chính xác trực tiếp từ phần cứng điện thoại (iOS / Android / Web)
/// Xin quyền trực tiếp từ người dùng, tuyệt đối KHÔNG tự ý gán vị trí IP mạng sai lệch
Future<LocationFetchResult> getDeviceGpsLocation({
  bool requestPermissionIfDenied = true,
}) async {
  // 1. Kiểm tra & Xin Quyền truy cập Vị trí từ hệ điều hành (Popup của iOS / Android)
  try {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied && requestPermissionIfDenied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied) {
      return LocationFetchResult(
        success: false,
        needsOpenSettings: false,
        errorMessage: "Ứng dụng chưa được cấp quyền Vị trí. Vui lòng cho phép quyền Vị trí trên điện thoại.",
      );
    }

    if (permission == LocationPermission.deniedForever) {
      return LocationFetchResult(
        success: false,
        needsOpenSettings: true,
        errorMessage: "Quyền Vị trí đã bị từ chối vĩnh viễn trên điện thoại. Vui lòng mở Cài đặt ứng dụng để bật quyền Vị trí.",
      );
    }

    // 2. Kiểm tra Dịch vụ Vị trí (GPS Toggle trong Cài đặt của điện thoại)
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return LocationFetchResult(
        success: false,
        needsOpenSettings: true,
        errorMessage: "Dịch vụ định vị GPS trên điện thoại đang TẮT. Vui lòng bật Vị trí (GPS) trong Cài đặt của máy để lấy tọa độ chính xác.",
      );
    }

    // 3. Nếu quyền hợp lệ & GPS đang bật: Đọc tọa độ GPS vệ tinh phần cứng độ chính xác cao
    if (permission == LocationPermission.whileInUse || permission == LocationPermission.always) {
      Position? position;
      try {
        position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.best,
            timeLimit: Duration(seconds: 8),
          ),
        );
      } catch (posErr) {
        debugPrint("[LocationService] getCurrentPosition timeout/error, thử lastKnown: $posErr");
        position = await Geolocator.getLastKnownPosition();
      }

      if (position != null) {
        final coords = await _reverseGeocode(
          position.latitude,
          position.longitude,
          true,
          null,
        );
        return LocationFetchResult(
          success: true,
          coordinates: coords,
          isGpsHardware: true,
        );
      }
    }
  } catch (e) {
    debugPrint("[LocationService] Native Geolocator lỗi: $e");
  }

  return LocationFetchResult(
    success: false,
    needsOpenSettings: true,
    errorMessage: "Không thể nhận diện vệ tinh GPS. Vui lòng bật định vị GPS trên điện thoại và thử lại.",
  );
}

/// Tương thích ngược với các module khác
Future<DeviceCoordinates?> getDeviceCoordinates() async {
  final res = await getDeviceGpsLocation(requestPermissionIfDenied: true);
  return res.coordinates;
}

Future<DeviceCoordinates> _reverseGeocode(double lat, double lng, bool isGps, String? fallbackHint) async {
  String? address;
  try {
    final geoRes = await http.get(
      Uri.parse('https://nominatim.openstreetmap.org/reverse?format=json&lat=$lat&lon=$lng&zoom=18&addressdetails=1'),
      headers: {
        'User-Agent': 'AustecIoT/2.0 (Mobile App Provisioning)',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      },
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
