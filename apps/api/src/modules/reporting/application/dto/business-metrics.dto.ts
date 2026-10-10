import { businessMetricValues } from "../../domain/business-metrics";
export type BusinessMetrics = ReturnType<typeof businessMetricValues>;
export interface BusinessMetricsInput {
  raw: string;
  actorId: string;
  correlationId: string;
  from: string | null;
  to: string | null;
}
