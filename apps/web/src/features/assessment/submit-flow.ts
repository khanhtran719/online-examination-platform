import type { SubmitReceipt } from "../../shared/api/dto";

export type SubmitPhase = "idle" | "flushing" | "save-blocked" | "posting" | "accepted" | "verifying" | "deadline";

export interface SubmitState {
  phase: SubmitPhase;
  key: string | null;
  receipt: SubmitReceipt | null;
  unconfirmedCount: number;
}

export function createSubmitState(): SubmitState {
  return { phase: "idle", key: null, receipt: null, unconfirmedCount: 0 };
}

export function beginManualSubmit(state: SubmitState, unconfirmedCount: number, keyFactory: () => string): SubmitState {
  if (state.phase === "posting" || state.phase === "accepted" || state.phase === "verifying") return state;
  return {
    phase: "flushing",
    key: state.key ?? keyFactory(),
    receipt: null,
    unconfirmedCount,
  };
}

export function beginDeadlineSubmit(
  state: SubmitState,
  unconfirmedCount: number,
  keyFactory: () => string,
): SubmitState {
  if (state.phase === "accepted" || state.phase === "posting" || state.phase === "verifying") return state;
  return {
    phase: "deadline",
    key: state.key ?? keyFactory(),
    receipt: null,
    unconfirmedCount,
  };
}

export function noteSavesSettled(state: SubmitState, unconfirmedCount: number): SubmitState {
  if (state.phase !== "flushing" && state.phase !== "deadline") return state;
  if (state.phase === "flushing" && unconfirmedCount > 0) {
    return { ...state, phase: "save-blocked", unconfirmedCount };
  }
  return { ...state, phase: "posting", unconfirmedCount: state.phase === "deadline" ? unconfirmedCount : 0 };
}

export function markSubmitUnknown(state: SubmitState): SubmitState {
  if (!state.key) return state;
  return { ...state, phase: "verifying" };
}

export function markSubmitAccepted(state: SubmitState, receipt: SubmitReceipt): SubmitState {
  return { phase: "accepted", key: state.key, receipt, unconfirmedCount: state.unconfirmedCount };
}

export function cancelBlockedSubmit(state: SubmitState): SubmitState {
  if (state.phase !== "save-blocked") return state;
  return { ...state, phase: "idle" };
}

export function retryBlockedSubmit(state: SubmitState): SubmitState {
  if (state.phase !== "save-blocked") return state;
  return { ...state, phase: "flushing" };
}
