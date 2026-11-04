import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Supabase configuration for the Rider app.
/// Uses the SAME Supabase project as the Traveler app.
/// Credentials are loaded from .env (never hard-coded).
class SupabaseConfig {
  SupabaseConfig._();

  static bool _isInitialized = false;
  static bool get isInitialized => _isInitialized;

  static String get supabaseUrl => dotenv.env['SUPABASE_URL'] ?? '';
  static String get supabaseAnonKey => dotenv.env['SUPABASE_ANON_KEY'] ?? '';
  static String get googleWebClientId =>
      dotenv.env['GOOGLE_WEB_CLIENT_ID'] ?? '';

  static bool get hasValidCredentials {
    final url = supabaseUrl.trim();
    final key = supabaseAnonKey.trim();
    return url.isNotEmpty &&
        !url.contains('your-project-id') &&
        key.isNotEmpty &&
        !key.contains('your-supabase-anon-key');
  }

  /// Initialize Supabase client (safe — idempotent).
  static Future<void> initialize() async {
    if (_isInitialized) return;

    if (hasValidCredentials) {
      try {
        await Supabase.initialize(
          url: supabaseUrl,
          // ignore: deprecated_member_use
          anonKey: supabaseAnonKey,
          authOptions: const FlutterAuthClientOptions(
            authFlowType: AuthFlowType.pkce,
          ),
        );
        _isInitialized = true;
      } catch (e) {
        _isInitialized = false;
      }
    }
  }

  /// Returns the Supabase client or null if not initialized.
  static SupabaseClient? get client {
    if (_isInitialized) {
      try {
        return Supabase.instance.client;
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}
