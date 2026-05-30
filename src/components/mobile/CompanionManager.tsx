import { useEffect, useRef, useState } from "react";
import { isMobileApp } from "../../platform";
import { useGlobalState } from "../../global-state/context-provider";
import { useWebSocket } from "../../hooks/use-websocket";
import { useWebsocketReconnect } from "../../hooks/use-websocket-reconnect";
import { getCallHandlers } from "../../mobile-overlay/action-handlers";

export const CompanionManager = () => {
  const [isWSReconnecting, setIsWSReconnecting] = useState(false);
  const [isConnectionConflict, setConnectionConflict] = useState(false);
  const everConnectedRef = useRef(false);
  const [{ calls }, dispatch] = useGlobalState();

  // Build index map (1-based) from current calls
  const callIndexMap = useRef<Record<number, string>>({});
  useEffect(() => {
    const map: Record<number, string> = {};
    Object.keys(calls || {}).forEach((callId, i) => {
      map[i + 1] = callId;
    });
    callIndexMap.current = map;
  }, [calls]);

  const { wsConnect, wsDisconnect, isWSConnected } = useWebSocket({
    onAction: (action: any, index?: number) => {
      if (action === "toggle_global_mute") {
        // No-op here; handled in Calls UI when visible
        return;
      }
      if (typeof index !== "number") return;
      const callId = callIndexMap.current[index];
      if (!callId) return;
      const handlers = getCallHandlers(callId);
      const handler = handlers?.[action];
      if (handler) handler();
    },
    dispatch,
    onConnected: () => {
      everConnectedRef.current = true;
      setConnectionConflict(false);
    },
    resetLastSentCallsState: () => {
      // Calls page will send state update when websocket is set/open
    },
    onConflict: () => {
      setConnectionConflict(true);
      setIsWSReconnecting(false);
      // disconnect to stop noisy traffic
      wsDisconnect();
    },
  });

  useWebsocketReconnect({
    calls,
    isMasterInputMuted: false,
    everConnected: everConnectedRef.current,
    isWSReconnecting,
    isWSConnected,
    isConnectionConflict,
    setIsWSReconnecting,
    wsConnect,
  });

  // Auto-connect on app start if saved URL exists and host:port is non-empty
  useEffect(() => {
    try {
      const savedHostPort =
        window.localStorage.getItem("companionWsHostPort") || "";
      const savedUrl = window.localStorage.getItem("companionWsUrl") || "";
      const shouldConnect =
        !!savedUrl &&
        !!savedHostPort &&
        isMobileApp() &&
        !isWSConnected &&
        !isWSReconnecting;
      if (shouldConnect) {
        setConnectionConflict(false);
        wsConnect(savedUrl);
      }
    } catch (_) {
      // ignore
    }
  }, []);

  return null;
};
