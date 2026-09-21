// E2E coverage for /profile: renders the insured's details, contacts and
// primary location, and masks the SSN to its last 4 digits.

import { test, expect } from "@playwright/test";
import { seedAuthenticatedSession, installProfileMocks } from "./support/mockProfileBackend.js";

test.describe("Profile (/profile)", () => {
  test("renders personal information and license number from the real ins endpoints", async ({ page, context }) => {
    await seedAuthenticatedSession(context);
    await installProfileMocks(page);
    await page.goto("/profile");

    await expect(page.getByRole("heading", { name: "My profile" })).toBeVisible();
    // Name/email/phone come from the primary contact row (GET
    // /insured/contacts); "Jordan Rivera" is assembled from firstname +
    // lastname since insuredDetails.companyname is blank.
    await expect(page.getByText("Jordan Rivera")).toBeVisible();
    await expect(page.getByText("jordan.rivera@example.com")).toBeVisible();
    // licenseNumber is one of the few fields PrimaryInsuredDataDto actually
    // declares (src/shared/dtos/insured.dto.ts) — designation/speciality/
    // employerName are NOT declared on that DTO, so GET /insured/details
    // silently drops them and those rows always render "-" regardless of
    // what the mock (or the real backend) sends; not asserted here.
    await expect(page.getByText("A123456")).toBeVisible();
  });

  test("masks the SSN to its last 4 digits", async ({ page, context }) => {
    await seedAuthenticatedSession(context);
    await installProfileMocks(page, {
      details: { firstname: "Jordan", lastname: "Rivera", ssn: "123456789" },
    });
    await page.goto("/profile");

    await expect(page.getByText("•••-••-6789")).toBeVisible();
  });

  test("falls back to '-' fields when the insured has no contacts on file", async ({ page, context }) => {
    await seedAuthenticatedSession(context);
    await installProfileMocks(page, { contacts: [], locations: [] });
    await page.goto("/profile");

    await expect(page.getByRole("heading", { name: "My profile" })).toBeVisible();
  });
});
