# INSTRUCTIONS

## Purpose
This document is for AI assistants making changes in this repository. Keep edits aligned with the existing architecture, style, and domain language. Prioritize correctness and maintainability over generic “AI boilerplate”.

## Project at a glance
- App type: Desktop app built with Electron.
- Stack: Electron + React + TypeScript + electron-vite.
- Persistence: local SQLite via `better-sqlite3` in the main process.
- Language/domain: UI and business naming are Spanish (`ventas`, `fiados`, `deudores`, etc.).

## Repository structure
- `src/main/`: Electron main process (window lifecycle, IPC, DB integration).
  - `src/main/nucleo/`: domain logic + SQLite (`nucleo.ts`, `esquema.ts`), testable with `:memory:`.
  - `src/main/ipc/`: IPC handlers (`index.ts`) and input validation (`validacion.ts`).
  - `src/main/scanner/`: local HTTP server + mobile scan page (barcode scanner).
- `src/preload/`: secure API bridge (`contextBridge`) exposed to renderer as `window.api` (`api.ts`).
- `src/renderer/src/`: React UI, CSS Modules, and client-side interaction logic.
- `src/shared/`: domain/IPC types shared across main, preload and renderer (`tipos.ts`, `constantes.ts`).

## Build/dev/tooling
- Package manager: `pnpm` (lockfile: `pnpm-lock.yaml`).
- Dev server: `pnpm dev`.
- Lint: `pnpm lint`.
- Format: `pnpm format`.
- Type checks:
  - `pnpm typecheck:node`
  - `pnpm typecheck:web`
  - `pnpm typecheck`
- Build:
  - `pnpm build`
  - platform targets: `pnpm build:mac`, `pnpm build:win`, `pnpm build:linux`

## Code style (must follow)
Derived from `.editorconfig`, `.prettierrc.yaml`, and current source:

- Indentation: 2 spaces.
- Quotes: single quotes.
- Semicolons: omitted.
- Trailing commas: none.
- Max line width: ~100 chars.
- Keep UTF-8 and LF line endings.

TypeScript + React conventions used in code:
- Prefer explicit return types for exported functions/components.
  - Components typically return `React.JSX.Element` or `JSX.Element`.
- Use typed state and props interfaces.
- Keep functions small and purpose-driven.
- Use async/await for IPC/UI flows.
- Avoid introducing `any`; prefer concrete interfaces/types.

CSS conventions:
- CSS Modules for component styling (`*.module.css`).
- `className={styles.foo}` pattern everywhere.
- Visual language is dark theme; preserve existing tone and spacing scale.

## Architecture rules
### Process boundaries
- Renderer should not access Node/Electron internals directly.
- New privileged operations must go through:
  1. `ipcMain.handle(...)` in `src/main/ipc/index.ts`
  2. mirrored `ipcRenderer.invoke(...)` wrappers in `src/preload/api.ts`
  3. typings in `src/preload/index.d.ts` and shared types in `src/shared/tipos.ts`
  4. consumption via `window.api...` in renderer

### IPC naming patterns
Follow the existing `<namespace>:<action>` convention:
- `auth:login`
- `ventas:registrar`, `ventas:hoy`
- `fiados:buscar`, `fiados:registrar`, `fiados:hoy`, etc.

Keep naming domain-consistent and in Spanish where applicable.

### Data layer
- DB access lives in `src/main/nucleo/` (schema in `esquema.ts`, operations in `nucleo.ts`).
- Use parameterized queries (`?`) with `prepare().run/get/all`.
- Reuse existing table semantics:
  - `ventas`
  - `fiados`
  - `fiados_detalle`
  - debt repayments represented with negative `monto` entries in `fiados_detalle`.
- Preserve business invariants (e.g., debt cannot go below 0).

## Implementation guidelines for future changes
### When adding a new feature
1. Identify whether it belongs in main (DB/system), preload bridge, renderer UI, or multiple layers.
2. If renderer needs new data/action, implement full IPC chain (main + preload + d.ts + UI).
3. Keep naming and UX text aligned with current Spanish domain terminology.
4. Update/extend types first, then implementation.
5. Validate with lint + typecheck before finalizing.

### When changing UI
- Prefer reusing existing component patterns:
  - local `useState`, `useEffect`
  - small helper formatters (e.g., currency format with `es-CL`)
  - CSS Modules per component
- Do not introduce a new styling system unless explicitly requested.
- Keep keyboard/numpad interaction behavior consistent (current app relies on it heavily).

### When changing DB/business logic
- Keep logic deterministic and explicit.
- Preserve existing SQL style and ordering patterns (`ORDER BY ... DESC`, explicit limits, `COALESCE`).
- Validate edge cases: empty results, zero totals, missing records, and negative/invalid inputs.

## GitHub Actions workflows (`.github/workflows/`)
- `ci.yml` — en cada push a `dev` y en cada PR hacia `main` corre el job `verify`:
  `pnpm typecheck`, `pnpm lint`, tests con Electron-as-node
  (`ELECTRON_RUN_AS_NODE=1 ... vitest run`) y `electron-vite build` sin empaquetar.
  Este es el check requerido por el ruleset de `main`.
- `sync-dev.yml` — tras un push a `main`, rebasa `dev` sobre `origin/main` y hace
  `push --force-with-lease` para dejar `dev` alineada con `main`.
- `release.yml` — al empujar un tag `v*`, compila macOS y Windows y publica un
  GitHub Release (prerelease si el tag contiene `alpha` o `beta`).

## Anti-slop rules (important)
- Do not perform broad refactors unless requested.
- Do not rename domain terms to English unless explicitly requested.
- Do not add new dependencies for small tasks.
- Do not bypass preload with insecure renderer access.
- Do not leave dead code/comments or speculative abstractions.
- Do not silently change existing behavior “for cleanup”.

## Known quirks to respect
- `fiados:buscar` preload signature accepts `query`, while current main handler ignores it and returns full list. Keep compatibility in mind when editing.
- Login/database logs exist in code; only alter logging behavior if task requires it.
- Tests live next to their modules (`*.test.ts`) and must run with Electron-as-node
  (`ELECTRON_RUN_AS_NODE=1 ... vitest run`); plain `pnpm test` won't work because `better-sqlite3`
  is built for Electron's ABI.

## Definition of done for assistant edits
- Changes are minimal, targeted, and architecture-consistent.
- TypeScript types are coherent across main/preload/renderer boundaries.
- Domain language and naming stay consistent with existing code.
- `pnpm lint`, `pnpm typecheck`, the Electron-as-node test suite, and `electron-vite build` pass
  (or any failure is explained with exact cause).
