import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_state.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/mock_map_widget.dart';

class ActiveRideScreen extends StatelessWidget {
  const ActiveRideScreen({super.key});

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
            child: Column(
              children: [
                // Top bar
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppTheme.secondary,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
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
                          color: AppTheme.primary.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: AppTheme.success,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'RIDE IN PROGRESS',
                              style: AppTheme.labelMedium.copyWith(
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      // SOS
                      GestureDetector(
                        onTap: () => _showSOS(context),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppTheme.error,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'SOS',
                            style: AppTheme.labelMedium.copyWith(
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Large Map — Real Google Maps
                Expanded(
                  flex: 5,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: GoogleMapWidget(
                      driverLat:
                          state.currentLocation?.latitude ?? ride.pickupLat,
                      driverLng: state.currentLocation?.longitude ??
                          ride.pickupLng,
                      destinationLat: ride.destinationLat,
                      destinationLng: ride.destinationLng,
                      showRoute: true,
                      height: double.infinity,
                    ),
                  ),
                ),

                // Bottom card
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
                      // Trip details
                      Row(
                        children: [
                          _buildMetric(
                            icon: Icons.navigation_rounded,
                            value: '${ride.tripDistance} km',
                            label: 'Distance',
                          ),
                          const SizedBox(width: 12),
                          _buildMetric(
                            icon: Icons.access_time_rounded,
                            value: '${ride.etaMinutes} min',
                            label: 'Remaining',
                          ),
                          const SizedBox(width: 12),
                          _buildMetric(
                            icon: Icons.currency_rupee_rounded,
                            value: '₹${ride.fare.toStringAsFixed(0)}',
                            label: 'Fare',
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Destination info
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppTheme.surfaceContainer,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                color: AppTheme.error,
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'DESTINATION',
                                    style: AppTheme.labelSmall.copyWith(
                                      color: AppTheme.error,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(ride.destinationAddress,
                                      style: AppTheme.titleMedium),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Passenger
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 18,
                            backgroundColor:
                                AppTheme.secondary.withValues(alpha: 0.1),
                            child: Text(
                              ride.passengerName.substring(0, 1),
                              style: AppTheme.titleMedium.copyWith(
                                color: AppTheme.secondary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(ride.passengerName,
                              style: AppTheme.titleMedium),
                          const Spacer(),
                          Container(
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withValues(alpha: 0.1),
                              shape: BoxShape.circle,
                            ),
                            child: IconButton(
                              constraints: const BoxConstraints(
                                  minWidth: 36, minHeight: 36),
                              padding: EdgeInsets.zero,
                              onPressed: () {},
                              icon: const Icon(Icons.phone,
                                  color: AppTheme.primary, size: 18),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // Complete Ride button
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          onPressed: () {
                            state.completeRide();
                            Navigator.pushReplacementNamed(
                                context, '/completed');
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            shape: const StadiumBorder(),
                          ),
                          child: Text(
                            'COMPLETE RIDE',
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
        );
      },
    );
  }

  Widget _buildMetric({
    required IconData icon,
    required String value,
    required String label,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppTheme.surfaceContainer,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Icon(icon, size: 18, color: AppTheme.primary),
            const SizedBox(height: 4),
            Text(value, style: AppTheme.titleMedium),
            Text(label, style: AppTheme.labelSmall),
          ],
        ),
      ),
    );
  }

  void _showSOS(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Row(
          children: [
            const Icon(Icons.warning_amber_rounded,
                color: AppTheme.error),
            const SizedBox(width: 8),
            Text('Emergency SOS', style: AppTheme.headlineSmall),
          ],
        ),
        content: Text(
          'This will alert emergency services.',
          style: AppTheme.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('SOS alert triggered (Mock)'),
                  backgroundColor: AppTheme.error,
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.error,
            ),
            child: const Text('Send SOS',
                style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
