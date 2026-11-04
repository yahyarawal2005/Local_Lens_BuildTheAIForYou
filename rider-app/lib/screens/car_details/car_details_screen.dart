import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_state.dart';
import '../../core/theme/app_theme.dart';

class CarDetailsScreen extends StatefulWidget {
  const CarDetailsScreen({super.key});

  @override
  State<CarDetailsScreen> createState() => _CarDetailsScreenState();
}

class _CarDetailsScreenState extends State<CarDetailsScreen> {
  final _formKey = GlobalKey<FormState>();

  // Vehicle Controllers
  late String _selectedVehicleType;
  final TextEditingController _vehicleNumberController = TextEditingController();
  final TextEditingController _vehicleModelController = TextEditingController();
  final TextEditingController _vehicleColorController = TextEditingController(text: 'White');

  final List<String> _vehicleTypes = ['Sedan', 'Hatchback', 'SUV', 'Auto', 'Bike', 'Other'];
  final List<String> _commonColors = ['White', 'Silver', 'Black', 'Grey', 'Red', 'Blue', 'Yellow'];

  @override
  void initState() {
    super.initState();
    final driver = context.read<AppState>().driver;
    _selectedVehicleType = (driver?.vehicleType ?? 'Sedan').isNotEmpty ? driver!.vehicleType : 'Sedan';
    _vehicleNumberController.text = driver?.vehicleNumber ?? '';
    _vehicleModelController.text = driver?.vehicleModel ?? '';
    _vehicleColorController.text = (driver?.vehicleColor ?? 'White').isNotEmpty ? driver!.vehicleColor : 'White';
  }

  @override
  void dispose() {
    _vehicleNumberController.dispose();
    _vehicleModelController.dispose();
    _vehicleColorController.dispose();
    super.dispose();
  }

  String get _vehicleModelLabel {
    switch (_selectedVehicleType) {
      case 'Bike':
        return 'Bike / Scooter Model';
      case 'Auto':
        return 'Auto Rickshaw Model';
      case 'SUV':
        return 'SUV Brand & Model';
      case 'Hatchback':
        return 'Hatchback Brand & Model';
      default:
        return 'Car Brand & Model';
    }
  }

  String get _vehicleModelHint {
    switch (_selectedVehicleType) {
      case 'Bike':
        return 'e.g. Honda Activa 6G, Pulsar 150';
      case 'Auto':
        return 'e.g. Bajaj RE Compact, Piaggio Ape';
      case 'SUV':
        return 'e.g. Maruti Ertiga, Toyota Innova';
      case 'Hatchback':
        return 'e.g. Maruti Swift, Hyundai i10';
      default:
        return 'e.g. Maruti Dzire, Hyundai Aura';
    }
  }

  Future<void> _saveCarDetails() async {
    if (!_formKey.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please correct the errors in the form.')),
      );
      return;
    }

    final cleanPlate = _vehicleNumberController.text.trim().replaceAll(RegExp(r'\s+'), '').toUpperCase();

    final appState = context.read<AppState>();
    final currentDriver = appState.driver;
    if (currentDriver == null) return;

    final updatedDriver = currentDriver.copyWith(
      vehicleType: _selectedVehicleType,
      vehicleNumber: cleanPlate,
      vehicleModel: _vehicleModelController.text.trim(),
      vehicleColor: _vehicleColorController.text.trim(),
    );

