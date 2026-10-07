import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { IdempotencyStore } from "../../../../shared/application/ports/idempotency";
import { SecurityControls } from "../../../../shared/application/ports/security";
import { UnavailableError } from "../../../../shared/application/errors/unavailable.error";
import { UnitOfWork } from "../../../../shared/application/unit-of-work/unit-of-work.port";
import { IdentityAccess } from "../../../identity/application/facades/identity.facade";
import {
  ExamArchivedError,
  ExamNotPublishedError,
  IdempotencyConflictError,
  PublicationIncompleteError,
  QuestionArchivedError,
  RevisionConflictError,
  invalidRequest,
  notFound,
} from "../../domain/catalog-error";
import {
  ExamDraft,
  ImportCommand,
  QuestionDraft,
  assertImportStructure,
  canonical,
  importIssues,
  requireFreshKey,
  validateExamDraft,
  validatePublication,
  validateQuestion,
} from "../../domain/catalog-policy";
import {
  CatalogRepository,
  LockedExam,
  LockedQuestion,
} from "../../domain/repositories/catalog.repository";
import {
  AdminExam,
  AdminQuestion,
  CandidateQuestion,
  Commit,
  ImportReport,
  MutationReceipt,
  PageResult,
  PublicExam,
  ScoringItem,
} from "../dto/catalog.dto";
import { CatalogAccess } from "../facades/catalog.facade";
import { CatalogCursor, CursorClaims } from "../ports/catalog-cursor.port";
import { CatalogQuery } from "../ports/catalog-query.port";

const CURSOR_TTL_MS = 900_000;

function fingerprint(method: string, path: string, payload: unknown): Uint8Array {
  return createHash("sha256")
    .update(JSON.stringify([method, path, canonical(payload)]))
    .digest();
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

function pageSize(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > 100) throw invalidRequest();
  return value;
}

export class CatalogService implements CatalogAccess {
  constructor(
    private readonly access: IdentityAccess,
    private readonly repo: CatalogRepository,
    private readonly projections: CatalogQuery,
    private readonly receipts: IdempotencyStore,
    private readonly security: SecurityControls,
    private readonly uow: UnitOfWork,
    private readonly cursors: CatalogCursor,
  ) {}

  async browse(
    actorId: string,
    input: { pageSize: number; cursor?: string; category?: string },
  ): Promise<PageResult<PublicExam>> {
    const size = pageSize(input.pageSize);
    const filter = input.category ?? "";
    const claims: CursorClaims = { kind: "exam.browse", actorId, pageSize: size, filter };
    const opened = input.cursor ? this.cursors.read(input.cursor, claims, Date.now()) : null;
    const page = await this.projections.browse({
      limit: size + 1,
      category: filter || null,
      watermark: opened?.watermark ?? null,
      at: opened?.position[0] ?? null,
      id: opened?.position[1] ?? null,
    });
    return this.page(
      page.rows.map(({ publishedAt: _publishedAt, ...exam }) => exam),
      page.rows.map((row) => [row.publishedAt, row.id]),
      size,
      claims,
      opened?.watermark ?? page.watermark,
    );
  }

  async exam(examId: string): Promise<PublicExam> {
    return (await this.projections.publishedExam(examId)) ?? notFoundThrow();
  }

  async adminExams(
    actorId: string,
    input: { pageSize: number; cursor?: string },
  ): Promise<PageResult<AdminExam>> {
    const size = pageSize(input.pageSize);
    const claims: CursorClaims = { kind: "exam.admin", actorId, pageSize: size, filter: "" };
    const opened = input.cursor ? this.cursors.read(input.cursor, claims, Date.now()) : null;
    const page = await this.projections.adminExams({
      limit: size + 1,
      watermark: opened?.watermark ?? null,
      at: opened?.position[0] ?? null,
      id: opened?.position[1] ?? null,
    });
    return this.page(
      page.rows.map(({ updatedAt: _updatedAt, ...exam }) => exam),
      page.rows.map((row) => [row.updatedAt, row.id]),
      size,
      claims,
      opened?.watermark ?? page.watermark,
    );
  }

  async adminExam(examId: string): Promise<AdminExam> {
    return (await this.projections.adminExam(examId)) ?? notFoundThrow();
  }

