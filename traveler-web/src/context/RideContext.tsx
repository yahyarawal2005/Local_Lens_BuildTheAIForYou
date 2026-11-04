'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RideState, RideStatus, VehicleOption, Rider, RideRequest, VehicleTypeId } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const VEHICLE_OPTIONS: VehicleOption[] = [
  {
    type: 'sedan',
    name: 'Sedan',
    estimatedFare: 180,
    etaMinutes: 5,
    capacity: '4 seats',
    perKmRate: 1.0,
  },
  {
    type: 'hatchback',
    name: 'Hatchback',
    estimatedFare: 140,
    etaMinutes: 4,
    capacity: '4 seats',
    perKmRate: 1.0,
  },
  {
    type: 'suv',
    name: 'SUV',
    estimatedFare: 260,
    etaMinutes: 7,
    capacity: '6 seats',
    perKmRate: 1.2,
  },
  {
    type: 'auto',
    name: 'Auto Rickshaw',
    estimatedFare: 90,
    etaMinutes: 3,
    capacity: '3 seats',
    perKmRate: 1.0,
  },
  {
    type: 'bike',
    name: 'Bike',
    estimatedFare: 55,
    etaMinutes: 2,
    capacity: '1 passenger',
    perKmRate: 1.0,
  },
];

export const DEFAULT_RIDER: Rider = {
  id: 'rider-yahya-01',
  name: 'Local Driver Partner',
  rating: 4.9,
  vehicleType: 'Sedan (AC)',
  vehicleNumber: 'DL 01 AB 1234',
  profileImage: '/assets/images/characters/solo.png',
  phone: '+91 98201 23456',
  latitude: 0,
  longitude: 0,
};

interface RideContextType {
  state: RideState;
  selectVehicle: (option: VehicleOption) => void;
  setLocations: (params: {
    pickup: string;
    drop: string;
    pickupLat?: number;
    pickupLng?: number;
    dropLat?: number;
    dropLng?: number;
  }) => void;
  requestRide: (pickup?: string, drop?: string) => Promise<void>;
  cancelRide: () => Promise<void>;
  startTrip: () => void;
  completeTrip: () => void;
  resetRide: () => void;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

export function RideProvider({ children }: { children: ReactNode }) {
  const [rideState, setRideState] = useState<RideState>({
    status: 'idle',
    otp: Math.floor(1000 + Math.random() * 9000).toString(),
    selectedVehicle: VEHICLE_OPTIONS[0],
    currentRequest: null,
    activeRider: null,
    routeProgress: 0.0,
    etaMinutes: 5,
    etaText: '5 min away',
    pickupLocation: 'Selected Pickup Point',
    dropLocation: 'Destination Experience',
    pickupLat: 0,
    pickupLng: 0,
    dropLat: 0,
    dropLng: 0,
    riderLat: 0,
    riderLng: 0,
  });

  // Calculate fare when locations or vehicle change
  function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.max(1.0, R * c);
  }

  function selectVehicle(option: VehicleOption) {
    const dist = calculateDistanceKm(
      rideState.pickupLat,
      rideState.pickupLng,
      rideState.dropLat,
      rideState.dropLng
    );
    const fare = Math.round(dist * option.perKmRate * 15); // standard base multiplier

    setRideState((prev) => ({
      ...prev,
      selectedVehicle: { ...option, estimatedFare: Math.max(50, fare) },
      status: prev.status === 'idle' ? 'vehicleSelected' : prev.status,
      etaMinutes: option.etaMinutes,
      etaText: `${option.etaMinutes} min away`,
    }));
  }

  function setLocations(params: {
    pickup: string;
    drop: string;
    pickupLat?: number;
    pickupLng?: number;
    dropLat?: number;
    dropLng?: number;
  }) {
    setRideState((prev) => ({
      ...prev,
      pickupLocation: params.pickup,
      dropLocation: params.drop,
      pickupLat: params.pickupLat ?? prev.pickupLat,
      pickupLng: params.pickupLng ?? prev.pickupLng,
      dropLat: params.dropLat ?? prev.dropLat,
      dropLng: params.dropLng ?? prev.dropLng,
    }));
  }

