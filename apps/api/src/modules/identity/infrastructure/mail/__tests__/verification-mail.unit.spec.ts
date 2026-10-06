import { jest } from "@jest/globals";
import { SesVerificationMail } from "../verification-mail";
import { SendEmailCommand } from "@aws-sdk/client-sesv2";
describe("SES provider boundary without AWS delivery", () => {
  it("builds the narrow send request and classifies permanent rejection", async () => {
    let captured: SendEmailCommand | undefined;
    const client = {
      send: async (command: SendEmailCommand) => {
        captured = command;
      },
      destroy: () => undefined,
    };
    const mail = new SesVerificationMail(
      "ap-southeast-1",
      "sender@example.test",
      "verification",
      client,
    );
    await mail.send("candidate@example.test", "https://example.test/verify-email#token=fixture");
    expect(captured!.input.Destination).toEqual({ ToAddresses: ["candidate@example.test"] });
    expect(captured!.input.ConfigurationSetName).toBe("verification");
    const rejected = new SesVerificationMail("ap-southeast-1", "sender@example.test", undefined, {
      send: async () => {
        throw { name: "MessageRejected", secret: "must never escape" };
      },
      destroy: () => undefined,
    });
    await expect(
      rejected.send("candidate@example.test", "https://example.test/verify-email#token=fixture"),
    ).rejects.toMatchObject({ retryable: false, message: "Mail delivery failed" });
  });
  it("aborts after five seconds and lets the durable worker schedule a retry", async () => {
    jest.useFakeTimers();
    try {
      const mail = new SesVerificationMail("ap-southeast-1", "sender@example.test", undefined, {
        send: async (_command, options) =>
          new Promise((_, reject) =>
            options.abortSignal.addEventListener("abort", () => reject({ name: "AbortError" }), {
              once: true,
            }),
          ),
        destroy: () => undefined,
      });
      const pending = expect(
        mail.send("candidate@example.test", "https://example.test/verify-email#token=fixture"),
      ).rejects.toMatchObject({ retryable: true });
      await jest.advanceTimersByTimeAsync(5000);
      await pending;
      mail.close();
    } finally {
      jest.useRealTimers();
    }
  });
});
