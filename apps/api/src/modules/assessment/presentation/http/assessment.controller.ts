import { Body, Controller, Get, Inject, Param, Post, Put, Query, Req, Res } from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  GuardedRequest,
  IDENTITY_ACCESS,
  IdentityAccess,
  REQUEST_GUARD,
  RequestGuard,
} from "../../../identity/application/facades/identity.facade";
import { AssessmentService } from "../../application/services/assessment.service";
import { CandidateResultsService } from "../../application/services/candidate-results.service";
import { Commit } from "../../application/dto/assessment.dto";
import { idempotency, pageQuery, resourceId, saveRequest, submitBody } from "./dto/assessment.dto";

function guarded(request: FastifyRequest): GuardedRequest {
  return {
    headers: request.headers,
    cookies: request.cookies,
    id: request.id,
    ip: request.ip,
  };
}

@Controller("v1")
export class AssessmentController {
  constructor(
    @Inject(AssessmentService) private readonly assessment: AssessmentService,
    @Inject(IDENTITY_ACCESS) private readonly access: IdentityAccess,
    @Inject(REQUEST_GUARD) private readonly guard: RequestGuard,
    @Inject(CandidateResultsService) private readonly results: CandidateResultsService,
  ) {}

  @Post("exams/:examId/attempts")
  async start(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Param("examId") examId: string,
  ) {
    const scope = await this.write(request);
    const result = await this.assessment.start(scope.raw, scope.key, resourceId(examId));
    return this.reply(reply, result);
  }

  @Get("attempts/:attemptId")
  async resume(@Req() request: FastifyRequest, @Param("attemptId") attemptId: string) {
    const actor = await this.read(request);
    return this.assessment.resume(actor.actorId, resourceId(attemptId));
  }

  @Get("attempts/:attemptId/questions")
  async questions(
    @Req() request: FastifyRequest,
    @Param("attemptId") attemptId: string,
    @Query() query: unknown,
  ) {
    const actor = await this.read(request);
    const page = pageQuery(query);
    const result = await this.assessment.questions(
      actor.actorId,
      resourceId(attemptId),
      page.pageSize,
      page.cursor ?? null,
    );
    return { kind: "page" as const, items: result.items, metadata: result.metadata };
  }

  @Get("attempts/:attemptId/answers")
  async answers(
    @Req() request: FastifyRequest,
    @Param("attemptId") attemptId: string,
    @Query() query: unknown,
  ) {
    const actor = await this.read(request);
    const page = pageQuery(query);
    const result = await this.assessment.answers(
      actor.actorId,
      resourceId(attemptId),
      page.pageSize,
      page.cursor ?? null,
    );
    return { kind: "page" as const, items: result.items, metadata: result.metadata };
  }

  @Put("attempts/:attemptId/answers")
  async save(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Param("attemptId") attemptId: string,
    @Body() body: unknown,
  ) {
    const scope = await this.write(request);
    const result = await this.assessment.save(
      scope.raw,
      scope.key,
      resourceId(attemptId),
      saveRequest(body),
    );
    return this.reply(reply, result);
  }

  @Post("attempts/:attemptId/submit")
  async submit(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Param("attemptId") attemptId: string,
    @Body() body: unknown,
  ) {
    submitBody(body);
    const scope = await this.write(request);
    const result = await this.assessment.submit(
      scope.raw,
      scope.key,
      resourceId(attemptId),
      scope.correlationId,
    );
    return this.reply(reply, result, 2);
  }

  @Get("attempts/:attemptId/status")
  async status(@Req() request: FastifyRequest, @Param("attemptId") attemptId: string) {
    const actor = await this.read(request);
    return this.assessment.resume(actor.actorId, resourceId(attemptId));
  }

  @Get("attempts/:attemptId/result")
  async result(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Param("attemptId") attemptId: string,
  ) {
    const actor = await this.read(request, "assessment.result.read");
    const result = await this.results.result(actor.actorId, resourceId(attemptId));
    if (!result.ready) {
      reply.status(202);
      reply.header("retry-after", "2");
    }
    return result.body;
  }

  @Get("attempts/:attemptId/review")
  async review(
    @Req() request: FastifyRequest,
    @Param("attemptId") attemptId: string,
    @Query() query: unknown,
  ) {
    const actor = await this.read(request, "assessment.result.read");
    const page = pageQuery(query);
    const result = await this.results.review(
      actor.actorId,
      resourceId(attemptId),
      page.pageSize,
      page.cursor ?? null,
    );
    return { kind: "page" as const, ...result };
  }

  @Get("me/attempts")
  async history(@Req() request: FastifyRequest, @Query() query: unknown) {
    const actor = await this.read(request);
    const page = pageQuery(query);
    const result = await this.results.history(actor.actorId, page.pageSize, page.cursor ?? null);
    return { kind: "page" as const, ...result };
  }

  private async read(request: FastifyRequest, permission = "assessment.take") {
    const raw = this.guard.access(guarded(request));
    const actor = await this.access.authenticate(raw);
    this.access.requirePermission(actor, permission);
    await this.guard.admit(guarded(request), "read", actor.userId);
    return { actorId: actor.userId };
  }

  private async write(request: FastifyRequest) {
    const { raw } = await this.guard.authorizeWrite(guarded(request), "assessment.take");
    return {
      raw,
      key: idempotency(request.headers["idempotency-key"]),
      correlationId: request.id,
    };
  }

  private reply<T>(response: FastifyReply, result: Commit<T>, retryAfter?: number): T {
    if (result.replayed) response.header("idempotency-replayed", "true");
    if (retryAfter !== undefined) response.header("retry-after", String(retryAfter));
    response.status(result.httpStatus);
    return result.body;
  }
}
