class BleDeviceEntity {
  final String id;
  final String name;
  final int rssi;
  final bool isConnectable;
  final String? macAddress;

  const BleDeviceEntity({
    required this.id,
    required this.name,
    required this.rssi,
    this.isConnectable = true,
    this.macAddress,
  });
}
