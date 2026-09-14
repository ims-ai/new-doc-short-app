# Q2BInternalMedicine — architecture notes

A single landing spot for the cross-cutting decisions. The code structure is
deliberately identical to `Q2BNursing` (same folders, file names and idioms)
so fixes port between the two repos by diff; the IM-specific design is in
`../Q2B_INTERNAL_MEDICINE_PORTAL_PLAN.md` (workspace root).

---

## Product configuration — one speciality per build

`src/shared/config/product.ts` exports a frozen `PRODUCT` — the speciality
code (`SP_14_1`), a pre-fetch display fallback (`name`), this app's
sessionStorage prefix (`q2bim:`) and the document title. It is the **only**
file allowed to contain a speciality code: `eslint.config.js` has a
`no-restricted-syntax` rule matching string literals and template elements
shaped like `SP_123` / `SP_14_1` / `ABC2024-39` everywhere else in `src/`. The code is
resolved to its numeric `specialities_master.id` at runtime; the id is never
written into source.

## The speciality query — once per page load

`src/modules/Quote/api/specialityApi.ts`:

| Export                               | Use                                                 |
| ------------------------------------ | --------------------------------------------------- |
| `specialityQuery()`                  | the one `queryOptions` (key `["speciality", code]`) |
| `useSpeciality()`                    | React consumers (landing, pages, rail, COI preview) |
| `ensureSpeciality()`                 | non-hook callers — `useIlfDlfFetcher` (pricing)     |
| `prefetchSpeciality()`               | boot prefetch (`bootstrap/useSpecialityPrefetch`)   |
| `getSpecialitySync()`                | synchronous projection, `null` until resolved       |
| `removeAllQueriesExceptSpeciality()` | sign-out cache wipe (`authSessionService.signOut`)  |

`staleTime` / `gcTime: Infinity` — never refetched or evicted while the tab
lives; concurrent first callers dedupe inside react-query. The request takes
no AbortSignal on purpose: a signal-consuming fetch is cancelled when its last
observer unmounts, and the next consumer would re-issue it. On a `/` entry the
boot prefetch fires in parallel with session restore (not behind FlowLayout's
loader); any other entry path fetches on first use. Retry is the client
default (≤2 for 5xx/network, never a 4xx).

Nursing's `specialityStore`, per-code map and `useSpecialityResolve` do not
exist here.

## Wizard steps + question groups

`src/modules/Quote/steps.ts` replaces Nursing's `constants.ts`: a `STEPS`
array (key, path, name, and for the three question steps the tree + group
matcher) from which `STEP_PATHS`, `STEP_NAMES`, `TOTAL_STEPS` and
`pathToStepIndex` derive, plus `QUESTION_GROUP` and `unmappedGroupNames()`.
Indices match Nursing, so `useWizardGuards`, `useWizardBackNav` and every
`STEP_PATHS[n]` literal carried over unchanged; only
`OPEN_ORDER_ONLY_PATHS` / the rehydrate + question-fetch path sets name
`/license-scope` instead of `/previous-insurance`.

| Step               | Tree       | `ins` group                     | Page                  | Answer map            |
| ------------------ | ---------- | ------------------------------- | --------------------- | --------------------- |
| 2 `/practice`      | master     | About your practice (100)       | `PracticeDetailsPage` | `questionAnswers`     |
| 4 `/license-scope` | submission | License, Scope & Practice (101) | `LicenseScopePage`    | `licenseScopeAnswers` |
| 5 `/underwriting`  | submission | Underwriting questions (99)     | `UnderwritingPage`    | `underwritingAnswers` |

The master-tree answers ride into submission create (`questionSaveRequest`).
The two submission-tree pages hydrate saved answers, recompute Hide/Show
submission-wide, and save on Continue. `derivedValues`' referral gate
(`isReferral` / `allAnswered`) is scoped to the underwriting group only;
`isReferral` means a picked option carries the `ins` `underwriterReviewImpact`
flag, not that it is labelled "Yes".

## TypeScript

`tsconfig.json` has `strict: true`. The whole `src/` tree is `.ts` / `.tsx`
(some carried-over tests are `.js`). `npm run typecheck` must stay green.
Loose domain objects (order / policy / question / submission rows) are typed
`any` by design — `ins` owns those shapes and doesn't publish them.

## Identity store

