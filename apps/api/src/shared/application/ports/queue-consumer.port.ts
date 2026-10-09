export interface QueueDelivery {
  body: string;
  receipt: string;
  /** Absent means original generation0; null marks invalid transport metadata. */
  generation?: number | null;
}
/** Broker authority only; the grading UoW owns durable completion. */
export interface QueueConsumer {
  receive(max: number): Promise<QueueDelivery[]>;
  acknowledge(receipt: string): Promise<void>;
  extend(receipt: string): Promise<void>;
}
