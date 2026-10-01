# new-doc-short-app — Style Guide (repo-specific conventions)

> **Curated, hand-maintained.** Captures only what is specific to `new-doc-short-app`. It does NOT repeat the
> workspace-wide standards — those are always-on and authoritative:
> - `.claude/rules/frontend.md`, `.claude/rules/general-engineering.md`, `.claude/rules/security.md`
> - How-to: the global **`react-engineering`** skill (structure, components, hooks, routing, forms/validation, API integration, state, testing, performance, a11y).
>
> **Load this when:** writing/changing code in `new-doc-short-app`. Read `react-engineering` for the how-to; this for the local specifics.

## Stack & app
- **React 18 + Vite (quote-to-bind)**.
- Match the app's existing component/hook patterns and state approach — read `codebase-map` first.

## Conventions
- Call the backend through the app's configured API client; **never hardcode a full backend URL** — use the API-base/config abstraction.
- Handle every UI state: **loading, empty, error, disabled, validation**.
- **No secrets** in the bundle or `VITE_*`/public env — fetch runtime secrets from the backend.
- Baseline a11y (labels, roles, keyboard, focus); route API errors through a PII-safe helper.

## This app
- Domain how-to: **`document-change`**.
- Don't change a consumed **API contract** from the frontend without an `api-integration-audit` + backend check.
