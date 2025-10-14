Mobile Overlay

This folder is reserved for mobile-only UI/logic that wraps or overrides parts of the web app when running inside a native Capacitor container. The web build is not affected.

Pattern options

- Conditional rendering: import helpers from `src/platform.ts` and gate features with `isMobileApp()`.
- Module alias (advanced): create mobile-specific components and map them via Vite aliases when building the native app.

Current usage

- Backend URL and Backend API Key settings are shown only on mobile (`isMobileApp()`), and values are read from local storage only on mobile. Web keeps using env/origin.
