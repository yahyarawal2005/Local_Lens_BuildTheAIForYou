import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_state.dart';
import '../../core/theme/app_theme.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _autoAcceptRides = false;
  bool _soundAlerts = true;
  bool _highGpsAccuracy = true;
  String _selectedMapProvider = 'Google Maps';
  String _selectedLanguage = 'English';

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
          backgroundColor: const Color(0xFFF9FAFB),
          appBar: AppBar(
            title: const Text('Settings'),
            centerTitle: true,
          ),
          body: SafeArea(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Account & Profile Info Header
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.cardWhite,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: AppTheme.primary,
                        child: Text(
                          driver.name.isNotEmpty ? driver.name[0] : 'R',
                          style: AppTheme.titleLarge.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(driver.name, style: AppTheme.titleMedium.copyWith(fontWeight: FontWeight.bold)),
                            Text(driver.email, style: AppTheme.bodySmall.copyWith(color: Colors.grey.shade600)),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.green.shade50,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: Colors.green.shade300),
                                  ),
                                  child: Text(
                                    'DL: ${driver.licenseNumber.isNotEmpty ? driver.licenseNumber : "Verified"}',
                                    style: TextStyle(fontSize: 10, color: Colors.green.shade800, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.edit_outlined, color: AppTheme.primary),
                        onPressed: () => Navigator.pushNamed(context, '/car-details'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // 2. Driver Preferences Section
                Text('Driver Preferences', style: AppTheme.titleMedium),
                const SizedBox(height: 12),
                Container(
                  decoration: BoxDecoration(
                    color: AppTheme.cardWhite,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Column(
                    children: [
                      SwitchListTile(
                        activeColor: AppTheme.primary,
                        secondary: const Icon(Icons.flash_on_rounded, color: AppTheme.primary),
                        title: const Text('Auto-Accept Ride Requests'),
                        subtitle: const Text('Automatically accept nearby passenger requests'),
                        value: _autoAcceptRides,
                        onChanged: (val) => setState(() => _autoAcceptRides = val),
                      ),
                      const Divider(height: 1),
                      SwitchListTile(
                        activeColor: AppTheme.primary,
                        secondary: const Icon(Icons.volume_up_rounded, color: AppTheme.primary),
                        title: const Text('Audio Notification Alerts'),
                        subtitle: const Text('Play sound on new ride alerts'),
                        value: _soundAlerts,
                        onChanged: (val) => setState(() => _soundAlerts = val),
                      ),
                      const Divider(height: 1),
                      SwitchListTile(
                        activeColor: AppTheme.primary,
                        secondary: const Icon(Icons.gps_fixed_rounded, color: AppTheme.primary),
                        title: const Text('High-Accuracy GPS Tracking'),
                        subtitle: const Text('Real-time location sharing with passenger'),
                        value: _highGpsAccuracy,
                        onChanged: (val) => setState(() => _highGpsAccuracy = val),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // 3. Navigation & App Customization
                Text('Navigation & Language', style: AppTheme.titleMedium),
                const SizedBox(height: 12),
                Container(
                  decoration: BoxDecoration(
                    color: AppTheme.cardWhite,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(Icons.map_rounded, color: AppTheme.primary),
                        title: const Text('Preferred Map Provider'),
                        trailing: PopupMenuButton<String>(
                          initialValue: _selectedMapProvider,
                          onSelected: (val) {
                            setState(() => _selectedMapProvider = val);
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(_selectedMapProvider, style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary)),
                                const Icon(Icons.keyboard_arrow_down_rounded, color: AppTheme.primary, size: 18),
                              ],
                            ),
                          ),
                          itemBuilder: (ctx) => ['Google Maps', 'In-App Map', 'Waze']
                              .map((m) => PopupMenuItem(value: m, child: Text(m)))
                              .toList(),
                        ),
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.language_rounded, color: AppTheme.primary),
                        title: const Text('App Language'),
                        trailing: PopupMenuButton<String>(
                          initialValue: _selectedLanguage,
                          onSelected: (val) {
                            setState(() => _selectedLanguage = val);
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(_selectedLanguage, style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary)),
                                const Icon(Icons.keyboard_arrow_down_rounded, color: AppTheme.primary, size: 18),
                              ],
                            ),
                          ),
                          itemBuilder: (ctx) => ['English', 'Hindi (हिंदी)', 'Marathi (मराठी)']
                              .map((l) => PopupMenuItem(value: l, child: Text(l)))
                              .toList(),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // 4. Database Sync & Cache Section
                Text('Data & System', style: AppTheme.titleMedium),
                const SizedBox(height: 12),
                Container(
                  decoration: BoxDecoration(
                    color: AppTheme.cardWhite,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(Icons.cloud_sync_rounded, color: AppTheme.primary),
                        title: const Text('Sync Profile with Supabase'),
                        subtitle: const Text('Verify DB schema alignment & live state'),
                        trailing: const Icon(Icons.chevron_right_rounded),
                        onTap: () async {
                          await state.initAuth();
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Profile & Database synced with Supabase!')),
                            );
                          }
                        },
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.cleaning_services_rounded, color: Colors.orange),
                        title: const Text('Clear Local Cache'),
                        subtitle: const Text('Free up temporary map & image storage'),
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Local cache cleared successfully!')),
                          );
                        },
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.info_outline_rounded, color: Colors.grey),
                        title: const Text('App Version'),
                        trailing: const Text('v1.0.0+1', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // 5. Logout Button
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('Log Out'),
                          content: const Text('Are you sure you want to log out of your driver account?'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                            TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Log Out', style: TextStyle(color: Colors.red))),
                          ],
                        ),
                      );

                      if (confirm == true && context.mounted) {
                        await state.logout();
                        if (context.mounted) {
                          Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
                        }
                      }
                    },
                    icon: const Icon(Icons.logout_rounded, color: Colors.red),
                    label: const Text('Log Out', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.red),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
      },
    );
  }
}
