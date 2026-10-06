-- Restricted operator session only. No query text or parameters are selected.
SELECT queryid,calls,mean_exec_time,total_exec_time,rows,shared_blks_hit,shared_blks_read,temp_blks_written,wal_bytes
FROM public.examination_query_metrics ORDER BY total_exec_time DESC LIMIT 20;
SELECT state,wait_event_type,wait_event,count(*) AS connections
FROM pg_stat_activity WHERE datname=current_database() GROUP BY state,wait_event_type,wait_event;
SELECT relation::regclass,mode,granted,count(*) AS locks
FROM pg_locks WHERE database=(SELECT oid FROM pg_database WHERE datname=current_database()) GROUP BY relation,mode,granted;
SELECT schemaname,relname,indexrelname,idx_scan,idx_tup_read,idx_tup_fetch FROM pg_stat_user_indexes;
