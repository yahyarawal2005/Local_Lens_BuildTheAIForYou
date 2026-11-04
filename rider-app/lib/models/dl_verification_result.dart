/// Representation of the structured outcome of Driving Licence verification.
class DlVerificationResult {
  /// 'verified', 'review', or 'rejected'
  final String status;

  /// Confidence score between 0.0 and 1.0 (0% - 100%)
  final double confidenceScore;

  /// Human readable explanation summary
  final String reason;

  /// Extracted fields
  final String extractedDlNumber;
  final String holderName;
  final String dateOfBirth;
  final String issueDate;
  final String validUntil;
  final List<String> vehicleClasses;
  final String documentType;
  final String documentQuality;
  final String issuingAuthority;

  /// Individual check results
  final Map<String, bool> checks;

  /// List of warning strings
  final List<String> warnings;

  /// Method used for verification ('ai_multimodal' or 'ml_kit_ocr_fallback')
  final String verificationMethod;

  DlVerificationResult({
    required this.status,
    required this.confidenceScore,
    required this.reason,
    required this.extractedDlNumber,
    required this.holderName,
    required this.dateOfBirth,
    required this.issueDate,
    required this.validUntil,
    required this.vehicleClasses,
    required this.documentType,
    required this.documentQuality,
    required this.issuingAuthority,
    required this.checks,
    required this.warnings,
    required this.verificationMethod,
  });

  bool get isVerified => status == 'verified';
  bool get isReview => status == 'review';
  bool get isRejected => status == 'rejected';

  int get confidencePercentage => (confidenceScore * 100).round().clamp(0, 100);

  /// Status badge label using prompt compliance terminology
  String get statusTitle {
    switch (status) {
      case 'verified':
        return 'AI Verified';
      case 'review':
        return 'Verification Requires Review';
      case 'rejected':
      default:
        return 'Verification Failed';
    }
  }

  factory DlVerificationResult.fromJson(Map<String, dynamic> json) {
    final ext = json['extracted'] as Map<String, dynamic>? ?? {};
    final checksRaw = json['checks'] as Map<String, dynamic>? ?? {};
    final warningsRaw = json['warnings'] as List? ?? [];

    List<String> classes = [];
    if (ext['vehicle_classes'] is List) {
      classes = (ext['vehicle_classes'] as List).map((e) => e.toString()).toList();
    }

    Map<String, bool> parsedChecks = {};
    checksRaw.forEach((k, v) {
      parsedChecks[k] = v == true;
    });

    return DlVerificationResult(
      status: json['status']?.toString() ?? 'rejected',
      confidenceScore: (json['confidence'] as num?)?.toDouble() ?? 0.0,
      reason: json['reason']?.toString() ?? 'Verification outcome computed.',
      extractedDlNumber: ext['dl_number']?.toString() ?? '',
      holderName: ext['name']?.toString() ?? '',
      dateOfBirth: ext['dob']?.toString() ?? '',
      issueDate: ext['issue_date']?.toString() ?? '',
      validUntil: ext['valid_until']?.toString() ?? '',
      vehicleClasses: classes,
      documentType: ext['document_type']?.toString() ?? 'driving_license',
      documentQuality: ext['document_quality']?.toString() ?? 'good',
      issuingAuthority: ext['issuing_authority']?.toString() ?? '',
      checks: parsedChecks,
      warnings: warningsRaw.map((e) => e.toString()).toList(),
      verificationMethod: json['verification_method']?.toString() ?? 'ai_multimodal',
    );
  }

  factory DlVerificationResult.fallback({
    required String dlNumber,
    required String reason,
    required bool isValidFormat,
    List<String> warnings = const [],
    String vehicleType = 'Sedan',
  }) {
    return DlVerificationResult(
      status: isValidFormat ? 'review' : 'rejected',
      confidenceScore: isValidFormat ? 0.65 : 0.20,
      reason: reason,
      extractedDlNumber: dlNumber,
      holderName: '',
      dateOfBirth: '',
      issueDate: '',
      validUntil: '',
      vehicleClasses: vehicleType == 'Bike' ? ['MCWG'] : ['LMV'],
      documentType: 'driving_license',
      documentQuality: 'acceptable',
      issuingAuthority: dlNumber.length >= 4 ? dlNumber.substring(0, 4) : '',
      checks: {
        'document_type': true,
        'image_quality': true,
        'dl_number_format': isValidFormat,
        'date_consistency': true,
        'vehicle_compatibility': true,
        'ocr_ai_agreement': true,
      },
      warnings: warnings,
      verificationMethod: 'ml_kit_ocr_fallback',
    );
  }
}
