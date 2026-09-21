// Trimmed-but-real question-tree fixtures for the Internal Medicine
// speciality, built from the real ids/text captured in
// src/modules/Quote/__fixtures__/im-question-tree.json (see that file's
// header — 3 groups: "About your practice" / "License, Scope & Practice" /
// "Underwriting questions"). Trimmed to a couple of questions per group so
// specs stay fast and readable; every id, matcher and business rule (Yes
// reveals "Please explain" via a Show target, `underwriterReviewImpact` on
// specific Underwriting options) is real, not invented.

export const SPECIALITY_ID = 10512;
export const SUBMISSION_ID = 700501;

const SUB_ID_OFFSET = 10000;

/**
 * The MASTER tree — GET /questions?specialityId=... — used pre-signup by
 * `/practice`. Question/option ids ARE the master ids (no remapping needed;
 * see questionsApi.js's `resolveMasterVisibilityTargets`).
 */
export function buildMasterQuestionGroups() {
  return [
    {
      id: 100,
      groupName: "About your practice",
      displayOrder: 1,
      questions: [
        {
          id: 278,
          questionText:
            "Do you perform any procedures you did not receive training in your residency or that are outside the customary scope of practice for your specialty?",
          questionDescription: null,
          displayOrder: 1,
          questionType: "YES_NO",
          isRequired: true,
          options: [
            {
              id: 533,
              optionLabel: "Yes",
              optionValue: "Yes",
              optionDescription: null,
              displayOrder: 1,
              isDefault: false,
              underwriterReviewImpact: false,
              impacts: [],
              hideQuestions: [],
              showQuestions: ["285"],
            },
            {
              id: 534,
              optionLabel: "No",
              optionValue: "No",
              optionDescription: null,
              displayOrder: 2,
              isDefault: false,
              underwriterReviewImpact: false,
              impacts: [],
              hideQuestions: [],
              showQuestions: [],
            },
          ],
        },
        {
          id: 279,
          questionText: "Do you perform bariatric surgery?",
          questionDescription: null,
          displayOrder: 2,
          questionType: "YES_NO",
          isRequired: true,
          options: [
            {
              id: 535,
              optionLabel: "Yes",
              optionValue: "Yes",
              optionDescription: null,
              displayOrder: 1,
              isDefault: false,
              underwriterReviewImpact: false,
              impacts: [],
              hideQuestions: [],
              showQuestions: ["285"],
            },
            {
              id: 536,
              optionLabel: "No",
              optionValue: "No",
              optionDescription: null,
              displayOrder: 2,
              isDefault: false,
              underwriterReviewImpact: false,
              impacts: [],
              hideQuestions: [],
              showQuestions: [],
            },
          ],
        },
        {
          id: 285,
          questionText: "Please explain",
          questionDescription: null,
          displayOrder: 7,
          questionType: "TEXTBOX",
          isRequired: false,
          options: [
            {
              id: 546,
              optionLabel: "Please provide details, if applicable",
              optionValue: "",
              optionDescription: null,
              displayOrder: 1,
              isDefault: false,
              underwriterReviewImpact: false,
              impacts: [],
              hideQuestions: [],
              showQuestions: [],
            },
          ],
        },
      ],
    },
    {
      id: 101,
      groupName: "License, Scope & Practice",
      displayOrder: 2,
      questions: [
        {
          id: 284,
          questionText: "Please check all procedures that you perform",
          questionDescription: null,
          displayOrder: 1,
          questionType: "CHECKBOX",
          isRequired: false,
          options: [
            {
              id: 545,
              optionLabel: "Abortion",
              optionValue: "true",
              optionDescription: null,
              displayOrder: 1,
              isDefault: false,
              underwriterReviewImpact: false,
              impacts: [],
              hideQuestions: [],
              showQuestions: [],
            },
            {
              id: 547,
              optionLabel: "Adenoidectomy",
              optionValue: "true",
              optionDescription: null,
              displayOrder: 2,
              isDefault: false,
              underwriterReviewImpact: false,
              impacts: [],
              hideQuestions: [],
              showQuestions: [],
            },
          ],
        },
        {
          id: 290,
          questionText: "Other, please list",
          questionDescription: null,
          displayOrder: 5,
          questionType: "TEXTBOX",
          isRequired: false,
          options: [
            {
              id: 584,
              optionLabel: "Please list",
              optionValue: "",
              optionDescription: null,
              displayOrder: 1,
              isDefault: false,
              underwriterReviewImpact: false,
              impacts: [],
              hideQuestions: [],
              showQuestions: [],
            },
          ],
        },
      ],
    },
    {
      id: 99,
      groupName: "Underwriting questions",
      displayOrder: 3,
      questions: [
        {
          id: 264,
          questionText: "Are you involved or do you participate in any clinical research trials?",
          questionDescription: null,
          displayOrder: 1,
          questionType: "YES_NO",
          isRequired: true,
          options: [
            {
              id: 506,
              optionLabel: "Yes",
              optionValue: "Yes",
              optionDescription: null,
              displayOrder: 1,
              isDefault: false,
              underwriterReviewImpact: true,
              impacts: [],
              hideQuestions: [],
              showQuestions: ["277"],
            },
            {
              id: 507,
              optionLabel: "No",
              optionValue: "No",
              optionDescription: null,
              displayOrder: 2,
              isDefault: false,
              underwriterReviewImpact: false,
              impacts: [],
              hideQuestions: [],
              showQuestions: [],
            },
          ],
        },
        {
          id: 265,
          questionText:
            "Do you provide services at any nursing home, assisted living, or correctional facility?",
          questionDescription: null,
          displayOrder: 2,
          questionType: "YES_NO",
          isRequired: true,
          options: [
            {
              id: 508,
              optionLabel: "Yes",
              optionValue: "Yes",
              optionDescription: null,
              displayOrder: 1,
              isDefault: false,
              underwriterReviewImpact: true,
              impacts: [],
              hideQuestions: [],
              showQuestions: ["277"],
            },
            {
              id: 509,
              optionLabel: "No",
              optionValue: "No",
              optionDescription: null,
              displayOrder: 2,
              isDefault: false,
              underwriterReviewImpact: false,
              impacts: [],
              hideQuestions: [],
              showQuestions: [],
            },
          ],
        },
        {
          id: 277,
          questionText: "Please provide explanation",
          questionDescription: null,
          displayOrder: 14,
          questionType: "TEXTBOX",
          isRequired: true,
          options: [
            {
              id: 532,
              optionLabel: "Please provide details, if applicable",
              optionValue: "",
              optionDescription: null,
              displayOrder: 1,
              isDefault: false,
              underwriterReviewImpact: false,
              impacts: [],
              hideQuestions: [],
              showQuestions: [],
            },
          ],
        },
      ],
    },
  ];
}

