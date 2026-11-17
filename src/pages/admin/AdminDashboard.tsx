import { CalendarDays, Camera, DoorOpen, Plus, Share2, Star, TrendingDown, TrendingUp } from "@/components/ui/Iconly";
import { Link } from "react-router-dom";
import { useState } from "react";
import CaseManagementCanvas from "@/components/admin/CaseManagementCanvas";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDemoWorkflows } from "@/features/demo/DemoWorkflowProvider";
import { getRoomPhoto } from "@/lib/farmPhotos";
import { useMocks } from "@/lib/supabase";

function CircleAction({ children, label }: { children: React.ReactNode; label: string }) {
  return <button type="button" className="admin-crm-circle-action" aria-label={label}>{children}</button>;
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState("Month");
  const { user } = useAuth();
  const { cameras, farms, profiles, rentals, rooms, payments } = useDemoWorkflows();
  const activeRentals = rentals.filter((rental) => rental.status === "active");
  const availableRooms = rooms.filter((room) => room.status === "available").length;
  const onlineCameras = cameras.filter((camera) => camera.status === "online").length;
  const farmers = profiles.filter((profile) => profile.role === "farmer");
  const featuredRooms = rooms.slice(0, 3);
  const periodDays = period === "Week" ? 7 : period === "Quarter" ? 90 : period === "6 month" ? 180 : period === "Year" ? 365 : 30;
  const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  const periodRentals = activeRentals.filter((rental) => new Date(`${rental.start_date}T00:00:00`) >= periodStart);
  const outstandingPayments = payments.filter((payment) => payment.status === "due").reduce((total, payment) => total + payment.amount, 0);

  return (
    <div className="admin-crm admin-home-crm">
      <div className="admin-crm-title-row">
        <h1>Farm Operations</h1>
        <span className="admin-crm-context">{farms.length} farm{farms.length === 1 ? "" : "s"} · {farmers.length} farmers</span>
      </div>

      <div className="admin-mobile-overview">
        <header className="admin-mobile-home-header">
          <h1>Home</h1>
          <Link className="admin-home-profile-link" to="/settings" aria-label="Open admin profile settings">
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="" />
              : <span>{user?.full_name?.slice(0, 1).toUpperCase() || "A"}</span>}
          </Link>
        </header>
        <section className="admin-mobile-team">
          <div className="admin-mobile-section-head"><h2>Farm Team</h2><span>{farmers.length} farmers</span></div>
          <div className="admin-mobile-avatars">
            {farmers.slice(0, 6).map((farmer) => (
              <Link className="admin-mobile-avatar" key={farmer.id} to={`/admin/farmers#${farmer.id}`} aria-label={`Open ${farmer.full_name}'s profile`}>
                {farmer.avatar_url ? <img src={farmer.avatar_url} alt="" /> : farmer.full_name?.slice(0, 1).toUpperCase() || "F"}
              </Link>
            ))}
          </div>
        </section>

        <section className="admin-mobile-section">
          <div className="admin-mobile-section-head"><h2>Upcoming rentals</h2><Link to="/admin/rentals">View calendar</Link></div>
          <div className="admin-mobile-operation-list">
            {featuredRooms.map((room) => (
              <Link className="admin-mobile-operation" key={room.id} to="/admin/rooms">
                <img className="admin-mobile-operation-image" src={getRoomPhoto(room.room_number, room.image_path).src} alt="" />
                <span className="admin-mobile-operation-tag">Room details</span>
                <span className="admin-mobile-operation-copy">
                  <strong>Room {String(room.room_number).padStart(2, "0")} setup</strong>
                  <small>Room review · {room.capacity} pigs</small>
                  <b>{room.status === "available" ? "Ready" : "Scheduled"}</b>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="admin-mobile-section admin-mobile-analytics">
          <div className="admin-mobile-section-head"><h2>Analytics</h2><Link to="/admin/analytics">View details</Link></div>
          <div className="admin-mobile-periods" role="tablist" aria-label="Analytics period">
            {["Week", "Month", "Quarter", "6 month", "Year"].map((item) => (
              <button key={item} type="button" role="tab" aria-selected={period === item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{item}</button>
            ))}
          </div>
          <div className="admin-mobile-metrics">
            <div><span>Room occupancy</span><strong>{rooms.length ? Math.round(((rooms.length - availableRooms) / rooms.length) * 100) : 0}%</strong><b className="positive">{periodRentals.length ? `+${periodRentals.length}` : "—"} <TrendingUp size={14} /></b></div>
            <div><span>Active rentals</span><strong>{period === "Month" ? activeRentals.length : periodRentals.length}</strong><b className="positive">+{periodRentals.length} <TrendingUp size={14} /></b></div>
            <div><span>Outstanding payments</span><strong>GH₵{outstandingPayments.toFixed(2)}</strong><b className={outstandingPayments ? "negative" : "positive"}>{outstandingPayments ? "Open" : "Clear"} <TrendingDown size={14} /></b></div>
          </div>
        </section>
      </div>

      <CaseManagementCanvas />

      <div className="admin-crm-lower-grid">
        <section className="admin-crm-lower-panel">
          <div className="admin-crm-lower-head"><h2>Suggested Knowledge</h2><div><CircleAction label="Add"><Plus size={15} /></CircleAction><CircleAction label="Share"><Share2 size={15} /></CircleAction><CircleAction label="Calendar"><CalendarDays size={15} /></CircleAction></div></div>
          <div className="admin-crm-table-wrap">
            <table className="admin-crm-table">
              <thead><tr><th /><th>Subject</th><th>Status</th><th>Start date</th><th>End date</th><th>Assigned user</th></tr></thead>
              <tbody>
                {featuredRooms.map((room, index) => (
                  <tr key={room.id}>
                    <td><Star size={13} fill={index === 0 ? "currentColor" : "none"} /></td>
                    <td><strong>Room {String(room.room_number).padStart(2, "0")} setup</strong></td>
                    <td><span className={`admin-crm-pill ${room.status === "available" ? "blue" : "red"}`}>{room.status === "available" ? "Ready" : "Scheduled"}</span></td>
                    <td>{room.monthly_price ? "Room review" : "—"}</td><td>{room.capacity} pigs</td><td>{farmers[index]?.full_name ?? "Farm team"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-crm-lower-panel admin-crm-support-panel">
          <div className="admin-crm-lower-head"><h2>Support Ticket Journey</h2><div><CircleAction label="Add"><Plus size={15} /></CircleAction><CircleAction label="Share"><Share2 size={15} /></CircleAction><CircleAction label="Calendar"><CalendarDays size={15} /></CircleAction></div></div>
          <div className="admin-crm-chart-row">
            <div className="admin-crm-donut blue"><strong>{availableRooms}</strong><span>Available</span></div>
            <div className="admin-crm-donut red"><strong>{activeRentals.length}</strong><span>Active</span></div>
          </div>
          <div className="admin-crm-support-summary"><span><Camera size={13} /> {onlineCameras}/{cameras.length} cameras online</span><span><DoorOpen size={13} /> {rooms.length} total rooms</span></div>
        </section>
      </div>

      <p className="dash-demo-note">{useMocks ? "Figures and activity are sample data. " : ""}Use the workflow above to manage rooms, farmers, rentals, and camera access.</p>
    </div>
  );
}
