export interface ReviewRelease {
  policy: "NEVER" | "AFTER_COMPLETION" | "AFTER_EXAM_CLOSE";
  completed: boolean;
  closesAt: number;
  serverNow: number;
}

/** Frozen policy; the caller supplies authoritative server time and completion. */
export function canReleaseReview(state: ReviewRelease): boolean {
  return (
    state.completed &&
    Number.isFinite(state.closesAt) &&
    Number.isFinite(state.serverNow) &&
    (state.policy === "AFTER_COMPLETION" ||
      (state.policy === "AFTER_EXAM_CLOSE" && state.serverNow >= state.closesAt))
  );
}
