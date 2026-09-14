/**
 * The wizard's step config — URL paths, names, and the ONE place a page binds
 * to an `ins` question-tree group.
 *
 * Nine steps at the same indices as Q2BNursing, so every guard threshold
 * (`step >= 4` auth gate, `1..3` pre-account funnel), `useWizardBackNav` rule
 * and `STEP_PATHS[n]` literal carries over unchanged — only step 4 differs
 * (`/license-scope` here, `/previous-insurance` in Nursing).
 *
 * Page headings use the live `group.groupName`, so a group renamed in `ins`
 * shows without a deploy; only a rename that breaks a matcher below needs this
 * file edited (caught by `questionTree.fixture.test.ts`).
 */

/** `ins` question-tree group matchers, by the step that renders the group. */
export const QUESTION_GROUP = Object.freeze({
  /** "About your practice" — master tree, pre-signup, rides into submission create. */
  practice: /about\s*your\s*practice/i,
  /** "License, Scope & Practice" — submission tree, post-signup. */
  licenseScope: /license.*scope.*practice/i,
  /** "Underwriting questions" — submission tree, post-signup. */
  underwriting: /underwriting/i,
});

export const STEPS = [
  { key: "home", path: "/", name: "Coverage & location" },
  { key: "quote", path: "/quote", name: "Soft quote (est. premium)" },
  {
    key: "practice",
    path: "/practice",
    name: "About your practice",
    tree: "master",
    group: QUESTION_GROUP.practice,
  },
  { key: "register", path: "/register", name: "Create your account" },
  {
    key: "licenseScope",
    path: "/license-scope",
    name: "License, scope & practice",
    tree: "submission",
    group: QUESTION_GROUP.licenseScope,
  },
  {
    key: "underwriting",
    path: "/underwriting",
    name: "Underwriting questions",
    tree: "submission",
    group: QUESTION_GROUP.underwriting,
  },
  { key: "sign", path: "/reviewDocusign", name: "Review & sign" },
  { key: "payment", path: "/payment", name: "Payment" },
  { key: "binder", path: "/binder-invoice", name: "Binder & invoice" },
] as const;

export const STEP_PATHS: string[] = STEPS.map((s) => s.path);
export const STEP_NAMES: string[] = STEPS.map((s) => s.name);
export const TOTAL_STEPS = STEPS.length; // 9

export const pathToStepIndex = (pathname: string): number => {
  const i = STEP_PATHS.indexOf(pathname);
  return i >= 0 ? i : 0;
};

/**
 * Names of groups in a question tree that no step renders. The pages only
 * show the groups matched above, so an unmapped group means `ins` added or
 * renamed one — logged in dev by the two tree fetchers.
 */
export function unmappedGroupNames(groups: ReadonlyArray<{ groupName?: unknown }>): string[] {
  const matchers = Object.values(QUESTION_GROUP);
  return groups
    .map((g) => String(g?.groupName ?? ""))
    .filter((name) => !matchers.some((re) => re.test(name)));
}
