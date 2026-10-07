import { authViews } from "./auth.js";
import { candidateViews } from "./candidate.js";
import { assessmentViews } from "./assessment.js";
import { adminViews } from "./admin.js";
import { helpViews } from "./help.js";
const views = { ...authViews, ...candidateViews, ...assessmentViews, ...adminViews, ...helpViews };
const params = new URLSearchParams(location.search);
const chosen = params.get("screen") ?? "gallery";
const screen = chosen === "gallery" || Object.hasOwn(views, chosen) ? chosen : "gallery";
const select = document.querySelector("#screen-select");
select.innerHTML = `<option value="gallery">Tất cả mẫu điều chỉnh</option>` + [...new Set(Object.values(views).map(v=>v.group))].map(group=>`<optgroup label="${group}">${Object.entries(views).filter(([,v])=>v.group===group).map(([id,v])=>`<option value="${id}">${v.label}</option>`).join("")}</optgroup>`).join("");
select.value = screen;
select.addEventListener("change", () => { location.href = `?screen=${select.value}`; });
const artboard = document.querySelector("#artboard");
if (screen === "gallery") {
  const allIds = ["register", "dashboard", "catalog", "room", "result", "editor", ...Object.keys(views).filter(x=>!["register", "dashboard", "catalog", "room", "result", "editor"].includes(x))];
  const ids = params.get("show") === "highlights" ? allIds.slice(0,6) : allIds;
  artboard.innerHTML = `<main class="gallery"><div class="gallery-head"><div><p class="eyebrow">ĐỀ XUẤT ĐỒNG BỘ GIAO DIỆN</p><h1>Từ cái nhìn đầu tiên<br>đến từng câu trả lời.</h1><p>Navy/mint, chiều sâu từ phiếu thi và bố cục theo từng công việc.</p></div><span class="pill">${ids.length} mẫu màn hình</span></div><div class="gallery-grid">${ids.map(id=>`<article class="gallery-card"><a href="?screen=${id}"><img src="${id}-1440.png" alt="Mẫu điều chỉnh ${views[id].label}" loading="lazy"></a><div class="caption"><h2>${views[id].label}</h2><p>${views[id].desc}</p><a href="?screen=${id}" class="link-button">Mở mẫu ↗</a></div></article>`).join("")}</div></main>`;
} else {
  artboard.innerHTML = views[screen].html();
  document.title = `Mẫu ${views[screen].label} — ExamPlatform`;
}
document.addEventListener("submit", event => event.preventDefault());
document.querySelectorAll(".password button").forEach(button=>button.addEventListener("click",()=>{
  const input = button.parentElement.querySelector("input");
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  button.textContent = show ? "Ẩn" : "Hiện";
}));
