import { describe, expect, it } from "vitest";
import { ApiError } from "../../../shared/api/errors";
import {
  createSessionCoordinator,
  type CoordinationLock,
  type SessionSignal,
} from "../session-coordinator";
import type { Session } from "../../../shared/api/dto";

const session: Session = {
  userId: "00000000-0000-4000-8000-0000000000a1",
  accessExpiresAt: "2026-10-06T13:15:00.000Z",
  refreshExpiresAt: "2026-10-06T14:00:00.000Z",
  absoluteExpiresAt: "2026-10-07T13:00:00.000Z",
};

function sharedLock(): CoordinationLock & { depth: number } {
  let tail = Promise.resolve();
  let depth = 0;
  return {
    supported: true,
    exclusive(task) {
      const run = tail.then(async () => {
        depth += 1;
        return task();
      });
      tail = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
    get depth() {
      return depth;
    },
  };
}

describe("session coordinator", () => {
  it("refreshes once for two tabs and does not broadcast a token", async () => {
    let refreshed = false;
    let refreshCalls = 0;
    const messages: SessionSignal[] = [];
    const lock = sharedLock();
    const transport = {
      async probe() {
        return refreshed ? ("authenticated" as const) : ("anonymous" as const);
      },
      async refresh() {
        refreshCalls += 1;
        refreshed = true;
        return session;
      },
    };
    const first = createSessionCoordinator({
      transport,
      lock,
      broadcast: { post: (message) => messages.push(message) },
    });
    const second = createSessionCoordinator({
      transport,
      lock,
      broadcast: { post: (message) => messages.push(message) },
    });
    const [left, right] = await Promise.all([first.recover(), second.recover()]);
    expect(refreshCalls).toBe(1);
    expect([left.type, right.type].sort()).toEqual(["already-current", "refreshed"]);
    expect(JSON.stringify(messages)).not.toMatch(/token|cookie|eyJ/i);
    expect(messages).toEqual([{ type: "session-epoch", epoch: 1 }]);
  });

  it("does not replay a refresh after an unknown outcome", async () => {
    let calls = 0;
    const coordinator = createSessionCoordinator({
      transport: {
        probe: async () => "anonymous",
        refresh: async () => {
          calls += 1;
          throw new ApiError({
            kind: "network",
            status: 0,
            errorCode: "Network",
            message: "timeout",
          });
        },
      },
      lock: sharedLock(),
      broadcast: { post() {} },
    });
    expect(await coordinator.recover()).toEqual({ type: "reauth", reason: "unknown-outcome" });
    expect(await coordinator.recover()).toEqual({ type: "reauth", reason: "unknown-outcome" });
    expect(calls).toBe(1);
  });

  it("does not rotate when coordination is unavailable", async () => {
    let calls = 0;
    const coordinator = createSessionCoordinator({
      transport: {
        probe: async () => "anonymous",
        refresh: async () => {
          calls += 1;
          return session;
        },
      },
      lock: {
        supported: false,
        exclusive: () => Promise.reject(new Error("unused")),
      },
      broadcast: { post() {} },
    });
    expect(await coordinator.recover()).toEqual({
      type: "reauth",
      reason: "unsupported-coordination",
    });
    expect(calls).toBe(0);
  });

  it("allows refresh after explicit confirmed login following an unknown outcome", async () => {
    let calls = 0;
    const coordinator = createSessionCoordinator({
      transport: {
        probe: async () => "anonymous",
        refresh: async () => {
          calls += 1;
          if (calls === 1)
            throw new ApiError({
              kind: "network",
              status: 0,
              errorCode: "Network",
              message: "lost ACK",
            });
          return session;
        },
      },
      lock: sharedLock(),
      broadcast: { post() {} },
    });
    expect((await coordinator.recover()).type).toBe("reauth");
    expect((await coordinator.recover()).type).toBe("reauth");
    expect(calls).toBe(1);
    coordinator.confirmLogin();
    expect((await coordinator.recover()).type).toBe("refreshed");
    expect(calls).toBe(2);
  });

  it("does not let a late failed recovery block a subsequently confirmed login", async () => {
    let rejectOld: ((reason: unknown) => void) | undefined;
    let calls = 0;
    const coordinator = createSessionCoordinator({
      transport: {
        probe: async () => "anonymous",
        refresh: async () => {
          calls += 1;
          if (calls === 1)
            return new Promise<Session>((_resolve, reject) => {
              rejectOld = reject;
            });
          return session;
        },
      },
      lock: sharedLock(),
      broadcast: { post() {} },
    });
    const old = coordinator.recover();
    await Promise.resolve();
    await Promise.resolve();
    coordinator.confirmLogin();
    rejectOld?.(
      new ApiError({ kind: "network", status: 0, errorCode: "Network", message: "late ACK loss" }),
    );
    expect((await old).type).toBe("already-current");
    expect((await coordinator.recover()).type).toBe("refreshed");
    expect(calls).toBe(2);
  });
});
