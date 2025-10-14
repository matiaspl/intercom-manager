import { Capacitor } from "@capacitor/core";

export const isMobileApp = (): boolean => {
  try {
    const plat = Capacitor.getPlatform?.() || "web";
    return plat === "android" || plat === "ios";
  } catch (_) {
    return false;
  }
};
