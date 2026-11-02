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
/// Có xin quyền người dùng rõ ràng, không âm thầm gán IP sai lệch
Future<LocationFetchResult> getDeviceGpsLocation({
  bool requestPermissionIfDenied = true,
  bool allowIpFallback = false,
}) async {
  // 1. Kiểm tra Dịch vụ Vị trí (GPS Toggle trong Cài đặt của điện thoại)
  try {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (!allowIpFallback) {
        return LocationFetchResult(
          success: false,
          needsOpenSettings: true,
          errorMessage: "Dịch vụ định vị GPS trên điện thoại đang TẮT. Vui lòng bật Vị trí (GPS) trong Cài đặt của máy để lấy tọa độ chính xác.",
        );
      }
    }
  } catch (e) {
    debugPrint("[LocationService] isLocationServiceEnabled check error: $e");
  }

  // 2. Kiểm tra & Xin Quyền truy cập Vị trí từ hệ điều hành (Popup OS)
  try {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied && requestPermissionIfDenied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied) {
      if (!allowIpFallback) {
        return LocationFetchResult(
          success: false,
          needsOpenSettings: false,
          errorMessage: "Ứng dụng chưa được cấp quyền Vị trí. Vui lòng cho phép quyền Vị trí trên điện thoại.",
        );
      }
    }

    if (permission == LocationPermission.deniedForever) {
      if (!allowIpFallback) {
        return LocationFetchResult(
          success: false,
          needsOpenSettings: true,
          errorMessage: "Quyền Vị trí đã bị từ chối vĩnh viễn trên điện thoại. Vui lòng mở Cài đặt ứng dụng để bật quyền Vị trí.",
        );
      }
    }

    // 3. Nếu quyền hợp lệ: Đọc tọa độ GPS vệ tinh độ chính xác cao từ phần cứng
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

  // 4. Nếu không cho phép fallback qua IP hoặc muốn vị trí GPS thật
  if (!allowIpFallback) {
    return LocationFetchResult(
      success: false,
      needsOpenSettings: true,
      errorMessage: "Không thể nhận diện vệ tinh GPS. Vui lòng bật định vị GPS trên điện thoại và thử lại.",
    );
  }

  // 5. Dự phòng qua Geolocation IP (Chỉ dùng khi cho phép fallback)
  try {
    final res = await http.get(Uri.parse('https://ipwho.is/')).timeout(const Duration(seconds: 4));
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      if (data['success'] == true) {
        final double lat = (data['latitude'] as num).toDouble();
        final double lng = (data['longitude'] as num).toDouble();
        final city = data['city']?.toString() ?? '';
        final region = data['region']?.toString() ?? '';
        final country = data['country']?.toString() ?? 'Việt Nam';
        final fallbackAddr = [city, region, country].where((s) => s.isNotEmpty).join(', ');
        final coords = await _reverseGeocode(lat, lng, false, fallbackAddr.isNotEmpty ? fallbackAddr : null);
        return LocationFetchResult(
          success: true,
          coordinates: coords,
          isGpsHardware: false,
          errorMessage: "Vị trí ước tính theo mạng Internet (chưa bật GPS phần cứng)",
        );
      }
    }
  } catch (_) {}

  return LocationFetchResult(
    success: false,
    errorMessage: "Không thể xác định vị trí hiện tại. Vui lòng bật GPS trên máy.",
  );
}

/// Tương thích ngược với các module khác
Future<DeviceCoordinates?> getDeviceCoordinates({bool allowIpFallback = false}) async {
  final res = await getDeviceGpsLocation(requestPermissionIfDenied: true, allowIpFallback: allowIpFallback);
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
