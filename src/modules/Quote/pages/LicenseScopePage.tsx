import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QuoteStrip } from "@/modules/Quote/components/QuoteStrip";
import { QuestionRenderer } from "@/modules/Quote/components/QuestionRenderer";
import { Spacer } from "@/shared/components/Spacer";
import Alert from "@/shared/components/Alert";
import Loader from "@/shared/components/Loader";
import { btnPrimary, dis } from "@/shared/utils/styles";

import {
  buildFullGroupSavePayload,
  earlierGroupSaveEntries,
  findSubmissionGroup,
  hydrateSubmissionAnswers,
  isQuestionVisible as isVisibilityQuestionVisible,
  mergeAnswerMaps,
  recomputeHiddenQuestionIds,
  requiredQuestionsAnswered,
  saveSubmissionQuestionAnswers,
  sortedQuestions,
} from "@/modules/Quote/api/questionsApi";
import { QUESTION_GROUP, STEP_NAMES, STEP_PATHS } from "@/modules/Quote/steps";
import { refreshPaymentOrder } from "@/modules/Payment/services/paymentOrderService";

import { useStore } from "@/shared/store/useStore";
import questionsStore from "@/modules/Quote/store/questionsStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import sessionStore from "@/shared/store/sessionStore";
import { useQuoteSnapshot } from "@/modules/Quote/utils/useQuoteSnapshot";

/**
 * Step 4 (`/license-scope`) — "License, Scope & Practice": the procedure
 * checklists (general, Cardiology, Cosmetic/Plastic Surgery, Pain
 * Management), where any "Other" reveals the tree's "Please list" textbox.
 *
 * Post-signup, so it renders the SUBMISSION tree (fetched by the
 * `useSubmissionQuestionsFetch` bootstrap hook) — same pattern as Nursing's
 * step 4: hydrate saved answers → Hide/Show recompute submission-wide → on
 * Continue save the whole group (`buildFullGroupSavePayload`: every visible
 * question, blanks included) → refresh the order → `/underwriting` (step 5).
 */
