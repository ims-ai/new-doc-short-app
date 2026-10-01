---
name: document-change
description: How to safely change the document + e-signature part of this Quote-to-Bind portal — the embedded DocuSign signing ceremony (Review & sign, step 6), underwriter-review branch, binder-invoice generation, and the binary PDF document downloads (quote, COI, binder, policy, invoice, signed envelope, payment receipt). Use when touching the DocuSign flow, `Payment/api/paymentApi.ts`, `Payment/utils/downloads.ts`, `ReviewDocusignPage`, or any `/documents` / `/invoice` call. Read the codebase-map skill first.
---

# Document & signing changes (new-doc-short-app)

This app does not manage documents on its own — it drives **INS-SERVICE (`ins`)** endpoints for DocuSign signing and PDF documents. There is no local generation/fallback: every document is a real binary from `ins`. Read the `codebase-map` skill (`references/api-client.md`) before changing anything here, and apply the `react-engineering` skill for the React side.

## Where the document flow lives
- `src/modules/Payment/api/paymentApi.ts` — the whole document + signing + payment API surface.
- `src/modules/Payment/pages/ReviewDocusignPage.tsx` — the embedded signing ceremony (wizard step 6, `/reviewDocusign`).
- `src/modules/Payment/pages/BinderInvoicePage.tsx` — binder & invoice (step 8).
- `src/modules/Payment/utils/downloads.ts` — page-side wrappers around each document download (COI, quote, binder, invoice, policy, signed, payment-receipt) with friendly per-status error text.
- `src/modules/Payment/services/paymentOrderService.ts` + `store/paymentOrderStore.ts` — order/`workflowstatus` sync that the signing page reads.
- `src/shared/components/desktop/HubCOIPreview.tsx` — COI preview widget.
- DTO: `DocuSignEmbeddedSigningResponse` in `src/shared/dtos/`.

## Backend contract (all under `/api/weborder/v1`)
- `POST /documents/{sid}/docusign?returnUrl=…` → `{ signingUrl, signedCompleted }`. Idempotent-ish: re-POSTing evicts the cached DocuSign status, re-checks the envelope, flips the order workflow to `pay` when signed, and answers `signedCompleted`.
- `PUT /insured/{sid}/underwriter-review-status` → `true` when underwriter review is required (routes to `/underwriter-review` instead of `/payment`).
- `POST /invoice/{sid}/generate-binder-invoice`.
- `GET /documents/{sid}/{kind}/download` (binary PDF, `responseType: "arraybuffer"`) — kinds map to backend paths in `DOCUMENT_KINDS`:
  - `quote` → `estimate-quote/download`
  - `coi` → `insured-certificate/download`
  - `binder` → `binder/download`
  - `policy` → `policy/download`
  - `invoice` → `invoice/download`
  - `signed` → `signed/download` (409 until the envelope is signed)
  - `payment-receipt` → `payment-receipt/download` (404 no payment / 409 not settled)

## The DocuSign completion problem (read before editing `ReviewDocusignPage`)
The DocuSign return URL **cannot be trusted or relied on**:
1. **Not trusted** — a user could navigate to `/reviewDocusign?event=signing-complete` to skip signing. So completion is only accepted after the backend confirms it (`refreshPaymentOrder` → `workflowstatus === "pay"`, or the session re-POST returns `signedCompleted`).
2. **Not reliable** — the prod edge proxy strips `Origin`/`Referer`/`X-Forwarded-*`, so `ins` builds a return URL to the API host, which isn't in the iframe `frame-src` allowlist; the return-URL params and same-origin `postMessage` relay may never reach the page.

Completion is therefore detected by **three cooperating mechanisms**, all backed by a server check:
- return-URL param match (`isDocuSignCompletedUrl`) → refresh order, accept only if `workflowstatus === "pay"`;
- `postMessage` (same-origin relay + native DocuSign events);
- a **backend verification ladder** (`runVerifyLadder` / `verifySignedWithBackend`) triggered when the iframe navigates away from the ceremony — re-POSTs the signing session on a backoff (`[0, 3s, 8s, 15s]`), throttled (`VERIFY_THROTTLE_MS`), capped (`VERIFY_MAX_RUNS`). Any returned `signingUrl` is **discarded** (never swap it into the iframe mid-ceremony).

If you change completion handling, keep all three paths gated on the server truth — never mark signed on a URL/postMessage claim alone.

## Rules for changes here
- **Never trust client-side signals for money/legal state.** Signed / paid / issued is whatever `ins` says; the UI reflects it, it does not decide it.
- **Preserve the iframe hardening** in `ReviewDocusignPage`: `sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"`, `referrerPolicy="no-referrer"` (stops the one-time signing URL leaking), and the `frame-src`/CSP allowlist. Do not widen the sandbox to "make it work".
- **Documents carry PII** (name, DOB, SSN, address, billing) and live only in the browser (no server of our own). Never log document bytes, the signing URL, or `.config.data`; route errors through `logApiError` / `reportError`, which scrub in production. Respect the security rule.
- **Add a new document kind** only in `DOCUMENT_KINDS` (`paymentApi.ts`) + a thin `downloads.ts` wrapper; confirm the backend path exists on `ins`'s `DocumentsController` first (grounding rule — inspect, don't assume). Map known preconditions to friendly status text (see `downloadSigned` / `downloadPaymentReceipt` 404/409 handling), don't surface a raw axios message.
- **Downloads are gated by real state**: binder/invoice/policy require an active/issued policy (`isActive`); COI/quote are always available; signed/receipt are gated server-side by 409/404. Keep the gate where it already is.
- Use `withCredentials: true` (cookie auth) on every call; never add a bearer token or hardcode the `ins` host — go through `apiUrl(...)`.
- After a signing/order state change, keep the order projection fresh (`refreshPaymentOrder(sid)` / invalidate `queryKeys.order.detail(sid)`) so `workflowstatus` and downstream steps match reality.

## Validate (per Definition of Done — with evidence, no unsupported PASS)
- `npm run typecheck` and `npm run lint` clean.
- `npm test` (pure-logic) for any request-builder/kind-map change.
- **`npm run test:e2e` — `e2e/review-docusign.spec.js` and `e2e/binder-invoice.spec.js`** are the real coverage for this flow; run them (and payment.spec.js if payment-adjacent) and cite the result.
- Manually confirm completion is still driven by the backend (`workflowstatus === "pay"` / `signedCompleted`), not by a URL param, before claiming done.
