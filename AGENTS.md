# Repository Guidelines

## Project Structure & Module Organization

- Source lives in `src/`:
  - `components/` (feature folders), `hooks/`, `api/`, `utils/`, `global-state/`, `assets/`, `css-helpers/`, `mobile-overlay/`.
- Static assets in `public/`. Build output in `dist/` (generated).
- Web entry: `src/main.tsx`; app root: `src/App.tsx`. Android project in `android/` (Capacitor).

## Build, Test, and Development Commands

- Install deps: `yarn`
- Run locally: `yarn dev` (Vite dev server)
- Type check: `yarn typecheck`
- Lint: `yarn lint` (Airbnb + TypeScript + a11y). Format: `yarn pretty`
- Build: `yarn build` (TS compile + Vite bundle)
- Preview production build: `yarn preview`
- Test: `yarn test` (Vitest in watch), `yarn test:run` (CI), `yarn test:coverage`
- Android (Capacitor): `yarn android:build`, `yarn android:open`
- Docker: see `README.md` for `docker build`/`docker run` examples.

## Coding Style & Naming Conventions

- TypeScript + React 18, Vite + SWC.
- Formatting via Prettier (2 spaces, LF, trailing commas). ESLint rules extend Airbnb + TS; code must lint clean.
- Components are arrow functions and PascalCase (e.g., `const Header = () => {}`); files/directories are kebab-case (e.g., `src/components/create-production/`).
- Hooks start with `use*`; variables/functions camelCase; named exports preferred where sensible.

## Testing Guidelines

- Vitest + React Testing Library. Tests colocated as `*.test.ts`/`*.test.tsx`.
- JSDOM environment configured in `vite.config.ts`; setup at `src/test/setup.ts`.
- Aim for component tests around user flows; add coverage for critical paths.

## Commit & Pull Request Guidelines

- Conventional Commits enforced by commitlint (Husky hook). Examples:
  - `feat(ui): add call controls`
  - `fix(api): handle 401 on refresh`
- PRs: link issues, describe scope and rationale, include screenshots/GIFs for UI changes, and steps to validate. Keep PRs small and focused. Ensure `yarn typecheck && yarn lint && yarn build` pass locally.

## Security & Configuration Tips

- Copy `.env.local.sample` to `.env.local`. Common vars: `VITE_BACKEND_URL`, `VITE_BACKEND_API_KEY` (OSC), `VITE_DEBUG_MODE`, `VITE_DEV_LOGGER_LEVEL`. Never commit secrets.
- Docker entrypoint respects `PORT`, `MANAGER_URL`, and `OSC_HOSTNAME` (see `scripts/entrypoint.sh`).
