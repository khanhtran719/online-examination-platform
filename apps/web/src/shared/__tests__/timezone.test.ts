import { describe, expect, it } from "vitest";
import { utcToZonedInput, zonedInputToUtc } from "../timezone";

describe("IANA timezone conversion", () => {
  it("round-trips a Ho Chi Minh wall time through UTC", () => {
    const utc = zonedInputToUtc("2026-10-07T19:00", "Asia/Ho_Chi_Minh");
    expect(utc).toBe("2026-10-07T12:00:00.000Z");
    expect(utcToZonedInput(utc, "Asia/Ho_Chi_Minh")).toBe("2026-10-07T19:00");
  });

  it("round-trips a New York wall time without using the machine zone", () => {
    const utc = zonedInputToUtc("2026-10-07T08:00", "America/New_York");
    expect(utc).toBe("2026-10-07T12:00:00.000Z");
    expect(utcToZonedInput("2026-10-07T12:00:00.000Z", "America/New_York")).toBe("2026-10-07T08:00");
  });
});