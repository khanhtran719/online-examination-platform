import { BusinessMetricsService } from "../business-metrics.service";
import { BusinessMetricsQuery } from "../../ports/business-metrics.query";
import { IdentityAccess } from "../../../../identity/application/facades/identity.facade";
import { AuditRecord } from "../../../../../shared/application/ports/security";
const actorId = "00000000-0000-4000-8000-000000000001",
  correlationId = "00000000-0000-4000-8000-000000000002",
  asOf = "2026-10-10T00:00:00.000Z";
const input = { actorId, correlationId, raw: "credential", from: null, to: null };
function setup() {
  const audits: AuditRecord[] = [];
  let active = false,
    deny = false,
    failAudit = false,
    failCommit = false,
    queryRuns = 0;
  let data = {
    asOf,
    from: "2026-10-09T00:00:00.000Z",
    to: asOf,
    counts: {
      startedAttempts: "0",
      activeAttempts: "0",
      submittedAttempts: "0",
      completedAttempts: "0",
      failedAttempts: "0",
      expiredSubmissions: "0",
      expiredCompletedAttempts: "0",
      pendingAttempts: "0",
      replayPendingAttempts: "0",
    },
    oldestSubmittedAt: null as string | null,
  };
  const access: IdentityAccess = {
    authenticate: async () => ({ userId: actorId, permissions: ["reporting.read"] }),
    requirePermission: () => undefined,
    revalidate: async (_raw, permission) => {
      if (!active || permission !== "reporting.read") throw new Error("bad transaction");
      if (deny) throw new Error("Permission denied");
      return { userId: actorId, permissions: ["reporting.read"] };
    },
  };
  const query: BusinessMetricsQuery = {
    snapshot: async () => {
      if (!active) throw new Error("bad transaction");
      queryRuns++;
      return data;
    },
  };
  const service = new BusinessMetricsService(
    access,
    query,
    {
      audit: async (record) => {
        if (!active) throw new Error("bad transaction");
        if (failAudit) throw new Error("audit unavailable");
        audits.push(record);
      },
    },
    {
      transaction: async (work) => {
        active = true;
        try {
          const result = await work();
          if (failCommit) throw new Error("commit unavailable");
          return result;
        } finally {
          active = false;
        }
      },
    },
  );
  return {
    service,
    audits,
    runs: () => queryRuns,
    deny: () => {
      deny = true;
    },
    breakAudit: () => {
      failAudit = true;
    },
    breakCommit: () => {
      failCommit = true;
    },
    source: (value: Partial<typeof data>) => {
      data = { ...data, ...value };
    },
  };
}
describe("Business metrics audited primary read", () => {
  it("returns zero cohort and null empty backlog with mandatory global access audit", async () => {
    const f = setup(),
      value = await f.service.snapshot(input);
    expect(value.window).toEqual({
      from: "2026-10-09T00:00:00.000Z",
      to: asOf,
      basis: "ATTEMPT_STARTED_AT",
    });
    expect(value.backlog.oldestAgeSeconds).toBeNull();
    expect(f.audits).toEqual([
      {
        actorId,
        correlationId,
        action: "reporting.business-metrics.read",
        resourceType: "BUSINESS_METRICS",
        resourceId: "00000000-0000-4000-8000-000000000000",
      },
    ]);
  });
  it("validates paired bounds before DB work", async () => {
    const f = setup();
    await expect(f.service.snapshot({ ...input, from: asOf })).rejects.toThrow("Invalid request");
    expect(f.runs()).toBe(0);
    expect(f.audits).toEqual([]);
  });
  it("revalidates current permission before reading", async () => {
    const f = setup();
    f.deny();
    await expect(f.service.snapshot(input)).rejects.toThrow("Permission denied");
    expect(f.runs()).toBe(0);
    expect(f.audits).toEqual([]);
  });
  it("rejects actor mismatch without auditing or projection", async () => {
    const f = setup();
    await expect(f.service.snapshot({ ...input, actorId: correlationId })).rejects.toThrow(
      "Permission denied",
    );
    expect(f.runs()).toBe(0);
    expect(f.audits).toEqual([]);
  });
  it("rejects future requested bound using authoritative primary time", async () => {
    const f = setup();
    await expect(
      f.service.snapshot({ ...input, from: asOf, to: "2026-10-11T00:00:00.000Z" }),
    ).rejects.toThrow("Invalid request");
    expect(f.audits).toEqual([]);
  });
  it("fails closed on corrupt source counts before access audit", async () => {
    const f = setup();
    f.source({
      counts: {
        startedAttempts: "0",
        activeAttempts: "0",
        submittedAttempts: "0",
        completedAttempts: "1",
        failedAttempts: "0",
        expiredSubmissions: "0",
        expiredCompletedAttempts: "0",
        pendingAttempts: "0",
        replayPendingAttempts: "0",
      },
    });
    await expect(f.service.snapshot(input)).rejects.toThrow("METRICS_STATE_UNAVAILABLE");
    expect(f.audits).toEqual([]);
  });
  it("fails closed if a projection returns a different requested window", async () => {
    const f = setup();
    f.source({ from: "2026-10-08T00:00:00.000Z" });
    await expect(
      f.service.snapshot({ ...input, from: "2026-10-09T00:00:00.000Z", to: asOf }),
    ).rejects.toThrow("METRICS_STATE_UNAVAILABLE");
    expect(f.audits).toEqual([]);
  });
  it("releases no report when access audit fails", async () => {
    const f = setup();
    f.breakAudit();
    await expect(f.service.snapshot(input)).rejects.toThrow("audit unavailable");
  });
  it("releases no report when transaction commit fails", async () => {
    const f = setup();
    f.breakCommit();
    await expect(f.service.snapshot(input)).rejects.toThrow("commit unavailable");
  });
});
