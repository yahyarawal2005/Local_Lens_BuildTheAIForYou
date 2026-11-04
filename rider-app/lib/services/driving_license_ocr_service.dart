import 'package:flutter/foundation.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'smart_license_validator.dart';

/// Result of OCR extraction & validation
class DrivingLicenseOcrResult {
  final String extractedNumber;
  final String holderName;
  final String dateOfBirth;
  final String rawText;
  final bool isValidFormat;
  final String status;
  final String message;

  DrivingLicenseOcrResult({
    required this.extractedNumber,
    this.holderName = '',
    this.dateOfBirth = '',
    required this.rawText,
    required this.isValidFormat,
    required this.status,
    required this.message,
  });

  factory DrivingLicenseOcrResult.failed(String msg, {String raw = ''}) {
    return DrivingLicenseOcrResult(
      extractedNumber: '',
      holderName: '',
      dateOfBirth: '',
      rawText: raw,
      isValidFormat: false,
      status: 'extraction_failed',
      message: msg,
    );
  }
}

class DrivingLicenseOcrService {
  /// Extract DL number, Holder Name & DOB from an image at [imagePath]
  static Future<DrivingLicenseOcrResult> extractFromImage(String imagePath) async {
    if (imagePath.trim().isEmpty) {
      return DrivingLicenseOcrResult.failed('No image path provided.');
    }

    TextRecognizer? textRecognizer;
    try {
      final inputImage = InputImage.fromFilePath(imagePath);
      textRecognizer = TextRecognizer(script: TextRecognitionScript.latin);
      final RecognizedText recognizedText = await textRecognizer.processImage(inputImage);
      
      final String fullText = recognizedText.text;
      debugPrint('[DL OCR Service] Raw OCR text extracted:\n$fullText');

      if (fullText.trim().isEmpty) {
        return DrivingLicenseOcrResult.failed('No text detected in the image. Please try a clearer photo.', raw: fullText);
      }

      final candidate = parseAndNormalizeDlNumber(fullText);
      final holderName = parseHolderName(fullText);
      final dob = parseDateOfBirth(fullText);

      if (candidate.isEmpty) {
        return DrivingLicenseOcrResult.failed(
          'Could not auto-detect a valid Driving Licence number format. Please enter it manually.',
          raw: fullText,
        );
      }

      final isValid = validateIndianDlFormat(candidate);
      return DrivingLicenseOcrResult(
        extractedNumber: candidate,
        holderName: holderName,
        dateOfBirth: dob,
        rawText: fullText,
        isValidFormat: isValid,
        status: isValid ? 'needs_confirmation' : 'invalid_format',
        message: isValid
            ? 'Licence details detected! Please confirm or edit.'
            : 'Extracted DL number candidate ($candidate) has unusual format. Please verify.',
      );
    } catch (e) {
      debugPrint('[DL OCR Service] OCR process error: $e');
      return DrivingLicenseOcrResult.failed(
        'Could not process image with OCR. Please enter your DL number manually.',
      );
    } finally {
      await textRecognizer?.close();
    }
  }

  /// Parse raw OCR text to find candidate Indian DL Number
  static String parseAndNormalizeDlNumber(String text) {
    if (text.isEmpty) return '';

    final lines = text.split(RegExp(r'[\r\n]+'));

    // Regex 1: Strict 15-char standard Indian DL pattern:
    // SS RR YYYY NNNNNNN (State code + 2 digits + 4 year digits + 7 serial digits)
    final strictDlRegex = RegExp(r'\b([A-Za-z]{2}[\s\/\-]?[0-9]{2}[\s\/\-]?(?:19|20)[0-9]{2}[\s\/\-]?[0-9]{7})\b');
    for (final line in lines) {
      final match = strictDlRegex.firstMatch(line);
      if (match != null) {
        final cand = normalizeDlString(match.group(1)!);
        if (validateIndianDlFormat(cand)) {
          return cand;
        }
      }
    }

    // Regex 2: Flexible pattern requiring State Code + digits
    final flexDlRegex = RegExp(r'\b([A-Za-z]{2}[\s\/\-]?[0-9A-Za-z\s\/\-]{11,16})\b');
    for (final line in lines) {
      final cleanLine = line.toUpperCase().trim();
      if (_isIgnoredKeyword(cleanLine)) continue;

      final match = flexDlRegex.firstMatch(line);
      if (match != null) {
        final candidate = normalizeDlString(match.group(1)!);
        if (validateIndianDlFormat(candidate)) {
          return candidate;
        }
      }
    }

    // Regex 3: Global match on full text without linebreaks
    final wholeTextClean = text.replaceAll(RegExp(r'[\r\n]+'), ' ');
    final globalMatch = strictDlRegex.firstMatch(wholeTextClean);
    if (globalMatch != null) {
      final cand = normalizeDlString(globalMatch.group(1)!);
      if (validateIndianDlFormat(cand)) {
        return cand;
      }
    }

    return '';
  }

  /// Remove spaces, hyphens and convert to uppercase
  static String normalizeDlString(String raw) {
    String cleaned = raw.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
    return cleaned;
  }

