import { canPurgeCompleted, RetentionState } from "../retention";

const day = 86400000;
const now = Date.parse("2026-10-09T00:00:00.000Z");
const state: RetentionState = {
  id: "owned",
  status: "COMPLETED",
  submittedAt: now - 366 * day,
  completedAt: now - 8 * day,
  serverNow: now,
  resultPresent: true,
  inboxPresent: true,
  replayPending: false,
  outstandingDelivery: false,
  unresolvedFailure: false,
  recentReceipt: false,
  purged: false,
};
describe("Completed payload retention", () => {
  it("requires both minimum retention and completion grace, inclusive at the bounds", () => {
    expect(canPurgeCompleted(state)).toBe(true);
    expect(canPurgeCompleted({ ...state, submittedAt: now - 365 * day })).toBe(true);
    expect(canPurgeCompleted({ ...state, submittedAt: now - 365 * day + 1 })).toBe(false);
    expect(canPurgeCompleted({ ...state, completedAt: now - 7 * day })).toBe(true);
    expect(canPurgeCompleted({ ...state, completedAt: now - 7 * day + 1 })).toBe(false);
  });
  it.each(["CREATED", "IN_PROGRESS", "SUBMITTED", "PROCESSING", "EXPIRED", "FAILED"])(
    "never age-purges %s",
    (status) => expect(canPurgeCompleted({ ...state, status })).toBe(false),
  );
  it.each([
    "replayPending",
    "outstandingDelivery",
    "unresolvedFailure",
    "recentReceipt",
    "purged",
  ] as const)("protects %s", (flag) =>
    expect(canPurgeCompleted({ ...state, [flag]: true })).toBe(false),
  );
  it.each(["resultPresent", "inboxPresent"] as const)("requires durable %s", (flag) => {
    expect(canPurgeCompleted({ ...state, [flag]: false })).toBe(false);
  });
  it("fails closed on non-finite/unknown lifecycle timestamps", () => {
    for (const key of ["submittedAt", "completedAt", "serverNow"] as const)
      expect(canPurgeCompleted({ ...state, [key]: NaN })).toBe(false);
    expect(canPurgeCompleted({ ...state, submittedAt: null })).toBe(false);
    expect(canPurgeCompleted({ ...state, completedAt: null })).toBe(false);
  });
});
