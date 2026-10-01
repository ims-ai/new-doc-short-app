# new-doc-short-app — Components & layout

Last refreshed: 2026-09-30 (from source). Functional components + hooks only, TypeScript strict. Styling is a mix of a shared CSS layer (`responsive.css`, `styles/ui.css`, `shared/styles.css`) and inline style objects/helpers (`shared/utils/styles`).

## App composition (`App.tsx`)
```
<ErrorBoundary level="root">
  <QueryProvider>
    <BrowserRouter>
      <Shell>            // app frame (layout/Shell)
        <AppRoutes/>     // routed, lazy pages
        <Modals/>        // global modal host (layout/Modals)
      </Shell>
    </BrowserRouter>
  </QueryProvider>
</ErrorBoundary>
```
`AppShell` calls `useAppBootstrap` on mount (session restore, order rehydrate, path/step sync — see state.md).

## Layout chrome (`src/layout/`)
- `Shell` — top-level app frame (header/nav/theme).
- `FlowLayout` — the wizard frame; renders `<LandingView>` at `/` and an `<Outlet>` for wizard steps; owns per-page splitting alongside `AppRoutes`.
- `wizard/` — `useWizardGuards.ts` (step/auth gating), `useWizardBackNav.ts` (Back navigation rules).
- `modals/` — `FAQModal`, `PrivacyModal`, `TermsModal`.

## Shared components (`src/shared/components/`)
- `ErrorBoundary` — class error boundary (root level in `App.tsx`; also used per-route via `routes/RouteErrorBoundary.tsx`).
- `AsyncBoundary` — wraps a subtree for combined loading/error handling around TanStack Query reads (uses `useQuery`).
- `Alert` — inline error/status message (used across pages, e.g. DocuSign errors).
- `Icon` — inline SVG icon wrapper (`d`, `size`, `stroke`, `sw` props).
- `desktop/` — desktop-only widgets: `HubCOIPreview` (certificate-of-insurance preview), `hubData`.

## Routed pages (`src/modules/**/pages/`)
See routing.md for the URL for each. Pages are thin: they read server state via TanStack Query hooks and stores via `useStore`, call `api/`/`services/`, and render UI states (loading/empty/error/disabled/validation per the `react-engineering` skill).

Notable page: `Payment/pages/ReviewDocusignPage.tsx` — the embedded DocuSign signing ceremony (iframe with zoom controls, `postMessage` + return-URL completion detection, backend verification ladder, sandboxed iframe with `referrerPolicy="no-referrer"`). See the `document-change` skill for the full flow.

## UI-state & a11y expectations
- Every screen handles loading, empty, error, disabled and validation states; responsive; accessible.
- Accessibility helpers in `src/shared/a11y/` (e.g. `useDialogA11y`); follow the `react-engineering` skill's `references/accessibility.md`.
- No `dangerouslySetInnerHTML` without sanitizing (security rule).
