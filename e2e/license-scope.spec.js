// E2E coverage for /license-scope ("License, Scope & Practice"). Reached via
// dashboard Resume (see support/wizardFlow.js) rather than replaying the
// whole signup funnel — anonymous-quote-flow.spec.js already covers that
// walk. Real UI throughout; only the network layer is mocked
// (e2e/support/mockWizardBackend.js).

import { test, expect } from "@playwright/test";
import { addAuthHintCookie, installWizardMocks } from "./support/mockWizardBackend.js";
import { resumeToLicenseScope } from "./support/wizardFlow.js";
import { SUBMISSION_ID } from "./fixtures/questions.js";

test.describe("License, Scope & Practice (/license-scope)", () => {
  test("renders the live group name and its questions", async ({ page, context }) => {
    await addAuthHintCookie(context);
    await installWizardMocks(page);
    await resumeToLicenseScope(page);

    await expect(page.getByRole("heading", { name: "License, Scope & Practice" })).toBeVisible();
    await expect(page.getByText("Please check all procedures that you perform")).toBeVisible();
  });

  test("Continue is enabled with nothing checked — every question in this group is optional", async ({ page, context }) => {
    await addAuthHintCookie(context);
    await installWizardMocks(page);
    await resumeToLicenseScope(page);

    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  test("Continue saves the whole group, prepending the earlier 'About your practice' group (group-save-order rule)", async ({ page, context }) => {
    await addAuthHintCookie(context);
    const backend = await installWizardMocks(page);
    await resumeToLicenseScope(page);

    await page.getByText("Abortion", { exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/underwriting$/);

    const call = backend.getSaveCallForGroup(101);
    expect(call).toBeTruthy();
    expect(call.submissionId).toBe(SUBMISSION_ID);
    const groupIds = call.groups.map((g) => g.submissionQuestionGroupId);
    // "About your practice" (100) rides along even though the user never
    // visited it this session — earlierGroupSaveEntries rebuilds it from the
    // submission tree's own already-answered state (see fixtures/questions.js:
    // practiceAnswered defaults true).
    expect(groupIds).toContain(100);
    expect(groupIds).toContain(101);
  });

  test("shows an error and stays on the page when the save fails", async ({ page, context }) => {
    await addAuthHintCookie(context);
    const backend = await installWizardMocks(page);
    await resumeToLicenseScope(page);
    backend.setSaveFailure(500, "Could not save your answers.");

    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Could not save your answers.")).toBeVisible();
    await expect(page).toHaveURL(/\/license-scope$/);
  });
});
