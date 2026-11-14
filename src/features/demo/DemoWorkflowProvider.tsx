import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { mockCameras, mockFarm, mockProfiles, mockRentalRooms, mockRentals, mockRooms } from "@/mock/data";
import { supabase, useMocks } from "@/lib/supabase";
import type { Camera, Farm, Profile, Rental, RentalRoom, Room, RoomStatus } from "@/types";

export interface DemoServiceRequest {
  id: string;
  farmer_id: string;
  rental_id: string;
  service: "feeding" | "cleaning";
  preferred_date: string;
  note: string;
  status: "pending" | "confirmed" | "declined";
}

export interface DemoPayment {
  id: string;
  farmer_id: string;
  rental_id: string;
  date: string;
  description: string;
  amount: number;
  status: "paid" | "due";
  reference: string;
}

interface DemoWorkflowState {
  farms: Farm[];
  rooms: Room[];
  cameras: Camera[];
  profiles: Profile[];
  rentals: Rental[];
  rentalRooms: RentalRoom[];
  roomStatuses: Record<string, RoomStatus>;
  serviceRequests: DemoServiceRequest[];
  payments: DemoPayment[];
  isLoading: boolean;
  loadError: string;
  reload: () => Promise<void>;
  saveRoom: (roomId: string | null, room: Omit<Room, "id">, image?: File, removeImage?: boolean) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  requestRental: (input: { farmerId: string; roomId: string; startDate: string; endDate: string; pigCount: number; note: string }) => Promise<Rental>;
  decideRental: (rentalId: string, decision: "active" | "cancelled") => Promise<void>;
  createServiceRequest: (input: Omit<DemoServiceRequest, "id" | "status">) => Promise<void>;
  decideServiceRequest: (requestId: string, decision: "confirmed" | "declined") => Promise<void>;
  markPaymentPaid: (paymentId: string) => Promise<void>;
}

const DemoWorkflowContext = createContext<DemoWorkflowState | null>(null);

function makeReference(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function currentLocalDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function validateImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPG, PNG, or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) throw new Error("Images must be 5 MB or smaller.");
}

function imageDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("The selected image could not be read."));
    reader.onerror = () => reject(new Error("The selected image could not be read."));
    reader.readAsDataURL(file);
  });
}

function imageExtension(file: File) {
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  return extension === "jpeg" ? "jpg" : extension;
}

const initialPayments: DemoPayment[] = [
  { id: "p-1", farmer_id: "u-kofi", rental_id: "r-1", date: "2026-11-01", description: "November room rental", amount: 1500, status: "paid", reference: "DEMO-RENT-001" },
  { id: "p-2", farmer_id: "u-ama", rental_id: "r-2", date: "2026-11-01", description: "November room rental", amount: 1000, status: "paid", reference: "DEMO-RENT-002" },
  { id: "p-3", farmer_id: "u-kofi", rental_id: "r-1", date: "2026-12-01", description: "December room rental", amount: 1500, status: "due", reference: "DEMO-RENT-003" },
];

