"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, X, MapPin, Loader2, Compass } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// Fix standard Leaflet default icon URL issues with Next.js webpack
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface LocationPinDetails {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
}

export interface LeafletPinDropperProps {
  position: { lat: number; lng: number };
  onPinSelected: (coords: LocationPinDetails) => void;
  venueName?: string;
}

interface LocationSuggestion {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  city?: string;
  district?: string;
  state?: string;
  source: "verified" | "osm" | "city";
}

const LocationPicker: React.FC<{
  position: { lat: number; lng: number };
  onPinSelected: (coords: LocationPinDetails) => void;
  venueName?: string;
}> = ({ position, onPinSelected, venueName = "Selected Venue" }) => {
  const markerRef = React.useRef<any>(null);

  const map = useMapEvents({
    click(e) {
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));
      onPinSelected({ lat, lng });
      map.flyTo(e.latlng, map.getZoom(), { animate: true, duration: 0.5 });
    },
  });

  useEffect(() => {
    map.flyTo([position.lat, position.lng], map.getZoom(), { animate: true, duration: 0.5 });
  }, [position.lat, position.lng, map]);

  const eventHandlers = React.useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          const lat = Number(latLng.lat.toFixed(6));
          const lng = Number(latLng.lng.toFixed(6));
          onPinSelected({ lat, lng });
        }
      },
    }),
    [onPinSelected]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={[position.lat, position.lng]}
      icon={defaultIcon}
      ref={markerRef}
    />
  );
};

