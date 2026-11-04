'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export interface MapMarkerPoint {
  id: string;
  name: string;
  category?: string;
  latitude: number;
  longitude: number;
  isDriver?: boolean;
  isPickup?: boolean;
  isDrop?: boolean;
  orderNumber?: number;
}

interface InteractiveMapProps {
  markers?: MapMarkerPoint[];
  center?: [number, number];
  zoom?: number;
  showPolyline?: boolean;
  className?: string;
}

export function InteractiveMap({
  markers = [],
  center,
  zoom = 13,
  showPolyline = true,
  className = 'h-72 w-full rounded-2xl overflow-hidden',
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const effectiveCenter: [number, number] =
    center && center[0] && center[1]
      ? center
      : markers.length > 0 && markers[0].latitude && markers[0].longitude
      ? [markers[0].latitude, markers[0].longitude]
      : [20.5937, 78.9629];

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: effectiveCenter,
        zoom,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView(effectiveCenter, zoom);
    }

    const map = mapInstanceRef.current;

    // Clear previous layers except tile layer
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const latLngs: L.LatLngExpression[] = [];

    // Add markers
    markers.forEach((m) => {
      if (!m.latitude || !m.longitude) return;

      const latlng: [number, number] = [m.latitude, m.longitude];
      latLngs.push(latlng);

      let pinHtml = '';
      if (m.isDriver) {
        pinHtml = `<div style="background-color: #E85028; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(232,80,40,0.5); border: 2px solid white; font-size: 16px;">🚗</div>`;
      } else if (m.isPickup) {
        pinHtml = `<div style="background-color: #5A7363; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(90,115,99,0.4); border: 2px solid white; font-weight: bold; font-size: 11px;">P</div>`;
      } else if (m.isDrop) {
        pinHtml = `<div style="background-color: #BA1A1A; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(186,26,26,0.4); border: 2px solid white; font-weight: bold; font-size: 11px;">D</div>`;
      } else if (m.orderNumber != null) {
        pinHtml = `<div style="background-color: #E85028; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(232,80,40,0.4); border: 2px solid white; font-weight: 800; font-size: 12px;">${m.orderNumber}</div>`;
      } else {
        pinHtml = `<div style="background-color: #1A1A1A; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.3); border: 2px solid white; font-size: 11px;">📍</div>`;
      }

      const customIcon = L.divIcon({
        className: 'custom-leaflet-pin',
        html: pinHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(latlng, { icon: customIcon }).addTo(map);
      marker.bindPopup(`<b>${m.name}</b><br/><span style="font-size:11px; color:#666;">${m.category || ''}</span>`);
    });

    // Draw route polyline if requested
    if (showPolyline && latLngs.length > 1) {
      L.polyline(latLngs, {
        color: '#E85028',
        weight: 4,
        opacity: 0.85,
        dashArray: '6, 8',
      }).addTo(map);

      map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
    }
  }, [markers, center, zoom, showPolyline]);

  return <div ref={mapContainerRef} className={className} />;
}
