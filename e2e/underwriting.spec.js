// E2E coverage for /underwriting ("Underwriting questions"). Reached via
// dashboard Resume -> /license-scope -> Continue (see
// support/wizardFlow.js). Real UI throughout; only the network layer is
// mocked (e2e/support/mockWizardBackend.js).

import { test, expect } from "@playwright/test";
import { addAuthHintCookie, installWizardMocks } from "./support/mockWizardBackend.js";
import { resumeToUnderwriting } from "./support/wizardFlow.js";
import { SUBMISSION_ID } from "./fixtures/questions.js";

test.describe("Underwriting questions (/underwriting)", () => {
  test("keeps Continue disabled until both required yes/no questions are answered", async ({ page, context }) => {
    await addAuthHintCookie(context);
    await installWizardMocks(page);
    await resumeToUnderwriting(page);

    await expect(page.getByRole("button", { name: "See my final quote" })).toBeDisabled();
    const noButtons = page.getByRole("button", { name: "No", exact: true });
    await noButtons.nth(0).click();
    await expect(page.getByRole("button", { name: "See my final quote" })).toBeDisabled();
    await noButtons.nth(1).click();
    await expect(page.getByRole("button", { name: "See my final quote" })).toBeEnabled();
  });

  test("a Yes on an option flagged for underwriter review highlights the question and requires the explanation, changing the CTA label", async ({ page, context }) => {
    await addAuthHintCookie(context);
    await installWizardMocks(page);
    await resumeToUnderwriting(page);

    await page.getByRole("button", { name: "Yes", exact: true }).first().click(); // question 1 -> Yes
    await expect(page.getByText("Please provide explanation")).toBeVisible();
    // The fixture flags this question's "Yes" option with
    // underwriterReviewImpact: true — picking it switches the CTA to
    // "Submit for review" immediately (UnderwritingPage's
    // isAnyReviewSelected), independent of whether the form is complete yet.
    await expect(page.getByRole("button", { name: "Submit for review" })).toBeVisible();

    // Both questions render a "No" button regardless of selection, so
    // `nth(0)` is question 1's own No (would undo the Yes just clicked) —
    // `nth(1)` is question 2's.
    await page.getByRole("button", { name: "No", exact: true }).nth(1).click(); // question 2 -> No
    await expect(page.getByRole("button", { name: "Submit for review" })).toBeDisabled();

    await page.getByPlaceholder("Please provide details, if applicable").fill("Participating in a phase III trial.");
    await expect(page.getByRole("button", { name: "Submit for review" })).toBeEnabled();
  });

  test("saving prepends both earlier groups (About your practice + License, Scope & Practice) and advances to /reviewDocusign", async ({ page, context }) => {
    await addAuthHintCookie(context);
    const backend = await installWizardMocks(page);
    await resumeToUnderwriting(page);

    const noButtons = page.getByRole("button", { name: "No", exact: true });
    await noButtons.nth(0).click();
    await noButtons.nth(1).click();
    await page.getByRole("button", { name: "See my final quote" }).click();

    await expect(page).toHaveURL(/\/reviewDocusign$/);

    const call = backend.getSaveCallForGroup(99);
    expect(call).toBeTruthy();
    expect(call.submissionId).toBe(SUBMISSION_ID);
    const groupIds = call.groups.map((g) => g.submissionQuestionGroupId);
    expect(groupIds).toEqual(expect.arrayContaining([100, 101, 99]));
  });

  test("shows an error and stays on the page when the save fails", async ({ page, context }) => {
    await addAuthHintCookie(context);
    const backend = await installWizardMocks(page);
    await resumeToUnderwriting(page);
    // UnderwritingPage's catch reads `err.message`, which only carries the
    // API's own text for a 4xx (httpClient's message-enrichment branch
    // explicitly excludes 401 and 5xx — see httpClient.ts) — a 500 here
    // would surface axios's generic "Request failed with status code 500"
    // instead, so this uses 400 to exercise the real, enriched message path.
    backend.setSaveFailure(400, "Could not save underwriting answers.");

    const noButtons = page.getByRole("button", { name: "No", exact: true });
    await noButtons.nth(0).click();
    await noButtons.nth(1).click();
    await page.getByRole("button", { name: "See my final quote" }).click();

    await expect(page.getByText("Could not save underwriting answers.")).toBeVisible();
    await expect(page).toHaveURL(/\/underwriting$/);
  });
});
