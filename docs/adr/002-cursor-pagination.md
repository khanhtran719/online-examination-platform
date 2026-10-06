# ADR-002: Cursor pagination contract

Status: accepted project specialization. The supplied architecture section 46 requires page/total/lastPage metadata, which entails expensive counts and OFFSET semantics. The requested performance-first design explicitly calls for cursor experiments. Hot lists use stable keyset ordering and return envelope metadata `{next,pageSize}`. No hidden total query is performed. Counts for administrative summaries are separate reporting queries. This changes metadata only; the envelope and semantic error mapping remain intact.
