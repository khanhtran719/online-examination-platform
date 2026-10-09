export function assessmentRetentionConfig(env: NodeJS.ProcessEnv) {
  const enabled = env.ASSESSMENT_RETENTION_ENABLED ?? "false";
  if (enabled !== "true" && enabled !== "false") throw new Error("Invalid retention enable flag");
  const size = (key: string, fallback: number, max: number) => {
    const value = env[key] ?? String(fallback);
    if (!/^[0-9]+$/.test(value) || Number(value) < 1 || Number(value) > max)
      throw new Error(`Invalid ${key}`);
    return Number(value);
  };
  return {
    enabled: enabled === "true",
    receiptBatch: size("ASSESSMENT_RETENTION_RECEIPT_BATCH", 500, 1000),
    attemptBatch: size("ASSESSMENT_RETENTION_ATTEMPT_BATCH", 10, 50),
  };
}
