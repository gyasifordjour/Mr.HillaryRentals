import type { Camera, Farm, Profile, Rental, RentalRoom, Room } from "@/types";

export const mockFarm: Farm = { id: "farm-1", name: "Main Farm", location: "Ghana" };

export const mockProfiles: Profile[] = [
  { id: "u-admin", full_name: "Admin", phone: "0200000000", role: "admin" },
  { id: "u-kofi", full_name: "Kofi", phone: "0240000001", role: "farmer" },
  { id: "u-ama", full_name: "Ama", phone: "0240000002", role: "farmer" },
];

export const mockRooms: Room[] = Array.from({ length: 6 }, (_, i) => ({
  id: `room-${i + 1}`,
  farm_id: "farm-1",
  room_number: i + 1,
  capacity: 10 + i * 5,
  monthly_price: 500,
  status: i < 5 ? "occupied" : "available",
}));

export const mockCameras: Camera[] = mockRooms.map((r) => ({
  id: `cam-${r.room_number}`,
  room_id: r.id,
  name: `Room ${r.room_number} camera`,
  status: "online",
}));

export const mockRentals: Rental[] = [
  { id: "r-1", farmer_id: "u-kofi", start_date: "2026-11-01", end_date: "2026-12-01", status: "active" },
  { id: "r-2", farmer_id: "u-ama", start_date: "2026-11-01", end_date: "2026-12-01", status: "active" },
  { id: "r-3", farmer_id: "u-ama", start_date: "2026-12-05", end_date: "2027-01-05", status: "pending" },
];

export const mockRentalRooms: RentalRoom[] = [
  { rental_id: "r-1", room_id: "room-1" },
  { rental_id: "r-1", room_id: "room-2" },
  { rental_id: "r-1", room_id: "room-3" },
  { rental_id: "r-2", room_id: "room-4" },
  { rental_id: "r-2", room_id: "room-5" },
  { rental_id: "r-3", room_id: "room-6" },
];
