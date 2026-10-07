import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const require = createRequire(resolve("apps/web/package.json"));
const { chromium } = require("playwright");
const { default: AxeBuilder } = await import(resolve("apps/web/node_modules/@axe-core/playwright/dist/index.mjs"));
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1060 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const base = "http://127.0.0.1:4175";
const out = resolve("docs/web-ui/evidence/secondary-pages-2026-10-07/proposals");
const errors = [], external = [], results = [];
page.on("pageerror", error=>errors.push(error.message));
page.on("request", request=> { if (!request.url().startsWith(base)) external.push(request.url()); });
await page.goto(base + "/?screen=register");
const screens = await page.locator("#screen-select option").evaluateAll(options=>options.map(option=>option.value).filter(value=>value!=="gallery"));
for (const screen of screens.filter(x=>!process.argv[2] || process.argv.slice(2).includes(x))) {
  await page.setViewportSize({ width: 1440, height: 1060 });
  await page.goto(`${base}/?screen=${screen}`);
  await page.locator("h1").waitFor();
  await page.evaluate(()=>document.fonts.ready);
  await page.locator("#artboard").screenshot({ path: `${out}/${screen}-1440.png` });
  const widths = [];
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1060 });
    widths.push({ width, fits: await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth) });
    if(width===390 && ["register","catalog","room","result","editor"].includes(screen)) await page.locator("#artboard").screenshot({ path: `${out}/${screen}-390.png` });
  }
  const axe = await new AxeBuilder({page}).analyze();
  const violations = axe.violations.filter(v=>["serious","critical"].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));
  results.push({ screen, widths, violations });
  console.log(`${screen}: overflow ${widths.filter(w=>!w.fits).length}, axe ${violations.map(v=>v.id).join(",")||"none"}`);
}
await page.setViewportSize({width:1440,height:1060});
await page.goto(base);
await page.locator("h1").waitFor();
await page.evaluate(()=>document.fonts.ready);
await page.locator(".gallery-card img").evaluateAll(images=>images.forEach(image=>image.loading="eager"));
await page.waitForFunction(()=>[...document.images].every(image=>image.complete && image.naturalWidth>0));
await page.screenshot({path:`${out}/gallery-overview.png`,fullPage:true});
await writeFile(resolve(out,"../proposal-checks.json"),JSON.stringify({results,errors,external},null,2));
await browser.close();
if (errors.length || results.some(r=>r.widths.some(w=>!w.fits)||r.violations.length)) process.exitCode=1;
