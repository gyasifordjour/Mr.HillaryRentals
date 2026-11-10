import { useEffect, useRef, useState } from "react";
import { Camera, Maximize2, Minimize2, RotateCw } from "lucide-react";

export default function VideoPlayer({ cameraId }: { cameraId: string }) {
  const playerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [usesFallback, setUsesFallback] = useState(false);

  useEffect(() => {
    const syncFullscreen = () => {
      const active = document.fullscreenElement === playerRef.current;
      setIsFullscreen(active || usesFallback);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && usesFallback) {
        setUsesFallback(false);
        setIsFullscreen(false);
      }
    };

    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [usesFallback]);

  const enterFullscreen = async () => {
    const player = playerRef.current;
    if (!player) return;

    setUsesFallback(false);
    try {
      if (!player.requestFullscreen) throw new Error("Fullscreen API is unavailable.");
      await player.requestFullscreen();
      setIsFullscreen(true);
    } catch {
      setUsesFallback(true);
      setIsFullscreen(true);
    }
  };

  const exitFullscreen = async () => {
    setUsesFallback(false);
    setIsFullscreen(false);
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  };

  return (
    <div
      className={`camera-player${usesFallback ? " camera-player-expanded" : ""}`}
      ref={playerRef}
    >
      <button
        className="camera-player-open"
        type="button"
        onClick={enterFullscreen}
        aria-label={`Open camera ${cameraId} fullscreen`}
      >
        <span className="camera-player-message">
          <span className="camera-player-icon"><Camera size={19} /></span>
          <strong>Camera {cameraId}</strong>
          <span>Live stream not connected</span>
          <span className="camera-player-expand"><Maximize2 size={13} /> Tap to expand</span>
        </span>
      </button>
      {isFullscreen && (
        <>
          <div className="camera-player-fullscreen-status">
            <Camera size={15} /> Camera {cameraId} <span>LIVE VIEW</span>
          </div>
          <div className="camera-player-rotate-hint">
            <RotateCw size={22} />
            <span>Rotate your device to landscape for a wider view.</span>
          </div>
          <button
            className="camera-player-close"
            type="button"
            onClick={() => void exitFullscreen()}
            aria-label="Exit fullscreen camera"
          >
            <Minimize2 size={20} />
          </button>
        </>
      )}
    </div>
  );
}
