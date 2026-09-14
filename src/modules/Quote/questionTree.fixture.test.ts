import { describe, expect, it } from "vitest";
import tree from "@/modules/Quote/__fixtures__/im-question-tree.json";
import { QUESTION_GROUP, unmappedGroupNames } from "@/modules/Quote/steps";
import {
  SpecialityQuestionGroupDto,
  SubmissionQuestionGroupResponseDto,
} from "@/shared/dtos/questions.dto";
import {
  buildFullGroupSavePayload,
  earlierGroupSaveEntries,
  isUnderwriterReviewOption,
  isYesOption,
  recomputeHiddenQuestionIds,
  requiredQuestionsAnswered,
  resolveMasterVisibilityTargets,
  underwritingNeedsReviewFromSubmissionGroups,
} from "@/modules/Quote/api/questionsApi";

// Pins the portal against the question tree `ins` serves for this speciality
// (`GET /questions?specialityId=`, captured into the fixture). If `ins`
// renames a group, adds one, or starts using a type `QuestionRenderer`
// can't draw, this is where it shows. Also carries the Continue-gate
// coverage Nursing's `submissionLocal.questionRequired.test.js` had, now
// against `requiredQuestionsAnswered` + the real tree's Show rules.

const TREE: any[] = tree as any[];
const { groups, showTargetQuestionIds } = resolveMasterVisibilityTargets(TREE);

const group = (re: RegExp) => groups.find((g: any) => re.test(String(g.groupName)));
const ofType = (g: any, type: string) => g.questions.filter((q: any) => q.questionType === type);
const yesOf = (q: any) => q.options.find((o: any) => isYesOption(o));
const noOf = (q: any) => q.options.find((o: any) => !isYesOption(o));

const hiddenFor = (answers: Record<string, any>) =>
  recomputeHiddenQuestionIds(groups, answers, showTargetQuestionIds);
const gate = (g: any, answers: Record<string, any>) => {
  const hidden = hiddenFor(answers);
  return requiredQuestionsAnswered(g.questions, answers, { isVisible: (q) => !hidden.has(q.id) });
};
const allNo = (questions: any[]) =>
  Object.fromEntries(questions.map((q) => [String(q.id), String(noOf(q).id)]));

describe("captured ins question tree ↔ steps.ts", () => {
  it("each question step's matcher resolves to exactly one group", () => {
    for (const re of Object.values(QUESTION_GROUP)) {
      expect(TREE.filter((g) => re.test(String(g.groupName)))).toHaveLength(1);
    }
  });

  it("leaves no group unrendered", () => {
    expect(unmappedGroupNames(TREE)).toEqual([]);
  });

  it("uses only question types QuestionRenderer draws", () => {
    const types = new Set(TREE.flatMap((g) => g.questions.map((q: any) => q.questionType)));
    expect([...types].every((t) => ["YES_NO", "CHECKBOX", "TEXTBOX"].includes(t))).toBe(true);
  });

  it("keeps every Hide/Show target inside its source's group", () => {
    for (const g of TREE) {
      const ids = new Set(g.questions.map((q: any) => Number(q.id)));
      for (const q of g.questions) {
        for (const o of q.options) {
          for (const t of [...o.showQuestions, ...o.hideQuestions]) {
            expect(ids.has(Number(t))).toBe(true);
          }
        }
      }
    }
  });

  it("has no rating impacts — pricing is the quotedata defaults alone", () => {
    const impacts = TREE.flatMap((g) =>
      g.questions.flatMap((q: any) => q.options.flatMap((o: any) => o.impacts)),
    );
    expect(impacts).toEqual([]);
  });

  it("gives every YES_NO question exactly one Yes (detected by label)", () => {
    for (const g of TREE) {
      for (const q of ofType(g, "YES_NO")) {
        expect(q.options.filter((o: any) => isYesOption(o))).toHaveLength(1);
      }
    }
  });
});

