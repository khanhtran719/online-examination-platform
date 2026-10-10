# Admin active candidate monitor

`GET /v1/admin/exams/{examId}/active-candidates?pageSize=20` uses the live access
cookie and `reporting.read`. Only Admin baseline has this permission. v1 data scope
is all exams/all their frozen versions; a draft exists and returns an empty page.
Archived/unpublished exam attempts can remain active. No Candidate impersonation,
email/name/keys/answers, hidden total or browser presence.

Response uses the standard page envelope; data entries have candidateId, attemptId,
IN_PROGRESS status, startedAt and deadline. `metadata` has pageSize, next and asOf
(primary PostgreSQL statement time). Active is started, not purged, before deadline.
An overdue attempt disappears immediately without waiting for expiry worker; the
monitor never submits it. Disabled participants' ongoing attempts still appear.

Use next as an opaque cursor with the same exam/page size and authenticated actor.
It expires60s from first page; later pages do not extend it. Descending start time/
attempt ID with initial watermark excludes later starts. Each page is a fresh
live view: submissions/deadlines remove rows; late commits can become visible.
Refresh from page1 rather than claiming an exact all-pages snapshot/count.
Suggested UI polling is5–10s with jitter and paused background tabs; Web Admin
integration and measured polling policy are still pending.

401: restore a valid verified/enabled session.403: stop polling until the action
permission exists.404: requested exam does not exist.400: fix input or restart
navigation after expired/rotated cursor.429: respect Retry-After/backoff.503: bounded
retry/backoff; inspect DB pool/statement/actor lock/audit availability. Do not
disable audit, authentication or rate controls to restore this read.

The existing CSRF root derives a distinct AES-GCM cursor-purpose key. All API
instances share the root; root rotation invalidates these short-lived cursors.
No worker receives an extra key and no new secret provider is needed.

Every successful read commits `reporting.active-candidates.read` audit (EXAM,
actor/resource/correlation IDs, SUCCESS, empty changed fields). Retry after an ACK
loss may create another access record; GET does not change business state. An
audit or COMMIT error releases no report. Identity revalidation locks the Admin
actor inside the short transaction, so concurrent reads by one actor can serialize.
No Assessment attempt lock or external network I/O occurs in that transaction.
Statement budget is8 including authentication/rate/BEGIN/COMMIT. Observe bounded
route/reporting.read, actor lock/pool wait and audit.write metrics without raw
resource IDs/cursors/SQL/body as labels. Audit365day retention operations are a
separate unaccepted gate (REP-06).

No new schema rollout: existing18 migrations and API secrets suffice. Candidate
ranking still needs0018 and its separate leaderboard key. No AWS deployment,
sustainable capacity, failover, polling saturation or cost result is asserted.
[Implementation/evidence](../admin-monitor-2026-10-10.md).
