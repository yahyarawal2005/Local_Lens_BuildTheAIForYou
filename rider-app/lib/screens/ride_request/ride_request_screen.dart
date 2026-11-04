import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_state.dart';
import '../../core/theme/app_theme.dart';
import '../../models/ride.dart';

class RideRequestScreen extends StatelessWidget {
  const RideRequestScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: true,
      child: Consumer<AppState>(
        builder: (context, state, _) {
          final ride = state.pendingRequest ?? state.activeRide;

          if (ride == null) {
            // Request expired or dismissed
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (Navigator.canPop(context)) Navigator.pop(context);
            });
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }

          if (ride.status == RideStatus.expired) {
            return _buildExpiredView(context);
          }

          return Scaffold(
            backgroundColor: Colors.black.withValues(alpha: 0.6),
            body: SafeArea(
              child: Column(
                children: [
                  const Spacer(),
                  _buildRequestCard(context, state, ride),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildExpiredView(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppTheme.tertiary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.timer_off_rounded,
                size: 48,
                color: AppTheme.tertiary,
              ),
            ),
            const SizedBox(height: 24),
            Text('Request Expired', style: AppTheme.headlineMedium),
            const SizedBox(height: 8),
            Text(
              'The ride request has timed out',
              style: AppTheme.bodyMedium.copyWith(
                color: AppTheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRequestCard(
      BuildContext context, AppState state, Ride ride) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.cardWhite,
        borderRadius: const BorderRadius.all(Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 24,
            offset: const Offset(0, -8),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header with countdown
          Row(
            children: [
              Text('New Ride Request', style: AppTheme.headlineSmall),
              const Spacer(),
              _CountdownWidget(seconds: state.countdownSeconds),
            ],
          ),
          const SizedBox(height: 20),

          // Fare
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primary.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Estimated Fare',
                      style: AppTheme.bodySmall.copyWith(
                        color: AppTheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '₹${ride.fare.toStringAsFixed(0)}',
                      style: AppTheme.metricCurrency.copyWith(
                        color: AppTheme.primary,
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${ride.tripDistance} km',
                      style: AppTheme.titleLarge,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '~${ride.etaMinutes} min',
                      style: AppTheme.bodySmall,
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Passenger info
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
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(Icons.star_rounded,
                            color: AppTheme.tertiary, size: 14),
                        const SizedBox(width: 4),
                        Text(
                          ride.passengerRating.toStringAsFixed(1),
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
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceContainer,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${ride.pickupDistance} km away',
                  style: AppTheme.bodySmall.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Route info (pickup/destination)
          _buildLocationRow(
            isPickup: true,
            address: ride.pickupAddress,
          ),
          Padding(
            padding: const EdgeInsets.only(left: 14),
            child: SizedBox(
              height: 24,
              child: VerticalDivider(
                color: AppTheme.outline.withValues(alpha: 0.5),
                thickness: 2,
                width: 1,
              ),
            ),
          ),
          _buildLocationRow(
            isPickup: false,
            address: ride.destinationAddress,
          ),
          const SizedBox(height: 24),

          // Action buttons
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 52,
                  child: OutlinedButton(
                    onPressed: () {
                      state.declineRide();
                      Navigator.pop(context);
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.error,
                      side: const BorderSide(
                          color: AppTheme.error, width: 2),
                      shape: const StadiumBorder(),
                    ),
                    child: Text(
                      'DECLINE',
                      style: AppTheme.labelLarge.copyWith(
                        color: AppTheme.error,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () async {
                      final success = await state.acceptRide();
                      if (context.mounted) {
                        if (success) {
                          Navigator.pushReplacementNamed(context, '/pickup');
                        } else {
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Ride request was already accepted by another driver.')),
                          );
                        }
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      shape: const StadiumBorder(),
                    ),
                    child: Text(
                      'ACCEPT',
                      style: AppTheme.labelLarge.copyWith(
                        color: Colors.white,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLocationRow({
    required bool isPickup,
    required String address,
  }) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: isPickup ? AppTheme.primary : AppTheme.error,
            shape: isPickup ? BoxShape.circle : BoxShape.rectangle,
            borderRadius: isPickup ? null : BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isPickup ? 'PICKUP' : 'DROP-OFF',
                style: AppTheme.labelSmall.copyWith(
                  color: isPickup ? AppTheme.primary : AppTheme.error,
                ),
              ),
              const SizedBox(height: 2),
              Text(address, style: AppTheme.titleMedium),
            ],
          ),
        ),
      ],
    );
  }
}

class _CountdownWidget extends StatelessWidget {
  final int seconds;

  const _CountdownWidget({required this.seconds});

  @override
  Widget build(BuildContext context) {
    final progress = seconds / 15.0;
    final color = seconds > 5 ? AppTheme.tertiary : AppTheme.error;

    return SizedBox(
      width: 44,
      height: 44,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: 44,
            height: 44,
            child: CircularProgressIndicator(
              value: progress,
              strokeWidth: 3,
              backgroundColor: color.withValues(alpha: 0.15),
              valueColor: AlwaysStoppedAnimation(color),
            ),
          ),
          Text(
            '${seconds}s',
            style: AppTheme.labelLarge.copyWith(
              color: color,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}
