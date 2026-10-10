import { SubmissionsService } from "../submissions.service";
import { SubmissionsQuery } from "../../ports/submissions.query";
import { SubmissionsCursor, SubmissionCursorState } from "../../ports/submissions-cursor.port";
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
  publishedVersionId: null,
  pageSize: 1,
  cursor: null,
  correlationId: id,
};
function setup() {
  const audits: AuditRecord[] = [];
  let current = actorId,
    present = true,
    failAudit = false;
  let state: SubmissionCursorState | null = null;
  const access: IdentityAccess = {
    authenticate: async () => ({ userId: current, permissions: ["reporting.read"] }),
    requirePermission: () => undefined,
    revalidate: async () => ({ userId: current, permissions: ["reporting.read"] }),
  };
  let detail: Awaited<ReturnType<SubmissionsQuery["result"]>> = {
    status: "SUBMITTED",
    result: null,
  };
  const queries: SubmissionsQuery = {
    result: async () => detail,
    page: async () => ({
      present,
      serverNow: now,
      rows: [id, actorId].map((attemptId) => ({
        candidateId: id,
        attemptId,
        status: "IN_PROGRESS" as const,
        publishedVersionId: examId,
        submittedAt: null,
        expired: false,
        earned: null,
        possible: null,
        startedAt: now,
      })),
    }),
  };
  const cursors: SubmissionsCursor = {
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
  const service = new SubmissionsService(
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
    setDetail: (v: typeof detail) => {
      detail = v;
    },
    setCurrent: (v: string) => {
      current = v;
    },
    setPresent: (v: boolean) => {
      present = v;
    },
    setState: (v: SubmissionCursorState) => {
      state = v;
    },
    failAudit: () => {
      failAudit = true;
    },
  };
}
describe("Admin submissions read policy", () => {
  it("bounds results, hides internal ordering fields and audits the current actor before returning", async () => {
    const f = setup(),
      page = await f.service.page(input);
    expect(page.items).toHaveLength(1);
    expect(page.metadata).toEqual({ pageSize: 1, next: "opaque" });
    expect(page.items[0]).not.toHaveProperty("startedAt");
    expect(f.audits).toEqual([
      {
        actorId,
        action: "reporting.submissions.read",
        resourceId: examId,
        resourceType: "EXAM",
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
    { position: [now, "bad-uuid"] },
    { watermark: "2026-10-10T00:00:01.000Z" },
    { expiresAt: Date.parse(now) },
    { expiresAt: Date.parse(now) + 900001 },
    { watermark: "2026-10-09T23:59:00.000Z" },
  ])("rejects malformed, future or expired cursor state %s", async (change) => {
    const f = setup();
    f.setState({
      watermark: now,
      position: [now, id],
      expiresAt: Date.parse(now) + 900000,
      ...change,
    } as SubmissionCursorState);
    await expect(f.service.page({ ...input, cursor: "opaque" })).rejects.toMatchObject({
      category: "bad_input",
    });
    expect(f.audits).toEqual([]);
  });
});

describe("Admin score detail policy", () => {
  const detailInput = { raw: input.raw, actorId, attemptId: id, correlationId: id };
  it("returns404 for withdrawn or missing payload", async () => {
    const f = setup();
    f.setDetail(null);
    await expect(f.service.result(detailInput)).rejects.toMatchObject({ category: "not_found" });
    expect(f.audits).toEqual([]);
  });
  it.each(["CREATED", "IN_PROGRESS", "SUBMITTED", "EXPIRED", "FAILED"])(
    "returns409 for %s without pretending it is scored",
    async (status) => {
      const f = setup();
      f.setDetail({ status, result: null });
      await expect(f.service.result(detailInput)).rejects.toMatchObject({ category: "conflict" });
      expect(f.audits).toEqual([]);
    },
  );
  it("fails closed for a completed attempt missing its durable score", async () => {
    const f = setup();
    f.setDetail({ status: "COMPLETED", result: null });
    await expect(f.service.result(detailInput)).rejects.toThrow("RESULT_STATE_UNAVAILABLE");
    expect(f.audits).toEqual([]);
  });
  it("returns real zero and section scores only after auditing; audit outage returns nothing", async () => {
    const f = setup();
    const score = {
      attemptId: id,
      publishedVersionId: examId,
      submissionId: id,
      completedAt: now,
      earned: 0,
      possible: 100,
      correct: 0,
      total: 1,
      percentageBasisPoints: 0,
      expired: true,
      scoringPolicy: "EXACT_MATCH_V1" as const,
      review: null,
      sections: [{ sectionId: id, earned: 0, possible: 100, correct: 0, total: 1 }],
    };
    f.setDetail({ status: "COMPLETED", result: score });
    expect(await f.service.result(detailInput)).toEqual(score);
    expect(f.audits).toEqual([
      {
        actorId,
        action: "reporting.result.read",
        resourceType: "ATTEMPT",
        resourceId: id,
        correlationId: id,
      },
    ]);
    f.failAudit();
    await expect(f.service.result(detailInput)).rejects.toThrow("audit unavailable");
  });
  it("cannot use a supplied actor to bypass current detail authorization", async () => {
    const f = setup();
    f.setCurrent(examId);
    await expect(f.service.result(detailInput)).rejects.toMatchObject({ category: "forbidden" });
    expect(f.audits).toEqual([]);
  });
});