describe("About your practice (/practice, master tree)", () => {
  const g = group(QUESTION_GROUP.practice);
  const yesNos = ofType(g, "YES_NO");
  const [explain] = ofType(g, "TEXTBOX");

  it("hides 'Please explain' until a Yes", () => {
    expect(hiddenFor({}).has(explain.id)).toBe(true);
    expect(hiddenFor(allNo(yesNos)).has(explain.id)).toBe(true);
    const oneYes = { ...allNo(yesNos), [String(yesNos[0].id)]: String(yesOf(yesNos[0]).id) };
    expect(hiddenFor(oneYes).has(explain.id)).toBe(false);
  });

  it("requires all six yes/no answers before Continue", () => {
    expect(yesNos).toHaveLength(6);
    expect(gate(g, allNo(yesNos))).toBe(true);
    const missingOne = allNo(yesNos);
    delete missingOne[String(yesNos[5].id)];
    expect(gate(g, missingOne)).toBe(false);
  });

  it("does not require the explanation once shown (as configured in ins)", () => {
    const oneYes = { ...allNo(yesNos), [String(yesNos[2].id)]: String(yesOf(yesNos[2]).id) };
    expect(gate(g, oneYes)).toBe(true);
  });
});

describe("License, Scope & Practice (/license-scope)", () => {
  const g = group(QUESTION_GROUP.licenseScope);
  const checklists = ofType(g, "CHECKBOX");
  const [list] = ofType(g, "TEXTBOX");
  const otherOf = (q: any) => q.options.find((o: any) => o.visibilityShowTargetIds.length > 0);

  it("has four optional procedure checklists", () => {
    expect(checklists).toHaveLength(4);
    expect(gate(g, {})).toBe(true);
  });

  it("shows 'Please list' while any checklist's Other is checked", () => {
    expect(hiddenFor({}).has(list.id)).toBe(true);
    for (const q of checklists) {
      expect(hiddenFor({ [String(q.id)]: [String(otherOf(q).id)] }).has(list.id)).toBe(false);
    }
    const plain = checklists[0].options.find((o: any) => o.visibilityShowTargetIds.length === 0);
    expect(hiddenFor({ [String(checklists[0].id)]: [String(plain.id)] }).has(list.id)).toBe(true);
  });
});

// ins rejects a group saved alone unless every lower-`displayOrder` group is
// complete (every visible question answered, optional ones too); groups in
// the same request are exempt — so later pages re-send the earlier groups.
describe("saving a later group re-sends the earlier ones", () => {
  const practice = group(QUESTION_GROUP.practice);
  const license = group(QUESTION_GROUP.licenseScope);
  const ids = (entries: any[]) => entries.map((e) => e.submissionQuestionGroupId);

  it("/practice has nothing before it", () => {
    expect(earlierGroupSaveEntries(QUESTION_GROUP.practice, groups, {}, {}, hiddenFor({}))).toEqual(
      [],
    );
  });

  it("/license-scope sends About your practice, hidden follow-up left out", () => {
    const answers = allNo(ofType(practice, "YES_NO"));
    const entries = earlierGroupSaveEntries(
      QUESTION_GROUP.licenseScope,
      groups,
      answers,
      {},
      hiddenFor(answers),
    );
    expect(ids(entries)).toEqual([practice.id]);
    expect(entries[0].questions).toHaveLength(6);
    expect(entries[0].questions.every((q: any) => q.options.length === 1)).toBe(true);
  });

  it("/underwriting sends both earlier groups, in displayOrder", () => {
    const entries = earlierGroupSaveEntries(
      QUESTION_GROUP.underwriting,
      groups,
      {},
      {},
      hiddenFor({}),
    );
    expect(ids(entries)).toEqual([practice.id, license.id]);
  });

  // Regression: practice all "No" + nothing checked on /license-scope used to
  // send each checklist as `options: []`, which ins 400s ("At least one option
  // is required", `@Size(min = 1)`).
  it("/underwriting with nothing checked on /license-scope sends that group empty", () => {
    const answers = allNo(ofType(practice, "YES_NO"));
    const entries = earlierGroupSaveEntries(
      QUESTION_GROUP.underwriting,
      groups,
      answers,
      {},
      hiddenFor(answers),
    );
    for (const e of entries) {
      expect(e.questions.every((q: any) => q.options.length > 0)).toBe(true);
    }
    expect(entries[0].questions).toHaveLength(6);
    expect(entries[1].questions).toEqual([]);
  });
});

