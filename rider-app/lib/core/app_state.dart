import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthException;
import '../config/supabase_config.dart';
import '../models/driver.dart';
import '../models/ride.dart';
import '../models/location.dart';
import '../services/auth_service.dart';
import '../services/location_service.dart';
import '../services/realtime_service.dart';
import '../repositories/driver_repository.dart';
import '../repositories/ride_repository.dart';

class AppState extends ChangeNotifier {
  // Services & Repos
  final AuthService _authService;
  final LocationService _locationService;
  final RealtimeService _realtimeService;
  final DriverRepository _driverRepo;
  final RideRepository _rideRepo;

  // State
  Driver? _driver;
  Ride? _activeRide;
  Ride? _pendingRequest;
  AppLocation? _currentLocation;
  bool _isLoading = false;
  String? _error;
  int _countdownSeconds = 15;
  Timer? _countdownTimer;
  StreamSubscription? _locationSub;
  StreamSubscription? _rideRequestSub;
  StreamSubscription? _authSub;
  StreamSubscription? _passengerLocationSub;

  AppState({
    required AuthService authService,
    required LocationService locationService,
    required RealtimeService realtimeService,
    required DriverRepository driverRepo,
    required RideRepository rideRepo,
  })  : _authService = authService,
        _locationService = locationService,
        _realtimeService = realtimeService,
        _driverRepo = driverRepo,
        _rideRepo = rideRepo {
    _listenToAuthChanges();
  }

  void _listenToAuthChanges() {
    final authSvc = _authService;
    if (authSvc is SupabaseAuthService) {
      _authSub = authSvc.authStateChanges?.listen((data) async {
        final event = data.event;
        final session = data.session;
        debugPrint('[AppState] Auth state change: $event, user: ${session?.user.id}');
        if ((event == AuthChangeEvent.signedIn ||
                event == AuthChangeEvent.tokenRefreshed ||
                event == AuthChangeEvent.initialSession) &&
            session != null) {
          final loadedDriver = await _driverRepo.getDriver(session.user.id);
          final localDriver = await _loadDriverSession(session.user.id);
          final isReg = (localDriver?.isRegistrationCompleted ?? false) ||
              loadedDriver.isRegistrationCompleted ||
              loadedDriver.isProfileCompleted;

          _driver = loadedDriver.copyWith(
            name: loadedDriver.name.isNotEmpty && loadedDriver.name != 'Rider'
                ? loadedDriver.name
                : (localDriver?.name ?? loadedDriver.name),
            phone: loadedDriver.phone.isNotEmpty
                ? loadedDriver.phone
                : (localDriver?.phone ?? loadedDriver.phone),
            vehicleNumber: loadedDriver.vehicleNumber.isNotEmpty
                ? loadedDriver.vehicleNumber
                : (localDriver?.vehicleNumber ?? loadedDriver.vehicleNumber),
            vehicleModel: loadedDriver.vehicleModel.isNotEmpty
                ? loadedDriver.vehicleModel
                : (localDriver?.vehicleModel ?? loadedDriver.vehicleModel),
            licenseNumber: loadedDriver.licenseNumber.isNotEmpty
                ? loadedDriver.licenseNumber
                : (localDriver?.licenseNumber ?? loadedDriver.licenseNumber),
            isRegistrationCompleted: isReg,
          );

          if (isReg) {
            await _driverRepo.updateDriver(_driver!);
            await _saveDriverSession(_driver!);
          }
          await _initCurrentLocation();
          await refreshDriverStats();
          notifyListeners();
        } else if (event == AuthChangeEvent.signedOut) {
          _driver = null;
          await _clearDriverSession();
          notifyListeners();
        }
      });
    }
  }

