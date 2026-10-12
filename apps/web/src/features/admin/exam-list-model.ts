import type { AdminExam, Category } from "@web/shared/api/dto";

export type Publication = "draft" | "published" | "archived";
export interface ExamListFilters {
  search: string;
  status: Publication | "all";
  category: Category | "all";
}

export function examPublication(exam: AdminExam): Publication {
  return exam.archived ? "archived" : exam.published ? "published" : "draft";
}

// Loaded rows only. Never reinterpret a filtered page as a server-wide total.
export function filterLoadedExams(
  rows: readonly AdminExam[],
  filters: ExamListFilters,
): readonly AdminExam[] {
  const search = filters.search.trim().toLocaleLowerCase("vi-VN");
  return rows.filter(
    (exam) =>
      (!search || exam.title.toLocaleLowerCase("vi-VN").includes(search)) &&
      (filters.status === "all" || examPublication(exam) === filters.status) &&
      (filters.category === "all" || exam.category === filters.category),
  );
}
