import { useEffect } from "react";
import { isMobileApp } from "../../platform";
import { AudioRoute } from "../../mobile-overlay/audio-route";

export const MobileInit = () => {
  useEffect(() => {
    if (!isMobileApp()) return;
    (async () => {
      try {
        const saved = window.localStorage.getItem("mobileAudioRoute") as any;
        if (!saved) return;
        const routes = await AudioRoute.getAvailableRoutes();
        const target = routes.routes.find((r) => r.id === saved && r.available);
        if (target && routes.active !== target.id) {
          await AudioRoute.setRoute({ route: target.id });
        }
      } catch (_) {}
    })();
  }, []);
  return null;
};
