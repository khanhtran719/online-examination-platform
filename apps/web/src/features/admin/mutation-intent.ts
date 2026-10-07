export interface FrozenIntent<T> {
  action: string;
  key: string;
  body: T;
  expectedRevision: number;
}

export interface IntentMachine<T> {
  phase: "idle" | "inflight" | "unknown";
  frozen: FrozenIntent<T> | null;
}

export function idleIntent<T>(): IntentMachine<T> {
  return { phase: "idle", frozen: null };
}

function sameBody(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function startIntent<T>(
  machine: IntentMachine<T>,
  input: { action: string; body: T; expectedRevision: number; keyFactory: () => string },
): { machine: IntentMachine<T>; send: FrozenIntent<T> | null; blocked: "duplicate" | "changed" | null } {
  if (machine.phase === "inflight") return { machine, send: null, blocked: "duplicate" };
  if (machine.phase === "unknown" && machine.frozen) {
    const same =
      machine.frozen.action === input.action &&
      machine.frozen.expectedRevision === input.expectedRevision &&
      sameBody(machine.frozen.body, input.body);
    if (!same) return { machine, send: null, blocked: "changed" };
    return { machine: { ...machine, phase: "inflight" }, send: machine.frozen, blocked: null };
  }
  const frozen: FrozenIntent<T> = {
    action: input.action,
    key: input.keyFactory(),
    body: input.body,
    expectedRevision: input.expectedRevision,
  };
  return { machine: { phase: "inflight", frozen }, send: frozen, blocked: null };
}

export function settleIntent<T>(
  machine: IntentMachine<T>,
  outcome: "acked" | "unknown" | "rejected",
): IntentMachine<T> {
  if (outcome === "unknown") return { phase: "unknown", frozen: machine.frozen };
  return idleIntent();
}
