import type { SqsConsumerSettings } from "../infrastructure/messaging/sqs/sqs-consumer";
import { submissionQueueConfig } from "./submission-queue.config";
export interface GradingWorkerConfig extends SqsConsumerSettings {
  concurrency: number;
  heartbeatMs: number;
  healthPort: number;
  queueMode: "source" | "dead-letter";
}
function integer(env: NodeJS.ProcessEnv, key: string, fallback: number, min: number, max: number) {
  const value = env[key] ?? String(fallback);
  if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max)
    throw new Error(`Invalid ${key}`);
  return Number(value);
}
export function gradingWorkerConfig(env: NodeJS.ProcessEnv): GradingWorkerConfig {
  const queue = submissionQueueConfig(env);
  const account = new URL(queue.queueUrl).pathname.split("/")[1];
  const queueName = new URL(queue.queueUrl).pathname.split("/")[2];
  const deadLetterArn = env.GRADING_DLQ_ARN ?? "";
  if (
    !new RegExp(`^arn:aws:sqs:${queue.region}:${account}:[A-Za-z0-9_-]{1,80}$`).test(
      deadLetterArn,
    ) ||
    deadLetterArn.endsWith(`:${queueName}`)
  )
    throw new Error("Invalid grading DLQ ARN");
  const queueMode = env.GRADING_QUEUE_MODE ?? "source";
  if (queueMode !== "source" && queueMode !== "dead-letter")
    throw new Error("Invalid grading mode");
  const sourceQueueUrl = queue.queueUrl;
  const dlqUrl = new URL(sourceQueueUrl);
  dlqUrl.pathname = `/${account}/${deadLetterArn.split(":").at(-1)}`;
  const waitSeconds = integer(env, "GRADING_WAIT_SECONDS", 10, 0, 20);
  const timeoutMs = integer(env, "GRADING_TIMEOUT_MS", 15000, 100, 30000);
  const visibilitySeconds = integer(env, "GRADING_VISIBILITY_SECONDS", 60, 30, 300);
  const heartbeatMs = integer(env, "GRADING_HEARTBEAT_MS", 10000, 1000, 60000);
  if (
    timeoutMs <= waitSeconds * 1000 + 1000 ||
    heartbeatMs + timeoutMs + 5000 >= visibilitySeconds * 1000
  )
    throw new Error("Invalid grading transport/visibility budget");
  return {
    ...queue,
    queueMode,
    ...(queueMode === "dead-letter" ? { sourceQueueUrl, queueUrl: dlqUrl.toString() } : {}),
    deadLetterArn,
    waitSeconds,
    timeoutMs,
    visibilitySeconds,
    heartbeatMs,
    concurrency: integer(env, "GRADING_CONCURRENCY", 2, 1, 8),
    maxReceiveCount: integer(env, "GRADING_MAX_RECEIVE_COUNT", 5, 2, 20),
    healthPort: integer(env, "GRADING_HEALTH_PORT", 3019, 0, 65535),
  };
}
