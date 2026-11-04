import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import '../models/location.dart';

/// Abstract location service contract
abstract class LocationService {
  Stream<AppLocation> get locationStream;
  Future<AppLocation> getCurrentLocation();
  Future<void> startUpdates();
  Future<void> stopUpdates();
  bool get isTracking;
  void dispose();
}

// ─────────────────────────────────────────────────────────────────────────────
// Real GPS location service using geolocator package
// ─────────────────────────────────────────────────────────────────────────────
class GeolocatorLocationService extends LocationService {
  final StreamController<AppLocation> _controller =
      StreamController<AppLocation>.broadcast();
  StreamSubscription<Position>? _positionSub;
  bool _isTracking = false;

  @override
  Stream<AppLocation> get locationStream => _controller.stream;

  @override
  bool get isTracking => _isTracking;

  /// Request permission if needed, then return current GPS position.
  @override
  Future<AppLocation> getCurrentLocation() async {
    await _ensurePermission();
    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
      ),
    );
    return AppLocation(
      latitude: position.latitude,
      longitude: position.longitude,
      address: 'Current Location',
    );
  }

  /// Start streaming GPS updates (high accuracy, ~5 s interval / 10 m distance).
  @override
  Future<void> startUpdates() async {
    if (_isTracking) return;
    await _ensurePermission();
    _isTracking = true;

    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10, // metres
    );

    _positionSub =
        Geolocator.getPositionStream(locationSettings: locationSettings)
            .listen((position) {
      _controller.add(AppLocation(
        latitude: position.latitude,
        longitude: position.longitude,
        address: 'Live Location',
      ));
    }, onError: (e) {
      debugPrint('[GeolocatorService] Stream error: $e');
    });

    debugPrint('[GeolocatorService] Started real GPS updates');
  }

  @override
  Future<void> stopUpdates() async {
    _isTracking = false;
    await _positionSub?.cancel();
    _positionSub = null;
    debugPrint('[GeolocatorService] Stopped GPS updates');
  }

  /// Ensure location permissions are granted; throws if denied.
  Future<void> _ensurePermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception('Location services are disabled. Please enable GPS.');
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw Exception('Location permission denied.');
      }
    }
    if (permission == LocationPermission.deniedForever) {
      throw Exception(
          'Location permission permanently denied. Enable in Settings.');
    }
  }

  @override
  void dispose() {
    _positionSub?.cancel();
    _controller.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock location service — kept for offline / simulator testing
// ─────────────────────────────────────────────────────────────────────────────
class MockLocationService extends LocationService {
  final StreamController<AppLocation> _controller =
      StreamController<AppLocation>.broadcast();
  Timer? _timer;
  bool _isTracking = false;

  double _currentLat = 19.0760;
  double _currentLng = 72.8777;

  double? _targetLat;
  double? _targetLng;

  @override
  Stream<AppLocation> get locationStream => _controller.stream;

  @override
  bool get isTracking => _isTracking;

  @override
  Future<AppLocation> getCurrentLocation() async {
    await Future.delayed(const Duration(milliseconds: 300));
    return AppLocation(
      latitude: _currentLat,
      longitude: _currentLng,
      address: 'Current Location (Mock)',
    );
  }

  @override
  Future<void> startUpdates() async {
    if (_isTracking) return;
    _isTracking = true;
    _timer = Timer.periodic(const Duration(seconds: 3), (_) {
      _simulateMovement();
      _controller.add(AppLocation(
        latitude: _currentLat,
        longitude: _currentLng,
        address: 'Moving... (Mock)',
      ));
    });
    debugPrint('[MockLocation] Started mock location updates');
  }

  @override
  Future<void> stopUpdates() async {
    _isTracking = false;
    _timer?.cancel();
    _timer = null;
    debugPrint('[MockLocation] Stopped mock location updates');
  }

  void setTarget(double lat, double lng) {
    _targetLat = lat;
    _targetLng = lng;
  }

  void setPosition(double lat, double lng) {
    _currentLat = lat;
    _currentLng = lng;
  }

  void _simulateMovement() {
    if (_targetLat == null || _targetLng == null) return;
    const stepSize = 0.001;
    final dLat = _targetLat! - _currentLat;
    final dLng = _targetLng! - _currentLng;
    if (dLat.abs() < stepSize && dLng.abs() < stepSize) {
      _currentLat = _targetLat!;
      _currentLng = _targetLng!;
      return;
    }
    final ratio = stepSize / (dLat.abs() + dLng.abs());
    _currentLat += dLat * ratio;
    _currentLng += dLng * ratio;
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.close();
  }
}
