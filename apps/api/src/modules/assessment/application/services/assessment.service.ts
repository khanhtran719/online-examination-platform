import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { IdempotencyStore } from "../../../../shared/application/ports/idempotency";
import { UnitOfWork } from "../../../../shared/application/unit-of-work/unit-of-work.port";
import { CatalogAccess } from "../../../catalog/application/facades/catalog.facade";
import { IdentityAccess } from "../../../identity/application/facades/identity.facade";
import {
  AssessmentError,
  AttemptLimitError,
  ExamArchivedError,
  ExamClosedError,
  ExamNotOpenError,
  ExamNotPublishedError,
  IdempotencyConflictError,
  RevisionConflictError,
  invalidRequest,
  notFound,
} from "../../domain/assessment.error";
import {
  SelectionCommand,
  assertSelections,
  canonical,
  fitQuestionPage,
  manualSubmissionEvent,
  normalizeSelections,
  requireFreshKey,
} from "../../domain/assessment-policy";
import { Attempt } from "../../domain/attempt";
import { AttemptRecord, AttemptRepository } from "../../domain/repositories/attempt.repository";
import {
  AnswerView,
  AttemptView,
  CandidateQuestionView,
  Commit,
  PageResult,
  SaveReceipt,
  SubmitReceipt,
} from "../dto/assessment.dto";
import { AssessmentCursor, AssessmentCursorClaims } from "../ports/assessment-cursor.port";
import { AttemptQuery } from "../ports/attempt-query.port";
import { QuestionPageSizer } from "../ports/question-page-sizer.port";
import { SubmissionOutbox } from "../ports/submission-outbox";

const CURSOR_TTL_MS = 900_000;