/**
 * The SUBMISSION-scoped tree — GET /questions/{submissionId}/questions —
 * used post-signup by `/license-scope` and `/underwriting`. Every question
 * carries its own submission-scoped `id` PLUS the master `questionId` that
 * `resolveVisibilityTargets` remaps hideQuestions/showQuestions against, and
 * every option carries `answerValue` (blank unless pre-answered).
 *
 * @param {{ practiceAnswered?: boolean }} opts practiceAnswered (default
 *   true) pre-fills "About your practice" (group 100, displayOrder 1) with
 *   "No" answers, matching a real submission whose practice group was
 *   already saved during signup (see CLAUDE.md's
 *   `earlierGroupSaveEntries`) — so specs that jump straight to
 *   /license-scope or /underwriting via dashboard Resume don't have to
 *   re-answer a page they never visit. Set `false` to get a blank tree.
 */
export function buildSubmissionQuestionGroups({ practiceAnswered = true } = {}) {
  const master = buildMasterQuestionGroups();
  return master.map((group) => ({
    id: group.id,
    groupName: group.groupName,
    displayOrder: group.displayOrder,
    questions: group.questions.map((q) => {
      const subQid = SUB_ID_OFFSET + q.id;
      const answeredNo = practiceAnswered && group.id === 100 && q.questionType === "YES_NO";
      return {
        id: subQid,
        questionId: q.id,
        questionText: q.questionText,
        questionDescription: q.questionDescription,
        displayOrder: q.displayOrder,
        questionType: q.questionType,
        isRequired: q.isRequired,
        options: q.options.map((o) => {
          const subOid = SUB_ID_OFFSET + o.id;
          const isNo = o.optionLabel === "No";
          return {
            id: subOid,
            optionLabel: o.optionLabel,
            optionValue: o.optionValue,
            optionDescription: o.optionDescription,
            displayOrder: o.displayOrder,
            isDefault: o.isDefault,
            underwriterReviewImpact: o.underwriterReviewImpact,
            impacts: o.impacts,
            hideQuestions: o.hideQuestions,
            showQuestions: o.showQuestions,
            answerValue: answeredNo && isNo ? "No" : "",
          };
        }),
      };
    }),
  }));
}

/** A resumable dashboard row — GET /dashboard/submissions. */
export function buildDashboardSubmissionRow({
  submissionId = SUBMISSION_ID,
  quotenumber = "Q-700501",
  isopenorder = true,
  ispolicyactive = false,
  policystatus = "OPEN_ORDER",
} = {}) {
  return {
    submissionid: submissionId,
    quotenumber,
    isopenorder,
    ispolicyactive,
    policystatus,
  };
}

/**
 * GET /insured/order response — the order this speciality's submission
 * rates to, once at least the practice ZIP/date have priced (see CLAUDE.md
 * "Walkable against local `ins`": ZIP 92653 -> $5,238.06 locally; this fixture
 * uses its own round numbers instead of pinning to that live figure).
 */
export function buildOrderDetails({
  submissionId = SUBMISSION_ID,
  policyStatus = "OPEN_ORDER",
  workflowstatus = "questions",
  questionRequired = false,
  firstname = "Jordan",
  lastname = "Rivera",
  email = "jordan.rivera@example.com",
  phone = "5551234567",
  total = 5238.06,
  premium = 4800,
} = {}) {
  return {
    submissionId,
    insuredId: 9001,
    policyStatus,
    workflowstatus,
    questionRequired,
    insuredfirstname: firstname,
    insuredlastname: lastname,
    contactResponse: { email, contactnumber: phone },
    locationResponse: { address1: "123 Main St", city: "Newport Beach", state: "CA", zipcode: "92653" },
    ratingResponse: {
      total,
      premium,
      tax: 38.06,
      fees: 400,
      coverageLimitTitle: "1M / 3M",
      practiceLocation: "CA",
      specialtyTitle: "Internal Medicine",
      effectiveDate: "12/01/2026",
      expirationDate: "12/01/2027",
      retroDate: "12/01/2026",
    },
  };
}
