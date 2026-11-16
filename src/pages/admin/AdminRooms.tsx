import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { DoorOpen, ImagePlus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useDemoWorkflows } from "@/features/demo/DemoWorkflowProvider";
import { useMocks } from "@/lib/supabase";
import { getRoomPhoto } from "@/lib/farmPhotos";
import { formatGHS } from "@/lib/utils";
import type { Room, RoomStatus } from "@/types";

type RoomFilter = "all" | RoomStatus;
type RoomForm = Omit<Room, "id">;

const emptyRoom = (farmId: string): RoomForm => ({
  farm_id: farmId,
  room_number: 1,
  capacity: 10,
  monthly_price: 500,
  status: "available",
  image_path: null,
});

export default function AdminRooms() {
  const [filter, setFilter] = useState<RoomFilter>("all");
  const [query, setQuery] = useState("");
  const { farms, rooms, saveRoom, deleteRoom, isLoading } = useDemoWorkflows();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoomForm>(() => emptyRoom(farms[0]?.id ?? ""));
  const [image, setImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [roomModalOpen, setRoomModalOpen] = useState(false);

  useEffect(() => {
    if (!form.farm_id && farms[0]) setForm((current) => ({ ...current, farm_id: farms[0].id }));
  }, [farms, form.farm_id]);

  useEffect(() => {
    if (!image) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const filteredRooms = useMemo(() => rooms.filter((room) => {
    const matchesStatus = filter === "all" || room.status === filter;
    const farmName = farms.find((farm) => farm.id === room.farm_id)?.name ?? "Farm";
    const matchesQuery = `room ${room.room_number} ${farmName}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesStatus && matchesQuery;
  }), [farms, filter, query, rooms]);

  const statusCount = (status: RoomStatus) => rooms.filter((room) => room.status === status).length;
  const resetForm = () => {
    setEditingId(null);
    setForm(emptyRoom(farms[0]?.id ?? ""));
    setImage(null);
    setRemoveImage(false);
    setError("");
    setNotice("");
  };

  const beginEdit = (room: Room) => {
    setEditingId(room.id);
    setForm({
      farm_id: room.farm_id,
      room_number: room.room_number,
      capacity: room.capacity,
      monthly_price: room.monthly_price,
      status: room.status,
      image_path: room.image_path ?? null,
    });
    setImage(null);
    setRemoveImage(false);
    setError("");
    setNotice("");
    setRoomModalOpen(true);
  };

  const closeRoomModal = () => {
    if (busy) return;
    setRoomModalOpen(false);
    setError("");
  };

  const submitRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await saveRoom(editingId, form, image ?? undefined, removeImage);
      setNotice(editingId ? "Room changes saved." : "Room added.");
      setEditingId(null);
      setForm(emptyRoom(farms[0]?.id ?? ""));
      setImage(null);
      setRemoveImage(false);
      setRoomModalOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The room could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (room: Room) => {
    if (!window.confirm(`Delete Room ${String(room.room_number).padStart(2, "0")}? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await deleteRoom(room.id);
      if (editingId === room.id) resetForm();
      setNotice(`Room ${String(room.room_number).padStart(2, "0")} deleted.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The room could not be deleted.");
    } finally {
      setBusy(false);
    }
  };

  const photo = image
    ? { src: previewUrl, alt: "Selected room photo preview" }
    : getRoomPhoto(form.room_number, removeImage ? null : form.image_path);

  return (
    <div>
      <header className="dash-page-head">
        <div>
          <span className="dash-page-eyebrow">FARM OPERATIONS</span>
          <h1>Rooms</h1>
          <p>Add rooms, update their details and photos, or remove rooms that are no longer used.</p>
        </div>
        <button type="button" className="dash-primary-button" onClick={() => { resetForm(); setRoomModalOpen(true); }}>
          <Plus size={15} /> Add room
        </button>
      </header>

      <section className="dash-stats dash-stats-3" aria-label="Room summary">
        <article className="dash-stat-card"><div className="dash-stat-top">All rooms<span className="dash-stat-icon"><DoorOpen size={17} /></span></div><strong>{rooms.length}</strong><small>Across {farms.length} farms</small></article>
        <article className="dash-stat-card"><div className="dash-stat-top">Available<span className="dash-stat-icon"><DoorOpen size={17} /></span></div><strong>{statusCount("available")}</strong><small>Ready for a rental request</small></article>
        <article className="dash-stat-card"><div className="dash-stat-top">Occupied / reserved<span className="dash-stat-icon"><DoorOpen size={17} /></span></div><strong>{statusCount("occupied") + statusCount("reserved")}</strong><small>Currently not available</small></article>
      </section>

      {roomModalOpen && createPortal(
        <div className="dash-modal-backdrop admin-dashboard-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) closeRoomModal(); }} role="presentation">
          <section aria-labelledby="room-modal-title" aria-modal="true" className="dash-farmer-modal" role="dialog">
            <header className="dash-farmer-modal-head">
              <div>
                <span className="dash-page-eyebrow">FARM OPERATIONS</span>
                <h2 id="room-modal-title">{editingId ? "Edit room" : "Add a room"}</h2>
                <p>Set the room details, availability, and profile photo for farmers.</p>
              </div>
              <button aria-label="Close room form" className="dash-farmer-modal-close" disabled={busy} onClick={closeRoomModal} type="button"><X size={18} /></button>
            </header>

            <form className="dash-farmer-modal-form" onSubmit={submitRoom}>
              {error && <p className="dash-form-error" role="alert">{error}</p>}
              {useMocks && <p className="dash-notice">Preview changes are temporary. Sign in to Supabase to save rooms permanently.</p>}
              <div className="dash-farmer-modal-fields dash-room-modal-fields">
                <label className="dash-form-field">
                  Farm
                  <select value={form.farm_id} onChange={(event) => setForm((current) => ({ ...current, farm_id: event.target.value }))} required disabled={!farms.length}>
                    {farms.map((farm) => <option value={farm.id} key={farm.id}>{farm.name} · {farm.location}</option>)}
                  </select>
                </label>
                <label className="dash-form-field">
                  Room number
                  <input type="number" min={1} step={1} value={form.room_number} onChange={(event) => setForm((current) => ({ ...current, room_number: Number(event.target.value) }))} required />
                </label>
                <label className="dash-form-field">
                  Capacity (pigs)
                  <input type="number" min={1} step={1} value={form.capacity} onChange={(event) => setForm((current) => ({ ...current, capacity: Number(event.target.value) }))} required />
                </label>
                <label className="dash-form-field">
                  Monthly price (GHS)
                  <input type="number" min={0} step="0.01" value={form.monthly_price} onChange={(event) => setForm((current) => ({ ...current, monthly_price: Number(event.target.value) }))} required />
                </label>
                <label className="dash-form-field">
                  Availability
                  <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as RoomStatus }))}>
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="occupied">Occupied</option>
                  </select>
                </label>
                <div className="dash-room-photo-editor">
                  <img src={photo.src} alt={photo.alt} />
                  <div>
                    <strong>Room photo</strong>
                    <small>JPG, PNG, or WebP · up to 5 MB</small>
                    <div className="dash-room-photo-actions">
                      <label className="dash-secondary-button">
                        <ImagePlus size={14} /> Choose image
                        <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { setImage(event.target.files?.[0] ?? null); setRemoveImage(false); event.currentTarget.value = ""; }} />
                      </label>
                      {(image || form.image_path) && <button type="button" className="dash-secondary-button" onClick={() => { setImage(null); setRemoveImage(true); setForm((current) => ({ ...current, image_path: null })); }}>Remove photo</button>}
                    </div>
                  </div>
                </div>
              </div>
              <footer className="dash-farmer-modal-footer">
                <button className="dash-secondary-button" disabled={busy} onClick={closeRoomModal} type="button">Cancel</button>
                <button type="submit" className="dash-primary-button" disabled={busy || isLoading || !farms.length}>
                  {editingId ? "Save room changes" : "Add room"}
                </button>
              </footer>
            </form>
          </section>
        </div>,
        document.body,
      )}

      {notice && <p className="dash-form-success" role="status">{notice}</p>}

      <section className="dash-panel">
        <div className="dash-filter-row">
          <div className="dash-filter-buttons" aria-label="Filter rooms">
            {(["all", "available", "reserved", "occupied"] as const).map((value) => (
              <button type="button" className={filter === value ? "active" : ""} onClick={() => setFilter(value)} key={value}>
                {value === "all" ? "All rooms" : value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
          <label className="dash-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search rooms" aria-label="Search rooms" /></label>
        </div>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead><tr><th>ROOM</th><th>FARM</th><th>CAPACITY</th><th>MONTHLY PRICE</th><th>AVAILABILITY</th><th>ACTIONS</th></tr></thead>
            <tbody>{filteredRooms.map((room) => {
              const farm = farms.find((item) => item.id === room.farm_id);
              return (
                <tr key={room.id}>
                  <td className="dash-room-cell">
                    <img src={getRoomPhoto(room.room_number, room.image_path).src} alt="" />
                    <span><strong>Room {String(room.room_number).padStart(2, "0")}</strong><small>#{room.id}</small></span>
                  </td>
                  <td>{farm?.name ?? "Farm"}<small>{farm?.location ?? "—"}</small></td>
                  <td>{room.capacity} pigs</td>
                  <td>{formatGHS(room.monthly_price)}</td>
                  <td><span className={`dash-badge ${room.status === "available" ? "green" : room.status === "reserved" ? "amber" : ""}`}>{room.status}</span></td>
                  <td><div className="dash-room-row-actions">
                    <button type="button" className="dash-secondary-button" onClick={() => beginEdit(room)} disabled={busy} aria-label={`Edit room ${room.room_number}`}><Pencil size={14} /> Edit</button>
                    <button type="button" className="dash-room-delete-button" onClick={() => void handleDelete(room)} disabled={busy} aria-label={`Delete room ${room.room_number}`}><Trash2 size={14} /> Delete</button>
                  </div></td>
                </tr>
              );
            })}</tbody>
          </table>
          {!filteredRooms.length && <div className="dash-table-empty">{isLoading ? "Loading rooms…" : "No rooms match those filters."}</div>}
        </div>
      </section>
    </div>
  );
}
