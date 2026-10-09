import { submissionQueueConfig } from "./submission-queue.config";
export interface DispatchWorkerConfig {
  region: string;
  queueUrl: string;
  timeoutMs: number;
  endpoint?: string;
  concurrency: number;
  leaseMs: number;
  maxAttempts: number;
  maxAgeMs: number;
  backoffInitialMs: number;
  backoffMaxMs: number;
  pollIntervalMs: number;
  healthPort: number;
}

function integer(env: NodeJS.ProcessEnv, key: string, fallback: number, min: number, max: number) {
  const value = env[key] ?? String(fallback);
  if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max)
    throw new Error(`Invalid ${key}`);
  return Number(value);
}

/** No signing/email secrets, endpoint overrides or environment reads in business code. */
export function dispatchWorkerConfig(env: NodeJS.ProcessEnv): DispatchWorkerConfig {
  const queue = submissionQueueConfig(env);
  const timeoutMs = integer(env, "DISPATCH_TIMEOUT_MS", 5000, 100, 10000);
  const leaseMs = integer(env, "DISPATCH_LEASE_MS", 15000, 2000, 120000);
  const backoffInitialMs = integer(env, "DISPATCH_BACKOFF_INITIAL_MS", 1000, 200, 60000);
  const backoffMaxMs = integer(env, "DISPATCH_BACKOFF_MAX_MS", 30000, 200, 300000);
  if (leaseMs <= timeoutMs + 1000 || backoffMaxMs < backoffInitialMs) {
    throw new Error("Invalid dispatch timeout/backoff budget");
  }
  return {
    ...queue,
    timeoutMs,
    leaseMs,
    concurrency: integer(env, "DISPATCH_CONCURRENCY", 4, 1, 8),
    maxAttempts: integer(env, "DISPATCH_MAX_ATTEMPTS", 10, 1, 1000),
    maxAgeMs: integer(env, "DISPATCH_MAX_AGE_MS", 86400000, 60000, 604800000),
    pollIntervalMs: integer(env, "DISPATCH_POLL_INTERVAL_MS", 1000, 200, 30000),
    healthPort: integer(env, "DISPATCH_HEALTH_PORT", 3018, 0, 65535),
    backoffInitialMs,
    backoffMaxMs,
  };
}
