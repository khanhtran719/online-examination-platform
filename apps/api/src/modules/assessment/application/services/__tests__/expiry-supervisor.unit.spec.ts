import { SweepTickResult } from "../deadline-sweep";
import { runExpirySupervisor, sweepDelay } from "../expiry-supervisor";

const timing = {
  pollIntervalMs: 5000,
  jitterPercent: 20,
  backoffInitialMs: 200,
  backoffMaxMs: 30_000,
};

describe("sweepDelay", () => {
  it("continues a full batch immediately and jitters an idle poll around five seconds", () => {
    expect(
      sweepDelay({ ...timing, continueImmediately: true, failures: 0, random: () => 0.5 }),
    ).toBe(0);
    expect(
      sweepDelay({ ...timing, continueImmediately: false, failures: 0, random: () => 0.5 }),
    ).toBe(5000);
    expect(
      sweepDelay({ ...timing, continueImmediately: false, failures: 0, random: () => 0 }),
    ).toBe(4000);
    expect(
      sweepDelay({ ...timing, continueImmediately: false, failures: 0, random: () => 1 }),
    ).toBe(6000);
  });

  it("backs off connection failures with a cap", () => {
    expect(
      sweepDelay({ ...timing, continueImmediately: false, failures: 1, random: () => 0 }),
    ).toBe(200);
    expect(
      sweepDelay({ ...timing, continueImmediately: false, failures: 3, random: () => 0 }),
    ).toBe(800);
    expect(
      sweepDelay({ ...timing, continueImmediately: true, failures: 20, random: () => 0 }),
    ).toBe(30_000);
  });
});

describe("runExpirySupervisor", () => {
  it("marks ready only after a successful tick and does not resubmit when logging throws", async () => {
    const ready: boolean[] = [];
    const logs: string[] = [];
    let calls = 0;
    let stop = false;
    await runExpirySupervisor({
      timing,
      stopping: () => stop,
      newTickId: () => "tick",
      random: () => 0,
      delay: async () => undefined,
      onReady: (value) => ready.push(value),
      log: (event) => {
        if (event.event === "expiry.sweep" && calls === 1) throw new Error("telemetry down");
        logs.push(String(event.event));
      },
      runOnce: async () => {
        calls += 1;
        if (calls === 3) stop = true;
        if (calls === 2) throw new Error("database unavailable");
        const result: SweepTickResult = {
          processed: calls === 1 ? 1 : 0,
          skipped: 0,
          failed: 0,
          empty: true,
          due: 0,
          oldestDueAgeMs: null,
        };
        return result;
      },
    });
    expect(calls).toBe(3);
    expect(ready).toEqual([true, false, true]);
    expect(logs).toEqual(["expiry.poll.failed", "expiry.sweep"]);
  });

  it("backs off a tick that only fails rows instead of spinning", async () => {
    const delays: number[] = [];
    let calls = 0;
    let stop = false;
    await runExpirySupervisor({
      timing,
      stopping: () => stop,
      newTickId: () => "tick",
      random: () => 0,
      delay: async (ms) => {
        delays.push(ms);
      },
      onReady: () => undefined,
      log: () => undefined,
      runOnce: async () => {
        calls += 1;
        if (calls === 2) stop = true;
        return {
          processed: 0,
          skipped: 0,
          failed: 2,
          empty: false,
          due: 2,
          oldestDueAgeMs: 10,
        };
      },
    });
    expect(delays[0]).toBeGreaterThan(0);
  });
});