export const LeafletPinDropper: React.FC<LeafletPinDropperProps> = ({
  position,
  onPinSelected,
  venueName = "Selected Venue",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const reqCounterRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);

    // 1. Immediately clear old/stale suggestions so previous results never show
    setSuggestions([]);

    // 2. Abort any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 3. Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = val.trim();
    if (trimmed.length < 2) {
      setIsSearching(false);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);

    // 4. Increment request ID to strictly drop older responses
    const currentReqId = ++reqCounterRef.current;

    // Fast 150ms debounce
    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const results: LocationSuggestion[] = [];
        const seenKeys = new Set<string>();

        // A. Instant query against verified local database places
        try {
          const { data: dbData } = await supabase
            .from("experience")
            .select("experience_id, experience_name, city, district, state, latitude, longitude")
            .or(`experience_name.ilike.%${trimmed}%,city.ilike.%${trimmed}%,district.ilike.%${trimmed}%`)
            .not("latitude", "is", null)
            .not("longitude", "is", null)
            .limit(6);

          if (reqCounterRef.current !== currentReqId) return;

          if (Array.isArray(dbData)) {
            for (const item of dbData) {
              const name = item.experience_name?.trim();
              const city = item.city?.trim() || "";
              const state = item.state?.trim() || "";
              const key = `${name}-${city}`.toLowerCase();
              if (name && !seenKeys.has(key)) {
                seenKeys.add(key);
                results.push({
                  id: `db-${item.experience_id}`,
                  name,
                  displayName: `${name}, ${city}${state ? `, ${state}` : ""}`,
                  lat: Number(item.latitude),
                  lng: Number(item.longitude),
                  city,
                  district: item.district?.trim() || city,
                  state,
                  source: "verified",
                });
              }
            }
          }
        } catch {
          // ignore DB error
        }

        // B. Query Open-Meteo for cities & towns
        if (!controller.signal.aborted) {
          try {
            const meteoRes = await fetch(
              `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=4&language=en&format=json`,
              { signal: controller.signal }
            );

            if (reqCounterRef.current !== currentReqId) return;

            if (meteoRes.ok) {
              const meteoData = await meteoRes.json();
              if (Array.isArray(meteoData.results)) {
                for (const item of meteoData.results) {
                  const name = item.name?.trim();
                  const country = item.country?.trim() || "";
                  const admin1 = item.admin1?.trim() || "";
                  const key = `${name}-${country}`.toLowerCase();
                  if (name && !seenKeys.has(key)) {
                    seenKeys.add(key);
                    results.push({
                      id: `meteo-${item.id}`,
                      name,
                      displayName: `${name}, ${admin1}${country ? `, ${country}` : ""}`,
                      lat: Number(item.latitude),
                      lng: Number(item.longitude),
                      city: name,
                      district: item.admin2?.trim() || admin1,
                      state: admin1,
                      source: "city",
                    });
                  }
                }
              }
            }
          } catch {
            // ignore network error
          }
        }

        // C. Client-side OpenStreetMap Nominatim query if results are fewer than 3
        if (!controller.signal.aborted && results.length < 3) {
          try {
            const osmRes = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=4&addressdetails=1`,
              { signal: controller.signal }
            );

            if (reqCounterRef.current !== currentReqId) return;

            if (osmRes.ok) {
              const osmData = await osmRes.json();
              if (Array.isArray(osmData)) {
                for (const item of osmData) {
                  const name = item.name || item.display_name?.split(",")[0]?.trim();
                  const key = `${name}-${item.lat}-${item.lon}`.toLowerCase();
                  if (name && !seenKeys.has(key)) {
                    seenKeys.add(key);
                    results.push({
                      id: `osm-${item.place_id}`,
                      name,
                      displayName: item.display_name,
                      lat: parseFloat(item.lat),
                      lng: parseFloat(item.lon),
                      city: item.address?.city || item.address?.town || item.address?.suburb || "",
                      district: item.address?.county || item.address?.state_district || "",
                      state: item.address?.state || "",
                      source: "osm",
                    });
                  }
                }
              }
            }
          } catch {
            // ignore Nominatim error
          }
        }

        // 5. Ensure this is still the current search response
        if (reqCounterRef.current === currentReqId) {
          setSuggestions(results);
          setIsSearching(false);
        }
      } catch (err: any) {
        if (err.name !== "AbortError" && reqCounterRef.current === currentReqId) {
          setIsSearching(false);
        }
      }
    }, 150);
  };

  const handleSelectSuggestion = (s: LocationSuggestion) => {
    setSearchQuery(s.name);
    setSuggestions([]);
    setShowDropdown(false);
    onPinSelected({
      lat: s.lat,
      lng: s.lng,
      address: s.displayName,
      city: s.city,
      district: s.district,
      state: s.state,
    });
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="w-full h-full min-h-[340px] rounded-2xl overflow-hidden border border-slate-200 relative shadow-inner z-0">
      {/* Floating Instant Place Search Bar */}
      <div
        ref={dropdownRef}
        className="absolute top-2.5 left-2.5 right-2.5 sm:right-auto sm:w-80 z-[1000] pointer-events-auto"
      >
        <div className="relative">
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/95 backdrop-blur-md shadow-md border border-slate-200/90 text-xs">
            <Search className="w-3.5 h-3.5 text-[#00875A] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowDropdown(true);
              }}
              placeholder="Search place or venue (e.g. Versova, Juhu)..."
              className="w-full bg-transparent text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none"
            />
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 text-[#00875A] animate-spin shrink-0" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white/98 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 z-[1001] animate-fadeIn">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectSuggestion(s)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/60 transition-colors flex items-start gap-2.5 cursor-pointer group"
                >
                  <MapPin className="w-4 h-4 text-[#00875A] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {s.name}
                    </div>
                    <div className="text-[10.5px] text-slate-500 truncate">
                      {s.displayName}
                    </div>
                  </div>
                  {s.source === "verified" && (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-100/70 text-[#00875A] shrink-0 mt-0.5">
                      Verified
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {showDropdown && !isSearching && searchQuery.trim().length >= 2 && suggestions.length === 0 && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white/98 backdrop-blur-md border border-slate-200 rounded-2xl shadow-lg p-3 text-center text-xs text-slate-500 z-[1001]">
              No places found. Drag the pin directly on the map.
            </div>
          )}
        </div>
      </div>

      {/* Map Surface */}
      <MapContainer
        center={[position.lat, position.lng]}
        zoom={14}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationPicker position={position} onPinSelected={onPinSelected} venueName={venueName} />
      </MapContainer>

      {/* Bottom Coordinates Chip */}
      <div className="absolute bottom-2.5 left-2.5 z-[400] bg-slate-900/85 text-white text-[10.5px] font-mono px-2.5 py-1 rounded-lg backdrop-blur-md border border-white/10 shadow-sm pointer-events-none">
        {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
      </div>

      {/* Bottom Right Mode Badge */}
      <div className="absolute bottom-2.5 right-2.5 z-[400] bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-md border border-slate-200/80 flex items-center gap-1.5 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-[#00875A] animate-pulse" />
        <span className="text-[10.5px] font-extrabold text-slate-800 tracking-tight">
          Leaflet OSM
        </span>
        <span className="text-[10px] text-slate-400 font-medium">|</span>
        <span className="text-[10px] text-[#00875A] font-bold">
          Click or Drag Pin
        </span>
      </div>
    </div>
  );
};