import { CapacitorHttp } from "@capacitor/core";
import { isMobileApp } from "./platform";

export type ResponseLike = {
  status: number;
  statusText?: string;
  headers: { get: (key: string) => string | null };
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

const toHeadersGet = (
  headers?: Record<string, string>
): ((key: string) => string | null) => {
  const map = headers || {};
  return (key: string) => {
    const k = key.toLowerCase();
    // Try exact, lowercase, and common variants
    return map[key] ?? map[k] ?? null;
  };
};

export const httpRequest = async (
  url: string,
  init?: RequestInit
): Promise<Response | ResponseLike> => {
  // Emit a request event for connectivity tracking
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("backend:request", { detail: { url, ts: Date.now() } })
      );
    }
  } catch (_) {
    // ignore
  }

  if (!isMobileApp()) {
    try {
      const res = await fetch(url, init);
      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("backend:response", {
              detail: { url, status: (res as any).status, ts: Date.now() },
            })
          );
        }
      } catch (_) {}

      return res;
    } catch (err) {
      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("backend:error", {
              detail: { url, ts: Date.now() },
            })
          );
        }
      } catch (_) {}
      throw err;
    }
  }

  const method = (init?.method || "GET").toUpperCase();
  const headers = (init?.headers || {}) as Record<string, string>;
  let data: unknown;
  if (init?.body) {
    try {
      data = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
    } catch (_) {
      // if not JSON, send as text
      data = init.body as unknown;
    }
  }

  try {
    const res = await CapacitorHttp.request({ url, method, headers, data });
    const get = toHeadersGet(res.headers as Record<string, string>);

    const responseLike: ResponseLike = {
      status: res.status,
      statusText: String(res.status),
      headers: { get },
      json: async () => res.data,
      text: async () =>
        typeof res.data === "string" ? res.data : JSON.stringify(res.data),
    };

    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("backend:response", {
            detail: { url, status: res.status, ts: Date.now() },
          })
        );
      }
    } catch (_) {}

    return responseLike;
  } catch (err) {
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("backend:error", { detail: { url, ts: Date.now() } })
        );
      }
    } catch (_) {}
    throw err as any;
  }
};
