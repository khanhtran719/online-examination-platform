import { QueueConsumer, QueueDelivery } from "../../shared/application/ports/queue-consumer.port";

export async function processGradingDelivery(input: {
  queue: QueueConsumer;
  delivery: QueueDelivery;
  consume: (
    body: string,
    generation?: number | null,
  ) => Promise<{ outcome: string; correlationId?: string }>;
  heartbeatMs: number;
  observe?: (event: Record<string, unknown>) => void;
}): Promise<void> {
  let heartbeat: Promise<void> | undefined;
  let failed = false;
  const timer = setInterval(() => {
    if (heartbeat || failed) return;
    heartbeat = input.queue
      .extend(input.delivery.receipt)
      .catch(() => {
        failed = true;
      })
      .finally(() => {
        heartbeat = undefined;
      });
  }, input.heartbeatMs);
  const started = performance.now();
  let result: { outcome: string; correlationId?: string };
  try {
    result = await input.consume(input.delivery.body, input.delivery.generation);
  } finally {
    clearInterval(timer);
    await heartbeat;
  }
  // A lost heartbeat does not undo a committed result. Redelivery will verify it.
  if (failed) throw new Error("QUEUE_VISIBILITY_UNAVAILABLE");
  await input.queue.acknowledge(input.delivery.receipt);
  try {
    input.observe?.({
      event: "grading.settled",
      ...result,
      durationMs: performance.now() - started,
    });
  } catch {
    /* A log sink cannot change durable settlement. */
  }
}
