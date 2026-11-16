import { useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { ArrowDownUp, ArrowLeft, ArrowRight, Camera, Check, MapPin, PiggyBank } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDemoWorkflows } from "@/features/demo/DemoWorkflowProvider";
import { getRoomPhoto } from "@/lib/farmPhotos";
import { formatGHS } from "@/lib/utils";
import { useMocks } from "@/lib/supabase";
import ThemeToggle from "@/components/ui/ThemeToggle";
import "@/styles/rooms.css";

type RoomFilter = "all" | "available";
type SortOrder = "price" | "capacity";

export default function BrowseRooms() {
  const [searchParams] = useSearchParams();
  const minimumCapacity = Math.max(0, Number(searchParams.get("minPigs")) || 0);
  const [filter, setFilter] = useState<RoomFilter>(searchParams.get("status") === "available" ? "available" : "all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("price");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { farms, rooms: roomRecords } = useDemoWorkflows();

  const rooms = useMemo(() => {
    const filtered = roomRecords.filter((room) =>
      room.capacity >= minimumCapacity && (filter === "all" || room.status === "available")
    );
    return [...filtered].sort((a, b) =>
      sortOrder === "price" ? a.monthly_price - b.monthly_price || a.room_number - b.room_number : a.capacity - b.capacity
    );
  }, [filter, minimumCapacity, sortOrder, roomRecords]);

  const availableCount = roomRecords.filter((room) => room.status === "available").length;
  const signInHref = user?.role === "admin" ? "/admin" : user ? "/dashboard" : "/login";

  const openRoomDetail = (event: ReactMouseEvent<HTMLAnchorElement>, roomId: string, photoSrc: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const image = event.currentTarget.closest(".room-card")?.querySelector<HTMLImageElement>(".room-illustration");
    if (!image) return;
    event.preventDefault();
    const rect = image.getBoundingClientRect();
    navigate(`/rooms/${roomId}`, {
      state: { roomPhotoFlight: { photo: photoSrc, rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } } },
    });
  };

  return (
    <main className="rooms-page">
      <header className="rooms-nav">
        <Link className="rooms-brand" to="/" aria-label="HC Trinity Intergrated Farms home">
          <span className="rooms-brand-mark"><PiggyBank size={20} strokeWidth={1.8} /></span>
          HC Trinity Intergrated Farms
        </Link>
        <div className="rooms-nav-actions">
          <Link className="rooms-back-link" to="/">Back to home</Link>
          <ThemeToggle />
          <Link className="rooms-sign-in" to={signInHref}>
            {user ? "Dashboard" : "Sign in"} <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <section className="rooms-hero">
        <div className="rooms-hero-copy">
          <span className="rooms-eyebrow"><span /> PIG HOUSING, MADE ACCESSIBLE</span>
          <h1>A good home for your pigs. <em>Room to grow.</em></h1>
          <p>
            Find a clean, managed room that fits your herd. Every room has a clear capacity, monthly price,
            and its own camera.
          </p>
          <div className="rooms-hero-points">
            <span><Check size={16} /> Rent one room or more</span>
            <span><Check size={16} /> Optional farm services</span>
            <span><Check size={16} /> Monitor remotely</span>
          </div>
        </div>
        <div className="rooms-hero-art">
          <img className="rooms-hero-photo" src="/farm-images/pig-room.jpg" alt="Illustrative stock photo of pigs in a farm room, not a HC Trinity Intergrated Farms facility" />
          <span className="rooms-photo-caption">ILLUSTRATIVE STOCK PHOTO</span>
          <div className="rooms-art-label"><Camera size={14} /> A camera in every room</div>
        </div>
      </section>

      <section className="rooms-catalog" aria-labelledby="rooms-heading">
        <div className="rooms-catalog-head">
          <div>
            <span className="rooms-eyebrow rooms-eyebrow-dark">THE FARM</span>
            <h2 id="rooms-heading">Find your room</h2>
            <p className="rooms-location"><MapPin size={16} /> {farms[0]?.name ?? "Farm"} · {farms[0]?.location ?? "Ghana"}</p>
          </div>
          <div className="rooms-listing-summary">
            <strong>{availableCount}</strong>
            <span>of {roomRecords.length} rooms available</span>
          </div>
        </div>

        <div className="rooms-toolbar">
          <div className="rooms-filter" aria-label="Filter room listings">
            <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
              All rooms <span>{roomRecords.length}</span>
            </button>
            <button type="button" className={filter === "available" ? "active" : ""} onClick={() => setFilter("available")}>
              Available <span>{availableCount}</span>
            </button>
          </div>
          <label className="rooms-sort">
            <ArrowDownUp size={15} />
            <span>Sort by</span>
            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)}>
              <option value="price">Monthly price</option>
              <option value="capacity">Capacity</option>
            </select>
          </label>
        </div>

        {minimumCapacity > 0 && <p className="rooms-data-note">Showing rooms with capacity for at least {minimumCapacity} {minimumCapacity === 1 ? "pig" : "pigs"}. <Link to="/rooms">Clear search</Link></p>}

        {rooms.length > 0 ? (
          <div className="rooms-grid">
            {rooms.map((room) => {
              const isAvailable = room.status === "available";
              const photo = getRoomPhoto(room.room_number, room.image_path);
              return (
                <article className={`room-card ${isAvailable ? "room-card-available" : ""}`} key={room.id}>
                  <Link
                    className="room-card-image"
                    to={`/rooms/${room.id}`}
                    onClick={(event) => openRoomDetail(event, room.id, photo.src)}
                    aria-label={`View details for room ${room.room_number}`}
                  >
                    <img className="room-illustration" src={photo.src} alt={photo.alt} />
                    <span className={`room-status ${isAvailable ? "status-available" : "status-unavailable"}`}>
                      <span /> {isAvailable ? "Available" : room.status === "reserved" ? "Reserved" : "Occupied"}
                    </span>
                    <span className="room-number">ROOM {String(room.room_number).padStart(2, "0")}</span>
                  </Link>
                  <div className="room-card-content">
                    <div className="room-card-title">
                      <div>
                        <span className="room-card-farm">{farms.find((farm) => farm.id === room.farm_id)?.name ?? "Farm"}</span>
                        <h3>Pig room {String(room.room_number).padStart(2, "0")}</h3>
                      </div>
                    </div>
                    <div className="room-facts">
                      <span><PiggyBank size={17} /> Up to {room.capacity} pigs</span>
                    </div>
                    <div className="room-card-footer">
                      <div className="room-price">{formatGHS(room.monthly_price)}<span>/ month</span></div>
                      <Link
                        className="room-request-button"
                        to={`/rooms/${room.id}`}
                        onClick={(event) => openRoomDetail(event, room.id, photo.src)}
                        aria-label={`View details for room ${room.room_number}`}
                        title="View room details"
                      >
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rooms-empty">
            <span className="rooms-empty-icon"><PiggyBank size={24} /></span>
            <h3>No rooms available right now</h3>
            <p>Check back soon or get in touch with the farm team to ask about upcoming availability.</p>
            <button type="button" onClick={() => setFilter("all")}>View all rooms</button>
          </div>
        )}

        <p className="rooms-data-note">
          {useMocks ? "Room availability and prices are sample listings. " : ""}Photos are illustrative, not actual room photos.
        </p>
      </section>

      <section className="rooms-help">
        <div>
          <span className="rooms-eyebrow">NEED A HAND?</span>
          <h2>Not sure which room fits?</h2>
          <p>Sign in to ask about capacity, dates, and optional feeding or cleaning services.</p>
        </div>
        <Link to={signInHref} className="rooms-help-button">{user ? "Go to dashboard" : "Sign in to continue"} <ArrowRight size={17} /></Link>
      </section>

      <footer className="rooms-footer">
        <Link className="rooms-brand" to="/">
          <span className="rooms-brand-mark"><PiggyBank size={19} strokeWidth={1.8} /></span>
          HC Trinity Intergrated Farms
        </Link>
        <span>Space to farm. Confidence to grow.</span>
        <Link to="/">Back to HC Trinity Intergrated Farms <ArrowLeft size={15} /></Link>
      </footer>
    </main>
  );
}
