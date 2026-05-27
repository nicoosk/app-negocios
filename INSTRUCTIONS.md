# INSTRUCTIONS

## Purpose
This document is for AI assistants making changes in this repository. Keep edits aligned with the existing architecture, style, and domain language. Prioritize correctness and maintainability over generic “AI boilerplate”.

## Project at a glance
- App type: Desktop app built with Electron.
- Stack: Electron + React + TypeScript + electron-vite.
- Persistence: local SQLite via `better-sqlite3` in the main process.
- Language/domain: UI and business naming are Spanish (`ventas`, `fiados`, `deudores`, etc.).

## Repository structure
- `src/main/`: Electron main process (window lifecycle + IPC handlers + DB integration).
- `src/preload/`: secure API bridge (`contextBridge`) exposed to renderer as `window.api`.
- `src/renderer/src/`: React UI, CSS Modules, and client-side interaction logic.
- `src/main/db.ts`: schema + SQL operations (users, sales, debts, debt history).

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
  1. `ipcMain.handle(...)` in `src/main/index.ts`
  2. mirrored `ipcRenderer.invoke(...)` wrappers in `src/preload/index.ts`
  3. typings in `src/preload/index.d.ts`
  4. consumption via `window.api...` in renderer

### IPC naming patterns
Follow the existing `<namespace>:<action>` convention:
- `auth:login`
- `ventas:registrar`, `ventas:hoy`
- `fiados:buscar`, `fiados:registrar`, `fiados:hoy`, etc.

Keep naming domain-consistent and in Spanish where applicable.

### Data layer
- DB access lives in `src/main/db.ts` (main process side).
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

## GitHub Actions workflow (`.github/workflows/build.yml`)
This workflow orchestrates validation, release preparation, and branch synchronization:

- On push to `dev`:
  - runs `typecheck` (`pnpm typecheck`).
  - if successful, runs `create-pr` to open/update a PR from `dev` to `main`.

- On push to `main` (typically after merge):
  - runs `sync-dev`.
  - checks out `dev`, rebases onto `origin/main`, and force-pushes with lease.
  - purpose: keep `dev` aligned with current `main` head.

- On push of tags matching `v*`:
  - runs `build-mac` and `build-win`.
  - uploads build artifacts (`.dmg` and `.exe`).
  - then runs `release`, downloads artifacts, and publishes a GitHub release using:
    - release name based on tag.
    - customizable release body.
    - attached binaries produced by Mac/Windows build jobs.
    - prerelease flag for tags containing `alpha` or `beta`.

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
- There are currently no project test scripts configured in `package.json`; use lint/typecheck as baseline validation.

## Definition of done for assistant edits
- Changes are minimal, targeted, and architecture-consistent.
- TypeScript types are coherent across main/preload/renderer boundaries.
- Domain language and naming stay consistent with existing code.
- `pnpm lint` and `pnpm typecheck` pass (or any failure is explained with exact cause).
