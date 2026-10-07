import { CandidateQuestion, PageResult, PublicExam, ScoringItem } from "../dto/catalog.dto";

export const CATALOG_ACCESS = Symbol("CATALOG_ACCESS");

/**
 * Trusted in-process capability. Assessment must authorize an owned attempt
 * before calling the frozen page or scoring snapshot. These methods are not HTTP routes.
 * They use the ambient transaction so a future start can read policy and version together.
 */
export interface CatalogAccess {
  getPublishedPolicy(examId: string): Promise<PublicExam | null>;
  getFrozenQuestionPage(
    versionId: string,
    cursor: string | null,
    pageSize: number,
  ): Promise<PageResult<CandidateQuestion>>;
  getScoringSnapshot(versionId: string): Promise<ScoringItem[]>;
}
