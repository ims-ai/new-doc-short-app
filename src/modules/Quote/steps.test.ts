import { describe, expect, it } from "vitest";
import { STEP_NAMES, STEP_PATHS, STEPS, TOTAL_STEPS, pathToStepIndex } from "@/modules/Quote/steps";

describe("wizard steps", () => {
  it("has 9 steps with unique paths and one name each", () => {
    expect(TOTAL_STEPS).toBe(9);
    expect(STEPS).toHaveLength(9);
    expect(new Set(STEP_PATHS).size).toBe(9);
    expect(STEP_NAMES).toHaveLength(9);
  });

  // The guards (`step >= 4` auth gate, `1..3` pre-account funnel, `>= 5`
  // post-quote), `useWizardBackNav` (step 4 → dashboard, step 7 → review) and
  // every `STEP_PATHS[n]` literal were written against Q2BNursing's indices —
  // only step 4's path differs.
  it("keeps Q2BNursing's index for every step", () => {
    expect(STEP_PATHS).toEqual([
      "/",
      "/quote",
      "/practice",
      "/register",
      "/license-scope",
      "/underwriting",
      "/reviewDocusign",
      "/payment",
      "/binder-invoice",
    ]);
  });

  it("maps paths to indices, unknown paths to 0", () => {
    expect(pathToStepIndex("/register")).toBe(3);
    expect(pathToStepIndex("/license-scope")).toBe(4);
    expect(pathToStepIndex("/underwriting")).toBe(5);
    expect(pathToStepIndex("/reviewDocusign")).toBe(6);
    expect(pathToStepIndex("/payment")).toBe(7);
    expect(pathToStepIndex("/nope")).toBe(0);
  });

  it("binds exactly the three question steps to a tree + group", () => {
    const bound = STEPS.filter((s) => "group" in s).map((s) => [s.key, "tree" in s && s.tree]);
    expect(bound).toEqual([
      ["practice", "master"],
      ["licenseScope", "submission"],
      ["underwriting", "submission"],
    ]);
  });
});
