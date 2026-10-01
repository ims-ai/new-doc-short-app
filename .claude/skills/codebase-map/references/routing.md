# new-doc-short-app — Routing & the buy wizard

Last refreshed: 2026-09-30 (from source). Router: **React Router 7** (`BrowserRouter`), routes in `src/routes/AppRoutes.tsx`.

## Route table (`AppRoutes.tsx`)
Every routed page is `React.lazy`-loaded (code-split). The marketing landing is the only view in the initial bundle.

Standalone routes:
- `/dashboard` → DashboardPage
- `/order-details` → OrderDetailsPage
- `/profile` → ProfilePage
- `/signin` → SignInPage
- `/articles` → ArticlesPage
- `/complete-order` → CompleteOrderPage
- `/binder-invoice` → BinderInvoicePage
- `/underwriter-review` → UnderwriterReviewPage
- `*` → NotFoundPage

Under `<FlowLayout>` (the wizard chrome; renders `<LandingView>` itself at `/`):
- `/` (landing) · `/quote` · `/practice` · `/register` · `/license-scope` · `/underwriting` · `/reviewDocusign` · `/payment`

## The 9-step wizard (`src/modules/Quote/steps.ts`)
`STEPS` is the ordered source of truth (`STEP_PATHS`, `STEP_NAMES`, `TOTAL_STEPS = 9`). Indices are kept aligned with `Q2BNursing` so guard thresholds carry over.

| # | key | path | name |
|---|-----|------|------|
| 0 | home | `/` | Coverage & location |
| 1 | quote | `/quote` | Soft quote (est. premium) |
| 2 | practice | `/practice` | About your practice |
| 3 | register | `/register` | Create your account |
| 4 | licenseScope | `/license-scope` | License, scope & practice |
| 5 | underwriting | `/underwriting` | Underwriting questions |
| 6 | sign | `/reviewDocusign` | Review & sign |
| 7 | payment | `/payment` | Payment |
| 8 | binder | `/binder-invoice` | Binder & invoice |

- Steps 2/4/5 bind to an `ins` question-tree **group** via the `QUESTION_GROUP` matchers (`practice` = master tree pre-signup; `licenseScope` / `underwriting` = submission tree post-signup). Page headings use the live `group.groupName` so a backend rename shows without a deploy.
- `pathToStepIndex(pathname)` maps a URL back to its step; `unmappedGroupNames` flags backend groups no step renders (logged in dev).

## Layout & guards
- `src/layout/` — `Shell` (app frame), `FlowLayout` (wizard frame + landing), `Modals`, and `wizard/` guard hooks: `useWizardGuards.ts`, `useWizardBackNav.ts`.
- Guard model (from steps.ts comments): an **auth gate at `step >= 4`** (post-account steps require a session); steps 1–3 are the pre-account funnel.
- Referral branch: after signing, `putUnderwriterReviewStatus` may route to `/underwriter-review` instead of `/payment` (see `Payment/pages/ReviewDocusignPage.tsx`).

## Error / loading boundaries
- `routes/RouteErrorBoundary.tsx` wraps the `<Routes>`; `routes/RouteFallback.tsx` is the `Suspense` fallback for lazy pages.
- Root `ErrorBoundary` (`shared/components/ErrorBoundary`) wraps the whole app in `App.tsx`.

## Code-splitting
- Per-page: `React.lazy` in `AppRoutes.tsx` (and FlowLayout).
- Vendor: `manualChunks` in `vite.config.js` splits `vendor-react`, `vendor-query`, `vendor-stripe` so a landing visitor doesn't download the payment/query stacks up front.
