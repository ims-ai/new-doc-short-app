# new-doc-short-app — Claude context

Single-speciality **Quote-to-Bind (Q2B) insurance portal** — a physician (doctor) buys medical-malpractice / Professional Liability coverage end to end: soft quote → application questions → account → review & **DocuSign** signing → **Stripe** payment → binder & documents. Product: **MedMalGuard · Doctors Professional Liability RRG**, speciality **Internal Medicine** (`SP_14_1`). Package name `internal-medicine-quote-to-bind`; README title `Q2BInternalMedicine`; forked from `Q2BNursing`. Family: **react**. Independent Git repository.

> The repo slug `new-doc-short-app` is a codename — "doc" = doctor. It is NOT a document-management or e-signature product; DocuSign is one step of the buy flow.

## Stack
React 18.3 · Vite 7 · React Router 7 · TypeScript (`strict`) · **@tanstack/react-query v5** (server state) · axios (cookie auth) · Stripe Elements (`@stripe/react-stripe-js` v6) · embedded DocuSign · `@sentry/react` (opt-in) · Vitest (pure-logic, node env) · Playwright (e2e). Node **22** (`.nvmrc`, `engines >=22.12 <23`). No Redux/Zustand — local/global state is a class-store + `useSyncExternalStore` pattern (`shared/store/useStore.ts`).

## Run / build / test
```
npm ci
npm run dev            # Vite dev server on :4200; proxies /api/* → VITE_UPSTREAM_URL (default http://localhost:8089)
npm run build          # production build → dist/
npm run typecheck      # tsc --noEmit
npm run lint           # eslint (--max-warnings=0)
npm test               # vitest run (pure-logic suite)
npm run test:e2e       # playwright
npm run lint:arch      # madge (no cycles) + knip (dead code)
```
- Dev/build only; **do not** run npm/builds as part of config generation.
- Deploy: **static SPA** on Netlify or Vercel (edge proxy forwards `/api/*` upstream). **No Dockerfile** in this repo.
- CI: **GitHub Actions** — `.github/workflows/ci.yml` runs Playwright e2e on PR/push to `main`.

## Backend surface it consumes
Everything talks to **INS-SERVICE** (the `ins` backend) over its WebOrder API, prefix **`/api/weborder/v1`** (`src/shared/services/config.ts`). There is no local fallback. Auth is **HttpOnly cookies** with a silent refresh-on-401 interceptor (`src/shared/services/httpClient.ts`). DocuSign signing, Stripe payment and PDF document downloads are all `ins` endpoints under `/documents`, `/payment`, `/invoice`, `/insured`. See the `codebase-map` skill's `api-client` reference for the full endpoint list.

## Module map
`src/modules/`: **Auth** (sign-in / Google / signup, session) · **Quote** (soft quote, rating/ILF, question tree, submission) · **Payment** (DocuSign review, Stripe payment, binder invoice, documents) · **Profile** · **Dashboard** (submissions, order details) · **Underwriter** (referred-review screen). Shared infra in `src/shared/` (services, query, store, components, dtos, observability); wizard chrome in `src/layout/`; routes in `src/routes/AppRoutes.tsx`.

## How to work here
1. Read the **`codebase-map`** skill first — structure, routing, api-client, components, state, build-run. Don't blind-search the modules.
2. Follow the **`react-engineering`** skill: functional components + hooks, TypeScript no `any`, server state via TanStack Query (standardized here), local/global state via the existing class-store pattern — do NOT introduce a new state library.
3. Match the module's existing `api/` → `services/`/`store/` → `pages/` layering; reuse `shared/` (query keys, dtos, httpClient) before adding anything.
4. For the buy-flow document/signing/payment step, use the **`document-change`** skill.
5. Never hardcode secrets, full API URLs, or the speciality code (`PRODUCT.specialityCode` is the single source; ESLint enforces it). Classify risk and satisfy the Definition of Done before claiming completion.

## Gotchas
- **Same-origin API by design** — `API_BASE` defaults to empty; the dev proxy and the prod edge proxy both forward `/api/*`. Don't hardcode the upstream host.
- **Auth is cookie-based** — no bearer token in JS; the 401 interceptor owns refresh-and-retry. TanStack Query must not retry 401/4xx (already configured in `shared/query/queryClient.ts`).
- **One product per build** — `src/shared/config/product.ts` (`SP_14_1`) is the only place a speciality code may appear; the numeric id is resolved at runtime, never hardcoded.
- **DocuSign return-URL is unreliable** (edge proxy strips `Origin`/`Referer`) — completion is confirmed by re-POSTing the signing session and reading `signedCompleted` / `workflowstatus === "pay"`, not by trusting URL params.
- Vitest suite is **node-env, pure logic only** (no jsdom); UI behavior is covered by Playwright e2e.
