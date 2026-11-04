import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_state.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/mock_map_widget.dart';

class PickupScreen extends StatelessWidget {
  const PickupScreen({super.key});

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
                          color: AppTheme.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: AppTheme.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'EN ROUTE TO PICKUP',
                              style: AppTheme.labelMedium.copyWith(
                                color: AppTheme.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      // SOS
                      IconButton(
                        onPressed: () => _showSOS(context),
                        icon: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: AppTheme.error.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'SOS',
                            style: TextStyle(
                              color: AppTheme.error,
                              fontWeight: FontWeight.w800,
                              fontSize: 11,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Map — Real Google Maps
                Expanded(
                  flex: 5,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: GoogleMapWidget(
                      driverLat:
                          state.currentLocation?.latitude ?? 19.076,
                      driverLng:
                          state.currentLocation?.longitude ?? 72.877,
                      pickupLat: ride.pickupLat,
                      pickupLng: ride.pickupLng,
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
                      top: Radius.circular(24),
                    ),
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
                      // Trip info
                      Row(
                        children: [
                          _buildMetric(
                            icon: Icons.navigation_rounded,
                            value: '${ride.pickupDistance} km',
                            label: 'Distance',
                          ),
                          const SizedBox(width: 16),
                          _buildMetric(
                            icon: Icons.access_time_rounded,
                            value: '${ride.etaMinutes} min',
                            label: 'ETA',
                          ),
                          const SizedBox(width: 16),
                          _buildMetric(
                            icon: Icons.currency_rupee_rounded,
                            value: '₹${ride.fare.toStringAsFixed(0)}',
                            label: 'Fare',
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Divider(),
                      const SizedBox(height: 16),

                      // Passenger
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 22,
                            backgroundColor:
                                AppTheme.secondary.withValues(alpha: 0.1),
                            child: Text(
                              ride.passengerName.substring(0, 1),
                              style: AppTheme.titleLarge.copyWith(
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
                                Text(ride.pickupAddress,
                                    style: AppTheme.bodySmall),
                              ],
                            ),
                          ),
                          // Phone
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
                      const SizedBox(height: 20),

                      // Arrived button
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          onPressed: () {
                            state.markArrived();
                            Navigator.pushReplacementNamed(
                                context, '/arrived');
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            shape: const StadiumBorder(),
                          ),
                          child: Text(
                            'I\'M ARRIVED',
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
        padding: const EdgeInsets.all(12),
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
          'This will alert emergency services and share your live location.',
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
