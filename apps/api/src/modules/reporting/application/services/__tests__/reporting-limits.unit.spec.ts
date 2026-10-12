import type { IdentityAccess } from "@identity/facade";
import type { AuditRecord } from "@shared/application/ports/security";
import type { UnitOfWork } from "@shared/application/unit-of-work/unit-of-work.port";

import { ActiveCandidatesService } from "../active-candidates.service";
import { CandidateResultsService } from "../candidate-results.service";
import { QuestionStatisticsService } from "../question-statistics.service";
import { RankingService } from "../ranking.service";
import { SubmissionsService } from "../submissions.service";

const id = "00000000-0000-4000-8000-000000000001";
const now = "2026-10-12T00:00:00.000Z";
const input = {
  raw: "session",
  actorId: id,
  examId: id,
  versionId: id,
  publishedVersionId: null,
  pageSize: 1,
  cursor: null,
  correlationId: id,
};
const privateFields = {
  email: "PRIVATE_EMAIL",
  displayName: "PRIVATE_NAME",
  answers: ["PRIVATE_ANSWER"],
  scoringKey: "PRIVATE_KEY",
  passwordHash: "PRIVATE_HASH",
};
const summary = {
  attemptId: id,
  submittedAt: now,
  status: "COMPLETED" as const,
  expired: false,
  earned: 0,
  possible: 100,
};
const section = { sectionId: id, earned: 0, possible: 100, correct: 0, total: 1 };
const score = {
  attemptId: id,
  publishedVersionId: id,
  submissionId: id,
  completedAt: now,
  earned: 0,
  possible: 100,
  correct: 0,
  total: 1,
  percentageBasisPoints: 0,
  expired: false,
  scoringPolicy: "EXACT_MATCH_V1" as const,
  review: null,
  sections: [section],
};
function fixture() {
  const audits: AuditRecord[] = [];
  const access: IdentityAccess = {
    authenticate: async () => ({ userId: id, permissions: ["reporting.read"] }),
    revalidate: async () => ({ userId: id, permissions: ["reporting.read"] }),
    requirePermission: () => undefined,
  };
  const uow: UnitOfWork = { transaction: (work) => work() };
  const security = {
    audit: async (record: AuditRecord) => {
      audits.push(record);
    },
  };
  const cursor = {
    read: () => {
      throw new Error("unexpected cursor");
    },
    sign: () => "opaque",
  };
  const active = {
    candidateId: id,
    attemptId: id,
    status: "IN_PROGRESS" as const,
    startedAt: now,
    deadline: now,
  };
  const submission = {
    candidateId: id,
    attemptId: id,
    publishedVersionId: id,
    submittedAt: null,
    status: "IN_PROGRESS" as const,
    expired: false,
    earned: null,
    possible: null,
  };
  const candidate = { candidateId: id, publishedVersionId: id, best: summary, latest: summary };
  const option = { optionId: id, selectedCount: "0", ...privateFields };
  const statistic = {
    questionId: id,
    sectionPosition: 1,
    questionPosition: 1,
    counters: { completed: "0", correct: "0", incorrect: "0", unanswered: "0" },
    options: [option],
    ...privateFields,
  };
  const activeRows = [{ ...active, ...privateFields }];
  const submissionRows = [{ ...submission, startedAt: now, ...privateFields }];
  const candidateRows = [
    {
      ...candidate,
      ...privateFields,
      best: { ...summary, ...privateFields },
      latest: { ...summary, ...privateFields },
    },
  ];
  const statisticRows = [statistic];
  const detail = { ...score, ...privateFields, sections: [{ ...section, ...privateFields }] };
  const activeService = new ActiveCandidatesService(
    access,
    {
      page: async () => ({ present: true, serverNow: now, rows: activeRows }),
    },
    cursor,
    security,
    uow,
  );
  const submissions = new SubmissionsService(
    access,
    {
      page: async () => ({ present: true, serverNow: now, rows: submissionRows }),
      result: async () => ({ status: "COMPLETED", result: detail }),
    },
    cursor,
    security,
    uow,
  );
  const candidates = new CandidateResultsService(
    access,
    {
      page: async () => ({ present: true, serverNow: now, rows: candidateRows }),
    },
    cursor,
    security,
    uow,
  );
  const statistics = new QuestionStatisticsService(
    access,
    {
      page: async () => ({ present: true, serverNow: now, rows: statisticRows }),
    },
    cursor,
    security,
    uow,
  );
  return {
    audits,
    active,
    submission,
    candidate,
    detail,
    activeRows,
    submissionRows,
    candidateRows,
    statisticRows,
    activeService,
    submissions,
    candidates,
    statistics,
  };
}
describe("Reporting output limits and accidental projection expansion", () => {
  it("exposes only declared active candidate fields", async () => {
    const f = fixture();
    expect((await f.activeService.page(input)).items).toEqual([f.active]);
  });
  it("exposes only declared submission fields while retaining null pending scores", async () => {
    const f = fixture();
    expect((await f.submissions.page(input)).items).toEqual([f.submission]);
  });
  it("redacts unexpected fields from both candidate selections", async () => {
    const f = fixture();
    expect((await f.candidates.page(input)).items).toEqual([f.candidate]);
  });
  it("redacts unexpected detail/section fields and never enables answer review", async () => {
    const f = fixture();
    Object.assign(f.detail, { review: { correctOptionIds: ["PRIVATE_KEY"] } });
    expect(await f.submissions.result({ ...input, attemptId: id })).toEqual(score);
    expect(f.audits).toHaveLength(1);
  });
  it.each(["activeRows", "submissionRows", "candidateRows", "statisticRows"] as const)(
    "fails before successful audit when %s exceeds the requested lookahead",
    async (key) => {
      const f = fixture();
      const rows = f[key];
      rows.push(...(Array.from({ length: 2 }, () => rows[0]) as typeof rows));
      const service = {
        activeRows: f.activeService,
        submissionRows: f.submissions,
        candidateRows: f.candidates,
        statisticRows: f.statistics,
      }[key];
      await expect(service.page(input)).rejects.toThrow("REPORT_PROJECTION_UNAVAILABLE");
      expect(f.audits).toEqual([]);
    },
  );
  it("rejects more than20 score sections before access audit", async () => {
    const f = fixture();
    f.detail.sections = Array.from({ length: 21 }, () => ({ ...section, ...privateFields }));
    await expect(f.submissions.result({ ...input, attemptId: id })).rejects.toThrow(
      "RESULT_STATE_UNAVAILABLE",
    );
    expect(f.audits).toEqual([]);
  });
  it("allows the maximum20 score sections without forwarding private fields", async () => {
    const f = fixture();
    f.detail.sections = Array.from({ length: 20 }, () => ({ ...section, ...privateFields }));
    expect(await f.submissions.result({ ...input, attemptId: id })).toEqual({
      ...score,
      sections: Array.from({ length: 20 }, () => section),
    });
  });
  it("rejects more than10 option counters before access audit", async () => {
    const f = fixture();
    const row = f.statisticRows[0]!;
    row.options = Array.from({ length: 11 }, () => row.options[0]!);
    await expect(f.statistics.page(input)).rejects.toThrow("REPORT_PROJECTION_UNAVAILABLE");
    expect(f.audits).toEqual([]);
  });
  it("allows10 options and strips internal counters, ordering and private fields", async () => {
    const f = fixture();
    const row = f.statisticRows[0]!;
    row.options = Array.from({ length: 10 }, () => row.options[0]!);
    expect((await f.statistics.page(input)).items).toEqual([
      {
        questionId: id,
        completedAttempts: 0,
        answered: 0,
        correct: 0,
        incorrect: 0,
        unanswered: 0,
        options: Array.from({ length: 10 }, () => ({ optionId: id, selectedCount: 0 })),
      },
    ]);
  });
  it("fails closed on an oversized public ranking projection", async () => {
    const service = new RankingService(
      {
        page: async () => ({
          present: true,
          enabled: true,
          serverNow: now,
          epoch: "0",
          watermark: "1",
          rows: Array.from({ length: 3 }, () => ({
            rank: 1,
            userId: id,
            attemptId: id,
            earned: 0,
            possible: 100,
            submittedAt: now,
            completedAt: now,
          })),
        }),
      },
      {
        read: () => {
          throw new Error("unexpected");
        },
        sign: () => "opaque",
      },
      { alias: () => "Candidate" },
    );
    await expect(service.page(input)).rejects.toThrow("REPORT_PROJECTION_UNAVAILABLE");
  });
  it.each(["activeRows", "submissionRows", "candidateRows", "statisticRows"] as const)(
    "accepts101 lookahead rows but exposes only100 safe records for %s",
    async (key) => {
      const f = fixture();
      const rows = f[key];
      rows.push(...(Array.from({ length: 100 }, () => rows[0]) as typeof rows));
      const service = {
        activeRows: f.activeService,
        submissionRows: f.submissions,
        candidateRows: f.candidates,
        statisticRows: f.statistics,
      }[key];
      const page = await service.page({ ...input, pageSize: 100 });
      expect(page.items).toHaveLength(100);
      expect(page.metadata).toMatchObject({ pageSize: 100, next: "opaque" });
      expect(JSON.stringify(page)).not.toMatch(
        /PRIVATE_|email|displayName|passwordHash|scoringKey/,
      );
      expect(f.audits).toHaveLength(1);
    },
  );
});
