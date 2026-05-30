import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/error-boundary.tsx";
import { MobileShell } from "./components/mobile/MobileShell.tsx";
import { bootstrapMobile } from "./mobile-overlay/bootstrap.ts";
import "./index.css";

bootstrapMobile();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <MobileShell>
        <App />
      </MobileShell>
    </ErrorBoundary>
  </React.StrictMode>
);
