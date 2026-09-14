# Q2BInternalMedicine

Internal Medicine malpractice quote-to-bind portal (MedMalGuard · Doctors
Professional Liability RRG). A single-speciality React SPA forked from
`Q2BNursing` — same stack, structure, coding standards, theme and `ins`
WebOrder API — built from `../Q2B_INTERNAL_MEDICINE_PORTAL_PLAN.md`.

**Everything calls the real `ins` INS-SERVICE** (`/api/weborder/v1`):
speciality lookup, pricing, the question tree, auth, submission creation,
DocuSign signing, Stripe payment, document downloads, dashboard and profile.
No local fallback, and no changes to `ins` or any other platform service.

## One product per build

The speciality code **`SP_14_1`** lives in exactly one file,
`src/shared/config/product.ts`; an ESLint rule rejects a speciality-code
literal anywhere else. It resolves to its `specialities_master.id` at runtime
(`GET /auth/speciality/{code}` — 10512, "Internal Medicine", on local `ins`);
the id is never hard-coded because it can differ per database. The speciality
is fetched **once per page load** and shared by every consumer (see
`src/modules/Quote/api/specialityApi.ts`).

## Stack

- React 18 + Vite 7, React Router 7, TypeScript (`strict`)
- `@tanstack/react-query` v5 for server state
- Stripe Elements, embedded DocuSign
- Vitest (pure-logic suite)
- Static deploy on Netlify or Vercel (edge API proxy on both)

## Prerequisites

- **Node.js 22** — pinned in `.nvmrc`, `package.json` `engines`
  (`>=22.12 <23`, which Vercel reads) and `netlify.toml` `NODE_VERSION`.
  `nvm use` picks it up.
- npm
- A running `ins` for anything past the landing page (see below).

## Getting started

```bash
npm ci
npm run dev
```