  async questions(
    raw: string,
    actorId: string,
    input: { pageSize: number; cursor?: string },
    correlationId: string,
  ): Promise<PageResult<AdminQuestion>> {
    const size = pageSize(input.pageSize);
    const claims: CursorClaims = { kind: "question.bank", actorId, pageSize: size, filter: "" };
    const opened = input.cursor ? this.cursors.read(input.cursor, claims, Date.now()) : null;
    return this.uow.transaction(async () => {
      const current = await this.access.revalidate(raw, "catalog.keys.read");
      const page = await this.projections.questions({
        limit: size + 1,
        watermark: opened?.watermark ?? null,
        at: opened?.position[0] ?? null,
        id: opened?.position[1] ?? null,
      });
      await this.security.audit({
        actorId: current.userId,
        action: "catalog.question.list",
        resourceType: "QUESTION",
        resourceId: current.userId,
        correlationId,
      });
      return this.page(
        page.rows.map(({ createdAt: _createdAt, ...question }) => question),
        page.rows.map((row) => [row.createdAt, row.id]),
        size,
        { ...claims, actorId: current.userId },
        opened?.watermark ?? page.watermark,
      );
    });
  }

  async question(raw: string, questionId: string, correlationId: string): Promise<AdminQuestion> {
    return this.uow.transaction(async () => {
      const current = await this.access.revalidate(raw, "catalog.keys.read");
      const row = await this.projections.question(questionId);
      await this.security.audit({
        actorId: current.userId,
        action: "catalog.question.read",
        resourceType: "QUESTION",
        resourceId: questionId,
        correlationId,
      });
      if (!row) throw notFound();
      return row;
    });
  }

  async importReport(actorId: string, importId: string): Promise<ImportReport> {
    return (await this.projections.importReport(importId, actorId)) ?? notFoundThrow();
  }

  getPublishedPolicy(examId: string): Promise<PublicExam | null> {
    return this.projections.publishedExam(examId);
  }

  async getFrozenQuestionPage(
    versionId: string,
    cursor: string | null,
    requested: number,
  ): Promise<PageResult<CandidateQuestion>> {
    const size = pageSize(requested);
    const claims: CursorClaims = {
      kind: "question.frozen",
      actorId: versionId,
      pageSize: size,
      filter: versionId,
    };
    const opened = cursor ? this.cursors.read(cursor, claims, Date.now()) : null;
    const sectionPosition = opened ? Number(opened.position[0]) : null;
    const questionPosition = opened ? Number(opened.position[1]) : null;
    if (
      opened &&
      (!Number.isInteger(sectionPosition) ||
        !Number.isInteger(questionPosition) ||
        typeof opened.position[2] !== "string")
    )
      throw invalidRequest();
    const page = await this.projections.frozenPage({
      versionId,
      limit: size + 1,
      sectionPosition,
      questionPosition,
      questionId: opened?.position[2] ?? null,
    });
    if (!page.present) throw notFound();
    return this.page(
      page.rows.map(({ sectionPosition: _sectionPosition, ...question }) => question),
      page.rows.map((row) => [String(row.sectionPosition), String(row.position), row.id]),
      size,
      claims,
      versionId,
    );
  }

  async getScoringSnapshot(versionId: string): Promise<ScoringItem[]> {
    return (await this.projections.scoring(versionId)) ?? notFoundThrow();
  }

  async createExam(
    raw: string,
    key: string,
    draft: ExamDraft,
    correlationId: string,
  ): Promise<Commit<MutationReceipt>> {
    const body = validateExamDraft(draft);
    if (body.expectedRevision !== 0) throw invalidRequest();
    return this.mutate({
      raw,
      permission: "catalog.manage",
      key,
      method: "POST",
      path: "/v1/admin/exams",
      payload: body,
      httpStatus: 201,
      correlationId,
      action: "catalog.exam.create",
      resourceType: "EXAM",
      changedFields: ["title", "category", "schedule", "sections"],
      effect: async () => {
        await this.requireBank(this.bankIds(body), "attach");
        const created = await this.repo.insertExam(body);
        return { resourceId: created.id, revision: created.revision };
      },
    });
  }

