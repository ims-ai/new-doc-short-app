import { useMemo } from "react";

import { useStore } from "@/shared/store/useStore";

import practiceStore from "@/modules/Quote/store/practiceStore";
import ilfDlfStore from "@/modules/Quote/store/ilfDlfStore";
import applicantProfileStore from "@/modules/Quote/store/applicantProfileStore";
import questionsStore from "@/modules/Quote/store/questionsStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import paymentOrderStore from "@/modules/Payment/store/paymentOrderStore";
import bindStore from "@/modules/Payment/store/bindStore";
import insuredProfileStore from "@/shared/store/insuredProfileStore";
import { useSpeciality } from "@/modules/Quote/api/specialityApi";

import { computeDerivedValues } from "./derivedValues";

/**
 * The single hook every page calls when it needs a derived value
 * (`quoteStripAnnualTotal`, `snapshotLimits`, `paymentAmountDue`,
 * `headerUserInitials`, etc.).
 *
 *   const { quoteStripAnnualTotal, snapshotLimits, isReferral } = useQuoteSnapshot();
 *
 * Subscribes to every store the pure `computeDerivedValues` needs and re-runs
 * when any of them change.
 */
export function useQuoteSnapshot() {
  // Step + practice inputs
  const step = useStore(submissionStore, (s) => s.step);
  const effDate = useStore(practiceStore, (s) => s.effectiveDate);

  // Applicant — one identity store. `applicantProfileStore` is filled by the
  // registration form and re-filled by `hydrateFromOrder` after a reload, so
  // it is the single source for the review/payment contact summary too.
  const firstName = useStore(applicantProfileStore, (s) => s.firstName);
  const lastName = useStore(applicantProfileStore, (s) => s.lastName);
  const profileEmail = useStore(applicantProfileStore, (s) => s.email);
  const profilePhone = useStore(applicantProfileStore, (s) => s.cellPhone || s.homePhone);
  const homeAddress = useStore(applicantProfileStore, (s) => s.homeAddress);

  // The Home Page's real, carrier-backed price (`POST /auth/quotedata`).
  const ilf = useStore(ilfDlfStore, (s) => s.current);
  // The coverage limit the Home Page user picked (falls back to the
  // quotedata default name downstream when empty).
  const selectedLimitName = useStore(ilfDlfStore, (s) => s.selectedCoverageLimit?.limit || "");
  // Retro date the estimate was priced at ("" → defaults to the effective date).
  const retroDate = useStore(ilfDlfStore, (s) => s.retroDate);
  // This build's speciality — fetched once per page load (specialityApi.ts).
  const specialityTitle = useSpeciality().data?.title || "";
  const paymentOrderDetails = useStore(paymentOrderStore, (s) => s.paymentOrderDetails);
  const paymentOrderLoading = useStore(paymentOrderStore, (s) => s.paymentOrderLoading);
  const flowSubmissionId = useStore(submissionStore, (s) => s.flowSubmissionId);
  const submissionQuestionGroups = useStore(questionsStore, (s) => s.submissionQuestionGroups);
  const underwritingAnswers = useStore(questionsStore, (s) => s.underwritingAnswers);
  const hiddenQuestionIds = useStore(questionsStore, (s) => s.hiddenQuestionIds);

  // Bound confirmation
  const boundPolicyNumberFromInvoice = useStore(bindStore, (s) => s.boundPolicyNumberFromInvoice);
  const boundTotalAmount = useStore(bindStore, (s) => s.boundTotalAmount);

  // Header
  const insuredProfile = useStore(insuredProfileStore, (s) => s.insuredProfile);

  // `computeDerivedValues` walks the whole question tree (referral
  // detection). Memoize it on its inputs so it only re-runs when one actually
  // changes — every value above is a primitive or a reference-stable store
  // slice, so this list is sound.
  return useMemo(
    () =>
      computeDerivedValues({
        step,
        effDate,
        firstName,
        lastName,
        profileEmail,
        profilePhone,
        homeAddress,
        ilf,
        selectedLimitName,
        retroDate,
        specialityTitle,
        paymentOrderDetails,
        paymentOrderLoading,
        flowSubmissionId,
        submissionQuestionGroups,
        underwritingAnswers,
        hiddenQuestionIds,
        boundPolicyNumberFromInvoice,
        boundTotalAmount,
        insuredProfile,
      }),
    [
      step,
      effDate,
      firstName,
      lastName,
      profileEmail,
      profilePhone,
      homeAddress,
      ilf,
      selectedLimitName,
      retroDate,
      specialityTitle,
      paymentOrderDetails,
      paymentOrderLoading,
      flowSubmissionId,
      submissionQuestionGroups,
      underwritingAnswers,
      hiddenQuestionIds,
      boundPolicyNumberFromInvoice,
      boundTotalAmount,
      insuredProfile,
    ],
  );
}