// `ins` rejects both ways of sending an unanswered choice question: `options: []`
// fails the save DTO's `@Size(min = 1)` ("At least one option is required"),
// and `answerValue: ""` on a checkbox option fails the value check (it must be
// that option's own `optionValue` — "Invalid answer of question Cardiology").
// So an unanswered choice question is left out; `ins` writes the blank itself
// for every option of a saved group the request omits. Only free-text fields
// (which `ins` doesn't value-match) carry `answerValue: ""`.
describe("/license-scope save sends unanswered questions in the shape ins accepts", () => {
  const license = group(QUESTION_GROUP.licenseScope);
  const checklists = ofType(license, "CHECKBOX");
  const [list] = ofType(license, "TEXTBOX");
  const save = (answers: Record<string, any>) =>
    buildFullGroupSavePayload(
      QUESTION_GROUP.licenseScope,
      99,
      groups,
      answers,
      {},
      hiddenFor(answers),
    ).groups[0].questions;
  const entryFor = (entries: any[], q: any) =>
    entries.find((e: any) => e.submissionQuestionId === q.id);

  it("an unchecked checklist is left out, never sent with empty or blank options", () => {
    const entries = save({});
    for (const q of checklists) expect(entryFor(entries, q)).toBeUndefined();
    // Hidden "Please list" is never sent at all — so nothing checked sends the
    // group with no questions, which `ins` accepts and saves as all-blank.
    expect(entryFor(entries, list)).toBeUndefined();
    expect(entries).toEqual([]);
  });

  it("every checklist option sent carries that option's own value", () => {
    const [q] = checklists;
    const picks = q.options.slice(0, 2);
    const entry = entryFor(save({ [String(q.id)]: picks.map((o: any) => String(o.id)) }), q);
    expect(entry.options.map((o: any) => o.submissionQuestionOptionId)).toEqual(
      picks.map((o: any) => o.id),
    );
    for (const sent of entry.options) {
      const opt = q.options.find((o: any) => o.id === sent.submissionQuestionOptionId);
      expect(sent.answerValue.toLowerCase()).toBe(String(opt.optionValue).toLowerCase());
    }
  });

  it("a shown but empty 'Please list' is sent blank", () => {
    const [q] = checklists;
    const other = q.options.find((o: any) => o.visibilityShowTargetIds.length > 0);
    const entry = entryFor(save({ [String(q.id)]: [String(other.id)] }), list);
    expect(entry.options).toHaveLength(1);
    expect(entry.options[0].answerValue).toBe("");
  });
});

