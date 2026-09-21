// Speciality + pricing fixtures for the Internal Medicine build
// (PRODUCT.specialityCode "SP_14_1" -> specialities_master.id 10512 on local
// `ins`, per src/shared/config/product.ts and the repo CLAUDE.md). Tests
// never hard-code the speciality code themselves (ESLint forbids it in
// src/); this file only echoes back whatever the mocked GET
// /auth/speciality/:code response would report, keyed to SPECIALITY_ID from
// fixtures/questions.js so every mock in a test agrees on the same id.

import { SPECIALITY_ID } from "./questions.js";

export const SPECIALITY_RESPONSE = {
  id: SPECIALITY_ID,
  title: "Internal Medicine",
  code: "SP_14_1",
};

/**
 * ILF/DLF defaults that satisfy `ilfDlfHasRequiredDefaults` (see
 * modules/Quote/utils/ilfHelpers.ts — every one of these fields must be a
 * positive number for the landing calculator / SoftQuotePage to treat the
 * ZIP as ratable and advance instead of showing "No data available for this
 * ZIP code").
 */
export const VALID_QUOTEDATA_RESPONSE = {
  zipcode: "92653",
  st: "CA",
  state: "California",
  city: "Newport Beach",
  defaultParttimeFulltimeFactor: 1,
  defaultIlfDlf: 10,
  defaultSurgery: 5,
  defaultyear: 1,
  premium: 4800,
  total: 5238.06,
  defaultIlfDlfName: "1M / 3M",
  defaultDefense: "Included",
  effectiveDate: "12/01/2026",
  fees: [{ label: "Policy fee", value: 250 }],
  taxes: [{ label: "State tax", value: 188.06 }],
};

/** GET /auth/{zip}/coverage-limits — the limit picker options. */
export const COVERAGE_LIMITS_RESPONSE = [
  { id: 1, limit: "1M / 3M", isDefault: true },
  { id: 2, limit: "2M / 6M", isDefault: false },
];
