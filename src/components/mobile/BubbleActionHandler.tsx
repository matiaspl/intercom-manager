import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { useGlobalState } from "../../global-state/context-provider";
import { OverlayBubble } from "../../mobile-overlay/bubble";
import {
  getCallHandlers,
  getCallState,
} from "../../mobile-overlay/action-handlers";
import { isMobileApp } from "../../platform";

export const BubbleActionHandler = () => {
  const [state, dispatch] = useGlobalState();

  const syncOverlayState = useRef<() => Promise<void>>();
  syncOverlayState.current = async () => {
    try {
      if (!Capacitor.isPluginAvailable("OverlayBubble")) return;
      const running = await OverlayBubble.isRunning();
      if (!running?.running) return;
      const calls = state.calls || {};
      const ids = Object.keys(calls);
      const latch = ids.map((id) => {
        const s = getCallState(id);
        if (s) return !s.isInputMuted;
        const ms: MediaStream | null =
          (calls as any)[id]?.mediaStreamInput || null;
        return !!(ms && ms.getAudioTracks().some((t) => t.enabled));
      });
      const listen = ids.map((id) => {
        const s = getCallState(id);
        if (s) return !s.isOutputMuted;
        const els: HTMLAudioElement[] | null =
          (calls as any)[id]?.audioElements || null;
        if (!els || els.length === 0) return true;
        return els.some((el) => !el.muted);
      });
      const micAllowed = ids.map((id) => {
        const jp = (calls as any)[id]?.joinProductionOptions || {};
        const isPgm = !!jp?.lineUsedForProgramOutput;
        const isProgramUser = !!jp?.isProgramUser;
        return !(isPgm && !isProgramUser);
      });
      await OverlayBubble.setCallRows({
        count: ids.length,
        latch,
        listen,
        micAllowed,
      });
    } catch (_) {}
  };

  useEffect(() => {
    if (!isMobileApp()) return;

    if (!Capacitor.isPluginAvailable("OverlayBubble")) return;
    const subPromise = OverlayBubble.addListener("bubbleAction", async (e) => {
      const action = e?.action as string | undefined;
      const index = (e as any)?.index as number | undefined;
      if (!action) return;

      if (action === "listen") {
        const calls = state.calls || {};
        const ids = Object.keys(calls);
        const targetId =
          typeof index === "number" && index >= 0 && index < ids.length
            ? ids[index]
            : undefined;
        if (targetId) {
          getCallHandlers(targetId)?.toggle_output_mute?.();
        } else {
          ids.forEach((id) => getCallHandlers(id)?.toggle_output_mute?.());
        }
        await (syncOverlayState.current?.() || Promise.resolve());
        return;
      }

      if (action === "talk_latch") {
        const calls = state.calls || {};
        const ids = Object.keys(calls);
        const targetId =
          typeof index === "number" && index >= 0 && index < ids.length
            ? ids[index]
            : undefined;
        if (targetId) {
          getCallHandlers(targetId)?.toggle_input_mute?.();
        } else {
          ids.forEach((id) => getCallHandlers(id)?.toggle_input_mute?.());
        }
        await (syncOverlayState.current?.() || Promise.resolve());
        return;
      }

      if (action === "ptt_down" || action === "ptt_up") {
        const calls = state.calls || {};
        const ids = Object.keys(calls);
        const targetId =
          typeof index === "number" && index >= 0 && index < ids.length
            ? ids[index]
            : undefined;
        const press = action === "ptt_down";
        const invoke = (id: string) => {
          const h = getCallHandlers(id);
          if (!h) return;
          if (press) h.push_to_talk_start?.();
          else h.push_to_talk_stop?.();
        };
        if (targetId) invoke(targetId);
        else ids.forEach(invoke);
        // Do NOT sync overlay state for PTT – local UI only (button background)
      }
    });

    let sub: { remove: () => void } | null = null;
    subPromise.then((h) => {
      sub = h;
    });
    return () => {
      if (sub && typeof sub.remove === "function") sub.remove();
    };
  }, [state.calls, dispatch]);

  useEffect(() => {
    if (!isMobileApp()) return;
    const onVis = async () => {
      try {
        if (!Capacitor.isPluginAvailable("OverlayBubble")) return;
        const granted = await OverlayBubble.canDrawOverlays();
        const hasCalls = Object.keys(state.calls || {}).length > 0;
        if (document.hidden && hasCalls) {
          if (!granted.granted) {
            await OverlayBubble.openOverlayPermission();
          } else {
            await OverlayBubble.show();
            try {
              const calls = state.calls || {};
              const ids = Object.keys(calls);
              const latch = ids.map((id) => {
                const ms: MediaStream | null =
                  (calls as any)[id]?.mediaStreamInput || null;
                return !!(ms && ms.getAudioTracks().some((t) => t.enabled));
              });
              const listen = ids.map((id) => {
                const els: HTMLAudioElement[] | null =
                  (calls as any)[id]?.audioElements || null;
                if (!els || els.length === 0) return true;
                return els.some((el) => !el.muted);
              });
              const micAllowed = ids.map((id) => {
                const jp = (calls as any)[id]?.joinProductionOptions || {};
                const isPgm = !!jp?.lineUsedForProgramOutput;
                const isProgramUser = !!jp?.isProgramUser;
                return !(isPgm && !isProgramUser);
              });
              await OverlayBubble.setCallRows({
                count: ids.length,
                latch,
                listen,
                micAllowed,
              });
            } catch (_) {}
          }
        } else {
          await OverlayBubble.hide();
        }
      } catch (_) {}
    };
    document.addEventListener("visibilitychange", onVis);
    // Run at mount and whenever calls change
    onVis();
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [state.calls]);

  // No periodic PTT sync; overlay updates on visibility change and explicit latch/listen actions only.

  return null;
};
