"use strict";
(function () {
const { sb, $, $$, esc, t, toast, projectGroup, projectCard, sortProjects, auth } = window.App;
const PAGE = 12;
let all = [], filter = null, shown = PAGE, q = "";

function render() {
  const groups = { active: [], sold: [], lending: [] };
  all.forEach((p) => { if (p.type === "lending") groups.lending.push(p); else if (projectGroup(p) !== "cancelled") groups[projectGroup(p)].push(p); });
  const defs = [["sold", t("f.sold", "已完成"), groups.sold.length], ["active", t("f.active", "进行中"), groups.active.length], ["lending", t("f.lending", "借款项目"), groups.lending.length]].filter((x) => x[2] > 0);
  if (!filter || !defs.some((d) => d[0] === filter)) filter = (defs[0] || ["sold"])[0];
  $("#filters").innerHTML = defs.map(([k, l, n]) => `<button type="button" class="chip" data-f="${k}" aria-pressed="${filter === k}">${esc(l)}<span class="cnt">${n}</span></button>`).join("");
  const needle = q.trim().toLowerCase();
  const list = sortProjects(groups[filter] || []).filter((p) => !needle || [p.title, p.address, p.city, p.zip].some((v) => String(v || "").toLowerCase().includes(needle)));
  $("#grid").innerHTML = list.slice(0, shown).map(projectCard).join("") || `<p class="empty">${esc(t("proj.none", "没有符合条件的项目。"))}</p>`;
  const left = list.length - shown, more = $("#more");
  more.classList.toggle("hidden", left <= 0);
  more.textContent = `${t("proj.more", "显示更多")}（${left}）`;
}
$("#filters").addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (!b) return; filter = b.dataset.f; shown = PAGE; render(); });
$("#more").addEventListener("click", () => { shown += PAGE; render(); });
$("#q").addEventListener("input", (e) => { q = e.target.value; shown = PAGE; render(); });
document.addEventListener("langchange", render);
auth.ready.then(async () => {
  const { data, error } = await sb.from("public_projects").select("*");
  if (error) { toast("项目加载失败，请刷新重试", true); return; }
  all = data || []; render();
});
})();
