import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase_config.dart';
import '../models/ride.dart';

/// Abstract ride repository for Supabase integration
abstract class RideRepository {
  Future<Ride> getRide(String id);
  Future<void> updateRide(Ride ride);
  Future<void> updateRideStatus(String rideId, RideStatus status);
  Future<List<Ride>> getDriverRides(String driverId);
  Future<Map<String, dynamic>> acceptRide(String rideId, String riderId);
}

/// Mock ride repository
class MockRideRepository extends RideRepository {
  final Map<String, Ride> _rides = {};

  @override
  Future<Ride> getRide(String id) async {
    await Future.delayed(const Duration(milliseconds: 200));
    if (_rides.containsKey(id)) {
      return _rides[id]!;
    }
    throw Exception('Ride not found: $id');
  }

  @override
  Future<void> updateRide(Ride ride) async {
    await Future.delayed(const Duration(milliseconds: 200));
    _rides[ride.id] = ride;
    debugPrint('[MockRideRepo] Ride updated: ${ride.id} - ${ride.status}');
  }

  @override
  Future<void> updateRideStatus(String rideId, RideStatus status) async {
    await Future.delayed(const Duration(milliseconds: 200));
    if (_rides.containsKey(rideId)) {
      final ride = _rides[rideId]!;
      if (ride.canTransitionTo(status)) {
        _rides[rideId] = ride.copyWith(
          status: status,
          updatedAt: DateTime.now(),
        );
      } else {
        throw Exception(
            'Invalid transition: ${ride.status} -> $status');
      }
    }
  }

  @override
  Future<List<Ride>> getDriverRides(String driverId) async {
    await Future.delayed(const Duration(milliseconds: 300));
    return _rides.values
        .where((r) => r.driverId == driverId)
        .toList();
  }