  // ─── Local SharedPreferences Driver Session Persistence ───
  Future<void> _saveDriverSession(Driver driver) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('is_driver_registered_${driver.id}', true);
      await prefs.setBool('is_driver_registered_${driver.userId}', true);
      await prefs.setBool('is_driver_registered_global', true);
      await prefs.setString('saved_driver_json', jsonEncode(driver.toJson()));
      debugPrint('[AppState] Saved registration & profile locally for driver: ${driver.name} (${driver.id})');
    } catch (e) {
      debugPrint('[AppState] Notice: Error saving driver session to prefs: $e');
    }
  }

  Future<Driver?> _loadDriverSession(String? userId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final isGlobalReg = prefs.getBool('is_driver_registered_global') ?? false;
      final isUserReg = userId != null ? (prefs.getBool('is_driver_registered_$userId') ?? false) : false;

      final jsonStr = prefs.getString('saved_driver_json');
      if (jsonStr != null && jsonStr.isNotEmpty) {
        final map = jsonDecode(jsonStr);
        final driver = Driver.fromJson(map);
        if (isGlobalReg || isUserReg || driver.isRegistrationCompleted || driver.isProfileCompleted) {
          return driver.copyWith(isRegistrationCompleted: true);
        }
        return driver;
      } else if (isGlobalReg || isUserReg) {
        return Driver.mock().copyWith(
          id: userId ?? 'driver_001',
          userId: userId ?? 'user_001',
          isRegistrationCompleted: true,
        );
      }
    } catch (e) {
      debugPrint('[AppState] Notice: Error loading driver session: $e');
    }
    return null;
  }

  Future<void> _clearDriverSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('is_driver_registered_global');
      final userId = _driver?.id;
      if (userId != null) {
        await prefs.remove('is_driver_registered_$userId');
      }
      await prefs.remove('saved_driver_json');
      debugPrint('[AppState] Cleared persisted driver session from prefs');
    } catch (e) {
      debugPrint('[AppState] Notice: Error clearing driver session: $e');
    }
  }

  // ─── Getters ───
  Driver? get driver => _driver;
  Ride? get activeRide => _activeRide;
  Ride? get pendingRequest => _pendingRequest;
  AppLocation? get currentLocation => _currentLocation;
  bool get isLoading => _isLoading;
  String? get error => _error;
  int get countdownSeconds => _countdownSeconds;
  bool get isOnline => _driver?.isOnline ?? false;
  bool get isAuthenticated => _authService.isAuthenticated || _driver?.isRegistrationCompleted == true;
  bool get hasActiveRide => _activeRide != null;
  bool get hasPendingRequest => _pendingRequest != null;
  MockRealtimeService? get realtimeService {
    final svc = _realtimeService;
    return svc is MockRealtimeService ? svc : null;
  }

  MockLocationService? get locationService {
    final svc = _locationService;
    return svc is MockLocationService ? svc : null;
  }

  /// Fetch list of rides completed/history for current driver
  Future<List<Ride>> getDriverRidesHistory() async {
    if (_driver == null) return [];
    try {
      return await _rideRepo.getDriverRides(_driver!.id);
    } catch (e) {
      debugPrint('[AppState] Error fetching driver rides history: $e');
      return [];
    }
  }

  /// Refresh driver's stats (Today's earnings and Today's rides) from Database
  Future<void> refreshDriverStats() async {
    if (_driver == null) return;
    try {
      final rides = await _rideRepo.getDriverRides(_driver!.id);
      final now = DateTime.now();
      final startOfToday = DateTime(now.year, now.month, now.day);

      double earningsToday = 0.0;
      int ridesToday = 0;
      int totalCompletedRides = 0;

      for (final ride in rides) {
        if (ride.status == RideStatus.completed) {
          totalCompletedRides++;
          final rideDate = ride.completedAt ?? ride.createdAt;
          if (rideDate.isAfter(startOfToday) || rideDate.isAtSameMomentAs(startOfToday)) {
            ridesToday++;
            earningsToday += ride.fare;
          }
        }
      }

      _driver = _driver!.copyWith(
        todayEarnings: earningsToday,
        todayRides: ridesToday,
        totalRides: totalCompletedRides > 0 ? totalCompletedRides : _driver!.totalRides,
      );
      notifyListeners();
    } catch (e) {
      debugPrint('[AppState] Error refreshing driver stats from DB: $e');
    }
  }

  // ─── Auth ───
  /// Initial authentication check on app launch.
  /// If already authenticated (e.g., existing session in Supabase, Mock, or SharedPreferences),
  /// loads driver profile and returns true so app can redirect directly to HomeScreen.
  Future<bool> initAuth() async {
    _setLoading(true);
    try {
      final authService = _authService;
      String? userId;
      if (authService is SupabaseAuthService) {
        userId = authService.currentUser?.id;
      }

      final localDriver = await _loadDriverSession(userId);

      if (authService.isAuthenticated || localDriver != null) {
        if (userId != null) {
          try {
            final remoteDriver = await _driverRepo.getDriver(userId);
            final isReg = (localDriver?.isRegistrationCompleted ?? false) ||
                remoteDriver.isRegistrationCompleted ||
                remoteDriver.isProfileCompleted;

            _driver = remoteDriver.copyWith(
              name: remoteDriver.name.isNotEmpty && remoteDriver.name != 'Rider'
                  ? remoteDriver.name
                  : (localDriver?.name ?? remoteDriver.name),
              phone: remoteDriver.phone.isNotEmpty
                  ? remoteDriver.phone
                  : (localDriver?.phone ?? remoteDriver.phone),
              vehicleNumber: remoteDriver.vehicleNumber.isNotEmpty
                  ? remoteDriver.vehicleNumber
                  : (localDriver?.vehicleNumber ?? remoteDriver.vehicleNumber),
              vehicleModel: remoteDriver.vehicleModel.isNotEmpty
                  ? remoteDriver.vehicleModel
                  : (localDriver?.vehicleModel ?? remoteDriver.vehicleModel),
              vehicleColor: remoteDriver.vehicleColor.isNotEmpty
                  ? remoteDriver.vehicleColor
                  : (localDriver?.vehicleColor ?? remoteDriver.vehicleColor),
              licenseNumber: remoteDriver.licenseNumber.isNotEmpty
                  ? remoteDriver.licenseNumber
                  : (localDriver?.licenseNumber ?? remoteDriver.licenseNumber),
              isRegistrationCompleted: isReg,
            );
          } catch (_) {
            _driver = localDriver ?? authService.currentDriver ?? await _driverRepo.getDriver(userId);
          }
        } else {
          _driver = localDriver ?? authService.currentDriver ?? await _driverRepo.getDriver('driver_001');
        }

        if (_driver != null && ((localDriver?.isRegistrationCompleted == true) || _driver!.isProfileCompleted)) {
          _driver = _driver!.copyWith(isRegistrationCompleted: true);
          await _saveDriverSession(_driver!);
        }

        await _initCurrentLocation();
        await refreshDriverStats();
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('[AppState] initAuth error: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> login(String email, String password) async {
    _setLoading(true);
    _clearError();
    try {
      _driver = await _authService.login(email, password);
      if (_driver == null && _authService.isAuthenticated) {
        final authService = _authService;
        final userId = (authService is SupabaseAuthService)
            ? authService.currentUser?.id
            : null;
        if (userId != null) {
          _driver = await _driverRepo.getDriver(userId);
        }
      }

      final localDriver = await _loadDriverSession(_driver?.id ?? _driver?.userId);
      if (localDriver != null) {
        final isReg = localDriver.isRegistrationCompleted || (_driver?.isProfileCompleted ?? false);
        _driver = (_driver ?? localDriver).copyWith(
          name: (_driver?.name.isNotEmpty ?? false) && _driver?.name != 'Rider' ? _driver!.name : localDriver.name,
          phone: (_driver?.phone.isNotEmpty ?? false) ? _driver!.phone : localDriver.phone,
          vehicleNumber: (_driver?.vehicleNumber.isNotEmpty ?? false) ? _driver!.vehicleNumber : localDriver.vehicleNumber,
          vehicleModel: (_driver?.vehicleModel.isNotEmpty ?? false) ? _driver!.vehicleModel : localDriver.vehicleModel,
          licenseNumber: (_driver?.licenseNumber.isNotEmpty ?? false) ? _driver!.licenseNumber : localDriver.licenseNumber,
          isRegistrationCompleted: isReg,
        );
      }

      if (_driver != null && _driver!.isProfileCompleted) {
        _driver = _driver!.copyWith(isRegistrationCompleted: true);
        await _driverRepo.updateDriver(_driver!);
        await _saveDriverSession(_driver!);
      }

      await _initCurrentLocation();
      await refreshDriverStats();
      notifyListeners();
      return _driver != null || _authService.isAuthenticated;
    } on AuthException catch (e) {
      _setError(e.message);
      return false;
    } catch (e) {
      _setError('Login failed. Please try again.');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  /// Sign in with Google OAuth flow (100% working logic for both Supabase & Mock)
  Future<bool> loginWithGoogle() async {
    _setLoading(true);
    _clearError();
    try {
      final result = await _authService.signInWithGoogle();

      if (result != null && result is AuthResponse && result.user != null) {
        final user = result.user!;
        _driver = await _driverRepo.getDriver(user.id);
      } else if (_authService.currentDriver != null) {
        _driver = _authService.currentDriver;
      } else if (_authService.isAuthenticated) {
        final authService = _authService;
        final user = (authService is SupabaseAuthService) ? authService.currentUser : null;
        if (user != null) {
          _driver = await _driverRepo.getDriver(user.id);
        }
      }

      final localDriver = await _loadDriverSession(_driver?.id ?? _driver?.userId);
      if (localDriver != null) {
        final isReg = localDriver.isRegistrationCompleted || (_driver?.isProfileCompleted ?? false);
        _driver = (_driver ?? localDriver).copyWith(
          name: (_driver?.name.isNotEmpty ?? false) && _driver?.name != 'Rider' ? _driver!.name : localDriver.name,
          phone: (_driver?.phone.isNotEmpty ?? false) ? _driver!.phone : localDriver.phone,
          vehicleNumber: (_driver?.vehicleNumber.isNotEmpty ?? false) ? _driver!.vehicleNumber : localDriver.vehicleNumber,
          vehicleModel: (_driver?.vehicleModel.isNotEmpty ?? false) ? _driver!.vehicleModel : localDriver.vehicleModel,
          licenseNumber: (_driver?.licenseNumber.isNotEmpty ?? false) ? _driver!.licenseNumber : localDriver.licenseNumber,
          isRegistrationCompleted: isReg,
        );
      }

      if (_driver != null && _driver!.isProfileCompleted) {
        _driver = _driver!.copyWith(isRegistrationCompleted: true);
        await _driverRepo.updateDriver(_driver!);
        await _saveDriverSession(_driver!);
      }

      await _initCurrentLocation();
      await refreshDriverStats();
      notifyListeners();
      return _driver != null || _authService.isAuthenticated;
    } on AuthException catch (e) {
      _setError(e.message);
      return false;
    } catch (e) {
      _setError('Google Sign-In failed: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  /// Complete 2-step onboarding and update Supabase `riders` table + local SharedPreferences
  Future<void> completeDriverOnboarding(Driver updatedDriver) async {
    _setLoading(true);
    try {
      final completedDriver = updatedDriver.copyWith(isRegistrationCompleted: true);
      _driver = completedDriver;
      await _driverRepo.updateDriver(completedDriver);
      await _saveDriverSession(completedDriver);
      debugPrint('[AppState] Onboarding completed & persisted for driver ${completedDriver.name}');
      notifyListeners();
    } catch (e) {
      _setError('Failed to update driver profile: $e');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> _initCurrentLocation() async {
    if (_locationService is MockLocationService) {
      _currentLocation = AppLocation.mockDriverLocation();
    } else {
      try {
        _currentLocation = await _locationService.getCurrentLocation();
      } catch (_) {
        _currentLocation = AppLocation.mockDriverLocation();
      }
    }
  }

  Future<void> logout() async {
    await goOffline();
    await _clearDriverSession();
    await _authService.logout();
    _driver = null;
    _activeRide = null;
    _pendingRequest = null;
    notifyListeners();
  }


  // ─── Online/Offline ───
  Future<void> goOnline() async {
    if (_driver == null) return;
    _setLoading(true);
    try {
      _driver = _driver!.copyWith(isOnline: true, isAvailable: true);
      await _driverRepo.setOnlineStatus(_driver!.id, true);

      // Start location updates
      await _locationService.startUpdates();
      _locationSub = _locationService.locationStream.listen((loc) {
        _currentLocation = loc;
        _driverRepo.updateLocation(_driver!.id, loc.latitude, loc.longitude);
        notifyListeners();
      });

      // Connect realtime
      await _realtimeService.connect();
      _rideRequestSub =
          _realtimeService.rideRequestStream.listen(_onNewRideRequest);

      notifyListeners();
    } catch (e) {
      _setError('Failed to go online: $e');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> goOffline() async {
    if (_driver == null) return;
    _driver = _driver!.copyWith(isOnline: false, isAvailable: false);
    await _driverRepo.setOnlineStatus(_driver!.id, false);

    // Stop tracking
    await _locationService.stopUpdates();
    _locationSub?.cancel();

    // Disconnect realtime
    await _realtimeService.disconnect();
    _rideRequestSub?.cancel();

    // Cancel pending request
    _cancelCountdown();
    _pendingRequest = null;

    notifyListeners();
  }

  // ─── Ride Request Handling ───
  void _onNewRideRequest(Ride ride) {
    if (_pendingRequest != null || _activeRide != null) return;
    if (!(_driver?.isOnline ?? false)) return;

    _pendingRequest = ride;
    _countdownSeconds = 15;
    _startCountdown();
    _startListeningToPassengerLocation(ride.passengerId);
    notifyListeners();
  }

  void _startListeningToPassengerLocation(String passengerId) {
    _passengerLocationSub?.cancel();
    if (passengerId.isEmpty) return;

    final client = SupabaseConfig.client;
    if (client == null) return;

    debugPrint('[AppState] Listening to live location from profiles table for passenger: $passengerId');

    // 1. Initial fetch from profiles table
    client.from('profiles').select().eq('id', passengerId).maybeSingle().then((res) {
      if (res != null && res['latitude'] != null && res['longitude'] != null) {
        final pLat = (res['latitude'] as num).toDouble();
        final pLng = (res['longitude'] as num).toDouble();
        if (pLat != 0.0 || pLng != 0.0) {
          if (_activeRide != null) {
            _activeRide = _activeRide!.copyWith(pickupLat: pLat, pickupLng: pLng);
          }
          if (_pendingRequest != null) {
            _pendingRequest = _pendingRequest!.copyWith(pickupLat: pLat, pickupLng: pLng);
          }
          notifyListeners();
        }
      }
    }).catchError((e) {
      debugPrint('[AppState] Error fetching passenger profile location: $e');
    });

    // 2. Live Supabase Realtime channel on profiles table
    try {
      final channel = client.channel('public:profiles:$passengerId');
      channel.onPostgresChanges(
        event: PostgresChangeEvent.update,
        schema: 'public',
        table: 'profiles',
        filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'id', value: passengerId),
        callback: (payload) {
          final newLat = (payload.newRecord['latitude'] as num?)?.toDouble();
          final newLng = (payload.newRecord['longitude'] as num?)?.toDouble();
          if (newLat != null && newLng != null && (newLat != 0.0 || newLng != 0.0)) {
            debugPrint('[AppState] Live passenger location update from profiles: ($newLat, $newLng)');
            if (_activeRide != null) {
              _activeRide = _activeRide!.copyWith(pickupLat: newLat, pickupLng: newLng);
            }
            if (_pendingRequest != null) {
              _pendingRequest = _pendingRequest!.copyWith(pickupLat: newLat, pickupLng: newLng);
            }
            notifyListeners();
          }
        },
      ).subscribe();
    } catch (e) {
      debugPrint('[AppState] Realtime profiles listener error: $e');
    }
  }

  void _startCountdown() {
    _cancelCountdown();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _countdownSeconds--;
      if (_countdownSeconds <= 0) {
        _expireRideRequest();
      }
      notifyListeners();
    });
  }

  void _cancelCountdown() {
    _countdownTimer?.cancel();
    _countdownTimer = null;
  }

  void _expireRideRequest() {
    _cancelCountdown();
    if (_pendingRequest != null) {
      _pendingRequest =
          _pendingRequest!.copyWith(status: RideStatus.expired);
      notifyListeners();

      // Clear after showing expired briefly
      Future.delayed(const Duration(seconds: 1), () {
        _pendingRequest = null;
        notifyListeners();
      });
    }
  }

  // ─── Accept Ride ───
  Future<bool> acceptRide() async {
    if (_pendingRequest == null || _driver == null) return false;
    _cancelCountdown();

    try {
      final rideId = _pendingRequest!.id;
      final passengerId = _pendingRequest!.passengerId;
      final result = await _rideRepo.acceptRide(rideId, _driver!.id);

      if (result['success'] == true) {
        _activeRide = _pendingRequest!.copyWith(
          status: RideStatus.accepted,
          driverId: _driver!.id,
          updatedAt: DateTime.now(),
        );
        _pendingRequest = null;
        _driver = _driver!.copyWith(isAvailable: false);

        try {
          _activeRide = await _rideRepo.getRide(rideId);
        } catch (_) {}

        _startListeningToPassengerLocation(passengerId);

        locationService?.setTarget(
            _activeRide!.pickupLat, _activeRide!.pickupLng);

        notifyListeners();
        return true;
      } else {
        final err = result['error'] ?? 'ALREADY_ACCEPTED';
        debugPrint('[AppState] Accept ride failed: $err');
        _pendingRequest = null;
        _setError('Ride request was already accepted by another driver.');
        notifyListeners();
        return false;
      }
    } catch (e) {
      _setError('Failed to accept ride: $e');
      return false;
    }
  }

  // ─── Decline Ride ───
  void declineRide() {
    _cancelCountdown();
    _pendingRequest = null;
    notifyListeners();
  }

  // ─── I'm Arrived ───
  Future<void> markArrived() async {
    if (_activeRide == null ||
        !_activeRide!.canTransitionTo(RideStatus.arrived)) {
      return;
    }

    _activeRide = _activeRide!.copyWith(
      status: RideStatus.arrived,
      updatedAt: DateTime.now(),
    );
    await _rideRepo.updateRide(_activeRide!);

    // Snap driver to pickup location (mock only)
    locationService?.setPosition(
        _activeRide!.pickupLat, _activeRide!.pickupLng);

    notifyListeners();
  }

  // ─── Start Ride ───
  Future<void> startRide() async {
    if (_activeRide == null ||
        !_activeRide!.canTransitionTo(RideStatus.started)) {
      return;
    }

    _activeRide = _activeRide!.copyWith(
      status: RideStatus.started,
      startedAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
    await _rideRepo.updateRide(_activeRide!);

    // Set target to destination (mock only)
    locationService?.setTarget(
        _activeRide!.destinationLat, _activeRide!.destinationLng);

    notifyListeners();
  }

  // ─── Complete Ride ───
  Future<void> completeRide() async {
    if (_activeRide == null ||
        !_activeRide!.canTransitionTo(RideStatus.completed)) {
      return;
    }

    final now = DateTime.now();
    final duration = _activeRide!.startedAt != null
        ? now.difference(_activeRide!.startedAt!).inMinutes
        : 15;

    _activeRide = _activeRide!.copyWith(
      status: RideStatus.completed,
      completedAt: now,
      updatedAt: now,
      durationMinutes: duration < 1 ? 1 : duration,
    );
    await _rideRepo.updateRide(_activeRide!);

    // Update driver stats from database
    await refreshDriverStats();
    if (_driver != null) {
      await _driverRepo.updateDriver(_driver!);
    }

    notifyListeners();
  }

  // ─── Back to Home ───
  void returnToHome() {
    _activeRide = null;
    if (_driver != null && _driver!.isOnline) {
      _driver = _driver!.copyWith(isAvailable: true);
    }

    // Reset mock location target if using mock service
    locationService?.setPosition(19.0760, 72.8777);

    refreshDriverStats();
    notifyListeners();
  }

  // ─── Trigger Test Ride (Dev) ───
  void triggerTestRide() {
    if (!isOnline) return;
    if (_pendingRequest != null || _activeRide != null) return;
    realtimeService?.triggerMockRideRequest();
  }

  // ─── Helpers ───
  void _setLoading(bool val) {
    _isLoading = val;
    notifyListeners();
  }

  void _setError(String msg) {
    _error = msg;
    notifyListeners();
  }

  void _clearError() {
    _error = null;
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _cancelCountdown();
    _locationSub?.cancel();
    _rideRequestSub?.cancel();
    _authSub?.cancel();
    _passengerLocationSub?.cancel();
    _locationService.dispose();
    _realtimeService.dispose();
    super.dispose();
  }
}
