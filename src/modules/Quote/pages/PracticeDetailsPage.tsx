import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QUESTION_GROUP, STEP_NAMES, STEP_PATHS } from "@/modules/Quote/steps";
import { QuoteStrip } from "@/modules/Quote/components/QuoteStrip";
import { QuestionRenderer } from "@/modules/Quote/components/QuestionRenderer";
import { Spacer } from "@/shared/components/Spacer";
import Alert from "@/shared/components/Alert";
import Loader from "@/shared/components/Loader";
import { btnPrimary, dis } from "@/shared/utils/styles";
import {
  findSubmissionGroup,
  isQuestionVisible,
  recomputeHiddenQuestionIds,
  requiredQuestionsAnswered,
  seedMasterDefaultAnswers,
  sortedQuestions,
} from "@/modules/Quote/api/questionsApi";
import { useSpeciality } from "@/modules/Quote/api/specialityApi";
import { useQuestionsAutoLoad } from "@/hooks/useQuestionsFetcher";

import { useStore } from "@/shared/store/useStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import questionsStore from "@/modules/Quote/store/questionsStore";
import { useQuoteSnapshot } from "@/modules/Quote/utils/useQuoteSnapshot";

/**
 * Step 2 (`/practice`) — "About your practice": the pre-signup group of this
 * speciality's real `ins` master question tree (matcher in `Quote/steps.ts`).
 * Six required yes/no scope questions; any "Yes" reveals the tree's own
 * "Please explain" follow-up through its Show rule.
 *
 * No submission exists yet, so the answers live in
 * `questionsStore.questionAnswers` (master ids) and ride into the real
 * submission-create call via `buildSubmissionRequest`'s `questionSaveRequest`,
 * scoped to the groups the applicant visited — same mechanism as `Q2BNfy`'s
 * `ClassificationPage`. The Home Page warms this tree at idle once the
 * speciality id is known, so it normally opens without a loader.
 */
export default function PracticeDetailsPage() {
  const navigate = useNavigate();

  const specialityQ = useSpeciality();
  const specialityId = specialityQ.data?.id ?? null;

  const { questions: questionGroups, loading, error } = useQuestionsAutoLoad(specialityId);
  const questionAnswers = useStore(questionsStore, (s) => s.questionAnswers);
  const masterHiddenQuestionIds = useStore(questionsStore, (s) => s.masterHiddenQuestionIds);

  const { quoteStripAnnualTotal, snapshotLimits, snapshotPolicyLine, quoteStripAmountPending } =
    useQuoteSnapshot();

  const group = findSubmissionGroup(questionGroups, QUESTION_GROUP.practice);

  useEffect(() => {
    if (group) questionsStore.markGroupVisited(group.groupName);
  }, [group]);

  const isVisible = (q: any) => isQuestionVisible(q, masterHiddenQuestionIds);

  const recomputeMasterHidden = () => {
    questionsStore.setMasterHiddenQuestionIds(
      recomputeHiddenQuestionIds(
        questionsStore.questionGroups,
        questionsStore.questionAnswers,
        questionsStore.masterShowTargetQuestionIds,
      ),
    );
  };

  // Seed each question's server-flagged default option for anything the user
  // hasn't answered yet. The master tree carries no saved answers, so without
  // this an `isDefault` choice would never land (the submission-scoped pages
  // get this for free via hydrateSubmissionAnswers).
  useEffect(() => {
    if (!group) return;
    const seeded = seedMasterDefaultAnswers(group, questionsStore.questionAnswers);
    if (Object.keys(seeded).length > 0) {
      questionsStore.questionAnswers = { ...seeded, ...questionsStore.questionAnswers };
      recomputeMasterHidden();
    }
  }, [group]);

  const setRadio = (q: any, optionId: any) => {
    questionsStore.questionAnswers = { ...questionAnswers, [String(q.id)]: String(optionId) };
    recomputeMasterHidden();
  };

  const toggleCheckbox = (q: any, optionId: any) => {
    const qid = String(q.id);
    const cur: string[] = Array.isArray(questionAnswers[qid]) ? questionAnswers[qid] : [];
    const has = cur.includes(String(optionId));
    const next = has ? cur.filter((x) => x !== String(optionId)) : [...cur, String(optionId)];
    questionsStore.questionAnswers = { ...questionAnswers, [qid]: next };
    recomputeMasterHidden();
  };

  const setText = (q: any, value: any) => {
    questionsStore.questionAnswers = { ...questionAnswers, [String(q.id)]: value };
  };

  // The group must actually be on screen — an unloaded tree must not read as
  // "nothing required".
  const canContinue =
    Boolean(group) && requiredQuestionsAnswered(group?.questions, questionAnswers, { isVisible });

  const handleContinue = () => {
    if (!canContinue) return;
    submissionStore.step = 3;
    navigate(STEP_PATHS[3]);
  };

  const visibleQuestions = group ? sortedQuestions(group.questions).filter(isVisible) : [];

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
        {group?.groupName || STEP_NAMES[2]}
      </h2>
      <p style={{ fontSize: 12, color: "#595959", marginBottom: 14, lineHeight: 1.5 }}>
        Tell us about the procedures you perform. A &quot;Yes&quot; doesn&apos;t disqualify you —
        you&apos;ll just be asked to explain it.
      </p>

      {(loading || specialityQ.isPending) && <Loader label="Loading questions…" />}
      {(error || specialityQ.isError) && (
        <Alert type="error">Couldn&apos;t load your questions. Please refresh the page.</Alert>
      )}

      {visibleQuestions.map((q: any) => (
        <QuestionRenderer
          key={q.id}
          question={q}
          answer={questionAnswers[String(q.id)]}
          onSetRadio={setRadio}
          onToggleCheckbox={toggleCheckbox}
          onSetText={setText}
          inlineOptions
        />
      ))}

      <Spacer />
      <button
        type="button"
        disabled={!canContinue}
        className="ui-btn-primary"
        style={dis(btnPrimary, canContinue)}
        onClick={handleContinue}
      >
        Continue
      </button>
    </>
  );
}
