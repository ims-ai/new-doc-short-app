// Network mocks for the AUTHENTICATED part of the wizard, reached via
// dashboard "Resume" rather than replaying the whole anonymous signup funnel
// in every spec — same split Q2BNfy uses (mockBackend.js). Covers session
// restore, the dashboard list, GET/POST for the submission-scoped question
// tree (/license-scope, /underwriting) and GET /insured/order.
//
// Faithfully reproduces the real `ins` group-save-order rule documented in
// questionsApi.js: a submission question group saved alone 400s unless every
// LOWER-displayOrder group is already complete (every visible question
// answered, required or not) — UNLESS the earlier groups ride along in the
// same POST /questions/save request (`earlierGroupSaveEntries`). Both
// /license-scope (`buildFullGroupSavePayload`) and /underwriting
// (`buildUnderwritingGroupSavePayload`) always prepend the earlier groups, so
// this rule should never actually 400 in a real walk through this suite —
// it's here so a regression that drops `earlierGroupSaveEntries` gets caught
// instead of silently 200ing against a mock that doesn't enforce the rule.

import { SPECIALITY_RESPONSE } from "../fixtures/speciality.js";
import { SUBMISSION_ID, buildOrderDetails, buildSubmissionQuestionGroups } from "../fixtures/questions.js";

const API = "**/api/weborder/v1";
export const AUTH_HINT_COOKIE = "q2b_auth";
export const INSURED_ID = 9001;

/** Sets the q2b_auth hint cookie so useSessionRestore calls GET /insured/session on boot. */
export async function addAuthHintCookie(context, baseURL = "http://localhost:4200") {
  const url = new URL(baseURL);
  await context.addCookies([{ name: AUTH_HINT_COOKIE, value: "1", domain: url.hostname, path: "/" }]);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{
 *   submissionId?: number,
 *   questionGroups?: any[],
 *   orderOverrides?: object,
 *   dashboardSubmissions?: any[],
 * }} opts
 */
export async function installWizardMocks(
  page,
  {
    submissionId = SUBMISSION_ID,
    questionGroups = buildSubmissionQuestionGroups(),
    orderOverrides = {},
    dashboardSubmissions,
  } = {},
) {
  const saveCalls = [];
  let saveResponse = { status: 200, body: true };
  let saveNetworkError = false;
  let orderValidationEnabled = true;
  let orderState = buildOrderDetails({ submissionId, ...orderOverrides });

  // Every question already answered (from a prior page or a prior test
  // step) OR carried on the fixture's own `answerValue` — tracked
  // cumulatively across /questions/save calls, exactly like Q2BNfy's
  // installBackendMocks.
  const answeredQuestionIds = new Set();
  for (const g of questionGroups) {
    for (const q of g.questions || []) {
      const answered = (q.options || []).some((o) => o.answerValue != null && String(o.answerValue).trim() !== "");
      if (answered) answeredQuestionIds.add(q.id);
    }
  }

  function isGroupComplete(group, incomingGroupsById) {
    const incoming = incomingGroupsById.get(group.id);
    const incomingQuestionIds = new Set((incoming?.questions ?? []).map((q) => q.submissionQuestionId));
    return (group.questions ?? [])
      .filter((q) => !q.isHidden)
      .every((q) => answeredQuestionIds.has(q.id) || incomingQuestionIds.has(q.id));
  }

  await page.route(`${API}/auth/speciality/*`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SPECIALITY_RESPONSE) });
  });

  await page.route(`${API}/insured/session`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        type: "INSURED",
        id: INSURED_ID,
        abbreviation: "JR",
        refreshTokenExpirationTime: 1_296_000,
        name: "Jordan Rivera",
        username: "jordan.rivera@example.com",
        firstname: "Jordan",
        lastname: "Rivera",
      }),
    });
  });

  await page.route(`${API}/dashboard/submissions`, async (route) => {
    const rows = dashboardSubmissions ?? [
      { submissionid: submissionId, quotenumber: "Q-700501", isopenorder: true, ispolicyactive: false, policystatus: orderState.policyStatus },
    ];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(rows) });
  });

  // GET /insured/order?submissionid=... — order details, mutable via the
  // returned `setOrderOverrides` handle so a test can move the order through
  // OPEN_ORDER -> SIGNED -> PAID without reinstalling mocks.
  await page.route(`${API}/insured/order*`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(orderState) });
  });

  await page.route(`${API}/insured/policy-info*`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(null) });
  });

  await page.route(`${API}/questions/*/questions`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(questionGroups) });
  });

  await page.route(`${API}/questions/save`, async (route) => {
    const body = route.request().postDataJSON();
    saveCalls.push(body);

    if (orderValidationEnabled) {
      const incomingGroupsById = new Map((body.groups ?? []).map((g) => [g.submissionQuestionGroupId, g]));
      const incomingDisplayOrders = [...incomingGroupsById.keys()].map(
        (id) => questionGroups.find((g) => g.id === id)?.displayOrder,
      );
      const minDisplayOrder = Math.min(...incomingDisplayOrders.filter((d) => d != null));
      const incompleteEarlierGroup = questionGroups.find(
        (g) => g.displayOrder < minDisplayOrder && !isGroupComplete(g, incomingGroupsById),
      );
      if (incompleteEarlierGroup) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ message: `Complete "${incompleteEarlierGroup.groupName}" before saving a later question group.` }),
        });
        return;
      }
    }

    if (saveNetworkError) {
      await route.abort("failed");
    } else if (saveResponse.status >= 400) {
      await route.fulfill({ status: saveResponse.status, contentType: "application/json", body: JSON.stringify({ message: saveResponse.message || "Save failed" }) });
    } else {
      for (const g of body.groups ?? []) {
        for (const q of g.questions ?? []) {
          answeredQuestionIds.add(q.submissionQuestionId);
        }
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(saveResponse.body) });
    }
  });

  return {
    /** Every captured POST /questions/save request body, in call order. */
    getSaveCalls: () => saveCalls,
    /** The most recent call whose group id matches, or undefined. */
    getSaveCallForGroup: (groupId) =>
      [...saveCalls].reverse().find((b) => b?.groups?.some((g) => g.submissionQuestionGroupId === groupId)),
    setSaveFailure: (status, message) => {
      saveNetworkError = false;
      saveResponse = { status, message };
    },
    setSaveNetworkError: () => {
      saveNetworkError = true;
    },
    setSaveSuccess: () => {
      saveNetworkError = false;
      saveResponse = { status: 200, body: true };
    },
    setOrderValidationEnabled: (value) => {
      orderValidationEnabled = value;
    },
    /** Move the mocked order to a new status (e.g. after a simulated sign/pay). */
    setOrderOverrides: (overrides) => {
      orderState = buildOrderDetails({ submissionId, ...overrides });
    },
  };
}
