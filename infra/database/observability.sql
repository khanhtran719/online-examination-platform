-- Run as the database administrator after enabling shared_preload_libraries.
-- On RDS this belongs to the parameter group/privileged provisioning operation.
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
-- Restricted aggregate view: runtime does not receive pg_read_all_stats or raw query text.
CREATE OR REPLACE VIEW public.examination_query_metrics AS
SELECT dbid,queryid,calls,total_exec_time,mean_exec_time,rows,shared_blks_hit,shared_blks_read,
  temp_blks_written,wal_bytes FROM public.pg_stat_statements WHERE dbid=(SELECT oid FROM pg_database WHERE datname=current_database());
REVOKE ALL ON public.examination_query_metrics FROM PUBLIC;
-- Operator/telemetry role grants are explicit at deployment; no public grant.
