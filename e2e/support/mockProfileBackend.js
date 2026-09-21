const API = "**/api/weborder/v1";
export const AUTH_HINT_COOKIE = "q2b_auth";

export async function seedAuthenticatedSession(context, baseURL = "http://localhost:4200") {
  const url = new URL(baseURL);
  await context.addCookies([{ name: AUTH_HINT_COOKIE, value: "1", domain: url.hostname, path: "/" }]);
}

export async function installProfileMocks(
  page,
  {
    details = {
      firstname: "Jordan",
      lastname: "Rivera",
      email: "jordan.rivera@example.com",
      contactnumber: "5551234567",
      dob: "05/12/1985",
      ssn: "123456789",
      designation: "MD",
      speciality: "Internal Medicine",
      licenseNumber: "A123456",
    },
    contacts = [{ isprimary: true, firstname: "Jordan", lastname: "Rivera", email: "jordan.rivera@example.com", contactnumber: "5551234567" }],
    locations = [{ isprimary: true, address1: "123 Main St", city: "Newport Beach", state: "CA", zipcode: "92653" }],
  } = {},
) {
  await page.route(`${API}/insured/session`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: 9001, name: "Jordan Rivera", username: "jordan.rivera@example.com" }),
    });
  });

  await page.route(`${API}/insured/details`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(details) });
  });

  await page.route(`${API}/insured/contacts`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(contacts) });
  });

  await page.route(`${API}/insured/locations`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(locations) });
  });
}
