import { RankingService } from "../ranking.service";
import { RankingQuery, RankingSlice } from "../../ports/ranking.query";
import {
  RankingCursor,
  RankingCursorClaims,
  RankingCursorState,
} from "../../ports/ranking-cursor.port";

const actorId = "10000000-0000-4000-8000-000000000001";
const examId = "20000000-0000-4000-8000-000000000001";
const versionId = "30000000-0000-4000-8000-000000000001";
const at = "2026-10-09T13:00:00.000Z";
const position: [string, string, string] = ["10", at, "40000000-0000-4000-8000-000000000001"];
const state: RankingCursorState = {
  watermark: "9007199254740993",
  epoch: "0",
  position,
  expiresAt: Date.parse(at) + 900000,
};
class Cursor implements RankingCursor {
  saved?: { claims: RankingCursorClaims; state: RankingCursorState };
  read(_token: string, _claims: RankingCursorClaims, now: number) {
    if (state.expiresAt <= now) throw new Error("expired");
    return state;
  }
  sign(claims: RankingCursorClaims, value: RankingCursorState) {
    this.saved = { claims, state: value };
    return "opaque-next";
  }
}
function setup() {
  let page: RankingSlice = {
    present: true,
    enabled: true,
    serverNow: at,
    epoch: "0",
    watermark: state.watermark,
    rows: [1, 2, 3].map((n) => ({
      rank: n,
      userId: `private-${n}`,
      attemptId: position[2],
      earned: 11 - n,
      possible: 10,
      submittedAt: at,
      completedAt: at,
    })),
  };
  const calls: Parameters<RankingQuery["page"]>[0][] = [];
  const query: RankingQuery = {
    page: async (input) => {
      calls.push(input);
      return page;
    },
  };
  const cursor = new Cursor();
  const service = new RankingService(query, cursor, {
    alias: (_version, user) => `candidate-${user.slice(-1)}`,
  });
  return {
    service,
    calls,
    cursor,
    set: (value: Partial<RankingSlice>) => {
      page = { ...page, ...value };
    },
  };
}
const input = { actorId, examId, versionId, pageSize: 2, cursor: null };
describe("Public ranking use case", () => {
  it("returns only exact pseudonym fields and signs continuation after the kept last row", async () => {
    const f = setup();
    const result = await f.service.page(input);
    expect(result.items).toEqual([
      { rank: 1, pseudonym: "candidate-1", earned: 10, possible: 10, completedAt: at },
      { rank: 2, pseudonym: "candidate-2", earned: 9, possible: 10, completedAt: at },
    ]);
    expect(result.metadata).toEqual({ pageSize: 2, next: "opaque-next" });
    expect(f.calls).toEqual([
      { examId, versionId, limit: 3, watermark: null, epoch: null, position: null },
    ]);
    expect(f.cursor.saved).toEqual({
      claims: { actorId, examId, versionId, pageSize: 2 },
      state: { ...state, position: ["9", at, position[2]] },
    });
    expect(JSON.stringify(result)).not.toMatch(/private-|attemptId|userId|submittedAt/);
  });
  it("retains the first watermark and expiry on continuation", async () => {
    const f = setup();
    await f.service.page({ ...input, cursor: "opaque" });
    expect(f.calls[0]).toEqual({
      examId,
      versionId,
      limit: 3,
      watermark: state.watermark,
      epoch: "0",
      position,
    });
    expect(f.cursor.saved!.state.expiresAt).toBe(state.expiresAt);
  });
  it("rejects a cursor after destructive ranking changes instead of duplicating candidates", async () => {
    const f = setup();
    f.set({ epoch: "1" });
    await expect(f.service.page({ ...input, cursor: "opaque" })).rejects.toMatchObject({
      category: "bad_input",
    });
  });
  it("checks expiry against the database clock", async () => {
    const f = setup();
    f.set({ serverNow: new Date(state.expiresAt).toISOString() });
    await expect(f.service.page({ ...input, cursor: "opaque" })).rejects.toThrow("expired");
  });
  it("returns no continuation for an empty or final page", async () => {
    const f = setup();
    f.set({ rows: [] });
    expect(await f.service.page(input)).toEqual({
      items: [],
      metadata: { pageSize: 2, next: null },
    });
  });
  it.each([
    { present: false, category: "not_found" },
    { enabled: false, category: "forbidden" },
  ])("fails closed for $category", async ({ category, ...page }) => {
    const f = setup();
    f.set(page);
    await expect(f.service.page(input)).rejects.toMatchObject({ category });
  });
  it.each([0, 101, 1.1, NaN])("rejects invalid page size %s before querying", async (pageSize) => {
    const f = setup();
    await expect(f.service.page({ ...input, pageSize })).rejects.toMatchObject({
      category: "bad_input",
    });
    expect(f.calls).toHaveLength(0);
  });
  it("rejects malformed signed position before SQL binding", async () => {
    const f = setup();
    f.cursor.read = () => ({ ...state, position: ["NaN", at, position[2]] });
    await expect(f.service.page({ ...input, cursor: "opaque" })).rejects.toMatchObject({
      category: "bad_input",
    });
    expect(f.calls).toHaveLength(0);
  });
});
