import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";
import { AtSign, Check, Copy, ImagePlus, LoaderCircle, Mail, Pencil, Phone, Save, Search, Trash2, UserCheck, UserPlus, UserRound, Users, UserX, X } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";
import { useDemoWorkflows } from "@/features/demo/DemoWorkflowProvider";
import { supabase, useMocks } from "@/lib/supabase";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function AdminFarmers() {
  const [query, setQuery] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { profiles, rentals, rentalRooms, rooms, reload, deleteFarmer, updateFarmer, setFarmerActive, resendFarmerLink } = useDemoWorkflows();
  const toast = useToast();
  const farmers = useMemo(() => profiles
    .filter((profile) => profile.role === "farmer")
    .filter((profile) => `${profile.full_name} ${profile.email ?? ""} ${profile.phone ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())),
  [profiles, query]);

  const summary = profiles.filter((profile) => profile.role === "farmer");

  useEffect(() => {
    if (!avatar) {
      setAvatarPreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(avatar);
    setAvatarPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [avatar]);

  const chooseAvatar = (file: File | undefined) => {
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      toast.error("Unsupported picture", "Choose a JPG, PNG, or WebP profile picture.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Picture too large", "Profile pictures must be 5 MB or smaller.");
      return;
    }
    setAvatar(file);
  };

  const handleCreateFarmer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setCopiedCredentials(false);
    try {
      const formData = new FormData();
      formData.append("full_name", fullName);
      formData.append("email", email);
      if (phone.trim()) formData.append("phone", phone.trim());
      if (avatar) formData.append("avatar", avatar);

      const { data, error } = await supabase.functions.invoke<{
        farmer_id: string;
        temporary_password: string;
        message: string;
      }>("create-farmer", { body: formData });
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
      if (!data?.farmer_id || typeof data.temporary_password !== "string") {
        throw new Error("The server returned an incomplete account-creation result.");
      }

      await reload();
      setCreatedCredentials({ email: email.trim().toLowerCase(), password: data.temporary_password });
      setFullName("");
      setEmail("");
      setPhone("");
      setAvatar(null);
      toast.success("Farmer account created", data.message);
    } catch (reason) {
      toast.error("Farmer account not created", reason instanceof Error ? reason.message : "The account could not be created.");
    } finally {
      setCreating(false);
    }
  };

  const copyCredentials = async () => {
    if (!createdCredentials) return;
    try {
      await navigator.clipboard.writeText(
        `Email: ${createdCredentials.email}\nTemporary password: ${createdCredentials.password}`,
      );
      setCopiedCredentials(true);
      toast.success("Sign-in details copied", "Share them with the farmer securely.");
    } catch {
      toast.error("Copy failed", "Select the details and copy them manually.");
    }
  };

  const startEdit = (farmer: (typeof farmers)[number]) => {
    setEditingId(farmer.id);
    setEditName(farmer.full_name);
    setEditPhone(farmer.phone ?? "");
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>, farmerId: string) => {
    event.preventDefault();
    setSavingEdit(true);
    try {
      await updateFarmer(farmerId, { full_name: editName, phone: editPhone });
      setEditingId(null);
      toast.success("Farmer updated", "The account details were saved.");
    } catch (reason) {
      toast.error("Farmer not updated", reason instanceof Error ? reason.message : "The account could not be updated.");
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleActive = async (farmer: (typeof farmers)[number]) => {
    const active = farmer.is_active === false;
    const label = farmer.full_name || farmer.email || "this farmer";
    if (!active && !window.confirm(`Deactivate ${label}? They will be signed out and cannot sign in until the account is reactivated.`)) return;
    setBusyId(farmer.id);
    try {
      await setFarmerActive(farmer.id, active);
      toast.success(active ? "Farmer reactivated" : "Farmer deactivated", active ? `${label} can sign in again.` : `${label} can no longer sign in.`);
    } catch (reason) {
      toast.error("Account state not changed", reason instanceof Error ? reason.message : "The account state could not be changed.");
    } finally {
      setBusyId(null);
    }
  };

  const sendLink = async (farmer: (typeof farmers)[number]) => {
    setBusyId(farmer.id);
    try {
      await resendFarmerLink(farmer.id);
      toast.success("Sign-in link sent", `A fresh link was sent to ${farmer.email}.`);
    } catch (reason) {
      toast.error("Link not sent", reason instanceof Error ? reason.message : "The sign-in link could not be sent.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteFarmer = async (farmer: (typeof farmers)[number]) => {
    const label = farmer.full_name || farmer.email || farmer.phone || "this farmer";
    const rentalCount = rentals.filter((rental) => rental.farmer_id === farmer.id).length;
    const warning = rentalCount
      ? `Delete ${label}? This permanently removes the account and its ${rentalCount} rental record${rentalCount === 1 ? "" : "s"}, including any payments and service requests.`
      : `Delete ${label}? This permanently removes the account.`;
    if (!window.confirm(warning)) return;

    setDeletingId(farmer.id);
    try {
      await deleteFarmer(farmer.id);
      toast.success("Farmer account removed", `${label} no longer has an account.`);
    } catch (reason) {
      toast.error("Farmer account not removed", reason instanceof Error ? reason.message : "The account could not be removed.");
    } finally {
      setDeletingId(null);
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
          <div><h2>Add a farmer account</h2><span className="dash-subtitle">Create a verified sign-in with a temporary password the farmer must replace at first sign-in.</span></div>
          <UserPlus size={18} aria-hidden="true" />
        </div>
        <div className="dash-form-body">
          {useMocks && <p className="dash-notice">Real farmer accounts require a configured Supabase project. Local preview data cannot create Auth users or upload profile pictures.</p>}
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
          <div className="dash-form-row">
            <label className="dash-form-field" htmlFor="farmer-phone">
              Phone number <small>Optional</small>
              <span className="dash-form-input-icon"><Phone size={15} /><input autoComplete="tel" disabled={useMocks || creating} id="farmer-phone" inputMode="tel" maxLength={30} onChange={(event) => setPhone(event.target.value)} placeholder="024 123 4567" value={phone} /></span>
            </label>
            <div className="dash-form-field">
              Profile picture <small>Optional · JPG, PNG, or WebP up to 5 MB</small>
              <div className="dash-farmer-photo-editor">
                {avatarPreview
                  ? <img className="dash-farmer-photo-preview" src={avatarPreview} alt="Selected farmer profile picture" />
                  : <span className="dash-farmer-photo-fallback"><UserRound size={22} /></span>}
                <div className="dash-room-photo-actions">
                  <label className={`dash-secondary-button${creating ? " disabled" : ""}`}>
                    <ImagePlus size={14} /> Choose picture
                    <input accept="image/jpeg,image/png,image/webp" disabled={useMocks || creating} hidden onChange={(event) => { chooseAvatar(event.target.files?.[0]); event.currentTarget.value = ""; }} type="file" />
                  </label>
                  {avatar && <button className="dash-room-delete-button" disabled={creating} onClick={() => setAvatar(null)} type="button"><X size={14} /> Remove</button>}
                </div>
              </div>
            </div>
          </div>
          <p className="dash-form-disclaimer">The email is marked verified automatically. Share the temporary password shown after creation and ask the farmer to change it on first sign-in.</p>
          <div><button className="dash-primary-button" disabled={useMocks || creating} type="submit">{creating ? <LoaderCircle className="dash-spin" size={15} /> : <UserPlus size={15} />}{creating ? "Creating account..." : "Create farmer account"}</button></div>
        </div>
      </form>

      {createdCredentials && (
        <section className="dash-panel dash-credentials-panel" aria-live="polite">
          <div className="dash-panel-head">
            <div><h2>Sign-in details ready</h2><span className="dash-subtitle">Share these with the farmer securely. The temporary password is shown only once.</span></div>
            <Check size={18} aria-hidden="true" />
          </div>
          <div className="dash-credentials-body">
            <div className="dash-credentials-grid">
              <div><span>Email</span><strong>{createdCredentials.email}</strong></div>
              <div><span>Temporary password</span><strong>{createdCredentials.password}</strong></div>
            </div>
            <button className="dash-secondary-button" onClick={() => void copyCredentials()} type="button">
              {copiedCredentials ? <Check size={14} /> : <Copy size={14} />} {copiedCredentials ? "Copied" : "Copy details"}
            </button>
            <button className="dash-secondary-button" onClick={() => setCreatedCredentials(null)} type="button"><X size={14} /> Dismiss</button>
          </div>
        </section>
      )}

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
            <thead><tr><th>FARMER</th><th>EMAIL / PHONE</th><th>ACTIVE RENTALS</th><th>ROOMS</th><th>ACCOUNT</th><th>ACTIONS</th></tr></thead>
            <tbody>{farmers.map((farmer) => {
              const farmerRentals = rentals.filter((rental) => rental.farmer_id === farmer.id);
              const activeRentals = farmerRentals.filter((rental) => rental.status === "active");
              const rentalIds = new Set(activeRentals.map((rental) => rental.id));
              const farmerRooms = rentalRooms.filter((item) => rentalIds.has(item.rental_id)).map((item) => rooms.find((room) => room.id === item.room_id)).filter((room) => room !== undefined);
              const active = farmer.is_active !== false;
              const busy = busyId === farmer.id || deletingId === farmer.id;
              return (
                <Fragment key={farmer.id}>
                  <tr>
                    <td><strong className="dash-farmer-name"><span>{farmer.full_name.slice(0, 1)}</span>{farmer.full_name}</strong><small>Farmer account</small></td>
                    <td>{farmer.email || farmer.phone || "—"}</td>
                    <td>{activeRentals.length || "—"}</td>
                    <td>{farmerRooms.length ? farmerRooms.map((room) => `Room ${String(room.room_number).padStart(2, "0")}`).join(", ") : "—"}</td>
                    <td><span className={`dash-badge ${active ? "green" : "red"}`}>{active ? "Active" : "Inactive"}</span></td>
                    <td>
                      <div className="dash-farmer-actions">
                        <button className="dash-secondary-button" type="button" onClick={() => startEdit(farmer)} disabled={busy} aria-label={`Edit ${farmer.full_name || "farmer"}'s details`}>
                          <Pencil size={14} /> Edit
                        </button>
                        <button className="dash-secondary-button" type="button" onClick={() => void sendLink(farmer)} disabled={busy || useMocks || !farmer.email} aria-label={`Resend sign-in link to ${farmer.full_name || "farmer"}`}>
                          {busyId === farmer.id ? <LoaderCircle className="dash-spin" size={14} /> : <Mail size={14} />} Send link
                        </button>
                        <button className="dash-secondary-button" type="button" onClick={() => void toggleActive(farmer)} disabled={busy}>
                          {active ? <UserX size={14} /> : <UserCheck size={14} />} {active ? "Deactivate" : "Reactivate"}
                        </button>
                        <button
                          className="dash-room-delete-button"
                          type="button"
                          onClick={() => void handleDeleteFarmer(farmer)}
                          disabled={busy}
                          aria-label={`Delete ${farmer.full_name || "farmer"}'s account`}
                        >
                          {deletingId === farmer.id ? <LoaderCircle className="dash-spin" size={14} /> : <Trash2 size={14} />}
                          {deletingId === farmer.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingId === farmer.id && (
                    <tr className="dash-farmer-edit-row">
                      <td colSpan={6}>
                        <form className="dash-farmer-edit" onSubmit={(event) => void saveEdit(event, farmer.id)}>
                          <label>Name<input value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={100} required autoFocus /></label>
                          <label>Phone<input value={editPhone} onChange={(event) => setEditPhone(event.target.value)} maxLength={30} inputMode="tel" /></label>
                          <button className="dash-primary-button" type="submit" disabled={savingEdit}>
                            {savingEdit ? <LoaderCircle className="dash-spin" size={14} /> : <Save size={14} />} {savingEdit ? "Saving..." : "Save changes"}
                          </button>
                          <button className="dash-secondary-button" type="button" onClick={() => setEditingId(null)} disabled={savingEdit}>
                            <X size={14} /> Cancel
                          </button>
                        </form>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}</tbody>
          </table>
          {!farmers.length && <div className="dash-table-empty">No farmer accounts match your search.</div>}
        </div>
      </section>
      <p className="dash-demo-note">{useMocks ? "Farmer records shown are sample data. " : ""}Deleting a farmer permanently removes their account, rentals, payments, and service requests. Role changes require separate administrator access.</p>
    </div>
  );
}
