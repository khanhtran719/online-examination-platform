interface ReportedScore {
  status: string;
  earned: number | null;
  possible: number | null;
}
function unavailable(): never {
  throw new Error("RESULT_STATE_UNAVAILABLE");
}
function assertScore(value: ReportedScore): void {
  if (value.status === "COMPLETED") {
    if (
      !Number.isSafeInteger(value.earned) ||
      !Number.isSafeInteger(value.possible) ||
      value.earned === null ||
      value.possible === null ||
      value.earned < 0 ||
      value.possible < 1 ||
      value.possible > 500000 ||
      value.earned > value.possible
    )
      unavailable();
  } else if (
    !["SUBMITTED", "PROCESSING", "EXPIRED", "FAILED"].includes(value.status) ||
    value.earned !== null ||
    value.possible !== null
  )
    unavailable();
}
export function assertCandidateSelections(best: ReportedScore | null, latest: ReportedScore): void {
  assertScore(latest);
  if (best) {
    if (best.status !== "COMPLETED") unavailable();
    assertScore(best);
  } else if (latest.status === "COMPLETED") unavailable();
}
