import type { AdminExam, Category, ExamWriteRequest, ExplanationPolicy } from "@web/shared/api/dto";
import { utcToZonedInput, zonedInputToUtc } from "@web/shared/timezone";

export interface DraftSection {
  title: string;
  questions: { bankQuestionId: string; points: number }[];
}
export interface ExamFields {
  title: string;
  category: Category;
  duration: string;
  zone: string;
  openAt: string;
  closeAt: string;
  limit: string;
  policy: ExplanationPolicy;
  board: boolean;
  sections: DraftSection[];
  sourceSchedule?: { zone: string; openAt: string; closeAt: string };
}
export interface DraftIssue {
  field: string;
  message: string;
  step: 0 | 1;
}
export function newExamFields(): ExamFields {
  const zone = "Asia/Ho_Chi_Minh";
  return {
    title: "",
    category: "IT_CERTIFICATION",
    duration: "45",
    zone,
    openAt: utcToZonedInput(new Date().toISOString(), zone),
    closeAt: utcToZonedInput(new Date(Date.now() + 7 * 86400000).toISOString(), zone),
    limit: "1",
    policy: "NEVER",
    board: false,
    sections: [{ title: "Phần 1", questions: [] }],
  };
}
export function examFieldsOf(seed: AdminExam): ExamFields {
  return {
    title: seed.title,
    category: seed.category,
    duration: String(seed.durationSeconds / 60),
    zone: seed.displayTimezone,
    sourceSchedule: { zone: seed.displayTimezone, openAt: seed.openAt, closeAt: seed.closeAt },
    openAt: utcToZonedInput(seed.openAt, seed.displayTimezone, true),
    closeAt: utcToZonedInput(seed.closeAt, seed.displayTimezone, true),
    limit: String(seed.attemptLimit),
    policy: seed.explanationPolicy,
    board: seed.leaderboardEnabled,
    sections: seed.sections.map((section) => ({
      title: section.title,
      questions: section.questions.map(({ bankQuestionId, points }) => ({
        bankQuestionId,
        points,
      })),
    })),
  };
}
function examInstant(fields: ExamFields, field: "openAt" | "closeAt") {
  const local = fields[field];
  const normalized = local.length === 16 ? `${local}:00` : local;
  const source = fields.sourceSchedule;
  if (
    source?.zone === fields.zone &&
    utcToZonedInput(source[field], fields.zone, true) === normalized
  )
    return new Date(source[field]).toISOString();
  const iso = zonedInputToUtc(local, fields.zone);
  if (utcToZonedInput(iso, fields.zone, true) !== normalized) throw new Error("Invalid date");
  return iso;
}
export function rezoneExamFields(fields: ExamFields, zone: string): ExamFields {
  const openAt = examInstant(fields, "openAt"),
    closeAt = examInstant(fields, "closeAt");
  return {
    ...fields,
    zone,
    openAt: utcToZonedInput(openAt, zone, true),
    closeAt: utcToZonedInput(closeAt, zone, true),
    sourceSchedule: { zone, openAt, closeAt },
  };
}
export function draftTotals(sections: DraftSection[]) {
  return {
    sections: sections.length,
    questions: sections.reduce((sum, section) => sum + section.questions.length, 0),
    points: sections.reduce(
      (sum, section) =>
        sum + section.questions.reduce((subtotal, question) => subtotal + question.points, 0),
      0,
    ),
  };
}
export function buildExamDraft(
  fields: ExamFields,
  revision: number,
): { body: ExamWriteRequest | null; issues: DraftIssue[] } {
  const issues: DraftIssue[] = [];
  const add = (field: string, message: string, step: 0 | 1 = 0) =>
    issues.push({ field, message, step });
  const textValid = (value: string) =>
    [...value.trim()].length >= 1 && [...value.trim()].length <= 200;
  if (!textValid(fields.title)) add("title", "Tiêu đề cần từ 1 đến 200 ký tự.");
  const seconds = Number(fields.duration) * 60;
  const durationSeconds = Math.round(seconds);
  if (
    !fields.duration.trim() ||
    !Number.isFinite(seconds) ||
    Math.abs(seconds - durationSeconds) > 0.000001 ||
    durationSeconds < 60 ||
    durationSeconds > 14400
  )
    add("duration", "Thời lượng từ 1 đến 240 phút, chính xác đến giây.");
  const attemptLimit = Number(fields.limit);
  if (!Number.isInteger(attemptLimit) || attemptLimit < 1 || attemptLimit > 10)
    add("limit", "Số lượt tối đa từ 1 đến 10.");
  function time(field: "openAt" | "closeAt") {
    try {
      return examInstant(fields, field);
    } catch {
      add(field, "Ngày giờ không hợp lệ trong múi giờ đã chọn.");
      return "";
    }
  }
  const openAt = time("openAt"),
    closeAt = time("closeAt");
  if (openAt && closeAt && Date.parse(openAt) >= Date.parse(closeAt))
    add("closeAt", "Giờ đóng phải sau giờ mở.");
  if (fields.sections.length < 1 || fields.sections.length > 20)
    add("sections", "Cần từ 1 đến 20 phần.", 1);
  const used = new Set<string>();
  let duplicate = false,
    count = 0;
  fields.sections.forEach((section, sectionIndex) => {
    if (!textValid(section.title))
      add(
        `sectionTitle.${sectionIndex}`,
        `Tên phần ${sectionIndex + 1} cần từ 1 đến 200 ký tự.`,
        1,
      );
    if (section.questions.length === 0)
      add(`sections.${sectionIndex}`, `Phần ${sectionIndex + 1} chưa có câu hỏi.`, 1);
    section.questions.forEach((question, index) => {
      count += 1;
      if (used.has(question.bankQuestionId)) duplicate = true;
      used.add(question.bankQuestionId);
      if (!Number.isInteger(question.points) || question.points < 1 || question.points > 1000)
        add(
          `points.${sectionIndex}.${index}`,
          `Điểm câu ${index + 1} trong phần ${sectionIndex + 1} phải là số nguyên từ 1 đến 1000.`,
          1,
        );
    });
  });
  if (duplicate || count > 500)
    add("questions", "Tối đa 500 câu, mỗi câu chỉ xuất hiện một lần trong đề.", 1);
  return {
    issues,
    body: issues.length
      ? null
      : {
          title: fields.title.trim(),
          category: fields.category,
          durationSeconds,
          openAt,
          closeAt,
          displayTimezone: fields.zone,
          attemptLimit,
          explanationPolicy: fields.policy,
          leaderboardEnabled: fields.board,
          expectedRevision: revision,
          sections: fields.sections.map((section, index) => ({
            title: section.title.trim(),
            position: index + 1,
            questions: section.questions.map((question, questionIndex) => ({
              ...question,
              position: questionIndex + 1,
            })),
          })),
        },
  };
}