  async replaceExam(
    raw: string,
    key: string,
    examId: string,
    draft: ExamDraft,
    correlationId: string,
  ): Promise<Commit<MutationReceipt>> {
    const body = validateExamDraft(draft);
    if (body.expectedRevision < 1) throw invalidRequest();
    return this.mutate({
      raw,
      permission: "catalog.manage",
      key,
      method: "PUT",
      path: `/v1/admin/exams/${examId}`,
      payload: body,
      httpStatus: 200,
      correlationId,
      action: "catalog.exam.replace",
      resourceType: "EXAM",
      changedFields: ["title", "category", "schedule", "sections"],
      effect: async () => {
        const exam = await this.lockedExam(examId, body.expectedRevision);
        await this.requireBank(this.bankIds(body), "attach");
        const revision = await this.repo.replaceExam(exam.id, exam.revision, body);
        if (revision === null) throw new RevisionConflictError();
        return { resourceId: exam.id, revision };
      },
    });
  }

  archiveExam(
    raw: string,
    key: string,
    examId: string,
    expectedRevision: number,
    correlationId: string,
  ): Promise<Commit<MutationReceipt>> {
    return this.mutate({
      raw,
      permission: "catalog.manage",
      key,
      method: "DELETE",
      path: `/v1/admin/exams/${examId}`,
      payload: { expectedRevision },
      httpStatus: 200,
      correlationId,
      action: "catalog.exam.archive",
      resourceType: "EXAM",
      changedFields: ["archivedAt", "published"],
      effect: async () => {
        const exam = await this.lockedExam(examId, expectedRevision);
        const revision = await this.repo.archiveExam(exam.id, exam.revision);
        if (revision === null) throw new RevisionConflictError();
        return { resourceId: exam.id, revision };
      },
    });
  }

  publish(
    raw: string,
    key: string,
    examId: string,
    expectedRevision: number,
    correlationId: string,
  ): Promise<Commit<MutationReceipt>> {
    return this.mutate({
      raw,
      permission: "catalog.manage",
      key,
      method: "POST",
      path: `/v1/admin/exams/${examId}/publish`,
      payload: { expectedRevision },
      httpStatus: 200,
      correlationId,
      action: "catalog.exam.publish",
      resourceType: "EXAM",
      changedFields: ["published", "currentVersionId"],
      effect: async (actorId) => {
        const exam = await this.lockedExam(examId, expectedRevision);
        const ids = exam.sections.flatMap((section) =>
          section.questions.map((link) => link.bankQuestionId),
        );
        const locked = await this.repo.lockQuestions([...ids].sort());
        if (locked.length !== ids.length) throw new PublicationIncompleteError();
        const byId = new Map(locked.map((row) => [row.id, row]));
        // Eligibility must use a fresh clock after all serialization locks have been acquired.
        validatePublication({
          durationSeconds: exam.durationSeconds,
          attemptLimit: exam.attemptLimit,
          opensAt: exam.opensAt,
          closesAt: exam.closesAt,
          displayTimezone: exam.displayTimezone,
          now: await this.repo.now(),
          sections: exam.sections.map((section) => ({
            questions: section.questions.map((link) => {
              const question = byId.get(link.bankQuestionId) as LockedQuestion;
              return {
                archived: question.archived,
                type: question.type,
                optionCount: question.optionCount,
                keyCount: question.keyCount,
              };
            }),
          })),
        });
        const sealed = await this.repo.publish(exam.id, actorId, exam.revision);
        if (!sealed) throw new RevisionConflictError();
        return { resourceId: exam.id, revision: sealed.revision };
      },
    });
  }

  unpublish(
    raw: string,
    key: string,
    examId: string,
    expectedRevision: number,
    correlationId: string,
  ): Promise<Commit<MutationReceipt>> {
    return this.mutate({
      raw,
      permission: "catalog.manage",
      key,
      method: "POST",
      path: `/v1/admin/exams/${examId}/unpublish`,
      payload: { expectedRevision },
      httpStatus: 200,
      correlationId,
      action: "catalog.exam.unpublish",
      resourceType: "EXAM",
      changedFields: ["published"],
      effect: async () => {
        const exam = await this.lockedExam(examId, expectedRevision);
        if (!exam.published) throw new ExamNotPublishedError();
        const revision = await this.repo.unpublish(exam.id, exam.revision);
        if (revision === null) throw new RevisionConflictError();
        return { resourceId: exam.id, revision };
      },
    });
  }

