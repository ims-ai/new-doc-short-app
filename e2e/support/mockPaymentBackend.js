// Additional network mocks for the /payment step.
//
// Stripe Elements (CardNumberElement/CardExpiryElement/CardCvcElement) load
// real Stripe.js from js.stripe.com and render actual cross-origin iframes —
// there is no supported way to drive "card complete" through Playwright
// without either live Stripe test-mode network calls (against this
// project's "no real Stripe calls in tests" discipline — see CLAUDE.md's
// "no local fallback… everything talks to the real `ins`" combined with the
// explicit ban on real payment-gateway calls in tests) or hand-rolling a
// full Stripe.js test double. This suite therefore blocks Stripe's script
// entirely (so no real network call ever fires) and covers what's real and
// deterministic without it: the order summary render and the
// publishable-key failure path. The "Pay" button's fully-enabled path
// (requires a real/faked stripeCardComplete=true) is out of scope here —
// mirrors Q2BNfy's e2e/support/mockPaymentBackend.js exactly.

const API = "**/api/weborder/v1";

export async function installPaymentMocks(page, { publishableKeyStatus = 200, publishableKey = "pk_test_stub_000000000000000000000000" } = {}) {
  // Never let Stripe's real script load in this suite.
  await page.route("https://js.stripe.com/**", (route) => route.abort());

  await page.route(`${API}/payment/publishable-key`, async (route) => {
    if (publishableKeyStatus >= 400) {
      await route.fulfill({ status: publishableKeyStatus, contentType: "application/json", body: JSON.stringify({ message: "Could not load payment form." }) });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ publishableKey }) });
    }
  });
}
