import type { FrozenMeta } from "@web/app/memory";
import type { HistoryItem } from "@web/shared/api/dto";

export function dashboardAttemptPath(item: HistoryItem): string {
  const root = `/attempts/${item.attemptId}`;
  if (item.status === "CREATED" || item.status === "IN_PROGRESS") return root;
  return `${root}/${item.status === "COMPLETED" ? "result" : "status"}`;
}
export function dashboardAttemptTitle(item: HistoryItem, frozen: FrozenMeta | null): string {
  return frozen &&
    frozen.examId === item.examId &&
    frozen.publishedVersionId === item.publishedVersionId
    ? frozen.title
    : `Phiên bản …${item.publishedVersionId.slice(-6)}`;
}
