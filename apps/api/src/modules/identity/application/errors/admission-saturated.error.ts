import { UnavailableError } from "../../../../shared/application/errors/unavailable.error";

export class AdmissionSaturatedError extends UnavailableError {
  constructor() {
    super("Service busy");
  }
}
