# new-doc-short-app — Structure

Last refreshed: 2026-09-30 (from source).

## Top level
- `src/` — application source (TypeScript + `.tsx`). Alias `@` → `src` (`vite.config.js`, `tsconfig.json`).
- `e2e/` — Playwright specs + fixtures/support (`*.spec.js`).
- `config/` — build-time config (`upstream.default.js` — dev-proxy default upstream).
- `netlify/` + `netlify.toml`, `vercel.json`, `middleware.js` — static-deploy + edge API proxy.
- `public/`, `index.html`, `vite.config.js`, `eslint.config.js`, `knip.json`, `.madgerc`, `playwright.config.js`, `tsconfig.json`, `.nvmrc`, `.prettierrc.json`.
- `scripts/check-questions-config-drift.mjs` — invoked by `npm run check:questions-config-drift`.

## `src/` layout
```
src/
  main.tsx            # entry: installs auth interceptor, observability, theme, mounts <App/>
  App.tsx             # ErrorBoundary → QueryProvider → BrowserRouter → Shell(AppRoutes + Modals)
  theme.ts            # light/dark theme (localStorage key q2b_theme)
  responsive.css / styles/ui.css / shared/styles.css
  vite-env.d.ts, types/
  routes/             # AppRoutes.tsx, NotFoundPage, RouteErrorBoundary, RouteFallback
  layout/             # Shell, FlowLayout, wizard chrome, modals/ (FAQ/Privacy/Terms)
  hooks/              # useQuestionsFetcher.ts (cross-module hook)
  modules/            # feature modules (see below)
  shared/             # cross-cutting infra (see below)
```

## Module anatomy (`src/modules/<Name>/`)
Feature-first. A module contains some of: `api/` (axios calls to `ins`), `services/` (orchestration on top of api + stores), `store/` (class stores), `pages/` (routed screens), `components/` (module-local UI), `utils/`, `__fixtures__/`, `*.test.ts`.

- **Auth** — `pages/` SignInPage, RegistrationPage; `api/authApi.ts`; `services/authSessionService.ts`; `store/authFormStore.ts`; `utils/google.ts`.
- **Quote** — the funnel core. `pages/` SoftQuotePage, PracticeDetailsPage, LicenseScopePage, UnderwritingPage, ArticlesPage; `api/` specialityApi, ratingApi, questionsApi, quoteApi; `store/` submissionStore, questionsStore, practiceStore, attestStore; `utils/` derivedValues, ilfHelpers, decimal, submission; `steps.ts` (wizard step config); `components/` (MedMalGuardLanding, QuoteSnapshotRail, …); `__fixtures__/`.
- **Payment** — `pages/` ReviewDocusignPage, PaymentPage, BinderInvoicePage, CompleteOrderPage; `api/paymentApi.ts` (DocuSign + Stripe + document downloads); `services/paymentOrderService.ts`; `store/paymentOrderStore.ts`; `utils/downloads.ts`.
- **Profile** — `pages/ProfilePage.tsx`, `api/profileApi.ts`.
- **Dashboard** — `pages/` DashboardPage, OrderDetailsPage; `api/dashboardApi.ts`; `services/dashboardService.ts`.
- **Underwriter** — `pages/UnderwriterReviewPage.tsx` (shown when a submission is referred to an underwriter).

## `src/shared/`
- `services/` — `config.ts` (`API_PREFIX`, `apiUrl`, `logApiError`), `httpClient.ts` (axios 401 interceptor), `http.ts`.
- `query/` — `queryClient.ts`, `QueryProvider.tsx`, `keys.ts` (query-key factory).
- `store/` — `useStore.ts` (the `useSyncExternalStore` binding), `sessionStore.ts`, `insuredProfileStore.ts`, `modalStore.ts`, `useAppBootstrap.ts`, and `bootstrap/` (session restore, order rehydrate, prefetch, path/step sync hooks).
- `components/` — Alert, Icon, ErrorBoundary, AsyncBoundary, `desktop/` (HubCOIPreview, hubData), …
- `config/product.ts` — the single source for the speciality code (`SP_14_1`).
- `dtos/` — response wrapper classes (e.g. `DocuSignEmbeddedSigningResponse`, `PaymentInitiateResponse`).
- `observability/` — Sentry reporter, error scrubbing.
- `a11y/`, `utils/`, `constants`, `styles.css`.

## Conventions
- TypeScript `strict`; no `any` (ESLint enforced). Path alias `@/…`.
- One product per build: **only** `shared/config/product.ts` may name a speciality code (ESLint `no-restricted-syntax`).
- Prettier + ESLint (`--max-warnings=0`); `madge` forbids import cycles; `knip` flags dead code (`npm run lint:arch`).
