import { Controller, Get, Inject, Param, Query, Req } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import {
  IDENTITY_ACCESS,
  IdentityAccess,
  REQUEST_GUARD,
  RequestGuard,
} from "../../../identity/application/facades/identity.facade";
import {
  RANKING_PROJECTION,
  RankingProjection,
} from "../../../reporting/application/facades/ranking.facade";
import { pageQuery, resourceId } from "./dto/assessment.dto";
@Controller("v1")
export class LeaderboardController {
  constructor(
    @Inject(IDENTITY_ACCESS) private readonly access: IdentityAccess,
    @Inject(REQUEST_GUARD) private readonly guard: RequestGuard,
    @Inject(RANKING_PROJECTION) private readonly ranking: RankingProjection,
  ) {}
  @Get("exams/:examId/versions/:versionId/leaderboard")
  async page(
    @Req() request: FastifyRequest,
    @Param("examId") examId: string,
    @Param("versionId") versionId: string,
    @Query() query: unknown,
  ) {
    const actor = await this.access.authenticate(this.guard.access(request));
    this.access.requirePermission(actor, "leaderboard.read");
    await this.guard.admit(request, "read", actor.userId);
    const page = pageQuery(query);
    return {
      kind: "page" as const,
      ...(await this.ranking.page({
        actorId: actor.userId,
        examId: resourceId(examId),
        versionId: resourceId(versionId),
        pageSize: page.pageSize,
        cursor: page.cursor ?? null,
      })),
    };
  }
}
