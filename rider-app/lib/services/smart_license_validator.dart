import '../models/dl_verification_result.dart';

/// Client-side Deterministic Smart Validation Engine for Indian Driving Licences.
class SmartLicenseValidator {
  static const Map<String, Set<String>> vehicleClassMap = {
    'Sedan': {'LMV', 'LMV-NT', 'LMV-TR', 'CAR', 'TRANS', '3W-CAB', 'MOTOR CAR'},
    'Hatchback': {'LMV', 'LMV-NT', 'LMV-TR', 'CAR', 'TRANS', 'MOTOR CAR'},
    'SUV': {'LMV', 'LMV-NT', 'LMV-TR', 'CAR', 'TRANS', 'MOTOR CAR', 'PSV'},
    'Auto': {'3W', '3W-CAB', 'AUTO', 'LCRV', 'LMV', '3-WHEELER'},
    'Bike': {'MCWG', 'MCWOG', 'M/CYCL', '2W', 'TWO WHEELER', 'MOTORCYCLE'},
    'Other': {'LMV', 'MCWG', '3W', 'TRANS'},
  };

  /// Normalize DL number string
  static String normalizeDlNumber(String raw) {
    if (raw.isEmpty) return '';
    return raw.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
  }

  static const Set<String> indianStateCodes = {
    'AN', 'AP', 'AR', 'AS', 'BR', 'CG', 'CH', 'DD', 'DN', 'DL', 'GA', 'GJ',
    'HR', 'HP', 'JK', 'JH', 'KA', 'KL', 'LA', 'LD', 'MP', 'MH', 'MN', 'ML',
    'MZ', 'NL', 'OD', 'PB', 'PY', 'RJ', 'SK', 'TN', 'TS', 'TR', 'UP', 'UK', 'UA', 'WB'
  };

  /// Format validation for Indian Driving Licence
  static bool validateIndianDlFormat(String dlNumber) {
    final clean = normalizeDlNumber(dlNumber);
    if (clean.length < 13 || clean.length > 16) return false;

    final stateCode = clean.substring(0, 2);
    if (!indianStateCodes.contains(stateCode)) return false;

    // Must contain at least 7 numeric digits (Standard DLs have 13 digits)
    final digitCount = clean.codeUnits.where((c) => c >= 48 && c <= 57).length;
    if (digitCount < 7) return false;

    // Strict 15-char standard pattern
    if (RegExp(r'^[A-Z]{2}[0-9]{2}(?:19|20)[0-9]{2}[0-9]{7}$').hasMatch(clean)) return true;

    // Flexible pattern
    return RegExp(r'^[A-Z]{2}[0-9A-Z]{11,14}$').hasMatch(clean);
  }

  /// Parse date string (YYYY-MM-DD or DD/MM/YYYY) into DateTime object
  static DateTime? parseDate(String? raw) {
    if (raw == null || raw.trim().isEmpty) return null;
    final str = raw.trim();

    final isoMatch = RegExp(r'^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})').firstMatch(str);
    if (isoMatch != null) {
      final y = int.parse(isoMatch.group(1)!);
      final m = int.parse(isoMatch.group(2)!);
      final d = int.parse(isoMatch.group(3)!);
      return DateTime(y, m, d);
    }

    final dmyMatch = RegExp(r'^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})').firstMatch(str);
    if (dmyMatch != null) {
      final d = int.parse(dmyMatch.group(1)!);
      final m = int.parse(dmyMatch.group(2)!);
      final y = int.parse(dmyMatch.group(3)!);
      return DateTime(y, m, d);
    }

    return DateTime.tryParse(str);
  }

  /// Check vehicle class compatibility
  static MapEntry<bool, String> checkVehicleCompatibility(
    String riderVehicleType,
    List<String> dlVehicleClasses,
  ) {
    if (riderVehicleType.isEmpty) {
      return const MapEntry(true, 'Vehicle type not specified; skipped check.');
    }

    final allowedSet = vehicleClassMap[riderVehicleType] ?? {'LMV', 'MCWG', '3W'};
    final upperClasses = dlVehicleClasses.map((e) => e.trim().toUpperCase()).toSet();

    bool isCompatible = false;
    String matchedClass = '';

    for (final userCls in upperClasses) {
      for (final target in allowedSet) {
        if (userCls.contains(target) || target.contains(userCls)) {
          isCompatible = true;
          matchedClass = userCls;
          break;
        }
      }
      if (isCompatible) break;
    }

    if (isCompatible) {
      return MapEntry(true, "Licence class '$matchedClass' matches vehicle type '$riderVehicleType'.");
    } else if (upperClasses.isEmpty) {
      return const MapEntry(true, 'No vehicle class provided; compatibility check marked neutral.');
    } else {
      final classesStr = dlVehicleClasses.join(', ');
      return MapEntry(
        false,
        "Licence vehicle classes ($classesStr) may not match selected vehicle type '$riderVehicleType'.",
      );
    }
  }

