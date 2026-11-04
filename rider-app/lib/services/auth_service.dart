import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase_config.dart';
import '../models/driver.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Abstract AuthService contract (unchanged — keeps existing AppState compatible)
// ─────────────────────────────────────────────────────────────────────────────
abstract class AuthService {
  Future<Driver?> login(String email, String password);
  Future<dynamic> signInWithGoogle();
  Future<void> logout();
  Driver? get currentDriver;
  bool get isAuthenticated;
}

// ─────────────────────────────────────────────────────────────────────────────
// SupabaseAuthService — Real Supabase + Google OAuth
// Uses the SAME Supabase project as the Traveler app.
// ─────────────────────────────────────────────────────────────────────────────
class SupabaseAuthService extends AuthService {
  Driver? _currentDriver;

  SupabaseClient? get _client => SupabaseConfig.client;

  @override
  Driver? get currentDriver => _currentDriver;

  @override
  bool get isAuthenticated => _client?.auth.currentUser != null;

  /// Get the raw Supabase user (for profile checks)
  User? get currentUser => _client?.auth.currentUser;

  /// Auth state stream (for listening to sign-in/sign-out)
  Stream<AuthState>? get authStateChanges => _client?.auth.onAuthStateChange;

  /// Sign in with Google — native Google account selector + Supabase DB upsert
  @override
  Future<dynamic> signInWithGoogle() async {
    final client = _client;
    final webClientId = SupabaseConfig.googleWebClientId.trim();

    // 1. Attempt Native Google Sign-In
    try {
      final GoogleSignIn googleSignIn = GoogleSignIn(
        serverClientId: (webClientId.isNotEmpty && !webClientId.contains('your-google'))
            ? webClientId
            : null,
        scopes: ['email', 'profile'],
      );

      try {
        await googleSignIn.signOut();
      } catch (_) {}

      final googleUser = await googleSignIn.signIn();
      if (googleUser != null) {
        final googleAuth = await googleUser.authentication;
        final idToken = googleAuth.idToken;
        final accessToken = googleAuth.accessToken;

        if (client != null && idToken != null) {
          final response = await client.auth.signInWithIdToken(
            provider: OAuthProvider.google,
            idToken: idToken,
            accessToken: accessToken,
          );

          if (response.user != null) {
            final user = response.user!;
            try {
              final existing = await client.from('riders').select().eq('id', user.id).maybeSingle();
              if (existing == null) {
                // Insert initial skeleton ONLY if driver row doesn't exist yet
                await client.from('riders').insert({
                  'id': user.id,
                  'user_id': user.id,
                  'name': googleUser.displayName ?? user.email?.split('@').first ?? 'Rider',
                  'email': user.email ?? googleUser.email,
                  'profile_image_url': googleUser.photoUrl ?? '',
                  'is_online': false,
                  'is_available': false,
                  'updated_at': DateTime.now().toIso8601String(),
                });
                debugPrint('[SupabaseAuth] Created initial rider skeleton row in Supabase: ${user.email}');
              } else {
                debugPrint('[SupabaseAuth] Existing rider row found in Supabase for ${user.email}. Preserving existing registration data.');
              }
            } catch (dbErr) {
              debugPrint('[SupabaseAuth] Notice inserting initial rider DB row: $dbErr');
            }
          }

          return response;
        }
      }
    } catch (nativeErr) {
      debugPrint('[AuthService] Native Google Sign-In notice (ApiException 10 fallback): $nativeErr');
      if (client != null) {
        try {
          final res = await client.auth.signInWithOAuth(
            OAuthProvider.google,
            redirectTo: kIsWeb ? null : 'io.supabase.rider://login-callback',
            authScreenLaunchMode: LaunchMode.externalApplication,
          );
          return res;
        } catch (oauthErr) {
          debugPrint('[AuthService] OAuth fallback notice: $oauthErr');
        }
      }
    }

    return null;
  }

  /// Set the cached driver profile after Supabase profile is loaded.
  void setCurrentDriver(Driver driver) {
    _currentDriver = driver;
  }

  /// Clear the cached driver profile on logout.
  void clearDriver() {
    _currentDriver = null;
  }

  /// Sign out from both Supabase and Google.
  @override
  Future<void> logout() async {
    try {
      await _client?.auth.signOut();
    } catch (_) {}
    try {
      final googleSignIn = GoogleSignIn();
      if (await googleSignIn.isSignedIn()) {
        await googleSignIn.signOut();
      }
    } catch (_) {}
    _currentDriver = null;
  }

  /// Legacy email/password login — kept for interface compatibility.
  /// Prefer signInWithGoogle() for production use.
  @override
  Future<Driver?> login(String email, String password) async {
    final client = _client;
    if (client == null) {
      throw AuthException('Supabase is not initialized.');
    }

    try {
      final response = await client.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );

      if (response.user != null) {
        debugPrint('[SupabaseAuth] Email login OK: ${response.user!.email}');
      }

      return null; // Rider profile is loaded separately via RiderRepository
    } on AuthException {
      rethrow;
    } catch (e) {
      throw AuthException(e.toString());
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MockAuthService — kept for simulator / offline testing
// ─────────────────────────────────────────────────────────────────────────────
class MockAuthService extends AuthService {
  Driver? _currentDriver;

  static const String _mockEmail = 'driver@nearbyride.com';
  static const String _mockPassword = '123456';

  @override
  Future<Driver?> login(String email, String password) async {
    await Future.delayed(const Duration(seconds: 2));

    if (email.trim().toLowerCase() == _mockEmail &&
        password == _mockPassword) {
      _currentDriver = Driver.mock();
      debugPrint('[MockAuth] Login successful for $email');
      return _currentDriver;
    }

    throw AuthException('Invalid email or password');
  }

  @override
  Future<Driver?> signInWithGoogle() async {
    try {
      final googleSignIn = GoogleSignIn(scopes: ['email', 'profile']);
      try {
        await googleSignIn.signOut();
      } catch (_) {}

      final googleUser = await googleSignIn.signIn();
      if (googleUser != null) {
        _currentDriver = Driver(
          id: googleUser.id,
          userId: googleUser.id,
          name: googleUser.displayName ?? 'Google Rider',
          email: googleUser.email,
          phone: '+91 98765 43210',
          vehicleType: 'Sedan',
          vehicleNumber: 'MH 04 AB 1234',
          vehicleModel: 'Maruti Suzuki Dzire',
          profileImageUrl: googleUser.photoUrl ?? '',
          rating: 4.9,
          totalRides: 0,
          todayEarnings: 0,
          todayRides: 0,
          isOnline: false,
          isAvailable: false,
        );
        debugPrint('[MockAuth] Selected Google account: ${googleUser.email}');
        return _currentDriver;
      }
      return null;
    } catch (e) {
      debugPrint('[MockAuthService] Google Sign In fallback: $e');
      _currentDriver = Driver.mock().copyWith(
        name: 'Google Rider',
        email: 'rider.google@nearbyride.com',
      );
      return _currentDriver;
    }
  }

  @override
  Future<void> logout() async {
    await Future.delayed(const Duration(milliseconds: 500));
    _currentDriver = null;
    debugPrint('[MockAuth] Logged out');
  }

  @override
  Driver? get currentDriver => _currentDriver;

  @override
  bool get isAuthenticated => _currentDriver != null;
}

class AuthException implements Exception {
  final String message;
  AuthException(this.message);

  @override
  String toString() => message;
}
