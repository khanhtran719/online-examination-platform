import { expect, it } from "vitest";

import { createDemoServer } from "../server";

it("retains a durable synthetic submit and checks permission before replay after lost ACK", async () => {
  const { api, extras } = createDemoServer({ sleep: async () => undefined });
  await api.login({ email: "candidate@example.test", password: "fixture-password-ok" });
  const attempt = (
    await api.startAttempt("00000000-0000-4000-8000-000000000102", "start-submit-fault")
  ).data;
  extras.setFault("lose-ack");
  await expect(api.submitAttempt(attempt.id, "one-submit")).rejects.toMatchObject({
    kind: "network",
  });
  expect((await api.getAttemptStatus(attempt.id)).data.status).toBe("SUBMITTED");
  const accepted = await api.submitAttempt(attempt.id, "one-submit");
  expect(await api.submitAttempt(attempt.id, "one-submit")).toEqual(accepted);
  extras.setPermissions("reviewer");
  await expect(api.submitAttempt(attempt.id, "one-submit")).rejects.toMatchObject({ status: 403 });
});
it("denies another candidate access to a cached synthetic submission receipt", async () => {
  const { api, extras } = createDemoServer({ sleep: async () => undefined });
  await api.login({ email: "candidate@example.test", password: "fixture-password-ok" });
  const attempt = (await api.startAttempt("00000000-0000-4000-8000-000000000102", "start-owner"))
    .data;
  await api.submitAttempt(attempt.id, "owner-submit");
  await api.logout();
  await api.register({
    email: "other@example.test",
    displayName: "Other candidate",
    password: "fixture-password-ok",
  });
  const token = extras.mailbox().find((mail) => mail.email === "other@example.test")!.token;
  await api.confirmEmailVerification({ token, password: "fixture-password-ok" });
  await api.login({ email: "other@example.test", password: "fixture-password-ok" });
  await expect(api.submitAttempt(attempt.id, "owner-submit")).rejects.toMatchObject({
    status: 404,
  });
});
