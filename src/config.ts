/* Centralized runtime configuration helpers */
import { isMobileApp } from "./platform";

// Attempts to decode JSON-wrapped strings and strip extraneous quotes/whitespace
const normalizeStoredString = (raw: string | null): string | null => {
  if (!raw) return null;
  let s = raw.trim();
  // Remove percent-encoded quotes at the ends: %22...%22
  if (s.startsWith("%22") && s.endsWith("%22")) {
    s = s.substring(3, s.length - 3);
  }
  // Remove escaped quotes at the ends: \"...\"
  if (
    (s.startsWith('\\"') && s.endsWith('\\"')) ||
    (s.startsWith("\\'") && s.endsWith("\\'"))
  ) {
    s = s.substring(2, s.length - 2);
  }
  try {
    // If the storage layer JSON-encoded the string (e.g. "https://..."), parse it
    if (
      (s.startsWith('"') && s.endsWith('"')) ||
      (s.startsWith("'") && s.endsWith("'"))
    ) {
      // JSON.parse handles double quotes; single quotes fall back below
      if (s.startsWith('"')) {
        return JSON.parse(s);
      }
    }
  } catch (_) {
    // ignore and continue to fallback
  }
  // Fallback: strip surrounding single/double quotes if present
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.substring(1, s.length - 1);
  }
  return s;
};

const getStoredBackendUrl = (): string | null => {
  if (!isMobileApp()) return null;
  if (typeof window === "undefined") return null;
  try {
    const candidates = [
      "backendUrl",
      "id.backendUrl",
      "id_backendUrl",
      "id:backendUrl",
    ];
    for (const key of candidates) {
      const v = window.localStorage.getItem(key);
      const n = normalizeStoredString(v);
      if (n) return n;
    }
    // Fallback: some storage libs keep a single JSON under the prefix
    const compound = window.localStorage.getItem("id");
    if (compound) {
      try {
        const obj = JSON.parse(compound);
        const n = normalizeStoredString(obj?.backendUrl ?? null);
        if (n) return n;
      } catch (_) {
        // ignore
      }
    }
  } catch (_) {
    // ignore storage access errors
  }
  return null;
};

export const getBackendUrl = (): string => {
  // Prefer user-configured value, then env, then window origin
  const rawEnvUrl = (import.meta as any)?.env?.VITE_BACKEND_URL as
    | string
    | undefined;
  const envUrl = rawEnvUrl
    ? (normalizeStoredString(rawEnvUrl) ?? rawEnvUrl)
    : undefined;
  const fromStorage = getStoredBackendUrl();
  const fallback = typeof window !== "undefined" ? window.location.origin : "";
  return (fromStorage || envUrl || fallback) as string;
};

export const getApiBaseUrl = (): string => {
  const apiVersion =
    ((import.meta as any)?.env?.VITE_BACKEND_API_VERSION as
      | string
      | undefined) ?? "api/v1/";
  const base = (getBackendUrl() || "").toString().replace(/\/+$/, "");
  return `${base}/${apiVersion}`;
};

const getStoredApiKey = (): string | null => {
  if (!isMobileApp()) return null;
  if (typeof window === "undefined") return null;
  try {
    const candidates = [
      "backendApiKey",
      "id.backendApiKey",
      "id_backendApiKey",
      "id:backendApiKey",
    ];
    for (const key of candidates) {
      const v = window.localStorage.getItem(key);
      const n = normalizeStoredString(v);
      if (n) return n;
    }
    const compound = window.localStorage.getItem("id");
    if (compound) {
      try {
        const obj = JSON.parse(compound);
        const n = normalizeStoredString(obj?.backendApiKey ?? null);
        if (n) return n;
      } catch (_) {
        // ignore
      }
    }
  } catch (_) {
    // ignore
  }
  return null;
};

export const getApiKey = (): string | undefined => {
  const rawEnvKey = (import.meta as any)?.env?.VITE_BACKEND_API_KEY as
    | string
    | undefined;
  const envKey = rawEnvKey
    ? (normalizeStoredString(rawEnvKey) ?? rawEnvKey)
    : undefined;
  const fromStorage = getStoredApiKey() || undefined;
  return fromStorage || envKey || undefined;
};
