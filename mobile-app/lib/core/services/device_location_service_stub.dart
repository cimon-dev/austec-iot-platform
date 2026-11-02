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

/// Fallback khi không hỗ trợ Web GPS
Future<DeviceCoordinates?> getDeviceCoordinates() async {
  return null;
}

