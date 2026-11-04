import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase_config.dart';
import '../models/ride.dart';

/// Abstract realtime service for Supabase / WebSocket integration
abstract class RealtimeService {
  Stream<Ride> get rideRequestStream;
  Future<void> connect();
  Future<void> disconnect();
  bool get isConnected;
  void dispose();
}

/// SupabaseRealtimeService — Live Supabase Realtime Listener
class SupabaseRealtimeService extends RealtimeService {
  final StreamController<Ride> _controller = StreamController<Ride>.broadcast();
  RealtimeChannel? _channel;
  Timer? _pollTimer;
  bool _isConnected = false;

  SupabaseClient? get _client => SupabaseConfig.client;

  @override
  Stream<Ride> get rideRequestStream => _controller.stream;

  @override
  bool get isConnected => _isConnected;

  @override
  Future<void> connect() async {
    final client = _client;
    if (client == null) {
      debugPrint('[SupabaseRealtime] Supabase not initialized.');
      return;
    }

    try {
      await disconnect();

      _channel = client.channel('public:rides:searching');
      _channel!
          .onPostgresChanges(
            event: PostgresChangeEvent.insert,
            schema: 'public',
            table: 'rides',
            callback: (payload) {
              _handleRowChange(payload.newRecord);
            },
          )
          .onPostgresChanges(
            event: PostgresChangeEvent.update,
            schema: 'public',
            table: 'rides',
            callback: (payload) {
              _handleRowChange(payload.newRecord);
            },
          );

      _channel!.subscribe((status, [error]) {
        debugPrint('[SupabaseRealtime] Realtime channel status: $status ${error ?? ""}');
      });

      _isConnected = true;
      debugPrint('[SupabaseRealtime] Subscribed to real-time public.rides events!');

      // Fetch any existing searching rides immediately upon connection
      await _fetchPendingSearchingRides();

      // Periodic polling fallback (every 4s) to ensure 100% reliability
      _pollTimer?.cancel();
      _pollTimer = Timer.periodic(const Duration(seconds: 4), (_) {
        if (_isConnected) {
          _fetchPendingSearchingRides();
        }
      });
    } catch (e) {
      debugPrint('[SupabaseRealtime] Error connecting to realtime: $e');
      _isConnected = false;
    }
  }

  Future<void> _fetchPendingSearchingRides() async {
    final client = _client;
    if (client == null) return;
    try {
      final response = await client
          .from('rides')
          .select()
          .eq('status', 'searching')
          .order('created_at', ascending: false)
          .limit(5);

      final rows = List<Map<String, dynamic>>.from(response);
      for (final row in rows) {
        _handleRowChange(row);
      }
    } catch (e) {
      debugPrint('[SupabaseRealtime] Error fetching pending searching rides: $e');
    }
  }

  void _handleRowChange(Map<String, dynamic> row) {
    try {
      final statusStr = row['status'] as String? ?? '';
      if (statusStr == 'searching') {
        final ride = _mapRowToRide(row);
        debugPrint('[SupabaseRealtime] New searching ride detected: ${ride.id}');
        _controller.add(ride);
      }
    } catch (e) {
      debugPrint('[SupabaseRealtime] Error parsing row change: $e');
    }
  }

  Ride _mapRowToRide(Map<String, dynamic> row) {
    RideStatus parseStatus(String? str) {
      return RideStatus.values.firstWhere(
        (s) => s.name == str,
        orElse: () => RideStatus.searching,
      );
    }

    return Ride(
      id: row['id'] ?? '',
      passengerId: row['passenger_id'] ?? row['traveler_id'] ?? '',
      passengerName: row['passenger_name'] ?? row['traveler_name'] ?? 'Traveler',
      passengerRating: (row['passenger_rating'] as num?)?.toDouble() ?? 4.8,
      driverId: row['rider_id'] ?? row['driver_id'],
      pickupLat: (row['pickup_lat'] as num?)?.toDouble() ?? 0.0,
      pickupLng: (row['pickup_lng'] as num?)?.toDouble() ?? 0.0,
      destinationLat: (row['destination_lat'] as num?)?.toDouble() ?? 0.0,
      destinationLng: (row['destination_lng'] as num?)?.toDouble() ?? 0.0,
      pickupAddress: row['pickup_address'] ?? '',
      destinationAddress: row['destination_address'] ?? '',
      fare: (row['fare'] as num?)?.toDouble() ?? 0.0,
      pickupDistance: (row['pickup_distance'] as num?)?.toDouble() ?? 1.5,
      tripDistance: (row['trip_distance'] as num?)?.toDouble() ?? 5.0,
      etaMinutes: row['eta_minutes'] ?? 10,
      status: parseStatus(row['status']),
      createdAt: DateTime.parse(row['created_at'] ?? DateTime.now().toIso8601String()),
    );
  }

  @override
  Future<void> disconnect() async {
    _pollTimer?.cancel();
    _pollTimer = null;
    if (_channel != null) {
      try {
        _client?.removeChannel(_channel!);
      } catch (_) {}
      _channel = null;
    }
    _isConnected = false;
    debugPrint('[SupabaseRealtime] Disconnected.');
  }

  @override
  void dispose() {
    disconnect();
    _controller.close();
  }
}

/// Mock realtime service that generates ride requests for testing
class MockRealtimeService extends RealtimeService {
  final StreamController<Ride> _controller = StreamController<Ride>.broadcast();
  bool _isConnected = false;
  final _random = Random();

  @override
  Stream<Ride> get rideRequestStream => _controller.stream;

  @override
  bool get isConnected => _isConnected;

  @override
  Future<void> connect() async {
    await Future.delayed(const Duration(milliseconds: 500));
    _isConnected = true;
    debugPrint('[MockRealtime] Connected');
  }

  @override
  Future<void> disconnect() async {
    _isConnected = false;
    debugPrint('[MockRealtime] Disconnected');
  }

  /// Manually trigger a ride request (for TEST RIDE REQUEST button)
  void triggerMockRideRequest() {
    if (!_isConnected) {
      debugPrint('[MockRealtime] Not connected, cannot trigger ride');
      return;
    }

    final rides = Ride.mockRidePool();
    final ride = rides[_random.nextInt(rides.length)];
    final newRide = ride.copyWith(
      id: 'ride_${DateTime.now().millisecondsSinceEpoch}',
      createdAt: DateTime.now(),
    );

    debugPrint('[MockRealtime] Triggering ride request: ${newRide.id}');
    _controller.add(newRide);
  }

  @override
  void dispose() {
    _controller.close();
  }
}
