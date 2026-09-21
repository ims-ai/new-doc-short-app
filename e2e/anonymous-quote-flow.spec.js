// E2E coverage for the anonymous (pre-signup) part of the funnel: the "/"
// landing calculator -> /quote (soft estimate) -> /practice (master
// question tree) -> /register (signup + real submission create), landing on
// /license-scope. Real UI throughout; only the network layer is mocked
// (e2e/support/mockAnonymousBackend.js). Mirrors Q2BNfy's
// anonymous-quote-flow.spec.js, adapted to this app's own copy/fields/steps.

import { test, expect } from "@playwright/test";
import { installAnonymousFlowMocks } from "./support/mockAnonymousBackend.js";
import { VALID_QUOTEDATA_RESPONSE } from "./fixtures/speciality.js";

const ZIP = "92653";
const EFF_DATE = "12/01/2026";

async function toQuote(page, backendOpts = {}) {
  const backend = await installAnonymousFlowMocks(page, backendOpts);
  await page.goto("/");
  await page.getByPlaceholder("e.g. 92653").fill(ZIP);
  await page.getByPlaceholder("MM/DD/YYYY").fill(EFF_DATE);
  await page.getByRole("button", { name: "Get estimate" }).click();
  return backend;
}

async function toPractice(page, backendOpts = {}) {
  const backend = await toQuote(page, backendOpts);
  const continueBtn = page.getByRole("button", { name: "Continue with this estimate" });
  await expect(continueBtn).toBeEnabled();
  await continueBtn.click();
  await expect(page).toHaveURL(/\/quote$/);
  await page.getByRole("button", { name: "Continue to full application" }).click();
  await expect(page).toHaveURL(/\/practice$/);
  return backend;
}

async function toRegister(page, backendOpts = {}) {
  const backend = await toPractice(page, backendOpts);
  const noButtons = page.getByRole("button", { name: "No", exact: true });
  await noButtons.nth(0).click();
  await noButtons.nth(1).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/register$/);
  return backend;
}

test.describe("Landing calculator (Instant estimate)", () => {
  test("keeps Continue disabled until a ratable ZIP + date produce an estimate", async ({ page }) => {
    await installAnonymousFlowMocks(page);
    await page.goto("/");
    // Button copy is state-driven (MedMalGuardLanding's handleContinue CTA):
    // "Fill in every field to continue" until an estimate exists, then
    // "Continue with this estimate" once hasEstimate is true.
    await expect(page.getByRole("button", { name: "Fill in every field to continue" })).toBeDisabled();

    await page.getByPlaceholder("e.g. 92653").fill(ZIP);
    await page.getByPlaceholder("MM/DD/YYYY").fill(EFF_DATE);
    // "Get estimate" only appears once both fields are valid; clicking it is
    // what fires POST /auth/quotedata — Continue stays disabled until then.
    await expect(page.getByRole("button", { name: "Fill in every field to continue" })).toBeDisabled();
  });

  test("advances to /quote once an estimate has loaded", async ({ page }) => {
    await toPractice(page);
  });

  test("shows the typo-preserved backend copy and keeps Continue disabled when the ZIP has no ratable data", async ({ page }) => {
    await installAnonymousFlowMocks(page, {
      quotedataResponse: { ...VALID_QUOTEDATA_RESPONSE, defaultIlfDlf: 0, defaultSurgery: 0 },
    });
    await page.goto("/");
    await page.getByPlaceholder("e.g. 92653").fill(ZIP);
    await page.getByPlaceholder("MM/DD/YYYY").fill(EFF_DATE);
    await page.getByRole("button", { name: "Get estimate" }).click();

    // useIlfDlfFetcher.js's own copy (a real typo in the source: "avaliable"),
    // surfaced verbatim by the landing calculator's error box.
    await expect(page.getByText("Not data avaliable for this zipcode")).toBeVisible();
    // ilfDlfError is set -> the CTA switches to "Fix the details above…".
    await expect(page.getByRole("button", { name: "Fix the details above to continue" })).toBeDisabled();
    await expect(page).toHaveURL("/");
  });
});