export default function LicenseScopePage() {
  const navigate = useNavigate();

  const submissionQuestionGroups = useStore(questionsStore, (s) => s.submissionQuestionGroups);
  const submissionQuestionsLoading = useStore(questionsStore, (s) => s.submissionQuestionsLoading);
  const submissionQuestionsError = useStore(questionsStore, (s) => s.submissionQuestionsError);
  const licenseScopeAnswers = useStore(questionsStore, (s) => s.licenseScopeAnswers);
  const impactAnswers = useStore(questionsStore, (s) => s.impactAnswers);
  const hiddenQuestionIds = useStore(questionsStore, (s) => s.hiddenQuestionIds);
  const flowSubmissionId = useStore(submissionStore, (s) => s.flowSubmissionId);

  const { quoteStripAnnualTotal, snapshotLimits, snapshotPolicyLine, quoteStripAmountPending } =
    useQuoteSnapshot();

  const group = findSubmissionGroup(submissionQuestionGroups, QUESTION_GROUP.licenseScope);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Browser Back → dashboard ──────────────────────────────────────────
  // Both the register and underwriting steps PUSH /license-scope onto the
  // history stack, so the native browser Back button would otherwise return
  // to whichever page the user came from. Back from this step (submission
  // already created) must ALWAYS land on the dashboard — matching the in-app
  // back arrow (`useWizardBackNav`, step 4). We seed one sentinel history
  // entry on mount; the first Back press pops it (the URL is still
  // /license-scope, so React Router doesn't change routes) and this popstate
  // handler redirects to the dashboard, keeping flowSubmissionId so the order
  // stays resumable.
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const onPopState = () => {
      sessionStore.dashView = "dashboard";
      navigate("/dashboard", { replace: true });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [navigate]);

  // Visibility (Hide/Show) recompute — submission-wide, since a rule could
  // target a question on another page.
  const recomputeHidden = () => {
    const liveAnswers = mergeAnswerMaps(
      questionsStore.questionAnswers,
      questionsStore.licenseScopeAnswers,
      questionsStore.underwritingAnswers,
    );
    questionsStore.setHiddenQuestionIds(
      recomputeHiddenQuestionIds(
        questionsStore.submissionQuestionGroups,
        liveAnswers,
        questionsStore.showTargetQuestionIds,
      ),
    );
  };

  // Hydrate saved answers from the submission tree. Merges UNDER current
  // store values so in-progress edits aren't clobbered on re-render.
  useEffect(() => {
    if (!group) return;
    const { answers, impacts } = hydrateSubmissionAnswers(group);
    if (Object.keys(answers).length > 0) {
      questionsStore.licenseScopeAnswers = { ...answers, ...questionsStore.licenseScopeAnswers };
    }
    if (Object.keys(impacts).length > 0) {
      questionsStore.impactAnswers = { ...impacts, ...questionsStore.impactAnswers };
    }
    recomputeHidden();
  }, [group]);

  const isTreeVisible = (q: any) => isVisibilityQuestionVisible(q, hiddenQuestionIds);

  const setRadio = (q: any, optionId: any) => {
    questionsStore.licenseScopeAnswers = {
      ...licenseScopeAnswers,
      [String(q.id)]: String(optionId),
    };
    recomputeHidden();
  };

  const toggleCheckbox = (q: any, optionId: any) => {
    const qid = String(q.id);
    const cur: string[] = Array.isArray(licenseScopeAnswers[qid]) ? licenseScopeAnswers[qid] : [];
    const has = cur.includes(String(optionId));
    const next = has ? cur.filter((x) => x !== String(optionId)) : [...cur, String(optionId)];
    questionsStore.licenseScopeAnswers = { ...licenseScopeAnswers, [qid]: next };
    recomputeHidden();
  };

  const setText = (q: any, value: any) => {
    questionsStore.licenseScopeAnswers = { ...licenseScopeAnswers, [String(q.id)]: value };
  };

  const requiredAnswered =
    Boolean(group) &&
    requiredQuestionsAnswered(group?.questions, licenseScopeAnswers, { isVisible: isTreeVisible });
  const canContinue = requiredAnswered && !saving;

  const handleContinue = async () => {
    if (!canContinue) return;
    if (!flowSubmissionId) {
      submissionStore.step = 5;
      navigate(STEP_PATHS[5], { replace: true });
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      // The whole group always goes in the payload — every visible question,
      // answered or blank — so unchecking everything clears the saved values.
      const payload = buildFullGroupSavePayload(
        QUESTION_GROUP.licenseScope,
        flowSubmissionId,
        submissionQuestionGroups,
        licenseScopeAnswers,
        impactAnswers,
        hiddenQuestionIds,
      );
      // `ins` accepts a group saved alone only once every earlier group is
      // complete; groups in the same request are exempt — so "About your
      // practice" rides along (see `earlierGroupSaveEntries`).
      const earlier = earlierGroupSaveEntries(
        QUESTION_GROUP.licenseScope,
        submissionQuestionGroups,
        licenseScopeAnswers,
        impactAnswers,
        hiddenQuestionIds,
      );
      if (payload?.groups?.length) {
        await saveSubmissionQuestionAnswers({
          ...payload,
          groups: [...earlier, ...payload.groups],
        });
      }
      await refreshPaymentOrder(flowSubmissionId);
      submissionStore.step = 5;
      navigate(STEP_PATHS[5], { replace: true });
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || "Could not save your answers.");
    } finally {
      setSaving(false);
    }
  };

  const visibleQuestions = group ? sortedQuestions(group.questions).filter(isTreeVisible) : [];

  return (
    <>
      <QuoteStrip
        total={quoteStripAnnualTotal}
        limits={snapshotLimits}
        claims={snapshotPolicyLine}
        amountPending={quoteStripAmountPending}
        amountSuffix="/yr"
      />
      <h2
        className="ui-heading"
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 19,
          fontWeight: 600,
          color: "#1a1a1a",
          margin: "6px 0 4px",
        }}
      >
        {group?.groupName || STEP_NAMES[4]}
      </h2>
      <p style={{ fontSize: 12, color: "#595959", marginBottom: 14, lineHeight: 1.5 }}>
        Check every procedure you perform. Choose &quot;Other&quot; to list anything that isn&apos;t
        shown.
      </p>

      {submissionQuestionsLoading && !group && <Loader label="Loading questions…" />}
      {submissionQuestionsError && (
        <Alert type="error">Couldn&apos;t load your questions. Please refresh the page.</Alert>
      )}

      {visibleQuestions.map((q: any) => (
        <QuestionRenderer
          key={q.id}
          question={q}
          answer={licenseScopeAnswers[String(q.id)]}
          onSetRadio={setRadio}
          onToggleCheckbox={toggleCheckbox}
          onSetText={setText}
          inlineOptions
        />
      ))}

      <Spacer />
      <Alert type="error" message={saveError} className="alert-center" />

      <button
        type="button"
        disabled={!canContinue}
        className="ui-btn-primary"
        style={dis(btnPrimary, canContinue)}
        onClick={handleContinue}
      >
        {saving ? "Saving…" : "Continue"}
      </button>
    </>
  );
}
