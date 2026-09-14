import { describe, expect, it } from "vitest";
import { buildSubmissionRequest } from "./submission";

// A minimal `/auth/quotedata` response shape — only the fields
// buildSubmissionRequest reads.
const ILF = {
  defaultIlfDlf: 10,
  defaultyear: 1,
  defaultSurgery: 5,
  defaultClaims: 0,
  defaultHoursWorkedName: "40",
  hoursWorkedList: [{ id: 3, hoursWorked: "40", factor: 1, default: true }],
  defaultParttimeFulltimeFactor: 3,
};

const base = {
  zip: "92653",
  effectiveDate: "01/01/2027",
  ilfDlfResponse: ILF,
  visitedQuestionGroups: [],
  questionGroupsWithIds: [],
  questionAnswers: {},
  impactAnswers: {},
  hiddenQuestionIds: new Set(),
};

describe("buildSubmissionRequest — coverage limit + retro date", () => {
  it("uses the quotedata default limit and omits retroDate when nothing was picked", () => {
    const req = buildSubmissionRequest({ ...base });
    expect(req.coverageilfdlfid).toBe(10);
    expect(req).not.toHaveProperty("retroDate");
    expect(req.zipcode).toBe("92653");
    expect(req.effectiveDate).toBe("01/01/2027");
  });

  it("uses the selected coverage limit id when the applicant picked one", () => {
    const req = buildSubmissionRequest({ ...base, coverageLimitId: 42 });
    expect(req.coverageilfdlfid).toBe(42);
  });

  it("falls back to the default limit for a zero / blank selection", () => {
    expect(buildSubmissionRequest({ ...base, coverageLimitId: 0 }).coverageilfdlfid).toBe(10);
    expect(buildSubmissionRequest({ ...base, coverageLimitId: "" }).coverageilfdlfid).toBe(10);
  });

  it("passes a custom retro date through, normalised to MM/dd/yyyy", () => {
    const req = buildSubmissionRequest({ ...base, retroDate: "12/15/2026" });
    expect(req.retroDate).toBe("12/15/2026");
  });

  it("omits retroDate for an incomplete date string", () => {
    const req = buildSubmissionRequest({ ...base, retroDate: "12/15" });
    expect(req).not.toHaveProperty("retroDate");
  });
});
