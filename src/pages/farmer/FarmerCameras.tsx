import { AlertCircle, Camera, CircleHelp, Maximize2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDemoWorkflows } from "@/features/demo/DemoWorkflowProvider";
import VideoPlayer from "@/components/cctv/VideoPlayer";

export default function FarmerCameras() {
  const { user } = useAuth();
  const { farms, cameras: cameraRecords, rentals, rentalRooms, rooms } = useDemoWorkflows();
  const farmer = user;
  const activeRentals = rentals.filter((rental) => rental.farmer_id === farmer?.id && rental.status === "active");
  const activeRentalIds = new Set(activeRentals.map((rental) => rental.id));
  const roomIds = new Set(rentalRooms.filter((item) => activeRentalIds.has(item.rental_id)).map((item) => item.room_id));
  const rentedRooms = rooms.filter((room) => roomIds.has(room.id));
  const cameras = cameraRecords.filter((camera) => roomIds.has(camera.room_id));

  return (
    <div>
      <header className="dash-page-head">
        <div>
          <span className="dash-page-eyebrow">PRIVATE CAMERA ACCESS</span>
          <h1>My cameras</h1>
          <p>Only cameras assigned to your active rentals are listed here.</p>
        </div>
        <span className="dash-badge green"><ShieldCheck size={13} /> RENTAL-BASED ACCESS</span>
      </header>

      <div className="dash-notice" style={{ marginBottom: 20 }}>
        <AlertCircle size={16} />
        <span>Live streaming is not connected yet. Camera credentials are never exposed in this page; streams will appear after secure MediaMTX access is configured.</span>
      </div>

      {cameras.length ? (
        <section className="dash-camera-grid" aria-label="Cameras for rented rooms">
          {cameras.map((camera) => {
            const room = rentedRooms.find((item) => item.id === camera.room_id);
            const farm = farms.find((item) => item.id === room?.farm_id);
            return (
              <article className="dash-camera-card" key={camera.id}>
                <header className="dash-camera-card-head">
                  <div><strong>Room {String(room?.room_number).padStart(2, "0")}</strong><span>{farm?.name ?? "Farm"} · {camera.name}</span></div>
                  <span className={`dash-badge ${camera.status === "online" ? "green" : "red"}`}>{camera.status === "online" ? "Online" : "Offline"}</span>
                </header>
                <div className="dash-video-placeholder">
                  <VideoPlayer cameraId={camera.id} />
                  <div className="dash-video-label"><span>ROOM {String(room?.room_number).padStart(2, "0")}</span><span><Maximize2 size={12} /> LIVE VIEW</span></div>
                </div>
                <div className="dash-panel-body" style={{ display: "flex", alignItems: "center", gap: 7, color: "#899387", fontSize: 10 }}>
                  <Camera size={14} /> Camera access is limited to your active rental dates.
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="dash-panel">
          <div className="dash-empty">
            <span className="dash-empty-icon"><Camera size={21} /></span>
            <strong>No cameras available</strong>
            <p>Camera access appears here when a room rental is active and a camera has been assigned.</p>
          </div>
        </section>
      )}
      <p className="dash-demo-note"><CircleHelp size={13} /> Listings are sample data. Stream access will be validated by the backend against the rental dates.</p>
    </div>
  );
}
