import { capture, type AutosaveState, type InFlightBatch } from "./autosave";
import { beginDeadlineSubmit, noteSavesSettled, type SubmitState } from "./submit-flow";
import { setTransport } from "./autosave";

export const TRANSPORT_TIMEOUT_MS = 10_000;

function unconfirmedCount(save: AutosaveState): number {
  const ids = new Set(Object.keys(save.drafts));
  for (const answer of save.inFlight?.answers ?? []) ids.add(answer.questionId);
  return ids.size;
}

export function transportStillOpen(input: {
  save: AutosaveState;
  startedAtMs: number | null;
  nowMs: number;
}): boolean {
  const flight = input.save.inFlight;
  if (!flight || flight.exhausted || flight.retryAtMs !== null) return false;
  // A resend keeps the same key. It must not restart the deadline wait from a new transport clock.
  if (flight.attempt > 0) return false;
  if (!input.save.authenticated || input.save.offline) return false;
  if (input.startedAtMs === null) return false;
  return input.nowMs - input.startedAtMs < TRANSPORT_TIMEOUT_MS;
}

function waitingForScheduledRetry(save: AutosaveState, nowMs: number): boolean {
  const flight = save.inFlight;
  if (!flight || flight.exhausted || !save.canSave || !save.authenticated || save.offline)
    return false;
  return flight.retryAtMs !== null && flight.retryAtMs > nowMs;
}

export function advanceSubmitClock(input: {
  nowMs: number;
  remainingMs: number | null;
  save: AutosaveState;
  submit: SubmitState;
  transportStartedAtMs: number | null;
  keyFactory: () => string;
}): { save: AutosaveState; submit: SubmitState; transmit: InFlightBatch | null } {
  let save = input.save;
  let submit = input.submit;
  if (input.remainingMs !== null && input.remainingMs <= 0) {
    if (save.canSave || !save.editingFrozen) {
      save = setTransport(save, { canSave: false, editingFrozen: true });
    }
    if (
      submit.phase !== "deadline" &&
      submit.phase !== "posting" &&
      submit.phase !== "accepted" &&
      submit.phase !== "verifying"
    ) {
      submit = beginDeadlineSubmit(submit, unconfirmedCount(save), input.keyFactory);
    }
  }
  let transmit: InFlightBatch | null = null;
  const open = transportStillOpen({
    save,
    startedAtMs: input.transportStartedAtMs,
    nowMs: input.nowMs,
  });
  if (submit.phase === "deadline") {
    if (!open) submit = noteSavesSettled(submit, unconfirmedCount(save));
  } else if (submit.phase === "flushing") {
    if (!open) {
      const forced = capture(save, input.nowMs, input.keyFactory, { force: save.canSave });
      save = forced.state;
      if (forced.batch) transmit = forced.batch;
      else if (!waitingForScheduledRetry(save, input.nowMs)) {
        submit = noteSavesSettled(submit, unconfirmedCount(save));
      }
    }
  } else if (submit.phase === "idle" && save.canSave) {
    const flight = save.inFlight;
    const retryWouldOutlastDeadline =
      flight !== null &&
      flight.retryAtMs !== null &&
      input.remainingMs !== null &&
      input.remainingMs <= TRANSPORT_TIMEOUT_MS;
    if (!retryWouldOutlastDeadline) {
      const due = capture(save, input.nowMs, input.keyFactory);
      save = due.state;
      transmit = due.batch;
    }
  }
  return { save, submit, transmit };
}
