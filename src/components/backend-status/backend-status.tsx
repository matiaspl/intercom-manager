import styled from "@emotion/styled";
import { useEffect, useRef, useState } from "react";
import { getApiBaseUrl, getApiKey, getBackendUrl } from "../../config";
import { isMobileApp } from "../../platform";
import { httpRequest } from "../../http";

type Status = "online" | "unauthorized" | "offline" | "unknown";

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
    status === "online"
      ? "#36c28a"
      : status === "unauthorized"
        ? "#ffcc00"
        : status === "offline"
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

export const BackendStatus = () => {
  const [status, setStatus] = useState<Status>("unknown");
  const [host, setHost] = useState<string>("");
  const mobile = isMobileApp();
  const lastEventTsRef = useRef<number>(0);

  // host will be refreshed inside the connectivity check as well

  useEffect(() => {
    if (!mobile) return; // only run in mobile app

    const onResponse = (e: Event) => {
      const ev = e as CustomEvent<{ url: string; status: number; ts: number }>;
      lastEventTsRef.current = ev.detail?.ts || Date.now();
      const s = ev.detail?.status;
      if (s === 401 || s === 403) setStatus("unauthorized");
      else if (s >= 200 && s <= 399) setStatus("online");
      else setStatus("offline");
      const currentBackend = getBackendUrl();
      try {
        const u = new URL(currentBackend);
        setHost(u.host);
      } catch {
        setHost(currentBackend);
      }
    };

    const onError = () => {
      lastEventTsRef.current = Date.now();
      setStatus("offline");
    };

    window.addEventListener("backend:response", onResponse as EventListener);
    window.addEventListener("backend:error", onError as EventListener);

    let cancelled = false;
    const ping = async () => {
      const now = Date.now();
      // Only ping if no traffic in the last 20 seconds or status unknown/offline
      if (now - lastEventTsRef.current < 20000 && status === "online") return;
      const url = `${getApiBaseUrl()}productionlist?limit=1`;
      const key = getApiKey();
      try {
        const res = await httpRequest(url, {
          method: "GET",
          headers: key ? { Authorization: `Bearer ${key}` } : undefined,
        });
        if (cancelled) return;
        const s = (res as any).status;
        if (s === 401 || s === 403) setStatus("unauthorized");
        else if (s >= 200 && s <= 399) setStatus("online");
        else setStatus("offline");
      } catch (_) {
        if (!cancelled) setStatus("offline");
      }
    };

    // initial ping
    ping();
    const id = setInterval(ping, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener(
        "backend:response",
        onResponse as EventListener
      );
      window.removeEventListener("backend:error", onError as EventListener);
    };
  }, [mobile, status]);

  if (!mobile) return null;

  return (
    <Wrapper aria-label="Backend connectivity status">
      <Dot status={status} />
      <Label>Backend:</Label>
      <Value>{host || "n/a"}</Value>
      <Label>•</Label>
      <Value>
        {status === "online"
          ? "Online"
          : status === "unauthorized"
            ? "Unauthorized"
            : status === "offline"
              ? "Offline"
              : "Unknown"}
      </Value>
    </Wrapper>
  );
};
