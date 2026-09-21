const API = "**/api/weborder/v1";
export const AUTH_HINT_COOKIE = "q2b_auth";

export async function seedAuthenticatedSession(context, baseURL = "http://localhost:4200") {
  const url = new URL(baseURL);
  await context.addCookies([{ name: AUTH_HINT_COOKIE, value: "1", domain: url.hostname, path: "/" }]);
}

export async function installDashboardMocks(page, { submissions = [] } = {}) {
  const logoutCalls = [];

  await page.route(`${API}/insured/session`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: 9001, name: "Jordan Rivera", username: "jordan.rivera@example.com" }),
    });
  });

  await page.route(`${API}/dashboard/submissions`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(submissions) });
  });

  await page.route(`${API}/auth/refresh/logout`, async (route) => {
    logoutCalls.push(true);
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(true) });
  });

  return { getLogoutCallCount: () => logoutCalls.length };
}
