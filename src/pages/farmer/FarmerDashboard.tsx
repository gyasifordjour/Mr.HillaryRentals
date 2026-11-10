import { ArrowRight, CalendarDays, Camera, CircleCheck, Clock3, PiggyBank, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDemoWorkflows } from "@/features/demo/DemoWorkflowProvider";
import { getRoomPhoto } from "@/lib/farmPhotos";
import { formatGHS } from "@/lib/utils";
import { useMocks } from "@/lib/supabase";

export default function FarmerDashboard() {
  const { user } = useAuth();
  const { farms, cameras, rentals, rentalRooms, rooms } = useDemoWorkflows();
  const farmer = user;
  const activeRentals = rentals.filter((rental) => rental.farmer_id === farmer?.id && rental.status === "active");
  const activeRentalIds = new Set(activeRentals.map((rental) => rental.id));
  const roomIds = new Set(rentalRooms.filter((item) => activeRentalIds.has(item.rental_id)).map((item) => item.room_id));
  const rentedRooms = rooms.filter((room) => roomIds.has(room.id));
  const cameraCount = cameras.filter((camera) => roomIds.has(camera.room_id)).length;
  const nextExpiry = activeRentals.map((rental) => rental.end_date).sort()[0];

  return (
    <div>
      <header className="dash-page-head">
        <div>
          <span className="dash-page-eyebrow">FARMER OVERVIEW</span>
          <h1>Good to see you, {farmer?.full_name.split(" ")[0] || "Farmer"}.</h1>
          <p>Here’s what’s happening with your rooms and rentals.</p>
        </div>
        <Link className="dash-primary-link" to="/rooms"><Plus size={16} /> Find a room</Link>
      </header>

      <section className="dash-stats" aria-label="Rental summary">
        <article className="dash-stat-card">
          <div className="dash-stat-top">Active rooms<span className="dash-stat-icon"><PiggyBank size={17} /></span></div>
          <strong>{rentedRooms.length}</strong><small>Rooms currently in your care</small>
        </article>
        <article className="dash-stat-card">
          <div className="dash-stat-top">Live cameras<span className="dash-stat-icon"><Camera size={17} /></span></div>
          <strong>{cameraCount}</strong><small>Private to your rented rooms</small>
        </article>
        <article className="dash-stat-card">
          <div className="dash-stat-top">Rental status<span className="dash-stat-icon"><CircleCheck size={17} /></span></div>
          <strong className="dash-status-stat">{activeRentals.length ? "Active" : "None"}</strong><small>{activeRentals.length ? "Your rental is underway" : "No active rentals"}</small>
        </article>
        <article className="dash-stat-card">
          <div className="dash-stat-top">Next rental date<span className="dash-stat-icon"><CalendarDays size={17} /></span></div>
          <strong className="dash-date-stat">{nextExpiry ? new Date(`${nextExpiry}T00:00:00`).toLocaleDateString("en-GH", { day: "numeric", month: "short" }) : "—"}</strong>
          <small>{nextExpiry ? "Current rental ends" : "No end date scheduled"}</small>
        </article>
      </section>

      <div className="dash-two-col">
        <section className="dash-panel">
          <div className="dash-panel-head"><h2>Your rented rooms</h2><Link to="/rentals">View rentals <ArrowRight size={13} /></Link></div>
          {rentedRooms.length ? (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead><tr><th>ROOM</th><th>FARM</th><th>CAPACITY</th><th>MONTHLY</th><th>STATUS</th></tr></thead>
                <tbody>
                  {rentedRooms.map((room) => (
                    <tr key={room.id}>
                      <td className="dash-room-cell">
                        <img src={getRoomPhoto(room.room_number, room.image_path).src} alt="" />
                        <span><strong>Room {String(room.room_number).padStart(2, "0")}</strong><small>{cameras.some((camera) => camera.room_id === room.id) ? "Camera assigned" : "No camera assigned"}</small></span>
                      </td>
                      <td>{farms.find((farm) => farm.id === room.farm_id)?.name ?? "Farm"}</td><td>Up to {room.capacity} pigs</td><td>{formatGHS(room.monthly_price)}</td><td><span className="dash-badge green">Active</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="dash-empty"><span className="dash-empty-icon"><PiggyBank size={20} /></span><strong>No rooms rented yet</strong><p>Browse available rooms to find space that fits your pigs.</p><Link className="dash-secondary-link" to="/rooms">Browse rooms <ArrowRight size={14} /></Link></div>
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head"><h2>Quick access</h2><span className="dash-badge green">YOUR ACCOUNT</span></div>
          <div className="dash-panel-body">
            <div className="dash-activity-list">
              <div className="dash-activity"><span className="dash-activity-icon"><Camera size={15} /></span><div><strong>Check your cameras</strong><span>Open your private live camera view.</span></div></div>
              <div className="dash-activity"><span className="dash-activity-icon"><Clock3 size={15} /></span><div><strong>Rental dates</strong><span>{nextExpiry ? `Your current rental ends ${new Date(`${nextExpiry}T00:00:00`).toLocaleDateString("en-GH", { day: "numeric", month: "long" })}.` : "Rental dates appear here once a request is approved."}</span></div></div>
            </div>
            <Link className="dash-secondary-link" to="/cameras" style={{ marginTop: 16 }}>Open cameras <ArrowRight size={14} /></Link>
          </div>
        </section>
      </div>
      <p className="dash-demo-note">{useMocks ? "Dashboard figures are sample data. " : ""}Room photos are illustrative stock images, not photos of your rental.</p>
    </div>
  );
}
