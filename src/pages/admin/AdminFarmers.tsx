import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { useDemoWorkflows } from "@/features/demo/DemoWorkflowProvider";
import { useMocks } from "@/lib/supabase";

export default function AdminFarmers() {
  const [query, setQuery] = useState("");
  const { profiles, rentals, rentalRooms, rooms } = useDemoWorkflows();
  const farmers = useMemo(() => profiles
    .filter((profile) => profile.role === "farmer")
    .filter((profile) => `${profile.full_name} ${profile.phone}`.toLowerCase().includes(query.trim().toLowerCase())),
  [profiles, query]);

  const summary = profiles.filter((profile) => profile.role === "farmer");

  return (
    <div>
      <header className="dash-page-head">
        <div>
          <span className="dash-page-eyebrow">PEOPLE &amp; ACCOUNTS</span>
          <h1>Farmers</h1>
          <p>View farmer account details and their current rental activity.</p>
        </div>
      </header>

      <section className="dash-stats dash-stats-3" aria-label="Farmer summary">
        <article className="dash-stat-card"><div className="dash-stat-top">Registered farmers<span className="dash-stat-icon"><Users size={17} /></span></div><strong>{summary.length}</strong><small>Farmer profiles in sample data</small></article>
        <article className="dash-stat-card"><div className="dash-stat-top">Active rentals<span className="dash-stat-icon"><Users size={17} /></span></div><strong>{rentals.filter((rental) => rental.status === "active").length}</strong><small>Current rental agreements</small></article>
        <article className="dash-stat-card"><div className="dash-stat-top">Rooms assigned<span className="dash-stat-icon"><Users size={17} /></span></div><strong>{rentalRooms.length}</strong><small>Across active and past agreements</small></article>
      </section>

      <section className="dash-panel">
        <div className="dash-filter-row">
          <div><strong className="dash-section-title">Farmer directory</strong><span className="dash-subtitle">{farmers.length} accounts</span></div>
          <label className="dash-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or phone" aria-label="Search farmers by name or phone" /></label>
        </div>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead><tr><th>FARMER</th><th>PHONE</th><th>ACTIVE RENTALS</th><th>ROOMS</th><th>ACCOUNT</th></tr></thead>
            <tbody>{farmers.map((farmer) => {
              const farmerRentals = rentals.filter((rental) => rental.farmer_id === farmer.id);
              const activeRentals = farmerRentals.filter((rental) => rental.status === "active");
              const rentalIds = new Set(activeRentals.map((rental) => rental.id));
              const farmerRooms = rentalRooms.filter((item) => rentalIds.has(item.rental_id)).map((item) => rooms.find((room) => room.id === item.room_id)).filter((room) => room !== undefined);
              return (
                <tr key={farmer.id}>
                  <td><strong className="dash-farmer-name"><span>{farmer.full_name.slice(0, 1)}</span>{farmer.full_name}</strong><small>Farmer account</small></td>
                  <td>{farmer.phone}</td>
                  <td>{activeRentals.length || "—"}</td>
                  <td>{farmerRooms.length ? farmerRooms.map((room) => `Room ${String(room.room_number).padStart(2, "0")}`).join(", ") : "—"}</td>
                  <td><span className="dash-badge green">Active</span></td>
                </tr>
              );
            })}</tbody>
          </table>
          {!farmers.length && <div className="dash-table-empty">No farmer accounts match your search.</div>}
        </div>
      </section>
      <p className="dash-demo-note">{useMocks ? "Farmer records shown are sample data. " : "Farmer records are read-only here. "}Account creation and role management must be performed through the secure account workflow.</p>
    </div>
  );
}
