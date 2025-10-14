import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { OverlayBubble } from "../../mobile-overlay/bubble";
import { CallService } from "../../mobile-overlay/call-service";
import { AudioRoute } from "../../mobile-overlay/audio-route";

type Status = {
  platform: string;
  overlayPlugin: boolean;
  callServicePlugin: boolean;
  audioRoutePlugin: boolean;
  overlayGranted?: boolean | null;
  overlayRunning?: boolean | null;
  callServiceRunning?: boolean | null;
  savedRoute?: string | null;
  activeRoute?: string | null;
  error?: string | null;
};

export const DebugPanel = () => {
  const [status, setStatus] = useState<Status>({
    platform: "web",
    overlayPlugin: false,
    callServicePlugin: false,
    audioRoutePlugin: false,
  });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    const next: Status = {
      platform: Capacitor.getPlatform?.() || "web",
      overlayPlugin: Capacitor.isPluginAvailable("OverlayBubble"),
      callServicePlugin: Capacitor.isPluginAvailable("CallService"),
      audioRoutePlugin: Capacitor.isPluginAvailable("AudioRoute"),
      error: null,
    } as Status;
    try {
      next.savedRoute = window.localStorage.getItem("mobileAudioRoute");
    } catch (_) {}
    try {
      if (next.overlayPlugin) {
        const p = await OverlayBubble.canDrawOverlays();
        next.overlayGranted = !!p?.granted;
        const r = await OverlayBubble.isRunning();
        next.overlayRunning = !!r?.running;
      } else {
        next.overlayGranted = null;
        next.overlayRunning = null;
      }
    } catch (e: any) {
      next.error = String(e?.message || e);
    }
    try {
      if (next.callServicePlugin) {
        const r = await CallService.isRunning();
        next.callServiceRunning = !!r?.running;
      } else {
        next.callServiceRunning = null;
      }
    } catch (e: any) {
      next.error = String(e?.message || e);
    }
    try {
      if (next.audioRoutePlugin) {
        const routes = await AudioRoute.getAvailableRoutes();
        next.activeRoute = (routes?.active as any) || null;
      } else {
        next.activeRoute = null;
      }
    } catch (e: any) {
      next.error = String(e?.message || e);
    }
    setStatus(next);
    setBusy(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div
      style={{
        border: "1px solid #444",
        borderRadius: 8,
        padding: 12,
        background: "#2a2f34",
        fontSize: "1.4rem",
        display: "grid",
        gap: 8,
      }}
    >
      <div>
        <strong>Platform:</strong> {status.platform}
      </div>
      <div>
        <strong>Plugins:</strong> OverlayBubble={String(status.overlayPlugin)} •
        CallService={String(status.callServicePlugin)} • AudioRoute=
        {String(status.audioRoutePlugin)}
      </div>
      <div>
        <strong>Overlay:</strong> permission=
        {status.overlayGranted === null
          ? "unknown"
          : String(status.overlayGranted)}{" "}
        • service=
        {status.overlayRunning === null
          ? "unknown"
          : String(status.overlayRunning)}
      </div>
      <div>
        <strong>CallService:</strong> running=
        {status.callServiceRunning === null
          ? "unknown"
          : String(status.callServiceRunning)}
      </div>
      <div>
        <strong>AudioRoute:</strong> saved={status.savedRoute || "-"} • active=
        {status.activeRoute || "-"}
      </div>
      {status.error && (
        <div style={{ color: "#f88" }}>
          <strong>Error:</strong> {status.error}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" disabled={busy} onClick={refresh}>
          Refresh
        </button>
        <button
          type="button"
          disabled={busy || !status.overlayPlugin}
          onClick={async () => {
            try {
              await OverlayBubble.openOverlayPermission();
            } catch (e) {}
          }}
        >
          Open Overlay Settings
        </button>
        <button
          type="button"
          disabled={busy || !status.overlayPlugin}
          onClick={async () => {
            try {
              await OverlayBubble.show();
            } catch (e) {}
          }}
        >
          Show Bubble
        </button>
        <button
          type="button"
          disabled={busy || !status.overlayPlugin}
          onClick={async () => {
            try {
              await OverlayBubble.hide();
            } catch (e) {}
          }}
        >
          Hide Bubble
        </button>
        <button
          type="button"
          disabled={busy || !status.callServicePlugin}
          onClick={async () => {
            try {
              await CallService.requestNotificationPermission();
            } catch (e) {}
          }}
        >
          Grant Notification
        </button>
        <button
          type="button"
          disabled={busy || !status.callServicePlugin}
          onClick={async () => {
            try {
              await CallService.start();
            } catch (e) {}
          }}
        >
          Start Call Service
        </button>
        <button
          type="button"
          disabled={busy || !status.callServicePlugin}
          onClick={async () => {
            try {
              await CallService.stop();
            } catch (e) {}
          }}
        >
          Stop Call Service
        </button>
        <button
          type="button"
          disabled={busy || !status.audioRoutePlugin}
          onClick={async () => {
            try {
              const saved = window.localStorage.getItem("mobileAudioRoute");
              if (saved) await AudioRoute.setRoute({ route: saved as any });
            } catch (e) {}
          }}
        >
          Apply Saved Route
        </button>
      </div>
    </div>
  );
};
