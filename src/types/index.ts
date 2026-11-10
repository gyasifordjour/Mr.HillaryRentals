// Shapes mirror the planned Supabase tables so mock data can be swapped for real queries.

export type Role = "admin" | "farmer";

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: Role;
  avatar_path?: string | null;
  avatar_url?: string | null;
}

export interface Farm {
  id: string;
  name: string;
  location: string;
  description?: string;
}

export type RoomStatus = "available" | "reserved" | "occupied";

export interface Room {
  id: string;
  farm_id: string;
  room_number: number;
  capacity: number;
  monthly_price: number;
  status: RoomStatus;
  image_path?: string | null;
}

export type RentalStatus = "pending" | "active" | "expired" | "cancelled";

export interface Rental {
  id: string;
  farmer_id: string;
  start_date: string;
  end_date: string;
  status: RentalStatus;
  pig_count?: number;
  request_note?: string;
}

export interface RentalRoom {
  rental_id: string;
  room_id: string;
}

export type CameraStatus = "online" | "offline";

export interface Camera {
  id: string;
  room_id: string;
  name: string;
  status: CameraStatus;
}
