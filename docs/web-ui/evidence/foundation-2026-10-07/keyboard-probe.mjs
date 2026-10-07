import { createRequire } from "node:module";
import { resolve } from "node:path";
const require = createRequire(resolve("apps/web/package.json"));
const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage();
for (const keys of [
  ["ArrowDown", "ArrowDown", "Enter"],
  ["Space", "ArrowDown", "ArrowDown", "Enter"],
  ["t"],
  ["End"],
  ["Alt+ArrowDown", "ArrowDown", "Enter"],
]) {
  await page.goto("http://127.0.0.1:4173/dev/ui");
  const select = page.getByLabel("Danh mục mẫu");
  await select.focus();
  const states = [];
  for (const key of keys) {
    await page.keyboard.press(key);
    states.push({
      key,
      ...(await select.evaluate((node) => ({
        value: node.value,
        index: node.selectedIndex,
        focused: document.activeElement === node,
      }))),
    });
  }
  console.log(JSON.stringify(states));
}
await browser.close();
