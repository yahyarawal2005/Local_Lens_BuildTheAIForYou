import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_state.dart';
import '../../core/theme/app_theme.dart';
import '../../models/ride.dart';
import '../../widgets/mock_map_widget.dart';
import '../../services/geocoding_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  VoidCallback? _appStateListener;
  String? _lastNavigatedRideId;
  RideStatus? _lastNavigatedStatus;
  double _mapHeightFactor = 1.0; // 1.0 = full height (100%), when swiped up = 0.60 (60% height)

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _listenForNavigation();
      context.read<AppState>().refreshDriverStats();
    });
  }

  void _listenForNavigation() {
    final state = context.read<AppState>();
    _appStateListener = () {
      if (!mounted) return;

      if (!state.isAuthenticated || state.driver == null) {
        Navigator.pushReplacementNamed(context, '/login');
        return;
      }

      final isCurrentRoute = ModalRoute.of(context)?.isCurrent ?? false;
      if (!isCurrentRoute) return;

      // Navigate to ride request when pending
      if (state.hasPendingRequest) {
        final request = state.pendingRequest!;
        if (request.status == RideStatus.searching &&
            (_lastNavigatedRideId != request.id || _lastNavigatedStatus != RideStatus.searching)) {
          _lastNavigatedRideId = request.id;
          _lastNavigatedStatus = RideStatus.searching;
          Navigator.pushNamed(context, '/ride-request');
          return;
        }
      }

      // Navigate to active ride screens when ride state changes
      if (state.hasActiveRide) {
        final ride = state.activeRide!;
        if (_lastNavigatedRideId != ride.id || _lastNavigatedStatus != ride.status) {
          _lastNavigatedRideId = ride.id;
          _lastNavigatedStatus = ride.status;

          switch (ride.status) {
            case RideStatus.accepted:
              Navigator.pushNamed(context, '/pickup');
              break;
            case RideStatus.arrived:
              Navigator.pushNamed(context, '/arrived');
              break;
            case RideStatus.started:
              Navigator.pushNamed(context, '/active-ride');
              break;
            case RideStatus.completed:
              Navigator.pushNamed(context, '/completed');
              break;
            default:
              break;
          }
        }
      } else if (!state.hasPendingRequest) {
        _lastNavigatedRideId = null;
        _lastNavigatedStatus = null;
      }
    };

    state.addListener(_appStateListener!);
  }

  @override
  void dispose() {
    if (_appStateListener != null) {
      context.read<AppState>().removeListener(_appStateListener!);
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, state, _) {
        final driver = state.driver;
        if (driver == null) return const SizedBox();

        return Scaffold(
          body: SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final fullHeight = constraints.maxHeight;
                final currentMapHeight = fullHeight * _mapHeightFactor;

                return Stack(
                  children: [
                    // ─── 1. FLEXIBLE GOOGLE MAP BACKDROP (SHRINKS TO 60% ON SWIPE UP) ───
                    Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      height: currentMapHeight,
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        curve: Curves.easeOut,
                        height: currentMapHeight,
                        width: double.infinity,
                        child: GoogleMapWidget(
                          driverLat: state.currentLocation?.latitude ?? 19.076,
                          driverLng: state.currentLocation?.longitude ?? 72.877,
                          height: currentMapHeight,
                        ),
                      ),
                    ),

                    // ─── 2. FLOATING TOP HEADER BAR ───
                    Positioned(
                      top: 12,
                      left: 16,
                      right: 16,
                      child: _buildTopBar(state),
                    ),

                    // ─── 3. FLOATING GPS BADGE OVER MAP ───
                    if (state.isOnline && state.currentLocation != null)
                      Positioned(
                        top: 80,
                        right: 20,
                        child: _buildGpsBadge(state),
                      ),

                    // ─── 4. FLEXIBLE DRAGGABLE SHEET (SWIPE UP SHRINKS MAP TO 60%) ───
                    NotificationListener<DraggableScrollableNotification>(
                      onNotification: (notification) {
                        final extent = notification.extent;
                        const minExtent = 0.28;
                        const maxExtent = 0.70;
                        final progress = ((extent - minExtent) / (maxExtent - minExtent)).clamp(0.0, 1.0);
                        final newFactor = 1.0 - (progress * 0.40); // Shrinks from 1.0 down to 0.60 (60%)

                        if ((newFactor - _mapHeightFactor).abs() > 0.005) {
                          setState(() {
                            _mapHeightFactor = newFactor;
                          });
                        }
                        return true;
                      },
                      child: DraggableScrollableSheet(
                        initialChildSize: 0.35,
                        minChildSize: 0.28,
                        maxChildSize: 0.70,
                        builder: (context, scrollController) {
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            decoration: BoxDecoration(
                              color: AppTheme.cardWhite,
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.12),
                                  blurRadius: 16,
                                  offset: const Offset(0, -4),
                                ),
                              ],
                            ),
                            child: ListView(
                              controller: scrollController,
                              physics: const BouncingScrollPhysics(),
                              children: [
                                // Drag Handle Indicator
                                Center(
                                  child: Container(
                                    width: 42,
                                    height: 5,
                                    margin: const EdgeInsets.only(bottom: 12, top: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.grey.shade300,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                  ),
                                ),

                                // Status Card (Online Only)
                                if (state.isOnline) ...[
                                  _buildStatusCard(state),
                                  const SizedBox(height: 10),
                                ],

                                // Today's Earnings & Today's Rides Stats Cards (Equal width in bottom bar/sheet)
                                _buildStatsRow(state),
                                const SizedBox(height: 10),

                                // Vehicle Information Card
                                _buildDriverInfoCard(state),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                );
              },
            ),
          ),

          // ─── 5. FIXED BOTTOM "GO ONLINE" BUTTON ───
          bottomNavigationBar: _buildBottomButtonArea(state),
        );
      },
    );
  }

  Widget _buildTopBar(AppState state) {
    final driver = state.driver!;

    // Resolve clean display name from logged-in Google Account or email
    String displayName = driver.name.trim();
    if (displayName.isEmpty || displayName == 'Google Rider' || displayName == 'Google') {
      if (driver.email.contains('@')) {
        final emailUser = driver.email.split('@').first;
        displayName = emailUser[0].toUpperCase() + emailUser.substring(1);
      } else {
        displayName = 'Rider';
      }
    } else if (displayName.contains(' ')) {
      displayName = displayName.split(' ').first;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          // Google Profile Avatar
          GestureDetector(
            onTap: () => Navigator.pushNamed(context, '/profile'),
            child: CircleAvatar(
              radius: 20,
              backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
              backgroundImage: driver.profileImageUrl.isNotEmpty
                  ? NetworkImage(driver.profileImageUrl)
                  : null,
              child: driver.profileImageUrl.isEmpty
                  ? Text(
                      displayName.substring(0, 1).toUpperCase(),
                      style: AppTheme.titleMedium.copyWith(
                        color: AppTheme.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    )
                  : null,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Hello, $displayName!',
                  style: AppTheme.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: state.isOnline
                            ? AppTheme.success
                            : AppTheme.onSurfaceVariant,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      state.isOnline ? 'Online' : 'Offline',
                      style: AppTheme.bodySmall.copyWith(
                        color: state.isOnline
                            ? AppTheme.success
                            : AppTheme.onSurfaceVariant,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Rating badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppTheme.tertiary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.star_rounded,
                    color: AppTheme.tertiary, size: 14),
                const SizedBox(width: 2),
                Text(
                  driver.rating.toStringAsFixed(1),
                  style: AppTheme.titleMedium.copyWith(
                    color: AppTheme.tertiary,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 4),

          // Small Logout Button
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppTheme.error, size: 20),
            tooltip: 'Logout',
            onPressed: () => _confirmLogout(context, state),
          ),
        ],
      ),
    );
  }

  Widget _buildGpsBadge(AppState state) {
    final loc = state.currentLocation;
    final lat = loc?.latitude ?? 19.0760;
    final lon = loc?.longitude ?? 72.8777;

    return FutureBuilder<String>(
      future: GeocodingService.getLocationName(lat, lon, fallbackCity: state.driver?.city ?? ''),
      builder: (context, snapshot) {
        final locationName = snapshot.data ?? 'Panvel, Navi Mumbai';
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.92),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.1),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.my_location_rounded, size: 13, color: AppTheme.primary),
              const SizedBox(width: 5),
              Text(
                locationName,
                style: AppTheme.labelSmall.copyWith(
                  color: AppTheme.primary,
                  fontWeight: FontWeight.bold,
                  fontSize: 10,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildBottomButtonArea(AppState state) {
    final isOnline = state.isOnline;
    final primaryColor = isOnline ? AppTheme.error : AppTheme.primary;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: BoxDecoration(
        color: AppTheme.cardWhite,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: state.isLoading
                    ? null
                    : () {
                        if (isOnline) {
                          state.goOffline();
                        } else {
                          state.goOnline();
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  elevation: 6,
                  shadowColor: primaryColor.withValues(alpha: 0.4),
                ),
                child: state.isLoading
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Colors.white,
                        ),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            isOnline
                                ? Icons.power_settings_new_rounded
                                : Icons.bolt_rounded,
                            color: Colors.white,
                            size: 24,
                          ),
                          const SizedBox(width: 10),
                          Text(
                            isOnline ? 'GO OFFLINE' : 'GO ONLINE',
                            style: AppTheme.labelLarge.copyWith(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.2,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmLogout(BuildContext context, AppState state) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Row(
          children: const [
            Icon(Icons.logout_rounded, color: AppTheme.error),
            SizedBox(width: 8),
            Text('Logout Rider'),
          ],
        ),
        content: const Text(
          'Are you sure you want to log out of your rider driver account?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await state.logout();
              if (context.mounted) {
                Navigator.pushNamedAndRemoveUntil(
                  context,
                  '/login',
                  (route) => false,
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.error,
            ),
            child: const Text('Logout', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusCard(AppState state) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: state.isOnline
            ? const LinearGradient(
                colors: [Color(0xFF059669), Color(0xFF047857)],
              )
            : const LinearGradient(
                colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
              ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: (state.isOnline ? AppTheme.primary : AppTheme.secondary)
                .withValues(alpha: 0.2),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                state.isOnline
                    ? Icons.wifi_rounded
                    : Icons.wifi_off_rounded,
                color: Colors.white,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                state.isOnline ? 'You\'re Online' : 'You\'re Offline',
                style: AppTheme.titleLarge.copyWith(
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            state.isOnline
                ? 'Searching for ride requests near you...'
                : 'Go online to start receiving ride requests',
            style: AppTheme.bodyMedium.copyWith(
              color: Colors.white.withValues(alpha: 0.8),
            ),
          ),
          if (state.isOnline) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                _buildPulsingDot(),
                const SizedBox(width: 8),
                Text(
                  'Listening for rides',
                  style: AppTheme.bodySmall.copyWith(
                    color: Colors.white.withValues(alpha: 0.7),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPulsingDot() {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(seconds: 2),
      builder: (context, value, child) {
        return Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.5 + value * 0.5),
            shape: BoxShape.circle,
          ),
        );
      },
      onEnd: () {
        if (mounted) setState(() {});
      },
    );
  }

  Widget _buildStatsRow(AppState state) {
    final driver = state.driver!;
    return Row(
      children: [
        _buildStatCard(
          icon: Icons.currency_rupee_rounded,
          label: 'Today\'s Earnings',
          value: '₹${driver.todayEarnings.toStringAsFixed(0)}',
          color: AppTheme.primary,
          onTap: () => Navigator.pushNamed(context, '/ride-history'),
        ),
        const SizedBox(width: 12),
        _buildStatCard(
          icon: Icons.route_rounded,
          label: 'Today\'s Rides',
          value: '${driver.todayRides}',
          color: AppTheme.secondary,
          onTap: () => Navigator.pushNamed(context, '/ride-history'),
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppTheme.cardWhite.withValues(alpha: 0.95),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.outline.withValues(alpha: 0.3)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(icon, size: 16, color: color),
                  ),
                  const Spacer(),
                  const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: Colors.grey),
                ],
              ),
              const SizedBox(height: 10),
              Text(value, style: AppTheme.headlineMedium),
              const SizedBox(height: 2),
              Text(
                label,
                style: AppTheme.bodySmall.copyWith(
                  color: AppTheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDriverInfoCard(AppState state) {
    final driver = state.driver!;
    final loc = state.currentLocation;
    final lat = loc?.latitude ?? 19.0760;
    final lon = loc?.longitude ?? 72.8777;

    return FutureBuilder<String>(
      future: GeocodingService.getLocationName(lat, lon, fallbackCity: driver.city),
      builder: (context, snapshot) {
        final locationName = snapshot.data ?? (driver.city.isNotEmpty ? driver.city : 'Panvel, Navi Mumbai');

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.cardWhite.withValues(alpha: 0.95),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.outline.withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Vehicle Information', style: AppTheme.titleMedium),
              const SizedBox(height: 12),
              _buildInfoRow(Icons.directions_car, 'Vehicle', driver.vehicleModel.isNotEmpty ? driver.vehicleModel : 'Maruti Suzuki Dzire'),
              _buildInfoRow(Icons.pin, 'Number', driver.vehicleNumber.isNotEmpty ? driver.vehicleNumber : 'MH 04 AB 1234'),
              _buildInfoRow(Icons.category, 'Type', driver.vehicleType),
              const Divider(height: 24),
              _buildInfoRow(Icons.location_on, 'Live Location', locationName),
              _buildInfoRow(Icons.route, 'Total Rides', '${driver.totalRides}'),
            ],
          ),
        );
      },
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppTheme.onSurfaceVariant),
          const SizedBox(width: 12),
          Text(
            '$label:',
            style: AppTheme.bodySmall.copyWith(
              color: AppTheme.onSurfaceVariant,
            ),
          ),
          const Spacer(),
          Text(
            value,
            style: AppTheme.titleMedium,
          ),
        ],
      ),
    );
  }
}
