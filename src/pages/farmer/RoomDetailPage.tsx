import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Check, DoorOpen, MapPin, PiggyBank, ShieldCheck } from "@/components/ui/Iconly";
import { CircleUserRound } from "@/components/ui/Iconly";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDemoWorkflows } from "@/features/demo/DemoWorkflowProvider";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { getRoomPhoto, ROOM_PHOTOS } from "@/lib/farmPhotos";
import { formatGHS } from "@/lib/utils";
import "@/styles/rooms.css";

type RoomPhotoFlight = {
  photo: string;
  rect: { left: number; top: number; width: number; height: number };
};

function roomStatusLabel(status: string) {
  if (status === "available") return "Available";
  if (status === "reserved") return "Reserved";
  return "Occupied";
}

export default function RoomDetailPage() {
  const { roomId = "" } = useParams<{ roomId: string }>();
  const location = useLocation();
  const routeFlight = (location.state as { roomPhotoFlight?: RoomPhotoFlight } | null)?.roomPhotoFlight ?? null;
  const [flight, setFlight] = useState<RoomPhotoFlight | null>(routeFlight);
  const [flightLanded, setFlightLanded] = useState(!routeFlight);
  const { user } = useAuth();
  const { farms, rooms, cameras, isLoading, loadError } = useDemoWorkflows();
  const room = rooms.find((item) => item.id === roomId);
  const farm = room ? farms.find((item) => item.id === room.farm_id) : undefined;
  const cameraAvailable = room ? cameras.some((camera) => camera.room_id === room.id) : false;
  const photo = room ? getRoomPhoto(room.room_number, room.image_path) : null;
  const signInHref = user?.role === "admin" ? "/admin" : user ? "/dashboard" : "/login";
  const requestHref = user?.role === "admin" ? "/admin/rooms" : `/rental-request?room=${encodeURIComponent(roomId)}`;

  useEffect(() => {
    if (!room || !flight) return;
    const finishFlight = () => {
      setFlightLanded(true);
      setFlight(null);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishFlight();
      return;
    }

    let frame = 0;
    let timer = 0;
    let animation: Animation | undefined;
    window.scrollTo(0, 0);
    frame = requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(".room-detail-photo img");
      const image = document.querySelector<HTMLImageElement>(".room-detail-flight");
      if (!target || !image) {
        finishFlight();
        return;
      }
      const rect = target.getBoundingClientRect();
      animation = image.animate([
        { left: `${flight.rect.left}px`, top: `${flight.rect.top}px`, width: `${flight.rect.width}px`, height: `${flight.rect.height}px`, borderRadius: "11px" },
        { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, borderRadius: "10px" },
      ], { duration: 900, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" });
      timer = window.setTimeout(finishFlight, 900);
    });

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      animation?.cancel();
    };
  }, [room, flight]);

  return (
    <main className="rooms-page room-detail-page">
      <header className="rooms-nav">
        <Link className="rooms-brand" to="/" aria-label="HC Trinity Intergrated Farms home">
          <span className="rooms-brand-mark"><PiggyBank size={20} strokeWidth={1.8} /></span>
          HC Trinity Intergrated Farms
        </Link>
        <div className="rooms-nav-actions">
          <Link className="rooms-back-link" to="/rooms"><ArrowLeft size={15} /> Browse rooms</Link>
          <ThemeToggle />
          <Link className="rooms-sign-in" to={signInHref}>
            {user ? "Dashboard" : "Sign in"} <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <div className="room-detail-content">
        <nav className="room-detail-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link><span>/</span><Link to="/rooms">Rooms</Link>
          {room && <><span>/</span><span>Room {String(room.room_number).padStart(2, "0")}</span></>}
        </nav>

        {!room ? (
          <section className="room-detail-empty" aria-live="polite">
            <span className="room-detail-empty-icon"><DoorOpen size={24} /></span>
            <h1>{isLoading ? "Loading room details" : "Room not found"}</h1>
            <p>{isLoading ? "Please wait while we load the room listing." : loadError || "This room may have been removed or is no longer listed."}</p>
            <Link to="/rooms" className="room-detail-back-button"><ArrowLeft size={15} /> Browse all rooms</Link>
          </section>
        ) : (
          <div className="room-detail-layout">
            <div className="room-detail-main">
              <div className="room-detail-photo">
                <img className={flight && !flightLanded ? "room-detail-photo-pending" : ""} src={photo?.src} alt={photo?.alt ?? ""} />
                <span className={`room-detail-status ${room.status === "available" ? "is-available" : ""}`}>
                  <span /> {roomStatusLabel(room.status)}
                </span>
                {!room.image_path && <span className="room-detail-photo-note">Illustrative photo</span>}
              </div>

              <div className="room-detail-gallery" aria-label="Illustrative room photos">
                {ROOM_PHOTOS.map((roomPhoto) => <img src={roomPhoto.src} alt={roomPhoto.alt} key={roomPhoto.src} loading="lazy" />)}
              </div>
              <p className="room-detail-photo-disclaimer">
                {room.image_path ? "Room photo provided by the farm." : "These are illustrative photos, not photos of this specific room. Contact the farm for current room photos."}
              </p>
            </div>

            <div className="room-detail-side">
              <header className="room-detail-heading">
                <div>
                  <span className="rooms-eyebrow rooms-eyebrow-dark">{farm?.name ?? "HC Trinity Intergrated Farms"}</span>
                  <h1>Room {String(room.room_number).padStart(2, "0")}</h1>
                  <p><MapPin size={16} /> {farm?.location ?? "Location available on request"}</p>
                </div>
                <span className="room-detail-capacity"><PiggyBank size={17} /> Up to {room.capacity} pigs</span>
              </header>

              <div className="room-detail-host"><CircleUserRound size={22} /><span>Managed by <strong>{farm?.name ?? "HC Trinity Intergrated Farms"}</strong></span></div>

              <section className="room-detail-information">
                <div className="room-detail-section-heading">
                  <div><span className="rooms-eyebrow rooms-eyebrow-dark">ABOUT THIS ROOM</span><h2>Room details</h2></div>
                  <ShieldCheck size={21} />
                </div>
                <p className="room-detail-about-copy">A managed space for raising your herd, with clear capacity and monthly pricing. Send a request for your preferred dates and the farm team will confirm availability and any optional care services.</p>
                <dl>
                  <div><dt>Location</dt><dd>{farm?.location ?? "Contact the farm for details"}</dd></div>
                  <div><dt>Availability</dt><dd>{roomStatusLabel(room.status)}</dd></div>
                  <div><dt>Camera</dt><dd>{cameraAvailable ? "Camera is assigned to this room" : "Camera details available on request"}</dd></div>
                </dl>
              </section>

              <section className="room-detail-highlights" aria-label="Room highlights">
                <article><span className="room-detail-highlight-icon"><DoorOpen size={18} /></span><div><small>Room number</small><strong>{String(room.room_number).padStart(2, "0")}</strong></div></article>
                <article><span className="room-detail-highlight-icon"><PiggyBank size={18} /></span><div><small>Maximum capacity</small><strong>{room.capacity} pigs</strong></div></article>
                <article><span className="room-detail-highlight-icon"><Camera size={18} /></span><div><small>Camera monitoring</small><strong>{cameraAvailable ? "Available" : "Not listed"}</strong></div></article>
              </section>
              <aside className="room-detail-booking">
                <span className="rooms-eyebrow rooms-eyebrow-dark">MONTHLY RENTAL</span>
                <div className="room-detail-rate">{formatGHS(room.monthly_price)}<span> / month</span></div>
                <div className={`room-detail-booking-status ${room.status === "available" ? "is-available" : ""}`}>
                  <span /> {roomStatusLabel(room.status)}
                </div>
                <p>Send a request to the farm. Your dates and room assignment must be reviewed before the rental is confirmed.</p>
                {room.status === "available" ? (
                  <Link to={requestHref} className="room-detail-request-button">
                    {user?.role === "admin" ? "Manage rooms" : "Request this room"} <ArrowRight size={16} />
                  </Link>
                ) : (
                  <span className="room-detail-unavailable-button">Room not available</span>
                )}
                <div className="room-detail-booking-note"><Check size={15} /> Requesting does not charge you or guarantee availability.</div>
              </aside>
            </div>
          </div>
        )}
      </div>

      <footer className="rooms-footer">
        <Link className="rooms-brand" to="/">
          <span className="rooms-brand-mark"><PiggyBank size={19} strokeWidth={1.8} /></span>
          HC Trinity Intergrated Farms
        </Link>
        <span>Space to farm. Confidence to grow.</span>
        <Link to="/rooms">Browse all rooms <ArrowRight size={15} /></Link>
      </footer>
      {flight && !flightLanded && <img className="room-detail-flight" src={flight.photo} style={{ left: flight.rect.left, top: flight.rect.top, width: flight.rect.width, height: flight.rect.height }} alt="" aria-hidden="true" />}
    </main>
  );
}
