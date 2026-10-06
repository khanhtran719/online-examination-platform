export interface Readiness {
  check(): Promise<void>;
}

export const READINESS = Symbol("READINESS");
