import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

import { chromium, expect, test as base } from "playwright/test";

import { startIdentityHttps } from "../../../../scripts/identity-https-fixture.mjs";

export function requestKey() {
  const bytes = randomBytes(16);
  bytes.writeUIntBE(Date.now(), 0, 6);
  bytes[6] = (bytes[6] & 15) | 112;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function verifiedAccount(harness, context) {
  const account = {
    email: `catalog-${randomUUID()}@example.test`,
    password: "local final owner password",
  };
  const registration = await harness.request(context, "POST", "/v1/auth/register", {
    email: account.email,
    displayName: "Catalog HTTPS candidate",
    password: "local initial registration password",
  });
  expect(registration.status).toBe(202);
  const link = await harness.mailLink(account.email);
  const activation = await harness.request(context, "POST", "/v1/auth/email-verification/confirm", {
    token: new URL(link).hash.slice("#token=".length),
    password: account.password,
  });
  expect(activation.status).toBe(200);
  return account;
}

export async function login(page, account) {
  await page.goto("/login?return=%2Fexams");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(account.password);
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/v1/auth/login" && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  const result = await response;
  expect(result.status()).toBe(200);
  await expect(page).toHaveURL(/\/exams$/);
  return (await result.json()).data.userId;
}

async function seed(harness, browser) {
  const context = await browser.newContext();
  try {
    const account = await verifiedAccount(harness, context);
    const auth = await harness.request(context, "POST", "/v1/auth/login", account);
    expect(auth.status).toBe(200);
    const actor = JSON.parse(auth.text).data.userId;
    await harness.fixture.query("SELECT identity.operator_admin($1,$2,$3,$4,true,true)", [
      actor,
      "local-catalog-fixture",
      "Disposable browser seed only",
      randomUUID(),
    ]);
    async function write(method, path, body) {
      // Respect the real actor.write admission interval during dataset provisioning.
      await new Promise((done) => setTimeout(done, 425));
      const r = await harness.request(context, method, path, body, {
        "idempotency-key": requestKey(),
      });
      expect([200, 201]).toContain(r.status);
      return JSON.parse(r.text).data;
    }
    const question = await write("POST", "/v1/admin/questions", {
      type: "SINGLE_CHOICE",
      prompt: "Private bank question sentinel",
      expectedRevision: 0,
      points: 7,
      explanation: "PRIVATE_EXPLANATION_SENTINEL",
      options: [
        { position: 1, text: "A" },
        { position: 2, text: "B" },
      ],
      correctOptionPositions: [1],
    });
    const now = Date.now();
    async function exam(title, overrides = {}, publish = true) {
      const body = {
        title,
        category: "IT_CERTIFICATION",
        durationSeconds: 1800,
        openAt: new Date(now - 3600_000).toISOString(),
        closeAt: new Date(now + 3600_000).toISOString(),
        displayTimezone: "Asia/Ho_Chi_Minh",
        attemptLimit: 1,
        explanationPolicy: "NEVER",
        leaderboardEnabled: false,
        sections: [
          {
            title: "Kiến thức nền",
            position: 1,
            questions: [{ bankQuestionId: question.resourceId, position: 1, points: 7 }],
          },
        ],
        expectedRevision: 0,
        ...overrides,
      };
      const receipt = await write("POST", "/v1/admin/exams", body);
      const value = { id: receipt.resourceId, title, body, revision: receipt.revision };
      if (publish)
        value.revision = (
          await write("POST", `/v1/admin/exams/${value.id}/publish`, {
            expectedRevision: value.revision,
          })
        ).revision;
      return value;
    }
    const all = [];
    for (let i = 1; i <= 22; i++)
      all.push(
        await exam(`Đề HTTPS ${String(i).padStart(2, "0")}`, i <= 3 ? { category: "TOEIC" } : {}),
      );
    const future = await exam("Đề chưa mở HTTPS", {
      openAt: new Date(now + 3600_000).toISOString(),
      closeAt: new Date(now + 7200_000).toISOString(),
    });
    const closed = await exam("Đề lịch đóng HTTPS", {
      openAt: new Date(now - 7200_000).toISOString(),
      closeAt: new Date(now + 3600_000).toISOString(),
    });
    const quota = await exam("Đề hết lượt HTTPS");
    const draft = await exam("Bản nháp không public HTTPS", {}, false);
    const archived = await exam("Đề lưu trữ không public HTTPS", {}, false);
    await write("DELETE", `/v1/admin/exams/${archived.id}`, {
      expectedRevision: archived.revision,
    });
    return {
      all,
      future,
      closed,
      quota,
      draft,
      archived,
      write,
      create: exam,
      close: () => context.close(),
      published: 25,
    };
  } catch (error) {
    await context.close();
    throw error;
  }
}

export const test = base.extend({
  harness: [
    async ({}, provide) => {
      const harness = await startIdentityHttps();
      try {
        await provide(harness);
      } finally {
        await mkdir("../../.local/web-evidence/web-03", { recursive: true });
        await writeFile(
          "../../.local/web-evidence/web-03/boundaries.json",
          JSON.stringify(
            {
              requests: harness.requests,
              httpLogs: harness.logs,
              buildProvenance: harness.buildProvenance,
            },
            null,
            2,
          ),
        );
        await harness.close();
      }
    },
    { scope: "worker", timeout: 60_000 },
  ],
  browser: [
    async ({ harness }, provide) => {
      const browser = await chromium.launch({
        args: [`--ignore-certificate-errors-spki-list=${harness.spki}`],
      });
      try {
        await provide(browser);
      } finally {
        await browser.close();
      }
    },
    { scope: "worker" },
  ],
  catalog: [
    async ({ harness, browser }, provide) => {
      const catalog = await seed(harness, browser);
      try {
        await provide(catalog);
      } finally {
        await catalog.close();
      }
    },
    { scope: "worker", timeout: 60_000 },
  ],
  context: async ({ browser, harness }, provide) => {
    const context = await browser.newContext({
      baseURL: harness.origin,
      viewport: { width: 1280, height: 960 },
      ignoreHTTPSErrors: false,
    });
    try {
      await provide(context);
    } finally {
      await context.close();
    }
  },
  candidate: async ({ harness, context, page, catalog: _catalog }, provide) => {
    const account = await verifiedAccount(harness, context);
    const id = await login(page, account);
    await expect(page.locator("main li")).toHaveCount(20);
    await provide({ ...account, id });
  },
});
export { expect } from "playwright/test";
