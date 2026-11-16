import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AtSign, ArrowLeft, ArrowRight, Check, Copy, ImagePlus, LoaderCircle, Mail, MessageCircle, Pencil, Phone, Save, Search, ShieldCheck, Trash2, UserCheck, UserPlus, UserRound, Users, UserX, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/ui/ToastProvider";
import { useDemoWorkflows } from "@/features/demo/DemoWorkflowProvider";
import { buildWhatsAppChatUrl } from "@/lib/whatsapp";
import { supabase, useMocks } from "@/lib/supabase";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function AdminFarmers() {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ fullName: string; email: string; password: string; phone: string } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const createFormRef = useRef<HTMLFormElement>(null);
  const { profiles, rentals, rentalRooms, rooms, reload, deleteFarmer, updateFarmer, setFarmerActive, resendFarmerLink } = useDemoWorkflows();
  const toast = useToast();
  const farmers = useMemo(() => profiles
    .filter((profile) => profile.role === "farmer")
    .filter((profile) => `${profile.full_name} ${profile.email ?? ""} ${profile.phone ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())),
  [profiles, query]);

  const summary = profiles.filter((profile) => profile.role === "farmer");

  const resetCreateForm = () => {
    setCreateStep(1);
    setFullName("");
    setEmail("");
    setPhone("");
    setAvatar(null);
  };

  const openCreateModal = () => {
    resetCreateForm();
    setCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (creating) return;
    setCreateOpen(false);
    resetCreateForm();
  };

  const continueCreate = () => {
    const nameInput = createFormRef.current?.querySelector<HTMLInputElement>("#farmer-full-name");
    const emailInput = createFormRef.current?.querySelector<HTMLInputElement>("#farmer-email");
    nameInput?.setCustomValidity(
      fullName.replace(/\s+/g, " ").trim().length < 2 ? "Enter a name between 2 and 100 characters." : "",
    );
    emailInput?.setCustomValidity(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "" : "Enter a valid email address.",
    );
    if (createFormRef.current?.reportValidity()) setCreateStep(2);
  };

  useEffect(() => {
    if (!createOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCreateModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [createOpen, creating]);

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
    if (createStep === 1) {
      continueCreate();
      return;
    }
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
      setCreatedCredentials({
        fullName: fullName.replace(/\s+/g, " ").trim(),
        email: email.trim().toLowerCase(),
        password: data.temporary_password,
        phone: phone.trim(),
      });
      setCreateOpen(false);
      resetCreateForm();
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

  const shareCredentialsOnWhatsApp = () => {
    if (!createdCredentials) return;
    const message = [
      `Hello ${createdCredentials.fullName},`,
      "Your HC Trinity Intergrated Farms account is ready.",
      `Sign-in email: ${createdCredentials.email}`,
      `Temporary password: ${createdCredentials.password}`,
      "Your email is verified. For your security, choose a new password when you first sign in.",
      `Sign in: ${window.location.origin}/login`,
    ].join("\n");
    const chatUrl = buildWhatsAppChatUrl(createdCredentials.phone, message);
    if (!chatUrl) {
      toast.error("WhatsApp number unavailable", "Add a valid Ghanaian WhatsApp number to this farmer's profile before sharing.");
      return;
    }
    const whatsappWindow = window.open(chatUrl, "_blank");
    if (!whatsappWindow) {
      toast.error("WhatsApp could not be opened", "Allow pop-ups for this site and try again.");
      return;
    }
    whatsappWindow.opener = null;
    toast.success("WhatsApp opened", "Review the message and tap Send to share the sign-in details.");
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
        <button className="dash-primary-button" onClick={openCreateModal} type="button">
          <UserPlus size={15} /> Add farmer
        </button>
      </header>

      {createOpen && createPortal(
        <div
          className="dash-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreateModal();
          }}
          role="presentation"
        >
          <section
            aria-describedby="farmer-modal-description"
            aria-labelledby="farmer-modal-title"
            aria-modal="true"
            className="dash-farmer-modal"
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const focusable = event.currentTarget.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), [tabindex]:not([tabindex="-1"])',
              );
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }}
            role="dialog"
          >
            <header className="dash-farmer-modal-head">
              <div>
                <span className="dash-page-eyebrow">NEW FARMER ACCOUNT</span>
                <h2 id="farmer-modal-title">{createStep === 1 ? "Farmer details" : "Photo & review"}</h2>
                <p id="farmer-modal-description">
                  {createStep === 1 ? "Add the farmer’s contact details to get started." : "Add a profile photo and confirm the account details."}
                </p>
              </div>
              <button
                aria-label="Close farmer form"
                className="dash-farmer-modal-close"
                disabled={creating}
                onClick={closeCreateModal}
                type="button"
              >
                <X size={18} />
              </button>
            </header>

            <ol aria-label="Farmer account setup progress" className="dash-farmer-steps">
              <li className={createStep === 1 ? "current" : "complete"} aria-current={createStep === 1 ? "step" : undefined}>
                <span>{createStep === 1 ? "1" : <Check size={14} />}</span>
                <div><strong>Details</strong><small>Name and contact</small></div>
              </li>
              <li className={createStep === 2 ? "current" : ""} aria-current={createStep === 2 ? "step" : undefined}>
                <span>2</span>
                <div><strong>Photo &amp; review</strong><small>Check before creating</small></div>
              </li>
            </ol>

            <form className="dash-farmer-modal-form" onSubmit={(event) => void handleCreateFarmer(event)} ref={createFormRef}>
              {useMocks && (
                <p className="dash-notice">Real farmer accounts require a configured Supabase project. Local preview data cannot create Auth users or upload profile pictures.</p>
              )}

              {createStep === 1 ? (
                <div className="dash-farmer-modal-fields">
                  <label className="dash-form-field" htmlFor="farmer-full-name">
                    Full name <span className="dash-required-mark">Required</span>
                    <span className="dash-form-input-icon"><UserRound size={15} /><input autoComplete="name" autoFocus disabled={useMocks || creating} id="farmer-full-name" maxLength={100} minLength={2} onChange={(event) => setFullName(event.target.value)} placeholder="e.g. Ama Mensah" required value={fullName} /></span>
                  </label>
                  <label className="dash-form-field" htmlFor="farmer-email">
                    Email address <span className="dash-required-mark">Required</span>
                    <span className="dash-form-input-icon"><AtSign size={15} /><input autoComplete="email" disabled={useMocks || creating} id="farmer-email" maxLength={254} onChange={(event) => setEmail(event.target.value)} placeholder="farmer@example.com" required type="email" value={email} /></span>
                  </label>
                  <label className="dash-form-field" htmlFor="farmer-phone">
                    Phone number <small>Optional</small>
                    <span className="dash-form-input-icon"><Phone size={15} /><input autoComplete="tel" disabled={useMocks || creating} id="farmer-phone" inputMode="tel" maxLength={30} onChange={(event) => setPhone(event.target.value)} placeholder="024 123 4567" value={phone} /></span>
                  </label>
                  <p className="dash-form-disclaimer">The email is verified automatically. A temporary password will be generated and must be changed at first sign-in.</p>
                </div>
              ) : (
                <div className="dash-farmer-review">
                  <div className="dash-farmer-modal-photo">
                    {avatarPreview
                      ? <img className="dash-farmer-modal-avatar" src={avatarPreview} alt="Selected farmer profile picture" />
                      : <span className="dash-farmer-modal-avatar dash-farmer-modal-avatar-empty"><UserRound size={25} /></span>}
                    <div className="dash-farmer-modal-photo-copy">
                      <strong>{avatar ? avatar.name : "Profile picture"}</strong>
                      <small>Optional · JPG, PNG, or WebP · Max 5 MB</small>
                      <div className="dash-room-photo-actions">
                        <label className={`dash-secondary-button${useMocks || creating ? " disabled" : ""}`}>
                          <ImagePlus size={14} /> {avatar ? "Change photo" : "Upload photo"}
                          <input accept="image/jpeg,image/png,image/webp" disabled={useMocks || creating} hidden onChange={(event) => { chooseAvatar(event.target.files?.[0]); event.currentTarget.value = ""; }} type="file" />
                        </label>
                        {avatar && <button className="dash-room-delete-button" disabled={creating} onClick={() => setAvatar(null)} type="button"><X size={14} /> Remove</button>}
                      </div>
                    </div>
                  </div>

                  <dl className="dash-farmer-review-details">
                    <div><dt>Full name</dt><dd>{fullName.trim()}</dd></div>
                    <div><dt>Email address</dt><dd>{email.trim().toLowerCase()}</dd></div>
                    <div><dt>Phone number</dt><dd>{phone.trim() || "Not provided"}</dd></div>
                  </dl>

                  <p className="dash-farmer-verified-note">
                    <ShieldCheck size={17} />
                    <span><strong>Email verified</strong>A temporary password will be shown once after creation.</span>
                  </p>
                </div>
              )}

              <footer className="dash-farmer-modal-footer">
                {createStep === 1 ? (
                  <>
                    <button className="dash-secondary-button" disabled={creating} onClick={closeCreateModal} type="button">Cancel</button>
                    <button className="dash-primary-button" disabled={useMocks || creating} onClick={continueCreate} type="button">
                      Continue <ArrowRight size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <button className="dash-secondary-button" disabled={creating} onClick={() => setCreateStep(1)} type="button">
                      <ArrowLeft size={15} /> Back
                    </button>
                    <button className="dash-primary-button" disabled={useMocks || creating} type="submit">
                      {creating ? <LoaderCircle className="dash-spin" size={15} /> : <UserPlus size={15} />}
                      {creating ? "Creating account..." : "Create farmer"}
                    </button>
                  </>
                )}
              </footer>
            </form>
          </section>
        </div>,
        document.body,
      )}

      {createdCredentials && (
        <section className="dash-panel dash-credentials-panel" aria-live="polite">
          <div className="dash-panel-head">
            <div><h2>Sign-in details ready</h2><span className="dash-subtitle">The temporary password is shown only once. Review the message before sending it.</span></div>
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
            <button className="dash-whatsapp-button" onClick={shareCredentialsOnWhatsApp} type="button">
              <MessageCircle size={14} /> Share on WhatsApp
            </button>
            <button className="dash-secondary-button" onClick={() => setCreatedCredentials(null)} type="button"><X size={14} /> Dismiss</button>
          </div>
          <p className="dash-whatsapp-caption">WhatsApp opens a prefilled message to the farmer’s Ghanaian number. Check it and tap Send; it is not sent automatically.</p>
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
