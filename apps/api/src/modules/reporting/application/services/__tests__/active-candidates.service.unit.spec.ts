import { ActiveCandidatesService } from "../active-candidates.service";
import { ActiveCandidatesQuery } from "../../ports/active-candidates.query";
import {
  ActiveCandidatesCursor,
  ActiveCursorState,
} from "../../ports/active-candidates-cursor.port";
import { IdentityAccess } from "../../../../identity/application/facades/identity.facade";
import { UnitOfWork } from "../../../../../shared/application/unit-of-work/unit-of-work.port";
import { AuditRecord } from "../../../../../shared/application/ports/security";

const now = "2026-10-10T00:00:00.000Z";
const actorId = "00000000-0000-4000-8000-000000000001";
const examId = "00000000-0000-4000-8000-000000000002";
const id = "00000000-0000-4000-8000-000000000003";
const input = { raw: "credential", actorId, examId, pageSize: 1, cursor: null, correlationId: id };
function setup() {
  const audits: AuditRecord[] = [];
  let current = actorId,
    present = true,
    failAudit = false;
  let state: ActiveCursorState | null = null;
  const access: IdentityAccess = {
    authenticate: async () => ({ userId: current, permissions: ["reporting.read"] }),
    requirePermission: () => undefined,
    revalidate: async () => ({ userId: current, permissions: ["reporting.read"] }),
  };
  const queries: ActiveCandidatesQuery = {
    page: async () => ({
      present,
      serverNow: now,
      rows: [id, actorId].map((attemptId) => ({
        candidateId: id,
        attemptId,
        status: "IN_PROGRESS" as const,
        startedAt: now,
        deadline: "2026-10-10T01:00:00.000Z",
      })),
    }),
  };
  const cursors: ActiveCandidatesCursor = {
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
  const service = new ActiveCandidatesService(
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
    setState: (v: ActiveCursorState) => {
      state = v;
    },
    failAudit: () => {
      failAudit = true;
    },
  };
}
describe("Active candidate read policy", () => {
  it("bounds results, exposes database freshness and audits the current actor before returning", async () => {
    const f = setup(),
      page = await f.service.page(input);
    expect(page.items).toHaveLength(1);
    expect(page.metadata).toEqual({ asOf: now, pageSize: 1, next: "opaque" });
    expect(f.audits).toEqual([
      {
        actorId,
        action: "reporting.active-candidates.read",
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
    { expiresAt: Date.parse(now) + 60001 },
    { watermark: "2026-10-09T23:59:00.000Z" },
  ])("rejects malformed, future or expired cursor state %s", async (change) => {
    const f = setup();
    f.setState({
      watermark: now,
      position: [now, id],
      expiresAt: Date.parse(now) + 60000,
      ...change,
    } as ActiveCursorState);
    await expect(f.service.page({ ...input, cursor: "opaque" })).rejects.toMatchObject({
      category: "bad_input",
    });
    expect(f.audits).toEqual([]);
  });
});
