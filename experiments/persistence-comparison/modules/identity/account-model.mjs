// Experiment-only persistence models. Domain/Application remain unchanged.
export const fields = {
  id: ["id", "uuid"],
  email: ["email", "text"],
  passwordHash: ["password_hash", "text"],
  displayName: ["display_name", "text"],
  enabled: ["enabled", "boolean"],
  emailVerifiedAt: ["email_verified_at", "timestamptz"],
  credentialVersion: ["credential_version", "integer"],
  revision: ["revision", "integer"],
  leaderboardOptIn: ["leaderboard_opt_in", "boolean"],
  createdAt: ["created_at", "timestamptz"],
};
export function toAccount(row) {
  if (!row) return null;
  const value = row.get ? row.get({ plain: true }) : row;
  return {
    ...value,
    emailVerifiedAt: value.emailVerifiedAt?.getTime() ?? null,
    createdAt: value.createdAt.getTime(),
  };
}