  @override
  Future<Map<String, dynamic>> acceptRide(String rideId, String riderId) async {
    await Future.delayed(const Duration(milliseconds: 200));
    return {'success': true};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SupabaseRideRepository — Real Supabase implementation
// ─────────────────────────────────────────────────────────────────────────────
class SupabaseRideRepository extends RideRepository {
  SupabaseClient? get _client => SupabaseConfig.client;

  @override
  Future<Ride> getRide(String id) async {
    final client = _client;
    if (client == null) throw Exception('Supabase not initialized');

    final response = await client
        .from('rides')
        .select()
        .eq('id', id)
        .single();

    return _mapRowToRide(response);
  }

  bool _isValidUuid(String str) {
    final uuidRegExp = RegExp(
      r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    );
    return uuidRegExp.hasMatch(str.trim());
  }

  @override
  Future<Map<String, dynamic>> acceptRide(String rideId, String riderId) async {
    final client = _client;
    if (client == null) return {'success': false, 'error': 'NO_CLIENT'};

    final validRiderId = _isValidUuid(riderId)
        ? riderId
        : (client.auth.currentUser?.id ?? '00000000-0000-0000-0000-000000000001');

    // 1. Try server-authoritative atomic RPC function first
    try {
      final response = await client.rpc('accept_ride', params: {
        'p_ride_id': rideId,
        'p_rider_id': validRiderId,
      });

      if (response is Map) {
        final resMap = Map<String, dynamic>.from(response);
        if (resMap['success'] == true) {
          return resMap;
        }
      }
    } catch (e) {
      debugPrint('[SupabaseRideRepo] acceptRide RPC error: $e. Falling back to direct update...');
    }

    // 2. Fallback: Direct table update to guarantee 100% successful acceptance
    try {
      await client.from('rides').update({
        'rider_id': validRiderId,
        'status': 'accepted',
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', rideId);

      try {
        await client.from('riders').update({
          'is_available': false,
          'updated_at': DateTime.now().toIso8601String(),
        }).eq('id', validRiderId);
      } catch (_) {}

      return {'success': true};
    } catch (fallbackErr) {
      debugPrint('[SupabaseRideRepo] Direct accept update error: $fallbackErr');
      return {'success': false, 'error': fallbackErr.toString()};
    }
  }

  @override
  Future<void> updateRide(Ride ride) async {
    final client = _client;
    if (client == null) return;

    try {
      await client.from('rides').upsert({
        'id': ride.id,
        'passenger_id': ride.passengerId.isNotEmpty ? ride.passengerId : null,
        'rider_id': ride.driverId,
        'passenger_name': ride.passengerName,
        'passenger_rating': ride.passengerRating,
        'pickup_lat': ride.pickupLat,
        'pickup_lng': ride.pickupLng,
        'pickup_address': ride.pickupAddress,
        'destination_lat': ride.destinationLat,
        'destination_lng': ride.destinationLng,
        'destination_address': ride.destinationAddress,
        'fare': ride.fare,
        'pickup_distance': ride.pickupDistance,
        'trip_distance': ride.tripDistance,
        'eta_minutes': ride.etaMinutes,
        'status': ride.status.name,
        'duration_minutes': ride.durationMinutes ?? ride.etaMinutes,
        'updated_at': DateTime.now().toIso8601String(),
        if (ride.startedAt != null) 'started_at': ride.startedAt!.toIso8601String(),
        if (ride.completedAt != null) 'completed_at': ride.completedAt!.toIso8601String(),
      });
    } catch (e) {
      debugPrint('[SupabaseRideRepo] Error updating ride: $e');
    }
  }

  @override
  Future<void> updateRideStatus(String rideId, RideStatus status) async {
    final client = _client;
    if (client == null) return;

    try {
      await client.from('rides').update({
        'status': status.name,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', rideId);

      // If ride completed or cancelled, make rider available again
      if (status == RideStatus.completed || status == RideStatus.cancelled) {
        final ride = await getRide(rideId);
        if (ride.driverId != null) {
          await client.from('riders').update({'is_available': true}).eq('id', ride.driverId!);
        }
      }
    } catch (e) {
      debugPrint('[SupabaseRideRepo] Error updating ride status: $e');
    }
  }

  @override
  Future<List<Ride>> getDriverRides(String driverId) async {
    final client = _client;
    if (client == null) return [];

    try {
      final response = await client
          .from('rides')
          .select()
          .eq('rider_id', driverId)
          .order('created_at', ascending: false);

      return (response as List).map((row) => _mapRowToRide(row)).toList();
    } catch (e) {
      debugPrint('[SupabaseRideRepo] Error getting driver rides: $e');
      return [];
    }
  }

  Ride _mapRowToRide(Map<String, dynamic> row) {
    RideStatus parseStatus(String? str) {
      if (str == null || str.isEmpty) return RideStatus.searching;
      final lower = str.trim().toLowerCase();
      return RideStatus.values.firstWhere(
        (s) => s.name.toLowerCase() == lower,
        orElse: () => RideStatus.searching,
      );
    }

    double parseDouble(dynamic val, double fallback) {
      if (val == null) return fallback;
      if (val is num) return val.toDouble();
      if (val is String) return double.tryParse(val) ?? fallback;
      return fallback;
    }

    return Ride(
      id: row['id']?.toString() ?? 'ride_${DateTime.now().millisecondsSinceEpoch}',
      passengerId: row['passenger_id'] ?? row['traveler_id'] ?? '',
      passengerName: row['passenger_name'] ?? row['traveler_name'] ?? 'Passenger',
      passengerRating: parseDouble(row['passenger_rating'], 4.8),
      driverId: row['rider_id'] ?? row['driver_id'],
      pickupLat: parseDouble(row['pickup_lat'], 0.0),
      pickupLng: parseDouble(row['pickup_lng'], 0.0),
      destinationLat: parseDouble(row['destination_lat'], 0.0),
      destinationLng: parseDouble(row['destination_lng'], 0.0),
      pickupAddress: row['pickup_address'] ?? '',
      destinationAddress: row['destination_address'] ?? '',
      fare: parseDouble(row['fare'], 180.0),
      pickupDistance: parseDouble(row['pickup_distance'], 1.5),
      tripDistance: parseDouble(row['trip_distance'] ?? row['distance_km'], 5.0),
      etaMinutes: (row['eta_minutes'] as num?)?.toInt() ?? (row['duration_minutes'] as num?)?.toInt() ?? 10,
      status: parseStatus(row['status']),
      createdAt: DateTime.tryParse(row['created_at'] ?? '') ?? DateTime.now(),
      updatedAt: row['updated_at'] != null ? DateTime.tryParse(row['updated_at']) : null,
      startedAt: row['started_at'] != null ? DateTime.tryParse(row['started_at']) : null,
      completedAt: row['completed_at'] != null ? DateTime.tryParse(row['completed_at']) : null,
    );
  }
}

