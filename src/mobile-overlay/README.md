Mobile Overlay

Mobile-only UI and native Capacitor bridges. The default web build (`src/main.tsx`) does not import this tree except via dynamic `import()` from guarded hooks.

## Layout

- `src/mobile-overlay/` — Capacitor plugins, action-handler registry, production-line bridge
- `src/components/mobile/` — React providers, settings page, shell helpers
- `android/` — Gradle project and Java plugins
- `src/main.android.tsx` + `vite.config.android.ts` — Android bundle entry (`yarn build:android`)

## Upstream extension hooks (web no-op)

- `src/components/mobile/mobile-extensions.tsx` — `<MobileProviders />`, `<MobileRoutes />` in `App.tsx`
- `src/components/production-line/production-line.tsx` — dynamic import of `production-line-bridge.ts`
- `src/config.ts`, `src/http.ts`, `src/api/api.ts` — runtime backend URL on mobile; web uses env vars

## Eyevinn PR stack

1. `android/`, Capacitor, docs, CI, CPU scripts
2. `platform` + `http`/`config` + API shim (web-neutral)
3. `mobile-overlay/` + `components/mobile/` + Android Vite entry
4. `App.tsx` + `production-line` extension hooks (~15 lines total)
