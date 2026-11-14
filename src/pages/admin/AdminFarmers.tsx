import { useMemo, useState, type FormEvent } from "react";
import { AtSign, LoaderCircle, Search, UserPlus, Users, UserRound } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";
import { useDemoWorkflows } from "@/features/demo/DemoWorkflowProvider";
import { supabase, useMocks } from "@/lib/supabase";

export default function AdminFarmers() {
  const [query, setQuery] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const { profiles, rentals, rentalRooms, rooms, reload } = useDemoWorkflows();
  const toast = useToast();
  const farmers = useMemo(() => profiles
    .filter((profile) => profile.role === "farmer")
    .filter((profile) => `${profile.full_name} ${profile.email ?? ""} ${profile.phone ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())),
  [profiles, query]);

  const summary = profiles.filter((profile) => profile.role === "farmer");

  const handleCreateFarmer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        farmer_id: string;
        email_sent: boolean;
        message: string;
      }>("create-farmer", { body: { full_name: fullName, email } });
      if (error) {
        const context = "context" in error ? error.context : null;
        if (context instanceof Response) {
          const responseBody: unknown = await context.clone().json().catch(() => null);
          if (responseBody && typeof responseBody === "object" && "error" in responseBody && typeof responseBody.error === "string") {
            throw new Error(responseBody.error);
          }
        }
        throw error;
      }
      if (!data?.farmer_id || typeof data.email_sent !== "boolean") {
        throw new Error("The server returned an incomplete account-creation result.");
      }

      await reload();
      setFullName("");
      setEmail("");
      if (data.email_sent) {
        toast.success("Farmer account created", data.message);
      } else {
        toast.info("Account created, email not sent", data.message);
      }
    } catch (reason) {
      toast.error("Farmer account not created", reason instanceof Error ? reason.message : "The account could not be created.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <header className="dash-page-head">
        <div>
          <span className="dash-page-eyebrow">PEOPLE &amp; ACCOUNTS</span>
          <h1>Farmers</h1>
          <p>View farmer account details and their current rental activity.</p>
        </div>
      </header>

      <form className="dash-panel dash-form-panel" onSubmit={handleCreateFarmer}>
        <div className="dash-panel-head">
          <div><h2>Add a farmer account</h2><span className="dash-subtitle">Create an email sign-in and send the farmer a one-time code.</span></div>
          <UserPlus size={18} aria-hidden="true" />
        </div>
        <div className="dash-form-body">
          {useMocks && <p className="dash-notice">Real farmer accounts require a configured Supabase project. Local preview data cannot create Auth users or send email.</p>}
          <div className="dash-form-row">
            <label className="dash-form-field" htmlFor="farmer-full-name">
              Farmer name
              <span className="dash-form-input-icon"><UserRound size={15} /><input autoComplete="name" disabled={useMocks || creating} id="farmer-full-name" maxLength={100} onChange={(event) => setFullName(event.target.value)} placeholder="Full name" required value={fullName} /></span>
            </label>
            <label className="dash-form-field" htmlFor="farmer-email">
              Email address
              <span className="dash-form-input-icon"><AtSign size={15} /><input autoComplete="email" disabled={useMocks || creating} id="farmer-email" maxLength={254} onChange={(event) => setEmail(event.target.value)} placeholder="farmer@example.com" required type="email" value={email} /></span>
            </label>
          </div>
          <div><button className="dash-primary-button" disabled={useMocks || creating} type="submit">{creating ? <LoaderCircle size={15} /> : <UserPlus size={15} />}{creating ? "Creating account..." : "Create account and send code"}</button></div>
        </div>
      </form>

      <section className="dash-stats dash-stats-3" aria-label="Farmer summary">
        <article className="dash-stat-card"><div className="dash-stat-top">Registered farmers<span className="dash-stat-icon"><Users size={17} /></span></div><strong>{summary.length}</strong><small>Farmer profiles in sample data</small></article>
        <article className="dash-stat-card"><div className="dash-stat-top">Active rentals<span className="dash-stat-icon"><Users size={17} /></span></div><strong>{rentals.filter((rental) => rental.status === "active").length}</strong><small>Current rental agreements</small></article>
        <article className="dash-stat-card"><div className="dash-stat-top">Rooms assigned<span className="dash-stat-icon"><Users size={17} /></span></div><strong>{rentalRooms.length}</strong><small>Across active and past agreements</small></article>
      </section>

      <section className="dash-panel">
        <div className="dash-filter-row">
          <div><strong className="dash-section-title">Farmer directory</strong><span className="dash-subtitle">{farmers.length} accounts</span></div>
          <label className="dash-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" aria-label="Search farmers by name or email" /></label>
        </div>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead><tr><th>FARMER</th><th>EMAIL / PHONE</th><th>ACTIVE RENTALS</th><th>ROOMS</th><th>ACCOUNT</th></tr></thead>
            <tbody>{farmers.map((farmer) => {
              const farmerRentals = rentals.filter((rental) => rental.farmer_id === farmer.id);
              const activeRentals = farmerRentals.filter((rental) => rental.status === "active");
              const rentalIds = new Set(activeRentals.map((rental) => rental.id));
              const farmerRooms = rentalRooms.filter((item) => rentalIds.has(item.rental_id)).map((item) => rooms.find((room) => room.id === item.room_id)).filter((room) => room !== undefined);
              return (
                <tr key={farmer.id}>
                  <td><strong className="dash-farmer-name"><span>{farmer.full_name.slice(0, 1)}</span>{farmer.full_name}</strong><small>Farmer account</small></td>
                  <td>{farmer.email || farmer.phone || "—"}</td>
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
      <p className="dash-demo-note">{useMocks ? "Farmer records shown are sample data. " : "Existing farmer records remain read-only here. "}Accounts are provisioned through the secure form above; role changes require separate administrator access.</p>
    </div>
  );
}
