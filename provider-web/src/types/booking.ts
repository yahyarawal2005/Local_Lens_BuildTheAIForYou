export type BookingStatus =
  | "Confirmed"
  | "Pending"
  | "Checked-in"
  | "Cancelled"
  | "Driver En Route"
  | "Driver Arrived";

export interface Booking {
  id: string;
  booking_reference: string;
  provider_id: string;
  provider_email?: string;
  experience_id: string;
  traveler_id?: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  guest_avatar?: string;
  experience_name: string;
  meeting_point: string;
  latitude?: number;
  longitude?: number;
  city: string;
  booking_date: string; // YYYY-MM-DD
  booking_time: string; // e.g. "11:00 AM"
  slots: number;
  total_amount_inr: number;
  status: BookingStatus;
  payment_status: "Paid" | "Pending" | "Refunded";
  special_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NearbyGuest {
  id: string;
  guest_name: string;
  guest_avatar?: string;
  experience_name: string;
  category?: string;
  distance_km: number;
  area: string;
  booking_time: string;
  booking_date: string;
  status: string;
}
