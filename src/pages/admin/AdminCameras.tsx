import { AlertCircle, Camera, ShieldCheck } from "lucide-react";
import VideoPlayer from "@/components/cctv/VideoPlayer";
import { useDemoWorkflows } from "@/features/demo/DemoWorkflowProvider";

export default function AdminCameras() {
  const { cameras, farms, rooms } = useDemoWorkflows();
  const onlineCount = cameras.filter((camera) => camera.status === "online").length;
  const offlineCount = cameras.length - onlineCount;

  return (
    <div>
      <header className="dash-page-head">
        <div>
          <span className="dash-page-eyebrow">LIVE FARM MONITORING</span>
          <h1>All cameras</h1>
          <p>Camera assignments and connection status across your farms.</p>
        </div>
        <span className="dash-badge green"><ShieldCheck size={13} /> ADMIN ACCESS</span>
      </header>

      <section className="dash-stats dash-stats-3" aria-label="Camera status summary">
        <article className="dash-stat-card"><div className="dash-stat-top">Registered cameras<span className="dash-stat-icon"><Camera size={17} /></span></div><strong>{cameras.length}</strong><small>Assigned to farm rooms</small></article>
        <article className="dash-stat-card"><div className="dash-stat-top">Online<span className="dash-stat-icon"><Camera size={17} /></span></div><strong>{onlineCount}</strong><small>Showing online in sample data</small></article>
        <article className="dash-stat-card"><div className="dash-stat-top">Offline<span className="dash-stat-icon"><AlertCircle size={17} /></span></div><strong>{offlineCount}</strong><small>Need attention if this were live</small></article>
      </section>

      <div className="dash-notice" style={{ marginBottom: 18 }}>
        <AlertCircle size={16} />
        <span>Video streaming has not been configured. These are safe preview placeholders; camera source addresses and credentials are not exposed.</span>
      </div>

      <section className="dash-camera-grid" aria-label="Farm camera tiles">
        {cameras.map((camera) => {
          const room = rooms.find((item) => item.id === camera.room_id);
          const farm = farms.find((item) => item.id === room?.farm_id);
          return (
            <article className="dash-camera-card" key={camera.id}>
              <header className="dash-camera-card-head">
                <div><strong>Room {String(room?.room_number).padStart(2, "0")}</strong><span>{farm?.name ?? "Farm"} · {camera.name}</span></div>
                <span className={`dash-badge ${camera.status === "online" ? "green" : "red"}`}>{camera.status === "online" ? "Online" : "Offline"}</span>
              </header>
              <div className="dash-video-placeholder">
                <VideoPlayer cameraId={camera.id} />
                <div className="dash-video-label"><span>CAM {String(room?.room_number).padStart(2, "0")}</span><span>{camera.status.toUpperCase()}</span></div>
              </div>
              <div className="dash-panel-body" style={{ color: "#899387", fontSize: 10 }}>
                Capacity: {room?.capacity ?? "—"} pigs · {room?.status ?? "Room status unavailable"}
              </div>
            </article>
          );
        })}
      </section>
      <p className="dash-demo-note">Stream provisioning and health checks are not yet connected.</p>
    </div>
  );
}
