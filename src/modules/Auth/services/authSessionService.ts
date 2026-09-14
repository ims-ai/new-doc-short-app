import { postLogout } from "@/modules/Auth/api/authApi";
import authFormStore from "@/modules/Auth/store/authFormStore";
import insuredProfileStore from "@/shared/store/insuredProfileStore";
import sessionStore from "@/shared/store/sessionStore";
import modalStore from "@/shared/store/modalStore";
import dashboardStore from "@/modules/Dashboard/store/dashboardStore";
import practiceStore from "@/modules/Quote/store/practiceStore";
import applicantProfileStore from "@/modules/Quote/store/applicantProfileStore";
import questionsStore from "@/modules/Quote/store/questionsStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import attestStore from "@/modules/Quote/store/attestStore";
import paymentOrderStore from "@/modules/Payment/store/paymentOrderStore";
import bindStore from "@/modules/Payment/store/bindStore";
import { removeAllQueriesExceptSpeciality } from "@/modules/Quote/api/specialityApi";
import { queryClient } from "@/shared/query/queryClient";

/**
 * Drop the react-query cache for everything keyed by the (now abandoned)
 * submission — the order read and the submission question tree — so the
 * next submission fetches its own fresh state instead of serving a stale hit
 * (`useSubmissionQuestionsFetch` runs with `staleTime: Infinity`).
 *
 * The speciality's MASTER tree (`questions.bySpeciality`) is not submission-
 * scoped and stays cached — dropping it here refetched it on every landing
 * "Continue".
 */
export function dropSubmissionScopedQueries() {
  queryClient.removeQueries({ queryKey: ["order"] });
  queryClient.removeQueries({ queryKey: ["questions", "submission"] });
}

/**
 * Reset only the submission-scoped state when a signed-in user (re)starts
 * the quote funnel from the landing calculator / step 0 — the landing
 * "Continue" action.
 *
 * Unlike `resetQuoteFlow` this deliberately KEEPS `practiceStore` /
 * `ilfDlfStore`: the user just entered those on the estimate card and is
 * continuing from them. What it drops is any `flowSubmissionId` / order /
 * question-tree state left over from a previously created or bound
 * submission — without this, `RegistrationPage`'s "already signed in"
 * effect sees the stale `flowSubmissionId`, skips `POST /insured/submission`
 * entirely, and the "new" quote just re-opens (and edits) the old order.
 * Answer maps are left alone here — the bootstrap wipes them on the
 * `/quote` landing (`useAnswerResetOnQuoteLanding`).
 */
export function resetSubmissionForNewQuote() {
  submissionStore.clear();
  questionsStore.resetSubmissionQuestionState();
  paymentOrderStore.clear();
  bindStore.clear();
  attestStore.clear();
  dropSubmissionScopedQueries();
  sessionStore.bound = false;
}

/** Reset every quote-flow store. Use when starting a brand-new quote. */
export function resetQuoteFlow() {
  authFormStore.clearSignup();
  practiceStore.clear();
  applicantProfileStore.clear();
  questionsStore.clear();
  submissionStore.clear();
  attestStore.clear();
  paymentOrderStore.clear();
  bindStore.clear();
  dropSubmissionScopedQueries();
  sessionStore.bound = false;
}

/**
 * Full sign-out: end the session, clear every store, and wipe cookies +
 * per-tab storage so a reload starts from a clean slate. `localStorage` is
 * left alone so the theme preference survives.
 *
 * The react-query cache is wiped too — except the speciality master record,
 * which is the same for every user and is fetched once per page load (see
 * `specialityApi.ts`), so sign-out → sign-in → Home doesn't refetch it.
 */
export async function signOut() {
  try {
    await postLogout();
  } catch {
    /* still continue */
  }
  resetQuoteFlow();
  authFormStore.clearLogin();
  dashboardStore.clear();
  removeAllQueriesExceptSpeciality();
  queryClient.getMutationCache().clear();
  modalStore.clear();
  insuredProfileStore.insuredProfile = null;
  sessionStore.clear();
  try {
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0].trim();
      if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
    sessionStorage.clear();
  } catch {
    /* storage may be unavailable */
  }
}
