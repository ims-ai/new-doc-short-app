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

## Naming conventions — derive any path without searching
Feature-first + role-named files. Given a **feature** (a `src/modules/<Feature>/` folder — `Auth`, `Quote`, `Payment`, `Profile`, `Dashboard`, `Underwriter`) and a **role**, the path is mechanical. Every example below is a real, verified file.

| Role | Folder | File pattern | Example (real) |
|------|--------|--------------|----------------|
| Routed page | `src/modules/<Feature>/pages/` | `<Name>Page.tsx` | `modules/Payment/pages/PaymentPage.tsx` |
| Module-local component | `src/modules/<Feature>/components/` | `<Name>.tsx` (PascalCase) | `modules/Quote/components/QuestionRenderer.tsx` |
| Shared component | `src/shared/components/` (`desktop/` for hub chrome) | `<Name>.tsx` | `shared/components/Alert.tsx` |
| API client (axios→`ins`) | `src/modules/<Feature>/api/` | `<name>Api.ts` (camelCase) | `modules/Payment/api/paymentApi.ts` *(anchor)* |
| Class store | `src/modules/<Feature>/store/` (or `src/shared/store/`) | `<name>Store.ts` | `modules/Quote/store/submissionStore.ts`; `shared/store/sessionStore.ts` |
| Service (orchestration) | `src/modules/<Feature>/services/` | `<name>Service.ts` | `modules/Payment/services/paymentOrderService.ts` |
| Hook (TanStack Query / stateful) | `src/modules/<Feature>/utils/`, cross-module `src/hooks/`, app-boot `src/shared/store/bootstrap/` | `use<Name>.ts` | `modules/Quote/utils/useIlfDlfFetcher.ts`; `hooks/useQuestionsFetcher.ts`; `shared/store/bootstrap/useSessionRestore.ts` |
| Pure util | `src/modules/<Feature>/utils/` (or `src/shared/utils/`) | `<name>.ts` (camelCase) | `modules/Quote/utils/ilfHelpers.ts`; `shared/utils/format.ts` |
| Module constants | `src/modules/<Feature>/` | `constants.ts` | `modules/Payment/constants.ts` |
| Shared constants | `src/shared/` | `constants.ts` | `shared/constants.ts` |
| DTO (response-wrapper) | `src/shared/dtos/` | `<domain>.dto.ts` | `shared/dtos/payment.dto.ts` |
| Query-key factory | `src/shared/query/` | `keys.ts` (single file) | `shared/query/keys.ts` |
| Colocated test | next to subject | `<name>.test.ts` / `.test.js` | `modules/Quote/steps.test.ts` |
| Fixtures | `src/modules/<Feature>/__fixtures__/` | — | `modules/Quote/__fixtures__/im-question-tree.json` |

Notes: there is **no** per-module `hooks/` folder — `use*` hooks live in the feature's `utils/`, in top-level `src/hooks/` if cross-module, or in `shared/store/bootstrap/` if they run at app start. The **wizard step registry** is a single file, `src/modules/Quote/steps.ts` (the 9-step order; `steps.test.ts` guards it).

## Find a file (instead of blind search)
1. **Identify feature + role.** Pick the `modules/<Feature>/` folder (fall back to `shared/` for cross-cutting infra); name the role from the table.
2. **Glob the derived path**, e.g. a payment page → `src/modules/Payment/pages/*Page.tsx`; the payment API client → `src/modules/Payment/api/*Api.ts`.
3. **By-role fallback across all features** when unsure which module owns it:
   - page → `src/modules/*/pages/*Page.tsx`
   - API client → `src/modules/*/api/*Api.ts`
   - store → `src/modules/*/store/*Store.ts` (+ `src/shared/store/*Store.ts`)
   - hook → `src/modules/*/utils/use*.ts`, `src/hooks/use*.ts`, `src/shared/store/bootstrap/use*.ts`

## Conventions
- TypeScript `strict`; no `any` (ESLint enforced). Path alias `@/…`.
- One product per build: **only** `shared/config/product.ts` may name a speciality code (ESLint `no-restricted-syntax`).
- Prettier + ESLint (`--max-warnings=0`); `madge` forbids import cycles; `knip` flags dead code (`npm run lint:arch`).
