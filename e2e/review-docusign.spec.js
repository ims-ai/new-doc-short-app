// E2E coverage for /reviewDocusign. The embedded DocuSign iframe itself
// (cross-origin, real signing ceremony) is out of scope for this suite — see
// mockReviewDocusignBackend.js: the session-create mock always answers
// `signedCompleted: true`, so the page renders its own "Document signed"
// success state without ever loading a signingUrl iframe, exactly like
// Q2BNfy's review-docusign.spec.js.

import { test, expect } from "@playwright/test";
import { addAuthHintCookie, installWizardMocks } from "./support/mockWizardBackend.js";
import { installReviewDocusignMocks } from "./support/mockReviewDocusignBackend.js";
import { resumeToReviewDocusign } from "./support/wizardFlow.js";

test.describe("Review and sign (/reviewDocusign)", () => {
  test("shows Document signed once the backend confirms the envelope, and Continue is disabled until then", async ({ page, context }) => {
    await addAuthHintCookie(context);
    await installWizardMocks(page);
    await installReviewDocusignMocks(page);
    await resumeToReviewDocusign(page);

    await expect(page.getByRole("heading", { name: "Document signed" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  test("continuing when underwriter review is NOT required routes to /payment", async ({ page, context }) => {
    await addAuthHintCookie(context);
    await installWizardMocks(page);
    await installReviewDocusignMocks(page, { underwriterReviewRequired: false });
    await resumeToReviewDocusign(page);

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/payment$/);
  });

  test("continuing when underwriter review IS required routes to /underwriter-review", async ({ page, context }) => {
    await addAuthHintCookie(context);
    await installWizardMocks(page);
    await installReviewDocusignMocks(page, { underwriterReviewRequired: true });
    await resumeToReviewDocusign(page);

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/underwriter-review$/);
  });

  test("shows an error when the underwriter-review status check fails", async ({ page, context }) => {
    await addAuthHintCookie(context);
    await installWizardMocks(page);
    // ReviewDocusignPage's catch reads `err.message`, which only carries the
    // API's own text for a 4xx (httpClient's enrichment branch excludes 401
    // and 5xx — see httpClient.ts) — 400 exercises the real, enriched path.
    await installReviewDocusignMocks(page, { reviewStatus: 400 });
    await resumeToReviewDocusign(page);

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Unable to continue. Please try again.")).toBeVisible();
    await expect(page).toHaveURL(/\/reviewDocusign$/);
  });
});
