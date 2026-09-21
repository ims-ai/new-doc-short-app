// Additional network mock for the /binder-invoice step's own action:
// POST /invoice/{submissionid}/generate-binder-invoice. Order state (must be
// PAID or BinderInvoicePage bounces to /dashboard) is supplied by
// installWizardMocks's `orderOverrides`.

const API = "**/api/weborder/v1";

export async function installBinderMocks(page, { generateStatus = 200 } = {}) {
  const generateCalls = [];

  await page.route(`${API}/invoice/*/generate-binder-invoice`, async (route) => {
    generateCalls.push(true);
    if (generateStatus === 409) {
      await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ message: "Already generated." }) });
    } else if (generateStatus >= 400) {
      await route.fulfill({ status: generateStatus, contentType: "application/json", body: JSON.stringify({ message: "Could not generate binder and invoice." }) });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
  });

  return { getGenerateCallCount: () => generateCalls.length };
}
