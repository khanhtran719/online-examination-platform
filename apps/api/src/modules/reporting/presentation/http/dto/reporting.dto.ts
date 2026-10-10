import { invalidReport } from "../../../domain/reporting.error";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function examResource(value: string): string {
  if (!uuid.test(value)) throw invalidReport();
  return value.toLowerCase();
}
export function activePageQuery(value: unknown): { pageSize: number; cursor: string | null } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalidReport();
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((k) => k !== "pageSize" && k !== "cursor")) throw invalidReport();
  if (
    row.pageSize !== undefined &&
    (typeof row.pageSize !== "string" || !/^\d+$/.test(row.pageSize))
  )
    throw invalidReport();
  const pageSize = row.pageSize === undefined ? 20 : Number(row.pageSize);
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw invalidReport();
  if (
    row.cursor !== undefined &&
    (typeof row.cursor !== "string" || row.cursor.length < 1 || row.cursor.length > 2048)
  )
    throw invalidReport();
  return { pageSize, cursor: typeof row.cursor === "string" ? row.cursor : null };
}

export function submissionsPageQuery(value: unknown): {
  pageSize: number;
  cursor: string | null;
  publishedVersionId: string | null;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalidReport();
  const { publishedVersionId, ...page } = value as Record<string, unknown>;
  if (publishedVersionId !== undefined && typeof publishedVersionId !== "string")
    throw invalidReport();
  return {
    ...activePageQuery(page),
    publishedVersionId:
      typeof publishedVersionId === "string" ? examResource(publishedVersionId) : null,
  };
}