App runs at [http://localhost:4200](http://localhost:4200). To run it beside
another portal, start it on a different port: `npm run dev -- --port <n>`.

`/api/*` is proxied to `VITE_UPSTREAM_URL` (default `http://localhost:8089`,
from `config/upstream.default.js`); override it in `.env.local`.

## Scripts

| Command                | Description                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm run dev`          | Vite dev server on port 4200                                                                           |
| `npm run build`        | Production build → `dist/`                                                                             |
| `npm run preview`      | Serve `dist/` on port 4200                                                                             |
| `npm test`             | Vitest once                                                                                            |
| `npm run test:watch`   | Vitest watch mode                                                                                      |
| `npm run typecheck`    | `tsc --noEmit` (`strict`)                                                                              |
| `npm run lint`         | ESLint (`--max-warnings=0`) — correctness, `react-hooks`, `jsx-a11y`, the one-place speciality rule    |
| `npm run lint:fix`     | ESLint with `--fix`                                                                                    |
| `npm run format`       | Prettier `--write` (whole tree)                                                                        |
| `npm run format:check` | Prettier `--check`                                                                                     |
| `npm run lint:cycles`  | `madge` circular-dependency check                                                                      |
| `npm run lint:dead`    | `knip` — unused files / exports / deps. On a low-memory machine run with `KNIP_DISABLE_RAW_TRANSFER=1` |
| `npm run lint:arch`    | `lint:cycles` + `lint:dead`                                                                            |

## Quote flow

Nine steps, at the same indices as Q2BNursing (`src/modules/Quote/steps.ts`):

| #   | Path              | Step                      | Data                                                                         |
| --- | ----------------- | ------------------------- | ---------------------------------------------------------------------------- |
| 0   | `/`               | Home — instant estimate   | ZIP + start date → `POST /auth/quotedata`; limit picker + retro date         |
| 1   | `/quote`          | Soft quote                | same price                                                                   |
| 2   | `/practice`       | About your practice       | `ins` master tree, group "About your practice" (pre-signup)                  |
| 3   | `/register`       | Create your account       | `POST /auth/signup` + `POST /insured/submission`                             |
| 4   | `/license-scope`  | License, scope & practice | submission tree, group "License, Scope & Practice" (procedure checklists)    |
| 5   | `/underwriting`   | Underwriting questions    | submission tree, group "Underwriting questions" (a Yes → underwriter review) |
| 6   | `/reviewDocusign` | Review & sign             | embedded DocuSign                                                            |
| 7   | `/payment`        | Payment                   | Stripe Elements                                                              |
| 8   | `/binder-invoice` | Binder & invoice          | document downloads                                                           |

Dashboard, profile, order details and underwriter review sit outside the
wizard.

## Questions — the live `ins` tree only

The portal renders exactly the question tree `ins` serves for this speciality
(`GET /questions?specialityId=`) — three groups, 26 questions, types
`YES_NO` / `CHECKBOX` / `TEXTBOX`. Nothing is hard-coded: headings are the live
`groupName`, and `steps.ts` holds the only group matchers. A snapshot of the
tree is pinned in `src/modules/Quote/__fixtures__/im-question-tree.json` and
checked by `questionTree.fixture.test.ts`.

## Pricing

`POST /auth/quotedata` with `{ zipcode, effectiveDate, specialtiesMasterId,
coverageLimitId?, retroDate? }`. No option in the IM tree carries a rating
impact, so the quotedata defaults (hours, year, surgery class, claims) are the
complete submission input. Every price on every page reads from
`ilfDlfStore` / `useQuoteSnapshot()`; once a submission is rated, the order's
own rating wins.

## Project layout

```text
src/
  shared/config/product.ts   # THE speciality code
  modules/
    Quote/  (steps.ts, api/, pages/, store/, utils/, __fixtures__/)
    Auth/ Payment/ Dashboard/ Profile/ Underwriter/
  layout/                    # Shell, FlowLayout, wizard chrome, modals
  routes/                    # AppRoutes, NotFoundPage, error boundary
  shared/                    # components, stores, query client, observability, DTOs
```

## Checks

There is no CI workflow in this repo. Run the gate locally before pushing:
`lint` → `format:check` → `typecheck` → `test` → `build` → `lint:cycles`
(+ `lint:dead`, informational). See `CONTRIBUTING.md`.

## Deploy

Static SPA, deployable to **Netlify** or **Vercel** from the same repo. Each
host reads only its own files, so both can run side by side.

|                                 | Netlify                                             | Vercel                                                 |
| ------------------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| Config                          | `netlify.toml`                                      | `vercel.json`                                          |
| `/api/*` proxy + `/_csp-report` | `netlify/edge-functions/*.js`                       | `middleware.js` (Routing Middleware, Edge runtime)     |
| Node 22                         | `NODE_VERSION` in `netlify.toml`                    | `package.json` `engines`                               |
| `VITE_UPSTREAM_URL`             | Site settings → Environment variables (per context) | Project → Settings → Environment Variables (per env't) |

Both build with `npm run build`, publish `dist/` with an SPA rewrite to
`index.html`, send the same security headers, and proxy `/api/*` to
`VITE_UPSTREAM_URL`, re-emitting the upstream `Set-Cookie` as a host-only
first-party cookie. **The two are twins — a change to the proxy, the headers
or the CSP goes into both.** `VITE_UPSTREAM_URL` must be an `ins` URL reachable
from the public internet; unset, the proxy falls back to
`http://localhost:8089` and every API call returns 502. Keep
`VITE_API_BASE_URL` unset in production.

**Rollback** — Netlify: _Deploys_ → last-good deploy → **Publish deploy**.
Vercel: _Deployments_ → last-good deployment → **Instant Rollback**. Both are
instant; `/assets/*` is content-hashed and immutable.

**Source maps** — off by default; emitted as `hidden` only when
`VITE_SENTRY_DSN` is set, and the deploy step must then upload
`dist/assets/*.map` to Sentry and delete them before publish.

## Notes

- The SSN (optional, at registration) is **memory-only** and never written to
  browser storage — see `applicantProfileStore.ts`.
- Out of scope: additional-insured / entity coverage, joining a group policy,
  document uploads, policy servicing (endorsements, renewals, cancellations).
