import { mkdir, writeFile } from "node:fs/promises";
import { release } from "node:os";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "playwright/test";

const evidence = path.resolve(
  process.env.WEB_EVIDENCE_DIR ?? "../../.local/web-evidence/latest",
  "profile",
);
test.beforeAll(async ({ browser }) => {
  await mkdir(evidence, { recursive: true });
  await writeFile(
    path.join(path.dirname(evidence), "runtime.json"),
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        osRelease: release(),
        playwright: "1.63.0",
        chromium: browser.version(),
      },
      null,
      2,
    ),
  );
});
async function login(page: Page) {
  await page.goto("/login?return=%2Fprofile");
  await page.getByLabel("Email").fill("candidate@example.test");
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ thí sinh" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
async function fault(page: Page, value: string) {
  const menu = page.locator("summary").filter({ hasText: "Kịch bản mẫu" });
  await menu.click();
  await page.getByLabel("Lỗi lưu tiếp theo").selectOption(value);
  await menu.click();
}
async function saved(page: Page) {
  await expect(page.getByText("Đã lưu hồ sơ", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Tên hiển thị", exact: true })).toBeEnabled();
}
async function capture(page: Page, name: string) {
  await mkdir(evidence, { recursive: true });
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const state = await page.evaluate(() => {
    const wrapper = document.querySelector("main > div")!;
    const content = wrapper.getBoundingClientRect();
    const padding = getComputedStyle(wrapper);
    const dialog = document.querySelector('[role="dialog"]');
    const bounds = dialog?.getBoundingClientRect(),
      backdrop = dialog?.parentElement?.getBoundingClientRect();
    return {
      width: document.documentElement.scrollWidth,
      left: content.left + parseFloat(padding.paddingLeft),
      right: content.right - parseFloat(padding.paddingRight),
      measurement: "Main wrapper content box, excluding its CSS padding",
      fontLoaded: document.fonts.check('400 16px "Be Vietnam Pro"', "Hồ sơ thí sinh"),
      dialog:
        bounds && backdrop
          ? {
              left: bounds.left,
              width: bounds.width,
              backdropLeft: backdrop.left,
              backdropWidth: backdrop.width,
              backdropHeight: backdrop.height,
            }
          : null,
    };
  });
  await writeFile(
    path.join(evidence, name + ".json"),
    JSON.stringify(
      { ...state, viewport: page.viewportSize(), url: page.url(), violations: scan.violations },
      null,
      2,
    ),
  );
  await page.screenshot({
    path: path.join(evidence, name + ".png"),
    fullPage: (await page.getByRole("dialog").count()) === 0,
  });
  expect(scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
  expect(state.fontLoaded).toBe(true);
  expect(state.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(state.left).toBeGreaterThanOrEqual(16);
  expect(state.right).toBeLessThanOrEqual(page.viewportSize()!.width - 16);
  if (state.dialog) {
    expect(state.dialog.backdropLeft).toBe(0);
    expect(state.dialog.backdropWidth).toBe(page.viewportSize()!.width);
    expect(state.dialog.backdropHeight).toBe(page.viewportSize()!.height);
    expect(
      Math.abs(state.dialog.left + state.dialog.width / 2 - page.viewportSize()!.width / 2),
    ).toBeLessThanOrEqual(1);
  }
}
test("PORT-05E profile normal/edit/save, confirmed fields and privacy fit four Web/tablet widths", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  for (const width of [768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    await expect(page.getByRole("button", { name: "Lưu thay đổi", exact: true })).toBeDisabled();
    await expect(page.getByRole("complementary", { name: "Thông tin đã xác nhận" })).toContainText(
      "candidate@example.test",
    );
    await capture(page, "profile-normal-" + width);
    await page
      .getByRole("textbox", { name: "Tên hiển thị", exact: true })
      .fill("Lan Nguyễn · ôn thi " + width);
    const opt = page.getByRole("checkbox", { name: /^Tham gia bảng xếp hạng/ });
    await opt.setChecked(!(await opt.isChecked()));
    await capture(page, "profile-edit-" + width);
    await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
    await saved(page);
    await expect(page.getByRole("complementary", { name: "Thông tin đã xác nhận" })).toContainText(
      "Lan Nguyễn · ôn thi " + width,
    );
    await capture(page, "profile-saved-" + width);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await capture(page, "profile-reduced-motion-1440");
  expect(errors).toEqual([]);
});
test("PORT-05E conflict compares both snapshots and requires a choice before another save", async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole("textbox", { name: "Tên hiển thị", exact: true })
    .fill("Lan Nguyễn · bản đang sửa");
  await page.getByRole("checkbox", { name: /^Tham gia bảng xếp hạng/ }).check();
  await fault(page, "conflict-save");
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Hồ sơ đã thay đổi ở nơi khác" });
  await expect(dialog).toContainText("Lan Nguyễn · bản máy chủ");
  await expect(dialog).toContainText("Lan Nguyễn · bản đang sửa");
  await expect(dialog.getByRole("button", { name: "Giữ bản của tôi" })).toBeEnabled();
  for (const width of [768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    await capture(page, "profile-conflict-" + width);
  }
  await dialog.getByRole("button", { name: "Giữ bản của tôi" }).click();
  await expect(page.getByRole("textbox", { name: "Tên hiển thị", exact: true })).toHaveValue(
    "Lan Nguyễn · bản đang sửa",
  );
  await expect(page.getByText("Đã lưu hồ sơ", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await saved(page);
  await fault(page, "conflict-save");
  await page.getByRole("textbox", { name: "Tên hiển thị", exact: true }).fill("Bỏ bản này");
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await dialog.getByRole("button", { name: "Dùng bản máy chủ" }).click();
  await expect(page.getByRole("textbox", { name: "Tên hiển thị", exact: true })).toHaveValue(
    "Lan Nguyễn · bản máy chủ",
  );
});
test("PORT-05E lost ACK retains an immutable request, warns on leave and honors rate limit", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 1100 });
  await login(page);
  await page
    .getByRole("textbox", { name: "Tên hiển thị", exact: true })
    .fill("Lan Nguyễn · sau retry");
  await fault(page, "lose-ack");
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByText("Chưa nhận được xác nhận", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Tên hiển thị", exact: true })).toBeDisabled();
  await capture(page, "profile-unknown-1024");
  await page.getByRole("link", { name: "Xem lịch sử thi →", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Rời hồ sơ khi còn thay đổi?" })).toBeVisible();
  await capture(page, "profile-leave-1024");
  await page.getByRole("button", { name: "Ở lại", exact: true }).click();
  await page.getByRole("button", { name: "Thử lại cùng yêu cầu", exact: true }).click();
  await saved(page);
  await expect(page.getByRole("textbox", { name: "Tên hiển thị", exact: true })).toHaveValue(
    "Lan Nguyễn · sau retry",
  );
  await fault(page, "save-429");
  await page
    .getByRole("textbox", { name: "Tên hiển thị", exact: true })
    .fill("Lan Nguyễn · chờ lưu");
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Thử lại cùng yêu cầu", exact: true }),
  ).toBeDisabled();
  await capture(page, "profile-rate-wait-1024");
  await page.getByRole("button", { name: "Thử lại cùng yêu cầu", exact: true }).click();
  await saved(page);
});
test("PORT-05E pending/reset/logout/reauth dialogs remain accessible and truthful", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1100 });
  await login(page);
  await page
    .getByRole("textbox", { name: "Tên hiển thị", exact: true })
    .fill("Lan Nguyễn · chờ phản hồi");
  await fault(page, "delay-ack");
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByText("Đang lưu hồ sơ…", { exact: true })).toBeVisible();
  await capture(page, "profile-pending-1280");
  await saved(page);
  await page.setViewportSize({ width: 1024, height: 1100 });
  await page.getByRole("textbox", { name: "Tên hiển thị", exact: true }).fill("Bản sẽ bỏ");
  const reset = page.getByRole("button", { name: "Hủy thay đổi", exact: true });
  await reset.click();
  await capture(page, "profile-reset-1024");
  await page.keyboard.press("Escape");
  await expect(reset).toBeFocused();
  await reset.click();
  await page.getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Tên hiển thị", exact: true })).toHaveValue(
    "Lan Nguyễn · chờ phản hồi",
  );
  await page.getByRole("textbox", { name: "Tên hiển thị", exact: true }).fill("  ");
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByText("Tên hiển thị từ 1 đến 80 ký tự.", { exact: true })).toBeVisible();
  await capture(page, "profile-validation-1024");
  await page.setViewportSize({ width: 768, height: 1100 });
  await page.getByRole("button", { name: "Đăng xuất tài khoản", exact: true }).click();
  await capture(page, "profile-logout-768");
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const channel = new BroadcastChannel("exam-platform-session");
    channel.postMessage({ type: "reauth" });
    channel.close();
  });
  await expect(page.getByText("Cần đăng nhập lại", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Tên hiển thị", exact: true })).toHaveCount(0);
  await capture(page, "profile-reauth-768");
});
