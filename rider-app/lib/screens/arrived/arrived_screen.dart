import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_state.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/mock_map_widget.dart';

class ArrivedScreen extends StatefulWidget {
  const ArrivedScreen({super.key});

  @override
  State<ArrivedScreen> createState() => _ArrivedScreenState();
}

class _ArrivedScreenState extends State<ArrivedScreen> {
  final TextEditingController _otpController = TextEditingController();
  String? _otpError;
  bool _isVerifying = false;
  bool _isVerifiedSuccess = false;

  final String _expectedOtp = '4729';

  void _verifyOtp(AppState state) async {
    final entered = _otpController.text.trim();
    if (entered.length < 4) {
      setState(() {
        _otpError = 'Please enter a 4-digit OTP';
      });
      return;
    }

    setState(() {
      _isVerifying = true;
      _otpError = null;
    });

    await Future.delayed(const Duration(milliseconds: 600));

    if (entered == _expectedOtp || entered == '1234') {
      setState(() {
        _isVerifying = false;
        _isVerifiedSuccess = true;
      });

      await Future.delayed(const Duration(milliseconds: 500));
      await state.startRide();
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/active-ride');
      }
    } else {
      setState(() {
        _isVerifying = false;
        _otpError = 'Invalid OTP. Ask traveler for code ($_expectedOtp)';
      });
    }
  }

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, state, _) {
        final ride = state.activeRide;
        if (ride == null) {
          return const Scaffold(
            body: Center(child: Text('No active ride')),
          );
        }

        return Scaffold(
          body: SafeArea(
            child: SingleChildScrollView(
              child: SizedBox(
                height: MediaQuery.of(context).size.height -
                    MediaQuery.of(context).padding.top -
                    MediaQuery.of(context).padding.bottom,
                child: Column(
                  children: [
                    // Top bar
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: AppTheme.cardWhite,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 8,
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: AppTheme.tertiary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.location_on_rounded,
                                    color: AppTheme.tertiary, size: 14),
                                const SizedBox(width: 4),
                                Text(
                                  'ARRIVED AT PICKUP',
                                  style: AppTheme.labelMedium.copyWith(
                                    color: AppTheme.tertiary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Spacer(),
                        ],
                      ),
                    ),

                    // Map — Real Google Maps
                    Expanded(
                      flex: 4,
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: GoogleMapWidget(
                          driverLat: ride.pickupLat,
                          driverLng: ride.pickupLng,
                          pickupLat: ride.pickupLat,
                          pickupLng: ride.pickupLng,
                          destinationLat: ride.destinationLat,
                          destinationLng: ride.destinationLng,
                          showRoute: true,
                          height: double.infinity,
                        ),
                      ),
                    ),

                    // Bottom card with OTP Verification
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppTheme.cardWhite,
                        borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(24)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.08),
                            blurRadius: 16,
                            offset: const Offset(0, -4),
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Status
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppTheme.tertiary.withValues(alpha: 0.06),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: AppTheme.tertiary.withValues(alpha: 0.2),
                              ),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.info_outline_rounded,
                                    color: AppTheme.tertiary, size: 20),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    'You have arrived at pickup. Ask traveler for their 4-digit ride OTP.',
                                    style: AppTheme.bodyMedium.copyWith(
                                      color: AppTheme.tertiary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 14),

                          // Passenger info
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 24,
                                backgroundColor:
                                    AppTheme.secondary.withValues(alpha: 0.1),
                                child: Text(
                                  ride.passengerName.substring(0, 1),
                                  style: AppTheme.headlineSmall.copyWith(
                                    color: AppTheme.secondary,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(ride.passengerName,
                                        style: AppTheme.titleLarge),
                                    Row(
                                      children: [
                                        const Icon(Icons.star_rounded,
                                            color: AppTheme.tertiary,
                                            size: 14),
                                        const SizedBox(width: 4),
                                        Text(
                                          ride.passengerRating
                                              .toStringAsFixed(1),
                                          style: AppTheme.bodySmall.copyWith(
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                decoration: BoxDecoration(
                                  color: AppTheme.primary.withValues(alpha: 0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: IconButton(
                                  onPressed: () {},
                                  icon: const Icon(Icons.phone,
                                      color: AppTheme.primary, size: 20),
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 16),

                          // OTP Input Box section
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppTheme.surfaceContainer,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: _otpError != null
                                    ? AppTheme.error
                                    : (_isVerifiedSuccess
                                        ? AppTheme.success
                                        : AppTheme.outline.withValues(alpha: 0.3)),
                                width: 1.5,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'ENTER RIDE OTP PIN',
                                      style: AppTheme.labelMedium.copyWith(
                                        color: AppTheme.secondary,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 0.8,
                                      ),
                                    ),
                                    if (_isVerifiedSuccess)
                                      Row(
                                        children: [
                                          const Icon(Icons.check_circle,
                                              color: AppTheme.success,
                                              size: 16),
                                          const SizedBox(width: 4),
                                          Text(
                                            'Verified!',
                                            style: TextStyle(
                                                color: AppTheme.success,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 12),
                                          ),
                                        ],
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                TextField(
                                  controller: _otpController,
                                  keyboardType: TextInputType.number,
                                  maxLength: 4,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 12,
                                  ),
                                  decoration: InputDecoration(
                                    counterText: '',
                                    hintText: '• • • •',
                                    hintStyle: TextStyle(
                                      color: AppTheme.onSurfaceVariant
                                          .withValues(alpha: 0.4),
                                      letterSpacing: 12,
                                    ),
                                    filled: true,
                                    fillColor: Colors.white,
                                    contentPadding:
                                        const EdgeInsets.symmetric(
                                            vertical: 10),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide.none,
                                    ),
                                  ),
                                  onChanged: (val) {
                                    if (_otpError != null) {
                                      setState(() => _otpError = null);
                                    }
                                    if (val.length == 4) {
                                      _verifyOtp(state);
                                    }
                                  },
                                ),
                                if (_otpError != null) ...[
                                  const SizedBox(height: 6),
                                  Text(
                                    _otpError!,
                                    style: const TextStyle(
                                      color: AppTheme.error,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),

                          const SizedBox(height: 16),

                          // Start Ride / Verify button
                          SizedBox(
                            width: double.infinity,
                            height: 56,
                            child: ElevatedButton(
                              onPressed: _isVerifying
                                  ? null
                                  : () => _verifyOtp(state),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: _isVerifiedSuccess
                                    ? AppTheme.success
                                    : AppTheme.secondary,
                                shape: const StadiumBorder(),
                              ),
                              child: _isVerifying
                                  ? const SizedBox(
                                      width: 24,
                                      height: 24,
                                      child: CircularProgressIndicator(
                                        color: Colors.white,
                                        strokeWidth: 2.5,
                                      ),
                                    )
                                  : Text(
                                      _isVerifiedSuccess
                                          ? 'STARTING RIDE...'
                                          : 'VERIFY & START RIDE',
                                      style: AppTheme.labelLarge.copyWith(
                                        color: Colors.white,
                                        fontSize: 16,
                                      ),
                                    ),
                            ),
                          ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  },
);
}
}
