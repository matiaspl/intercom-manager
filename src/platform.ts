import { Capacitor } from "@capacitor/core";

/** True only in the Capacitor Android APK (not web, not iOS). */
export const isAndroidApp = (): boolean => {
  try {
    return Capacitor.getPlatform?.() === "android";
  } catch (_) {
    return false;
  }
};

/** Native Capacitor shell; currently Android-only in this repo. */
export const isMobileApp = (): boolean => isAndroidApp();
