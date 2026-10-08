import { IdentityService } from "../identity.service";
import {
  AuthenticatedWriteAdmission,
  WriteAdmissionInput,
  WriteAdmissionResult,
} from "../../ports/authenticated-write-admission.port";
import { Principal } from "../../dto/identity.dto";
import { SessionTokens } from "../../ports/identity-crypto.ports";
import { SecurityControls } from "../../../../../shared/application/ports/security";

const claims = { userId: "user", familyId: "family", sessionId: "session", jti: "jti", kid: "kid" };
const principal: Principal = {
  ...claims,
  permissions: ["assessment.take"],
  profile: {
    id: "user",
    email: "test@example.test",
    emailVerifiedAt: "now",
    displayName: "Candidate",
    leaderboardOptIn: false,
    revision: 1,
  },
};

function fixture(result: WriteAdmissionResult, invalidRefresh = false, invalidAccess = false) {
  const inputs: WriteAdmissionInput[] = [];
  const tokens = {
    async verify(_raw: string, purpose: string) {
      if ((purpose === "refresh" && invalidRefresh) || (purpose === "access" && invalidAccess))
        throw new Error("Invalid credential");
      return claims;
    },
    hash(raw: string) {
      return Buffer.from(raw);
    },
  } as SessionTokens;
  const query = {
    async admit(input: WriteAdmissionInput) {
      inputs.push(input);
      return result;
    },
  } as AuthenticatedWriteAdmission;
  const security = {
    rateSubject() {
      return Buffer.from("keyed-subject");
    },
  } as unknown as SecurityControls;
  const service = new IdentityService(
    undefined as never,
    undefined as never,
    undefined as never,
    tokens,
    undefined as never,
    "",
    security,
    undefined as never,
    undefined as never,
    query,
  );
  return { service, inputs };
}

describe("authenticated write admission", () => {
  it("uses verified credentials and a keyed rate subject without opening the mutation transaction", async () => {
    const { service, inputs } = fixture({ principal, csrfValid: true, allowed: true });
    await expect(
      service.authorizeWrite("access", "refresh", "family", "assessment.take"),
    ).resolves.toBe(principal);
    expect(inputs[0]).toMatchObject({
      access: { claims },
      refresh: { claims },
      permission: "assessment.take",
      subjectHash: Buffer.from("keyed-subject"),
      intervalMs: 200,
      burst: 20,
    });
  });

  it.each([undefined, "invalid-refresh"])(
    "permits live-access CSRF fallback when refresh is %s",
    async (raw) => {
      const { service, inputs } = fixture({ principal, csrfValid: true, allowed: true }, true);
      await expect(
        service.authorizeWrite("access", raw, "family", "assessment.take"),
      ).resolves.toBe(principal);
      expect(inputs[0]?.refresh).toBeNull();
    },
  );

  it.each([
    [{ principal, csrfValid: false, allowed: false }, "Permission denied"],
    [{ principal: null, csrfValid: true, allowed: false }, "Unauthenticated"],
    [
      { principal: { ...principal, permissions: [] }, csrfValid: true, allowed: false },
      "Permission denied",
    ],
    [{ principal, csrfValid: true, allowed: false }, "Too many requests"],
  ] as const)("rejects a failed authorization decision %#", async (decision, message) => {
    const { service } = fixture(decision as WriteAdmissionResult);
    await expect(
      service.authorizeWrite("access", undefined, "family", "assessment.take"),
    ).rejects.toThrow(message);
  });

  it("never admits an access credential that fails signature verification", async () => {
    const { service, inputs } = fixture({ principal, csrfValid: true, allowed: true }, false, true);
    await expect(
      service.authorizeWrite("bad-access", undefined, "family", "assessment.take"),
    ).rejects.toThrow("Invalid credential");
    expect(inputs).toHaveLength(0);
  });
});
