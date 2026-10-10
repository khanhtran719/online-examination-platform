import { QuestionStatisticsService } from "../question-statistics.service";
import { QuestionStatisticsQuery } from "../../ports/question-statistics.query";
import {
  QuestionStatisticsCursor,
  QuestionStatisticsCursorState,
} from "../../ports/question-statistics-cursor.port";
import { IdentityAccess } from "../../../../identity/application/facades/identity.facade";
import { UnitOfWork } from "../../../../../shared/application/unit-of-work/unit-of-work.port";
import { AuditRecord } from "../../../../../shared/application/ports/security";

const now = "2026-10-10T00:00:00.000Z";
const actorId = "00000000-0000-4000-8000-000000000001";
const examId = "00000000-0000-4000-8000-000000000002";
const id = "00000000-0000-4000-8000-000000000003";
const input = {
  raw: "credential",
  actorId,
  examId,
  versionId: examId,
  pageSize: 1,
  cursor: null,
  correlationId: id,
};
function setup() {
  const audits: AuditRecord[] = [];
  let current = actorId,
    present = true,
    failAudit = false;
  let state: QuestionStatisticsCursorState | null = null;
  const access: IdentityAccess = {
    authenticate: async () => ({ userId: current, permissions: ["reporting.read"] }),
    requirePermission: () => undefined,
    revalidate: async () => ({ userId: current, permissions: ["reporting.read"] }),
  };
  const queries: QuestionStatisticsQuery = {
    page: async () => ({
      present,
      serverNow: now,
      rows: [id, actorId].map((questionId) => ({
        questionId,
        sectionPosition: 1,
        questionPosition: 1,
        counters: { completed: "0", correct: "0", incorrect: "0", unanswered: "0" },
        options: [{ optionId: id, selectedCount: "0" }],
      })),
    }),
  };
  const cursors: QuestionStatisticsCursor = {
    read: () => {
      if (!state) throw new Error("Invalid cursor");
      return state;
    },
    sign: (_claims, value) => {
      state = value;
      return "opaque";
    },
  };
  const uow: UnitOfWork = { transaction: (work) => work() };
  const service = new QuestionStatisticsService(
    access,
    queries,
    cursors,
    {
      audit: async (record) => {
        if (failAudit) throw new Error("audit unavailable");
        audits.push(record);
      },
    },
    uow,
  );
  return {
    service,
    audits,
    setCurrent: (v: string) => {
      current = v;
    },
    setPresent: (v: boolean) => {
      present = v;
    },
    setState: (v: QuestionStatisticsCursorState) => {
      state = v;
    },
    failAudit: () => {
      failAudit = true;
    },
  };
}
describe("Question statistics access policy", () => {
  it("bounds results, exposes database freshness and audits the current actor before returning", async () => {
    const f = setup(),
      page = await f.service.page(input);
    expect(page.items).toHaveLength(1);
    expect(page.metadata).toEqual({ pageSize: 1, next: "opaque" });
    expect(page.items[0]).toMatchObject({ questionId: id, answered: 0 });
    expect(page.items[0]).not.toHaveProperty("counters");
    expect(page.items[0]).not.toHaveProperty("sectionPosition");
    expect(f.audits).toEqual([
      {
        actorId,
        action: "reporting.question-statistics.read",
        resourceId: examId,
        resourceType: "EXAM_VERSION",
        correlationId: id,
      },
    ]);
  });
  it.each([0, 101, 1.5, NaN])("rejects invalid page size %s", async (pageSize) => {
    await expect(setup().service.page({ ...input, pageSize })).rejects.toMatchObject({
      category: "bad_input",
    });
  });
  it("does not let a supplied actor override the current session", async () => {
    const f = setup();
    f.setCurrent(examId);
    await expect(f.service.page(input)).rejects.toMatchObject({ category: "forbidden" });
    expect(f.audits).toEqual([]);
  });
  it("returns not found for absent exam rather than a misleading empty report", async () => {
    const f = setup();
    f.setPresent(false);
    await expect(f.service.page(input)).rejects.toMatchObject({ category: "not_found" });
    expect(f.audits).toEqual([]);
  });
  it("fails closed when the audit cannot persist", async () => {
    const f = setup();
    f.failAudit();
    await expect(f.service.page(input)).rejects.toThrow("audit unavailable");
  });
  it.each([
    { watermark: "garbage" },
    { position: [1, 1, "bad-uuid"] },
    { watermark: "2026-10-10T00:00:01.000Z" },
    { expiresAt: Date.parse(now) },
    { expiresAt: Date.parse(now) + 900001 },
    { position: [21, 1, id] },
  ])("rejects malformed, future or expired cursor state %s", async (change) => {
    const f = setup();
    f.setState({
      watermark: now,
      position: [1, 1, id],
      expiresAt: Date.parse(now) + 900000,
      ...change,
    } as QuestionStatisticsCursorState);
    await expect(f.service.page({ ...input, cursor: "opaque" })).rejects.toMatchObject({
      category: "bad_input",
    });
    expect(f.audits).toEqual([]);
  });
});
