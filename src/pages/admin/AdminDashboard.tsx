import { Activity, ArrowRight, Camera, CircleDollarSign, DoorOpen, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useDemoWorkflows } from "@/features/demo/DemoWorkflowProvider";
import { getRoomPhoto } from "@/lib/farmPhotos";
import { useMocks } from "@/lib/supabase";

export default function AdminDashboard() {
  const { cameras, farms, profiles, rentals, rooms } = useDemoWorkflows();
  const activeRentals = rentals.filter((rental) => rental.status === "active");
  const availableRooms = rooms.filter((room) => room.status === "available").length;
  const onlineCameras = cameras.filter((camera) => camera.status === "online").length;
  const farmers = profiles.filter((profile) => profile.role === "farmer");

  return (
    <div>
      <header className="dash-page-head">
        <div>
          <span className="dash-page-eyebrow">FARM OPERATIONS</span>
          <h1>Overview</h1>
          <p>Monitor rooms, rentals, farmers, and cameras across {farms.length} farms.</p>
        </div>
        <Link className="dash-secondary-link" to="/admin/rooms"><DoorOpen size={15} /> Manage rooms</Link>
      </header>

      <section className="dash-stats" aria-label="Platform statistics">
        <article className="dash-stat-card"><div className="dash-stat-top">Total rooms<span className="dash-stat-icon"><DoorOpen size={17} /></span></div><strong>{rooms.length}</strong><small>{availableRooms} available to rent</small></article>
        <article className="dash-stat-card"><div className="dash-stat-top">Active rentals<span className="dash-stat-icon"><Activity size={17} /></span></div><strong>{activeRentals.length}</strong><small>Current rental agreements</small></article>
        <article className="dash-stat-card"><div className="dash-stat-top">Registered farmers<span className="dash-stat-icon"><Users size={17} /></span></div><strong>{farmers.length}</strong><small>Farmer accounts in sample data</small></article>
        <article className="dash-stat-card"><div className="dash-stat-top">Cameras online<span className="dash-stat-icon"><Camera size={17} /></span></div><strong>{onlineCameras}<span className="dash-stat-total"> / {cameras.length}</span></strong><small>Camera connection status</small></article>
      </section>

      <div className="dash-two-col">
        <section className="dash-panel">
          <div className="dash-panel-head"><h2>Room availability</h2><Link to="/admin/rooms">View all rooms <ArrowRight size={13} /></Link></div>
          <div className="dash-room-cards dash-admin-room-cards">
            {rooms.slice(0, 3).map((room) => (
              <article className="dash-room-card" key={room.id}>
                <img className="dash-room-illustration" src={getRoomPhoto(room.room_number, room.image_path).src} alt={getRoomPhoto(room.room_number, room.image_path).alt} />
                <div className="dash-room-info">
                  <span className={`dash-badge ${room.status === "available" ? "green" : room.status === "reserved" ? "amber" : ""}`}>{room.status}</span>
                  <h3>Room {String(room.room_number).padStart(2, "0")}</h3>
                  <p>Capacity: {room.capacity} pigs</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head"><h2>Recent activity</h2><span className="dash-badge amber">SAMPLE</span></div>
          <div className="dash-panel-body">
            <div className="dash-activity-list">
              <div className="dash-activity"><span className="dash-activity-icon"><Users size={15} /></span><div><strong>Farmer accounts ready</strong><span>{farmers.length} farmer profiles in sample data.</span></div></div>
              <div className="dash-activity"><span className="dash-activity-icon"><DoorOpen size={15} /></span><div><strong>Room status updated</strong><span>{availableRooms} room currently marked available.</span></div></div>
              <div className="dash-activity"><span className="dash-activity-icon"><Camera size={15} /></span><div><strong>Camera monitoring</strong><span>{onlineCameras} of {cameras.length} cameras show online status.</span></div></div>
            </div>
          </div>
        </section>
      </div>

      <section className="dash-panel" style={{ marginTop: 17 }}>
        <div className="dash-panel-head"><h2>Rental overview</h2><Link to="/admin/rentals">Manage rentals <ArrowRight size={13} /></Link></div>
        {activeRentals.length ? (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead><tr><th>FARMER</th><th>START DATE</th><th>END DATE</th><th>STATUS</th></tr></thead>
              <tbody>{activeRentals.map((rental) => {
                const farmer = farmers.find((profile) => profile.id === rental.farmer_id);
                return <tr key={rental.id}><td><strong>{farmer?.full_name || "Farmer"}</strong><small>{farmer?.phone || "—"}</small></td><td>{rental.start_date}</td><td>{rental.end_date}</td><td><span className="dash-badge green">Active</span></td></tr>;
              })}</tbody>
            </table>
          </div>
        ) : <div className="dash-empty"><span className="dash-empty-icon"><CircleDollarSign size={20} /></span><strong>No active rentals</strong></div>}
      </section>
      <p className="dash-demo-note">{useMocks ? "Figures and activity are sample data. " : ""}Room photos are illustrative stock images, not photos of this farm.</p>
    </div>
  );
}