  async function requestRide(pickup?: string, drop?: string) {
    const finalPickup = pickup || rideState.pickupLocation;
    const finalDrop = drop || rideState.dropLocation;

    setRideState((prev) => ({
      ...prev,
      status: 'searching',
      pickupLocation: finalPickup,
      dropLocation: finalDrop,
      routeProgress: 0.0,
      errorMessage: null,
    }));

    // If Supabase is connected, insert ride record
    if (isSupabaseConfigured()) {
      try {
        const { data: user } = await supabase.auth.getUser();
        const passengerId = user?.user?.id || 'traveler_web_user';

        const { data, error } = await supabase
          .from('rides')
          .insert({
            passenger_id: passengerId,
            pickup_address: finalPickup,
            pickup_lat: rideState.pickupLat,
            pickup_lng: rideState.pickupLng,
            destination_address: finalDrop,
            destination_lat: rideState.dropLat,
            destination_lng: rideState.dropLng,
            fare: rideState.selectedVehicle.estimatedFare,
            vehicle_type: rideState.selectedVehicle.name,
            status: 'searching',
            created_at: new Date().toISOString(),
          })
          .select()
          .maybeSingle();

        if (data) {
          const req: RideRequest = {
            id: data.id,
            travelerId: passengerId,
            pickup: finalPickup,
            drop: finalDrop,
            vehicle: rideState.selectedVehicle,
            estimatedFare: rideState.selectedVehicle.estimatedFare,
            status: 'searching',
            createdAt: data.created_at,
          };
          setRideState((prev) => ({ ...prev, currentRequest: req }));
        }
      } catch (err) {
        console.warn('Supabase ride insertion error:', err);
      }
    }

    // Realistic seamless driver assignment after 3.5 seconds
    setTimeout(() => {
      setRideState((prev) => {
        if (prev.status !== 'searching') return prev;
        return {
          ...prev,
          status: 'accepted',
          activeRider: DEFAULT_RIDER,
          etaMinutes: 4,
          etaText: '4 min away',
          otp: Math.floor(1000 + Math.random() * 9000).toString(),
        };
      });
    }, 3500);
  }

  async function cancelRide() {
    if (isSupabaseConfigured() && rideState.currentRequest?.id) {
      try {
        await supabase
          .from('rides')
          .update({ status: 'cancelled' })
          .eq('id', rideState.currentRequest.id);
      } catch {}
    }

    setRideState((prev) => ({
      ...prev,
      status: 'cancelled',
      currentRequest: null,
      activeRider: null,
      routeProgress: 0.0,
    }));
  }

  function startTrip() {
    setRideState((prev) => ({
      ...prev,
      status: 'inProgress',
      routeProgress: 0.15,
      etaMinutes: 12,
      etaText: '12 min',
    }));
  }

  function completeTrip() {
    setRideState((prev) => ({
      ...prev,
      status: 'completed',
      routeProgress: 1.0,
      etaMinutes: 0,
      etaText: 'Arrived at Destination',
    }));
  }

  function resetRide() {
    setRideState({
      status: 'idle',
      otp: Math.floor(1000 + Math.random() * 9000).toString(),
      selectedVehicle: VEHICLE_OPTIONS[0],
      currentRequest: null,
      activeRider: null,
      routeProgress: 0.0,
      etaMinutes: 5,
      etaText: '5 min away',
      pickupLocation: 'Selected Pickup Point',
      dropLocation: 'Destination Experience',
      pickupLat: 0,
      pickupLng: 0,
      dropLat: 0,
      dropLng: 0,
      riderLat: 0,
      riderLng: 0,
    });
  }

  return (
    <RideContext.Provider
      value={{
        state: rideState,
        selectVehicle,
        setLocations,
        requestRide,
        cancelRide,
        startTrip,
        completeTrip,
        resetRide,
      }}
    >
      {children}
    </RideContext.Provider>
  );
}

export function useRide() {
  const context = useContext(RideContext);
  if (!context) throw new Error('useRide must be used within a RideProvider');
  return context;
}
