import styled from "@emotion/styled";
import { useEffect, useMemo, useState } from "react";
import { isMobileApp } from "../../platform";
import { useGlobalState } from "../../global-state/context-provider";

type Status = "connected" | "connecting" | "disconnected" | "unknown";

const Wrapper = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.8rem;
  border-radius: 0.6rem;
  background: rgba(255, 255, 255, 0.06);
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.85);
`;

const Dot = styled.span<{ status: Status }>`
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  display: inline-block;
  background: ${({ status }) =>
    status === "connected"
      ? "#36c28a"
      : status === "connecting"
        ? "#ffcc00"
        : status === "disconnected"
          ? "#f04438"
          : "#9aa3ab"};
`;

const Label = styled.span`
  opacity: 0.9;
`;

const Value = styled.span`
  font-weight: 600;
  opacity: 0.95;
`;

export const CompanionStatus = () => {
  const mobile = isMobileApp();
  const [{ websocket }] = useGlobalState();
  const [status, setStatus] = useState<Status>("unknown");
  const [host, setHost] = useState<string>("");

  // Derive host from active socket or from saved settings
  const savedHostPort = useMemo(() => {
    try {
      return window.localStorage.getItem("companionWsHostPort") || "";
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    if (!mobile) return;

    const updateFromSocket = (ws: WebSocket | null) => {
      if (!ws) {
        setStatus(savedHostPort ? "disconnected" : "unknown");
        setHost(savedHostPort || "");
        return;
      }
      try {
        const u = new URL(ws.url);
        setHost(u.host);
      } catch {
        setHost(savedHostPort || "");
      }

      switch (ws.readyState) {
        case WebSocket.CONNECTING:
          setStatus("connecting");
          break;
        case WebSocket.OPEN:
          setStatus("connected");
          break;
        case WebSocket.CLOSING:
        case WebSocket.CLOSED:
          setStatus("disconnected");
          break;
        default:
          setStatus("unknown");
      }
    };

    updateFromSocket(websocket);

    if (!websocket) return;

    const onOpen = () => setStatus("connected");
    const onClose = () => setStatus("disconnected");
    const onError = () => setStatus("disconnected");
    websocket.addEventListener("open", onOpen);
    websocket.addEventListener("close", onClose);
    websocket.addEventListener("error", onError);
    return () => {
      websocket.removeEventListener("open", onOpen);
      websocket.removeEventListener("close", onClose);
      websocket.removeEventListener("error", onError);
    };
  }, [mobile, websocket, savedHostPort]);

  if (!mobile) return null;

  return (
    <Wrapper aria-label="Companion connectivity status">
      <Dot status={status} />
      <Label>Companion:</Label>
      <Value>{host || "n/a"}</Value>
      <Label>•</Label>
      <Value>
        {status === "connected"
          ? "Online"
          : status === "connecting"
            ? "Connecting"
            : status === "disconnected"
              ? "Offline"
              : "Unknown"}
      </Value>
    </Wrapper>
  );
};
