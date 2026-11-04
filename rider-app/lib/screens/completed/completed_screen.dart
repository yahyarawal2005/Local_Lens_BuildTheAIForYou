import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_state.dart';
import '../../core/theme/app_theme.dart';

class CompletedScreen extends StatefulWidget {
  const CompletedScreen({super.key});

  @override
  State<CompletedScreen> createState() => _CompletedScreenState();
}

class _CompletedScreenState extends State<CompletedScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnim;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _scaleAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.elasticOut),
    );
    _fadeAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeIn),
    );
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, state, _) {
        final ride = state.activeRide;
        if (ride == null) {
          return const Scaffold(
            body: Center(child: Text('No ride data')),
          );
        }

        return Scaffold(
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: AnimatedBuilder(
                animation: _controller,
                builder: (context, child) {
                  return Opacity(
                    opacity: _fadeAnim.value,
                    child: Column(
                      children: [
                        const SizedBox(height: 32),

                        // Success animation
                        Transform.scale(
                          scale: _scaleAnim.value,
                          child: Container(
                            width: 100,
                            height: 100,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [
                                  AppTheme.primary,
                                  AppTheme.success,
                                ],
                              ),
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: AppTheme.primary
                                      .withValues(alpha: 0.3),
                                  blurRadius: 24,
                                  spreadRadius: 4,
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.check_rounded,
                              size: 52,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),

                        Text(
                          'Ride Completed!',
                          style: AppTheme.headlineLarge,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'You have successfully completed the ride',
                          style: AppTheme.bodyMedium.copyWith(
                            color: AppTheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 32),

                        // Fare card
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                Color(0xFF059669),
                                Color(0xFF047857),
                              ],
                            ),
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: AppTheme.primary
                                    .withValues(alpha: 0.3),
                                blurRadius: 16,
                                offset: const Offset(0, 6),
                              ),
                            ],
                          ),
                          child: Column(
                            children: [
                              Text(
                                'TRIP FARE',
                                style: AppTheme.labelMedium.copyWith(
                                  color: Colors.white
                                      .withValues(alpha: 0.7),
                                  letterSpacing: 2,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                '₹${ride.fare.toStringAsFixed(0)}',
                                style: AppTheme.metricCurrency.copyWith(
                                  color: Colors.white,
                                  fontSize: 42,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Added to your earnings',
                                style: AppTheme.bodySmall.copyWith(
                                  color: Colors.white
                                      .withValues(alpha: 0.7),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Trip details
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: AppTheme.cardWhite,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color:
                                  AppTheme.outline.withValues(alpha: 0.3),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Trip Summary',
                                style: AppTheme.titleLarge,
                              ),
                              const SizedBox(height: 16),

                              // Passenger
                              _buildDetailRow(
                                Icons.person_outline_rounded,
                                'Passenger',
                                ride.passengerName,
                              ),
                              const Divider(height: 24),

                              // Route
                              Row(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                children: [
                                  Column(
                                    children: [
                                      Container(
                                        width: 10,
                                        height: 10,
                                        decoration: const BoxDecoration(
                                          color: AppTheme.primary,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                      Container(
                                        width: 2,
                                        height: 30,
                                        color: AppTheme.outline
                                            .withValues(alpha: 0.5),
                                      ),
                                      Container(
                                        width: 10,
                                        height: 10,
                                        decoration: BoxDecoration(
                                          color: AppTheme.error,
                                          borderRadius:
                                              BorderRadius.circular(2),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(ride.pickupAddress,
                                            style: AppTheme.bodyMedium),
                                        const SizedBox(height: 22),
                                        Text(ride.destinationAddress,
                                            style: AppTheme.bodyMedium),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const Divider(height: 24),

                              // Stats
                              Row(
                                children: [
                                  _buildStatItem(
                                    Icons.route_rounded,
                                    '${ride.tripDistance} km',
                                    'Distance',
                                  ),
                                  _buildStatItem(
                                    Icons.access_time_rounded,
                                    '${ride.durationMinutes ?? 15} min',
                                    'Duration',
                                  ),
                                  _buildStatItem(
                                    Icons.speed_rounded,
                                    '${(ride.tripDistance / ((ride.durationMinutes ?? 15) / 60)).toStringAsFixed(0)} km/h',
                                    'Avg Speed',
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 32),

                        // Back to Home
                        SizedBox(
                          width: double.infinity,
                          height: 56,
                          child: ElevatedButton(
                            onPressed: () {
                              state.returnToHome();
                              Navigator.pushNamedAndRemoveUntil(
                                context,
                                '/home',
                                (route) => false,
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.secondary,
                              shape: const StadiumBorder(),
                            ),
                            child: Text(
                              'BACK TO HOME',
                              style: AppTheme.labelLarge.copyWith(
                                color: Colors.white,
                                fontSize: 16,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppTheme.onSurfaceVariant),
        const SizedBox(width: 12),
        Text(
          label,
          style: AppTheme.bodySmall.copyWith(
            color: AppTheme.onSurfaceVariant,
          ),
        ),
        const Spacer(),
        Text(value, style: AppTheme.titleMedium),
      ],
    );
  }

  Widget _buildStatItem(IconData icon, String value, String label) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, size: 20, color: AppTheme.primary),
          const SizedBox(height: 6),
          Text(value, style: AppTheme.titleMedium),
          const SizedBox(height: 2),
          Text(
            label,
            style: AppTheme.labelSmall,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
