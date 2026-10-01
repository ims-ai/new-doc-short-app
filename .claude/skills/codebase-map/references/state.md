# new-doc-short-app — State management

Last refreshed: 2026-09-30 (from source). Two clearly separated layers. **No Redux/Zustand/Jotai/Recoil** — do not introduce one (`react-engineering` skill).

## Server state → TanStack Query v5 (standardized here)
- Provider: `src/shared/query/QueryProvider.tsx` wraps the app (in `App.tsx`).
- Client: `src/shared/query/queryClient.ts` — a single module-level `queryClient` singleton (also reachable from non-component code: bootstrap hooks, resume-order handler).
  - Defaults tuned for a linear funnel: `staleTime 30s`, `gcTime 5m`, `refetchOnWindowFocus: false` (don't re-fire `/insured/order` when the user tabs to DocuSign/bank mid-flow), `refetchOnReconnect: true`.
  - **Retry policy:** up to 2 retries for 5xx/network with exponential backoff + jitter; **never retry 4xx**, and **never retry 401** (the httpClient interceptor owns refresh-and-retry). Mutations are not retried (POSTs here — submission create, payment confirm, question save — are not idempotent).
  - `httpStatusOf(error)` extracts the status off the axios error shape.
- Query keys: **central factory** in `src/shared/query/keys.ts` (`queryKeys.*`). Convention `[domain, resource, ...params]`, params stringified so `123`/`"123"` don't split the cache. Domains: `dashboard`, `profile`, `order`, `payment`, `questions`, `rating`, `speciality`. **Use this factory — never hand-write a key array** so reads and invalidations can't drift.
- `useQuery`/`useMutation` live in pages and a few shared/bootstrap spots: `Dashboard/pages/*`, `Payment/pages/PaymentPage`, `Payment/pages/CompleteOrderPage`, `Profile/pages/ProfilePage`, `Quote/api/specialityApi.ts`, `shared/components/AsyncBoundary.tsx`, `shared/store/bootstrap/useSubmissionQuestionsFetch.ts`.

## Local / global client state → class-store + `useSyncExternalStore`
- Binding hook: `src/shared/store/useStore.ts` — `useStore(store, selector, isEqual?)`. Each store is a class exposing `subscribe(listener) => unsubscribe` (private `#listeners` Set + `#notify`), structurally satisfying `Subscribable`.
  - **Selector rule:** a selector must return a primitive/stable reference, OR a fresh value **plus** an `isEqual` comparator (use `shallowEqual` for a bag of primitive fields) — otherwise React's `getSnapshot` warns / can infinite-loop.
- Stores:
  - `shared/store/`: `sessionStore.ts`, `insuredProfileStore.ts`, `modalStore.ts`.
  - `Quote/store/`: `submissionStore.ts` (flow submission id, `step`), `questionsStore.ts`, `practiceStore.ts`, `attestStore.ts`.
  - `Payment/store/`: `paymentOrderStore.ts` (`paymentOrderDetails`, `workflowstatus`).
  - `Auth/store/authFormStore.ts`, `Dashboard/store/`, etc.
- Local UI state uses `useState`; complex local state `useReducer` (per `react-engineering`).

## App bootstrap (`shared/store/useAppBootstrap.ts` + `store/bootstrap/`)
Called once by `AppShell`. Composes hooks that reconcile URL, session and cached server state:
- `useSessionRestore` — restore auth session on load.
- `useOrderRehydrate` — rebuild the in-progress order (reaches the query cache imperatively).
- `useSpecialityPrefetch` — prefetch the speciality lookup.
- `useSubmissionQuestionsFetch` / `useAnswerResetOnSubmissionChange` / `useAnswerResetOnQuoteLanding` — question-tree fetch + answer resets.
- `usePathStepSync` — keep wizard `step` in sync with the URL.
- `useAuthNavigatorSync` — register the SPA navigator with httpClient (for 401 redirects).
- `useObservabilityUser` — attach the user to Sentry.

## Persistence
- `localStorage`: only `q2b_theme` survives an auth wipe (see `httpClient.clearAuthStorage`).
- `sessionStorage`: session-scoped shadow state (prefix `q2bim:` per `product.ts`); cleared wholesale on auth wipe.
