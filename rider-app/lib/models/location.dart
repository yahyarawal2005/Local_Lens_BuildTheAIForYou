class AppLocation {
  final double latitude;
  final double longitude;
  final String? address;
  final DateTime timestamp;

  AppLocation({
    required this.latitude,
    required this.longitude,
    this.address,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  AppLocation copyWith({
    double? latitude,
    double? longitude,
    String? address,
    DateTime? timestamp,
  }) {
    return AppLocation(
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      address: address ?? this.address,
      timestamp: timestamp ?? this.timestamp,
    );
  }

  /// Mumbai - Andheri
  static AppLocation mockDriverLocation() {
    return AppLocation(
      latitude: 19.0760,
      longitude: 72.8777,
      address: 'Andheri West, Mumbai',
    );
  }

  /// Mumbai - Mumbai Central
  static AppLocation mockPickupLocation() {
    return AppLocation(
      latitude: 19.0820,
      longitude: 72.8810,
      address: 'Mumbai Central Station',
    );
  }

  /// Mumbai - Gateway of India
  static AppLocation mockDestinationLocation() {
    return AppLocation(
      latitude: 18.9220,
      longitude: 72.8347,
      address: 'Gateway of India, Colaba',
    );
  }
}
