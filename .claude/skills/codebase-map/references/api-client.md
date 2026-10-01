# new-doc-short-app — API client & endpoints

Last refreshed: 2026-09-30 (from source). Single backend: **INS-SERVICE** (the `ins` service). No local fallback — every module's `api/` file calls `ins` for real.

## Client config (`src/shared/services/config.ts`)
- `API_PREFIX = "/api/weborder/v1"` — every path this app calls sits under it.
- `API_BASE = import.meta.env.VITE_API_BASE_URL || ""` (trailing slashes stripped). **Empty by default = same-origin** — the session is carried by HttpOnly cookies; a cross-origin base needs CORS credentials configured on `ins`.
- `apiUrl(path)` → `${API_BASE}${API_PREFIX}${path}`.
- `logApiError(error, extra?)` — PII-safe error report backstop (delegates to `shared/observability/reporter`; production logs status+message only, forwards to Sentry when `VITE_SENTRY_DSN` set).

## Transport
- Library: **axios**, called directly in each `api/*.ts` with `withCredentials: true` (cookie auth). No shared axios instance — calls go through the global `axios` with a shared interceptor.
- `src/shared/services/httpClient.ts` → `installAuthInterceptor` (called once in `main.tsx`):
  - Global default timeout **90s**.
  - **401 → silent refresh-and-retry**: `POST /auth/refresh/token` (new access token comes back as an HttpOnly cookie), then retry the original request once (`_retried` marker). A single in-flight refresh is shared (`refreshPromise`).
  - Refresh failure → clears session storage + auth hint and redirects to `/signin?returnTo=…` via an SPA navigator (avoids canceling in-flight sibling requests).
  - Bypass list (never trigger refresh): `/auth/sign-in`, `/auth/sign-in-with-google`, `/auth/sign-in-with-googledata`, `/auth/refresh/token`, `/auth/refresh/logout`. `/insured/session` is intentionally NOT bypassed.
  - 4xx (non-401) responses are enriched with the API's own message (`apierror.message` / `message` / `error`).

## Environment / proxy
- Dev (`npm run dev`): Vite proxies `/api/*` → `VITE_UPSTREAM_URL` (default `http://localhost:8089`, from `config/upstream.default.js`), rewriting `Set-Cookie` for localhost.
- Prod: static build calls same-origin `/api/*`; the **Netlify/Vercel edge proxy** (`netlify/edge-functions/api-proxy.js`, `middleware.js`) forwards upstream. Note: the edge proxy strips `Origin`/`Referer`/`X-Forwarded-*`.
- Env vars: `VITE_API_BASE_URL`, `VITE_UPSTREAM_URL`, `VITE_APP_ENV`, `VITE_APP_RELEASE`, `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT`.

## Endpoint inventory (all under `/api/weborder/v1`)
Grouped by module (`grep apiUrl(...)`):

**Auth** (`modules/Auth/api/authApi.ts`, plus refresh in httpClient)
- `POST /auth/sign-in`, `POST /auth/sign-in-with-google`, `POST /auth/sign-in-with-googledata`
- `POST /auth/signup`
- `POST /auth/refresh/token`, `POST /auth/refresh/logout`

**Quote / rating / questions** (`Quote/api/*`)
- `GET /auth/speciality/{code}` — resolve `PRODUCT.specialityCode` → numeric id (once per page load).
- `GET /auth/{zip}/coverage-limits`
- `POST /auth/quotedata` — live ILF/DLF soft-quote estimate.
- `GET /questions?specialityId=…` — master question tree.
- `GET /questions/{submissionId}/questions` — submission question tree.
- `POST /questions/save`
- `POST /insured/submission`, `POST /insured/with-location`, `POST /insured/rating`, `GET /insured/policy-info` (submission create / rating).

**Insured / session / dashboard / profile**
- `GET /insured/session` — current session (refresh-eligible).
- `GET /insured/order`, `GET /insured/orders/open` — order projection for Review/Payment/Binder/OrderDetails.
- `GET /insured/details`, `GET /insured/contacts`, `GET /insured/locations` — profile.
- `GET /dashboard/submissions` — dashboard list.

**Payment / DocuSign / documents** (`Payment/api/paymentApi.ts`)
- `GET /payment/publishable-key` — Stripe publishable key.
- `POST /payment/initiate`, `POST /payment/confirm`.
- `POST /documents/{sid}/docusign` — start/resume embedded signing; returns `{ signingUrl, signedCompleted }` (`DocuSignEmbeddedSigningResponse`).
- `PUT /insured/{sid}/underwriter-review-status` — returns true if underwriter review required.
- `POST /invoice/{sid}/generate-binder-invoice`.
- `GET /documents/{sid}/{kind}/download` (binary PDF, `arraybuffer`) — kinds: `binder`, `insured-certificate` (COI), `policy`, `invoice`, `estimate-quote`, `signed`, `payment-receipt`. Some return 404/409 until preconditions are met (e.g. `signed` → 409 until signed; `payment-receipt` → 404/409 until payment settled).

## DTOs (`src/shared/dtos/`)
Response wrapper classes normalize `ins` payloads: `DocuSignEmbeddedSigningResponse`, `PaymentInitiateResponse`, `PaymentPublishableKeyResponse`, `PaymentStatusResponse`, `PaymentRequest`, etc. Construct these from `response.data` rather than reading raw JSON in pages.
