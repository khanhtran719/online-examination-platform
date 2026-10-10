export interface MailSettings {
  adapter: "smtp" | "ses";
  host: string;
  port: number;
  from: string;
  region: string;
  configurationSet?: string;
}
export interface CommonConfig {
  origin: string;
  port: number;
  emailKeys: { activeKid: string; keys: Record<string, Buffer> };
  rateKey: Buffer;
  workerConcurrency: number;
  mail: MailSettings;
}
export interface ApiConfig extends CommonConfig {
  issuer: string;
  activeKid: string;
  activePublicPem: string;
  privatePem: string;
  publicKeys: { kid: string; publicPem: string }[];
  passwordConcurrency: number;
  passwordMaxQueued: number;
  csrfKey: Buffer;
  leaderboardKey: Buffer;
  trustedProxies: string[];
}
