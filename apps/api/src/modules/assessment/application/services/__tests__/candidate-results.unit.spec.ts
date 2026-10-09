import { CandidateResultsService } from "../candidate-results.service";
import { CandidateResultsQuery } from "../../ports/candidate-results.query";
import { AssessmentCursor, AssessmentCursorClaims } from "../../ports/assessment-cursor.port";
import { QuestionPageSizer } from "../../ports/question-page-sizer.port";
import { invalidRequest } from "../../../domain/assessment.error";
import { OwnedAttempt } from "../../ports/attempt-query.port";
import { randomUUID } from "node:crypto";
import { ReviewRelease } from "../../../domain/review-release";

const user = randomUUID(),
  id = randomUUID(),
  version = randomUUID();
const now = "2026-10-09T01:00:00.000Z";
const attempt = {
  id,
  userId: user,
  examId: randomUUID(),
  publishedVersionId: version,
  revision: 3,
  status: "SUBMITTED",
  startedAt: "2026-10-09T00:00:00.000Z",
  deadline: "2026-10-09T01:30:00.000Z",
  submittedAt: now,
  expired: false,
  replayPending: false,
  submissionId: randomUUID(),
  submissionKind: "MANUAL",
  serverNow: now,
} as OwnedAttempt;
const result = {
  attemptId: id,
  publishedVersionId: version,
  submissionId: attempt.submissionId!,
  completedAt: now,
  earned: 0,
  possible: 1,
  correct: 0,
  total: 1,
  percentageBasisPoints: 0,
  expired: false,
  scoringPolicy: "EXACT_MATCH_V1" as const,
  sections: [{ sectionId: randomUUID(), earned: 0, possible: 1, correct: 0, total: 1 }],
};
function fixture() {
  const projection = {
    attempt: { ...attempt },
    result: null as typeof result | null,
    reviewAllowed: false,
    release: {
      policy: "AFTER_COMPLETION",
      completed: true,
      closesAt: Date.parse(now),
      serverNow: Date.parse(now),
    } as ReviewRelease,
  };
  let allowed = false,
    present = true;
  const rows = Array.from({ length: 5 }, (_, i) => ({
    question: {
      id: randomUUID(),
      sectionId: result.sections[0]!.sectionId,
      position: i + 1,
      type: "SINGLE_CHOICE" as const,
      prompt: "\u0001".repeat(8000),
      points: 1,
      options: Array.from({ length: 10 }, (_, i) => ({
        id: randomUUID(),
        position: i + 1,
        text: "\u0001".repeat(2000),
      })),
    },
    selectedOptionIds: [],
    correctOptionIds: [randomUUID()],
    correct: false,
    explanation: "\u0001".repeat(8000),
    sectionPosition: 1,
  }));
  const queries: CandidateResultsQuery = {
    result: async () => (present ? projection : null),
    review: async () => ({
      present,
      allowed,
      release: projection.release,
      versionId: version,
      serverNow: now,
      rows: allowed ? rows : [],
    }),
    history: async () => ({ serverNow: now, watermark: now, rows: [] }),
  };
  // Application tests use ports; actual HMAC and HTTP encoding are integration checks.
  const tokens = new Map<
    string,
    {
      claims: AssessmentCursorClaims;
      watermark: string;
      position: string[];
      expires: number;
    }
  >();
  const cursors: AssessmentCursor = {
    sign(claims, watermark, position, expires) {
      const token = `test-token-${tokens.size}`;
      tokens.set(token, { claims, watermark, position, expires });
      return token;
    },
    read(token, claims, clock) {
      const data = tokens.get(token);
      if (!data || JSON.stringify(data.claims) !== JSON.stringify(claims) || data.expires < clock)
        throw invalidRequest();
      return { watermark: data.watermark, position: data.position };
    },
  };
  const sizer: QuestionPageSizer = {
    bytes: (page) => Buffer.byteLength(JSON.stringify(page), "utf8") + 512,
  };
  const service = new CandidateResultsService(queries, cursors, sizer);
  return {
    service,
    sizer,
    rows,
    projection,
    denyOwner: () => {
      present = false;
    },
    release: () => {
      allowed = true;
    },
  };
}
describe("Candidate result/review admission", () => {
  it("keeps the Domain release gate even if an adapter incorrectly reports allowed", async () => {
    const f = fixture();
    f.release();
    f.projection.release.policy = "NEVER";
    await expect(f.service.review(user, id, 20, null)).rejects.toThrow("Permission denied");
    f.projection.attempt.status = "COMPLETED";
    f.projection.result = result;
    f.projection.reviewAllowed = true;
    expect((await f.service.result(user, id)).body).toMatchObject({ review: null });
  });
  it.each([
    ["SUBMITTED", false, 2],
    ["EXPIRED", false, 2],
    ["FAILED", false, 0],
    ["FAILED", true, 2],
  ] as const)("keeps %s replay=%s durable and score-free", (status, pending, poll) => {
    const f = fixture();
    f.projection.attempt.status = status;
    f.projection.attempt.replayPending = pending;
    return expect(f.service.result(user, id)).resolves.toMatchObject({
      ready: false,
      body: { status, replayPending: pending, pollAfterSeconds: poll, resultAvailable: false },
    });
  });
  it("fails closed for missing completed result instead of fabricating a pending/zero score", async () => {
    const f = fixture();
    f.projection.attempt.status = "COMPLETED";
    await expect(f.service.result(user, id)).rejects.toThrow();
  });
  it("returns immutable summary without keys and only an authorized separate review link", async () => {
    const f = fixture();
    f.projection.attempt.status = "COMPLETED";
    f.projection.result = result;
    expect(await f.service.result(user, id)).toEqual({
      ready: true,
      body: { ...result, review: null },
    });
    f.projection.reviewAllowed = true;
    expect(await f.service.result(user, id)).toEqual({
      ready: true,
      body: { ...result, review: { href: `/v1/attempts/${id}/review` } },
    });
  });
  it("distinguishes foreign ownership from denied release", async () => {
    const f = fixture();
    await expect(f.service.review(user, id, 20, null)).rejects.toThrow("Permission denied");
    f.denyOwner();
    await expect(f.service.review(user, id, 20, null)).rejects.toThrow("Not found");
    await expect(f.service.result(user, id)).rejects.toThrow("Not found");
  });
  it("uses the encoded size port to clip and binds continuation to actor/attempt/page size", async () => {
    const f = fixture();
    f.release();
    const page = await f.service.review(user, id, 100, null);
    expect(page.items).toHaveLength(1);
    expect(f.sizer.bytes(page)).toBeLessThanOrEqual(262144);
    expect(page.metadata.next).not.toBeNull();
    await expect(f.service.review(randomUUID(), id, 100, page.metadata.next)).rejects.toThrow(
      "Invalid request",
    );
    await expect(f.service.review(user, randomUUID(), 100, page.metadata.next)).rejects.toThrow(
      "Invalid request",
    );
    await expect(f.service.review(user, id, 20, page.metadata.next)).rejects.toThrow(
      "Invalid request",
    );
    expect(Object.keys(page.items[0]!).sort()).toEqual([
      "correct",
      "correctOptionIds",
      "explanation",
      "question",
      "selectedOptionIds",
    ]);
  });
});
