# new-doc-short-app — Build / Run / CI / Deploy

Last refreshed: 2026-09-30 (from source).

## Toolchain
- **Node 22** — pinned in `.nvmrc`, `package.json` `engines` (`>=22.12 <23`, which Vercel reads) and `netlify.toml` `NODE_VERSION`. `nvm use` picks it up.
- Bundler **Vite 7** (`@vitejs/plugin-react`). TypeScript 5.9 `strict`.

## Scripts (`package.json`)
```
npm run dev            # Vite dev server on :4200 (proxies /api/* → VITE_UPSTREAM_URL, default http://localhost:8089)
npm run build          # production build → dist/
npm run preview        # serve dist/ on :4200
npm run typecheck      # tsc --noEmit
npm run lint           # eslint . --max-warnings=0
npm run lint:fix       # eslint --fix
npm run format         # prettier --write .
npm run format:check   # prettier --check .
npm run lint:cycles    # madge --circular (no import cycles)
npm run lint:dead      # knip (dead code/exports)
npm run lint:arch      # lint:cycles + lint:dead
npm test               # vitest run
npm run test:watch     # vitest watch
npm run test:e2e       # playwright test
npm run test:e2e:headed / :report
npm run check:questions-config-drift   # node scripts/check-questions-config-drift.mjs
```
> Running builds/tests is out of scope for config generation — do not execute them here.

## Tests
- **Vitest** (`vite.config.js` `test`): `environment: "node"`, includes only `src/**/*.test.{js,ts}`. **Pure-logic suite** — product/step config, question-tree contract, request builders, decimal/ILF helpers. No DOM/jsdom.
- **Playwright** (`e2e/*.spec.js`): full-flow browser tests — `anonymous-quote-flow`, `sign-in`, `license-scope`, `underwriting`, `review-docusign`, `payment`, `binder-invoice`, `dashboard`, `profile`. Config in `playwright.config.js`; fixtures/support under `e2e/`.

## Build specifics (`vite.config.js`)
- Output `dist/`. Source maps **off by default**; `hidden` when `VITE_SENTRY_DSN` is set (upload to Sentry, delete from `dist/` before publish — never ship `.map` to the CDN).
- `esbuild.drop: ["debugger"]` on `vite build` (keeps `console.*` intentionally — they are PII-safe diagnostics).
- `manualChunks`: `vendor-react`, `vendor-query`, `vendor-stripe`.

## CI — GitHub Actions
- `.github/workflows/ci.yml` (name **CI**): on `pull_request`/`push` to `main`. Job `e2e` on `ubuntu-latest`: `actions/checkout@v4` → `setup-node@v4` (node 22, npm cache) → `npm ci` → `npx playwright install --with-deps chromium` → `npm run test:e2e` → upload `playwright-report/` artifact (14-day retention).
- This is the **only** CI workflow. No lint/typecheck/unit-test job is wired in CI (they exist as scripts); run them locally before pushing.

## Deploy — static SPA, no container
- **No Dockerfile** in this repo. Deployed as a static build (`dist/`) on **Netlify** (`netlify.toml`, `netlify/edge-functions/`) or **Vercel** (`vercel.json`, `middleware.js`).
- Both platforms run an **edge API proxy** that forwards same-origin `/api/*` to the upstream `ins` host and rewrites auth cookies. The browser never talks cross-origin to `ins`.
- Runtime config is via `VITE_*` build env (see api-client.md) — no secrets in source.

## Prerequisites to run past the landing page
A reachable `ins` INS-SERVICE (default dev upstream `http://localhost:8089`); everything after `/` calls the real WebOrder API.
