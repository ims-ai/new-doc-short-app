/**
 * Rehydrate the memory-only practice / applicant stores from a loaded order.
 *
 * After dashboard Resume (or a refresh that only restored
 * `flowSubmissionId`), the Review / Payment pages still need the policy
 * effective date and the applicant's contact summary. Prices come from the
 * order itself (`derivedValues` prefers `paymentOrderDetails.ratingResponse`
 * once a submission is rated), so nothing price-related is rebuilt here.
 */
import practiceStore from "@/modules/Quote/store/practiceStore";
import applicantProfileStore from "@/modules/Quote/store/applicantProfileStore";
import insuredProfileStore from "@/shared/store/insuredProfileStore";
import { toMdY } from "@/shared/utils/dateHelpers";

/**
 * @param order  OrderDetailsResponse-like payload (loose casing — kept `any`)
 */
export function hydrateStoresFromOrder(order: any): void {
  if (!order) return;

  const rating = order.ratingResponse || null;
  const eff = String(rating?.effectiveDate || "").trim();
  if (eff && practiceStore.effectiveDate !== eff) practiceStore.effectiveDate = eff;

  // Applicant fields used by Payment / Review summaries — only fill blanks so
  // in-progress edits aren't clobbered when the order refresh races a form.
  const contact = order.contactResponse || {};
  const profile = insuredProfileStore.insuredProfile || {};
  const sessionEmail = String(profile.email || profile.username || "").trim();
  const first = String(
    order.insuredfirstname || contact.firstname || profile.firstname || "",
  ).trim();
  const last = String(order.insuredlastname || contact.lastname || profile.lastname || "").trim();
  const email = String(
    contact.email || (sessionEmail.includes("@") ? sessionEmail : "") || "",
  ).trim();
  const phone = String(
    contact.contactnumber || contact.phone || profile.contactnumber || profile.phone || "",
  ).trim();

  const dob = toMdY(order.insureddob);

  // `applicantProfileStore` is the single identity store — the review /
  // payment contact summary reads it directly via `useQuoteSnapshot`.
  if (first && !applicantProfileStore.firstName) applicantProfileStore.firstName = first;
  if (last && !applicantProfileStore.lastName) applicantProfileStore.lastName = last;
  if (email && !applicantProfileStore.email) applicantProfileStore.email = email;
  if (phone && !applicantProfileStore.cellPhone) applicantProfileStore.cellPhone = phone;
  if (dob && !applicantProfileStore.dateOfBirth) applicantProfileStore.dateOfBirth = dob;

  const loc = order.locationResponse;
  if (loc?.address1 && !applicantProfileStore.homeAddress?.address1) {
    applicantProfileStore.homeAddress = {
      address1: loc.address1 || "",
      address2: loc.address2 || "",
      city: loc.city || "",
      state: loc.state || "",
      zip: loc.zipcode || loc.zip || "",
    };
  }
}
