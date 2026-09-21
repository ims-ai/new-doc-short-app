# Q2BInternalMedicine

Internal Medicine malpractice quote-to-bind portal (MedMalGuard · DPL RRG).
React SPA forked from `Q2BNursing` — **same structure, file names, stack,
theme and `ins` WebOrder API**, so fixes port between the two repos by diff.
Built from `../Q2B_INTERNAL_MEDICINE_PORTAL_PLAN.md` (workspace root) — read
it before structural changes.

**Everything talks to the real `ins` INS-SERVICE** (`/api/weborder/v1`):
speciality lookup, pricing, the question tree, auth (sign-in/sign-up/session/
Google), submission creation, DocuSign, Stripe, documents, dashboard, profile,
underwriter-review status. There is no local fallback and no `src/local/`.

**TypeScript** — `strict`; `npm run typecheck` must stay green. The whole
`src/` tree is `.ts`/`.tsx` (tests may be `.js`). Intra-repo imports are
extensionless. Loose `ins` domain rows (order / policy / question /
submission) are typed `any` by design.

## One product per build — the speciality code lives in ONE file

`src/shared/config/product.ts` → `PRODUCT.specialityCode` (**`SP_14_1`**).
ESLint (`no-restricted-syntax`, `eslint.config.js`) rejects a speciality-code
literal (`SP_123`, `SP_14_1`, `ABC2024-39` shapes) anywhere else in `src/`. The code is
resolved to its `specialities_master.id` at runtime — **never hard-code the id**
(10512 on local `ins`; it can differ per database). Change the code only on
the user's instruction.

## The speciality — fetched once per page load

`src/modules/Quote/api/specialityApi.ts` — one react-query entry
(`queryKeys.speciality.current()`, `staleTime`/`gcTime: Infinity`, no
AbortSignal):

- `useSpeciality()` for React; `ensureSpeciality()` for non-hook callers
  (pricing, `useIlfDlfFetcher`); `getSpecialitySync()` for sync projections.
- A `/` entry prefetches it at boot (`bootstrap/useSpecialityPrefetch`), in
  parallel with session restore; the landing joins that request.
- Sign-out keeps it (`removeAllQueriesExceptSpeciality()` instead of
  `queryClient.clear()`).
- 404 (code wrong / `sspenable=false` / group inactive) → the landing shows
  "temporarily unavailable — please call"; 5xx/network → retry ×2 then "Try again".

`specialityApi.test.ts` pins exactly one GET across prefetch + repeated
consumers + sign-out.

## Wizard + the question tree

`src/modules/Quote/steps.ts` is the step config — `STEP_PATHS` /
`STEP_NAMES` / `TOTAL_STEPS` / `pathToStepIndex`, plus `QUESTION_GROUP`, **the
only place a page binds to an `ins` question group**. Nine steps at Nursing's
indices; only step 4 differs:

`/` → `/quote` → `/practice` ("About your practice", master tree, pre-signup)
→ `/register` → `/license-scope` ("License, Scope & Practice", submission tree)
→ `/underwriting` ("Underwriting questions") → `/reviewDocusign` → `/payment`
→ `/binder-invoice`.

Questions are **only the live `ins` tree for this speciality** — 3 groups, 26
questions, types `YES_NO` / `CHECKBOX` / `TEXTBOX` (all drawn by
`QuestionRenderer`). Headings use the live `groupName`. Show rules are all
within a group (285 in 100, 286 in 101, 277 in 99). No option has a rating
impact. The captured tree lives in `Quote/__fixtures__/im-question-tree.json`;
`questionTree.fixture.test.ts` pins matchers, Show targets, types and the
Continue gates. Unmapped groups are `console.warn`ed in dev. Don't add
questions from the DPL paper application that aren't in the `ins` tree.

- `/practice` answers (`questionsStore.questionAnswers`, master ids) ride into
  `POST /insured/submission` via `buildSubmissionRequest`'s
  `questionSaveRequest`, scoped to visited groups.
