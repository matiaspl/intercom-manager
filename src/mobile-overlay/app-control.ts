import { registerPlugin } from "@capacitor/core";

export interface AppControlPlugin {
  stopServices(): Promise<void>;
  exitApp(): Promise<void>;
}

export const AppControl = registerPlugin<AppControlPlugin>("AppControl");