  async createQuestion(
    raw: string,
    key: string,
    draft: QuestionDraft & { expectedRevision: number },
    correlationId: string,
  ): Promise<Commit<MutationReceipt>> {
    if (draft.expectedRevision !== 0) throw invalidRequest();
    const body = validateQuestion(draft);
    return this.mutate({
      raw,
      permission: "catalog.manage",
      key,
      method: "POST",
      path: "/v1/admin/questions",
      payload: { ...body, expectedRevision: 0 },
      httpStatus: 201,
      correlationId,
      action: "catalog.question.create",
      resourceType: "QUESTION",
      changedFields: ["type", "prompt", "options", "points"],
      effect: async () => {
        const created = await this.repo.insertQuestion(body);
        return { resourceId: created.id, revision: created.revision };
      },
    });
  }

  async replaceQuestion(
    raw: string,
    key: string,
    questionId: string,
    draft: QuestionDraft & { expectedRevision: number },
    correlationId: string,
  ): Promise<Commit<MutationReceipt>> {
    if (draft.expectedRevision < 1) throw invalidRequest();
    const body = validateQuestion(draft);
    return this.mutate({
      raw,
      permission: "catalog.manage",
      key,
      method: "PUT",
      path: `/v1/admin/questions/${questionId}`,
      payload: { ...body, expectedRevision: draft.expectedRevision },
      httpStatus: 200,
      correlationId,
      action: "catalog.question.replace",
      resourceType: "QUESTION",
      changedFields: ["type", "prompt", "options", "points"],
      effect: async () => {
        const question = await this.lockedQuestion(questionId, draft.expectedRevision);
        const revision = await this.repo.replaceQuestion(question.id, question.revision, body);
        if (revision === null) throw new RevisionConflictError();
        return { resourceId: question.id, revision };
      },
    });
  }

  archiveQuestion(
    raw: string,
    key: string,
    questionId: string,
    expectedRevision: number,
    correlationId: string,
  ): Promise<Commit<MutationReceipt>> {
    return this.mutate({
      raw,
      permission: "catalog.manage",
      key,
      method: "DELETE",
      path: `/v1/admin/questions/${questionId}`,
      payload: { expectedRevision },
      httpStatus: 200,
      correlationId,
      action: "catalog.question.archive",
      resourceType: "QUESTION",
      changedFields: ["archivedAt"],
      effect: async () => {
        const question = await this.lockedQuestion(questionId, expectedRevision);
        const revision = await this.repo.archiveQuestion(question.id, question.revision);
        if (revision === null) throw new RevisionConflictError();
        return { resourceId: question.id, revision };
      },
    });
  }

  async importQuestions(
    raw: string,
    key: string,
    input: ImportCommand,
    correlationId: string,
  ): Promise<Commit<ImportReport>> {
    const command = assertImportStructure(input);
    return this.uow.transaction(async () => {
      const current = await this.access.revalidate(raw, "catalog.import");
      const digest = fingerprint("POST", "/v1/admin/question-imports", command);
      const existing = await this.receipts.find<{ importId: string }>(current.userId, key);
      if (existing) {
        if (!sameBytes(existing.fingerprint, digest)) throw new IdempotencyConflictError();
        const report = await this.projections.importReport(
          existing.response.importId,
          current.userId,
        );
        if (!report) throw new UnavailableError("Service unavailable");
        return { replayed: true, httpStatus: existing.httpStatus, body: report };
      }
      const now = await this.repo.now();
      requireFreshKey(key, now);
      const issues = importIssues(command.questions);
      const valid = issues.length === 0;
      const committed = valid && !command.dryRun;
      const importId = randomUUID();
      const questions = committed
        ? command.questions.map((entry) => {
            const normalized = validateQuestion(entry);
            return { clientRef: entry.clientRef, id: randomUUID(), normalized };
          })
        : [];
      if (committed) {
        await this.repo.insertImported(
          questions.map((entry) => ({
            id: entry.id,
            type: entry.normalized.type,
            prompt: entry.normalized.prompt,
            explanation: entry.normalized.explanation,
            points: entry.normalized.points,
            options: entry.normalized.options.map((option) => ({
              id: randomUUID(),
              position: option.position,
              text: option.text,
              correct: entry.normalized.correctOptionPositions.includes(option.position),
            })),
          })),
        );
      }
      const report: ImportReport = {
        id: importId,
        valid,
        committed,
        issues,
        questions: questions.map((entry) => ({ clientRef: entry.clientRef, questionId: entry.id })),
        createdAt: new Date(now).toISOString(),
      };
      await this.repo.saveImportReport({
        id: importId,
        actorId: current.userId,
        dryRun: command.dryRun,
        valid,
        committed,
        report,
        createdAt: report.createdAt,
      });
      await this.security.audit({
        actorId: current.userId,
        action: "catalog.import",
        resourceType: "QUESTION_IMPORT",
        resourceId: importId,
        correlationId,
        changedFields: ["valid", "committed", "dryRun"],
      });
      await this.receipts.save({
        actorId: current.userId,
        key,
        fingerprint: digest,
        operation: "catalog.import",
        resourceId: importId,
        httpStatus: 200,
        response: { importId },
      });
      return { replayed: false, httpStatus: 200, body: report };
    });
  }

