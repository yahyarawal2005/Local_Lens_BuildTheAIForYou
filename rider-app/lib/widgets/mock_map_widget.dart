import 'dart:math';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../core/theme/app_theme.dart';

// ─────────────────────────────────────────────────────────────────────────────
// GoogleMapWidget — Real Google Maps with live driver tracking
// ─────────────────────────────────────────────────────────────────────────────

class GoogleMapWidget extends StatefulWidget {
  final double driverLat;
  final double driverLng;
  final double? pickupLat;
  final double? pickupLng;
  final double? destinationLat;
  final double? destinationLng;
  final bool showRoute;
  final double height;

  const GoogleMapWidget({
    super.key,
    required this.driverLat,
    required this.driverLng,
    this.pickupLat,
    this.pickupLng,
    this.destinationLat,
    this.destinationLng,
    this.showRoute = false,
    this.height = 300,
  });

  @override
  State<GoogleMapWidget> createState() => _GoogleMapWidgetState();
}

class _GoogleMapWidgetState extends State<GoogleMapWidget>
    with SingleTickerProviderStateMixin {
  GoogleMapController? _mapController;
  BitmapDescriptor? _driverIcon;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
    _buildDriverIcon();
  }

  @override
  void dispose() {
    _mapController?.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  /// Programmatically draw a circular driver icon using ui.Canvas.
  Future<void> _buildDriverIcon() async {
    final size = 60.0;
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);

    // Outer glow ring
    canvas.drawCircle(
      Offset(size / 2, size / 2),
      size / 2 - 2,
      Paint()
        ..color = const Color(0xFF059669).withValues(alpha: 0.25)
        ..style = PaintingStyle.fill,
    );
    // White border
    canvas.drawCircle(
      Offset(size / 2, size / 2),
      size / 2 - 8,
      Paint()
        ..color = Colors.white
        ..style = PaintingStyle.fill,
    );
    // Green fill
    canvas.drawCircle(
      Offset(size / 2, size / 2),
      size / 2 - 12,
      Paint()
        ..color = const Color(0xFF059669)
        ..style = PaintingStyle.fill,
    );

    // Car icon (simple triangle pointing up = arrow)
    final iconPath = Path();
    final cx = size / 2;
    final cy = size / 2;
    iconPath.moveTo(cx, cy - 10);
    iconPath.lineTo(cx - 7, cy + 6);
    iconPath.lineTo(cx + 7, cy + 6);
    iconPath.close();
    canvas.drawPath(
      iconPath,
      Paint()
        ..color = Colors.white
        ..style = PaintingStyle.fill,
    );

    final picture = recorder.endRecording();
    final image =
        await picture.toImage(size.toInt(), size.toInt());
    final byteData =
        await image.toByteData(format: ui.ImageByteFormat.png);

    if (byteData != null && mounted) {
      setState(() {
        _driverIcon = BitmapDescriptor.bytes(
          byteData.buffer.asUint8List(),
          width: size,
          height: size,
        );
      });
    }
  }

  @override
  void didUpdateWidget(covariant GoogleMapWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Animate camera when driver moves
    if (oldWidget.driverLat != widget.driverLat ||
        oldWidget.driverLng != widget.driverLng) {
      _mapController?.animateCamera(
        CameraUpdate.newLatLng(
          LatLng(widget.driverLat, widget.driverLng),
        ),
      );
    }
  }

  Set<Marker> _buildMarkers() {
    final markers = <Marker>{};

    // Driver marker
    markers.add(Marker(
      markerId: const MarkerId('driver'),
      position: LatLng(widget.driverLat, widget.driverLng),
      icon: _driverIcon ?? BitmapDescriptor.defaultMarkerWithHue(
        BitmapDescriptor.hueGreen,
      ),
      infoWindow: const InfoWindow(title: 'You', snippet: 'Your location'),
      zIndexInt: 3,
    ));

    // Pickup marker
    if (widget.pickupLat != null && widget.pickupLng != null) {
      markers.add(Marker(
        markerId: const MarkerId('pickup'),
        position: LatLng(widget.pickupLat!, widget.pickupLng!),
        icon: BitmapDescriptor.defaultMarkerWithHue(
          BitmapDescriptor.hueGreen,
        ),
        infoWindow: const InfoWindow(title: 'Pickup', snippet: 'Pickup point'),
        zIndexInt: 2,
      ));
    }

    // Destination marker
    if (widget.destinationLat != null && widget.destinationLng != null) {
      markers.add(Marker(
        markerId: const MarkerId('destination'),
        position: LatLng(widget.destinationLat!, widget.destinationLng!),
        icon: BitmapDescriptor.defaultMarkerWithHue(
          BitmapDescriptor.hueRed,
        ),
        infoWindow:
            const InfoWindow(title: 'Destination', snippet: 'Drop-off point'),
        zIndexInt: 2,
      ));
    }

    return markers;
  }

  Set<Polyline> _buildPolylines() {
    if (!widget.showRoute) return {};
    final polylines = <Polyline>{};

    // Driver → Pickup
    if (widget.pickupLat != null && widget.pickupLng != null) {
      polylines.add(Polyline(
        polylineId: const PolylineId('driver_to_pickup'),
        points: [
          LatLng(widget.driverLat, widget.driverLng),
          LatLng(widget.pickupLat!, widget.pickupLng!),
        ],
        color: AppTheme.primary,
        width: 4,
        patterns: [],
        startCap: Cap.roundCap,
        endCap: Cap.roundCap,
      ));
    }

    // Pickup → Destination
    if (widget.pickupLat != null &&
        widget.pickupLng != null &&
        widget.destinationLat != null &&
        widget.destinationLng != null) {
      polylines.add(Polyline(
        polylineId: const PolylineId('pickup_to_destination'),
        points: [
          LatLng(widget.pickupLat!, widget.pickupLng!),
          LatLng(widget.destinationLat!, widget.destinationLng!),
        ],
        color: AppTheme.primary.withValues(alpha: 0.5),
        width: 3,
        patterns: [PatternItem.dash(20), PatternItem.gap(10)],
        startCap: Cap.roundCap,
        endCap: Cap.squareCap,
      ));
    } else if (widget.destinationLat != null && widget.destinationLng != null) {
      // Direct route driver → destination
      polylines.add(Polyline(
        polylineId: const PolylineId('driver_to_destination'),
        points: [
          LatLng(widget.driverLat, widget.driverLng),
          LatLng(widget.destinationLat!, widget.destinationLng!),
        ],
        color: AppTheme.primary,
        width: 4,
        startCap: Cap.roundCap,
        endCap: Cap.roundCap,
      ));
    }

    return polylines;
  }

  CameraPosition _initialCamera() {
    return CameraPosition(
      target: LatLng(widget.driverLat, widget.driverLng),
      zoom: widget.pickupLat != null || widget.destinationLat != null
          ? 13.5
          : 15.0,
    );
  }

  @override
  Widget build(BuildContext context) {
    final borderRadius = widget.height == double.infinity
        ? BorderRadius.zero
        : BorderRadius.circular(16);

    return SizedBox(
      height: widget.height,
      width: double.infinity,
      child: ClipRRect(
        borderRadius: borderRadius,
        child: GoogleMap(
          initialCameraPosition: _initialCamera(),
          markers: _buildMarkers(),
          polylines: _buildPolylines(),
          myLocationEnabled: false, // We draw our own marker
          myLocationButtonEnabled: false,
          zoomControlsEnabled: false,
          mapToolbarEnabled: false,
          compassEnabled: false,
          onMapCreated: (controller) {
            _mapController = controller;
          },
          mapType: MapType.normal,
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MockMapWidget — Canvas-based fallback (kept for simulator / offline use)
// ─────────────────────────────────────────────────────────────────────────────

/// Mock map widget that visually represents locations, markers, and routes.
/// Use when Google Maps is not available (simulator without API key, tests).
class MockMapWidget extends StatefulWidget {
  final double driverLat;
  final double driverLng;
  final double? pickupLat;
  final double? pickupLng;
  final double? destinationLat;
  final double? destinationLng;
  final bool showRoute;
  final double height;

  const MockMapWidget({
    super.key,
    required this.driverLat,
    required this.driverLng,
    this.pickupLat,
    this.pickupLng,
    this.destinationLat,
    this.destinationLng,
    this.showRoute = false,
    this.height = 300,
  });

  @override
  State<MockMapWidget> createState() => _MockMapWidgetState();
}

class _MockMapWidgetState extends State<MockMapWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final borderRadius = widget.height == double.infinity
        ? BorderRadius.zero
        : BorderRadius.circular(16);

    return Container(
      height: widget.height,
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFE8F0E8),
        borderRadius: borderRadius,
      ),
      child: ClipRRect(
        borderRadius: borderRadius,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth;
            final height = constraints.maxHeight;

            final minLat = _getMinLat() - 0.01;
            final maxLat = _getMaxLat() + 0.01;
            final minLng = _getMinLng() - 0.01;
            final maxLng = _getMaxLng() + 0.01;

            double getX(double lng) {
              if (maxLng == minLng) return width / 2;
              return ((lng - minLng) / (maxLng - minLng) * (width - 60)) + 30;
            }

            double getY(double lat) {
              if (maxLat == minLat) return height / 2;
              return ((maxLat - lat) / (maxLat - minLat) * (height - 60)) + 30;
            }

            return Stack(
              children: [
                CustomPaint(
                  size: Size(width, height),
                  painter: _MapGridPainter(),
                ),
                CustomPaint(
                  size: Size(width, height),
                  painter: _RoadPainter(
                    driverLat: widget.driverLat,
                    driverLng: widget.driverLng,
                    pickupLat: widget.pickupLat,
                    pickupLng: widget.pickupLng,
                    destinationLat: widget.destinationLat,
                    destinationLng: widget.destinationLng,
                    showRoute: widget.showRoute,
                  ),
                ),
                _buildDriverMarker(
                  getX(widget.driverLng),
                  getY(widget.driverLat),
                ),
                if (widget.pickupLat != null && widget.pickupLng != null)
                  _buildPickupMarker(
                    getX(widget.pickupLng!),
                    getY(widget.pickupLat!),
                  ),
                if (widget.destinationLat != null &&
                    widget.destinationLng != null)
                  _buildDestinationMarker(
                    getX(widget.destinationLng!),
                    getY(widget.destinationLat!),
                  ),
                Positioned(
                  bottom: 8,
                  right: 8,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      'Offline Map • No API Key',
                      style: AppTheme.labelSmall.copyWith(
                        fontSize: 8,
                        color: AppTheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildDriverMarker(double x, double y) {
    return Positioned(
      left: x - 22,
      top: y - 22,
      child: AnimatedBuilder(
        animation: _pulseController,
        builder: (context, child) {
          final scale = 1.0 + (_pulseController.value * 0.6);
          final opacity = (1.0 - _pulseController.value).clamp(0.0, 1.0);
          final blinkOpacity = 0.3 + (_pulseController.value * 0.7);

          return SizedBox(
            width: 44,
            height: 44,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Outer expanding radar pulse ring
                Transform.scale(
                  scale: scale,
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppTheme.primary.withValues(alpha: opacity * 0.35),
                      border: Border.all(
                        color: AppTheme.primary.withValues(alpha: opacity * 0.8),
                        width: 2,
                      ),
                    ),
                  ),
                ),
                // Middle continuous blinking ring
                Opacity(
                  opacity: blinkOpacity,
                  child: Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppTheme.primary.withValues(alpha: 0.2),
                      border: Border.all(color: Colors.white, width: 2.5),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primary.withValues(alpha: 0.6),
                          blurRadius: 10,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                  ),
                ),
                // Core blinking dot
                Opacity(
                  opacity: blinkOpacity,
                  child: Container(
                    width: 14,
                    height: 14,
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2.5),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildPickupMarker(double x, double y) {
    return Positioned(
      left: x - 14,
      top: y - 28,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: AppTheme.primary,
              borderRadius: BorderRadius.circular(8),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.15),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Text(
              'PICKUP',
              style: AppTheme.labelSmall.copyWith(
                color: Colors.white,
                fontSize: 7,
              ),
            ),
          ),
          const SizedBox(height: 2),
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: AppTheme.primary,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDestinationMarker(double x, double y) {
    return Positioned(
      left: x - 14,
      top: y - 28,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: AppTheme.error,
              borderRadius: BorderRadius.circular(8),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.15),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Text(
              'DROP',
              style: AppTheme.labelSmall.copyWith(
                color: Colors.white,
                fontSize: 7,
              ),
            ),
          ),
          const SizedBox(height: 2),
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: AppTheme.error,
              shape: BoxShape.rectangle,
              borderRadius: BorderRadius.circular(2),
              border: Border.all(color: Colors.white, width: 2),
            ),
          ),
        ],
      ),
    );
  }

  double _getMinLat() {
    double m = widget.driverLat;
    if (widget.pickupLat != null) m = min(m, widget.pickupLat!);
    if (widget.destinationLat != null) m = min(m, widget.destinationLat!);
    return m;
  }

  double _getMaxLat() {
    double m = widget.driverLat;
    if (widget.pickupLat != null) m = max(m, widget.pickupLat!);
    if (widget.destinationLat != null) m = max(m, widget.destinationLat!);
    return m;
  }

  double _getMinLng() {
    double m = widget.driverLng;
    if (widget.pickupLng != null) m = min(m, widget.pickupLng!);
    if (widget.destinationLng != null) m = min(m, widget.destinationLng!);
    return m;
  }

  double _getMaxLng() {
    double m = widget.driverLng;
    if (widget.pickupLng != null) m = max(m, widget.pickupLng!);
    if (widget.destinationLng != null) m = max(m, widget.destinationLng!);
    return m;
  }
}

class _MapGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Paint()..color = const Color(0xFFE8EFE5),
    );
    final paintLight = Paint()
      ..color = const Color(0xFFD4DDD0)
      ..strokeWidth = 0.5;
    final paintRoad = Paint()
      ..color = const Color(0xFFFAFAFA)
      ..strokeWidth = 3;
    for (double y = 0; y < size.height; y += 50) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paintLight);
    }
    for (double x = 0; x < size.width; x += 50) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paintLight);
    }
    canvas.drawLine(
      Offset(0, size.height * 0.3),
      Offset(size.width, size.height * 0.3),
      paintRoad,
    );
    canvas.drawLine(
      Offset(size.width * 0.4, 0),
      Offset(size.width * 0.4, size.height),
      paintRoad,
    );
    canvas.drawLine(
      Offset(0, size.height * 0.7),
      Offset(size.width, size.height * 0.7),
      paintRoad,
    );
    canvas.drawLine(
      Offset(size.width * 0.7, 0),
      Offset(size.width * 0.7, size.height),
      paintRoad,
    );
    final parkPaint = Paint()..color = const Color(0xFFCADBC5);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(size.width * 0.1, size.height * 0.4, 60, 40),
        const Radius.circular(8),
      ),
      parkPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(size.width * 0.6, size.height * 0.5, 50, 35),
        const Radius.circular(8),
      ),
      parkPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _RoadPainter extends CustomPainter {
  final double driverLat, driverLng;
  final double? pickupLat, pickupLng, destinationLat, destinationLng;
  final bool showRoute;

  _RoadPainter({
    required this.driverLat,
    required this.driverLng,
    this.pickupLat,
    this.pickupLng,
    this.destinationLat,
    this.destinationLng,
    this.showRoute = false,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (!showRoute) return;
    final routePaint = Paint()
      ..color = AppTheme.primary
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    final dashPaint = Paint()
      ..color = AppTheme.primary.withValues(alpha: 0.4)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    final allLats = [
      driverLat,
      if (pickupLat != null) pickupLat!,
      if (destinationLat != null) destinationLat!
    ];
    final allLngs = [
      driverLng,
      if (pickupLng != null) pickupLng!,
      if (destinationLng != null) destinationLng!
    ];

    final minLat = allLats.reduce(min) - 0.01;
    final maxLat = allLats.reduce(max) + 0.01;
    final minLng = allLngs.reduce(min) - 0.01;
    final maxLng = allLngs.reduce(max) + 0.01;

    Offset toOffset(double lat, double lng) {
      final x = ((lng - minLng) / (maxLng - minLng) * (size.width - 60)) + 30;
      final y =
          ((maxLat - lat) / (maxLat - minLat) * (size.height - 60)) + 30;
      return Offset(x, y);
    }

    final driverPos = toOffset(driverLat, driverLng);

    if (pickupLat != null && pickupLng != null) {
      final pickupPos = toOffset(pickupLat!, pickupLng!);
      final path = Path()
        ..moveTo(driverPos.dx, driverPos.dy)
        ..cubicTo(
          driverPos.dx + (pickupPos.dx - driverPos.dx) * 0.3,
          driverPos.dy,
          pickupPos.dx - (pickupPos.dx - driverPos.dx) * 0.3,
          pickupPos.dy,
          pickupPos.dx,
          pickupPos.dy,
        );
      canvas.drawPath(path, routePaint);

      if (destinationLat != null && destinationLng != null) {
        final destPos = toOffset(destinationLat!, destinationLng!);
        final path2 = Path()
          ..moveTo(pickupPos.dx, pickupPos.dy)
          ..cubicTo(
            pickupPos.dx + (destPos.dx - pickupPos.dx) * 0.3,
            pickupPos.dy,
            destPos.dx - (destPos.dx - pickupPos.dx) * 0.3,
            destPos.dy,
            destPos.dx,
            destPos.dy,
          );
        canvas.drawPath(path2, dashPaint);
      }
    } else if (destinationLat != null && destinationLng != null) {
      final destPos = toOffset(destinationLat!, destinationLng!);
      final path = Path()
        ..moveTo(driverPos.dx, driverPos.dy)
        ..cubicTo(
          driverPos.dx + (destPos.dx - driverPos.dx) * 0.3,
          driverPos.dy,
          destPos.dx - (destPos.dx - driverPos.dx) * 0.3,
          destPos.dy,
          destPos.dx,
          destPos.dy,
        );
      canvas.drawPath(path, routePaint);
    }
  }

  @override
  bool shouldRepaint(covariant _RoadPainter oldDelegate) => true;
}
