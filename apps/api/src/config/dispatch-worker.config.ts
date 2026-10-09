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
  const region = env.AWS_REGION ?? "";
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(region)) throw new Error("Invalid AWS_REGION");
  let queue: URL;
  let endpoint: URL | undefined;
  try {
    queue = new URL(env.SUBMISSION_QUEUE_URL ?? "");
    if (env.SQS_ENDPOINT) endpoint = new URL(env.SQS_ENDPOINT);
  } catch {
    throw new Error("Invalid submission queue URL");
  }
  if (
    queue.username ||
    queue.password ||
    queue.search ||
    queue.hash ||
    !/^\/\d{12}\/[A-Za-z0-9_-]{1,80}$/.test(queue.pathname)
  ) {
    throw new Error("Invalid Standard queue URL");
  }
  if (endpoint) {
    if (
      env.NODE_ENV === "production" ||
      endpoint.protocol !== "http:" ||
      !["localhost", "127.0.0.1"].includes(endpoint.hostname) ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash ||
      endpoint.pathname !== "/" ||
      queue.origin !== endpoint.origin
    ) {
      throw new Error("Invalid local SQS endpoint");
    }
  } else if (
    queue.protocol !== "https:" ||
    queue.port ||
    queue.hostname !== `sqs.${region}.amazonaws.com`
  ) {
    throw new Error("Queue must use regional AWS HTTPS");
  }
  const timeoutMs = integer(env, "DISPATCH_TIMEOUT_MS", 5000, 100, 10000);
  const leaseMs = integer(env, "DISPATCH_LEASE_MS", 15000, 2000, 120000);
  const backoffInitialMs = integer(env, "DISPATCH_BACKOFF_INITIAL_MS", 1000, 200, 60000);
  const backoffMaxMs = integer(env, "DISPATCH_BACKOFF_MAX_MS", 30000, 200, 300000);
  if (leaseMs <= timeoutMs + 1000 || backoffMaxMs < backoffInitialMs) {
    throw new Error("Invalid dispatch timeout/backoff budget");
  }
  return {
    region,
    queueUrl: queue.toString(),
    timeoutMs,
    leaseMs,
    ...(endpoint ? { endpoint: endpoint.toString() } : {}),
    concurrency: integer(env, "DISPATCH_CONCURRENCY", 4, 1, 8),
    maxAttempts: integer(env, "DISPATCH_MAX_ATTEMPTS", 10, 1, 1000),
    maxAgeMs: integer(env, "DISPATCH_MAX_AGE_MS", 86400000, 60000, 604800000),
    pollIntervalMs: integer(env, "DISPATCH_POLL_INTERVAL_MS", 1000, 200, 30000),
    healthPort: integer(env, "DISPATCH_HEALTH_PORT", 3018, 0, 65535),
    backoffInitialMs,
    backoffMaxMs,
  };
}
