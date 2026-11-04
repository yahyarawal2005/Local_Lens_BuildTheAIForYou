import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Reverse-geocoding service to convert GPS coordinates into human-readable Location Names
class GeocodingService {
  static final Map<String, String> _cache = {};

  /// Convert (lat, lon) into a clean human-readable Location Name
  static Future<String> getLocationName(double lat, double lon, {String fallbackCity = ''}) async {
    if (lat == 0.0 || lon == 0.0) {
      return fallbackCity.isNotEmpty ? fallbackCity : 'Panvel, Navi Mumbai';
    }

    final key = '${lat.toStringAsFixed(3)},${lon.toStringAsFixed(3)}';
    if (_cache.containsKey(key)) {
      return _cache[key]!;
    }

    // 1. Fast local coordinate boundary lookup
    String? localName = _getLocalAreaName(lat, lon);
    if (localName != null) {
      _cache[key] = localName;
    }

    // 2. Async reverse-geocoding fetch from OpenStreetMap
    try {
      final uri = Uri.parse(
          'https://nominatim.openstreetmap.org/reverse?lat=$lat&lon=$lon&format=json&addressdetails=1');
      final response = await http.get(uri, headers: {
        'User-Agent': 'LocalLensRiderApp/1.0',
      }).timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final addr = data['address'] as Map<String, dynamic>?;
        if (addr != null) {
          final neighbourhood = addr['suburb'] ??
              addr['neighbourhood'] ??
              addr['residential'] ??
              addr['commercial'] ??
              addr['quarter'] ??
              addr['district'] ??
              addr['city_district'];
          final city = addr['city'] ?? addr['town'] ?? addr['county'] ?? addr['state_district'] ?? 'Mumbai';

          String resolved;
          if (neighbourhood != null && neighbourhood.toString().isNotEmpty) {
            resolved = '${neighbourhood.toString()}, ${city.toString()}';
          } else {
            resolved = city.toString();
          }

          _cache[key] = resolved;
          return resolved;
        }
      }
    } catch (e) {
      debugPrint('[GeocodingService] Reverse geocode fetch notice: $e');
    }

    return localName ?? (fallbackCity.isNotEmpty ? fallbackCity : 'Panvel, Navi Mumbai');
  }

  /// Instant local area boundary lookup
  static String? _getLocalAreaName(double lat, double lon) {
    if (lat >= 18.95 && lat <= 19.03 && lon >= 73.08 && lon <= 73.15) {
      return 'Panvel, Navi Mumbai';
    }
    if (lat >= 19.02 && lat <= 19.06 && lon >= 73.02 && lon <= 73.08) {
      return 'Kharghar, Navi Mumbai';
    }
    if (lat >= 19.06 && lat <= 19.10 && lon >= 72.98 && lon <= 73.03) {
      return 'Vashi, Navi Mumbai';
    }
    if (lat >= 19.04 && lat <= 19.08 && lon >= 72.82 && lon <= 72.88) {
      return 'Bandra, Mumbai';
    }
    if (lat >= 19.10 && lat <= 19.15 && lon >= 72.81 && lon <= 72.87) {
      return 'Andheri West, Mumbai';
    }
    if (lat >= 18.90 && lat <= 18.95 && lon >= 72.81 && lon <= 72.85) {
      return 'Colaba, Mumbai';
    }
    if (lat >= 18.98 && lat <= 19.03 && lon >= 72.81 && lon <= 72.85) {
      return 'Worli, Mumbai';
    }
    return null;
  }
}
