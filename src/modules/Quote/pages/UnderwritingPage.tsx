import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BRAND, RED, RED_BG } from "@/shared/constants";
import { Field } from "@/shared/components/Field";
import { TextInput } from "@/shared/components/TextInput";
import { TextArea } from "@/shared/components/TextArea";
import { QuoteStrip } from "@/modules/Quote/components/QuoteStrip";
import { Spacer } from "@/shared/components/Spacer";
import Alert from "@/shared/components/Alert";
import Loader from "@/shared/components/Loader";
import { btnPrimary, dis } from "@/shared/utils/styles";

import {
  buildUnderwritingGroupSavePayload,
  earlierGroupSaveEntries,
  findSubmissionGroup,
  hydrateSubmissionAnswers,
  isFreeTextQuestionType,
  isQuestionVisible as isVisibilityQuestionVisible,
  isYesNoQuestionType,
  isUnderwriterReviewOption,
  mergeAnswerMaps,
  normalizeQuestionType,
  recomputeHiddenQuestionIds,
  requiredQuestionsAnswered,
  saveSubmissionQuestionAnswers,
  sortedOptions,
  sortedQuestions,
} from "@/modules/Quote/api/questionsApi";
import { QUESTION_GROUP, STEP_PATHS } from "@/modules/Quote/steps";
import { refreshPaymentOrder } from "@/modules/Payment/services/paymentOrderService";

import { useStore } from "@/shared/store/useStore";
import questionsStore from "@/modules/Quote/store/questionsStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import { useQuoteSnapshot } from "@/modules/Quote/utils/useQuoteSnapshot";

