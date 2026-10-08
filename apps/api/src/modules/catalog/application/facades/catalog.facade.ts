import {
  CandidateQuestion,
  FrozenChoice,
  FrozenRow,
  PageResult,
  PublicExam,
  ScoringItem,
  SharedPublication,
} from "../dto/catalog.dto";

export const CATALOG_ACCESS = Symbol("CATALOG_ACCESS");

/**
 * Trusted in-process capability. Assessment must authorize an owned attempt
 * before calling the frozen page or scoring snapshot. These methods are not HTTP routes.
 * They use the ambient transaction so a future start can read policy and version together.
 * sharePublication locks the exam row and must run inside the caller's transaction.
 */
export interface CatalogAccess {
  getPublishedPolicy(examId: string): Promise<PublicExam | null>;
  sharePublication(examId: string): Promise<SharedPublication | null>;
  getFrozenQuestionPage(
    versionId: string,
    cursor: string | null,
    pageSize: number,
  ): Promise<PageResult<CandidateQuestion>>;
  frozenQuestionSlice(
    versionId: string,
    cursor: { sectionPosition: number; questionPosition: number; questionId: string } | null,
    limit: number,
  ): Promise<{ present: boolean; rows: FrozenRow[] }>;
  frozenChoices(versionId: string, questionIds: readonly string[]): Promise<FrozenChoice[]>;
  getScoringSnapshot(versionId: string): Promise<ScoringItem[]>;
}
