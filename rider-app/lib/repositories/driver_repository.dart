import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase_config.dart';
import '../models/driver.dart';

/// Abstract driver repository for future Supabase integration
abstract class DriverRepository {
  Future<Driver> getDriver(String id);
  Future<void> updateDriver(Driver driver);
  Future<void> updateLocation(String driverId, double lat, double lng);
  Future<void> setOnlineStatus(String driverId, bool isOnline);
}

/// Mock driver repository
class MockDriverRepository extends DriverRepository {
  Driver? _driver;

  @override
  Future<Driver> getDriver(String id) async {
    await Future.delayed(const Duration(milliseconds: 300));
    _driver ??= Driver.mock();
    return _driver!;
  }

  @override
  Future<void> updateDriver(Driver driver) async {
    await Future.delayed(const Duration(milliseconds: 200));
    _driver = driver;
    debugPrint('[MockDriverRepo] Driver updated: ${driver.name}');
  }

  @override
  Future<void> updateLocation(String driverId, double lat, double lng) async {
    if (_driver != null && _driver!.id == driverId) {
      _driver = _driver!.copyWith(
        latitude: lat,
        longitude: lng,
        updatedAt: DateTime.now(),
      );
    }
  }

  @override
  Future<void> setOnlineStatus(String driverId, bool isOnline) async {
    await Future.delayed(const Duration(milliseconds: 200));
    if (_driver != null && _driver!.id == driverId) {
      _driver = _driver!.copyWith(
        isOnline: isOnline,
        isAvailable: isOnline,
      );
    }
    debugPrint('[MockDriverRepo] Online status: $isOnline');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SupabaseDriverRepository — Real Supabase implementation
// ─────────────────────────────────────────────────────────────────────────────
class SupabaseDriverRepository extends DriverRepository {
  SupabaseClient? get _client => SupabaseConfig.client;

  bool _isValidUuid(String str) {
    final uuidRegExp = RegExp(
      r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    );
    return uuidRegExp.hasMatch(str.trim());
  }

  @override
  Future<Driver> getDriver(String id) async {
    final client = _client;
    if (client == null) return Driver.mock();

    String targetId = id.trim();
    final currentUser = client.auth.currentUser;

    if (!_isValidUuid(targetId)) {
      if (currentUser != null && _isValidUuid(currentUser.id)) {
        targetId = currentUser.id;
      } else {
        debugPrint('[SupabaseDriverRepo] Provided id ($id) is not a valid UUID. Returning mock driver.');
        return Driver.mock();
      }
    }

    try {
      final response = await client
          .from('riders')
          .select()
          .eq('id', targetId)
          .maybeSingle();

      if (response == null) {
        // Driver profile doesn't exist in Supabase DB yet.
        // Construct clean profile from Supabase Auth user metadata & insert into DB.
        final email = currentUser?.email ?? '';
        final rawName = currentUser?.userMetadata?['full_name'] ??
            currentUser?.userMetadata?['name'] ??
            (email.contains('@') ? email.split('@').first : 'Rider');
        final name = (rawName is String && rawName.trim().isNotEmpty) ? rawName.trim() : 'Rider';
        final avatar = currentUser?.userMetadata?['avatar_url'] ??
            currentUser?.userMetadata?['picture'] ??
            '';

        final newDriver = Driver(
          id: targetId,
          userId: targetId,
          name: name,
          phone: currentUser?.phone ?? '',
          email: email,
          vehicleType: 'Sedan',
          vehicleNumber: '',
          vehicleModel: '',
          profileImageUrl: avatar is String ? avatar : '',
          rating: 4.9,
          totalRides: 0,
          todayEarnings: 0.0,
          todayRides: 0,
          isOnline: false,
          isAvailable: false,
          latitude: 19.0760,
          longitude: 72.8777,
          updatedAt: DateTime.now(),
        );

        debugPrint('[SupabaseDriverRepo] No existing rider record found for $targetId. Creating new rider in riders table...');
        await updateDriver(newDriver);
        return newDriver;
      }

      List<String> parsedVehicleClasses = [];
      if (response['license_vehicle_classes'] != null) {
        if (response['license_vehicle_classes'] is List) {
          parsedVehicleClasses = (response['license_vehicle_classes'] as List).map((e) => e.toString()).toList();
        }
      }

      final isRegCompletedInDb = response['is_registration_completed'] == true;

      final fetchedDriver = Driver(
        id: response['id']?.toString() ?? targetId,
        userId: response['user_id']?.toString() ?? targetId,
        name: response['name']?.toString() ?? 'Rider',
        phone: response['phone']?.toString() ?? '',
        email: response['email']?.toString() ?? '',
        vehicleType: response['vehicle_type']?.toString() ?? 'Sedan',
        vehicleNumber: response['vehicle_number']?.toString() ?? response['vehicle_plate']?.toString() ?? '',
        vehicleModel: response['vehicle_model']?.toString() ?? '',
        vehicleColor: response['vehicle_color']?.toString() ?? 'White',
        profileImageUrl: response['profile_image_url']?.toString() ?? '',
        licenseNumber: response['license_number']?.toString() ?? '',
        licenseVerificationStatus: response['license_verification_status']?.toString() ??
            (response['license_number'] != null && response['license_number'].toString().isNotEmpty
                ? 'verified'
                : 'not_uploaded'),
        licenseVerificationMethod: response['license_verification_method']?.toString() ?? 'ai_multimodal',
        licenseVerifiedAt: response['license_verified_at'] != null
            ? DateTime.tryParse(response['license_verified_at'].toString())
            : null,
        licenseHolderName: response['license_holder_name']?.toString() ?? '',
        licenseDateOfBirth: response['license_date_of_birth']?.toString() ?? '',
        licenseIssueDate: response['license_issue_date']?.toString() ?? '',
        licenseValidUntil: response['license_valid_until']?.toString() ?? '',
        licenseVehicleClasses: parsedVehicleClasses,
        licenseConfidenceScore: (response['license_confidence_score'] as num?)?.toDouble() ?? 0.0,
        licenseVerificationReason: response['license_verification_reason']?.toString() ?? '',
        city: response['city']?.toString() ?? '',
        rating: (response['rating'] as num?)?.toDouble() ?? 4.9,
        totalRides: response['total_rides'] ?? 0,
        todayEarnings: (response['today_earnings'] as num?)?.toDouble() ?? 0.0,
        todayRides: response['today_rides'] ?? 0,
        isOnline: response['is_online'] ?? false,
        isAvailable: response['is_available'] ?? false,
        latitude: (response['latitude'] as num?)?.toDouble() ?? 19.0760,
        longitude: (response['longitude'] as num?)?.toDouble() ?? 72.8777,
        isRegistrationCompleted: isRegCompletedInDb,
      );

      final isFullyCompleted = isRegCompletedInDb || fetchedDriver.isProfileCompleted;
      return fetchedDriver.copyWith(isRegistrationCompleted: isFullyCompleted);
    } catch (e) {
      debugPrint('[SupabaseDriverRepo] Error fetching driver: $e');
      return Driver.mock().copyWith(id: targetId, userId: targetId);
    }
  }

  @override
  Future<void> updateDriver(Driver driver) async {
    final client = _client;
    if (client == null) return;

    final currentUser = client.auth.currentUser;
    String targetId = driver.id.trim();
    if (!_isValidUuid(targetId) && currentUser != null && _isValidUuid(currentUser.id)) {
      targetId = currentUser.id;
    }

    if (!_isValidUuid(targetId)) {
      debugPrint('[SupabaseDriverRepo] Cannot update driver: invalid UUID (${driver.id})');
      return;
    }

    String userId = driver.userId.trim();
    if (!_isValidUuid(userId)) {
      userId = targetId;
    }

    final isCompleted = driver.isRegistrationCompleted || driver.isProfileCompleted;

    final payload = <String, dynamic>{
      'id': targetId,
      'user_id': userId,
      'name': driver.name,
      'phone': driver.phone,
      'email': driver.email,
      'profile_image_url': driver.profileImageUrl,
      'vehicle_type': driver.vehicleType,
      'vehicle_number': driver.vehicleNumber,
      'vehicle_model': driver.vehicleModel,
      'vehicle_color': driver.vehicleColor,
      'city': driver.city,
      'rating': driver.rating,
      'total_rides': driver.totalRides,
      'today_earnings': driver.todayEarnings,
      'today_rides': driver.todayRides,
      'is_online': driver.isOnline,
      'is_available': driver.isAvailable,
      'latitude': driver.latitude,
      'longitude': driver.longitude,
      'is_registration_completed': isCompleted,
      'license_number': driver.licenseNumber,
      'license_verification_status': driver.licenseVerificationStatus,
      'license_verification_method': driver.licenseVerificationMethod,
      'license_verified_at': (driver.licenseVerifiedAt ?? DateTime.now()).toIso8601String(),
      'license_holder_name': driver.licenseHolderName,
      'license_date_of_birth': driver.licenseDateOfBirth.trim().isNotEmpty ? driver.licenseDateOfBirth.trim() : null,
      'license_issue_date': driver.licenseIssueDate.trim().isNotEmpty ? driver.licenseIssueDate.trim() : null,
      'license_valid_until': driver.licenseValidUntil.trim().isNotEmpty ? driver.licenseValidUntil.trim() : null,
      'license_vehicle_classes': driver.licenseVehicleClasses,
      'license_confidence_score': driver.licenseConfidenceScore,
      'license_verification_reason': driver.licenseVerificationReason,
      'updated_at': DateTime.now().toIso8601String(),
    };

    try {
      await client.from('riders').upsert(payload);
      debugPrint('[SupabaseDriverRepo] Successfully upserted rider row in Supabase: id=$targetId, name=${driver.name}, vehicle=${driver.vehicleNumber}, DL=${driver.licenseNumber}, isCompleted=$isCompleted');
    } catch (e) {
      debugPrint('[SupabaseDriverRepo] Error updating driver in Supabase riders table: $e');
      // If full upsert failed due to missing column schema in older DB, try core fallback fields
      try {
        final fallbackPayload = Map<String, dynamic>.from(payload);
        fallbackPayload.remove('is_registration_completed');
        fallbackPayload.remove('vehicle_color');
        fallbackPayload.remove('city');
        await client.from('riders').upsert(fallbackPayload);
        debugPrint('[SupabaseDriverRepo] Fallback upsert succeeded!');
      } catch (fallbackErr) {
        debugPrint('[SupabaseDriverRepo] Fallback upsert failed: $fallbackErr');
      }
    }
  }

  @override
  Future<void> updateLocation(String driverId, double lat, double lng) async {
    final client = _client;
    if (client == null) return;

    String targetId = driverId.trim();
    if (!_isValidUuid(targetId)) {
      final currentUser = client.auth.currentUser;
      if (currentUser != null && _isValidUuid(currentUser.id)) {
        targetId = currentUser.id;
      } else {
        return;
      }
    }

    try {
      await client.from('riders').update({
        'latitude': lat,
        'longitude': lng,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', targetId);
    } catch (e) {
      debugPrint('[SupabaseDriverRepo] Error updating location: $e');
    }
  }

  @override
  Future<void> setOnlineStatus(String driverId, bool isOnline) async {
    final client = _client;
    if (client == null) return;

    String targetId = driverId.trim();
    if (!_isValidUuid(targetId)) {
      final currentUser = client.auth.currentUser;
      if (currentUser != null && _isValidUuid(currentUser.id)) {
        targetId = currentUser.id;
      } else {
        return;
      }
    }

    try {
      await client.from('riders').update({
        'is_online': isOnline,
        'is_available': isOnline,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', targetId);
      debugPrint('[SupabaseDriverRepo] Set online status=$isOnline for driverId=$targetId');
    } catch (e) {
      debugPrint('[SupabaseDriverRepo] Error updating online status: $e');
    }
  }
}

