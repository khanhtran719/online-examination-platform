import { UnavailableError } from "../../../../platform/domain/unavailable.error";
import { AdmissionSaturatedError } from "../errors/admission-saturated.error";

describe("admission saturation", () => {
  it("is a technical unavailable error with the safe client text", () => {
    const error = new AdmissionSaturatedError();
    expect(error).toBeInstanceOf(UnavailableError);
    expect(error.message).toBe("Service busy");
  });
});
