import { Controller, Get, Inject, Query, Req } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import {
  IDENTITY_ACCESS,
  IdentityAccess,
  REQUEST_GUARD,
  RequestGuard,
} from "../../../identity/application/facades/identity.facade";
import { AuditService } from "../../application/services/audit.service";
import { activePageQuery } from "./dto/reporting.dto";
@Controller("v1/admin/audit")
export class AuditController {
  constructor(
    @Inject(IDENTITY_ACCESS) private readonly access: IdentityAccess,
    @Inject(REQUEST_GUARD) private readonly guard: RequestGuard,
    @Inject(AuditService) private readonly service: AuditService,
  ) {}
  @Get()
  async page(@Req() request: FastifyRequest, @Query() query: unknown) {
    const raw = this.guard.access(request),
      actor = await this.access.authenticate(raw);
    this.access.requirePermission(actor, "audit.read");
    await this.guard.admit(request, "read", actor.userId);
    return {
      kind: "page" as const,
      ...(await this.service.page({
        raw,
        actorId: actor.userId,
        correlationId: request.id,
        ...activePageQuery(query),
      })),
    };
  }
}
