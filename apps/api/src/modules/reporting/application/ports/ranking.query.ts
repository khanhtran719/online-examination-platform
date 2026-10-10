export type RankingPosition = [string, string, string];
export interface RankingRow {
  rank: number;
  userId: string;
  attemptId: string;
  earned: number;
  possible: number;
  submittedAt: string;
  completedAt: string;
}
export interface RankingSlice {
  present: boolean;
  enabled: boolean;
  serverNow: string;
  epoch: string;
  watermark: string;
  rows: RankingRow[];
}
/** Read dependencies: Identity users visibility only; Catalog published_versions
 * id/exam_id/leaderboard_enabled; Assessment leaderboard_entries/results/attempts
 * and leaderboard_epochs. Fresh primary statement snapshot, no replica/cache.
 * Source schemas must review this consumer on migration. No foreign repository. */
export interface RankingQuery {
  page(input: {
    examId: string;
    versionId: string;
    limit: number;
    watermark: string | null;
    epoch: string | null;
    position: RankingPosition | null;
  }): Promise<RankingSlice>;
}
