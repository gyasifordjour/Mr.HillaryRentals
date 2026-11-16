import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  deleteFarmer: (farmerId: string) => Promise<void>;
  updateFarmer: (farmerId: string, details: { full_name: string; phone: string }) => Promise<void>;
  setFarmerActive: (farmerId: string, active: boolean) => Promise<void>;
  resendFarmerLink: (farmerId: string) => Promise<void>;
  requestRental: (input: { farmerId: string; roomId: string; startDate: string; endDate: string; pigCount: number; note: string }) => Promise<Rental>;
  decideRental: (rentalId: string, decision: "active" | "cancelled") => Promise<void>;
  cancelRental: (rentalId: string) => Promise<void>;
  renewRental: (rentalId: string, newEndDate: string) => Promise<void>;
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

async function invokeManageFarmer<T>(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke<T>("manage-farmer", { body });
  if (!error) return data;
  const context = "context" in error ? error.context : null;
  if (context instanceof Response) {
    const responseBody: unknown = await context.clone().json().catch(() => null);
    if (responseBody && typeof responseBody === "object" && "error" in responseBody && typeof responseBody.error === "string") {
      throw new Error(responseBody.error);
    }
  }
  throw error;
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
  const lifecycleRef = useRef({ rentals, rentalRooms });

  useEffect(() => {
    lifecycleRef.current = { rentals, rentalRooms };
  }, [rentals, rentalRooms]);

  const reload = useCallback(async () => {
    if (useMocks) {
      const today = currentLocalDate();
      const { rentals: currentRentals, rentalRooms: currentRentalRooms } = lifecycleRef.current;
      setRentals((current) => {
        let changed = false;
        const next = current.map((rental) => {
          if (rental.status === "active" && rental.end_date <= today) {
            changed = true;
            return { ...rental, status: "expired" as const };
          }
          return rental;
        });
        return changed ? next : current;
      });
      setRooms((current) => {
        const activeRoomIds = new Set(
          currentRentalRooms
            .filter((link) => currentRentals.some((rental) => rental.id === link.rental_id && rental.status === "active" && rental.end_date > today))
            .map((link) => link.room_id)
        );
        let changed = false;
        const next = current.map((room) => {
          if (room.status === "occupied" && !activeRoomIds.has(room.id)) {
            changed = true;
            return { ...room, status: "available" as const };
          }
          return room;
        });
        return changed ? next : current;
      });
      return;
    }
    setIsLoading(true);
    setLoadError("");
    try {
      if (user) {
        const sweep = await supabase.rpc("expire_due_rentals");
        if (sweep.error) {
          if (sweep.error.code === "PGRST202") {
            console.warn("Rental expiry function is missing. Apply the rental lifecycle migration.");
          } else {
            console.warn("Rental expiry sweep failed:", sweep.error.message);
          }
        }
      }
      const [farmResult, roomResult, cameraResult, rentalResult, rentalRoomResult, serviceResult, paymentResult, profileResultWithEmail] = await Promise.all([
        supabase.from("farms").select("id, name, location, description"),
        supabase.from("room_availability").select("id, farm_id, room_number, capacity, monthly_price, status, image_path"),
        user ? supabase.from("cameras").select("id, room_id, name, status") : Promise.resolve({ data: [], error: null }),
        user ? supabase.from("rentals").select("id, farmer_id, start_date, end_date, status, pig_count, request_note") : Promise.resolve({ data: [], error: null }),
        user ? supabase.from("rental_rooms").select("rental_id, room_id") : Promise.resolve({ data: [], error: null }),
        user ? supabase.from("service_requests").select("id, farmer_id, rental_id, service, preferred_date, note, status") : Promise.resolve({ data: [], error: null }),
        user ? supabase.from("payments").select("id, farmer_id, rental_id, payment_date, description, amount, status, reference") : Promise.resolve({ data: [], error: null }),
        user ? supabase.from("profiles").select("id, full_name, phone, email, role, is_active, avatar_path") : Promise.resolve({ data: [], error: null }),
      ]);

      let profileResult = profileResultWithEmail;
      if (profileResult.error?.code === "42703") {
        console.warn("The profiles.email migration is not applied; farmer emails are omitted from admin listings.");
        profileResult = await supabase.from("profiles").select("id, full_name, phone, email, role, avatar_path");
      }
      if (profileResult.error?.code === "42703") {
        console.warn("The profiles.is_active migration is not applied; account state is assumed active.");
        profileResult = await supabase.from("profiles").select("id, full_name, phone, role, avatar_path");
      }

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
      const profilesWithAvatars = await Promise.all((profileResult.data ?? []).map(async (profile) => {
        if (!profile.avatar_path) return profile;
        const avatar = await supabase.storage.from("profile-avatars").createSignedUrl(profile.avatar_path, 3600);
        if (avatar.error) throw avatar.error;
        return { ...profile, avatar_url: avatar.data.signedUrl };
      }));
      setProfiles(profilesWithAvatars as Profile[]);
    } catch (error) {
      console.error("Unable to load HC Trinity Intergrated Farms data from Supabase.", error);
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
    deleteFarmer: async (farmerId) => {
      const profile = profiles.find((item) => item.id === farmerId);
      if (!profile || profile.role !== "farmer") throw new Error("Choose a valid farmer account.");
      if (profile.id === user?.id) throw new Error("You cannot delete the account you are signed in with.");

      if (!useMocks) {
        const { data, error } = await supabase.functions.invoke<{ deleted: boolean; message: string }>("delete-farmer", {
          body: { farmer_id: farmerId },
        });
        if (error) {
          const context = "context" in error ? error.context : null;
          if (context instanceof Response) {
            const responseBody: unknown = await context.clone().json().catch(() => null);
            if (responseBody && typeof responseBody === "object" && "error" in responseBody && typeof responseBody.error === "string") {
              throw new Error(responseBody.error);
            }
          }
          throw error;
        }
        if (!data?.deleted) throw new Error("The server returned an incomplete account-deletion result.");
        await reload();
        return;
      }

      const farmerRentalIds = new Set(rentals.filter((rental) => rental.farmer_id === farmerId).map((rental) => rental.id));
      const removedRoomIds = new Set(rentalRooms.filter((link) => farmerRentalIds.has(link.rental_id)).map((link) => link.room_id));
      const remainingActiveRoomIds = new Set(
        rentalRooms
          .filter((link) => !farmerRentalIds.has(link.rental_id))
          .filter((link) => rentals.some((rental) => rental.id === link.rental_id && rental.status === "active"))
          .map((link) => link.room_id)
      );

      setProfiles((current) => current.filter((item) => item.id !== farmerId));
      setPayments((current) => current.filter((payment) => payment.farmer_id !== farmerId));
      setServiceRequests((current) => current.filter((request) => request.farmer_id !== farmerId));
      setRentalRooms((current) => current.filter((link) => !farmerRentalIds.has(link.rental_id)));
      setRentals((current) => current.filter((rental) => rental.farmer_id !== farmerId));
      setRooms((current) => current.map((room) => (
        removedRoomIds.has(room.id) && !remainingActiveRoomIds.has(room.id) && room.status === "occupied"
          ? { ...room, status: "available" }
          : room
      )));
    },
    updateFarmer: async (farmerId, details) => {
      const profile = profiles.find((item) => item.id === farmerId);
      if (!profile || profile.role !== "farmer") throw new Error("Choose a valid farmer account.");
      const fullName = details.full_name.replace(/\s+/g, " ").trim();
      const phone = details.phone.trim();
      if (fullName.length < 2 || fullName.length > 100) throw new Error("Enter a name between 2 and 100 characters.");
      if (phone.length > 30) throw new Error("Enter a shorter phone number.");

      if (!useMocks) {
        await invokeManageFarmer<{ message: string }>({ action: "update", farmer_id: farmerId, full_name: fullName, phone });
        await reload();
        return;
      }

      setProfiles((current) => current.map((item) => item.id === farmerId ? { ...item, full_name: fullName, phone } : item));
    },
    setFarmerActive: async (farmerId, active) => {
      const profile = profiles.find((item) => item.id === farmerId);
      if (!profile || profile.role !== "farmer") throw new Error("Choose a valid farmer account.");

      if (!useMocks) {
        await invokeManageFarmer<{ message: string }>({ action: "set_active", farmer_id: farmerId, active });
        await reload();
        return;
      }

      setProfiles((current) => current.map((item) => item.id === farmerId ? { ...item, is_active: active } : item));
    },
    resendFarmerLink: async (farmerId) => {
      if (useMocks) throw new Error("Sign-in emails require a configured Supabase project.");
      await invokeManageFarmer<{ message: string }>({ action: "resend_link", farmer_id: farmerId });
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
    cancelRental: async (rentalId) => {
      const rental = rentals.find((item) => item.id === rentalId);
      if (!rental) throw new Error("This rental no longer exists.");
      if (rental.farmer_id !== user?.id && user?.role !== "admin") throw new Error("You can only cancel your own rentals.");
      if (rental.status !== "pending" && rental.status !== "active") throw new Error("Only pending or active rentals can be cancelled.");

      if (!useMocks) {
        const { error } = await supabase.rpc("cancel_rental", { p_rental_id: rentalId });
        if (error) throw error;
        await reload();
        return;
      }

      const roomIds = new Set(rentalRooms.filter((link) => link.rental_id === rentalId).map((link) => link.room_id));
      setRentals((current) => current.map((item) => item.id === rentalId ? { ...item, status: "cancelled" as const } : item));
      setRooms((current) => current.map((room) => {
        if (!roomIds.has(room.id) || room.status !== "occupied") return room;
        const occupiedByAnother = rentals.some((item) => item.id !== rentalId
          && item.status === "active"
          && item.end_date > currentLocalDate()
          && rentalRooms.some((link) => link.rental_id === item.id && link.room_id === room.id));
        return occupiedByAnother ? room : { ...room, status: "available" as const };
      }));
    },
    renewRental: async (rentalId, newEndDate) => {
      const rental = rentals.find((item) => item.id === rentalId);
      if (!rental) throw new Error("This rental no longer exists.");
      if (rental.farmer_id !== user?.id) throw new Error("You can only renew your own rentals.");
      if (rental.status !== "active") throw new Error("Only active rentals can be renewed.");
      if (!newEndDate || newEndDate <= rental.end_date) throw new Error("Choose an end date after the current rental end date.");

      const roomId = rentalRooms.find((link) => link.rental_id === rentalId)?.room_id;
      if (!roomId) throw new Error("This rental has no room assigned.");
      const conflict = rentals.some((item) => item.id !== rentalId
        && (item.status === "pending" || item.status === "active")
        && item.start_date < newEndDate
        && item.end_date > rental.end_date
        && rentalRooms.some((link) => link.rental_id === item.id && link.room_id === roomId));
      if (conflict) throw new Error("That room is already booked for part of the renewal period.");

      if (!useMocks) {
        const { error } = await supabase.rpc("renew_rental", { p_rental_id: rentalId, p_new_end_date: newEndDate });
        if (error) throw error;
        await reload();
        return;
      }

      setRentals((current) => current.map((item) => item.id === rentalId ? { ...item, end_date: newEndDate } : item));
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
  }), [cameras, farms, isLoading, loadError, payments, profiles, rentalRooms, rentals, reload, rooms, serviceRequests, user]);

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
