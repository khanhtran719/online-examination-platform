import { AuditService } from "../audit.service";
import { AuditSource } from "../../../domain/audit";
const id = "00000000-0000-4000-8000-000000000001",
  now = "2026-10-10T00:00:00.000Z";
const input = { actorId: id, raw: "credential", correlationId: id, pageSize: 1, cursor: null };
const row: AuditSource = {
  id,
  occurredAt: now,
  actorId: id,
  actorType: "USER",
  action: "catalog.exam.create",
  resourceType: "EXAM",
  resourceId: id,
  outcome: "SUCCESS",
  correlationId: id,
  changedFields: [],
};
function setup() {
  let active = false,
    denied = false,
    auditFailure = false,
    commitFailure = false,
    runs = 0,
    actor = id;
  const records: unknown[] = [],
    states: unknown[] = [];
  let rows = [row, { ...row, id: "00000000-0000-4000-8000-000000000000" }];
  let serverNow = now;
  const service = new AuditService(
    {
      authenticate: async () => ({ userId: id, permissions: ["audit.read"] }),
      requirePermission: () => undefined,
      revalidate: async (_raw: string, p: string) => {
        if (!active || p !== "audit.read") throw Error("wrong context");
        if (denied) throw Error("denied");
        return { userId: actor, permissions: ["audit.read"] };
      },
    },
    {
      page: async () => {
        if (!active) throw Error("wrong context");
        runs++;
        return { serverNow, rows };
      },
    },
    {
      read: () => {
        throw Error("bad cursor");
      },
      sign: (_claims: unknown, state: unknown) => {
        states.push(state);
        return "opaque";
      },
    },
    {
      audit: async (record: unknown) => {
        if (!active) throw Error("wrong context");
        if (auditFailure) throw Error("audit failure");
        records.push(record);
      },
    },
    {
      transaction: async (work) => {
        active = true;
        try {
          const result = await work();
          if (commitFailure) throw Error("commit failure");
          return result;
        } finally {
          active = false;
        }
      },
    },
  );
  return {
    service,
    records,
    states,
    runs: () => runs,
    deny: () => {
      denied = true;
    },
    wrongActor: () => {
      actor = "other";
    },
    breakAudit: () => {
      auditFailure = true;
    },
    breakCommit: () => {
      commitFailure = true;
    },
    source: (value: AuditSource[]) => {
      rows = value;
    },
    clock: (value: string) => {
      serverNow = value;
    },
  };
}
describe("Audited primary audit browse", () => {
  it("uses current audit.read, redacts and creates one global access audit", async () => {
    const f = setup();
    const p = await f.service.page(input);
    expect(p.items).toHaveLength(1);
    expect(p.metadata.next).toBe("opaque");
    expect(f.states).toEqual([
      { watermark: now, position: [now, id], expiresAt: Date.parse(now) + 900000 },
    ]);
    expect(f.records).toEqual([
      {
        actorId: id,
        correlationId: id,
        action: "reporting.audit.read",
        resourceType: "AUDIT_LOG",
        resourceId: "00000000-0000-4000-8000-000000000000",
      },
    ]);
  });
  it("returns an audited empty page with null continuation", async () => {
    const f = setup();
    f.source([]);
    expect((await f.service.page(input)).metadata.next).toBeNull();
    expect(f.records).toHaveLength(1);
  });
  it.each([0, 101, 1.5])("rejects page size %s before projection", async (pageSize) => {
    const f = setup();
    await expect(f.service.page({ ...input, pageSize })).rejects.toThrow("Invalid request");
    expect(f.runs()).toBe(0);
  });
  it("denies revoked permission before source read", async () => {
    const f = setup();
    f.deny();
    await expect(f.service.page(input)).rejects.toThrow("denied");
    expect(f.runs()).toBe(0);
  });
  it("denies actor mismatch before source read", async () => {
    const f = setup();
    f.wrongActor();
    await expect(f.service.page(input)).rejects.toThrow("Permission denied");
    expect(f.runs()).toBe(0);
  });
  it("fails closed on source clock corruption", async () => {
    const f = setup();
    f.clock("bad");
    await expect(f.service.page(input)).rejects.toThrow("AUDIT_STATE_UNAVAILABLE");
    expect(f.records).toEqual([]);
  });
  it("releases no page if audit fails", async () => {
    const f = setup();
    f.breakAudit();
    await expect(f.service.page(input)).rejects.toThrow("audit failure");
  });
  it("releases no page if commit fails", async () => {
    const f = setup();
    f.breakCommit();
    await expect(f.service.page(input)).rejects.toThrow("commit failure");
  });
});

describe("Audit projection boundary safety", () => {
  it("does not release source rows later than its clock", async () => {
    const f = setup();
    f.source([{ ...row, occurredAt: "2026-10-11T00:00:00.000Z" }]);
    await expect(f.service.page(input)).rejects.toThrow("AUDIT_STATE_UNAVAILABLE");
    expect(f.records).toEqual([]);
  });
  it("rejects duplicated/out-of-order source rows instead of signing a misleading cursor", async () => {
    const f = setup();
    f.source([row, row]);
    await expect(f.service.page(input)).rejects.toThrow("AUDIT_STATE_UNAVAILABLE");
    expect(f.records).toEqual([]);
  });
});
