import { invalidReport } from "../../../domain/reporting.error";
export function businessMetricsQuery(value: unknown): { from: string | null; to: string | null } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalidReport();
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((k) => k !== "from" && k !== "to")) throw invalidReport();
  for (const key of ["from", "to"])
    if (
      row[key] !== undefined &&
      (typeof row[key] !== "string" || (row[key] as string).length > 24)
    )
      throw invalidReport();
  return {
    from: typeof row.from === "string" ? row.from : null,
    to: typeof row.to === "string" ? row.to : null,
  };
}
