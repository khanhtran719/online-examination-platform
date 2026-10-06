import { validateRuntimeSettings } from "../config.validation";
const env = {
  NODE_ENV: "test",
  PUBLIC_ORIGIN: "http://localhost:3000",
  MAIL_ADAPTER: "smtp",
  MAIL_FROM: "no-reply@example.test",
  EMAIL_KEYS_FILE: "email.json",
  RATE_KEY_FILE: "rate.key",
  JWT_PUBLIC_KEYS_FILE: "public.json",
  JWT_PRIVATE_KEY_FILE: "private.pem",
  CSRF_KEY_FILE: "csrf.key",
};
describe("typed configuration before secret I/O", () => {
  it("validates values and file references without reading secret files", () => {
    const settings = validateRuntimeSettings(env, "api");
    expect(settings.origin).toBe("http://localhost:3000");
    expect(settings.port).toBe(3000);
    expect(settings.passwordConcurrency).toBe(2);
    expect(settings.secretFiles.signing).toBe("private.pem");
  });
  it("rejects production HTTP, malformed origin and worker signing credentials before I/O", () => {
    expect(() => validateRuntimeSettings({ ...env, NODE_ENV: "production" }, "api")).toThrow();
    expect(() =>
      validateRuntimeSettings({ ...env, PUBLIC_ORIGIN: "http://localhost:3000/" }, "api"),
    ).toThrow();
    expect(() => validateRuntimeSettings(env, "worker")).toThrow();
  });
});
