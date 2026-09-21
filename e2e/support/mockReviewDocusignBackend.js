// Additional network mocks for the /reviewDocusign step (DocuSign embedded
// signing + underwriter-review gate), layered on top of installWizardMocks.

const API = "**/api/weborder/v1";

/**
 * @param {import('@playwright/test').Page} page
 * @param {{
 *   signingResponse?: object,
 *   signingStatus?: number,
 *   underwriterReviewRequired?: boolean,
 *   reviewStatus?: number,
 * }} opts
 */
export async function installReviewDocusignMocks(
  page,
  {
    signingResponse = { signingUrl: "", envelopeId: "env-1", signedCompleted: true },
    signingStatus = 200,
    underwriterReviewRequired = false,
    reviewStatus = 200,
  } = {},
) {
  const reviewStatusCalls = [];

  await page.route(`${API}/documents/*/docusign*`, async (route) => {
    if (signingStatus >= 400) {
      await route.fulfill({ status: signingStatus, contentType: "application/json", body: JSON.stringify({ message: "Could not start document signing." }) });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(signingResponse) });
    }
  });

  await page.route(`${API}/insured/*/underwriter-review-status`, async (route) => {
    reviewStatusCalls.push(true);
    if (reviewStatus >= 400) {
      await route.fulfill({ status: reviewStatus, contentType: "application/json", body: JSON.stringify({ message: "Unable to continue. Please try again." }) });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(underwriterReviewRequired) });
    }
  });

  return { getReviewStatusCallCount: () => reviewStatusCalls.length };
}
