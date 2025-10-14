import { registerPlugin } from "@capacitor/core";

export interface CallServicePlugin {
  start(): Promise<{ running: boolean }>;
  stop(): Promise<{ running: boolean }>;
  isRunning(): Promise<{ running: boolean }>;
  requestNotificationPermission(): Promise<void>;
}

export const CallService = registerPlugin<CallServicePlugin>("CallService");
