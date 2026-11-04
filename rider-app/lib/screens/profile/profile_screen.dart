import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_state.dart';
import '../../core/theme/app_theme.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, state, _) {
        final driver = state.driver;
        if (driver == null) {
          return const Scaffold(
            body: Center(child: Text('Not logged in')),
          );
        }

        return Scaffold(
          appBar: AppBar(
            title: const Text('Profile'),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_rounded),
              onPressed: () => Navigator.pop(context),
            ),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                const SizedBox(height: 16),

                // Profile header
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF059669), Color(0xFF047857)],
                    ),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 44,
                        backgroundColor:
                            Colors.white.withValues(alpha: 0.2),
                        child: Text(
                          driver.name.substring(0, 1),
                          style: AppTheme.displayLarge.copyWith(
                            color: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        driver.name,
                        style: AppTheme.headlineMedium.copyWith(
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        driver.email,
                        style: AppTheme.bodyMedium.copyWith(
                          color: Colors.white.withValues(alpha: 0.8),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _buildProfileStat(
                              '${driver.totalRides}', 'Total Rides'),
                          Container(
                            width: 1,
                            height: 30,
                            color: Colors.white.withValues(alpha: 0.3),
                            margin: const EdgeInsets.symmetric(
                                horizontal: 24),
                          ),
                          _buildProfileStat(
                              driver.rating.toStringAsFixed(1),
                              'Rating'),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Vehicle & DL Details Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.cardWhite,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: AppTheme.outline.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Vehicle & Driving Licence', style: AppTheme.titleMedium),
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, color: AppTheme.primary),
                            tooltip: 'Edit Car Details',
                            onPressed: () {
                              Navigator.pushNamed(context, '/car-details');
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      _buildInfoRow(Icons.directions_car_rounded, 'Make & Model', driver.vehicleModel.isEmpty ? 'Not specified' : driver.vehicleModel),
                      _buildInfoRow(Icons.pin_outlined, 'Plate Number', driver.vehicleNumber.isEmpty ? 'Not specified' : driver.vehicleNumber),
                      _buildInfoRow(Icons.category_outlined, 'Type', driver.vehicleType),
                      _buildInfoRow(Icons.palette_outlined, 'Color', driver.vehicleColor.isEmpty ? 'White' : driver.vehicleColor),
                      _buildInfoRow(Icons.badge_outlined, 'DL Number', driver.licenseNumber.isEmpty ? 'Not uploaded' : driver.licenseNumber),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: (driver.licenseNumber.isNotEmpty ? const Color(0xFF059669) : Colors.amber.shade800).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: (driver.licenseNumber.isNotEmpty ? const Color(0xFF059669) : Colors.amber.shade800).withValues(alpha: 0.3),
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              driver.licenseNumber.isNotEmpty ? Icons.verified_user_rounded : Icons.pending_rounded,
                              color: driver.licenseNumber.isNotEmpty ? const Color(0xFF059669) : Colors.amber.shade800,
                              size: 16,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                driver.licenseNumber.isNotEmpty
                                    ? 'Status: Verified Format (OCR + Confirmation)'
                                    : 'Status: Pending DL Upload & OCR Verification',
                                style: AppTheme.bodySmall.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: driver.licenseNumber.isNotEmpty ? const Color(0xFF059669) : Colors.amber.shade800,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Account card
                _buildInfoSection(
                  title: 'Account',
                  items: [
                    _InfoItem(Icons.phone, 'Phone', driver.phone),
                    _InfoItem(Icons.email, 'Email', driver.email),
                  ],
                ),
                const SizedBox(height: 16),

                // Settings
                Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: AppTheme.cardWhite,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppTheme.outline.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Column(
                    children: [
                      _buildSettingsTile(
                        Icons.history_rounded,
                        'Ride History',
                        () => Navigator.pushNamed(context, '/ride-history'),
                      ),
                      _buildDivider(),
                      _buildSettingsTile(
                        Icons.settings_outlined,
                        'Settings',
                        () => Navigator.pushNamed(context, '/settings'),
                      ),
                      _buildDivider(),
                      _buildSettingsTile(
                        Icons.help_outline_rounded,
                        'Help & Support',
                        () {},
                      ),
                      _buildDivider(),
                      _buildSettingsTile(
                        Icons.info_outline_rounded,
                        'About',
                        () {},
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Logout button
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      await state.logout();
                      if (context.mounted) {
                        Navigator.pushNamedAndRemoveUntil(
                          context,
                          '/login',
                          (route) => false,
                        );
                      }
                    },
                    icon: const Icon(Icons.logout_rounded),
                    label: const Text('Logout'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.error,
                      side: BorderSide(
                        color: AppTheme.error.withValues(alpha: 0.5),
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Version
                Text(
                  'NearbyRide Driver v1.0.0 (Dev)',
                  style: AppTheme.bodySmall.copyWith(
                    color: AppTheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildProfileStat(String value, String label) {
    return Column(
      children: [
        Text(
          value,
          style: AppTheme.headlineSmall.copyWith(color: Colors.white),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: AppTheme.bodySmall.copyWith(
            color: Colors.white.withValues(alpha: 0.7),
          ),
        ),
      ],
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppTheme.onSurfaceVariant),
          const SizedBox(width: 10),
          Text(
            label,
            style: AppTheme.bodySmall.copyWith(color: AppTheme.onSurfaceVariant),
          ),
          const Spacer(),
          Text(
            value,
            style: AppTheme.titleMedium.copyWith(fontSize: 14, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoSection({
    required String title,
    required List<_InfoItem> items,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.cardWhite,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.outline.withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: AppTheme.titleMedium),
          const SizedBox(height: 12),
          ...items.map((item) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  children: [
                    Icon(item.icon,
                        size: 18, color: AppTheme.onSurfaceVariant),
                    const SizedBox(width: 12),
                    Text(
                      item.label,
                      style: AppTheme.bodySmall.copyWith(
                        color: AppTheme.onSurfaceVariant,
                      ),
                    ),
                    const Spacer(),
                    Text(item.value, style: AppTheme.titleMedium),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildSettingsTile(
      IconData icon, String title, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, color: AppTheme.onSurfaceVariant, size: 22),
      title: Text(title, style: AppTheme.bodyLarge),
      trailing: const Icon(Icons.chevron_right_rounded,
          color: AppTheme.onSurfaceVariant),
      onTap: onTap,
    );
  }

  Widget _buildDivider() {
    return Divider(
      height: 1,
      indent: 56,
      color: AppTheme.outline.withValues(alpha: 0.2),
    );
  }
}

class _InfoItem {
  final IconData icon;
  final String label;
  final String value;

  _InfoItem(this.icon, this.label, this.value);
}
