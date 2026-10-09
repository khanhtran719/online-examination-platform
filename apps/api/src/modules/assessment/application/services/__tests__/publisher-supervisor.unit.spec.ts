import { runPublisherSupervisor } from "../publisher-supervisor";
import { PublishResult } from "../submission-publisher";

const timing = {
  concurrency: 2,
  pollIntervalMs: 1000,
  backoffInitialMs: 1000,
  backoffMaxMs: 30000,
};
const result: PublishResult = { claimed: 2, delivered: 2, retried: 0, parked: 0, fenced: 0 };

describe("publisher supervision", () => {
  it("backs off DB failures, drains a full batch and waits on idle without observer-driven retry", async () => {
    let calls = 0;
    let stop = false;
    const ready: boolean[] = [];
    const delays: number[] = [];
    await runPublisherSupervisor({
      timing,
      stopping: () => stop,
      random: () => 0,
      delay: async (ms) => {
        delays.push(ms);
      },
      onReady: (value) => {
        ready.push(value);
      },
      observe: () => {
        throw new Error("metrics");
      },
      runOnce: async () => {
        calls += 1;
        if (calls === 1) throw new Error("DB down");
        if (calls === 3) {
          stop = true;
          return { ...result, claimed: 0, delivered: 0 };
        }
        return result;
      },
    });
    expect(calls).toBe(3);
    expect(ready).toEqual([false, true, true]);
    expect(delays).toEqual([500, 0, 800]);
  });
  it("does not spin on all failing sends and stops admitting on shutdown", async () => {
    const delays: number[] = [];
    let stop = false;
    let calls = 0;
    await runPublisherSupervisor({
      timing,
      stopping: () => stop,
      random: () => 0.5,
      onReady: () => undefined,
      observe: () => undefined,
      delay: async (ms) => {
        delays.push(ms);
        stop = true;
      },
      runOnce: async () => {
        calls += 1;
        return { ...result, delivered: 0, retried: 2 };
      },
    });
    expect(calls).toBe(1);
    expect(delays).toEqual([750]);
  });
});