    // Persist to Supabase
    await appState.completeDriverOnboarding(updatedDriver);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppTheme.primary,
          content: Text('Vehicle details updated successfully!'),
        ),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lightHintStyle = AppTheme.bodyLarge.copyWith(color: const Color(0xFF9CA3AF));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Car & Vehicle Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        physics: const BouncingScrollPhysics(),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppTheme.primary.withValues(alpha: 0.12),
                      AppTheme.secondary.withValues(alpha: 0.08),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: AppTheme.primary.withValues(alpha: 0.25),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: const BoxDecoration(
                        color: AppTheme.primary,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.directions_car_rounded, color: Colors.white, size: 24),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Vehicle Registration Details',
                            style: AppTheme.titleMedium.copyWith(
                              color: AppTheme.primary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Manage your vehicle type, license plate number & specifications.',
                            style: AppTheme.bodySmall.copyWith(
                              color: AppTheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              // ─── DRIVING LICENCE & VEHICLE COMPATIBILITY SUMMARY ────────────────
              Builder(
                builder: (context) {
                  final driver = context.watch<AppState>().driver;
                  final dlNumber = driver?.licenseNumber ?? '';
                  final dlClasses = driver?.licenseVehicleClasses ?? const [];
                  final confidence = (driver?.licenseConfidenceScore ?? 0.0) * 100;
                  final status = driver?.licenseVerificationStatus ?? 'not_uploaded';

                  final isVerified = status == 'verified' || status == 'verified_format';
                  final statusColor = isVerified
                      ? const Color(0xFF059669)
                      : (status == 'review' ? Colors.amber.shade800 : AppTheme.error);

                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceContainer,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              isVerified ? Icons.verified_user_rounded : Icons.shield_outlined,
                              color: statusColor,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              isVerified
                                  ? 'DL Document Verified (${confidence.round()}% Confidence)'
                                  : 'DL Verification Requires Review',
                              style: AppTheme.titleMedium.copyWith(
                                color: statusColor,
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('DL Number: ${dlNumber.isNotEmpty ? dlNumber : "Not provided"}',
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                            Text('Classes: ${dlClasses.isNotEmpty ? dlClasses.join(", ") : "LMV"}',
                                style: const TextStyle(color: AppTheme.onSurfaceVariant, fontSize: 12)),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: 24),

              // ─── VEHICLE INFORMATION FORM ───────────────────────────
              Text('Vehicle Information', style: AppTheme.headlineSmall.copyWith(fontSize: 18)),
              const SizedBox(height: 14),

              // Vehicle Type Dropdown
              Text('Vehicle Type', style: AppTheme.titleMedium),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: _vehicleTypes.contains(_selectedVehicleType) ? _selectedVehicleType : 'Sedan',
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.category_rounded),
                ),
                items: _vehicleTypes.map((type) {
                  return DropdownMenuItem<String>(
                    value: type,
                    child: Text(type),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) {
                    setState(() => _selectedVehicleType = val);
                  }
                },
              ),
              const SizedBox(height: 16),

              // Vehicle Plate Number
              Text('Vehicle License Plate Number', style: AppTheme.titleMedium),
              const SizedBox(height: 8),
              TextFormField(
                controller: _vehicleNumberController,
                textCapitalization: TextCapitalization.characters,
                style: AppTheme.bodyLarge,
                decoration: InputDecoration(
                  hintText: 'e.g. MH 04 AB 1234',
                  hintStyle: lightHintStyle,
                  prefixIcon: const Icon(Icons.pin_outlined),
                ),
                onChanged: (val) {
                  final upper = val.toUpperCase();
                  if (upper != val) {
                    _vehicleNumberController.value = _vehicleNumberController.value.copyWith(
                      text: upper,
                      selection: TextSelection.collapsed(offset: upper.length),
                    );
                  }
                },
                validator: (v) {
                  if (v == null || v.trim().isEmpty) {
                    return 'Vehicle plate number is required';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Vehicle Make & Model
              Text(_vehicleModelLabel, style: AppTheme.titleMedium),
              const SizedBox(height: 8),
              TextFormField(
                controller: _vehicleModelController,
                textCapitalization: TextCapitalization.words,
                style: AppTheme.bodyLarge,
                decoration: InputDecoration(
                  hintText: _vehicleModelHint,
                  hintStyle: lightHintStyle,
                  prefixIcon: const Icon(Icons.directions_car_outlined),
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) {
                    return 'Vehicle model & brand is required';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Vehicle Color
              Text('Vehicle Color', style: AppTheme.titleMedium),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _vehicleColorController,
                      textCapitalization: TextCapitalization.words,
                      style: AppTheme.bodyLarge,
                      decoration: InputDecoration(
                        hintText: 'e.g. White, Silver, Black',
                        hintStyle: lightHintStyle,
                        prefixIcon: const Icon(Icons.palette_outlined),
                      ),
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) {
                          return 'Vehicle color is required';
                        }
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.color_lens_outlined, color: AppTheme.primary),
                    onSelected: (color) {
                      setState(() {
                        _vehicleColorController.text = color;
                      });
                    },
                    itemBuilder: (context) {
                      return _commonColors.map((c) => PopupMenuItem(value: c, child: Text(c))).toList();
                    },
                  ),
                ],
              ),
              const SizedBox(height: 32),

              // Save Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton.icon(
                  onPressed: _saveCarDetails,
                  icon: const Icon(Icons.save_rounded, color: Colors.white),
                  label: Text(
                    'Save Vehicle Details',
                    style: AppTheme.labelLarge.copyWith(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    elevation: 4,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
