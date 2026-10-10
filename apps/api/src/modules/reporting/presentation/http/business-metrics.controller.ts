import { Controller, Get, Inject, Query, Req } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import {
  IDENTITY_ACCESS,
  IdentityAccess,
  REQUEST_GUARD,
  RequestGuard,
} from "../../../identity/application/facades/identity.facade";
import { BusinessMetricsService } from "../../application/services/business-metrics.service";
import { businessMetricsQuery } from "./dto/business-metrics.dto";
@Controller("v1/admin/business-metrics")
export class BusinessMetricsController {
  constructor(
    @Inject(IDENTITY_ACCESS) private readonly access: IdentityAccess,
    @Inject(REQUEST_GUARD) private readonly guard: RequestGuard,
    @Inject(BusinessMetricsService) private readonly service: BusinessMetricsService,
  ) {}
  @Get()
  async snapshot(@Req() request: FastifyRequest, @Query() query: unknown) {
    const raw = this.guard.access(request),
      actor = await this.access.authenticate(raw);
    this.access.requirePermission(actor, "reporting.read");
    await this.guard.admit(request, "read", actor.userId);
    return this.service.snapshot({
      raw,
      actorId: actor.userId,
      correlationId: request.id,
      ...businessMetricsQuery(query),
    });
  }
}