One identity store: `src/modules/Quote/store/applicantProfileStore.ts`
(Nursing's `nurseProfileStore`, renamed, plus an optional `licenseNumber`). It
is filled by the registration form and refilled by `hydrateFromOrder` after a
reload, so it's also the source for the review / payment contact summary. The
SSN is memory-only — never written to any browser storage.

## App bootstrap

`src/shared/store/useAppBootstrap.ts` composes named hooks in
`src/shared/store/bootstrap/`, one concern each:

| Hook                               | Concern                                               |
| ---------------------------------- | ----------------------------------------------------- |
| `useAuthNavigatorSync`             | SPA navigator ↔ httpClient 401 redirect               |
| `useSpecialityPrefetch`            | speciality fetch at boot on a `/` entry               |
| `useSessionRestore`                | session restore on first boot (runs once)             |
| `useAnswerResetOnQuoteLanding`     | wipe transient answers when landing on `/quote`       |
| `useSubmissionQuestionsFetch`      | the single submission-tree fetch (react-query)        |
| `useAnswerResetOnSubmissionChange` | reset post-signup answers when the submission changes |
| `usePathStepSync`                  | URL → `submissionStore.step`                          |
| `useOrderRehydrate`                | refresh-survival order rehydrate                      |
| `useObservabilityUser`             | crash-reporter user context ↔ session                 |

## Server state — react-query

Every server read goes through `@tanstack/react-query` v5
(`src/shared/query/queryClient.ts` singleton, `QueryProvider`, `keys.ts`).
Defaults: `staleTime 30s`, `gcTime 5m`, no refetch on window focus, refetch on
reconnect, ≤2 retries for 5xx/network with backoff + jitter, never a 4xx,
mutations never retried. `window.__qc` in dev for cache inspection (no
devtools panel).

Stores that also hold non-server state (`ilfDlfStore`, `questionsStore`,
`paymentOrderStore`) keep only that plus a synchronous projection of the
current value for non-hook readers; react-query owns fetch / dedup / retry /
cache. `quoteApi.postInsuredSubmission` keeps its `inflightSubmissionByKey`
map — it dedupes a **mutation** (tested in `quoteApi.dedupe.test.js`).
Sign-out removes every query except the speciality.

## Performance

Every routed page is `React.lazy` (`routes/AppRoutes.tsx`); `FlowLayout`
lazy-loads `LandingView` / `WizardChrome`; `Modals` lazy-loads the legal
modals; `manualChunks` splits `vendor-react` / `vendor-query` /
`vendor-stripe`. Fonts come from one `<link>` in `index.html`. `/assets/*` is
served immutable (`netlify.toml` / `vercel.json`). The Home Page warms the "About your
practice" master tree at idle once the speciality id is known, so `/practice`
opens without a loader (same cache entry — no second request).

## Security

- No production source maps by default (`hidden` only with a Sentry DSN).
- `netlify.toml` / `vercel.json` (kept identical): HSTS, deny-by-default
  `Permissions-Policy`, CSP with `report-uri /_csp-report` (edge sink —
  Netlify edge function / Vercel `middleware.js`).
- `returnTo` open-redirect guard (`safeInternalPath`, tested).
- Global error handlers + `logApiError` are PII-safe in production (status +
  message only).
- The edge proxy (Netlify edge function / Vercel `middleware.js`) forwards
  only an allowlist of request headers.
- `practiceStore` / `submissionStore` mirror non-sensitive state to
  `sessionStorage`; nothing with PII is persisted; sign-out clears it.

## Accessibility

Same posture as Nursing: `Field` + `FieldControlContext` label wiring,
`useDialogA11y` for dialogs, `LegalLink` for in-text actions, global
`:focus-visible`, route-change focus + live announcement (`routeLabel.ts`
reuses `STEP_NAMES`), skip link, secondary-text floor `#595959`. The landing's
speciality loading / error states use `role="status"` / `role="alert"`.

## Error handling & observability

`src/shared/observability/` — `reportError` always console-logs (prod: status

- message only) and forwards to Sentry only when `VITE_SENTRY_DSN` is set
  (`sentry.ts` is dynamically imported, so a DSN-less build ships no Sentry
  chunk). `logApiError` wraps it for `api/*` catch blocks. `ErrorBoundary`
  `level="root"` (App) and `level="route"` (`RouteErrorBoundary`, resets on
  pathname). Raw `error.message` is never shown to users.

## Build, tooling and checks

- **No CI workflow** in this repo (the GitHub remote is set up by the user).
  Local gate: `lint` → `format:check` → `typecheck` → `test` → `build` →
  `lint:cycles`, plus `lint:dead` (knip) informational.
- ESLint 9 flat config: `@eslint/js` + `typescript-eslint` recommended
  (untyped), `react-hooks`, `jsx-a11y`, light `import-x`, the speciality-code
  rule, `eslint-config-prettier` last. `--max-warnings=0`;
  `reportUnusedDisableDirectives: "error"`.
- Prettier (`printWidth: 100`), `.gitattributes` `eol=lf`, `.editorconfig`.
- `useStore` selectors: primitive / stable ref, or a fresh value plus an
  `isEqual` (`shallowEqual`).
- Node 22: `.nvmrc` = `package.json` `engines` (Vercel reads this) =
  `netlify.toml` `NODE_VERSION`.
- `esbuild.drop: ["debugger"]` gated on Vite `command === "build"`.

## What was not carried over from Q2BNursing

`src/local/**` (account / submission shadows), `Quote/data/**` (placeholder
rate tables) and `Quote/services/**` (local rating engine, `quoteService`),
`quoteResultStore` / `specialityStore` / `cvStore` / `declUploadStore`,
`useLocalQuoteRecompute` / `useSpecialityResolve`, `PracticeTypePage` (the
catch-all is `routes/NotFoundPage.tsx`), `PreviousInsuranceClaimsPage` (→
`LicenseScopePage`), `ChipGrid`, `quoteApi.postAttestation` /
`patchSubmissionDetails`, `ratingApi.postIlfDlfList` / `getZipcodeData` /
`postCalculateRating` / `putUpdateRating`, `paymentApi.postPaymentCheckout`
(a demo stub), the `authApi` Google aliases, the Nfy-only
`classificationFromSubmissionGroups` / `buildAboutGroupSavePayload`, and the
designation / employer / hours fields.

The remaining `knip` findings came over from Nursing as-is and are kept on
purpose: wrappers for endpoints this app's API surface still lists
(`profileApi.putInsuredWithLocation`, `downloads.downloadQuote` /
`downloadInvoice`, `dashboardService.loadOpenOrders`), plus unused hub icons,
theme tokens and small shared utilities.
