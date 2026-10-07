import { describe, expect, it } from "vitest";
import {
  capture,
  createAutosaveState,
  editAnswer,
  failOffline,
  failRetryable,
  holdForReauth,
  ingestAnswerPage,
  setTransport,
} from "../autosave";
import { advanceSubmitClock, TRANSPORT_TIMEOUT_MS } from "../room-tick";
import { beginManualSubmit, createSubmitState, type SubmitState } from "../submit-flow";

const Q1 = "00000000-0000-4000-8000-000000000010";
const A = "00000000-0000-4000-8000-0000000000a1";

function saving() {
  const loaded = ingestAnswerPage(
    createAutosaveState(),
    [Q1],
    [{ questionId: Q1, selectedOptionIds: [], marked: false, version: 0, updatedAt: null }],
  );
  const edited = editAnswer(
    loaded,
    { questionId: Q1, selectedOptionIds: [A], marked: false },
    0,
    0,
  );
  return capture(edited, 500, () => "save-key", { force: true }).state;
}

function tick(
  save: ReturnType<typeof saving>,
  submit: SubmitState,
  nowMs: number,
  startedAtMs: number | null,
  remainingMs: number,
) {
  return advanceSubmitClock({
    nowMs,
    remainingMs,
    save,
    submit,
    transportStartedAtMs: startedAtMs,
    keyFactory: () => "submit-key",
  });
}

describe("deadline submit clock", () => {
  it("submits persisted answers when a save is still hung at the deadline", () => {
    const started = 1_000;
    const result = tick(saving(), createSubmitState(), started + 61_000, started, 0);
    expect(result.transmit).toBeNull();
    expect(result.submit.phase).toBe("posting");
    expect(result.submit.key).toBe("submit-key");
    expect(result.submit.unconfirmedCount).toBe(1);
    expect(result.save.canSave).toBe(false);
    expect(result.save.inFlight?.key).toBe("save-key");
  });

  it("does not wait for reauth, offline, or a blocked save after the deadline", () => {
    const base = saving();
    const reauth = tick(holdForReauth(base), createSubmitState(), 5_000, 1_000, 0);
    const offline = tick(failOffline(base), createSubmitState(), 5_000, 1_000, 0);
    const blocked = tick(
      base,
      { phase: "save-blocked", key: "same-submit", receipt: null, unconfirmedCount: 1 },
      5_000,
      null,
      0,
    );
    expect(reauth.submit.phase).toBe("posting");
    expect(offline.submit.phase).toBe("posting");
    expect(blocked.submit.phase).toBe("posting");
    expect(blocked.submit.key).toBe("same-submit");
  });

  it("waits only inside the transport budget and does not treat that wait as a new save", () => {
    const started = 2_000;
    const waiting = tick(
      saving(),
      createSubmitState(),
      started + TRANSPORT_TIMEOUT_MS - 1,
      started,
      0,
    );
    expect(waiting.submit.phase).toBe("deadline");
    expect(waiting.transmit).toBeNull();
    const expired = tick(saving(), waiting.submit, started + TRANSPORT_TIMEOUT_MS, started, 0);
    expect(expired.submit.phase).toBe("posting");
    expect(expired.submit.key).toBe(waiting.submit.key);
  });

  it("stops a manual submit instead of waiting forever for a hung save", () => {
    const started = 100;
    const hung = tick(
      saving(),
      beginManualSubmit(createSubmitState(), 1, () => "manual-key"),
      started + TRANSPORT_TIMEOUT_MS,
      started,
      60_000,
    );
    expect(hung.submit.phase).toBe("save-blocked");
    expect(hung.submit.key).toBe("manual-key");
    expect(hung.transmit).toBeNull();
  });

  it("does not resend a save retry inside the last transport budget before the deadline", () => {
    const now = 55_000;
    const scheduled = failRetryable(saving(), {
      nowMs: now - 1_000,
      retryAfterSeconds: null,
      random: 0,
      allowRetry: true,
    });
    const dueAt = scheduled.inFlight?.retryAtMs ?? 0;
    expect(dueAt).toBeLessThanOrEqual(now);
    const held = tick(scheduled, createSubmitState(), now, null, TRANSPORT_TIMEOUT_MS);
    expect(held.transmit).toBeNull();
    expect(held.submit.phase).toBe("idle");
    expect(held.save.inFlight?.key).toBe("save-key");
    expect(held.save.inFlight?.retryAtMs).toBe(dueAt);
    const expired = tick(held.save, held.submit, now + TRANSPORT_TIMEOUT_MS, null, 0);
    expect(expired.transmit).toBeNull();
    expect(expired.submit.phase).toBe("posting");
    expect(expired.save.inFlight?.key).toBe("save-key");
  });

  it("does not let a retried save reset the deadline transport clock", () => {
    const started = 50_000;
    const scheduled = failRetryable(saving(), {
      nowMs: started - 1_000,
      retryAfterSeconds: null,
      random: 0,
      allowRetry: true,
    });
    const resent = capture(scheduled, started, () => "new-key").state;
    const atDeadline = tick(resent, createSubmitState(), started + 1_000, started, 0);
    expect(resent.inFlight?.attempt).toBeGreaterThan(0);
    expect(resent.inFlight?.key).toBe("save-key");
    expect(atDeadline.transmit).toBeNull();
    expect(atDeadline.submit.phase).toBe("posting");
    expect(atDeadline.submit.key).toBe("submit-key");
    expect(atDeadline.submit.unconfirmedCount).toBe(1);
    expect(atDeadline.save.inFlight?.key).toBe("save-key");
  });

  it("posts at the deadline after repeated save timeouts without leaving a retry in flight", () => {
    for (const random of [0, 1]) {
      let save = saving();
      let submit = createSubmitState();
      let transportStarted: number | null = 500;
      let openUntil = 500 + TRANSPORT_TIMEOUT_MS;
      let sentWhileClose = 0;
      for (let now = 750; now <= 61_750; now += 250) {
        if (
          save.inFlight &&
          save.inFlight.retryAtMs === null &&
          transportStarted !== null &&
          now >= openUntil
        ) {
          save = failRetryable(save, {
            nowMs: now,
            retryAfterSeconds: null,
            random,
            allowRetry: true,
          });
          transportStarted = null;
        }
        const step = tick(save, submit, now, transportStarted, Math.max(0, 60_000 - now));
        save = step.save;
        submit = step.submit;
        if (step.transmit) {
          if (60_000 - now <= TRANSPORT_TIMEOUT_MS) sentWhileClose += 1;
          transportStarted = now;
          openUntil = now + TRANSPORT_TIMEOUT_MS;
        }
      }
      expect(sentWhileClose).toBe(0);
      expect(submit.phase).toBe("posting");
      expect(save.inFlight?.retryAtMs).not.toBeNull();
    }
  });

  it("does not capture a new batch after the deadline freezes editing", () => {
    const loaded = ingestAnswerPage(
      createAutosaveState(),
      [Q1],
      [{ questionId: Q1, selectedOptionIds: [], marked: false, version: 1, updatedAt: null }],
    );
    const dirty = editAnswer(
      loaded,
      { questionId: Q1, selectedOptionIds: [A], marked: false },
      0,
      0,
    );
    const result = tick(
      setTransport(dirty, { canSave: true }),
      createSubmitState(),
      1_000,
      null,
      0,
    );
    expect(result.transmit).toBeNull();
    expect(result.save.drafts[Q1]).toBeDefined();
    expect(result.submit.phase).toBe("posting");
  });
});
