import { PluginListenerHandle, registerPlugin } from "@capacitor/core";

export interface OverlayBubblePlugin {
  canDrawOverlays(): Promise<{ granted: boolean }>;
  openOverlayPermission(): Promise<void>;
  show(): Promise<void>;
  hide(): Promise<void>;
  setCallRows(options: { count: number; latch: boolean[]; listen: boolean[]; micAllowed?: boolean[] }): Promise<void>;
  isRunning(): Promise<{ running: boolean }>;
  requestNotificationPermission(): Promise<void>;
  addListener(
    eventName: "bubbleAction",
    listenerFunc: (state: { action: string; index?: number }) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
}

export const OverlayBubble = registerPlugin<OverlayBubblePlugin>(
  "OverlayBubble"
);
