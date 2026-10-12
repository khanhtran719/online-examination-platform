/** Cross-cutting fixed-policy audit maintenance; not a Reporting source write.
 * The adapter must protect the365day cutoff and atomically persist its own safe audit.
 * No caller age, target IDs or predicate overrides. Direct table DML is forbidden.
 */
export interface AuditRetentionPort {
  prune(batch: number, correlationId: string): Promise<number>;
}
