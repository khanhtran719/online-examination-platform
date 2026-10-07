import { createContext, useContext, type ReactNode } from "react";
import type { SessionTransport } from "../features/auth/session-coordinator";
import type { RecoverResult } from "../features/auth/session-coordinator";
import type { Permission } from "../shared/api/dto";
import type { PlatformApi } from "../shared/api/platform";

export type DataMode = "demo" | "live";

export interface MailPreview {
  email: string;
  token: string;
  createdAt: string;
}

export interface DemoControls {
  permissions: readonly Permission[];
  fault: string;
  mailbox: readonly MailPreview[];
  setPreset: (preset: "candidate" | "admin" | "reviewer") => void;
  setFault: (
    fault: "none" | "delay-ack" | "lose-ack" | "conflict-save" | "save-429" | "save-503" | "refresh-lost",
  ) => void;
  reset: () => void;
  notify: () => void;
  replayRevision: (attemptId: string) => number | null;
  loadStress: (count: number) => string;
}

export interface RuntimeValue {
  api: PlatformApi;
  mode: DataMode;
  verifyToken: string;
  transport: SessionTransport;
  bindRecovery?: (recover: () => Promise<RecoverResult>) => void;
  demo: DemoControls | null;
}

const RuntimeContext = createContext<RuntimeValue | null>(null);

export function RuntimeProvider({ value, children }: { value: RuntimeValue; children: ReactNode }) {
  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useRuntime(): RuntimeValue {
  const value = useContext(RuntimeContext);
  if (!value) throw new Error("Runtime missing");
  return value;
}
