import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/dl_verification_result.dart';
import 'driving_license_ocr_service.dart';
import 'smart_license_validator.dart';

class AiLicenseValidatorService {
  /// Base URL for backend API
  static const String _defaultBackendUrl = 'http://10.0.2.2:8000/api/v1/rider/validate-driving-license'; // Android emulator
  static const String _localhostBackendUrl = 'http://localhost:8000/api/v1/rider/validate-driving-license'; // Windows / Web / iOS

  /// Main entry point: validates Driving Licence image via AI backend + local OCR fallback.
  static Future<DlVerificationResult> validateLicence({
    required String imagePath,
    required String vehicleType,
  }) async {
    if (imagePath.trim().isEmpty) {
      return DlVerificationResult.fallback(
        dlNumber: '',
        reason: 'No image file provided.',
        isValidFormat: false,
        warnings: ['No image file provided for analysis.'],
        vehicleType: vehicleType,
      );
    }

    // 1. Run local ML Kit OCR as parallel fallback signal & for OCR/AI agreement comparison
    String ocrExtractedNumber = '';
    String ocrHolderName = '';
    String ocrDob = '';

    try {
      final ocrResult = await DrivingLicenseOcrService.extractFromImage(imagePath);
      ocrExtractedNumber = ocrResult.extractedNumber;
      ocrHolderName = ocrResult.holderName;
      ocrDob = ocrResult.dateOfBirth;
      debugPrint('[AI DL Validator] ML Kit OCR candidate: $ocrExtractedNumber, Name: $ocrHolderName, DOB: $ocrDob');
    } catch (e) {
      debugPrint('[AI DL Validator] ML Kit OCR error (continuing with AI backend): $e');
    }

    // 2. Attempt to call FastAPI backend AI verification endpoint
    try {
      final targetUrl = (Platform.isAndroid) ? _defaultBackendUrl : _localhostBackendUrl;
      debugPrint('[AI DL Validator] Calling backend endpoint: $targetUrl (vehicleType: $vehicleType)');

      final uri = Uri.parse(targetUrl);
      final request = http.MultipartRequest('POST', uri);

      request.fields['vehicle_type'] = vehicleType;
      if (ocrExtractedNumber.isNotEmpty) {
        request.fields['ocr_dl_number'] = ocrExtractedNumber;
      }

      final file = File(imagePath);
      if (await file.exists()) {
        final stream = http.ByteStream(file.openRead());
        final length = await file.length();
        final multipartFile = http.MultipartFile(
          'image',
          stream,
          length,
          filename: imagePath.split(Platform.pathSeparator).last,
        );
        request.files.add(multipartFile);
      } else {
        throw Exception('File does not exist at $imagePath');
      }

      final streamedResponse = await request.send().timeout(const Duration(milliseconds: 2500));
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final Map<String, dynamic> responseJson = json.decode(response.body);
        debugPrint('[AI DL Validator] Backend AI response received in < 2.5s');
        return DlVerificationResult.fromJson(responseJson);
      } else {
        debugPrint('[AI DL Validator] Backend returned status code ${response.statusCode}: ${response.body}');
      }
    } catch (e) {
      debugPrint('[AI DL Validator] Backend HTTP call failed ($e). Falling back to local OCR + Deterministic Smart Validator.');
    }

    // 3. Fallback: Process locally using ML Kit OCR result + SmartLicenseValidator engine
    final cleanDl = SmartLicenseValidator.normalizeDlNumber(ocrExtractedNumber);

    return SmartLicenseValidator.evaluateFields(
      dlNumber: cleanDl,
      holderName: ocrHolderName,
      dateOfBirth: ocrDob,
      issueDate: '',
      validUntil: '',
      vehicleClasses: vehicleType == 'Bike' ? ['MCWG'] : (vehicleType == 'Auto' ? ['3W'] : ['LMV']),
      riderVehicleType: vehicleType,
      ocrDlNumber: ocrExtractedNumber,
      verificationMethod: 'ml_kit_ocr_fallback',
    );
  }
}
