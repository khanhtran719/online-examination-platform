import { Controller, Get, Inject, Param, Query, Req } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import {
  IDENTITY_ACCESS,
  IdentityAccess,
  REQUEST_GUARD,
  RequestGuard,
} from "../../../identity/application/facades/identity.facade";
import { QuestionStatisticsService } from "../../application/services/question-statistics.service";
import { activePageQuery, examResource } from "./dto/reporting.dto";
@Controller("v1/admin/exams")
export class QuestionStatisticsController {
  constructor(
    @Inject(IDENTITY_ACCESS) private readonly access: IdentityAccess,
    @Inject(REQUEST_GUARD) private readonly guard: RequestGuard,
    @Inject(QuestionStatisticsService) private readonly reports: QuestionStatisticsService,
  ) {}
  @Get(":examId/versions/:versionId/question-statistics")
  async page(
    @Req() request: FastifyRequest,
    @Param("examId") examId: string,
    @Param("versionId") versionId: string,
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
        versionId: examResource(versionId),
        ...activePageQuery(query),
        correlationId: request.id,
      })),
    };
  }
}
