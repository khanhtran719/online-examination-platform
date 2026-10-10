# Admin submissions and scores

`GET /v1/admin/exams/{examId}/submissions?pageSize=20` returns the attempt ledger.
Use `publishedVersionId` to select one frozen version belonging to this exam.
This includes unsubmitted attempts, with null submittedAt and null scores. All
attempts are included, including multiple attempts by one candidate; this is not
the best-score leaderboard. COMPLETED exposes integer scores, including genuine
zero. Other statuses expose null scores. EXPIRED is deadline submission; after
grading COMPLETED retains expired:true. PROCESSING is transaction-local today.
FAILED does not imply a zero score and replay does not change paging order.

Both this route and `GET /v1/admin/attempts/{attemptId}/result` require the live
verified/enabled session and current reporting.read permission. Baseline Admin
scope is all exams in this single platform. Candidate opt-out, disabled candidate
account, archived/unpublished exam or disabled leaderboard do not hide authorized
reports. Purged payloads are excluded; no PII, answers, keys, explanation or
failure details are returned. Detail returns aggregate and frozen section scores
in section position order, review:null. The separate Admin review permission and
route are not implemented by this increment.

Use metadata.next verbatim with the same actor/exam/version/pageSize (1–100,
default20); unknown or duplicate parameters are rejected. Opaque AES-GCM cursors
bind startedAt DESC/attemptId DESC order and expire15 minutes from the initial
primary DB watermark. Continuing does not renew expiry. All API tasks need the
same CSRF root, from which a separate cursor purpose key is derived. Rotation
invalidates navigation; workers require no new key. No new schema migration or
secret is needed beyond the existing18-migration API deployment prerequisites.

Pages are fresh primary READ COMMITTED projections. State/score updates can become
visible on later pages without moving the attempt. Starts after the watermark
are excluded; earlier transactions committing late can appear, and purge can
remove rows. This is not an exact cross-page snapshot/count/export. Refresh from
page1 for a new enumeration. No attempt lock is taken; concurrent grading exposes
the old committed state until its full completion transaction commits.

Successful reads commit safe technical access audit before any payload is returned:
reporting.submissions.read (EXAM) or reporting.result.read (ATTEMPT), actor/resource/
correlation IDs and empty changedFields. Validation, permission,404 and unfinished
409 responses reveal no score payload and do not create success access records.
Audit/COMMIT failure returns no data; GET retry can create another access audit
without changing business state. Preserve audit controls during incidents.

401: renew an enabled/verified session.403: stop until permission is restored.
400: correct input or restart after cursor expiry/rotation.404: exam/version scope
or attempt does not exist, or payload has been purged.409 Result not ready: use
submission status and bounded polling/backoff; terminal FAILED requires operator
recovery, not continuous immediate retry.429: follow Retry-After.503: bounded
backoff, inspect primary DB/pool/actor lock/audit availability; no memory fallback.

Each successful route currently uses8 SQL calls including initial auth/admission,
BEGIN, current actor lock/revalidation, one projection, audit and COMMIT. Identity
actor lock serializes concurrent reads by one Admin; statement/lock/acquisition
timeouts and pool waiting limits remain in force. Observe bounded route/operation
metrics and correlation IDs; never log cursors, cookies, IDs as metric labels,
SQL values or report bodies. Diagnostic/audit retention and production load/TLS/
restore/FinOps acceptance remain separate gates. Web integration is still pending.

[Plan, checks and evidence](../admin-submissions-2026-10-10.md).
