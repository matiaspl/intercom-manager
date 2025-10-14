import { useEffect } from "react";
import { isMobileApp } from "../../platform";
import { useGlobalState } from "../../global-state/context-provider";
import { CallService } from "../../mobile-overlay/call-service";

export const CallServiceManager = () => {
  const [state] = useGlobalState();

  useEffect(() => {
    if (!isMobileApp()) return;
    (async () => {
      try {
        await CallService.requestNotificationPermission();
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    if (!isMobileApp()) return;
    const calls = Object.keys(state.calls || {}).length;
    (async () => {
      try {
        if (calls > 0) {
          await CallService.start();
        } else {
          await CallService.stop();
        }
      } catch (_) {}
    })();
  }, [state.calls]);

  return null;
};

