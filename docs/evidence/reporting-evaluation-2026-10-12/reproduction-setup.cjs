// Disposable local evidence only. Fail rather than overwrite a previous run.
const { mkdir } = require("node:fs/promises");
const { isAbsolute, join } = require("node:path");

module.exports = async () => {
  const directory = process.env.REP08_EVIDENCE_DIR;
  const database = process.env.TEST_DATABASE_ADMIN_URL;
  if (!directory || !isAbsolute(directory)) throw new Error("Fresh absolute evidence path required");
  const target = new URL(database || "invalid:");
  if (target.hostname !== "127.0.0.1" || target.port !== "55435")
    throw new Error("Disposable localhost55435 administrator required");
  await mkdir(directory); // Parent must exist; the run directory must not exist.
  for (const key of Object.keys(process.env)) if (/EVIDENCE/.test(key)) delete process.env[key];
  for (const [key, name] of [
    ["ASSESSMENT_EVIDENCE_DIR", "assessment"],
    ["ADMIN_MONITOR_EVIDENCE_DIR", "active-candidates"],
    ["ADMIN_SUBMISSIONS_EVIDENCE_DIR", "submissions"],
    ["ADMIN_QUESTION_STATISTICS_EVIDENCE_DIR", "question-statistics"],
    ["ADMIN_CANDIDATE_RESULTS_EVIDENCE_DIR", "candidate-results"],
    ["ADMIN_BUSINESS_METRICS_EVIDENCE_DIR", "business-metrics"],
    ["ADMIN_AUDIT_EVIDENCE_DIR", "audit"],
  ]) {
    const child = join(directory, name);
    await mkdir(child);
    process.env[key] = child;
  }
  Object.assign(process.env, {
    LEADERBOARD_EVIDENCE_FILE: join(directory, "ranking.json"),
    REPORTING_SCHEMA_EVIDENCE_FILE: join(directory, "reporting-schema.json"),
    TEST_ASSESSMENT_HTTP_EVIDENCE: join(directory, "compiled-http.json"),
  });
  delete process.env.LEADERBOARD_COMPARISON;
};
