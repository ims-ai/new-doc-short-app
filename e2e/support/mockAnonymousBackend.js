// Network mocks for the anonymous, pre-signup part of the funnel: the "/"
// landing calculator -> /quote (soft estimate) -> /practice (master
// question tree) -> /register (signup + real submission create). Mirrors
// Q2BNfy's e2e/support/mockAnonymousBackend.js: mock the network layer only,
// drive the real UI. No `/insured/session` mock — an anonymous visitor
// carries no `q2b_auth` hint cookie, so `useSessionRestore` never calls it
// (see src/shared/store/bootstrap/useSessionRestore.ts).

import { SPECIALITY_RESPONSE, VALID_QUOTEDATA_RESPONSE, COVERAGE_LIMITS_RESPONSE } from "../fixtures/speciality.js";
import { SUBMISSION_ID, buildMasterQuestionGroups } from "../fixtures/questions.js";

const API = "**/api/weborder/v1";

/**
 * @param {import('@playwright/test').Page} page
 * @param {{
 *   questionGroups?: any[],
 *   quotedataResponse?: object,
 *   coverageLimits?: any[],
 *   signupResponse?: object,
 *   signupStatus?: number,
 *   signupMessage?: string,
 *   submissionStatus?: number,
 *   submissionMessage?: string,
 * }} opts
 */
export async function installAnonymousFlowMocks(
  page,
  {
    questionGroups = buildMasterQuestionGroups(),
    quotedataResponse = VALID_QUOTEDATA_RESPONSE,
    coverageLimits = COVERAGE_LIMITS_RESPONSE,
    signupResponse = { id: 9001, abbreviation: "JR", refreshTokenExpirationTime: 1_296_000 },
    signupStatus = 200,
    signupMessage = "Signup failed",
    submissionStatus = 200,
    submissionMessage = "Could not create your order.",
  } = {},
) {
  const signupCalls = [];
  const submissionCalls = [];

  await page.route(`${API}/auth/speciality/*`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SPECIALITY_RESPONSE) });
  });

  await page.route(`${API}/auth/*/zipcodedata`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ city: quotedataResponse.city, state: quotedataResponse.state, st: quotedataResponse.st }),
    });
  });

  await page.route(`${API}/auth/quotedata`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(quotedataResponse) });
  });

  await page.route(`${API}/auth/*/coverage-limits`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(coverageLimits) });
  });

  // Master question tree — GET /questions?specialityId=... (no trailing path
  // segment, unlike the submission-scoped /questions/:id/questions).
  await page.route(`${API}/questions?*`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(questionGroups) });
  });

  await page.route(`${API}/auth/signup`, async (route) => {
    signupCalls.push(route.request().postDataJSON());
    if (signupStatus >= 400) {
      await route.fulfill({ status: signupStatus, contentType: "application/json", body: JSON.stringify({ message: signupMessage }) });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(signupResponse) });
    }
  });

  // POST /insured/submission — real submission create, fired by
  // RegistrationPage right after signup succeeds.
  await page.route(`${API}/insured/submission`, async (route) => {
    submissionCalls.push(route.request().postDataJSON());
    if (submissionStatus >= 400) {
      await route.fulfill({ status: submissionStatus, contentType: "application/json", body: JSON.stringify({ message: submissionMessage }) });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ submission: SUBMISSION_ID, submissionId: SUBMISSION_ID, policyStatus: "OPEN_ORDER" }),
      });
    }
  });

  // Reached once signup + submission create succeed and the app lands on
  // /license-scope (refreshPaymentOrder fires immediately).
  await page.route(`${API}/insured/order*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ submissionId: SUBMISSION_ID, policyStatus: "OPEN_ORDER", workflowstatus: "questions", questionRequired: false }),
    });
  });

  await page.route(`${API}/questions/*/questions`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(questionGroups) });
  });

  return {
    getSignupCalls: () => signupCalls,
    getSubmissionCalls: () => submissionCalls,
  };
}
