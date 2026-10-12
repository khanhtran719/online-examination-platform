import { AuditRetention } from "../audit-retention";
describe("Finite audit-retention invocation", () => {
  it.each([0, 1001, 1.5])("rejects unsafe batch %s", (batch) =>
    expect(
      () =>
        new AuditRetention(
          { prune: async () => 0 },
          { transaction: async (work) => work() },
          batch,
        ),
    ).toThrow("Invalid audit retention batch"),
  );
  it("calls the port inside UoW and returns the bounded count", async () => {
    let active = false;
    const service = new AuditRetention(
      {
        prune: async (batch, correlation) => {
          expect(active).toBe(true);
          expect(batch).toBe(500);
          expect(correlation).toBe("tick");
          return 20;
        },
      },
      {
        transaction: async (work) => {
          active = true;
          try {
            return await work();
          } finally {
            active = false;
          }
        },
      },
      500,
    );
    expect(await service.runOnce("tick")).toEqual({ purgedRows: 20 });
  });
  it("starts no transaction after stop", async () => {
    const service = new AuditRetention(
      {
        prune: async () => {
          throw Error("unexpected");
        },
      },
      {
        transaction: async () => {
          throw Error("unexpected");
        },
      },
      500,
    );
    expect(await service.runOnce("tick", () => true)).toEqual({ purgedRows: 0 });
  });
  it.each([-1, 501, 0.5])("fails closed on unbounded port count %s", async (count) => {
    const service = new AuditRetention(
      { prune: async () => count },
      { transaction: async (work) => work() },
      500,
    );
    await expect(service.runOnce("tick")).rejects.toThrow("AUDIT_RETENTION_STATE_UNAVAILABLE");
  });
  it("does not acknowledge a failed commit", async () => {
    const service = new AuditRetention(
      { prune: async () => 1 },
      {
        transaction: async (work) => {
          await work();
          throw Error("commit failure");
        },
      },
      500,
    );
    await expect(service.runOnce("tick")).rejects.toThrow("commit failure");
  });
});
