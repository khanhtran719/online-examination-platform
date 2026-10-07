import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { RouteConfig } from "@nestjs/platform-fastify";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  IDENTITY_ACCESS,
  IdentityAccess,
  REQUEST_GUARD,
  GuardedRequest,
  RequestGuard,
} from "../../../identity/application/facades/identity.facade";
import { CatalogService } from "../../application/services/catalog.service";
import { Commit } from "../../application/dto/catalog.dto";
import {
  examWrite,
  idempotency,
  importRequest,
  listQuery,
  questionWrite,
  resourceId,
  revisionRequest,
} from "./dto/catalog.dto";

function guarded(request: FastifyRequest): GuardedRequest {
  return {
    headers: request.headers,
    cookies: request.cookies,
    id: request.id,
    ip: request.ip,
  };
}

@Controller("v1")
export class CatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(IDENTITY_ACCESS) private readonly access: IdentityAccess,
    @Inject(REQUEST_GUARD) private readonly guard: RequestGuard,
  ) {}

  @Get("exams")
  async browse(@Req() request: FastifyRequest, @Query() query: unknown) {
    const actor = await this.read(request, "catalog.read");
    const page = listQuery(query, true);
    const result = await this.catalog.browse(actor.actorId, page);
    return { kind: "page" as const, items: result.items, metadata: result.metadata };
  }

  @Get("exams/:examId")
  async exam(@Req() request: FastifyRequest, @Param("examId") examId: string) {
    await this.read(request, "catalog.read");
    return this.catalog.exam(resourceId(examId));
  }

  @Get("admin/exams")
  async adminExams(@Req() request: FastifyRequest, @Query() query: unknown) {
    const actor = await this.read(request, "catalog.manage");
    const page = listQuery(query);
    const result = await this.catalog.adminExams(actor.actorId, page);
    return { kind: "page" as const, items: result.items, metadata: result.metadata };
  }

  @Post("admin/exams")
  @RouteConfig({ requestBodyLimit: 128 * 1024 })
  async createExam(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Body() body: unknown,
  ) {
    const scope = await this.write(request, "catalog.manage");
    const result = await this.catalog.createExam(
      scope.raw,
      scope.key,
      examWrite(body),
      scope.correlationId,
    );
    return this.reply(reply, result);
  }

  @Get("admin/exams/:examId")
  async adminExam(@Req() request: FastifyRequest, @Param("examId") examId: string) {
    await this.read(request, "catalog.manage");
    return this.catalog.adminExam(resourceId(examId));
  }

  @Put("admin/exams/:examId")
  @RouteConfig({ requestBodyLimit: 128 * 1024 })
  async replaceExam(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Param("examId") examId: string,
    @Body() body: unknown,
  ) {
    const scope = await this.write(request, "catalog.manage");
    const result = await this.catalog.replaceExam(
      scope.raw,
      scope.key,
      resourceId(examId),
      examWrite(body),
      scope.correlationId,
    );
    return this.reply(reply, result);
  }

  @Delete("admin/exams/:examId")
  async archiveExam(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Param("examId") examId: string,
    @Body() body: unknown,
  ) {
    const scope = await this.write(request, "catalog.manage");
    const result = await this.catalog.archiveExam(
      scope.raw,
      scope.key,
      resourceId(examId),
      revisionRequest(body),
      scope.correlationId,
    );
    return this.reply(reply, result);
  }

  @Post("admin/exams/:examId/publish")
  async publish(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Param("examId") examId: string,
    @Body() body: unknown,
  ) {
    const scope = await this.write(request, "catalog.manage");
    const result = await this.catalog.publish(
      scope.raw,
      scope.key,
      resourceId(examId),
      revisionRequest(body),
      scope.correlationId,
    );
    return this.reply(reply, result);
  }

  @Post("admin/exams/:examId/unpublish")
  async unpublish(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Param("examId") examId: string,
    @Body() body: unknown,
  ) {
    const scope = await this.write(request, "catalog.manage");
    const result = await this.catalog.unpublish(
      scope.raw,
      scope.key,
      resourceId(examId),
      revisionRequest(body),
      scope.correlationId,
    );
    return this.reply(reply, result);
  }

  @Get("admin/questions")
  async questions(@Req() request: FastifyRequest, @Query() query: unknown) {
    const scope = await this.read(request, "catalog.keys.read");
    const page = listQuery(query);
    const result = await this.catalog.questions(
      scope.raw,
      scope.actorId,
      page,
      scope.correlationId,
    );
    return { kind: "page" as const, items: result.items, metadata: result.metadata };
  }

  @Post("admin/questions")
  @RouteConfig({ requestBodyLimit: 512 * 1024 })
  async createQuestion(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Body() body: unknown,
  ) {
    const scope = await this.write(request, "catalog.manage");
    const result = await this.catalog.createQuestion(
      scope.raw,
      scope.key,
      questionWrite(body),
      scope.correlationId,
    );
    return this.reply(reply, result);
  }

  @Get("admin/questions/:questionId")
  async question(@Req() request: FastifyRequest, @Param("questionId") questionId: string) {
    const scope = await this.read(request, "catalog.keys.read");
    return this.catalog.question(scope.raw, resourceId(questionId), scope.correlationId);
  }

  @Put("admin/questions/:questionId")
  @RouteConfig({ requestBodyLimit: 512 * 1024 })
  async replaceQuestion(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Param("questionId") questionId: string,
    @Body() body: unknown,
  ) {
    const scope = await this.write(request, "catalog.manage");
    const result = await this.catalog.replaceQuestion(
      scope.raw,
      scope.key,
      resourceId(questionId),
      questionWrite(body),
      scope.correlationId,
    );
    return this.reply(reply, result);
  }

  @Delete("admin/questions/:questionId")
  async archiveQuestion(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Param("questionId") questionId: string,
    @Body() body: unknown,
  ) {
    const scope = await this.write(request, "catalog.manage");
    const result = await this.catalog.archiveQuestion(
      scope.raw,
      scope.key,
      resourceId(questionId),
      revisionRequest(body),
      scope.correlationId,
    );
    return this.reply(reply, result);
  }

  @Post("admin/question-imports")
  @RouteConfig({ requestBodyLimit: 1024 * 1024 })
  async importQuestions(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Body() body: unknown,
  ) {
    const scope = await this.write(request, "catalog.import");
    const result = await this.catalog.importQuestions(
      scope.raw,
      scope.key,
      importRequest(body),
      scope.correlationId,
    );
    return this.reply(reply, result);
  }

  @Get("admin/question-imports/:importId")
  async importReport(@Req() request: FastifyRequest, @Param("importId") importId: string) {
    const actor = await this.read(request, "catalog.import");
    return this.catalog.importReport(actor.actorId, resourceId(importId));
  }

  private async read(request: FastifyRequest, permission: string) {
    const raw = this.guard.access(guarded(request));
    const actor = await this.access.authenticate(raw);
    this.access.requirePermission(actor, permission);
    await this.guard.admit(guarded(request), "read", actor.userId);
    return { raw, actorId: actor.userId, correlationId: request.id };
  }

  private async write(request: FastifyRequest, permission: string) {
    await this.guard.checkUnsafe(guarded(request));
    const raw = this.guard.access(guarded(request));
    const actor = await this.access.authenticate(raw);
    this.access.requirePermission(actor, permission);
    await this.guard.admit(guarded(request), "write", actor.userId);
    return {
      raw,
      key: idempotency(request.headers["idempotency-key"]),
      correlationId: request.id,
    };
  }

  private reply<T>(reply: FastifyReply, result: Commit<T>): T {
    if (result.replayed) reply.header("idempotency-replayed", "true");
    reply.status(result.httpStatus);
    return result.body;
  }
}
