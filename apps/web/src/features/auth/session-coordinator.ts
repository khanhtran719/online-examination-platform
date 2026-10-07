import type { Session } from "../../shared/api/dto";
import { ApiError, isApiError } from "../../shared/api/errors";

export type ProbeResult = "authenticated" | "anonymous" | "unknown";

export interface SessionTransport {
  refresh(): Promise<Session>;
  probe(): Promise<ProbeResult>;
}

export interface CoordinationLock {
  supported: boolean;
  exclusive<T>(task: () => Promise<T>): Promise<T>;
}

export type SessionSignal =
  { type: "session-epoch"; epoch: number } | { type: "reauth" } | { type: "logout" };

export interface SessionBroadcaster {
  post(message: SessionSignal): void;
}

export type RecoverResult =
  | { type: "refreshed"; session: Session }
  | { type: "already-current" }
  | { type: "reauth"; reason: "unauthorized" | "unknown-outcome" | "unsupported-coordination" };

export interface SessionCoordinator {
  recover(): Promise<RecoverResult>;
  confirmLogin(): void;
  noteExternalEpoch(epoch: number): void;
  currentEpoch(): number;
}

export function createSessionCoordinator(deps: {
  transport: SessionTransport;
  lock: CoordinationLock;
  broadcast: SessionBroadcaster;
}): SessionCoordinator {
  let inFlight: Promise<RecoverResult> | null = null;
  let epoch = 0;
  let blocked = false;
  let generation = 0;

  return {
    currentEpoch: () => epoch,
    noteExternalEpoch(next) {
      if (next > epoch) epoch = next;
    },
    confirmLogin() {
      generation += 1;
      blocked = false;
      inFlight = null;
    },
    recover() {
      if (!deps.lock.supported) {
        return Promise.resolve({ type: "reauth", reason: "unsupported-coordination" });
      }
      if (blocked) return Promise.resolve({ type: "reauth", reason: "unknown-outcome" });
      if (!inFlight) {
        const startedGeneration = generation;
        inFlight = run(startedGeneration).finally(() => {
          if (generation === startedGeneration) inFlight = null;
        });
      }
      return inFlight;
    },
  };

  async function run(startedGeneration: number): Promise<RecoverResult> {
    return deps.lock.exclusive(async () => {
      if (generation !== startedGeneration) return { type: "already-current" };
      const probe = await deps.transport.probe();
      if (generation !== startedGeneration) return { type: "already-current" };
      if (probe === "authenticated") return { type: "already-current" };
      if (probe === "unknown") {
        blocked = true;
        deps.broadcast.post({ type: "reauth" });
        return { type: "reauth", reason: "unknown-outcome" };
      }
      try {
        const session = await deps.transport.refresh();
        if (generation !== startedGeneration) return { type: "already-current" };
        epoch += 1;
        deps.broadcast.post({ type: "session-epoch", epoch });
        return { type: "refreshed", session };
      } catch (error) {
        if (generation !== startedGeneration) return { type: "already-current" };
        if (isApiError(error) && (error.status === 401 || error.status === 403)) {
          deps.broadcast.post({ type: "reauth" });
          return { type: "reauth", reason: "unauthorized" };
        }
        blocked = true;
        deps.broadcast.post({ type: "reauth" });
        return { type: "reauth", reason: "unknown-outcome" };
      }
    });
  }
}

export function browserCoordination(): { lock: CoordinationLock; broadcast: SessionBroadcaster } {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  const channel =
    typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("exam-platform-session");
  return {
    lock: locks
      ? {
          supported: true,
          exclusive<T>(task: () => Promise<T>): Promise<T> {
            return locks.request("exam-platform-session", () => task()).then((value) => value);
          },
        }
      : {
          supported: false,
          exclusive() {
            return Promise.reject(
              new ApiError({
                kind: "unavailable",
                status: 0,
                errorCode: "Unsupported",
                message: "Trình duyệt không hỗ trợ điều phối phiên",
              }),
            );
          },
        },
    broadcast: {
      post(message) {
        channel?.postMessage(message);
      },
    },
  };
}
