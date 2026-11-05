'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MapMarkerPoint } from '@/components/maps/InteractiveMap';
import { MapPin, Navigation, AlertCircle, RefreshCw, Layers } from 'lucide-react';

// Fallback to InteractiveMap if Google Maps script fails or auth is restricted
const InteractiveMapFallback = dynamic(
  () => import('@/components/maps/InteractiveMap').then((m) => m.InteractiveMap),
  { ssr: false, loading: () => <div className="h-full w-full rounded-2xl bg-black/5 animate-pulse" /> }
);

export interface GoogleMapRouteProps {
  markers?: MapMarkerPoint[];
  center?: [number, number];
  zoom?: number;
  showPolyline?: boolean;
  className?: string;
}

declare global {
  interface Window {
    google?: any;
    gm_authFailure?: () => void;
  }
}

const DEFAULT_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  'AIzaSyCjkIl2fmZxKKLCn3wjMSnkn3NFroWBRZQ';

export function GoogleMapRoute({
  markers = [],
  center,
  zoom = 13,
  showPolyline = true,
  className = 'w-full h-full min-h-[280px]',
}: GoogleMapRouteProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);

  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [authWarning, setAuthWarning] = useState<string | null>(null);

  const effectiveCenter: { lat: number; lng: number } = {
    lat:
      center && center[0]
        ? center[0]
        : markers.length > 0 && markers[0].latitude
        ? markers[0].latitude
        : 20.5937,
    lng:
      center && center[1]
        ? center[1]
        : markers.length > 0 && markers[0].longitude
        ? markers[0].longitude
        : 78.9629,
  };

  // Safe Google Maps script injection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Handle Google Maps Auth Failure gracefully without console error explosion
    const originalGmAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      console.warn(
        '[LocalLens] Google Maps Authentication Notice: Maps API is restricted or unactivated. Switching to OpenStreetMap route view.'
      );
      setAuthWarning('Google Maps API key not activated for this domain. Showing interactive OpenStreetMap.');
      setMapStatus('fallback');
      if (typeof originalGmAuthFailure === 'function') {
        try {
          originalGmAuthFailure();
        } catch {
          // ignore
        }
      }
    };

    if (window.google?.maps) {
      setMapStatus('ready');
      return;
    }

    const scriptId = 'google-maps-api-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${DEFAULT_API_KEY}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google?.maps) {
          setMapStatus('ready');
        }
      };
      script.onerror = () => {
        setMapStatus('fallback');
      };
      document.head.appendChild(script);
    } else {
      if (window.google?.maps) {
        setMapStatus('ready');
      } else {
        script.addEventListener('load', () => setMapStatus('ready'));
        script.addEventListener('error', () => setMapStatus('fallback'));
      }
    }

    return () => {
      window.gm_authFailure = originalGmAuthFailure;
    };
  }, []);

  // Initialize and update Google Map
  const renderGoogleMap = useCallback(() => {
    if (!mapContainerRef.current || !window.google?.maps || mapStatus !== 'ready') return;

    try {
      if (!mapInstanceRef.current) {
        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: effectiveCenter,
          zoom,
          mapTypeId: 'roadmap',
          fullscreenControl: true,
          streetViewControl: false,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          },
          zoomControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
            {
              featureType: 'transit',
              elementType: 'labels',
              stylers: [{ visibility: 'simplified' }],
            },
          ],
        });
        mapInstanceRef.current = map;
        infoWindowRef.current = new window.google.maps.InfoWindow();
      } else {
        mapInstanceRef.current.setCenter(effectiveCenter);
      }

      const map = mapInstanceRef.current;

      // Clear previous markers
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      // Clear previous polyline
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }

      const validMarkers = markers.filter((m) => m.latitude && m.longitude);
      const coords: any[] = [];
      const bounds = new window.google.maps.LatLngBounds();

      validMarkers.forEach((m, idx) => {
        const pos = { lat: m.latitude, lng: m.longitude };
        coords.push(pos);
        bounds.extend(pos);

        const orderNum = m.orderNumber ?? idx + 1;

        // Custom SVG Pin with sequence number matching the timeline
        const pinSvg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
            <defs>
              <filter id="shadow" x="-30%" y="-20%" width="160%" height="160%">
                <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.35"/>
              </filter>
            </defs>
            <path fill="#E85028" stroke="#FFFFFF" stroke-width="2" filter="url(#shadow)" d="M18,2 C8.5,2 1,9.5 1,19 C1,31 18,44 18,44 C18,44 35,31 35,19 C35,9.5 27.5,2 18,2 Z"/>
            <circle cx="18" cy="18" r="11" fill="#FFFFFF"/>
            <text x="18" y="22.5" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="12" font-weight="900" fill="#E85028" text-anchor="middle">${orderNum}</text>
          </svg>
        `)}`;

        const marker = new window.google.maps.Marker({
          position: pos,
          map,
          title: `Stop ${orderNum}: ${m.name}`,
          icon: {
            url: pinSvg,
            scaledSize: new window.google.maps.Size(36, 46),
            anchor: new window.google.maps.Point(18, 44),
          },
          animation: window.google.maps.Animation.DROP,
        });

        // Clickable Infowindow
        marker.addListener('click', () => {
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(`
              <div style="font-family: inherit; padding: 6px 4px; max-width: 220px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                  <span style="background-color: #E85028; color: white; border-radius: 9999px; padding: 2px 7px; font-size: 11px; font-weight: 800;">
                    Stop ${orderNum}
                  </span>
                  <span style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700;">
                    ${m.category || 'Experience'}
                  </span>
                </div>
                <h4 style="font-weight: 800; font-size: 14px; margin: 0 0 2px 0; color: #1E293B; line-height: 1.3;">
                  ${m.name}
                </h4>
                <div style="font-size: 11px; color: #94A3B8;">
                  Lat: ${m.latitude.toFixed(4)}, Lon: ${m.longitude.toFixed(4)}
                </div>
              </div>
            `);
            infoWindowRef.current.open(map, marker);
          }
        });

        markersRef.current.push(marker);
      });

      // Connecting Route Sequence Polyline
      if (showPolyline && coords.length > 1) {
        const polyline = new window.google.maps.Polyline({
          path: coords,
          geodesic: true,
          strokeColor: '#E85028',
          strokeOpacity: 0.9,
          strokeWeight: 4,
          icons: [
            {
              icon: {
                path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 2.5,
                strokeColor: '#E85028',
                fillColor: '#E85028',
                fillOpacity: 1,
              },
              offset: '50%',
              repeat: '100px',
            },
          ],
        });
        polyline.setMap(map);
        polylineRef.current = polyline;
      }

      // Auto-fit bounds
      if (coords.length > 1) {
        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      } else if (coords.length === 1) {
        map.setCenter(coords[0]);
        map.setZoom(14);
      }
    } catch (err) {
      console.warn('[LocalLens] Google Maps rendering fallback:', err);
      setMapStatus('fallback');
    }
  }, [effectiveCenter, markers, showPolyline, zoom, mapStatus]);

  useEffect(() => {
    if (mapStatus === 'ready') {
      renderGoogleMap();
    }
  }, [mapStatus, renderGoogleMap]);

  if (mapStatus === 'fallback') {
    return (
      <div className="relative w-full h-full">
        {authWarning && (
          <div className="absolute top-2 left-2 right-2 z-20 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-slate-800 border border-amber-200 dark:border-slate-700 text-[11px] text-amber-800 dark:text-amber-300 shadow-sm flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{authWarning}</span>
            </span>
          </div>
        )}
        <InteractiveMapFallback
          markers={markers}
          center={center}
          zoom={zoom}
          showPolyline={showPolyline}
          className={className}
        />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Loading Skeleton */}
      {mapStatus === 'loading' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <span className="text-xs font-semibold">Loading Google Maps Route Sequence...</span>
        </div>
      )}

      {/* Google Map Div Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[280px]" />

      {/* Powered by Google Maps Badge */}
      <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-[#EAE8E3] dark:border-slate-700 shadow-sm text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Google Maps Route Sequence</span>
      </div>
    </div>
  );
}

