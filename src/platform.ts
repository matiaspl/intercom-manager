export const isMobileApp = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    // Capacitor injects a global when running natively
    // Avoid importing to keep web bundle lean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cap = (window as any).Capacitor;
    return !!cap?.isNativePlatform;
  } catch (_) {
    return false;
  }
};

