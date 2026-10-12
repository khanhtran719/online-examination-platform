export function auditRetentionConfig(env: NodeJS.ProcessEnv) {
  const enabled = env.AUDIT_RETENTION_ENABLED ?? "false",
    batch = env.AUDIT_RETENTION_BATCH ?? "500";
  if (enabled !== "true" && enabled !== "false") throw Error("Invalid audit retention flag");
  if (!/^[0-9]+$/.test(batch) || Number(batch) < 1 || Number(batch) > 1000)
    throw Error("Invalid audit retention batch");
  return { enabled: enabled === "true", batch: Number(batch) };
}
