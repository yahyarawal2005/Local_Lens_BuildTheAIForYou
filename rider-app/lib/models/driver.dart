class Driver {
  final String id;
  final String userId;
  final String name;
  final String phone;
  final String email;
  final String vehicleType;
  final String vehicleNumber;
  final String vehicleModel;
  final String vehicleColor;
  final String profileImageUrl;
  final String licenseNumber;
  final String licenseVerificationStatus;
  final String licenseVerificationMethod;
  final DateTime? licenseVerifiedAt;
  final String licenseHolderName;
  final String licenseDateOfBirth;
  final String licenseIssueDate;
  final String licenseValidUntil;
  final List<String> licenseVehicleClasses;
  final double licenseConfidenceScore;
  final String licenseVerificationReason;
  final String city;
  final double rating;
  final int totalRides;
  final double todayEarnings;
  final int todayRides;
  bool isOnline;
  bool isAvailable;
  double latitude;
  double longitude;
  final bool isRegistrationCompleted;
  final DateTime? updatedAt;

  Driver({
    required this.id,
    required this.userId,
    required this.name,
    required this.phone,
    required this.email,
    required this.vehicleType,
    required this.vehicleNumber,
    required this.vehicleModel,
    this.vehicleColor = 'White',
    this.profileImageUrl = '',
    this.licenseNumber = '',
    this.licenseVerificationStatus = 'not_uploaded',
    this.licenseVerificationMethod = 'ai_multimodal',
    this.licenseVerifiedAt,
    this.licenseHolderName = '',
    this.licenseDateOfBirth = '',
    this.licenseIssueDate = '',
    this.licenseValidUntil = '',
    this.licenseVehicleClasses = const [],
    this.licenseConfidenceScore = 0.0,
    this.licenseVerificationReason = '',
    this.city = '',
    this.rating = 4.8,
    this.totalRides = 0,
    this.todayEarnings = 0.0,
    this.todayRides = 0,
    this.isOnline = false,
    this.isAvailable = false,
    this.latitude = 19.0760,
    this.longitude = 72.8777,
    this.isRegistrationCompleted = false,
    this.updatedAt,
  });

  /// Check if the driver has completed onboarding (valid real phone, vehicle plate & DL)
  bool get isProfileCompleted {
    if (isRegistrationCompleted) return true;
    final cleanLicense = licenseNumber.trim();
    final cleanVehicle = vehicleNumber.trim();
    final cleanName = name.trim();

    if (licenseVerificationStatus == 'verified' && (cleanLicense.isNotEmpty || cleanVehicle.isNotEmpty)) {
      return true;
    }
    if (cleanVehicle.isNotEmpty && cleanName.isNotEmpty && (cleanLicense.isNotEmpty || licenseVerificationStatus == 'verified')) {
      return true;
    }
    return false;
  }

  Driver copyWith({
    String? id,
    String? userId,
    String? name,
    String? phone,
    String? email,
    String? vehicleType,
    String? vehicleNumber,
    String? vehicleModel,
    String? vehicleColor,
    String? profileImageUrl,
    String? licenseNumber,
    String? licenseVerificationStatus,
    String? licenseVerificationMethod,
    DateTime? licenseVerifiedAt,
    String? licenseHolderName,
    String? licenseDateOfBirth,
    String? licenseIssueDate,
    String? licenseValidUntil,
    List<String>? licenseVehicleClasses,
    double? licenseConfidenceScore,
    String? licenseVerificationReason,
    String? city,
    double? rating,
    int? totalRides,
    double? todayEarnings,
    int? todayRides,
    bool? isOnline,
    bool? isAvailable,
    double? latitude,
    double? longitude,
    bool? isRegistrationCompleted,
    DateTime? updatedAt,
  }) {
    final newId = id ?? this.id;
    return Driver(
      id: newId,
      userId: userId ?? id ?? this.userId,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      vehicleType: vehicleType ?? this.vehicleType,
      vehicleNumber: vehicleNumber ?? this.vehicleNumber,
      vehicleModel: vehicleModel ?? this.vehicleModel,
      vehicleColor: vehicleColor ?? this.vehicleColor,
      profileImageUrl: profileImageUrl ?? this.profileImageUrl,
      licenseNumber: licenseNumber ?? this.licenseNumber,
      licenseVerificationStatus: licenseVerificationStatus ?? this.licenseVerificationStatus,
      licenseVerificationMethod: licenseVerificationMethod ?? this.licenseVerificationMethod,
      licenseVerifiedAt: licenseVerifiedAt ?? this.licenseVerifiedAt,
      licenseHolderName: licenseHolderName ?? this.licenseHolderName,
      licenseDateOfBirth: licenseDateOfBirth ?? this.licenseDateOfBirth,
      licenseIssueDate: licenseIssueDate ?? this.licenseIssueDate,
      licenseValidUntil: licenseValidUntil ?? this.licenseValidUntil,
      licenseVehicleClasses: licenseVehicleClasses ?? this.licenseVehicleClasses,
      licenseConfidenceScore: licenseConfidenceScore ?? this.licenseConfidenceScore,
      licenseVerificationReason: licenseVerificationReason ?? this.licenseVerificationReason,
      city: city ?? this.city,
      rating: rating ?? this.rating,
      totalRides: totalRides ?? this.totalRides,
      todayEarnings: todayEarnings ?? this.todayEarnings,
      todayRides: todayRides ?? this.todayRides,
      isOnline: isOnline ?? this.isOnline,
      isAvailable: isAvailable ?? this.isAvailable,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      isRegistrationCompleted: isRegistrationCompleted ?? this.isRegistrationCompleted,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'name': name,
      'phone': phone,
      'email': email,
      'vehicleType': vehicleType,
      'vehicleNumber': vehicleNumber,
      'vehicleModel': vehicleModel,
      'vehicleColor': vehicleColor,
      'profileImageUrl': profileImageUrl,
      'licenseNumber': licenseNumber,
      'licenseVerificationStatus': licenseVerificationStatus,
      'licenseVerificationMethod': licenseVerificationMethod,
      'licenseVerifiedAt': licenseVerifiedAt?.toIso8601String(),
      'licenseHolderName': licenseHolderName,
      'licenseDateOfBirth': licenseDateOfBirth,
      'licenseIssueDate': licenseIssueDate,
      'licenseValidUntil': licenseValidUntil,
      'licenseVehicleClasses': licenseVehicleClasses,
      'licenseConfidenceScore': licenseConfidenceScore,
      'licenseVerificationReason': licenseVerificationReason,
      'city': city,
      'rating': rating,
      'totalRides': totalRides,
      'todayEarnings': todayEarnings,
      'todayRides': todayRides,
      'isOnline': isOnline,
      'isAvailable': isAvailable,
      'latitude': latitude,
      'longitude': longitude,
      'isRegistrationCompleted': isRegistrationCompleted,
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  factory Driver.fromJson(Map<String, dynamic> json) {
    return Driver(
      id: json['id']?.toString() ?? 'driver_001',
      userId: json['userId']?.toString() ?? json['id']?.toString() ?? 'user_001',
      name: json['name']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      vehicleType: json['vehicleType']?.toString() ?? 'Sedan',
      vehicleNumber: json['vehicleNumber']?.toString() ?? '',
      vehicleModel: json['vehicleModel']?.toString() ?? '',
      vehicleColor: json['vehicleColor']?.toString() ?? 'White',
      profileImageUrl: json['profileImageUrl']?.toString() ?? '',
      licenseNumber: json['licenseNumber']?.toString() ?? '',
      licenseVerificationStatus: json['licenseVerificationStatus']?.toString() ?? 'verified',
      licenseVerificationMethod: json['licenseVerificationMethod']?.toString() ?? 'ai_multimodal',
      licenseVerifiedAt: json['licenseVerifiedAt'] != null ? DateTime.tryParse(json['licenseVerifiedAt'].toString()) : null,
      licenseHolderName: json['licenseHolderName']?.toString() ?? '',
      licenseDateOfBirth: json['licenseDateOfBirth']?.toString() ?? '',
      licenseIssueDate: json['licenseIssueDate']?.toString() ?? '',
      licenseValidUntil: json['licenseValidUntil']?.toString() ?? '',
      licenseVehicleClasses: json['licenseVehicleClasses'] != null ? List<String>.from(json['licenseVehicleClasses']) : const [],
      licenseConfidenceScore: (json['licenseConfidenceScore'] as num?)?.toDouble() ?? 0.0,
      licenseVerificationReason: json['licenseVerificationReason']?.toString() ?? '',
      city: json['city']?.toString() ?? '',
      rating: (json['rating'] as num?)?.toDouble() ?? 4.8,
      totalRides: json['totalRides'] ?? 0,
      todayEarnings: (json['todayEarnings'] as num?)?.toDouble() ?? 0.0,
      todayRides: json['todayRides'] ?? 0,
      isOnline: json['isOnline'] ?? false,
      isAvailable: json['isAvailable'] ?? false,
      latitude: (json['latitude'] as num?)?.toDouble() ?? 19.0760,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 72.8777,
      isRegistrationCompleted: json['isRegistrationCompleted'] ?? true,
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'].toString()) : null,
    );
  }

  /// Mock driver for development
  static Driver mock() {
    return Driver(
      id: 'driver_001',
      userId: 'user_001',
      name: 'Amit Verma',
      phone: '+91 98765 43210',
      email: 'driver@nearbyride.com',
      vehicleType: 'Sedan',
      vehicleNumber: 'MH 04 AB 1234',
      vehicleModel: 'Maruti Suzuki Dzire',
      vehicleColor: 'White',
      profileImageUrl: '',
      licenseNumber: 'MH1420210012345',
      licenseVerificationStatus: 'verified',
      licenseVerificationMethod: 'ai_multimodal',
      licenseVerifiedAt: DateTime.now(),
      licenseHolderName: 'AMIT VERMA',
      licenseDateOfBirth: '1995-08-20',
      licenseIssueDate: '2021-03-15',
      licenseValidUntil: '2041-03-14',
      licenseVehicleClasses: const ['LMV', 'MCWG'],
      licenseConfidenceScore: 0.94,
      licenseVerificationReason: 'DL details & vehicle compatibility verified',
      city: 'Mumbai',
      rating: 4.85,
      totalRides: 342,
      todayEarnings: 1250.0,
      todayRides: 5,
      isOnline: false,
      isAvailable: false,
      latitude: 19.0760,
      longitude: 72.8777,
      isRegistrationCompleted: true,
      updatedAt: DateTime.now(),
    );
  }
}