test.describe("About your practice (/practice)", () => {
  test("keeps Continue disabled until both required yes/no questions are answered", async ({ page }) => {
    await toPractice(page);
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();

    const noButtons = page.getByRole("button", { name: "No", exact: true });
    await noButtons.nth(0).click();
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
    await noButtons.nth(1).click();
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  test("a Yes answer reveals the tree's own 'Please explain' follow-up (Show rule)", async ({ page }) => {
    await toPractice(page);
    await expect(page.getByText("Please explain")).not.toBeVisible();
    await page.getByRole("button", { name: "Yes", exact: true }).first().click();
    await expect(page.getByText("Please explain")).toBeVisible();
  });

  test("advances to /register once both required questions are answered", async ({ page }) => {
    await toRegister(page);
  });
});

test.describe("Create your account (/register)", () => {
  test("keeps the submit button disabled while required fields are invalid", async ({ page }) => {
    await toRegister(page);
    const submitBtn = page.getByRole("button", { name: "Create account & start application" });
    await expect(submitBtn).toBeDisabled();

    await page.getByPlaceholder("Jane").fill("Jordan");
    await page.getByPlaceholder("Doe").fill("Rivera");
    await page.getByPlaceholder("you@example.com").fill("jordan.rivera@example.com");
    // Weak password (no special character) — isValidPassword() rejects it.
    await page.getByPlaceholder("Create a strong password").fill("password1");
    await page.getByPlaceholder("(555) 123-4567").fill("5551234567");
    await page.getByPlaceholder("Street address").fill("456 Oak Avenue");
    await page.getByPlaceholder("City").fill("Newport Beach");
    await page.getByPlaceholder("CA").fill("CA");
    await page.getByPlaceholder("92653").fill("92653");
    await expect(submitBtn).toBeDisabled();
  });

  test("signs up, creates the real submission, and lands on /license-scope", async ({ page }) => {
    const backend = await toRegister(page);

    await page.getByPlaceholder("Jane").fill("Jordan");
    await page.getByPlaceholder("Doe").fill("Rivera");
    await page.getByPlaceholder("you@example.com").fill("jordan.rivera@example.com");
    await page.getByPlaceholder("Create a strong password").fill("Passw0rd!");
    await page.getByPlaceholder("(555) 123-4567").fill("5551234567");
    await page.getByPlaceholder("Street address").fill("456 Oak Avenue");
    await page.getByPlaceholder("City").fill("Newport Beach");
    await page.getByPlaceholder("CA").fill("CA");
    await page.getByPlaceholder("92653").fill("92653");

    await page.getByRole("button", { name: "Create account & start application" }).click();
    await expect(page).toHaveURL(/\/license-scope$/);

    expect(backend.getSignupCalls()).toHaveLength(1);
    expect(backend.getSignupCalls()[0]).toMatchObject({
      firstName: "Jordan",
      lastName: "Rivera",
      email: "jordan.rivera@example.com",
    });
    expect(backend.getSubmissionCalls()).toHaveLength(1);
  });

  test("shows an error and stays on the page when signup is rejected (e.g. duplicate email)", async ({ page }) => {
    await toRegister(page, { signupStatus: 409, signupMessage: "An account with this email already exists." });

    await page.getByPlaceholder("Jane").fill("Jordan");
    await page.getByPlaceholder("Doe").fill("Rivera");
    await page.getByPlaceholder("you@example.com").fill("jordan.rivera@example.com");
    await page.getByPlaceholder("Create a strong password").fill("Passw0rd!");
    await page.getByPlaceholder("(555) 123-4567").fill("5551234567");
    await page.getByPlaceholder("Street address").fill("456 Oak Avenue");
    await page.getByPlaceholder("City").fill("Newport Beach");
    await page.getByPlaceholder("CA").fill("CA");
    await page.getByPlaceholder("92653").fill("92653");

    await page.getByRole("button", { name: "Create account & start application" }).click();

    await expect(page.getByText("An account with this email already exists.")).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });
});
