import { ReactNode } from "react";

/**
 * Android/Capacitor entry wrapper. Web builds use main.tsx and never mount this.
 */
export const MobileShell = ({ children }: { children: ReactNode }) => children;
