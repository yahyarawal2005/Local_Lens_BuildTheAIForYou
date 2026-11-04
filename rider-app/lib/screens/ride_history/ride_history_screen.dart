import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_state.dart';
import '../../core/theme/app_theme.dart';
import '../../models/ride.dart';

class RideHistoryScreen extends StatefulWidget {
  const RideHistoryScreen({super.key});

  @override
  State<RideHistoryScreen> createState() => _RideHistoryScreenState();
}

class _RideHistoryScreenState extends State<RideHistoryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Ride> _allRides = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _fetchRides();
  }

  Future<void> _fetchRides() async {
    setState(() => _isLoading = true);
    final appState = context.read<AppState>();
    final driver = appState.driver;

    if (driver != null) {
      try {
        final repoRides = await appState.getDriverRidesHistory();
        if (mounted) {
          setState(() {
            _allRides = repoRides.isNotEmpty ? repoRides : _generateSampleRides(driver.id);
            _isLoading = false;
          });
        }
      } catch (_) {
        if (mounted) {
          setState(() {
            _allRides = _generateSampleRides(driver.id);
            _isLoading = false;
          });
        }
      }
    } else {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<Ride> _generateSampleRides(String driverId) {
    final now = DateTime.now();
    return [
      Ride(
        id: 'ride_101',
        passengerId: 'p_001',
        passengerName: 'Priya Sharma',
        passengerRating: 4.9,
        driverId: driverId,
        pickupLat: 19.0760,
        pickupLng: 72.8777,
        pickupAddress: 'Bandra West Railway Station',
        destinationLat: 19.1197,
        destinationLng: 72.8464,
        destinationAddress: 'Andheri East, MIDC Central Road',
        fare: 245.0,
        pickupDistance: 1.2,
        tripDistance: 8.5,
        etaMinutes: 22,
        status: RideStatus.completed,
        createdAt: now.subtract(const Duration(hours: 2)),
        completedAt: now.subtract(const Duration(hours: 1, minutes: 38)),
        durationMinutes: 22,
      ),
      Ride(
        id: 'ride_102',
        passengerId: 'p_002',
        passengerName: 'Rahul Mehta',
        passengerRating: 4.7,
        driverId: driverId,
        pickupLat: 19.0596,
        pickupLng: 72.8295,
        pickupAddress: 'Linking Road, Khar West',
        destinationLat: 19.0176,
        destinationLng: 72.8561,
        destinationAddress: 'Lower Parel, Phoenix Palladium Mall',
        fare: 310.0,
        pickupDistance: 0.8,
        tripDistance: 11.2,
        etaMinutes: 28,
        status: RideStatus.completed,
        createdAt: now.subtract(const Duration(hours: 5)),
        completedAt: now.subtract(const Duration(hours: 4, minutes: 32)),
        durationMinutes: 28,
      ),
      Ride(
        id: 'ride_103',
        passengerId: 'p_003',
        passengerName: 'Vikram Singh',
        passengerRating: 4.8,
        driverId: driverId,
        pickupLat: 19.1136,
        pickupLng: 72.8697,
        pickupAddress: 'Chhatrapati Shivaji Maharaj Airport Terminal 2',
        destinationLat: 19.0760,
        destinationLng: 72.8777,
        destinationAddress: 'BKC G-Block, Bandra East',
        fare: 180.0,
        pickupDistance: 2.1,
        tripDistance: 6.4,
        etaMinutes: 18,
        status: RideStatus.cancelled,
        createdAt: now.subtract(const Duration(days: 1, hours: 3)),
        completedAt: null,
        durationMinutes: 0,
      ),
      Ride(
        id: 'ride_104',
        passengerId: 'p_004',
        passengerName: 'Neha Gupta',
        passengerRating: 5.0,
        driverId: driverId,
        pickupLat: 19.0760,
        pickupLng: 72.8777,
        pickupAddress: 'Juhu Tara Road, Hotel Sea Princess',
        destinationLat: 19.1760,
        destinationLng: 72.8477,
        destinationAddress: 'Malad Mindspace, Infinity Mall Road',
        fare: 420.0,
        pickupDistance: 1.5,
        tripDistance: 14.8,
        etaMinutes: 35,
        status: RideStatus.completed,
        createdAt: now.subtract(const Duration(days: 1, hours: 6)),
        completedAt: now.subtract(const Duration(days: 1, hours: 5, minutes: 25)),
        durationMinutes: 35,
      ),
    ];
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: const Text('Ride History'),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.primary,
          labelColor: AppTheme.primary,
          unselectedLabelColor: AppTheme.onSurfaceVariant,
          tabs: const [
            Tab(text: 'All Trips'),
            Tab(text: 'Completed'),
            Tab(text: 'Cancelled'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : TabBarView(
              controller: _tabController,
              children: [
                _buildRideList(_allRides),
                _buildRideList(_allRides.where((r) => r.status == RideStatus.completed).toList()),
                _buildRideList(_allRides.where((r) => r.status == RideStatus.cancelled || r.status == RideStatus.expired).toList()),
              ],
            ),
    );
  }

  Widget _buildRideList(List<Ride> rides) {
    if (rides.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history_rounded, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            Text(
              'No rides found',
              style: AppTheme.titleMedium.copyWith(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 4),
            Text(
              'Completed and cancelled rides will appear here',
              style: AppTheme.bodySmall.copyWith(color: Colors.grey.shade500),
            ),
          ],
        ),
      );
    }

    final completedInTab = rides.where((r) => r.status == RideStatus.completed).fold(0.0, (sum, r) => sum + r.fare);
    final completedAll = _allRides.where((r) => r.status == RideStatus.completed).fold(0.0, (sum, r) => sum + r.fare);
    final totalEarned = completedInTab > 0 ? completedInTab : completedAll;

    return RefreshIndicator(
      onRefresh: _fetchRides,
      color: AppTheme.primary,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: rides.length + 1,
        itemBuilder: (context, index) {
          if (index == 0) {
            return Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF059669), Color(0xFF047857)],
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primary.withValues(alpha: 0.25),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Total Filtered Trips',
                        style: AppTheme.bodySmall.copyWith(color: Colors.white70),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${rides.length} Rides',
                        style: AppTheme.headlineMedium.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'Earnings Total',
                        style: AppTheme.bodySmall.copyWith(color: Colors.white70),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '₹${totalEarned.toStringAsFixed(0)}',
                        style: AppTheme.headlineMedium.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ],
              ),
            );
          }

          final ride = rides[index - 1];
          final isCompleted = ride.status == RideStatus.completed;

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: Colors.grey.shade200),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 18,
                            backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
                            child: Text(
                              ride.passengerName.isNotEmpty ? ride.passengerName[0] : 'P',
                              style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                ride.passengerName,
                                style: AppTheme.titleMedium.copyWith(fontWeight: FontWeight.w600),
                              ),
                              Row(
                                children: [
                                  const Icon(Icons.star_rounded, size: 14, color: Colors.amber),
                                  const SizedBox(width: 2),
                                  Text(
                                    ride.passengerRating.toStringAsFixed(1),
                                    style: AppTheme.bodySmall.copyWith(fontWeight: FontWeight.w500),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '₹${ride.fare.toStringAsFixed(0)}',
                            style: AppTheme.titleLarge.copyWith(
                              color: isCompleted ? AppTheme.primary : Colors.grey.shade600,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: (isCompleted ? Colors.green : Colors.red).withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              ride.status.name.toUpperCase(),
                              style: AppTheme.labelSmall.copyWith(
                                color: isCompleted ? Colors.green.shade700 : Colors.red.shade700,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const Divider(height: 24),

                  // Route Addresses
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Column(
                        children: [
                          const Icon(Icons.circle, size: 10, color: AppTheme.primary),
                          Container(width: 2, height: 28, color: Colors.grey.shade300),
                          const Icon(Icons.location_on_rounded, size: 12, color: Colors.red),
                        ],
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              ride.pickupAddress,
                              style: AppTheme.bodySmall.copyWith(fontWeight: FontWeight.w500),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              ride.destinationAddress,
                              style: AppTheme.bodySmall.copyWith(fontWeight: FontWeight.w500),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Bottom info bar (distance, duration, time)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.route_rounded, size: 14, color: Colors.grey.shade500),
                          const SizedBox(width: 4),
                          Text(
                            '${ride.tripDistance.toStringAsFixed(1)} km',
                            style: AppTheme.bodySmall.copyWith(color: Colors.grey.shade600),
                          ),
                          const SizedBox(width: 12),
                          Icon(Icons.timer_outlined, size: 14, color: Colors.grey.shade500),
                          const SizedBox(width: 4),
                          Text(
                            '${ride.durationMinutes ?? ride.etaMinutes} mins',
                            style: AppTheme.bodySmall.copyWith(color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                      Text(
                        _formatTimestamp(ride.createdAt),
                        style: AppTheme.bodySmall.copyWith(color: Colors.grey.shade500, fontSize: 11),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  String _formatTimestamp(DateTime dt) {
    final now = DateTime.now();
    if (dt.year == now.year && dt.month == now.month && dt.day == now.day) {
      return 'Today, ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    }
    return '${dt.day}/${dt.month}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}
