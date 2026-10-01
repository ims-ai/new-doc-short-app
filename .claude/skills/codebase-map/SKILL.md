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

## Rule
Every entry here is evidence-backed from the source. Do not add unverifiable claims; if something is missing, inspect the source or run `refresh-codebase-map` — never fabricate. This is a **frontend** app — apply the `react-engineering` skill, never Angular/backend patterns.
