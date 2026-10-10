import { RankingInput, RankingPage, RankingProjection } from "../facades/ranking.facade";
import { RankingQuery } from "../ports/ranking.query";
import { RankingAlias, RankingCursor, RankingCursorState } from "../ports/ranking-cursor.port";
import { invalidRanking, rankingDenied, rankingNotFound } from "../../domain/ranking.error";
const ttl = 900000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function integer(value: string) {
  return /^(0|[1-9][0-9]{0,18})$/.test(value) && BigInt(value) <= 9223372036854775807n;
}
function time(value: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) throw invalidRanking();
  return parsed;
}
function validate(state: RankingCursorState) {
  if (
    !integer(state.watermark) ||
    !integer(state.epoch) ||
    state.position.length !== 3 ||
    !/^(0|[1-9][0-9]{0,5})$/.test(state.position[0]) ||
    Number(state.position[0]) > 500000 ||
    !uuid.test(state.position[2])
  )
    throw invalidRanking();
  time(state.position[1]);
}
export class RankingService implements RankingProjection {
  constructor(
    private readonly queries: RankingQuery,
    private readonly cursors: RankingCursor,
    private readonly aliases: RankingAlias,
  ) {}
  async page(input: RankingInput): Promise<RankingPage> {
    if (!Number.isSafeInteger(input.pageSize) || input.pageSize < 1 || input.pageSize > 100)
      throw invalidRanking();
    const { actorId, examId, versionId, pageSize } = input;
    const claims = { actorId, examId, versionId, pageSize };
    const opened = input.cursor ? this.cursors.read(input.cursor, claims, 0) : null;
    if (opened) validate(opened);
    const page = await this.queries.page({
      examId,
      versionId,
      limit: pageSize + 1,
      watermark: opened?.watermark ?? null,
      epoch: opened?.epoch ?? null,
      position: opened?.position ?? null,
    });
    if (!page.present) throw rankingNotFound();
    if (!page.enabled) throw rankingDenied();
    const now = time(page.serverNow);
    if (input.cursor) this.cursors.read(input.cursor, claims, now);
    if (
      opened &&
      (opened.epoch !== page.epoch ||
        opened.watermark !== page.watermark ||
        opened.expiresAt > now + ttl)
    )
      throw invalidRanking();
    const kept = page.rows.slice(0, pageSize),
      last = kept[kept.length - 1];
    return {
      items: kept.map((row) => ({
        rank: row.rank,
        pseudonym: this.aliases.alias(versionId, row.userId),
        earned: row.earned,
        possible: row.possible,
        completedAt: row.completedAt,
      })),
      metadata: {
        pageSize,
        next:
          last && kept.length < page.rows.length
            ? this.cursors.sign(claims, {
                watermark: page.watermark,
                epoch: page.epoch,
                position: [String(last.earned), last.submittedAt, last.attemptId],
                expiresAt: opened?.expiresAt ?? now + ttl,
              })
            : null,
      },
    };
  }
}
