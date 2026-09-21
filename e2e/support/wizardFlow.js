import { expect } from "@playwright/test";

// The full "/" landing -> /quote -> /practice -> /register signup walk is
// exercised directly in anonymous-quote-flow.spec.js (it needs the signup
// and submission-create mock handles for its own assertions, so it isn't
// factored out here). Every helper below instead starts from an
// already-authenticated dashboard Resume — see resumeToLicenseScope.

/**
 * Faster path for suites that need to be PAST signup: dashboard "Resume" on
 * a fresh OPEN_ORDER submission, which `DashboardPage.handleResumeOrder`
 * routes to `/license-scope` (the wizard's `abandonedStep`). Requires
 * `installWizardMocks` (+ `addAuthHintCookie`) to already be installed.
 */
export async function resumeToLicenseScope(page) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /^Resume/ }).click();
  await expect(page).toHaveURL(/\/license-scope$/);
}

/**
 * Continues past resumeToLicenseScope: the fixture's "License, Scope &
 * Practice" questions are all optional, so Continue is enabled as soon as
 * the group loads — no answers are required to reach Underwriting.
 */
export async function resumeToUnderwriting(page) {
  await resumeToLicenseScope(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/underwriting$/);
}

/**
 * Continues past resumeToUnderwriting: answers both required yes/no
 * underwriting questions "No" (neither is flagged `underwriterReviewImpact`
 * on "No" — see fixtures/questions.js), so no follow-up "Please provide
 * explanation" textbox is required, and submits, landing on
 * `/reviewDocusign`.
 */
export async function resumeToReviewDocusign(page) {
  await resumeToUnderwriting(page);
  const noButtons = page.getByRole("button", { name: "No", exact: true });
  await noButtons.nth(0).click();
  await noButtons.nth(1).click();
  await page.getByRole("button", { name: "See my final quote" }).click();
  await expect(page).toHaveURL(/\/reviewDocusign$/);
}

/**
 * Continues past resumeToReviewDocusign: the mocked DocuSign session always
 * reports `signedCompleted: true` (see installReviewDocusignMocks), so the
 * page shows "Document signed" immediately with no iframe to drive. Clicking
 * its own Continue calls `putUnderwriterReviewStatus` and — when review isn't
 * required — lands on `/payment`.
 */
export async function resumeToPayment(page) {
  await resumeToReviewDocusign(page);
  await expect(page.getByText("Document signed")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/payment$/);
}

/**
 * /binder-invoice is unreachable through a real Stripe payment in this suite
 * (see mockPaymentBackend.js), so this shortcuts straight there: a PAID
 * order's dashboard Resume routes directly to `/binder-invoice`
 * (`DashboardPage.handleResumeOrder`'s BINDER_NEEDED_STATUSES branch), no
 * wizard steps in between. Requires `installWizardMocks` to have been called
 * with `orderOverrides: { policyStatus: "PAID" }` (+ `addAuthHintCookie`).
 */
export async function resumeToBinderInvoice(page) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /^Resume/ }).click();
  await expect(page).toHaveURL(/\/binder-invoice$/);
}
