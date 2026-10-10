import { Controller, Get, Inject, Param, Query, Req } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import {
  IDENTITY_ACCESS,
  IdentityAccess,
  REQUEST_GUARD,
  RequestGuard,
} from "../../../identity/application/facades/identity.facade";
import { invalidReport } from "../../domain/reporting.error";
import { SubmissionsService } from "../../application/services/submissions.service";
import { activePageQuery, examResource, submissionsPageQuery } from "./dto/reporting.dto";
@Controller("v1/admin")
export class SubmissionsController {
  constructor(
    @Inject(IDENTITY_ACCESS) private readonly access: IdentityAccess,
    @Inject(REQUEST_GUARD) private readonly guard: RequestGuard,
    @Inject(SubmissionsService) private readonly reports: SubmissionsService,
  ) {}
  private async admit(request: FastifyRequest) {
    const raw = this.guard.access(request),
      actor = await this.access.authenticate(raw);
    this.access.requirePermission(actor, "reporting.read");
    await this.guard.admit(request, "read", actor.userId);
    return { raw, actorId: actor.userId, correlationId: request.id };
  }
  @Get("exams/:examId/submissions")
  async page(
    @Req() request: FastifyRequest,
    @Param("examId") examId: string,
    @Query() query: unknown,
  ) {
    const actor = await this.admit(request);
    return {
      kind: "page" as const,
      ...(await this.reports.page({
        ...actor,
        examId: examResource(examId),
        ...submissionsPageQuery(query),
      })),
    };
  }
  @Get("attempts/:attemptId/result")
  async result(
    @Req() request: FastifyRequest,
    @Param("attemptId") attemptId: string,
    @Query() query: unknown,
  ) {
    const actor = await this.admit(request);
    // Detail accepts no query parameters, including silently ignored paging/filter input.
    activePageQuery(query);
    if (Object.keys(query as object).length) throw invalidReport();
    return this.reports.result({ ...actor, attemptId: examResource(attemptId) });
  }
}