- `/license-scope` saves its whole group with `buildFullGroupSavePayload`;
  `/underwriting` with `buildUnderwritingGroupSavePayload`. **`ins` rejects a
  group saved alone unless every lower-`displayOrder` group is complete**
  (every visible question answered, optional ones too —
  `QuestionsDataServiceImpl.validateGroupSaveOrder`); groups in the same
  request are exempt. So both pages prepend `earlierGroupSaveEntries(...)` —
  the earlier groups rebuilt from the saved submission tree + live edits.
  Never save a later group without them.
- Yes detection is by option **label** (`isYesOption`). Underwriter review
  follows the `ins` option flag `underwriterReviewImpact`
  (`isUnderwriterReviewOption`) — the `/underwriting` highlight, explanation
  field and Continue label, `isReferral`, and the payment summary all key off
  it, never the "Yes" label. The backend makes the actual referral, surfaced
  via application status (as in Nursing).
- Answer maps: `questionAnswers`, `licenseScopeAnswers`, `underwritingAnswers`,
  `impactAnswers` (`questionsStore.ts`).

## ✅ Walkable against local `ins`

Unlike Nursing, IM data **is** seeded on local `ins`: the speciality,
quotedata (ZIP 92653 → total $5,238.06), coverage limits and the question tree
all respond. Signup, submission create, DocuSign and payment create real
records — confirm with the user before exercising them.

## Server state (react-query)

Every server read goes through `@tanstack/react-query` v5
(`src/shared/query/`: singleton `queryClient`, `QueryProvider`, `queryKeys`).
Stores that survive (`questionsStore`, `ilfDlfStore`, `paymentOrderStore`)
hold only non-server state (answer maps, Hide/Show sets, limit/retro
selection) + a synchronous projection for non-hook readers. The submission
tree is fetched in one place (`useSubmissionQuestionsFetch`). Submission
reset / resume call `dropSubmissionScopedQueries()`.
`quoteApi.postInsuredSubmission`'s `inflightSubmissionByKey` dedupes a
mutation (tested race fix) — keep it. New read pages: `useQuery` +
`<AsyncBoundary>`, never a new `*Loading` / `*Error` store field.

## Real pricing, everywhere

Every price reads from `ilfDlfStore` / `useIlfDlfFetcher` (`POST
/auth/quotedata`) via `useQuoteSnapshot()` / `derivedValues.ts`; once a
submission is rated the order's rating wins. The Home Page card waits for a
**"Get estimate"** click (only shown once the speciality has loaded), then
loads `GET /auth/{zip}/coverage-limits` for the limit picker + a retro date
field; later changes re-price (debounced). The picked limit/retro persist on
`ilfDlfStore` and ride into submission create. `useWizardGuards` gates steps
on `ilfDlfHasRequiredDefaults`.

## Error handling & observability

Every crash path funnels through `src/shared/observability/` (`reportError`;
Sentry only when `VITE_SENTRY_DSN` is set). Keep using `logApiError` in
`api/*` / store catch blocks. `ErrorBoundary` `level="root"` / `"route"`.
**Never render a raw `error.message` to users.** Transient-GET retry is
react-query's job.

## Performance, accessibility, styling

- Every routed page is `React.lazy` in `routes/AppRoutes.tsx` — add new pages
  the same way. `manualChunks` splits `vendor-react` / `vendor-query` /
  `vendor-stripe`. Fonts load from one `<link>` in `index.html`.
- Use `<Field>` + `TextInput` / `PasswordInput` / `TextArea` (label wiring via
  `FieldControlContext`); dialogs use `useDialogA11y`; in-text actions are
  `<LegalLink>`; never re-add `outline: none`; secondary text floor `#595959`.
- Theme tokens are CSS custom properties in `src/responsive.css`; shared
  classes in `src/styles/ui.css`. **Never add a `[style*="…"]` selector.**
  Same MedMalGuard design as Nursing — copy changes only.

## Layout quick-reference

