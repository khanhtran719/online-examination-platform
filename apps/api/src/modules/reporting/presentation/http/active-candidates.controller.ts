import { Controller, Get, Inject, Param, Query, Req } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import {
  IDENTITY_ACCESS,
  IdentityAccess,
  REQUEST_GUARD,
  RequestGuard,
} from "../../../identity/application/facades/identity.facade";
import { ActiveCandidatesService } from "../../application/services/active-candidates.service";
import { activePageQuery, examResource } from "./dto/reporting.dto";
@Controller("v1/admin/exams")
export class ActiveCandidatesController {
  constructor(
    @Inject(IDENTITY_ACCESS) private readonly access: IdentityAccess,
    @Inject(REQUEST_GUARD) private readonly guard: RequestGuard,
    @Inject(ActiveCandidatesService) private readonly reports: ActiveCandidatesService,
  ) {}
  @Get(":examId/active-candidates")
  async page(
    @Req() request: FastifyRequest,
    @Param("examId") examId: string,
    @Query() query: unknown,
  ) {
    const raw = this.guard.access(request),
      actor = await this.access.authenticate(raw);
    this.access.requirePermission(actor, "reporting.read");
    await this.guard.admit(request, "read", actor.userId);
    return {
      kind: "page" as const,
      ...(await this.reports.page({
        raw,
        actorId: actor.userId,
        examId: examResource(examId),
        ...activePageQuery(query),
        correlationId: request.id,
      })),
    };
  }
}
