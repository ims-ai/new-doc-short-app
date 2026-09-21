// E2E coverage for /payment. See mockPaymentBackend.js for why the full
// "Pay" happy path (which needs a real/faked Stripe Elements card field) is
// out of scope for this suite — mirrors Q2BNfy's payment.spec.js exactly.

import { test, expect } from "@playwright/test";
import { addAuthHintCookie, installWizardMocks } from "./support/mockWizardBackend.js";
import { installReviewDocusignMocks } from "./support/mockReviewDocusignBackend.js";
import { installPaymentMocks } from "./support/mockPaymentBackend.js";
import { resumeToPayment } from "./support/wizardFlow.js";
import { SUBMISSION_ID } from "./fixtures/questions.js";

async function toPayment(page, context, paymentOpts = {}) {
  await addAuthHintCookie(context);
  await installWizardMocks(page);
  await installReviewDocusignMocks(page);
  await installPaymentMocks(page, paymentOpts);
  await resumeToPayment(page);
}

test.describe("Payment", () => {
  test("renders the submission summary once the order loads", async ({ page, context }) => {
    await toPayment(page, context);

    await expect(page.getByText(`#${SUBMISSION_ID}`, { exact: true })).toBeVisible();
    // "Jordan Rivera" also renders in the QuoteSnapshotRail sidebar —
    // `.first()` targets the submission-summary card's own row.
    await expect(page.getByText("Jordan Rivera").first()).toBeVisible();
  });

  test("shows an unavailable message and keeps Pay disabled when the publishable key fails to load", async ({ page, context }) => {
    await toPayment(page, context, { publishableKeyStatus: 500 });

    await expect(page.getByText("Payment form unavailable")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Pay/ })).toBeDisabled();
  });

  test("keeps Pay disabled until the card form reports a complete card", async ({ page, context }) => {
    await toPayment(page, context);
    // Stripe's real script is blocked (see mockPaymentBackend.js), so the
    // card field can never report complete — Pay must stay disabled.
    await expect(page.getByRole("button", { name: /^Pay/ })).toBeDisabled();
  });
});
