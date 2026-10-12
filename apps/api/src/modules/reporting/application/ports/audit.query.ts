import type { AuditSource } from "../../domain/audit";

/** Read-only primary platform.audit_logs(id,occurred_at,actor_id,actor_type,action,
 * resource_type,resource_id,outcome,correlation_id,changed_fields). No reason,
 * operator_identity/Identity PII. Source schema/write-label changes require review.
 * Live keyset, not a repeatable snapshot/export; source rows can expire by retention.
 */
export interface AuditQuery {
  page(input: {
    limit: number;
    watermark: string | null;
    position: [string, string] | null;
  }): Promise<{ serverNow: string; rows: AuditSource[] }>;
}
