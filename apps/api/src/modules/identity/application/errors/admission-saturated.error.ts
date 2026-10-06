import { UnavailableError } from "../../../../platform/domain/unavailable.error";

export class AdmissionSaturatedError extends UnavailableError {
  constructor() {
    super("Service busy");
  }
}
