import { StatisticCounters } from "../../domain/question-statistics";
/** Primary read-only sources: catalog.published_versions(id,exam_id),
 * published_sections(version_id,id,position), published_questions(version_id,id,
 * section_id,position), published_options(version_id,question_id,id,position),
 * assessment.question_statistics and option_statistics bigint counters.
 * Assessment owns atomic grading/retention writes. Re-review source migrations.
 * No Identity PII, answers, scoring keys, question text or draft policy join.
 */
export interface QuestionStatisticsQuery {
  page(input: {
    examId: string;
    versionId: string;
    limit: number;
    position: [number, number, string] | null;
  }): Promise<{
    present: boolean;
    serverNow: string;
    rows: {
      questionId: string;
      sectionPosition: number;
      questionPosition: number;
      counters: StatisticCounters;
      options: { optionId: string; selectedCount: string }[];
    }[];
  }>;
}
