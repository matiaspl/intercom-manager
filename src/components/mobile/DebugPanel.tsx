import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { OverlayBubble } from "../../mobile-overlay/bubble";
import { CallService } from "../../mobile-overlay/call-service";

type Status = {
  platform: string;
  overlayPlugin: boolean;
  callServicePlugin: boolean;
  overlayGranted?: boolean | null;
  overlayRunning?: boolean | null;
  callServiceRunning?: boolean | null;
  error?: string | null;
};

export const DebugPanel = () => {
  const [status, setStatus] = useState<Status>({
    platform: "web",
    overlayPlugin: false,
    callServicePlugin: false,
  });
  const [busy, setBusy] = useState(false);
  // AudioRoute temporarily disabled

  const refresh = useCallback(async () => {
    setBusy(true);
    const next: Status = {
      platform: Capacitor.getPlatform?.() || "web",
      overlayPlugin: Capacitor.isPluginAvailable("OverlayBubble"),
      callServicePlugin: Capacitor.isPluginAvailable("CallService"),
      error: null,
    } as Status;
    // AudioRoute disabled: do not touch saved route
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
    // AudioRoute disabled: skip route probing
    setStatus(next);
    setBusy(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // AudioRoute disabled: no listeners

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
        CallService={String(status.callServicePlugin)}
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
      {/* AudioRoute disabled */}
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
        {/* AudioRoute disabled: no Apply Saved Route */}
      </div>

      {/* AudioRoute disabled: controls removed */}

      {/* Test tone moved to Settings page (below device selection) */}
    </div>
  );
};
