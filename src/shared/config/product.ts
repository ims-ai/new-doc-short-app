/**
 * THE single source of truth for which product this build is.
 *
 * To change the speciality, edit `specialityCode` here — nothing else in the
 * repo names a speciality code (enforced by ESLint `no-restricted-syntax`, see
 * eslint.config.js). The code is resolved to its numeric
 * `specialities_master.id` at runtime (`GET /auth/speciality/{code}`, see
 * `Quote/api/specialityApi.ts`); the id is never hard-coded — it can differ
 * per database.
 */
export const PRODUCT = Object.freeze({
  /** ins specialities_master.code — Internal Medicine (id 10512 on local ins, 2026-09-11). */
  specialityCode: "SP_14_1",

  // Pre-fetch fallback only — the UI shows the API's `title` once loaded.
  name: "Internal Medicine",

  /** Prefix for this app's own sessionStorage keys. */
  storagePrefix: "q2bim:",
  documentTitle: "Internal Medicine Quote to Bind",
});
