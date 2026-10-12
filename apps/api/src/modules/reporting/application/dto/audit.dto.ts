import { auditValues } from "../../domain/audit";
import { AdminReportInput } from "./submissions.dto";
export type AuditEntry = ReturnType<typeof auditValues>;
export interface AuditInput extends AdminReportInput {
  pageSize: number;
  cursor: string | null;
}
export interface AuditPage {
  items: AuditEntry[];
  metadata: { pageSize: number; next: string | null };
}
