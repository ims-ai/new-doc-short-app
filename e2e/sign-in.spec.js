// E2E coverage for the returning-user /signin page. Unlike Q2BNfy, this
// build's SignInPage has no "Forgot password?" link — see
// src/modules/Auth/pages/SignInPage.tsx — so that case is intentionally not
// covered here.

import { test, expect } from "@playwright/test";
import { installSignInMocks } from "./support/mockAuthBackend.js";

test.describe("Sign in", () => {
  test("keeps Sign in disabled until email and password meet the minimum shape", async ({ page }) => {
    await installSignInMocks(page);
    await page.goto("/signin");
    // exact:true — MedMalGuardHeader's own nav also renders a "Sign In"
    // ghost button and a "Sign in with Google" button on this page; only the
    // exact, case-sensitive "Sign in" is the form's submit button.
    const submitBtn = page.getByRole("button", { name: "Sign in", exact: true });
    await expect(submitBtn).toBeDisabled();

    await page.getByPlaceholder("jane@example.com").fill("jo");
    await page.getByPlaceholder("Enter your password").fill("12345");
    await expect(submitBtn).toBeDisabled();
  });

  test("signs in with valid credentials and lands on the dashboard", async ({ page }) => {
    const backend = await installSignInMocks(page);
    await page.goto("/signin");
    await page.getByPlaceholder("jane@example.com").fill("jordan.rivera@example.com");
    await page.getByPlaceholder("Enter your password").fill("Passw0rd!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    expect(backend.getSignInCalls()).toHaveLength(1);
    expect(backend.getSignInCalls()[0]).toMatchObject({ username: "jordan.rivera@example.com", password: "Passw0rd!" });
  });

  test("shows an error and stays on the page when the backend rejects the credentials", async ({ page }) => {
    // 401 is one of httpClient's AUTH_BYPASS endpoints (sign-in) AND is
    // explicitly excluded from its 4xx message-enrichment branch (`status
    // !== 401` — see src/shared/services/httpClient.ts), so the alert here
    // ends up showing axios's own generic text, not the mocked API message.
    // Asserted by role rather than exact copy, matching Q2BNfy's own
    // sign-in.spec.js.
    await installSignInMocks(page, { signInStatus: 401, signInMessage: "Invalid username or password." });
    await page.goto("/signin");
    await page.getByPlaceholder("jane@example.com").fill("jordan.rivera@example.com");
    await page.getByPlaceholder("Enter your password").fill("wrongpassword1");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("Get a quote link starts a fresh quote from the landing page", async ({ page }) => {
    await installSignInMocks(page);
    await page.goto("/signin");
    // Two "Get a quote" controls exist on this page: MedMalGuardHeader's own
    // nav CTA, and the form's own LegalLink under "Don't have an account?" —
    // `.last()` targets the latter.
    await page.getByRole("button", { name: "Get a quote", exact: true }).last().click();
    await expect(page).toHaveURL("/");
  });
});
