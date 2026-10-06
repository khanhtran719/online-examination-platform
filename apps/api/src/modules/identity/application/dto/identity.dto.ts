export interface Profile {
  id: string;
  email: string;
  emailVerifiedAt: string;
  displayName: string;
  leaderboardOptIn: boolean;
  revision: number;
}
export interface Principal {
  userId: string;
  familyId: string;
  sessionId: string;
  permissions: string[];
  profile: Profile;
}
export interface MutationReceipt {
  resourceId: string;
  revision: number;
  acceptedAt: string;
}
