import { CandidateResultsService } from "../candidate-results.service";
import { CandidateResultsQuery } from "../../ports/candidate-results.query";
import {
  CandidateResultsCursor,
  CandidateResultsCursorState,
} from "../../ports/candidate-results-cursor.port";
import { IdentityAccess } from "../../../../identity/application/facades/identity.facade";
import { UnitOfWork } from "../../../../../shared/application/unit-of-work/unit-of-work.port";
import { AuditRecord } from "../../../../../shared/application/ports/security";
const now = "2026-10-10T00:00:00.000Z";
const actorId = "00000000-0000-4000-8000-000000000001";
const examId = "00000000-0000-4000-8000-000000000002";
const versionId = "00000000-0000-4000-8000-000000000003";
const input = {
  raw: "credential",
  actorId,
  examId,
  versionId,
  pageSize: 1,
  cursor: null,
  correlationId: examId,
};
function setup() {
  const audits: AuditRecord[] = [];
  let current = actorId,
    present = true,
    failAudit = false;
  let state: CandidateResultsCursorState | null = null;
  let invalidScore = false;
  const access: IdentityAccess = {
    authenticate: async () => ({ userId: current, permissions: ["reporting.read"] }),
    requirePermission: () => undefined,
    revalidate: async () => ({ userId: current, permissions: ["reporting.read"] }),
  };
  const queries: CandidateResultsQuery = {
    page: async () => ({
      present,
      serverNow: now,
      rows: [actorId, examId].map((candidateId) => ({
        candidateId,
        publishedVersionId: versionId,
        best: null,
        latest: {
          attemptId: versionId,
          submittedAt: now,
          status: "FAILED" as const,
          expired: false,
          earned: invalidScore ? 0 : null,
          possible: null,
        },
      })),
    }),
  };
  const cursors: CandidateResultsCursor = {
    read: () => {
      if (!state) throw new Error("invalid");
      return state;
    },
    sign: (_claims, value) => {
      state = value;
      return "opaque";
    },
  };
  const uow: UnitOfWork = { transaction: (work) => work() };
  const service = new CandidateResultsService(
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
    getState: () => state,
    setState: (v: CandidateResultsCursorState) => {
      state = v;
    },
    setCurrent: (v: string) => {
      current = v;
    },
    absent: () => {
      present = false;
    },
    breakAudit: () => {
      failAudit = true;
    },
    breakScore: () => {
      invalidScore = true;
    },
  };
}
describe("Admin candidate-results application policy", () => {
  it("bounds candidates and audits the exact frozen version before returning", async () => {
    const f = setup(),
      page = await f.service.page(input);
    expect(page.items).toHaveLength(1);
    expect(page.metadata).toEqual({ pageSize: 1, next: "opaque" });
    expect(f.audits).toEqual([
      {
        actorId,
        action: "reporting.candidate-results.read",
        resourceType: "EXAM_VERSION",
        resourceId: versionId,
        correlationId: examId,
      },
    ]);
  });
  it.each([0, 101, 1.5, NaN])("rejects invalid page size %s", async (pageSize) => {
    await expect(setup().service.page({ ...input, pageSize })).rejects.toMatchObject({
      category: "bad_input",
    });
  });
  it("rejects actor substitution after revalidation", async () => {
    const f = setup();
    f.setCurrent(examId);
    await expect(f.service.page(input)).rejects.toMatchObject({ category: "forbidden" });
    expect(f.audits).toEqual([]);
  });
  it("does not return an empty report for absent/mismatched scope", async () => {
    const f = setup();
    f.absent();
    await expect(f.service.page(input)).rejects.toMatchObject({ category: "not_found" });
    expect(f.audits).toEqual([]);
  });
  it("returns no report on audit failure", async () => {
    const f = setup();
    f.breakAudit();
    await expect(f.service.page(input)).rejects.toThrow("audit unavailable");
  });
  it("rejects invented scores for latest failure", async () => {
    const f = setup();
    f.breakScore();
    await expect(f.service.page(input)).rejects.toThrow("RESULT_STATE_UNAVAILABLE");
    expect(f.audits).toEqual([]);
  });
  it.each([
    { position: "bad" },
    { watermark: "garbage" },
    { watermark: "2026-10-10T00:00:01.000Z" },
    { expiresAt: Date.parse(now) },
    { expiresAt: Date.parse(now) + 900001 },
  ])("rejects invalid cursor state %j", async (change) => {
    const f = setup();
    f.setState({
      watermark: now,
      position: actorId,
      expiresAt: Date.parse(now) + 900000,
      ...change,
    });
    await expect(f.service.page({ ...input, cursor: "opaque" })).rejects.toMatchObject({
      category: "bad_input",
    });
    expect(f.audits).toEqual([]);
  });
  it("keeps the original watermark and expiry when continuing", async () => {
    const f = setup();
    const watermark = "2026-10-09T23:59:00.000Z";
    f.setState({ watermark, position: actorId, expiresAt: Date.parse(watermark) + 900000 });
    expect((await f.service.page({ ...input, cursor: "opaque" })).metadata.next).toBe("opaque");
    expect(f.getState()).toEqual({
      watermark,
      position: actorId,
      expiresAt: Date.parse(watermark) + 900000,
    });
  });
});
