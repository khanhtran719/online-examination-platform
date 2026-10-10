import { BusinessMetricCounters } from "../../domain/business-metrics";
/** Primary read-only Assessment attempts source: started_at,submitted_at,status,
 * expired,deadline,replay_pending. Compact purged COMPLETED identities still count.
 * No result/key/answer/PII/queue joins; re-review source migrations and lifecycle changes.
 * Counts use start-time cohort; pending backlog is global, not SQS depth or worker activity.
 */
export interface BusinessMetricsQuery {
  snapshot(input: {
    from: string | null;
    to: string | null;
  }): Promise<{
    asOf: string;
    from: string;
    to: string;
    counts: BusinessMetricCounters;
    oldestSubmittedAt: string | null;
  }>;
}