| Path                                                                      | What                                                            |
| ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `src/shared/config/product.ts`                                            | The speciality code (one place)                                 |
| `src/modules/Quote/api/specialityApi.ts`                                  | Speciality query — once per page load                           |
| `src/modules/Quote/steps.ts`                                              | Wizard steps + `ins` group matchers                             |
| `src/modules/Quote/api/ratingApi.ts`, `utils/useIlfDlfFetcher.ts`         | `/auth/quotedata`, `/auth/{zip}/coverage-limits`                |
| `src/modules/Quote/api/questionsApi.ts`                                   | Question tree fetch/save + pure Hide/Show / payload helpers     |
| `src/modules/Quote/api/quoteApi.ts`                                       | `POST /insured/submission`, order / policy reads                |
| `src/modules/Quote/pages/{PracticeDetails,LicenseScope,Underwriting}Page` | The three question steps                                        |
| `src/modules/Quote/store/practiceStore.ts`                                | ZIP + effective date (sessionStorage, `q2bim:` prefix)          |
| `src/modules/Quote/store/applicantProfileStore.ts`                        | Identity; DOB / SSN / licence # optional; SSN never in storage  |
| `src/modules/Payment/**`                                                  | DocuSign, Stripe Elements, documents, underwriter-review status |
| `src/shared/services/httpClient.ts`                                       | axios + 401 → refresh → retry                                   |

## Testing

`npm test` (Vitest, node env, `src/**/*.test.{js,ts}`): `product.test.ts`,
`steps.test.ts`, `specialityApi.test.ts`, `questionTree.fixture.test.ts`,
`authSessionService.test.ts` (submission reset keeps the master tree +
speciality), `submission.buildRequest.test.js`, `quoteApi.dedupe.test.js`,
`decimal.test.js`, `safeRedirect.test.js`.

## Local dev against a real `ins`

`vite.config.js` proxies `/api/*` to `VITE_UPSTREAM_URL` (default
`http://localhost:8089`) and rewrites `Set-Cookie` for localhost. Start `ins`
with `ACTIVE_PROFILE=dev-vishal` (workspace backend setup).

## Checks / tooling

`.github/workflows/ci.yml` runs Playwright e2e (blocking) + the
questions-config-drift script (non-blocking, `continue-on-error`, using
`config/upstream.default.js`'s `DEFAULT_UPSTREAM_URL` — currently `localhost`,
so unreachable from CI until this repo has a real one on file like Q2BNfy's)
on PRs to `main` and pushes to `main`. It does not run
`lint` / `format:check` / `typecheck` / `test` / `build` / `lint:cycles` —
run those locally before you push (+ `lint:dead` informational, with
`KNIP_DISABLE_RAW_TRANSFER=1` on this machine). ESLint 9 flat config,
`--max-warnings=0`, every `eslint-disable` carries `-- <reason>`. Prettier
`printWidth: 100`. `useStore` selectors return a primitive / stable ref, or a
fresh value plus an `isEqual` (`shallowEqual`). Node 22 in `.nvmrc` =
`engines` (Vercel reads this) = `netlify.toml` — keep in sync.

## Deploy (Netlify + Vercel)

The same repo deploys to both; each host reads only its own files. **They are
twins — a change to one goes into the other:**

- `netlify.toml` ↔ `vercel.json`: build (`npm run build` → `dist/`), SPA
  rewrite to `index.html`, security headers + CSP, `/assets/*` immutable.
- `netlify/edge-functions/{api-proxy,csp-report}.js` ↔ `middleware.js`
  (Vercel Routing Middleware, Edge runtime): proxies same-origin `/api/*` to
  `VITE_UPSTREAM_URL` with the same request-header allowlist (no `Origin`),
  sets `x-forwarded-host` / `-proto` for the DocuSign return URL, and
  re-emits `Set-Cookie` as a host-only first-party cookie; plus the
  `/_csp-report` log sink.

`VITE_UPSTREAM_URL` is set in each host's environment variables. Keep
`VITE_API_BASE_URL` unset in production. The GitHub remote, Netlify site and
Vercel project are set up by the user.

## Ports

Runs on **4200** (`vite.config.js` `server.port` / `preview.port`,
`package.json` `preview`). Other ports: `npm run dev -- --port <n>`.

## Out of scope for this repo

Any change to `ins`, `service-register` or other platform services.
Additional-insured / entity coverage, joining a group policy, uploads, NPI,
policy servicing (endorsements, renewals, cancellations).
