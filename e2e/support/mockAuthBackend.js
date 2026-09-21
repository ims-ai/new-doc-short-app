// Network mocks for the returning-user /signin page.

const API = "**/api/weborder/v1";

export async function installSignInMocks(page, { signInStatus = 200, signInMessage = "Invalid username or password." } = {}) {
  const signInCalls = [];

  // Anonymous on arrival — no q2b_auth hint cookie is set by this helper, so
  // useSessionRestore never calls GET /insured/session before a successful
  // sign-in. The one call it fires from within SignInPage's own
  // onAuthSuccess is mocked below.
  await page.route(`${API}/insured/session`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: 9001, name: "Jordan Rivera", username: "jordan.rivera@example.com" }),
    });
  });

  await page.route(`${API}/auth/sign-in`, async (route) => {
    const body = route.request().postDataJSON();
    signInCalls.push(body);
    if (signInStatus >= 400) {
      await route.fulfill({ status: signInStatus, contentType: "application/json", body: JSON.stringify({ message: signInMessage }) });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: 9001, name: "Jordan Rivera", username: body.username, refreshTokenExpirationTime: 1_296_000 }),
      });
    }
  });

  return { getSignInCalls: () => signInCalls };
}
