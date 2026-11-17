import { useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, CalendarDays, ClipboardCheck, MapPin, PiggyBank } from "@/components/ui/Iconly";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDemoWorkflows } from "@/features/demo/DemoWorkflowProvider";
import { clearRentalRequestDraft, readRentalRequestDraft, saveRentalRequestDraft } from "@/features/rentals/rentalRequestDraft";
import { useMocks } from "@/lib/supabase";
import { formatGHS } from "@/lib/utils";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useToast } from "@/components/ui/ToastProvider";
import "@/styles/dashboard.css";
import "@/styles/rooms.css";

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return localDate(next);
}

export default function RentalRequestPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { farms, rooms, requestRental } = useDemoWorkflows();
  const availableRooms = useMemo(() => rooms.filter((room) => room.status === "available"), [rooms]);
  const [savedDraft] = useState(readRentalRequestDraft);
  const requestedRoom = searchParams.get("room") ?? "";
  const initialRoom = availableRooms.some((room) => room.id === requestedRoom)
    ? requestedRoom
    : savedDraft && availableRooms.some((room) => room.id === savedDraft.roomId)
      ? savedDraft.roomId
      : availableRooms[0]?.id ?? "";
  const [roomId, setRoomId] = useState(initialRoom);
  const today = localDate(new Date());
  const [startDate, setStartDate] = useState(savedDraft?.startDate ?? addDays(today, 1));
  const [endDate, setEndDate] = useState(savedDraft?.endDate ?? addDays(today, 31));
  const [pigCount, setPigCount] = useState(savedDraft?.pigCount ?? "1");
  const [note, setNote] = useState(savedDraft?.note ?? "");
  const selectedRoom = availableRooms.find((room) => room.id === roomId);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRoom || startDate < today || endDate <= startDate) {
      toast.error("Check your dates", "Choose an available room and valid future rental dates.");
      return;
    }
    const count = Number(pigCount);
    if (!Number.isInteger(count) || count < 1 || count > selectedRoom.capacity) {
      toast.error("Check pig count", `Enter a whole number between 1 and ${selectedRoom.capacity} pigs.`);
      return;
    }
    if (!user) {
      try {
        saveRentalRequestDraft({ roomId, startDate, endDate, pigCount, note });
        toast.info("Sign in to continue", "Your request details have been saved in this browser.");
        navigate(`/signup?returnTo=${encodeURIComponent("/rental-request")}`);
      } catch (reason) {
        toast.error("Draft not saved", reason instanceof Error ? reason.message : "Your request details could not be saved in this browser.");
      }
      return;
    }
    if (user.role !== "farmer") {
      toast.error("Farmer account required", "Sign in with a farmer account to request a room.");
      return;
    }
    try {
      await requestRental({ farmerId: user.id, roomId, startDate, endDate, pigCount: count, note: note.trim() });
      clearRentalRequestDraft();
      toast.success("Request submitted", "Your room request is now pending farm review.");
      navigate("/rentals", { state: { requestSubmitted: true } });
    } catch (reason) {
      toast.error("Request not submitted", reason instanceof Error ? reason.message : "The room request could not be submitted.");
    }
  };

  return (
    <main className="rental-request-page">
      <header className="rental-request-nav">
        <Link className="rooms-brand" to="/" aria-label="HC Trinity Intergrated Farms home">
          <span className="rooms-brand-mark"><PiggyBank size={20} strokeWidth={1.8} /></span>
          HC Trinity Intergrated Farms
        </Link>
        <div className="rental-request-nav-actions">
          <Link className="rooms-back-link" to="/rooms"><ArrowLeft size={15} /> Browse rooms</Link>
          <ThemeToggle />
        </div>
      </header>
      <div className="rental-request-content">
      <header className="dash-page-head">
        <div>
          <span className="dash-page-eyebrow">ROOM REQUEST</span>
          <h1>Request a room</h1>
          <p>Choose your room and dates. You can create an account after entering your request details.</p>
        </div>
      </header>

      <div className="dash-form-layout">
        <form className="dash-panel dash-form-panel" onSubmit={handleSubmit}>
          <div className="dash-panel-head"><h2>Rental details</h2><span className={`dash-badge ${useMocks ? "amber" : "green"}`}>{useMocks ? "PREVIEW" : "ROOM REQUEST"}</span></div>
          <div className="dash-form-body">
            <label className="dash-form-field">
              <span>Available room</span>
              <select value={roomId} onChange={(event) => setRoomId(event.target.value)} required>
                {!availableRooms.length && <option value="">No rooms currently available</option>}
                {availableRooms.map((room) => (
                  <option value={room.id} key={room.id}>Room {String(room.room_number).padStart(2, "0")} · up to {room.capacity} pigs · {formatGHS(room.monthly_price)}/month</option>
                ))}
              </select>
            </label>
            <div className="dash-form-row">
              <label className="dash-form-field">
                <span>Preferred start date</span>
                <input type="date" min={today} value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
              </label>
              <label className="dash-form-field">
                <span>Preferred end date</span>
                <input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
              </label>
            </div>
            <label className="dash-form-field">
              <span>Number of pigs</span>
              <input type="number" min={1} max={selectedRoom?.capacity ?? 1} step={1} value={pigCount} onChange={(event) => setPigCount(event.target.value)} required />
              {selectedRoom && <small>Capacity: up to {selectedRoom.capacity} pigs.</small>}
            </label>
            <label className="dash-form-field">
              <span>Note for the farm <small>(optional)</small></span>
              <textarea rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Share any details the farm team should know." />
            </label>
            <button type="submit" className="dash-primary-button" disabled={!availableRooms.length}><ClipboardCheck size={16} /> {user ? useMocks ? "Submit sample request" : "Submit room request" : "Continue to create account"}</button>
            {!user && <p className="dash-form-disclaimer">Your request details will be saved in this browser while you create or sign in to a farmer account.</p>}
            {user && <p className="dash-form-disclaimer">{useMocks ? "Preview only: this request is kept temporarily and will be cleared when you reload." : "Your request will be saved for farm review. Submitting does not charge you or guarantee availability."}</p>}
          </div>
        </form>

        <aside className="dash-form-summary">
          <span className="dash-service-icon"><PiggyBank size={20} /></span>
          <span className="dash-page-eyebrow">REQUEST SUMMARY</span>
          <h2>{selectedRoom ? `Room ${String(selectedRoom.room_number).padStart(2, "0")}` : "No room selected"}</h2>
          <p><MapPin size={14} /> {farms.find((farm) => farm.id === selectedRoom?.farm_id)?.name ?? "Farm"} · {farms.find((farm) => farm.id === selectedRoom?.farm_id)?.location ?? "Ghana"}</p>
          <p><CalendarDays size={14} /> {startDate} to {endDate}</p>
          {selectedRoom && <strong>{formatGHS(selectedRoom.monthly_price)} <small>per month</small></strong>}
          <div className="dash-service-divider" />
          <p className="dash-form-summary-note">{user ? useMocks ? "Submitting adds a temporary sample request. It does not reserve a room or create an agreement." : "The farm will review your request. Submitting does not charge you or guarantee availability." : "Next, create or sign in to a farmer account. The farm must confirm your request before a room is reserved."}</p>
        </aside>
      </div>
      </div>
    </main>
  );
}