  /// Evaluate user-edited or newly provided DL fields deterministically
  static DlVerificationResult evaluateFields({
    required String dlNumber,
    required String holderName,
    required String dateOfBirth,
    required String issueDate,
    required String validUntil,
    required List<String> vehicleClasses,
    required String riderVehicleType,
    String? ocrDlNumber,
    String verificationMethod = 'ai_multimodal',
  }) {
    final warnings = <String>[];
    final cleanDl = normalizeDlNumber(dlNumber);
    final isValidFormat = validateIndianDlFormat(cleanDl);

    final checks = <String, bool>{
      'document_type': true,
      'image_quality': true,
      'dl_number_format': isValidFormat,
      'date_consistency': true,
      'vehicle_compatibility': false,
      'ocr_ai_agreement': false,
    };

    if (!isValidFormat) {
      if (cleanDl.isNotEmpty) {
        warnings.add("DL number '$cleanDl' does not match a valid Indian state/RTO DL format.");
      } else {
        warnings.add("Could not extract a valid Driving Licence number.");
      }
    }

    // OCR / AI agreement
    bool hasOcrAgreement = false;
    if (ocrDlNumber != null && ocrDlNumber.isNotEmpty) {
      final cleanOcr = normalizeDlNumber(ocrDlNumber);
      if (cleanOcr == cleanDl && isValidFormat) {
        hasOcrAgreement = true;
      } else if (cleanOcr != cleanDl) {
        warnings.add("User entered DL ($cleanDl) differs from OCR scan ($cleanOcr).");
      }
    }
    checks['ocr_ai_agreement'] = hasOcrAgreement;

    // Dates check
    final dob = parseDate(dateOfBirth);
    final issueDt = parseDate(issueDate);
    final expiryDt = parseDate(validUntil);
    final now = DateTime.now();

    if (dob != null && issueDt != null && dob.isAfter(issueDt)) {
      checks['date_consistency'] = false;
      warnings.add('Date of birth is after issue date.');
    }

    if (issueDt != null && expiryDt != null && issueDt.isAfter(expiryDt)) {
      checks['date_consistency'] = false;
      warnings.add('Issue date is after expiry date.');
    }

    if (expiryDt != null && expiryDt.isBefore(now)) {
      checks['date_consistency'] = false;
      warnings.add('Licence is expired.');
    }

    // Vehicle compatibility
    final compatResult = checkVehicleCompatibility(riderVehicleType, vehicleClasses);
    checks['vehicle_compatibility'] = compatResult.key;
    if (!compatResult.key) {
      warnings.add(compatResult.value);
    }

    double score = 0.0;
    String status;
    String reason;

    if (!isValidFormat) {
      score = cleanDl.isNotEmpty ? 0.20 : 0.00;
      status = 'rejected';
      final invalidVal = cleanDl.isNotEmpty ? cleanDl : (ocrDlNumber ?? 'None');
      reason = 'DL Number "$invalidVal" is invalid (failed Indian DL format check). Please re-upload or edit.';
    } else {
      score = 0.40; // Base score for valid DL format
      if (holderName.trim().isNotEmpty) score += 0.20;
      if (dateOfBirth.trim().isNotEmpty) score += 0.20;
      if (checks['image_quality']!) score += 0.10;
      if (hasOcrAgreement) score += 0.10;

      if (score < 0.60) {
        status = 'rejected';
        reason = 'Driving Licence details could not be confidently verified.';
      } else if (score < 0.80 || holderName.trim().isEmpty || dateOfBirth.trim().isEmpty) {
        status = 'review';
        reason = 'DL Number validated, but Name or Date of Birth requires review.';
      } else {
        status = 'verified';
        reason = 'Driving Licence details (DL Number, Name, DOB) successfully validated.';
      }
    }

    score = double.parse(score.toStringAsFixed(2));

    return DlVerificationResult(
      status: status,
      confidenceScore: score,
      reason: reason,
      extractedDlNumber: cleanDl,
      holderName: holderName,
      dateOfBirth: dateOfBirth,
      issueDate: issueDate,
      validUntil: validUntil,
      vehicleClasses: vehicleClasses,
      documentType: 'driving_license',
      documentQuality: 'good',
      issuingAuthority: cleanDl.length >= 4 ? cleanDl.substring(0, 4) : '',
      checks: checks,
      warnings: warnings,
      verificationMethod: verificationMethod,
    );
  }
}
