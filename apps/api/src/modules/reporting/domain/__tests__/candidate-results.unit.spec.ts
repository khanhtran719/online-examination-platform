import { assertCandidateSelections } from "../candidate-results";
const complete = { status: "COMPLETED", earned: 0, possible: 100 };
const pending = { status: "FAILED", earned: null, possible: null };
describe("Admin best/latest reported-score policy", () => {
  it("preserves true zero and a successful best beside latest failure", () => {
    expect(() => assertCandidateSelections(complete, pending)).not.toThrow();
    expect(() => assertCandidateSelections(null, pending)).not.toThrow();
    expect(() => assertCandidateSelections(complete, complete)).not.toThrow();
  });
  it.each([
    [{ ...complete, earned: null }, pending],
    [{ ...complete, earned: 101 }, pending],
    [{ ...complete, possible: 0 }, pending],
    [{ ...complete, possible: 500001 }, pending],
    [{ ...complete, earned: 0.5 }, pending],
    [{ ...complete, earned: -1 }, pending],
    [pending, pending],
    [null, complete],
    [null, { ...pending, earned: 0 }],
    [null, { ...pending, status: "IN_PROGRESS" }],
  ])("fails closed for incomplete or contradictory selection %j", (best, latest) => {
    expect(() => assertCandidateSelections(best, latest!)).toThrow("RESULT_STATE_UNAVAILABLE");
  });
});
