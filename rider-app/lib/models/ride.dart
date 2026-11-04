enum RideStatus {
  searching,
  accepted,
  arrived,
  started,
  completed,
  cancelled,
  expired,
}

class Ride {
  final String id;
  final String passengerId;
  final String passengerName;
  final double passengerRating;
  final String? driverId;
  final double pickupLat;
  final double pickupLng;
  final double destinationLat;
  final double destinationLng;
  final String pickupAddress;
  final String destinationAddress;
  final double fare;
  final double pickupDistance; // km
  final double tripDistance; // km
  final int etaMinutes;
  RideStatus status;
  final DateTime createdAt;
  DateTime? updatedAt;
  DateTime? startedAt;
  DateTime? completedAt;
  int? durationMinutes;

  Ride({
    required this.id,
    required this.passengerId,
    required this.passengerName,
    this.passengerRating = 4.5,
    this.driverId,
    required this.pickupLat,
    required this.pickupLng,
    required this.destinationLat,
    required this.destinationLng,
    required this.pickupAddress,
    required this.destinationAddress,
    required this.fare,
    required this.pickupDistance,
    required this.tripDistance,
    required this.etaMinutes,
    this.status = RideStatus.searching,
    required this.createdAt,
    this.updatedAt,
    this.startedAt,
    this.completedAt,
    this.durationMinutes,
  });

  bool canTransitionTo(RideStatus newStatus) {
    switch (status) {
      case RideStatus.searching:
        return newStatus == RideStatus.accepted ||
            newStatus == RideStatus.cancelled ||
            newStatus == RideStatus.expired;
      case RideStatus.accepted:
        return newStatus == RideStatus.arrived ||
            newStatus == RideStatus.cancelled;
      case RideStatus.arrived:
        return newStatus == RideStatus.started ||
            newStatus == RideStatus.cancelled;
      case RideStatus.started:
        return newStatus == RideStatus.completed;
      case RideStatus.completed:
      case RideStatus.cancelled:
      case RideStatus.expired:
        return false;
    }
  }

  Ride copyWith({
    String? id,
    String? passengerId,
    String? passengerName,
    double? passengerRating,
    String? driverId,
    double? pickupLat,
    double? pickupLng,
    double? destinationLat,
    double? destinationLng,
    String? pickupAddress,
    String? destinationAddress,
    double? fare,
    double? pickupDistance,
    double? tripDistance,
    int? etaMinutes,
    RideStatus? status,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? startedAt,
    DateTime? completedAt,
    int? durationMinutes,
  }) {
    return Ride(
      id: id ?? this.id,
      passengerId: passengerId ?? this.passengerId,
      passengerName: passengerName ?? this.passengerName,
      passengerRating: passengerRating ?? this.passengerRating,
      driverId: driverId ?? this.driverId,
      pickupLat: pickupLat ?? this.pickupLat,
      pickupLng: pickupLng ?? this.pickupLng,
      destinationLat: destinationLat ?? this.destinationLat,
      destinationLng: destinationLng ?? this.destinationLng,
      pickupAddress: pickupAddress ?? this.pickupAddress,
      destinationAddress: destinationAddress ?? this.destinationAddress,
      fare: fare ?? this.fare,
      pickupDistance: pickupDistance ?? this.pickupDistance,
      tripDistance: tripDistance ?? this.tripDistance,
      etaMinutes: etaMinutes ?? this.etaMinutes,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      startedAt: startedAt ?? this.startedAt,
      completedAt: completedAt ?? this.completedAt,
      durationMinutes: durationMinutes ?? this.durationMinutes,
    );
  }

  /// Mock ride for development testing
  static Ride mock() {
    return Ride(
      id: 'ride_${DateTime.now().millisecondsSinceEpoch}',
      passengerId: 'passenger_001',
      passengerName: 'Rahul Sharma',
      passengerRating: 4.7,
      pickupLat: 19.0820,
      pickupLng: 72.8810,
      destinationLat: 18.9220,
      destinationLng: 72.8347,
      pickupAddress: 'Mumbai Central Station',
      destinationAddress: 'Gateway of India, Colaba',
      fare: 7.4,
      pickupDistance: 2.1,
      tripDistance: 7.4,
      etaMinutes: 7,
      status: RideStatus.searching,
      createdAt: DateTime.now(),
    );
  }

  static List<Ride> mockRidePool() {
    return [
      Ride(
        id: 'ride_mock_1',
        passengerId: 'p1',
        passengerName: 'Rahul Sharma',
        passengerRating: 4.7,
        pickupLat: 19.0820,
        pickupLng: 72.8810,
        destinationLat: 18.9220,
        destinationLng: 72.8347,
        pickupAddress: 'Mumbai Central Station',
        destinationAddress: 'Gateway of India, Colaba',
        fare: 7.4,
        pickupDistance: 2.1,
        tripDistance: 7.4,
        etaMinutes: 7,
        status: RideStatus.searching,
        createdAt: DateTime.now(),
      ),
      Ride(
        id: 'ride_mock_2',
        passengerId: 'p2',
        passengerName: 'Priya Patel',
        passengerRating: 4.9,
        pickupLat: 19.0728,
        pickupLng: 72.8826,
        destinationLat: 19.1176,
        destinationLng: 72.9060,
        pickupAddress: 'Dadar TT Circle',
        destinationAddress: 'Bandra Kurla Complex',
        fare: 12.3,
        pickupDistance: 1.5,
        tripDistance: 12.3,
        etaMinutes: 5,
        status: RideStatus.searching,
        createdAt: DateTime.now(),
      ),
      Ride(
        id: 'ride_mock_3',
        passengerId: 'p3',
        passengerName: 'Vikram Singh',
        passengerRating: 4.3,
        pickupLat: 19.0896,
        pickupLng: 72.8656,
        destinationLat: 19.0176,
        destinationLng: 72.8562,
        pickupAddress: 'Lower Parel Station',
        destinationAddress: 'Worli Sea Face',
        fare: 4.8,
        pickupDistance: 3.2,
        tripDistance: 4.8,
        etaMinutes: 10,
        status: RideStatus.searching,
        createdAt: DateTime.now(),
      ),
    ];
  }
}
