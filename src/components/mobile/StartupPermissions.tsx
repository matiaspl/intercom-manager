import { useCallback, useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { isMobileApp } from "../../platform";
import { OverlayBubble } from "../../mobile-overlay/bubble";
import { CallService } from "../../mobile-overlay/call-service";

type Step = "idle" | "overlay" | "notifications" | "done";

const Bar = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "0.8rem",
      padding: "0.6rem 1rem",
      background: "#2a2f34",
      color: "#fff",
      fontSize: "1.4rem",
      borderBottom: "1px solid #3a3f45",
      flexWrap: "wrap",
      justifyContent: "center",
      zIndex: 10,
    }}
  >
    {children}
  </div>
);

const Button = ({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void | Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{
      background: "#3d84ff",
      color: "#fff",
      border: 0,
      borderRadius: 6,
      padding: "0.4rem 0.8rem",
      fontSize: "1.3rem",
      cursor: disabled ? "not-allowed" : "pointer",
    }}
  >
    {children}
  </button>
);

export const StartupPermissions = () => {
  const [step, setStep] = useState<Step>("idle");
  const [busy, setBusy] = useState(false);

  const isAndroid = useMemo(() => Capacitor.getPlatform?.() === "android", []);

  const evaluate = useCallback(async () => {
    if (!isMobileApp()) {
      setStep("done");
      return;
    }
    try {
      const overlay = await OverlayBubble.canDrawOverlays();
      if (!overlay?.granted) {
        setStep("overlay");
        return;
      }
    } catch {
      // If probe fails, still attempt to request notifications next
    }
    setStep("notifications");
  }, []);

  useEffect(() => {
    if (!isMobileApp()) return;
    evaluate();
  }, [evaluate]);

  // Re-check overlay after user returns from settings
  useEffect(() => {
    if (!isMobileApp()) return;
    const onVis = async () => {
      if (document.hidden) return;
      if (step !== "overlay") return;
      try {
        const r = await OverlayBubble.canDrawOverlays();
        if (r?.granted) setStep("notifications");
      } catch {}
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [step]);

  if (!isMobileApp() || step === "idle" || step === "done") return null;

  if (step === "overlay") {
    return (
      <Bar>
        <span>
          To enable floating controls, allow &quot;Display over other
          apps&quot;.
        </span>
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await OverlayBubble.openOverlayPermission();
            } catch {}
            setBusy(false);
          }}
        >
          Open settings
        </Button>
      </Bar>
    );
  }

  // Notifications: Android 13+ shows a prompt; prior versions are no-op
  if (step === "notifications" && isAndroid) {
    return (
      <Bar>
        <span>Allow notifications for background services.</span>
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              // Request via both plugins for coverage
              await Promise.allSettled([
                CallService.requestNotificationPermission(),
                OverlayBubble.requestNotificationPermission?.(),
              ]);
            } catch {}
            setBusy(false);
            setStep("done");
          }}
        >
          Allow notifications
        </Button>
      </Bar>
    );
  }

  return null;
};