  private async mutate(input: {
    raw: string;
    permission: string;
    key: string;
    method: string;
    path: string;
    payload: unknown;
    httpStatus: number;
    correlationId: string;
    action: string;
    resourceType: string;
    changedFields: string[];
    effect: (actorId: string) => Promise<{ resourceId: string; revision: number }>;
  }): Promise<Commit<MutationReceipt>> {
    const digest = fingerprint(input.method, input.path, input.payload);
    return this.uow.transaction(async () => {
      const current = await this.access.revalidate(input.raw, input.permission);
      const existing = await this.receipts.find<MutationReceipt>(current.userId, input.key);
      if (existing) {
        if (!sameBytes(existing.fingerprint, digest)) throw new IdempotencyConflictError();
        return { replayed: true, httpStatus: existing.httpStatus, body: existing.response };
      }
      const now = await this.repo.now();
      requireFreshKey(input.key, now);
      const effect = await input.effect(current.userId);
      const receipt: MutationReceipt = {
        resourceId: effect.resourceId,
        revision: effect.revision,
        acceptedAt: new Date(now).toISOString(),
      };
      await this.security.audit({
        actorId: current.userId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: effect.resourceId,
        correlationId: input.correlationId,
        changedFields: input.changedFields,
      });
      await this.receipts.save({
        actorId: current.userId,
        key: input.key,
        fingerprint: digest,
        operation: input.action,
        resourceId: effect.resourceId,
        httpStatus: input.httpStatus,
        response: receipt,
      });
      return { replayed: false, httpStatus: input.httpStatus, body: receipt };
    });
  }

  private async lockedExam(id: string, expectedRevision: number): Promise<LockedExam> {
    const exam = await this.repo.lockExam(id);
    if (!exam) throw notFound();
    if (exam.archived) throw new ExamArchivedError();
    if (exam.revision !== expectedRevision) throw new RevisionConflictError();
    return exam;
  }

  private async lockedQuestion(id: string, expectedRevision: number) {
    const question = await this.repo.lockQuestion(id);
    if (!question) throw notFound();
    if (question.archived) throw new QuestionArchivedError();
    if (question.revision !== expectedRevision) throw new RevisionConflictError();
    return question;
  }

  private bankIds(draft: ExamDraft): string[] {
    return draft.sections.flatMap((section) =>
      section.questions.map((link) => link.bankQuestionId),
    );
  }

  private async requireBank(ids: string[], mode: "attach"): Promise<void> {
    const locked = await this.repo.lockQuestions([...ids].sort());
    if (locked.length !== ids.length) throw invalidRequest();
    if (mode === "attach" && locked.some((row) => row.archived)) throw new QuestionArchivedError();
  }

  private page<T>(
    items: T[],
    positions: string[][],
    size: number,
    claims: CursorClaims,
    watermark: string,
  ): PageResult<T> {
    const extra = items.length > size;
    const kept = extra ? items.slice(0, size) : items;
    const next = extra
      ? this.cursors.sign(claims, watermark, positions[size - 1] ?? [], Date.now() + CURSOR_TTL_MS)
      : null;
    return { items: kept, metadata: { next, pageSize: size } };
  }
}

function notFoundThrow(): never {
  throw notFound();
}
