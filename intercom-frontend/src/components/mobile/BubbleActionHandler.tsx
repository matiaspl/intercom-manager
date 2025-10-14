import { useEffect } from "react";
import { useGlobalState } from "../../global-state/context-provider";
import { OverlayBubble } from "../../mobile-overlay/bubble";
import { AudioRoute } from "../../mobile-overlay/audio-route";
import { isMobileApp } from "../../platform";

export const BubbleActionHandler = () => {
  const [state, dispatch] = useGlobalState();

  useEffect(() => {
    if (!isMobileApp()) return;

    const subPromise = OverlayBubble.addListener("bubbleAction", async (e) => {
      const action = e?.action;
      if (action === "hangup") {
        const ids = Object.keys(state.calls || {});
        ids.forEach((id) =>
          dispatch({ type: "REMOVE_CALL", payload: { id } })
        );
      } else if (action === "speaker") {
        try {
          const routes = await AudioRoute.getAvailableRoutes();
          if (routes?.active === "speaker" && routes.routes.find((r) => r.id === "earpiece" && r.available)) {
            await AudioRoute.setRoute({ route: "earpiece" });
          } else {
            await AudioRoute.setRoute({ route: "speaker" });
          }
        } catch (_) {}
      } else if (action === "mute") {
        try {
          // Simulate global mute hotkey (typically 'p')
          const evt = new KeyboardEvent("keydown", { key: "p" });
          window.dispatchEvent(evt);
        } catch (_) {}
      }
    });

    let sub: { remove: () => void } | null = null;
    subPromise.then((h) => (sub = h));
    return () => {
      if (sub && typeof sub.remove === "function") sub.remove();
    };
  }, [state.calls, dispatch]);

  useEffect(() => {
    if (!isMobileApp()) return;
    const onVis = async () => {
      try {
        const granted = await OverlayBubble.canDrawOverlays();
        if (document.hidden) {
          if (!granted.granted) {
            await OverlayBubble.openOverlayPermission();
          } else {
            await OverlayBubble.show();
          }
        } else {
          await OverlayBubble.hide();
        }
      } catch (_) {}
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return null;
};

