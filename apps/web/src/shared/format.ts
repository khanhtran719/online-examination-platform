import type { AttemptStatus, Category, ExplanationPolicy } from "./api/dto";

const categories: Record<Category, string> = {
  TOEIC: "TOEIC",
  IELTS: "IELTS",
  IT_CERTIFICATION: "IT Certification",
  UNIVERSITY: "Đại học",
  RECRUITMENT: "Tuyển dụng",
  CORPORATE: "Nội bộ",
};

const policies: Record<ExplanationPolicy, string> = {
  NEVER: "Không mở đáp án",
  AFTER_COMPLETION: "Mở sau khi có kết quả",
  AFTER_EXAM_CLOSE: "Mở sau khi đề đóng",
};

const statuses: Record<AttemptStatus, string> = {
  CREATED: "Đã tạo",
  IN_PROGRESS: "Đang làm bài",
  SUBMITTED: "Đã nộp",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Đã có kết quả",
  EXPIRED: "Hết giờ",
  FAILED: "Xử lý thất bại",
};

export function categoryLabel(category: Category): string {
  return categories[category];
}

export function policyLabel(policy: ExplanationPolicy): string {
  return policies[policy];
}

export function statusLabel(status: AttemptStatus): string {
  return statuses[status];
}

export function formatBasisPoints(value: number): string {
  return `${(value / 100).toFixed(2)}%`;
}

export function formatClock(iso: string | null, timeZone = "Asia/Ho_Chi_Minh"): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, timeZone = "Asia/Ho_Chi_Minh"): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return `${minutes} phút`;
}

export function shortId(value: string): string {
  return value.slice(0, 8);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  if (value.startsWith("/login") || value.startsWith("/register") || value.startsWith("/verify-email")) {
    return "/dashboard";
  }
  return value;
}
