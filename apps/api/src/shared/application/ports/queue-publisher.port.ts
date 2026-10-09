/** Stable event identity lives in the body; the transport never substitutes it. */
export interface QueuePublisher {
  publish(body: string, generation?: number): Promise<void>;
}

/** Safe classification only: SDK errors/payloads must never cross this port. */
export class QueuePublishError extends Error {
  constructor(readonly permanent: boolean) {
    super(permanent ? "QUEUE_REJECTED" : "QUEUE_UNAVAILABLE");
  }
}
