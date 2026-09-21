// E2E coverage for /binder-invoice. Reached by resuming a PAID order
// directly from the dashboard (see resumeToBinderInvoice) rather than a real
// Stripe payment, which is out of scope for this suite (mockPaymentBackend.js).

import { test, expect } from "@playwright/test";
import { addAuthHintCookie, installWizardMocks } from "./support/mockWizardBackend.js";
import { installBinderMocks } from "./support/mockBinderBackend.js";
import { resumeToBinderInvoice } from "./support/wizardFlow.js";

async function toBinderInvoice(page, context, { generateStatus } = {}) {
  await addAuthHintCookie(context);
  await installWizardMocks(page, { orderOverrides: { policyStatus: "PAID", workflowstatus: "pay" } });
  await installBinderMocks(page, { generateStatus });
  await resumeToBinderInvoice(page);
}

test.describe("Binder & invoice (/binder-invoice)", () => {
  test("renders the payment-successful summary for a PAID order", async ({ page, context }) => {
    await toBinderInvoice(page, context);

    await expect(page.getByRole("heading", { name: "Payment successful" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate Binder & Invoice" })).toBeEnabled();
  });

  test("generating the binder and invoice routes to /complete-order", async ({ page, context }) => {
    await toBinderInvoice(page, context);

    await page.getByRole("button", { name: "Generate Binder & Invoice" }).click();
    await expect(page).toHaveURL(/\/complete-order$/);
  });

  test("a 409 (already generated) shows the already-generated state instead of an error", async ({ page, context }) => {
    await toBinderInvoice(page, context, { generateStatus: 409 });

    await page.getByRole("button", { name: "Generate Binder & Invoice" }).click();
    await expect(page.getByRole("heading", { name: "Already generated" })).toBeVisible();
  });

  test("shows an error and stays on the page when generation fails", async ({ page, context }) => {
    await toBinderInvoice(page, context, { generateStatus: 500 });

    await page.getByRole("button", { name: "Generate Binder & Invoice" }).click();
    await expect(page.getByText("Could not generate binder and invoice.")).toBeVisible();
    await expect(page).toHaveURL(/\/binder-invoice$/);
  });
});