describe("Underwriting questions (/underwriting)", () => {
  const g = group(QUESTION_GROUP.underwriting);
  const yesNos = ofType(g, "YES_NO");
  const [explanation] = ofType(g, "TEXTBOX");

  it("passes with every answer No, explanation hidden", () => {
    expect(yesNos).toHaveLength(13);
    const answers = allNo(yesNos);
    expect(hiddenFor(answers).has(explanation.id)).toBe(true);
    expect(gate(g, answers)).toBe(true);
  });

  it("flags every Yes for underwriter review", () => {
    for (const q of yesNos) expect(yesOf(q).underwriterReviewImpact).toBe(true);
  });

  it("highlights by the underwriterReviewImpact flag, not by the Yes label", () => {
    for (const q of yesNos) {
      expect(isUnderwriterReviewOption(yesOf(q))).toBe(true);
      expect(isUnderwriterReviewOption(noOf(q))).toBe(false);
    }
    // "About your practice" Yes options carry no review flag → no highlight.
    const practiceYes = ofType(group(QUESTION_GROUP.practice), "YES_NO").map(yesOf);
    expect(practiceYes.length).toBeGreaterThan(0);
    for (const o of practiceYes) expect(isUnderwriterReviewOption(o)).toBe(false);
    // The flag decides, whatever the label; missing / non-boolean reads as false.
    expect(isUnderwriterReviewOption({ optionLabel: "No", underwriterReviewImpact: true })).toBe(
      true,
    );
    expect(isUnderwriterReviewOption({ optionLabel: "Yes" })).toBe(false);
    expect(isUnderwriterReviewOption({ optionLabel: "Yes", underwriterReviewImpact: "true" })).toBe(
      false,
    );
    expect(isUnderwriterReviewOption(null)).toBe(false);
  });

  it("reads a saved referral off the flag (submission tree answers)", () => {
    // Submission-tree shape: the picked option carries a non-empty answerValue.
    const saved = (pick: (q: any) => any) => [
      {
        ...g,
        questions: g.questions.map((q: any) => {
          const chosen = q.questionType === "YES_NO" ? pick(q) : null;
          return {
            ...q,
            options: q.options.map((o: any) => ({
              ...o,
              answerValue: o === chosen ? o.optionLabel : null,
            })),
          };
        }),
      },
    ];
    const target = yesNos[3];
    expect(underwritingNeedsReviewFromSubmissionGroups([])).toBeNull();
    expect(underwritingNeedsReviewFromSubmissionGroups(saved(noOf))).toBe(false);
    expect(
      underwritingNeedsReviewFromSubmissionGroups(
        saved((q) => (q === target ? yesOf(q) : noOf(q))),
      ),
    ).toBe(true);
  });

  it("requires the explanation once any Yes is picked", () => {
    const q = yesNos[7];
    const answers = { ...allNo(yesNos), [String(q.id)]: String(yesOf(q).id) };
    expect(hiddenFor(answers).has(explanation.id)).toBe(false);
    expect(gate(g, answers)).toBe(false);
    expect(gate(g, { ...answers, [String(explanation.id)]: "Explained." })).toBe(true);
  });
});

// The trees reach the pages through these DTOs, which copy only the fields
// they declare — a flag missing there never reaches `isUnderwriterReviewOption`.
describe("question DTOs keep underwriterReviewImpact", () => {
  it("master tree (SpecialityQuestionGroupDto)", () => {
    const raw = TREE.find((x: any) => QUESTION_GROUP.underwriting.test(String(x.groupName)));
    const dto = new SpecialityQuestionGroupDto(raw);
    const yesNos = dto.questions.filter((q) => q.questionType === "YES_NO");
    expect(yesNos).toHaveLength(13);
    for (const q of yesNos) {
      expect(isUnderwriterReviewOption(yesOf(q))).toBe(true);
      expect(isUnderwriterReviewOption(noOf(q))).toBe(false);
    }
  });

  it("submission tree (SubmissionQuestionGroupResponseDto), as ins sends it", () => {
    const dto = new SubmissionQuestionGroupResponseDto({
      id: 371,
      groupName: "Underwriting questions",
      displayOrder: 3,
      questions: [
        {
          id: 1921,
          questionId: 264,
          questionType: "YES_NO",
          options: [
            { id: 5053, optionLabel: "Yes", underwriterReviewImpact: true, showQuestions: ["277"] },
            { id: 5054, optionLabel: "No", underwriterReviewImpact: false },
          ],
        },
      ],
    });
    const [yes, no] = dto.questions[0].options;
    expect(isUnderwriterReviewOption(yes)).toBe(true);
    expect(isUnderwriterReviewOption(no)).toBe(false);
  });
});