export function DemoWorkflowProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [farms, setFarms] = useState<Farm[]>(() => useMocks ? [mockFarm] : []);
  const [rooms, setRooms] = useState<Room[]>(() => useMocks ? mockRooms : []);
  const [cameras, setCameras] = useState<Camera[]>(() => useMocks ? mockCameras : []);
  const [profiles, setProfiles] = useState<Profile[]>(() => useMocks ? mockProfiles : []);
  const [rentals, setRentals] = useState<Rental[]>(() => useMocks ? mockRentals : []);
  const [rentalRooms, setRentalRooms] = useState<RentalRoom[]>(() => useMocks ? mockRentalRooms : []);
  const [serviceRequests, setServiceRequests] = useState<DemoServiceRequest[]>([]);
  const [payments, setPayments] = useState<DemoPayment[]>(() => useMocks ? initialPayments : []);
  const [isLoading, setIsLoading] = useState(!useMocks);
  const [loadError, setLoadError] = useState("");

  const reload = useCallback(async () => {
    if (useMocks) return;
    setIsLoading(true);
    setLoadError("");
    try {
      const [farmResult, roomResult, cameraResult, rentalResult, rentalRoomResult, serviceResult, paymentResult, profileResult] = await Promise.all([
        supabase.from("farms").select("id, name, location, description"),
        supabase.from("room_availability").select("id, farm_id, room_number, capacity, monthly_price, status, image_path"),
        user ? supabase.from("cameras").select("id, room_id, name, status") : Promise.resolve({ data: [], error: null }),
        user ? supabase.from("rentals").select("id, farmer_id, start_date, end_date, status, pig_count, request_note") : Promise.resolve({ data: [], error: null }),
        user ? supabase.from("rental_rooms").select("rental_id, room_id") : Promise.resolve({ data: [], error: null }),
        user ? supabase.from("service_requests").select("id, farmer_id, rental_id, service, preferred_date, note, status") : Promise.resolve({ data: [], error: null }),
        user ? supabase.from("payments").select("id, farmer_id, rental_id, payment_date, description, amount, status, reference") : Promise.resolve({ data: [], error: null }),
        user ? supabase.from("profiles").select("id, full_name, phone, role") : Promise.resolve({ data: [], error: null }),
      ]);

      const results = [farmResult, roomResult, cameraResult, rentalResult, rentalRoomResult, serviceResult, paymentResult, profileResult];
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;

      setFarms((farmResult.data ?? []) as Farm[]);
      setRooms((roomResult.data ?? []) as Room[]);
      setCameras((cameraResult.data ?? []) as Camera[]);
      setRentals((rentalResult.data ?? []) as Rental[]);
      setRentalRooms((rentalRoomResult.data ?? []) as RentalRoom[]);
      setServiceRequests((serviceResult.data ?? []) as DemoServiceRequest[]);
      setPayments((paymentResult.data ?? []).map((payment) => ({
        ...payment,
        date: payment.payment_date,
      })) as DemoPayment[]);
      setProfiles((profileResult.data ?? []) as Profile[]);
    } catch (error) {
      console.error("Unable to load Trinity Integrated Farms data from Supabase.", error);
      setLoadError(error instanceof Error ? error.message : "The farm data could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<DemoWorkflowState>(() => ({
    farms,
    rooms,
    cameras,
    profiles,
    rentals,
    rentalRooms,
    roomStatuses: Object.fromEntries(rooms.map((room) => [room.id, room.status])),
    serviceRequests,
    payments,
    isLoading,
    loadError,
    reload,
    saveRoom: async (roomId, room, image, removeImage = false) => {
      if (!farms.some((farm) => farm.id === room.farm_id)) throw new Error("Choose a valid farm.");
      if (!Number.isInteger(room.room_number) || room.room_number < 1) throw new Error("Room number must be a positive whole number.");
      if (!Number.isInteger(room.capacity) || room.capacity < 1) throw new Error("Capacity must be a positive whole number.");
      if (!Number.isFinite(room.monthly_price) || room.monthly_price < 0) throw new Error("Monthly price must be zero or more.");
      if (image) validateImage(image);

      const currentRoom = rooms.find((item) => item.id === roomId);
      if (roomId && !currentRoom) throw new Error("This room no longer exists. Refresh and try again.");
      const previousImage = currentRoom?.image_path ?? null;

      if (useMocks) {
        const imagePath = image ? await imageDataUrl(image) : removeImage ? null : room.image_path ?? null;
        if (roomId) {
          setRooms((current) => current.map((item) => item.id === roomId ? { ...room, id: roomId, image_path: imagePath } : item));
        } else {
          const created: Room = { ...room, id: makeReference("room").toLowerCase(), image_path: imagePath };
          setRooms((current) => [...current, created]);
        }
        return;
      }

      let uploadedPath: string | null = null;
      let nextImagePath = removeImage ? null : room.image_path ?? null;
      if (image) {
        const filename = `${room.farm_id}/${crypto.randomUUID()}.${imageExtension(image)}`;
        const { data, error } = await supabase.storage.from("room-images").upload(filename, image, {
          contentType: image.type,
          upsert: false,
        });
        if (error) throw error;
        uploadedPath = data.path;
        nextImagePath = data.path;
      }

      const payload = {
        farm_id: room.farm_id,
        room_number: room.room_number,
        capacity: room.capacity,
        monthly_price: room.monthly_price,
        status: room.status,
        image_path: nextImagePath,
      };
      const result = roomId
        ? await supabase.from("rooms").update(payload).eq("id", roomId).select("id").single()
        : await supabase.from("rooms").insert(payload).select("id").single();
      if (result.error) {
        if (uploadedPath) {
          const { error: cleanupError } = await supabase.storage.from("room-images").remove([uploadedPath]);
          if (cleanupError) throw new Error(`Room save failed: ${result.error.message}. Uploaded image cleanup failed: ${cleanupError.message}`);
        }
        throw result.error;
      }

      await reload();
      if (previousImage && previousImage !== nextImagePath && !previousImage.startsWith("data:")) {
        const { error } = await supabase.storage.from("room-images").remove([previousImage]);
        if (error) throw new Error(`Room saved, but the previous room image could not be removed: ${error.message}`);
      }
    },
    deleteRoom: async (roomId) => {
      const room = rooms.find((item) => item.id === roomId);
      if (!room) throw new Error("This room no longer exists. Refresh and try again.");
      if (useMocks) {
        setRooms((current) => current.filter((item) => item.id !== roomId));
        setCameras((current) => current.filter((camera) => camera.room_id !== roomId));
        return;
      }

      const { error } = await supabase.from("rooms").delete().eq("id", roomId);
      if (error) throw error;
      await reload();
      if (room.image_path) {
        const { error: storageError } = await supabase.storage.from("room-images").remove([room.image_path]);
        if (storageError) throw new Error(`Room deleted, but its image could not be removed: ${storageError.message}`);
      }
    },
    requestRental: async ({ farmerId, roomId, startDate, endDate, pigCount, note }) => {
      if (!farmerId) throw new Error("Sign in with a farmer account to request a room.");
      const room = rooms.find((item) => item.id === roomId);
      if (!room || room.status !== "available") throw new Error("That room is no longer available.");
      if (startDate < currentLocalDate() || endDate <= startDate) throw new Error("Choose valid future rental dates.");
      if (!Number.isInteger(pigCount) || pigCount < 1 || pigCount > room.capacity) {
        throw new Error(`Enter a whole number between 1 and ${room.capacity} pigs.`);
      }

      if (!useMocks) {
        const { data: rentalId, error } = await supabase.rpc("request_room", {
          p_room_id: roomId,
          p_start_date: startDate,
          p_end_date: endDate,
          p_pig_count: pigCount,
          p_note: note,
        });
        if (error) throw error;
        if (!rentalId) throw new Error("The room request was not created.");
        await reload();
        return { id: rentalId, farmer_id: farmerId, start_date: startDate, end_date: endDate, status: "pending", pig_count: pigCount, request_note: note };
      }

      const created: Rental = {
        id: makeReference("r").toLowerCase(),
        farmer_id: farmerId,
        start_date: startDate,
        end_date: endDate,
        status: "pending",
        pig_count: pigCount,
        request_note: note,
      };
      setRentals((current) => [...current, created]);
      setRentalRooms((current) => [...current, { rental_id: created.id, room_id: roomId }]);
      return created;
    },
    decideRental: async (rentalId, decision) => {
      if (!useMocks) {
        const { error } = await supabase.rpc("review_rental_request", { p_rental_id: rentalId, p_decision: decision });
        if (error) throw error;
        await reload();
        return;
      }
      const rental = rentals.find((item) => item.id === rentalId);
      if (!rental || rental.status !== "pending") throw new Error("This rental request is no longer awaiting review.");
      const roomLink = rentalRooms.find((item) => item.rental_id === rentalId);
      if (decision === "active" && roomLink && rooms.find((item) => item.id === roomLink.room_id)?.status !== "available") {
        throw new Error("This room is no longer available. Review its availability before approving.");
      }
      setRentals((current) => current.map((item) => item.id === rentalId ? { ...item, status: decision } : item));
      if (decision === "active" && roomLink) {
        setRooms((current) => current.map((room) => room.id === roomLink.room_id ? { ...room, status: "occupied" } : room));
      }
    },
    createServiceRequest: async (input) => {
      const rental = rentals.find((item) => item.id === input.rental_id && item.farmer_id === input.farmer_id && item.status === "active");
      if (!rental) throw new Error("Choose one of your active rentals for this service request.");
      if (input.preferred_date < rental.start_date || input.preferred_date > rental.end_date) {
        throw new Error("Choose a service date within the selected rental period.");
      }
      if (!useMocks) {
        const { error } = await supabase.rpc("create_service_request", {
          p_rental_id: input.rental_id,
          p_service: input.service,
          p_preferred_date: input.preferred_date,
          p_note: input.note,
        });
        if (error) throw error;
        await reload();
        return;
      }
      setServiceRequests((current) => [...current, { ...input, id: makeReference("s").toLowerCase(), status: "pending" }]);
    },
    decideServiceRequest: async (requestId, decision) => {
      if (!useMocks) {
        const { error } = await supabase.rpc("review_service_request", { p_request_id: requestId, p_decision: decision });
        if (error) throw error;
        await reload();
        return;
      }
      if (!serviceRequests.some((request) => request.id === requestId && request.status === "pending")) {
        throw new Error("This service request is no longer awaiting review.");
      }
      setServiceRequests((current) => current.map((request) => request.id === requestId ? { ...request, status: decision } : request));
    },
    markPaymentPaid: async (paymentId) => {
      if (!useMocks) throw new Error("Payment status is managed by the payment provider and cannot be changed here.");
      if (!payments.some((payment) => payment.id === paymentId && payment.status === "due")) {
        throw new Error("This sample payment is no longer due.");
      }
      setPayments((current) => current.map((payment) => payment.id === paymentId ? { ...payment, status: "paid" } : payment));
    },
  }), [cameras, farms, isLoading, loadError, payments, profiles, rentalRooms, rentals, reload, rooms, serviceRequests]);

  return (
    <DemoWorkflowContext.Provider value={value}>
      {!useMocks && loadError && (
        <div role="alert" style={{ position: "relative", zIndex: 10000, padding: "10px 16px", background: "#fff1ee", color: "#8f4338", fontSize: 13 }}>
          Farm data could not be loaded: {loadError}{" "}
          <button type="button" onClick={() => void reload()} style={{ marginLeft: 8 }}>Retry</button>
        </div>
      )}
      {children}
    </DemoWorkflowContext.Provider>
  );
}

export function useDemoWorkflows() {
  const context = useContext(DemoWorkflowContext);
  if (!context) throw new Error("useDemoWorkflows must be used inside DemoWorkflowProvider.");
  return context;
}
