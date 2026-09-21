# Contributing to Q2BInternalMedicine

A short guide to the local workflow and what the checks enforce. Read
`README.md` for the app overview and `CLAUDE.md` for the architecture rules
that matter most when changing code.

## Setup

```bash
nvm use            # Node from .nvmrc (22.x) — must match package.json engines
npm ci
# .env.local: VITE_UPSTREAM_URL=http://localhost:8089 (a running ins)
npm run dev        # http://localhost:4200
```

## The checks

CI (`.github/workflows/ci.yml`) runs Playwright e2e on every PR to `main` and
every push to `main`; the questions-config-drift check runs alongside it
(against `config/upstream.default.js`'s `DEFAULT_UPSTREAM_URL`, currently
`localhost` and thus unreachable from CI) but is non-blocking. Run these
locally before you push — CI doesn't cover them:

| Command                | What it checks                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run lint`         | ESLint (`--max-warnings=0`) — correctness, `react-hooks`, `jsx-a11y`, stale `eslint-disable`, speciality |
| `npm run format:check` | Prettier — formatting only                                                                               |
| `npm run typecheck`    | `tsc --noEmit` (`strict`)                                                                                |
| `npm test`             | Vitest (pure-logic suite)                                                                                |
| `npm run build`        | `vite build`                                                                                             |
| `npm run lint:cycles`  | `madge` — no import cycles                                                                               |
| `npm run lint:dead`    | `knip` — unused files / exports / deps (informational)                                                   |

`npm run lint:fix` and `npm run format` auto-fix most lint/format failures.

### The speciality code

`src/shared/config/product.ts` is the only file allowed to contain a
speciality code (ESLint `no-restricted-syntax`). Everything else reads
`PRODUCT.specialityCode`; the numeric id comes from `ins` at runtime.

### On `eslint-disable`

Every `// eslint-disable*` must carry a `-- <reason>` explaining why the rule
is wrong _here_. Lint fails on a directive that no longer suppresses anything
(`reportUnusedDisableDirectives: "error"`). Don't add a blanket file-level
disable — fix the code or justify the single line.

### On `any`

`@typescript-eslint/no-explicit-any` is **off** on purpose (see
`eslint.config.js`): `ins` owns the order / policy / question / submission
row shapes and doesn't publish them, so they're typed `any`. Everything that
_is_ typed stays under `strict`. Don't add `any` to code that could be typed.

## Commits

- **One logical change per commit.** Module-scoped conventional-commit
  subjects: `feat(payment): …`, `fix(quote): …`, `refactor(auth): …`,
  `docs: …`, `chore: …`.
- A pure-formatting or codemod commit goes in on its own and is added to
  `.git-blame-ignore-revs` (configure once with
  `git config blame.ignoreRevsFile .git-blame-ignore-revs`).
- A change to UI must say how it was checked for keyboard + screen-reader use.
- **Never change a linked platform service** (`ins`, `service-register`, …) —
  see `CLAUDE.md` → "Out of scope for this repo".
- Structure and file names mirror `Q2BNursing` on purpose, so fixes port
  between the two repos by diff — keep it that way.

## Architecture decisions

Anything that changes a cross-cutting pattern — a new state or data-fetching
approach, a routing change, a build/deploy change — gets a short entry in
`docs/adr/`. Copy `docs/adr/TEMPLATE.md`, number it next in sequence, and
link it from `docs/adr/README.md`.