  /// Format validation for Indian Driving Licence
  static bool validateIndianDlFormat(String dlNumber) {
    final clean = normalizeDlString(dlNumber);

    if (clean.length < 13 || clean.length > 16) return false;

    // Check if starts with 2 valid state letters
    final stateCode = clean.substring(0, 2);
    if (!SmartLicenseValidator.indianStateCodes.contains(stateCode)) return false;

    // Must contain at least 7 numeric digits (Standard DLs have 13 digits)
    final digitCount = clean.codeUnits.where((c) => c >= 48 && c <= 57).length;
    if (digitCount < 7) return false;

    // Strict 15-char standard pattern (SS-RR-YYYY-NNNNNNN)
    final strictPattern = RegExp(r'^[A-Z]{2}[0-9]{2}(?:19|20)[0-9]{2}[0-9]{7}$');
    if (strictPattern.hasMatch(clean)) return true;

    // Flexible pattern (legacy DLs)
    final flexiblePattern = RegExp(r'^[A-Z]{2}[0-9A-Z]{11,14}$');
    return flexiblePattern.hasMatch(clean);
  }

  /// Parse Holder Name from raw OCR text
  static String parseHolderName(String text) {
    if (text.isEmpty) return '';
    final lines = text.split(RegExp(r'[\r\n]+'));

    for (int i = 0; i < lines.length; i++) {
      final line = lines[i].trim();
      final upper = line.toUpperCase();

      // Look for "Name:" or "Name" prefix
      final namePrefixMatch = RegExp(
        r'^(?:NAME|HOLDER(?:\s+NAME)?|DRIVER(?:\s+NAME)?)\s*[\:\-]?\s*(.+)$',
        caseSensitive: false,
      ).firstMatch(line);

      if (namePrefixMatch != null) {
        final candidate = namePrefixMatch.group(1)!.trim().toUpperCase();
        if (candidate.length >= 3 && !_isIgnoredKeyword(candidate)) {
          return _cleanName(candidate);
        }
      }

      // If line is just "NAME", check next line
      if (upper == 'NAME' || upper == 'NAME:' || upper == 'HOLDER NAME') {
        if (i + 1 < lines.length) {
          final nextLine = lines[i + 1].trim().toUpperCase();
          if (nextLine.length >= 3 && !_isIgnoredKeyword(nextLine)) {
            return _cleanName(nextLine);
          }
        }
      }
    }

    // Fallback: search for uppercase name-like line with space
    for (final line in lines) {
      final clean = line.trim().toUpperCase();
      if (clean.length >= 4 && clean.contains(' ') && RegExp(r'^[A-Z\s\.]{4,30}$').hasMatch(clean)) {
        if (!_isIgnoredKeyword(clean)) {
          return _cleanName(clean);
        }
      }
    }

    return '';
  }

  /// Parse Date of Birth from raw OCR text
  static String parseDateOfBirth(String text) {
    if (text.isEmpty) return '';

    // Search for "DOB", "D.O.B", "Date of Birth" followed by date
    final dobRegex = RegExp(
      r'(?:DOB|D\.O\.B|DATE\s*OF\s*BIRTH|BIRTH)\s*[\:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})',
      caseSensitive: false,
    );
    final match = dobRegex.firstMatch(text);
    if (match != null) {
      return _normalizeDate(match.group(1)!);
    }

    // Fallback: Find generic birth date string (year between 1940 and 2010)
    final genericDateRegex = RegExp(r'\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.](?:19[4-9]\d|20[0-1]\d))\b');
    final genericMatch = genericDateRegex.firstMatch(text);
    if (genericMatch != null) {
      return _normalizeDate(genericMatch.group(1)!);
    }

    return '';
  }

  static bool _isIgnoredKeyword(String str) {
    final ignored = {
      'DRIVING', 'LICENCE', 'LICENSE', 'UNION', 'INDIA', 'STATE', 'TRANSPORT', 'DEPARTMENT',
      'FORM', 'AUTHORITY', 'GOVERNMENT', 'NAME', 'ADDRESS', 'SIGNATURE', 'BLOOD', 'GROUP',
      'ISSUE', 'VALID', 'EXPIRY', 'DOB', 'DATE', 'SON', 'DAUGHTER', 'WIFE', 'SDW'
    };
    for (final word in str.split(RegExp(r'\s+'))) {
      if (ignored.contains(word)) return true;
    }
    return false;
  }

  static String _cleanName(String raw) {
    return raw.replaceAll(RegExp(r'[^A-Z\s\.]'), '').replaceAll(RegExp(r'\s+'), ' ').trim();
  }

  static String _normalizeDate(String raw) {
    final parts = raw.replaceAll(RegExp(r'[^\d]'), '-').split('-').where((p) => p.isNotEmpty).toList();
    if (parts.length == 3) {
      if (parts[0].length == 4) {
        return '${parts[0]}-${parts[1].padLeft(2, '0')}-${parts[2].padLeft(2, '0')}';
      } else if (parts[2].length == 4) {
        return '${parts[2]}-${parts[1].padLeft(2, '0')}-${parts[0].padLeft(2, '0')}';
      }
    }
    return raw;
  }
}
