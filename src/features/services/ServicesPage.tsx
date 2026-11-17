import { useState, type FormEvent } from "react";
import { ArrowRight, BadgeInfo, ClipboardList, Leaf, Sparkles } from "@/components/ui/Iconly";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDemoWorkflows } from "@/features/demo/DemoWorkflowProvider";
import { PIG_CARE_PHOTO, ROOM_PHOTOS } from "@/lib/farmPhotos";
import { useMocks } from "@/lib/supabase";

const services = [
  {
    value: "feeding" as const,
    title: "Feeding support",
    description: "Ask the farm team about feeding support during your rental.",
    image: PIG_CARE_PHOTO,
    imageAlt: "Illustrative stock photo of a farmer caring for a pig",
    icon: Leaf,
    questions: [
      "Which feeding schedule fits your pigs?",
      "What feed and supplies are included?",
      "How is the service priced?",
    ],
  },
  {
    value: "cleaning" as const,
    title: "Room cleaning",
    description: "Discuss room cleaning arrangements for the period you rent.",
    image: ROOM_PHOTOS[0].src,
    imageAlt: "Illustrative stock photo of an indoor pig room",
    icon: Sparkles,
    questions: [
      "How often can the room be cleaned?",
      "Are bedding and cleaning materials included?",
      "How is the service priced?",
    ],
  },
];

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ServicesPage() {
  const { user } = useAuth();
  const { farms, rentals, rentalRooms, rooms, serviceRequests, createServiceRequest } = useDemoWorkflows();
  const activeRentals = rentals.filter((rental) => rental.farmer_id === user?.id && rental.status === "active");
  const today = localDate(new Date());
  const [rentalId, setRentalId] = useState(activeRentals[0]?.id ?? "");
  const [preferredDate, setPreferredDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selectedRental = activeRentals.find((rental) => rental.id === rentalId) ?? activeRentals[0];
  const firstServiceDate = selectedRental?.start_date && selectedRental.start_date > today ? selectedRental.start_date : today;
  const myRequests = serviceRequests.filter((request) => request.farmer_id === user?.id);

  const submitRequest = async (event: FormEvent<HTMLFormElement>, service: "feeding" | "cleaning") => {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      if (!user || !rentalId || !preferredDate) throw new Error("Choose an active rental and preferred date.");
      await createServiceRequest({ farmer_id: user.id, rental_id: rentalId, service, preferred_date: preferredDate, note: note.trim() });
      setNotice(useMocks ? "Sample service request added. The farm team has not been notified." : "Your service request has been sent to the farm team.");
      setNote("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The sample request could not be added.");
    }
  };

  return (
    <div>
      <header className="dash-page-head">
        <div>
          <span className="dash-page-eyebrow">OPTIONAL FARM CARE</span>
          <h1>Farm services</h1>
          <p>Explore extra support you can discuss for your pigs and rented room.</p>
        </div>
        <Link className="dash-secondary-link" to="/rentals"><ClipboardList size={15} /> View my rentals</Link>
      </header>

      <section className="dash-services-grid" aria-label="Optional farm services">
        {services.map(({ value, title, description, image, imageAlt, icon: Icon, questions }) => (
          <article className="dash-service-card" key={title}>
            <div className="dash-service-card-image-wrap">
              <img className="dash-service-card-image" src={image} alt={imageAlt} />
              <span aria-hidden="true">ILLUSTRATIVE PHOTO</span>
            </div>
            <div className="dash-service-card-body">
              <div className="dash-service-card-head">
                <span className="dash-service-icon"><Icon size={20} /></span>
                <span className="dash-service-availability">BY ARRANGEMENT</span>
              </div>
              <h2>{title}</h2>
              <p>{description}</p>
              <div className="dash-service-divider" />
              <span className="dash-service-list-label">Things to confirm with the farm</span>
              <ul>
                {questions.map((question) => <li key={question}>{question}</li>)}
              </ul>
              <form className="dash-service-request-form" onSubmit={(event) => submitRequest(event, value)}>
                <label className="dash-form-field">
                  <span>Active rental</span>
                  <select value={rentalId} onChange={(event) => setRentalId(event.target.value)} required disabled={!activeRentals.length}>
                    {activeRentals.map((rental) => {
                      const roomId = rentalRooms.find((link) => link.rental_id === rental.id)?.room_id;
                      const farmId = rooms.find((room) => room.id === roomId)?.farm_id;
                      const farmName = farms.find((farm) => farm.id === farmId)?.name ?? "Farm";
                      return <option value={rental.id} key={rental.id}>{farmName} · {rental.start_date}</option>;
                    })}
                    {!activeRentals.length && <option value="">No active rental</option>}
                  </select>
                </label>
                <label className="dash-form-field">
                  <span>Preferred date</span>
                  <input type="date" value={preferredDate} min={firstServiceDate} max={selectedRental?.end_date} onChange={(event) => setPreferredDate(event.target.value)} required />
                </label>
                <label className="dash-form-field">
                  <span>Note <small>(optional)</small></span>
                  <input type="text" maxLength={240} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a short note" />
                </label>
                <button type="submit" className="dash-primary-button" disabled={!activeRentals.length}>{useMocks ? "Add sample request" : "Request service"}</button>
              </form>
            </div>
          </article>
        ))}
      </section>

      {error && <p className="dash-form-error" role="alert">{error}</p>}
      {notice && <p className="dash-form-success" role="status">{notice}</p>}
      {myRequests.length > 0 && (
        <section className="dash-panel dash-service-review">
          <div className="dash-panel-head"><h2>My service requests</h2><span className={`dash-badge ${useMocks ? "amber" : "green"}`}>{useMocks ? "SAMPLE" : "REQUESTS"}</span></div>
          <div className="dash-rentals-list">
            {myRequests.map((request) => (
              <article className="dash-rental-card" key={request.id}>
                <div className="dash-rental-title-row">
                  <h3>{request.service === "feeding" ? "Feeding support" : "Room cleaning"}</h3>
                  <span className={`dash-badge ${request.status === "confirmed" ? "green" : request.status === "pending" ? "amber" : ""}`}>{request.status}</span>
                </div>
                <p className="dash-service-review-meta">Preferred date: {request.preferred_date} · Rental {request.rental_id.toUpperCase()}</p>
                {request.note && <p className="dash-rental-request-note">{request.note}</p>}
              </article>
            ))}
          </div>
        </section>
      )}
      <aside className="dash-service-notice">
        <BadgeInfo size={18} />
        <div>
          <strong>Confirm details with the farm administrator</strong>
          <p>{useMocks ? "Availability, schedules, and pricing depend on your arrangement. Sample requests are only visible inside this demo and do not notify the farm." : "Availability, schedules, and pricing depend on your arrangement. The farm team will review your request."}</p>
        </div>
        <Link to="/rentals">Review rental details <ArrowRight size={14} /></Link>
      </aside>
      {useMocks && <p className="dash-demo-note">Service requests are temporary demo entries. They are not bookings, do not create a charge, and clear when you reload.</p>}
    </div>
  );
}