function fingerprint(method: string, path: string, payload: unknown): Uint8Array {
  return createHash("sha256")
    .update(JSON.stringify([method, path, canonical(payload)]))
    .digest();
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

function millis(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error("Database clock unavailable");
  return parsed;
}

function questionView(row: {
  id: string;
  sectionId: string;
  position: number;
  type: CandidateQuestionView["type"];
  prompt: string;
  points: number;
  options: { id: string; position: number; text: string }[];
}): CandidateQuestionView {
  return {
    id: row.id,
    sectionId: row.sectionId,
    position: Number(row.position),
    type: row.type,
    prompt: row.prompt,
    points: Number(row.points),
    options: row.options.map((option) => ({
      id: option.id,
      position: Number(option.position),
      text: option.text,
    })),
  };
}

function view(record: AttemptRecord, serverNow: string): AttemptView {
  const nowMs = millis(serverNow);
  const deadlineMs = millis(record.deadline);
  return {
    id: record.id,
    examId: record.examId,
    publishedVersionId: record.publishedVersionId,
    revision: record.revision,
    status: record.status,
    startedAt: record.startedAt,
    deadline: record.deadline,
    submittedAt: record.submittedAt,
    expired: record.expired,
    serverNow,
    canSave: record.status === "IN_PROGRESS" && nowMs < deadlineMs,
    resultAvailable: record.status === "COMPLETED",
    pollAfterSeconds:
      record.status === "SUBMITTED" ||
      record.status === "EXPIRED" ||
      record.status === "PROCESSING" ||
      (record.status === "FAILED" && record.replayPending)
        ? 2
        : 0,
    replayPending: record.replayPending,
  };
}

function acceptance(record: AttemptRecord): SubmitReceipt {
  if (!record.submissionId || !record.submittedAt)
    throw new AssessmentError("Attempt cannot submit");
  return {
    attemptId: record.id,
    submissionId: record.submissionId,
    acceptedAt: record.submittedAt,
    acceptanceState: record.expired ? "EXPIRED" : "SUBMITTED",
    expired: record.expired,
  };
}

function lifecycle(record: AttemptRecord): Attempt {
  return Attempt.restore({
    id: record.id,
    examId: record.examId,
    userId: record.userId,
    status: record.status,
    startedAt: millis(record.startedAt),
    deadline: millis(record.deadline),
    submittedAt: record.submittedAt === null ? null : millis(record.submittedAt),
    expired: record.expired,
  });
}

export class AssessmentService {
  constructor(
    private readonly access: IdentityAccess,
    private readonly catalog: CatalogAccess,
    private readonly repo: AttemptRepository,
    private readonly queries: AttemptQuery,
    private readonly receipts: IdempotencyStore,
    private readonly outbox: SubmissionOutbox,
    private readonly uow: UnitOfWork,
    private readonly cursors: AssessmentCursor,
    private readonly pageSizer: QuestionPageSizer,
  ) {}

  async start(raw: string, key: string, examId: string): Promise<Commit<AttemptView>> {
    const digest = fingerprint("POST", `/v1/exams/${examId}/attempts`, {});
    return this.uow.transaction(async () => {
      const current = await this.access.revalidate(raw, "assessment.take");
      const existing = await this.receipts.find<AttemptView>(current.userId, key);
      if (existing) {
        if (!sameBytes(existing.fingerprint, digest)) throw new IdempotencyConflictError();
        return { replayed: true, httpStatus: existing.httpStatus, body: existing.response };
      }
      const active = await this.repo.lockActive(current.userId, examId);
      if (active) {
        const now = active.serverNow;
        requireFreshKey(key, millis(now));
        const body = view(active, now);
        await this.saveReceipt(
          current.userId,
          key,
          digest,
          "assessment.attempt.start",
          active.id,
          201,
          body,
        );
        return { replayed: false, httpStatus: 201, body };
      }
      const shared = await this.catalog.sharePublication(examId);
      if (!shared) throw notFound();
      const now = shared.serverNow;
      const nowMs = millis(now);
      requireFreshKey(key, nowMs);
      if (shared.archived) throw new ExamArchivedError();
      if (
        !shared.published ||
        shared.versionId === null ||
        shared.durationSeconds === null ||
        shared.attemptLimit === null ||
        shared.openAt === null ||
        shared.closeAt === null
      ) {
        throw new ExamNotPublishedError();
      }
      if (nowMs < shared.openAt) throw new ExamNotOpenError();
      if (nowMs >= shared.closeAt) throw new ExamClosedError();
      const deadlineMs = Math.min(nowMs + shared.durationSeconds * 1000, Math.ceil(shared.closeAt));
      if (deadlineMs <= nowMs) throw new ExamClosedError();
      const created = await this.repo.insert({
        id: randomUUID(),
        userId: current.userId,
        examId,
        publishedVersionId: shared.versionId,
        startedAt: new Date(nowMs).toISOString(),
        deadline: new Date(deadlineMs).toISOString(),
        attemptLimit: shared.attemptLimit,
      });
      if (!created) throw new AttemptLimitError();
      const body = view(created, now);
      await this.saveReceipt(
        current.userId,
        key,
        digest,
        "assessment.attempt.start",
        created.id,
        201,
        body,
      );
      return { replayed: false, httpStatus: 201, body };
    });
  }

  async resume(actorId: string, attemptId: string): Promise<AttemptView> {
    const row = await this.queries.read(attemptId, actorId);
    if (!row) throw notFound();
    return view(row, row.serverNow);
  }

  async questions(
    actorId: string,
    attemptId: string,
    requested: number,
    cursor: string | null,
  ): Promise<PageResult<CandidateQuestionView>> {
    const size = pageBound(requested);
    const owned = await this.queries.read(attemptId, actorId);
    if (!owned) throw notFound();
    const claims: AssessmentCursorClaims = {
      kind: "attempt.questions",
      actorId,
      pageSize: size,
      filter: `${attemptId}:${owned.publishedVersionId}`,
    };
    const nowMs = millis(owned.serverNow);
    const position = this.position(cursor, claims, nowMs, owned.publishedVersionId);
    const slice = await this.catalog.frozenQuestionSlice(
      owned.publishedVersionId,
      position,
      size + 1,
    );
    if (!slice.present) throw notFound();
    const page = (
      rows: readonly (typeof slice.rows)[number][],
    ): PageResult<CandidateQuestionView> => {
      const last = rows[rows.length - 1];
      const next =
        rows.length < slice.rows.length && last
          ? this.cursors.sign(
              claims,
              owned.publishedVersionId,
              [String(last.sectionPosition), String(last.position), last.id],
              nowMs + CURSOR_TTL_MS,
            )
          : null;
      return { items: rows.map(questionView), metadata: { next, pageSize: size } };
    };
    const fitted = fitQuestionPage(slice.rows.slice(0, size), (rows) =>
      this.pageSizer.bytes(page(rows)),
    );
    return page(fitted.kept);
  }

  async answers(
    actorId: string,
    attemptId: string,
    requested: number,
    cursor: string | null,
  ): Promise<PageResult<AnswerView>> {
    const size = pageBound(requested);
    const probe = await this.queries.read(attemptId, actorId);
    if (!probe) throw notFound();
    const claims: AssessmentCursorClaims = {
      kind: "attempt.answers",
      actorId,
      pageSize: size,
      filter: `${attemptId}:${probe.publishedVersionId}`,
    };
    const nowMs = millis(probe.serverNow);
    const position = this.position(cursor, claims, nowMs, probe.publishedVersionId);
    const page = await this.queries.answers({
      attemptId,
      userId: actorId,
      sectionPosition: position?.sectionPosition ?? null,
      questionPosition: position?.questionPosition ?? null,
      questionId: position?.questionId ?? null,
      limit: size + 1,
    });
    if (!page.present) throw notFound();
    const extra = page.rows.length > size;
    const kept = extra ? page.rows.slice(0, size) : page.rows;
    const last = kept[kept.length - 1];
    const next =
      extra && last
        ? this.cursors.sign(
            claims,
            probe.publishedVersionId,
            [String(last.sectionPosition), String(last.position), last.questionId],
            nowMs + CURSOR_TTL_MS,
          )
        : null;
    return {
      items: kept.map((row) => ({
        questionId: row.questionId,
        selectedOptionIds: row.selectedOptionIds,
        marked: row.marked,
        version: row.version,
        updatedAt: row.updatedAt,
      })),
      metadata: { next, pageSize: size },
    };
  }

  async save(
    raw: string,
    key: string,
    attemptId: string,
    input: readonly SelectionCommand[],
  ): Promise<Commit<SaveReceipt>> {
    const commands = normalizeSelections(input);
    if (
      commands.length < 1 ||
      commands.length > 20 ||
      new Set(commands.map((command) => command.questionId)).size !== commands.length
    ) {
      throw invalidRequest();
    }
    const digest = fingerprint("PUT", `/v1/attempts/${attemptId}/answers`, { answers: commands });
    return this.uow.transaction(async () => {
      const current = await this.access.revalidate(raw, "assessment.take");
      const existing = await this.receipts.find<SaveReceipt>(current.userId, key);
      if (existing) {
        if (!sameBytes(existing.fingerprint, digest)) throw new IdempotencyConflictError();
        return { replayed: true, httpStatus: existing.httpStatus, body: existing.response };
      }
      const locked = await this.repo.lockOwned(attemptId, current.userId);
      if (!locked) throw notFound();
      const now = locked.serverNow;
      requireFreshKey(key, millis(now));
      lifecycle(locked).assertCanSave(millis(now));
      const stored = await this.repo.versions(
        attemptId,
        commands.map((command) => command.questionId),
      );
      const versions = new Map(stored.map((row) => [row.questionId, row.version]));
      for (const command of commands) {
        if ((versions.get(command.questionId) ?? 0) !== command.expectedVersion) {
          throw new RevisionConflictError();
        }
      }
      const choices = await this.catalog.frozenChoices(
        locked.publishedVersionId,
        commands.map((command) => command.questionId),
      );
      assertSelections(commands, choices);
      const revision = await this.repo.replaceAnswers({
        attemptId,
        userId: current.userId,
        publishedVersionId: locked.publishedVersionId,
        answers: commands.map((command) => ({
          questionId: command.questionId,
          version: command.expectedVersion + 1,
          marked: command.marked,
          optionIds: [...command.selectedOptionIds],
        })),
      });
      if (revision === null) throw new AssessmentError("Attempt is closed");
      const body: SaveReceipt = {
        attemptId,
        acceptedAt: now,
        answers: commands.map((command) => ({
          questionId: command.questionId,
          version: command.expectedVersion + 1,
        })),
      };
      await this.saveReceipt(
        current.userId,
        key,
        digest,
        "assessment.answer.save",
        attemptId,
        200,
        body,
      );
      return { replayed: false, httpStatus: 200, body };
    });
  }

  async submit(
    raw: string,
    key: string,
    attemptId: string,
    correlationId: string,
  ): Promise<Commit<SubmitReceipt>> {
    const digest = fingerprint("POST", `/v1/attempts/${attemptId}/submit`, {});
    return this.uow.transaction(async () => {
      const current = await this.access.revalidate(raw, "assessment.take");
      const existing = await this.receipts.find<SubmitReceipt>(current.userId, key);
      if (existing) {
        if (!sameBytes(existing.fingerprint, digest)) throw new IdempotencyConflictError();
        return { replayed: true, httpStatus: existing.httpStatus, body: existing.response };
      }
      const locked = await this.repo.lockOwned(attemptId, current.userId);
      if (!locked) throw notFound();
      const now = locked.serverNow;
      requireFreshKey(key, millis(now));
      if (locked.submittedAt !== null) {
        return { replayed: false, httpStatus: 202, body: acceptance(locked) };
      }
      const attempt = lifecycle(locked);
      if (!attempt.submit(millis(now))) {
        return { replayed: false, httpStatus: 202, body: acceptance(locked) };
      }
      const snap = attempt.snapshot();
      const submissionId = randomUUID();
      const eventId = randomUUID();
      const submittedAt = new Date(snap.submittedAt ?? millis(now)).toISOString();
      const saved = await this.repo.submit({
        attemptId,
        userId: current.userId,
        status: snap.expired ? "EXPIRED" : "SUBMITTED",
        submittedAt,
        submissionId,
        eventId,
        expired: snap.expired,
      });
      if (!saved) throw new AssessmentError("Attempt cannot submit");
      await this.outbox.append(
        manualSubmissionEvent({
          eventId,
          attemptId,
          examId: locked.examId,
          publishedVersionId: locked.publishedVersionId,
          submissionId,
          occurredAt: submittedAt,
          deadline: locked.deadline,
          expired: snap.expired,
          correlationId,
          causationId: key,
        }),
      );
      const body: SubmitReceipt = {
        attemptId,
        submissionId,
        acceptedAt: submittedAt,
        acceptanceState: snap.expired ? "EXPIRED" : "SUBMITTED",
        expired: snap.expired,
      };
      await this.saveReceipt(
        current.userId,
        key,
        digest,
        "assessment.attempt.submit",
        attemptId,
        202,
        body,
      );
      return { replayed: false, httpStatus: 202, body };
    });
  }

  private position(
    cursor: string | null,
    claims: AssessmentCursorClaims,
    nowMs: number,
    versionId: string,
  ): { sectionPosition: number; questionPosition: number; questionId: string } | null {
    if (!cursor) return null;
    const opened = this.cursors.read(cursor, claims, nowMs);
    if (opened.watermark !== versionId) throw invalidRequest();
    const sectionPosition = Number(opened.position[0]);
    const questionPosition = Number(opened.position[1]);
    const questionId = opened.position[2];
    if (
      !Number.isInteger(sectionPosition) ||
      !Number.isInteger(questionPosition) ||
      typeof questionId !== "string"
    ) {
      throw invalidRequest();
    }
    return { sectionPosition, questionPosition, questionId };
  }

  private saveReceipt(
    actorId: string,
    key: string,
    digest: Uint8Array,
    operation: string,
    resourceId: string,
    httpStatus: number,
    response: object,
  ): Promise<void> {
    return this.receipts.save({
      actorId,
      key,
      fingerprint: digest,
      operation,
      resourceId,
      httpStatus,
      response,
    });
  }
}

function pageBound(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > 100) throw invalidRequest();
  return value;
}
