---
name: codebase-map
description: Accurate map of the new-doc-short-app React SPA (internal-medicine Quote-to-Bind portal) — structure, routing/wizard, API client + endpoints, shared components, state (TanStack Query + class stores), build/run/CI — generated from the actual code. Read this BEFORE searching the modules so you don't guess. Refresh with the refresh-codebase-map skill after structural changes.
---

# new-doc-short-app — Codebase Map

Last refreshed: 2026-09-30 (from source). If this disagrees with the code, trust the code and run `refresh-codebase-map`.

## Snapshot
- `internal-medicine-quote-to-bind` (README `Q2BInternalMedicine`) — a single-speciality **medical-malpractice Quote-to-Bind SPA** for physicians. Product **MedMalGuard · Doctors Professional Liability RRG**, speciality **Internal Medicine** (`SP_14_1`). Forked from `Q2BNursing`.
- **React 18.3 · Vite 7 · React Router 7 · TypeScript strict · TanStack Query v5 · axios · Stripe Elements · embedded DocuSign · Sentry (opt-in) · Vitest + Playwright.** Node 22.
- **6 feature modules** under `src/modules/` (Auth, Quote, Payment, Profile, Dashboard, Underwriter) · **9-step buy wizard** · single backend: **INS-SERVICE** WebOrder API `/api/weborder/v1`.
- Deploy: **static** on Netlify/Vercel (edge proxy to `ins`). **No Dockerfile.** CI: **GitHub Actions** Playwright e2e.

## Read the reference that matches your task
- `references/structure.md` — folder layout, module anatomy, config files.
- `references/routing.md` — routes, the 9-step wizard, layout/guards, code-splitting.
- `references/api-client.md` — axios client, cookie auth + 401 refresh, `/api/weborder/v1` endpoint inventory, DTOs, env/proxy.
- `references/components.md` — shared components, boundaries, layout chrome.
- `references/state.md` — TanStack Query usage + query keys, the class-store pattern, bootstrap hooks.
- `references/build-run.md` — scripts, env vars, deploy targets, CI, tests.
- `references/style-guide.md` — repo-specific coding conventions (layers on the global rules). Read when writing/changing code here.
- `references/changelog.md` — curated service-level change log + pointers to git (and Liquibase) history. Read when you need recent-change context.

## Key constants
No single central catalog — shared constants live in a few `src/shared/` modules plus one per-module file. Grep/read these before searching for what a bare const means. Not exhaustive.

Product / config (`src/shared/config/product.ts`, `src/shared/services/config.ts`) — single sources of truth; secret values come from env (`VITE_*`), never hardcoded:
- `PRODUCT.specialityCode` = `"SP_14_1"` — shared/config/product.ts:13 (only place a speciality code may appear; ESLint-enforced)
- `PRODUCT.storagePrefix` = `"q2bim:"` — shared/config/product.ts:19 (sessionStorage key prefix)
- `API_PREFIX` = `"/api/weborder/v1"` — shared/services/config.ts:25 (every path sits under it)
- `API_BASE` = `import.meta.env.VITE_API_BASE_URL` (default `""` = same-origin) — shared/services/config.ts:22
- `APP_ENV` = `VITE_APP_ENV || import.meta.env.MODE` — shared/services/config.ts:14

Brand / theme colors (`src/shared/constants.ts`) — resolved at runtime via CSS custom properties (tokens in `src/responsive.css`):
- `BRAND` = `"var(--brand)"` — shared/constants.ts:4
- `ORANGE` / `RED` / `BLUE` = `"var(--orange)"` / `"var(--red)"` / `"var(--blue)"` — shared/constants.ts:7,9,11
- `SF_LOGO` = `"/icon.jpg"` — shared/constants.ts:15

Payment workflow-status sets (`src/modules/Payment/constants.ts`):
- `BINDER_NEEDED_STATUSES` = `Set(["pay", "paid", "binding policy"])` — modules/Payment/constants.ts:9
- `PAYMENT_NEEDED_STATUSES` = `Set(["signed", "sign"])` — modules/Payment/constants.ts:12

## Rule
Every entry here is evidence-backed from the source. Do not add unverifiable claims; if something is missing, inspect the source or run `refresh-codebase-map` — never fabricate. This is a **frontend** app — apply the `react-engineering` skill, never Angular/backend patterns.
