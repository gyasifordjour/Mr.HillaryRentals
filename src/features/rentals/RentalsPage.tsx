import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CalendarPlus, Check, ClipboardList, Clock3, MapPin, MessageCircle, PiggyBank, Printer, X } from "@/components/ui/Iconly";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDemoWorkflows } from "@/features/demo/DemoWorkflowProvider";
import { openRentalConfirmation } from "@/lib/rentalConfirmation";
import { formatGHS } from "@/lib/utils";
import { buildWhatsAppChatUrl } from "@/lib/whatsapp";
import { useMocks } from "@/lib/supabase";
import type { RentalStatus } from "@/types";

type RentalFilter = "all" | RentalStatus;

const filters: { value: RentalFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Ended" },
  { value: "cancelled", label: "Cancelled" },
];

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: RentalStatus) {
  return status === "expired" ? "Ended" : status[0].toUpperCase() + status.slice(1);
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function RentalsPage() {
  const { user } = useAuth();
  const { farms, profiles, rentals, rentalRooms, rooms, serviceRequests, decideRental, decideServiceRequest, cancelRental, renewRental } = useDemoWorkflows();
  const isAdmin = user?.role === "admin";
  const [filter, setFilter] = useState<RentalFilter>("all");
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [rentalBusy, setRentalBusy] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [renewEndDate, setRenewEndDate] = useState("");
  const location = useLocation();
  const farmer = user;

  const records = useMemo(() => rentals
    .filter((rental) => isAdmin || rental.farmer_id === farmer?.id)
    .filter((rental) => filter === "all" || rental.status === filter)
    .map((rental) => {
      const owner = profiles.find((profile) => profile.id === rental.farmer_id);
      const roomLinks = rentalRooms.filter((item) => item.rental_id === rental.id);
      const rentalRoomsForRecord = roomLinks.map((item) => rooms.find((room) => room.id === item.room_id)).filter((room) => room !== undefined);
      const farm = farms.find((item) => item.id === rentalRoomsForRecord[0]?.farm_id);
      return { ...rental, owner, rooms: rentalRoomsForRecord, farmName: farm?.name ?? "Farm", farmLocation: farm?.location ?? "Ghana" };
    })
    .sort((a, b) => b.start_date.localeCompare(a.start_date)),
  [farmer?.id, farms, filter, isAdmin, profiles, rentals, rentalRooms, rooms]);

  const visibleRentals = rentals.filter((rental) => isAdmin || rental.farmer_id === farmer?.id);
  const count = (status: RentalStatus) => visibleRentals.filter((rental) => rental.status === status).length;
  const pendingServices = serviceRequests.filter((request) => isAdmin || request.farmer_id === farmer?.id);

  const handleRentalDecision = async (rentalId: string, decision: "active" | "cancelled") => {
    setActionError("");
    try {
      await decideRental(rentalId, decision);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "The rental request could not be updated.");
    }
  };

  const handleServiceDecision = async (requestId: string, decision: "confirmed" | "declined") => {
    setActionError("");
    try {
      await decideServiceRequest(requestId, decision);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "The service request could not be updated.");
    }
  };

  const handleCancelRental = async (rentalId: string) => {
    setActionError("");
    setActionNotice("");
    const label = rentals.find((rental) => rental.id === rentalId)?.status === "active" ? "Cancel this active rental and release its room?" : "Cancel this rental request?";
    if (!window.confirm(label)) return;
    setRentalBusy(rentalId);
    try {
      await cancelRental(rentalId);
      setActionNotice("The rental was cancelled.");
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "The rental could not be cancelled.");
    } finally {
      setRentalBusy(null);
    }
  };

  const startRenewal = (rentalId: string, endDate: string) => {
    setActionError("");
    setActionNotice("");
    setRenewingId(rentalId);
    setRenewEndDate(addDays(endDate, 30));
  };

  const submitRenewal = async (rentalId: string) => {
    setActionError("");
    setActionNotice("");
    setRentalBusy(rentalId);
    try {
      await renewRental(rentalId, renewEndDate);
      setRenewingId(null);
      setRenewEndDate("");
      setActionNotice("The rental end date was extended.");
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "The rental could not be renewed.");
    } finally {
      setRentalBusy(null);
    }
  };

  const printRentalConfirmation = (rental: (typeof records)[number]) => {
    setActionError("");
    setActionNotice("");
    try {
      const opened = openRentalConfirmation({
        reference: rental.id,
        farmerName: rental.owner?.full_name ?? "Farmer",
        farmerEmail: rental.owner?.email ?? null,
        farmerPhone: rental.owner?.phone ?? null,
        farmName: rental.farmName,
        farmLocation: rental.farmLocation,
        rooms: rental.rooms.map((room) => ({ roomNumber: room.room_number, monthlyPrice: room.monthly_price })),
        startDate: formatDate(rental.start_date),
        endDate: formatDate(rental.end_date),
        pigCount: rental.pig_count,
      });
      if (!opened) {
        setActionError("The confirmation could not open. Allow pop-ups for this site and try again.");
        return;
      }
      setActionNotice("Rental confirmation opened. Use Print or save as PDF, then attach it in WhatsApp if needed.");
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "The rental confirmation could not be prepared.");
    }
  };

  const shareRentalOnWhatsApp = (rental: (typeof records)[number]) => {
    setActionError("");
    setActionNotice("");
    const phone = rental.owner?.phone ?? "";
    const rooms = rental.rooms.map((room) => `Room ${String(room.room_number).padStart(2, "0")}`).join(", ") || "To be assigned";
    const monthlyRate = rental.rooms.reduce((total, room) => total + room.monthly_price, 0);
    const message = [
      `Hello ${rental.owner?.full_name ?? "there"},`,
      "Your rental with HC Trinity Intergrated Farms is confirmed.",
      `Reference: ${rental.id.toUpperCase()}`,
      `Farm: ${rental.farmName} (${rental.farmLocation})`,
      `Room(s): ${rooms}`,
      `Rental period: ${formatDate(rental.start_date)} – ${formatDate(rental.end_date)}`,
      `Monthly rate: ${formatGHS(monthlyRate)}`,
      "This message confirms the rental details; it is not proof of payment.",
    ].join("\n");
    const chatUrl = buildWhatsAppChatUrl(phone, message);
    if (!chatUrl) {
      setActionError("No valid Ghanaian WhatsApp number is available for this farmer. Add one to their profile before sharing.");
      return;
    }
    const whatsappWindow = window.open(chatUrl, "_blank");
    if (!whatsappWindow) {
      setActionError("WhatsApp could not be opened. Allow pop-ups for this site and try again.");
      return;
    }
    whatsappWindow.opener = null;
    setActionNotice("WhatsApp opened with the rental details. Review the message, attach the saved PDF if needed, and tap Send.");
  };

  return (
    <div>
      <header className="dash-page-head">
        <div>
          <span className="dash-page-eyebrow">{isAdmin ? "FARM OPERATIONS" : "YOUR FARM ACCOUNT"}</span>
          <h1>{isAdmin ? "Rental management" : "My rentals"}</h1>
          <p>{isAdmin ? "Review rental periods and request statuses across the farm." : "Track your requests, active stays, and rental dates."}</p>
        </div>
        {!isAdmin && <Link className="dash-primary-link" to="/rooms"><PiggyBank size={15} /> Browse rooms</Link>}
      </header>

      <section className={`dash-stats ${isAdmin ? "dash-stats-3" : ""}`} aria-label="Rental summary">
        <article className="dash-stat-card"><div className="dash-stat-top">{isAdmin ? "Total records" : "All requests"}<span className="dash-stat-icon"><ClipboardList size={17} /></span></div><strong>{visibleRentals.length}</strong><small>{useMocks ? "Rental records in sample data" : "Rental records"}</small></article>
        <article className="dash-stat-card"><div className="dash-stat-top">Active<span className="dash-stat-icon"><PiggyBank size={17} /></span></div><strong>{count("active")}</strong><small>Current rental agreements</small></article>
        <article className="dash-stat-card"><div className="dash-stat-top">Pending<span className="dash-stat-icon"><Clock3 size={17} /></span></div><strong>{count("pending")}</strong><small>Awaiting review</small></article>
        {!isAdmin && <article className="dash-stat-card"><div className="dash-stat-top">Ended<span className="dash-stat-icon"><CalendarDays size={17} /></span></div><strong>{count("expired")}</strong><small>Previous rental periods</small></article>}
      </section>

      <section className="dash-panel">
        {location.state?.requestSubmitted && <p className="dash-form-success" role="status">{useMocks ? "Your sample request is now listed as pending review." : "Your request is now listed as pending review."}</p>}
        {actionError && <p className="dash-form-error" role="alert">{actionError}</p>}
        {actionNotice && <p className="dash-form-success" role="status">{actionNotice}</p>}
        <div className="dash-rentals-toolbar">
          <div className="dash-rental-filters" aria-label="Filter rentals">
            {filters.map((item) => (
              <button
                type="button"
                key={item.value}
                className={filter === item.value ? "active" : ""}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
                <span>{item.value === "all" ? visibleRentals.length : count(item.value)}</span>
              </button>
            ))}
          </div>
        </div>

        {records.length ? (
          <div className="dash-rentals-list">
            {records.map((rental) => (
              <article className="dash-rental-card" key={rental.id}>
                <div className="dash-rental-main">
                  <div className="dash-rental-icon">
                    {rental.owner?.avatar_url
                      ? <img src={rental.owner.avatar_url} alt="" />
                      : <ClipboardList size={18} />}
                  </div>
                  <div className="dash-rental-title">
                    <div className="dash-rental-title-row">
                      <h2>{isAdmin ? rental.owner?.full_name || "Farmer" : `Rental ${rental.id.toUpperCase()}`}</h2>
                      <span className={`dash-badge ${rental.status === "active" ? "green" : rental.status === "pending" ? "amber" : ""}`}>{statusLabel(rental.status)}</span>
                    </div>
                    <p>{isAdmin ? rental.owner?.email || rental.owner?.phone || "Farmer account" : `${rental.rooms.length} ${rental.rooms.length === 1 ? "room" : "rooms"} requested`} <span>·</span> {rental.farmName}</p>
                  </div>
                  {isAdmin && <span className="dash-rental-reference">REF {rental.id.toUpperCase()}</span>}
                </div>

                <div className="dash-rental-details">
                  <div><span>ROOM{rental.rooms.length === 1 ? "" : "S"}</span><strong>{rental.rooms.map((room) => `Room ${String(room.room_number).padStart(2, "0")}`).join(", ") || "No room assigned"}</strong></div>
                  {rental.pig_count !== undefined && <div><span>PIGS</span><strong>{rental.pig_count}</strong></div>}
                  <div><span>START DATE</span><strong><CalendarDays size={14} /> {formatDate(rental.start_date)}</strong></div>
                  <div><span>END DATE</span><strong><CalendarDays size={14} /> {formatDate(rental.end_date)}</strong></div>
                  <div><span>FARM</span><strong><MapPin size={14} /> {rental.farmLocation}</strong></div>
                </div>

                {rental.status === "pending" && (
                  <div className="dash-rental-footnote">
                    <Clock3 size={14} />
                    {isAdmin
                      ? useMocks ? "Demo request. Review below to update this sample status." : "Review this request before confirming the rental."
                      : "Your request is awaiting farm review. You’ll be able to track its status here."}
                  </div>
                )}
                {rental.request_note && <p className="dash-rental-request-note">Farmer note: {rental.request_note}</p>}
                {isAdmin && rental.status === "pending" && (
                  <div className="dash-rental-actions">
                    <button type="button" className="dash-action-approve" onClick={() => void handleRentalDecision(rental.id, "active")}><Check size={14} /> {useMocks ? "Approve (demo)" : "Approve"}</button>
                    <button type="button" className="dash-action-reject" onClick={() => void handleRentalDecision(rental.id, "cancelled")}><X size={14} /> {useMocks ? "Reject (demo)" : "Reject"}</button>
                  </div>
                )}
                {isAdmin && rental.status === "active" && (
                  <>
                    <div className="dash-rental-actions">
                      <button type="button" className="dash-secondary-button" onClick={() => printRentalConfirmation(rental)}>
                        <Printer size={14} /> Print / save PDF
                      </button>
                      <button type="button" className="dash-whatsapp-button" onClick={() => shareRentalOnWhatsApp(rental)}>
                        <MessageCircle size={14} /> Share on WhatsApp
                      </button>
                    </div>
                    <p className="dash-rental-share-caption">The confirmation is not a payment receipt or a substitute for a signed rental agreement.</p>
                  </>
                )}
                {!isAdmin && (rental.status === "pending" || rental.status === "active") && (
                  <div className="dash-rental-actions">
                    {rental.status === "active" && renewingId === rental.id && (
                      <form className="dash-renew-form" onSubmit={(event) => { event.preventDefault(); void submitRenewal(rental.id); }}>
                        <label>
                          New end date
                          <input
                            type="date"
                            min={addDays(rental.end_date, 1)}
                            value={renewEndDate}
                            onChange={(event) => setRenewEndDate(event.target.value)}
                            required
                          />
                        </label>
                        <button type="submit" className="dash-action-approve" disabled={rentalBusy === rental.id}>
                          <Check size={14} /> {rentalBusy === rental.id ? "Saving..." : "Save renewal"}
                        </button>
                        <button type="button" className="dash-action-reject" onClick={() => { setRenewingId(null); setRenewEndDate(""); }}>
                          <X size={14} /> Close
                        </button>
                      </form>
                    )}
                    {rental.status === "active" && renewingId !== rental.id && (
                      <button type="button" className="dash-secondary-button" onClick={() => startRenewal(rental.id, rental.end_date)} disabled={rentalBusy === rental.id}>
                        <CalendarPlus size={14} /> Extend rental
                      </button>
                    )}
                    <button type="button" className="dash-action-reject" onClick={() => void handleCancelRental(rental.id)} disabled={rentalBusy === rental.id}>
                      <X size={14} /> {rentalBusy === rental.id ? "Cancelling..." : rental.status === "pending" ? "Cancel request" : "Cancel rental"}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="dash-empty">
            <span className="dash-empty-icon"><ClipboardList size={21} /></span>
            <strong>No {filter === "all" ? "" : `${statusLabel(filter).toLowerCase()} `}rental records</strong>
            <p>{isAdmin ? "Rental requests and agreements will appear here as farmers submit them." : "Once you request a room, you can track its status and dates here."}</p>
            {!isAdmin && <Link className="dash-secondary-link" to="/rooms">Explore rooms <ArrowRight size={14} /></Link>}
          </div>
        )}
      </section>
      {isAdmin && (
        <section className="dash-panel dash-service-review">
          <div className="dash-panel-head"><h2>Farm service requests</h2><span className={`dash-badge ${useMocks ? "amber" : "green"}`}>{useMocks ? "DEMO ONLY" : "REQUESTS"}</span></div>
          {pendingServices.length ? <div className="dash-rentals-list">
            {pendingServices.map((request) => {
              const owner = profiles.find((profile) => profile.id === request.farmer_id);
              return <article className="dash-rental-card" key={request.id}>
                <div className="dash-rental-title-row"><h3>{request.service === "feeding" ? "Feeding support" : "Room cleaning"}</h3><span className={`dash-badge ${request.status === "pending" ? "amber" : request.status === "confirmed" ? "green" : ""}`}>{request.status}</span></div>
                <p className="dash-service-review-meta">{owner?.full_name ?? "Farmer"} · {request.preferred_date} · Rental {request.rental_id.toUpperCase()}</p>
                {request.note && <p className="dash-rental-request-note">{request.note}</p>}
                {request.status === "pending" && <div className="dash-rental-actions">
                  <button type="button" className="dash-action-approve" onClick={() => void handleServiceDecision(request.id, "confirmed")}><Check size={14} /> {useMocks ? "Confirm (demo)" : "Confirm"}</button>
                  <button type="button" className="dash-action-reject" onClick={() => void handleServiceDecision(request.id, "declined")}><X size={14} /> {useMocks ? "Decline (demo)" : "Decline"}</button>
                </div>}
              </article>;
            })}
          </div> : <div className="dash-table-empty">No {useMocks ? "sample " : ""}service requests yet.</div>}
        </section>
      )}
      {useMocks && <p className="dash-demo-note">Rental entries and decisions are illustrative sample data. Changes remain in memory and clear on reload; no real records are modified.</p>}
    </div>
  );
}
