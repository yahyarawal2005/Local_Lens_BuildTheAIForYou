import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import '../models/dl_verification_result.dart';
import '../services/smart_license_validator.dart';

class DlVerificationCard extends StatefulWidget {
  final DlVerificationResult result;
  final String currentVehicleType;
  final bool isInitiallyConfirmed;
  final VoidCallback? onUploadAgain;
  final ValueChanged<DlVerificationResult> onConfirmed;

  const DlVerificationCard({
    super.key,
    required this.result,
    required this.currentVehicleType,
    this.isInitiallyConfirmed = false,
    this.onUploadAgain,
    required this.onConfirmed,
  });

  @override
  State<DlVerificationCard> createState() => _DlVerificationCardState();
}

class _DlVerificationCardState extends State<DlVerificationCard> {
  late DlVerificationResult _currentResult;
  late bool _isConfirmed;

  @override
  void initState() {
    super.initState();
    _currentResult = widget.result;
    _isConfirmed = widget.isInitiallyConfirmed;
  }

  @override
  void didUpdateWidget(covariant DlVerificationCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.result != widget.result) {
      _currentResult = widget.result;
    }
    if (oldWidget.isInitiallyConfirmed != widget.isInitiallyConfirmed) {
      _isConfirmed = widget.isInitiallyConfirmed;
    }
  }

  void _showEditDialog() {
    if (_isConfirmed) return;
    final dlController = TextEditingController(text: _currentResult.extractedDlNumber);
    final nameController = TextEditingController(text: _currentResult.holderName);
    final dobController = TextEditingController(text: _currentResult.dateOfBirth);

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: const [
              Icon(Icons.edit_rounded, color: AppTheme.primary),
              SizedBox(width: 8),
              Text('Edit Licence Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Verify or correct your DL Number, Holder Name, and Date of Birth.',
                  style: TextStyle(fontSize: 12, color: AppTheme.onSurfaceVariant),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: dlController,
                  textCapitalization: TextCapitalization.characters,
                  decoration: const InputDecoration(
                    labelText: 'DL Number',
                    hintText: 'e.g. MH1420260012345',
                    prefixIcon: Icon(Icons.badge_outlined),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: nameController,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(
                    labelText: 'Name of Holder',
                    hintText: 'e.g. YAHYA RAWAL',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: dobController,
                  keyboardType: TextInputType.datetime,
                  decoration: const InputDecoration(
                    labelText: 'Date of Birth (YYYY-MM-DD)',
                    hintText: 'e.g. 2005-04-15',
                    prefixIcon: Icon(Icons.cake_outlined),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                final reEvaluated = SmartLicenseValidator.evaluateFields(
                  dlNumber: dlController.text.trim(),
                  holderName: nameController.text.trim(),
                  dateOfBirth: dobController.text.trim(),
                  issueDate: _currentResult.issueDate,
                  validUntil: _currentResult.validUntil,
                  vehicleClasses: _currentResult.vehicleClasses,
                  riderVehicleType: widget.currentVehicleType,
                  ocrDlNumber: _currentResult.extractedDlNumber,
                  verificationMethod: '${_currentResult.verificationMethod}_user_edited',
                );

                setState(() {
                  _currentResult = reEvaluated;
                });

                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Licence details updated and re-validated!'),
                    backgroundColor: AppTheme.primary,
                  ),
                );
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
              child: const Text('Save & Validate', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final status = _currentResult.status;
    Color statusColor;
    IconData statusIcon;
    String statusLabel;

    switch (status) {
      case 'verified':
        statusColor = const Color(0xFF059669); // Emerald green
        statusIcon = Icons.verified_user_rounded;
        statusLabel = '✓ AI Verified';
        break;
      case 'review':
        statusColor = const Color(0xFFD97706); // Amber / Orange
        statusIcon = Icons.warning_amber_rounded;
        statusLabel = '⚠ Verification Requires Review';
        break;
      case 'rejected':
      default:
        statusColor = AppTheme.error;
        statusIcon = Icons.cancel_rounded;
        statusLabel = '✕ Verification Failed';
        break;
    }

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: statusColor.withValues(alpha: 0.35), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: statusColor.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Status Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.10),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
            ),
            child: Row(
              children: [
                Icon(statusIcon, color: statusColor, size: 22),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    statusLabel,
                    style: AppTheme.titleMedium.copyWith(
                      color: statusColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${_currentResult.confidencePercentage}% Confidence',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Disclaimer Banner
                Row(
                  children: [
                    Icon(Icons.shield_outlined, size: 14, color: Colors.grey.shade600),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        _currentResult.verificationMethod.contains('ai')
                            ? 'AI Document Understanding & Field Validation'
                            : 'ML Kit OCR + Local Smart Validation Engine',
                        style: AppTheme.bodySmall.copyWith(
                          fontSize: 11,
                          color: AppTheme.onSurfaceVariant,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Extracted Focused Details Card (DL Number, Holder Name, Date of Birth)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceContainer,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppTheme.outline.withValues(alpha: 0.2)),
                  ),
                  child: Column(
                    children: [
                      _buildDetailRow(
                        icon: Icons.badge_outlined,
                        label: 'DL Number',
                        value: _currentResult.extractedDlNumber.isNotEmpty
                            ? _currentResult.extractedDlNumber
                            : 'Not Extracted',
                        isHighlight: true,
                      ),
                      const Divider(height: 16),
                      _buildDetailRow(
                        icon: Icons.person_outline,
                        label: 'Name of Holder',
                        value: _currentResult.holderName.isNotEmpty
                            ? _currentResult.holderName
                            : 'Not Detected',
                      ),
                      const Divider(height: 16),
                      _buildDetailRow(
                        icon: Icons.cake_outlined,
                        label: 'Date of Birth',
                        value: _currentResult.dateOfBirth.isNotEmpty
                            ? _currentResult.dateOfBirth
                            : 'Not Detected',
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // Vehicle Compatibility Indicator
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: (_currentResult.checks['vehicle_compatibility'] ?? true)
                        ? AppTheme.primary.withValues(alpha: 0.08)
                        : Colors.orange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: (_currentResult.checks['vehicle_compatibility'] ?? true)
                          ? AppTheme.primary.withValues(alpha: 0.25)
                          : Colors.orange.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        (_currentResult.checks['vehicle_compatibility'] ?? true)
                            ? Icons.check_circle_outline_rounded
                            : Icons.info_outline_rounded,
                        size: 16,
                        color: (_currentResult.checks['vehicle_compatibility'] ?? true)
                            ? AppTheme.primary
                            : Colors.orange.shade800,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Vehicle Match: DL Classes (${_currentResult.vehicleClasses.join(",")}) ↔ Selected (${widget.currentVehicleType})',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: (_currentResult.checks['vehicle_compatibility'] ?? true)
                                ? AppTheme.primary
                                : Colors.orange.shade900,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Warnings section if any
                if (_currentResult.warnings.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.amber.shade300),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Validation Notes & Warnings:',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Colors.amber.shade900,
                          ),
                        ),
                        const SizedBox(height: 4),
                        ..._currentResult.warnings.map(
                          (w) => Padding(
                            padding: const EdgeInsets.only(bottom: 2),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('• ', style: TextStyle(fontSize: 11, color: Colors.amber)),
                                Expanded(
                                  child: Text(
                                    w,
                                    style: TextStyle(fontSize: 11, color: Colors.amber.shade900),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 14),

                // Confirmation lock disclaimer notice
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: _isConfirmed ? const Color(0xFFECFDF5) : const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _isConfirmed ? const Color(0xFFA7F3D0) : const Color(0xFFBFDBFE),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _isConfirmed ? Icons.lock_outline_rounded : Icons.info_outline_rounded,
                        size: 16,
                        color: _isConfirmed ? const Color(0xFF059669) : const Color(0xFF1D4ED8),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _isConfirmed
                              ? 'Licence details confirmed & locked. Details cannot be changed.'
                              : 'Note: Once confirmed, your licence details will be locked and cannot be changed.',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: _isConfirmed ? const Color(0xFF065F46) : const Color(0xFF1E40AF),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 14),

                // Action Buttons (Explicitly disabled once confirmed)
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  alignment: WrapAlignment.end,
                  children: [
                    OutlinedButton.icon(
                      onPressed: _isConfirmed ? null : _showEditDialog,
                      icon: Icon(
                        Icons.edit_outlined,
                        size: 16,
                        color: _isConfirmed ? Colors.grey.shade400 : AppTheme.primary,
                      ),
                      label: Text(
                        'Edit',
                        style: TextStyle(
                          color: _isConfirmed ? Colors.grey.shade400 : AppTheme.primary,
                        ),
                      ),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        side: BorderSide(
                          color: _isConfirmed ? Colors.grey.shade300 : AppTheme.primary.withValues(alpha: 0.5),
                        ),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    OutlinedButton.icon(
                      onPressed: _isConfirmed ? null : widget.onUploadAgain,
                      icon: Icon(
                        Icons.refresh_rounded,
                        size: 16,
                        color: _isConfirmed ? Colors.grey.shade400 : AppTheme.primary,
                      ),
                      label: Text(
                        'Re-upload',
                        style: TextStyle(
                          color: _isConfirmed ? Colors.grey.shade400 : AppTheme.primary,
                        ),
                      ),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        side: BorderSide(
                          color: _isConfirmed ? Colors.grey.shade300 : AppTheme.primary.withValues(alpha: 0.5),
                        ),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    ElevatedButton.icon(
                      onPressed: _isConfirmed
                          ? null
                          : () {
                              setState(() {
                                _isConfirmed = true;
                              });
                              widget.onConfirmed(_currentResult);
                            },
                      icon: Icon(
                        _isConfirmed ? Icons.lock_rounded : Icons.check_circle_rounded,
                        size: 18,
                        color: Colors.white,
                      ),
                      label: Text(
                        _isConfirmed ? 'Confirmed & Locked' : 'Confirm',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: statusColor,
                        disabledBackgroundColor: const Color(0xFF059669),
                        disabledForegroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
    bool isHighlight = false,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: isHighlight ? AppTheme.primary : AppTheme.onSurfaceVariant),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 10, color: AppTheme.onSurfaceVariant),
              ),
              const SizedBox(height: 1),
              Text(
                value,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: isHighlight ? 14 : 12,
                  fontWeight: isHighlight ? FontWeight.bold : FontWeight.w600,
                  color: isHighlight ? AppTheme.primary : const Color(0xFF1F2937),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
