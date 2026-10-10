import { validateMetricWindow, businessMetricValues } from "../business-metrics";
const asOf = "2026-10-10T00:00:00.000Z",
  from = "2026-10-09T00:00:00.000Z";
const base = {
  startedAttempts: "10",
  activeAttempts: "2",
  submittedAttempts: "7",
  completedAttempts: "3",
  failedAttempts: "2",
  expiredSubmissions: "2",
  expiredCompletedAttempts: "1",
  pendingAttempts: "4",
  replayPendingAttempts: "1",
};
const state = { asOf, from, to: asOf, counts: base, oldestSubmittedAt: "2026-10-08T23:59:59.100Z" };
describe("Business cohort and global backlog policy", () => {
  it("accepts paired or default windows and the inclusive seven-day maximum", () => {
    expect(() => validateMetricWindow(null, null)).not.toThrow();
    expect(() => validateMetricWindow("2026-10-03T00:00:00.000Z", asOf)).not.toThrow();
  });
  it.each([
    [from, null],
    [null, asOf],
    [asOf, from],
    [from, from],
    ["2026-10-02T00:00:00.000Z", asOf],
    ["2026-10-09T00:00:00Z", asOf],
    ["2026-02-30T00:00:00.000Z", asOf],
    ["2026-10-09T00:00:00.000+00:00", asOf],
    ["", asOf],
  ])("rejects invalid or unpaired bounded window %s/%s", (a, b) =>
    expect(() => validateMetricWindow(a, b)).toThrow("Invalid request"),
  );
  it("rejects year zero that cannot be represented by PostgreSQL timestamps", () => {
    expect(() =>
      validateMetricWindow("0000-01-01T00:00:00.000Z", "0000-01-02T00:00:00.000Z"),
    ).toThrow("Invalid request");
  });
  it("returns exact counts and oldest original submission age independently of cohort", () => {
    const value = businessMetricValues(state);
    expect(value.counts).toEqual({
      startedAttempts: 10,
      activeAttempts: 2,
      submittedAttempts: 7,
      completedAttempts: 3,
      failedAttempts: 2,
      expiredSubmissions: 2,
      expiredCompletedAttempts: 1,
    });
    expect(value.backlog).toEqual({
      pendingAttempts: 4,
      replayPendingAttempts: 1,
      oldestSubmittedAt: state.oldestSubmittedAt,
      oldestAgeSeconds: 86400,
    });
  });
  it("returns explicit empty backlog nulls instead of invented zero age", () => {
    expect(
      businessMetricValues({
        ...state,
        counts: { ...base, pendingAttempts: "0", replayPendingAttempts: "0" },
        oldestSubmittedAt: null,
      }).backlog,
    ).toEqual({
      pendingAttempts: 0,
      replayPendingAttempts: 0,
      oldestSubmittedAt: null,
      oldestAgeSeconds: null,
    });
  });
  it.each(["-1", "1.5", "01", "2147483648", "9007199254740993", "NaN"])(
    "fails closed on invalid count %s",
    (value) =>
      expect(() =>
        businessMetricValues({ ...state, counts: { ...base, startedAttempts: value } }),
      ).toThrow("METRICS_STATE_UNAVAILABLE"),
  );
  it.each([
    { completedAttempts: "8" },
    { expiredSubmissions: "8" },
    { expiredCompletedAttempts: "3" },
    { activeAttempts: "4" },
    { replayPendingAttempts: "5" },
  ])("rejects inconsistent count subsets %j", (patch) =>
    expect(() => businessMetricValues({ ...state, counts: { ...base, ...patch } })).toThrow(
      "METRICS_STATE_UNAVAILABLE",
    ),
  );
  it.each([null, "2026-10-10T00:00:01.000Z", "bad"])(
    "requires a valid past oldest submission for nonempty backlog %s",
    (oldestSubmittedAt) =>
      expect(() => businessMetricValues({ ...state, oldestSubmittedAt })).toThrow(
        "METRICS_STATE_UNAVAILABLE",
      ),
  );
  it("rejects a timestamp attached to an empty backlog", () =>
    expect(() =>
      businessMetricValues({
        ...state,
        counts: { ...base, pendingAttempts: "0", replayPendingAttempts: "0" },
      }),
    ).toThrow("METRICS_STATE_UNAVAILABLE"));
  it("rejects invalid source time or future bounds", () => {
    expect(() => businessMetricValues({ ...state, asOf: "bad" })).toThrow(
      "METRICS_STATE_UNAVAILABLE",
    );
    expect(() => businessMetricValues({ ...state, to: "2026-10-11T00:00:00.000Z" })).toThrow(
      "METRICS_STATE_UNAVAILABLE",
    );
  });
});
