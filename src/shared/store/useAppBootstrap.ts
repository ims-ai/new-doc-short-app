import { useAuthNavigatorSync } from "@/shared/store/bootstrap/useAuthNavigatorSync";
import { useSpecialityPrefetch } from "@/shared/store/bootstrap/useSpecialityPrefetch";
import { useSessionRestore } from "@/shared/store/bootstrap/useSessionRestore";
import { useAnswerResetOnQuoteLanding } from "@/shared/store/bootstrap/useAnswerResetOnQuoteLanding";
import { useSubmissionQuestionsFetch } from "@/shared/store/bootstrap/useSubmissionQuestionsFetch";
import { useAnswerResetOnSubmissionChange } from "@/shared/store/bootstrap/useAnswerResetOnSubmissionChange";
import { usePathStepSync } from "@/shared/store/bootstrap/usePathStepSync";
import { useOrderRehydrate } from "@/shared/store/bootstrap/useOrderRehydrate";
import { useObservabilityUser } from "@/shared/store/bootstrap/useObservabilityUser";

/**
 * App-level bootstrap. Mount this once from <App/> — it renders nothing, it
 * just runs the cross-cutting effects. Each concern is its own named hook in
 * `src/shared/store/bootstrap/`; the order below is the order they run in:
 *
 *   1. `useAuthNavigatorSync`          — SPA navigator ↔ httpClient 401 redirect
 *   2. `useSpecialityPrefetch`         — speciality-master fetch on a `/` entry
 *   3. `useSessionRestore`             — session restore on first boot
 *   4. `useAnswerResetOnQuoteLanding`  — wipe transient answers when landing on /quote
 *   5. `useSubmissionQuestionsFetch`   — submission-scoped question tree fetch
 *   6. `useAnswerResetOnSubmissionChange` — reset answers when the submission id changes
 *   7. `usePathStepSync`               — URL → `submissionStore.step`
 *   8. `useOrderRehydrate`             — refresh-survival order rehydrate
 *   9. `useObservabilityUser`          — crash-reporter user context ↔ session
 */
export function useAppBootstrap() {
  useAuthNavigatorSync();
  useSpecialityPrefetch();
  useSessionRestore();
  useAnswerResetOnQuoteLanding();
  useSubmissionQuestionsFetch();
  useAnswerResetOnSubmissionChange();
  usePathStepSync();
  useOrderRehydrate();
  useObservabilityUser();
}
