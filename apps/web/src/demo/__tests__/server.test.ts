import { describe, expect, it } from "vitest";
import { createDemoServer } from "../server";
import { isApiError } from "../../shared/api/errors";

const NOW = Date.parse("2026-10-06T13:00:00.000Z");

function server() {
  return createDemoServer({ now: () => NOW, sleep: async () => undefined });
}

describe("demo server", () => {
  it("accepts duplicate registration without promising delivery or a session", async () => {
    const { api, extras } = server();
    const created = await api.register({
      email: "New.User@example.test",
      displayName: "Người mới",
      password: "fixture-password-ok",
    });
    expect(created.meta.httpStatus).toBe(202);
    expect(created.data).toEqual({ accepted: true });
    await api.register({
      email: "new.user@example.test",
      displayName: "Khác",
      password: "different-password-1",
    });
    expect(extras.mailbox().filter((item) => item.email === "new.user@example.test")).toHaveLength(1);
    await expect(api.getProfile()).rejects.toMatchObject({ status: 401 });
  });

  it("returns the same attempt and save receipt for the same key after a lost acknowledgement", async () => {
    const { api, extras } = server();
    await api.login({ email: "candidate@example.test", password: "fixture-password-ok" });
    const exams = await api.browseExams({ pageSize: 20 });
    const exam = exams.data.items.find((item) => item.title.includes("Networking"));
    expect(exam).toBeTruthy();
    const key = "018f4a3c-8c2e-7c3a-8f2a-111111111111";
    const first = await api.startAttempt(exam?.id ?? "", key);
    const second = await api.startAttempt(exam?.id ?? "", key);
    expect(second.data.id).toBe(first.data.id);
    const questions = await api.getQuestions(first.data.id, { pageSize: 20 });
    expect(JSON.stringify(questions.data.items[0])).not.toContain("correctOption");
    expect(questions.data.items[0]?.prompt).not.toContain("explanation");
    extras.setFault("lose-ack");
    const question = questions.data.items[0];
    const option = question?.options[0];
    const body = {
      answers: [
        {
          questionId: question?.id ?? "",
          selectedOptionIds: [option?.id ?? ""],
          marked: false,
          expectedVersion: 0,
        },
      ],
    };
    await expect(api.saveAnswers(first.data.id, "018f4a3c-8c2e-7c3a-8f2a-222222222222", body)).rejects.toMatchObject({
      kind: "network",
    });
    const replay = await api.saveAnswers(first.data.id, "018f4a3c-8c2e-7c3a-8f2a-222222222222", body);
    expect(replay.data.answers[0]?.version).toBe(1);
    extras.setFault("conflict-save");
    await expect(
      api.saveAnswers(first.data.id, "018f4a3c-8c2e-7c3a-8f2a-333333333333", {
        answers: [
          {
            questionId: question?.id ?? "",
            selectedOptionIds: [question?.options[1]?.id ?? ""],
            marked: true,
            expectedVersion: 1,
          },
        ],
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("blocks reviewer key access and keeps live-shaped profile free of permissions", async () => {
    const { api, extras } = server();
    await api.login({ email: "candidate@example.test", password: "fixture-password-ok" });
    extras.setPermissions("reviewer");
    await expect(api.listBankQuestions({})).rejects.toMatchObject({ status: 403 });
    const profile = await api.getProfile();
    expect("permissions" in profile.data).toBe(false);
    expect(profile.data.leaderboardOptIn).toBe(false);
    const missing = await api.login({ email: "nobody@example.test", password: "fixture-password-ok" }).catch((error: unknown) => error);
    const disabled = await api.login({ email: "disabled@example.test", password: "fixture-password-ok" }).catch((error: unknown) => error);
    expect(isApiError(missing) && isApiError(disabled) && missing.message === disabled.message).toBe(true);
  });
});