export default function UnderwritingPage() {
  const navigate = useNavigate();

  // ── Store-backed reads ─────────────────────────────────────────────────
  const submissionQuestionGroups = useStore(questionsStore, (s) => s.submissionQuestionGroups);
  const submissionQuestionsLoading = useStore(questionsStore, (s) => s.submissionQuestionsLoading);
  const underwritingAnswers = useStore(questionsStore, (s) => s.underwritingAnswers);
  const hiddenQuestionIds = useStore(questionsStore, (s) => s.hiddenQuestionIds);
  const impactAnswers = useStore(questionsStore, (s) => s.impactAnswers);
  const underwritingSaving = useStore(questionsStore, (s) => s.underwritingSaving);
  const underwritingSaveError = useStore(questionsStore, (s) => s.underwritingSaveError);
  const submissionQuestionsError = useStore(questionsStore, (s) => s.submissionQuestionsError);
  const flowSubmissionId = useStore(submissionStore, (s) => s.flowSubmissionId);

  // Derived (premium, snapshot, allAnswered) all from one hook.
  const {
    quoteStripAnnualTotal,
    snapshotLimits,
    snapshotPolicyLine,
    quoteStripAmountPending,
    allAnswered,
  } = useQuoteSnapshot();

  // The real submission-scoped question tree is fetched by the app-level
  // `useSubmissionQuestionsFetch` bootstrap hook (react-query — one fetch
  // path for the whole app). This page just reads the store it seeds.

  // ── Question group + helpers ────────────────────────────────────────────
  // "Underwriting questions" — matcher in `Quote/steps.ts`.
  const underwritingGroup = findSubmissionGroup(
    submissionQuestionGroups,
    QUESTION_GROUP.underwriting,
  );
  const heading = "Underwriting";

  // ── Visibility (Hide/Show) recompute ──────────────────────────────────
  // Reads live state straight off the store rather than the render-time
  // answer variables, so calling it synchronously right after an answer
  // write in the same tick still sees the new answer. Merges every answer
  // map submission-wide (not just this page's) — a Hide/Show rule could span
  // groups that live on other pages (`/license-scope`).
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

  // Hydrate saved answers + defaults from the submission tree. Merges UNDER
  // current store values so in-progress edits aren't clobbered on re-render.
  useEffect(() => {
    if (!underwritingGroup) return;
    const { answers, impacts } = hydrateSubmissionAnswers(underwritingGroup);
    if (Object.keys(answers).length > 0) {
      questionsStore.underwritingAnswers = { ...answers, ...questionsStore.underwritingAnswers };
    }
    if (Object.keys(impacts).length > 0) {
      questionsStore.impactAnswers = { ...impacts, ...questionsStore.impactAnswers };
    }
    recomputeHidden();
  }, [underwritingGroup]);

  const allQuestions = sortedQuestions(underwritingGroup?.questions);
  // Both rendered lists filter out Visibility-hidden rows up front, so a
  // hidden question can't render and can't feed `isAnyReviewSelected`.
  const yesNoQuestions = allQuestions.filter(
    (q) =>
      isYesNoQuestionType(q?.questionType) && isVisibilityQuestionVisible(q, hiddenQuestionIds),
  );
  // Follow-up "explain your Yes" fields. The real `ins` tree types these as
  // TEXT_AREA / NUMBER_INPUT as well as plain TEXTBOX — match the whole
  // free-text family (a `TEXTBOX`-only filter silently dropped them, so a
  // "Yes" showed no follow-up to fill in).
  const followupQuestions = allQuestions.filter(
    (q) =>
      isFreeTextQuestionType(q?.questionType) && isVisibilityQuestionVisible(q, hiddenQuestionIds),
  );

  // "Does any picked answer refer this application to an underwriter?" — by
  // the `ins` flag on the option (`underwriterReviewImpact`), not its "Yes"
  // label. Drives the explanation field and the Continue label.
  const isAnyReviewSelected = yesNoQuestions.some((q) => {
    const sel = underwritingAnswers[String(q.id)];
    if (sel == null) return false;
    const opt = (q.options || []).find((o: any) => String(o.id) === String(sel));
    return Boolean(opt) && isUnderwriterReviewOption(opt);
  });
  const isOptionSelected = (q: any, optionId: any) =>
    String(underwritingAnswers[String(q.id)]) === String(optionId);

  // Continue gate: every yes/no question answered (`allAnswered`) AND every
  // required question satisfied. Follow-up textboxes only render once an
  // answer flagged for underwriter review is picked, so they only gate while visible.
  // This page's bespoke follow-up rule pre-dates configurable Visibility and
  // is kept ALONGSIDE it, not replaced — a question has to clear both.
  const isFollowupVisible = (q: any) =>
    isFreeTextQuestionType(q?.questionType) ? isAnyReviewSelected : true;
  const isVisible = (q: any) =>
    isFollowupVisible(q) && isVisibilityQuestionVisible(q, hiddenQuestionIds);
  const requiredAnswered = requiredQuestionsAnswered(allQuestions, underwritingAnswers, {
    isVisible,
  });
  const canContinue = allAnswered && requiredAnswered && !underwritingSaving;

  // ── Answer setters (write straight to questionsStore) ──────────────────
  // Only the choice-option setter recomputes Visibility — a Hide/Show rule is
  // always configured against an option, never a free-text answer.
  const setRadio = (q: any, optionId: any) => {
    questionsStore.underwritingAnswers = {
      ...underwritingAnswers,
      [String(q.id)]: String(optionId),
    };
    recomputeHidden();
  };
  const setText = (q: any, value: any) => {
    questionsStore.underwritingAnswers = {
      ...underwritingAnswers,
      [String(q.id)]: value,
    };
  };

  // ── Continue: save underwriting answers, then route to /reviewDocusign ──
  const handleContinue = async () => {
    if (underwritingSaving) return;
    if (!allAnswered || !requiredAnswered) return;
    if (!flowSubmissionId) {
      questionsStore.underwritingSaveError =
        "Your application was not opened. Go back to your dashboard and resume it.";
      return;
    }
    const payload = buildUnderwritingGroupSavePayload(
      flowSubmissionId,
      submissionQuestionGroups,
      underwritingAnswers,
      impactAnswers,
      hiddenQuestionIds,
    );
    if (!payload) {
      questionsStore.underwritingSaveError = "Could not build your answers. Please try again.";
      return;
    }

    // `ins` accepts a group saved alone only once every earlier group is
    // complete; groups in the same request are exempt — so "About your
    // practice" and "License, Scope & Practice" ride along
    // (see `earlierGroupSaveEntries`).
    const earlier = earlierGroupSaveEntries(
      QUESTION_GROUP.underwriting,
      submissionQuestionGroups,
      mergeAnswerMaps(questionsStore.licenseScopeAnswers, underwritingAnswers),
      impactAnswers,
      hiddenQuestionIds,
    );

    questionsStore.underwritingSaveError = null;
    questionsStore.underwritingSaving = true;
    try {
      await saveSubmissionQuestionAnswers({ ...payload, groups: [...earlier, ...payload.groups] });
      // Re-fetch the order so `questionRequired` reflects the just-saved state.
      // Use refreshPaymentOrder so loadedSubmissionId stays in sync with
      // usePolicyStatus (setting paymentOrderDetails alone left hasOrder false).
      const freshOrder = await refreshPaymentOrder(flowSubmissionId);
      if (freshOrder?.questionRequired === true) {
        questionsStore.underwritingSaveError =
          "Please answer all required questions before proceeding.";
        return;
      }
      submissionStore.step = 6;
      navigate(STEP_PATHS[6], { replace: true });
    } catch (err: any) {
      questionsStore.underwritingSaveError = err?.message || "Could not save underwriting answers.";
    } finally {
      questionsStore.underwritingSaving = false;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <QuoteStrip
        total={quoteStripAnnualTotal}
        limits={snapshotLimits}
        claims={snapshotPolicyLine}
        amountPending={quoteStripAmountPending}
        amountLabel="Your total"
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
        {heading}
      </h2>
      <p style={{ fontSize: 12, color: "#595959", marginBottom: 14, lineHeight: 1.5 }}>
        Answer every question. A &quot;Yes&quot; doesn&apos;t disqualify you — it means an
        underwriter reviews your application, and you&apos;ll be asked to explain it below.
      </p>

      {submissionQuestionsLoading && yesNoQuestions.length === 0 && (
        <Loader label="Loading questions…" />
      )}
      {submissionQuestionsError && (
        <Alert type="error">Couldn&apos;t load your questions. Please refresh the page.</Alert>
      )}

      <h3
        className="ui-heading"
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 15,
          fontWeight: 600,
          color: "#1a1a1a",
          margin: "4px 0 8px",
        }}
      >
        {underwritingGroup?.groupName || "Underwriting questions"}
      </h3>

      {yesNoQuestions.map((q, i) => {
        const qid = String(q.id);
        const opts = sortedOptions(q.options);
        // Highlight when the picked option is one `ins` flags for underwriter
        // review (`underwriterReviewImpact`) — not merely one labelled "Yes".
        const selectedOpt = opts.find((o) => isOptionSelected(q, o.id));
        const reviewSelected = Boolean(selectedOpt) && isUnderwriterReviewOption(selectedOpt);
        return (
          <div
            key={qid}
            style={{
              marginBottom: 8,
              padding: "10px 12px",
              background: reviewSelected ? RED_BG : "#fafafa",
              borderRadius: 10,
              border: `1px solid ${reviewSelected ? "#f0c0c0" : "transparent"}`,
              transition: "all 0.2s",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: reviewSelected ? RED : "#333",
                marginBottom: q.questionDescription ? 4 : 8,
              }}
            >
              <span style={{ color: "#595959", fontWeight: 500 }}>{i + 1}.</span> {q.questionText}
              {q.isRequired && <span style={{ color: RED, marginLeft: 4 }}>*</span>}
            </div>
            {q.questionDescription && (
              <div
                style={{
                  fontSize: 11,
                  color: "#595959",
                  marginBottom: 8,
                  lineHeight: 1.4,
                  paddingLeft: 16,
                }}
              >
                {q.questionDescription}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {opts.map((o) => {
                const flagsReview = isUnderwriterReviewOption(o);
                const sel = isOptionSelected(q, o.id);
                const desc = o.optionDescription || o.description || null;
                return (
                  <div
                    key={o.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 2,
                    }}
                  >
                    <button
                      onClick={() => setRadio(q, o.id)}
                      style={{
                        padding: "6px 18px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: "var(--font-body)",
                        border: "none",
                        background: sel ? (flagsReview ? RED : BRAND) : "#e8e8e6",
                        color: sel ? "#fff" : "#666",
                        transition: "all 0.15s",
                      }}
                    >
                      {o.optionLabel}
                    </button>
                    {desc && (
                      <div
                        style={{
                          fontSize: 10,
                          color: "#595959",
                          lineHeight: 1.4,
                          paddingLeft: 2,
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {desc}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {isAnyReviewSelected &&
        followupQuestions.map((q) => {
          const qid = String(q.id);
          const opts = q.options || [];
          const isNumber = normalizeQuestionType(q.questionType) === "NUMBER_INPUT";
          const labelWithRequired = (
            <>
              {q.questionText}
              {q.isRequired && <span style={{ color: RED, marginLeft: 4 }}>*</span>}
            </>
          );
          return (
            <Field key={qid} label={labelWithRequired}>
              {q.questionDescription && (
                <div style={{ fontSize: 11, color: "#595959", marginBottom: 6, lineHeight: 1.4 }}>
                  {q.questionDescription}
                </div>
              )}
              {isNumber ? (
                <TextInput
                  inputMode="numeric"
                  value={underwritingAnswers[qid] || ""}
                  onChange={(x) => setText(q, x.replace(/\D/g, ""))}
                  placeholder={opts[0]?.optionLabel || "e.g. 1"}
                />
              ) : (
                <TextArea
                  value={underwritingAnswers[qid] || ""}
                  onChange={(x) => setText(q, x)}
                  placeholder={opts[0]?.optionLabel || "Describe the circumstances..."}
                />
              )}
            </Field>
          );
        })}

      <Spacer />
      <Alert type="error" message={underwritingSaveError} className="alert-center" />

      <button
        type="button"
        disabled={!canContinue}
        className="ui-btn-primary"
        style={dis(btnPrimary, canContinue)}
        onClick={handleContinue}
      >
        {underwritingSaving
          ? "Saving…"
          : isAnyReviewSelected
            ? "Submit for review"
            : "See my final quote"}
      </button>
    </>
  );
}
