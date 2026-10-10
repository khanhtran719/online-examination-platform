import { IdentityAccess } from "../../../identity/application/facades/identity.facade";
import { SecurityControls } from "../../../../shared/application/ports/security";
import { UnitOfWork } from "../../../../shared/application/unit-of-work/unit-of-work.port";
import { validateMetricWindow, businessMetricValues } from "../../domain/business-metrics";
import { invalidReport, reportDenied } from "../../domain/reporting.error";
import { BusinessMetricsInput, BusinessMetrics } from "../dto/business-metrics.dto";
import { BusinessMetricsQuery } from "../ports/business-metrics.query";
export class BusinessMetricsService {
  constructor(
    private readonly access: IdentityAccess,
    private readonly query: BusinessMetricsQuery,
    private readonly security: Pick<SecurityControls, "audit">,
    private readonly uow: UnitOfWork,
  ) {}
  async snapshot(input: BusinessMetricsInput): Promise<BusinessMetrics> {
    validateMetricWindow(input.from, input.to);
    return this.uow.transaction(async () => {
      const actor = await this.access.revalidate(input.raw, "reporting.read");
      if (actor.userId !== input.actorId) throw reportDenied();
      const raw = await this.query.snapshot({ from: input.from, to: input.to });
      if (input.to !== null && Date.parse(input.to) > Date.parse(raw.asOf)) throw invalidReport();
      if (
        (input.from !== null && raw.from !== input.from) ||
        (input.to !== null && raw.to !== input.to)
      )
        throw new Error("METRICS_STATE_UNAVAILABLE");
      const report = businessMetricValues(raw);
      await this.security.audit({
        actorId: actor.userId,
        correlationId: input.correlationId,
        action: "reporting.business-metrics.read",
        resourceType: "BUSINESS_METRICS",
        resourceId: "00000000-0000-4000-8000-000000000000",
      });
      return report;
    });
  }
}
