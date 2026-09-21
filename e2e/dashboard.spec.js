// E2E coverage for /dashboard: the submissions list, empty state and sign
// out. The "Resume" action itself (routing an open order into the wizard)
// is covered by support/wizardFlow.js's helpers, exercised from
// license-scope.spec.js / underwriting.spec.js / etc.

import { test, expect } from "@playwright/test";
import { seedAuthenticatedSession, installDashboardMocks } from "./support/mockDashboardBackend.js";

test.describe("Dashboard", () => {
  test("shows the empty state when the insured has no submissions", async ({ page, context }) => {
    await seedAuthenticatedSession(context);
    await installDashboardMocks(page, { submissions: [] });
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Welcome back, Jordan" })).toBeVisible();
    await expect(page.getByText("No policies or submissions on file yet.")).toBeVisible();
  });

  test("renders an active policy card with its speciality, period and total", async ({ page, context }) => {
    await seedAuthenticatedSession(context);
    await installDashboardMocks(page, {
      submissions: [
        {
          submissionid: 700900,
          policynumber: "POL-700900",
          ispolicyactive: true,
          statusname: "Policy Active",
          speciality: "Internal Medicine",
          effectivedate: "2026-01-01",
          expireddate: "2027-01-01",
          balance: 5238.06,
        },
      ],
    });
    await page.goto("/dashboard");

    await expect(page.getByText("POL-700900")).toBeVisible();
    await expect(page.getByText("Internal Medicine")).toBeVisible();
    await expect(page.getByText("Policy Active")).toBeVisible();
  });

  test("shows an incomplete-application banner with a Resume action for an open order", async ({ page, context }) => {
    await seedAuthenticatedSession(context);
    await installDashboardMocks(page, {
      submissions: [{ submissionid: 700501, quotenumber: "Q-700501", isopenorder: true, ispolicyactive: false }],
    });
    await page.goto("/dashboard");

    // exact:true — the banner's own body copy ("You have 1 incomplete
    // application...") also contains this substring.
    await expect(page.getByText("Incomplete application", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Resume Q-700501" })).toBeVisible();
  });

  test("signs out and returns to the landing page", async ({ page, context }) => {
    await seedAuthenticatedSession(context);
    const backend = await installDashboardMocks(page, { submissions: [] });
    await page.goto("/dashboard");

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/");
    expect(backend.getLogoutCallCount()).toBe(1);
  });
});
