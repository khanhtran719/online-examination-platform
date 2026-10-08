export interface ExpiryWorkerConfig {
  pollIntervalMs: number;
  batchSize: number;
  jitterPercent: number;
  backoffInitialMs: number;
  backoffMaxMs: number;
  healthPort: number;
}

function integer(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = env[key] ?? String(fallback);
  if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) {
    throw new Error(`Invalid ${key}`);
  }
  return Number(value);
}

/** Scheduler config only. JWT, CSRF and email keys are not read here. */
export function expiryWorkerConfig(env: NodeJS.ProcessEnv): ExpiryWorkerConfig {
  const backoffInitialMs = integer(env, "EXPIRY_BACKOFF_INITIAL_MS", 200, 50, 60_000);
  const backoffMaxMs = integer(env, "EXPIRY_BACKOFF_MAX_MS", 30_000, 50, 120_000);
  if (backoffMaxMs < backoffInitialMs) {
    throw new Error("Invalid EXPIRY_BACKOFF_MAX_MS");
  }
  return {
    pollIntervalMs: integer(env, "EXPIRY_POLL_INTERVAL_MS", 5000, 1000, 60_000),
    batchSize: integer(env, "EXPIRY_BATCH_SIZE", 50, 1, 200),
    jitterPercent: integer(env, "EXPIRY_JITTER_PERCENT", 20, 0, 50),
    backoffInitialMs,
    backoffMaxMs,
    healthPort: integer(env, "EXPIRY_HEALTH_PORT", 3017, 0, 65_535),
  };
}
