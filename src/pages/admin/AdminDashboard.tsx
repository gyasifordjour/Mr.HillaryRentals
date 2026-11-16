import { CalendarDays, Camera, DoorOpen, Plus, Share2, Star } from "lucide-react";
import CaseManagementCanvas from "@/components/admin/CaseManagementCanvas";
import { useDemoWorkflows } from "@/features/demo/DemoWorkflowProvider";
import { useMocks } from "@/lib/supabase";

function CircleAction({ children, label }: { children: React.ReactNode; label: string }) {
  return <button type="button" className="admin-crm-circle-action" aria-label={label}>{children}</button>;
}

export default function AdminDashboard() {
  const { cameras, farms, profiles, rentals, rooms } = useDemoWorkflows();
  const activeRentals = rentals.filter((rental) => rental.status === "active");
  const availableRooms = rooms.filter((room) => room.status === "available").length;
  const onlineCameras = cameras.filter((camera) => camera.status === "online").length;
  const farmers = profiles.filter((profile) => profile.role === "farmer");
  const featuredRooms = rooms.slice(0, 3);

  return (
    <div className="admin-crm">
      <div className="admin-crm-title-row">
        <h1>Farm Operations</h1>
        <span className="admin-crm-context">{farms.length} farm{farms.length === 1 ? "" : "s"} · {farmers.length} farmers</span>
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
