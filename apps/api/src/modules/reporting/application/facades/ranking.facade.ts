export const RANKING_PROJECTION = Symbol("RANKING_PROJECTION");
export interface RankingInput {
  actorId: string;
  examId: string;
  versionId: string;
  pageSize: number;
  cursor: string | null;
}
export interface LeaderboardEntry {
  rank: number;
  pseudonym: string;
  earned: number;
  possible: number;
  completedAt: string;
}
export interface RankingPage {
  items: LeaderboardEntry[];
  metadata: { pageSize: number; next: string | null };
}
/** Public read-only capability; never exports source rows or persistence adapters. */
export interface RankingProjection {
  page(input: RankingInput): Promise<RankingPage>;
}
