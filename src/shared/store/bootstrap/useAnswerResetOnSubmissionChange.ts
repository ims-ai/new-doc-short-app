import { useEffect, useRef } from "react";

import { useStore } from "@/shared/store/useStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import questionsStore from "@/modules/Quote/store/questionsStore";

/**
 * Reset the post-signup (license-scope / impact / underwriting) answers only when the submission id
 * actually changes (string-stable). A number↔string flip of the same id must
 * not wipe answers or Visibility — that raced with the question fetch and
 * left Underwriting blank on a second visit.
 *
 * Was effect 5 of the old monolithic `useAppBootstrap`.
 */
export function useAnswerResetOnSubmissionChange(): void {
  const flowSubmissionId = useStore(submissionStore, (s) => s.flowSubmissionId);
  const prevSubmissionIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const next = flowSubmissionId == null ? null : String(flowSubmissionId);
    const prev = prevSubmissionIdRef.current;
    prevSubmissionIdRef.current = next;
    if (prev === undefined || prev === next) return;

    questionsStore.licenseScopeAnswers = {};
    questionsStore.impactAnswers = {};
    questionsStore.underwritingAnswers = {};
    questionsStore.underwritingSaveError = null;
    questionsStore.setHiddenQuestionIds(new Set());
    questionsStore.showTargetQuestionIds = new Set();
  }, [flowSubmissionId]);
}
