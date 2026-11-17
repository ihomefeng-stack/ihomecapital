"use strict";
(function () {
const { sb, CFG, $, esc, t, money, toast, withBusy, projectGroup, projectCard, median, bigMoney, sortProjects, imgOrPh, photoOf, submitLead, auth } = window.App;
let projects = [], rentals = [], rate = null;

async function load() {
  if (!sb) return;
  const [pr, rn, rt] = await Promise.all([
    sb.from("public_projects").select("*"),
    sb.from("public_rentals").select("*"),
    sb.from("education_rates").select("*").order("rate_date", { ascending: false }).limit(1)
  ]);
  projects = pr.data || []; rentals = rn.data || []; rate = (rt.data && rt.data[0]) || null;
  render();
}

function render() {
  const sold = projects.filter((p) => p.type !== "lending" && projectGroup(p) === "sold");
  const volume = sold.reduce((s, p) => s + Number(p.sell_price || 0), 0);
  const days = median(sold.map((p) => p.days_held));
  const units = rentals.reduce((s, r) => s + Number(r.unit_count || 0), 0);
  const vals = [sold.length || "—", volume ? bigMoney(volume) : "—", days ? `${days} ${t("u.days", "天")}` : "—", units ? `${units} ${t("u.units", "户")}` : "—"];
  document.querySelectorAll("#stats .stat-num").forEach((el, i) => { el.textContent = vals[i]; });
  const od = $("#opt-days"); if (od) od.textContent = days ? `${t("opt.median", "中位")} ${days} ${t("u.days", "天")}` : "—";

  const recent = sortProjects(sold).filter((p) => photoOf(p)).slice(0, 6);
  const fill = recent.length < 6 ? sortProjects(sold).filter((p) => !photoOf(p)).slice(0, 6 - recent.length) : [];
  $("#recent-grid").innerHTML = recent.concat(fill).map(projectCard).join("") || `<p class="empty">${esc(t("empty.projects", "项目数据加载中…"))}</p>`;

  // 首页大图：按顺序试候选照片，第一张能打开的才用（避免失效外链）
  const candidates = [CFG.HERO_PHOTO].concat(recent.map(photoOf)).filter(Boolean);
  (function tryHero(i) {
    if (i >= candidates.length) return;
    const im = new Image();
    im.onload = () => { $("#hero-media").innerHTML = imgOrPh(candidates[i], "iHome Capital"); };
    im.onerror = () => tryHero(i + 1);
    im.src = candidates[i];
  })(0);
  if (CFG.TEAM_PHOTO) { const m = $("#about-media"); m.classList.remove("hidden"); m.innerHTML = imgOrPh(CFG.TEAM_PHOTO, "Team"); }

  const rc = $("#rate-card");
  if (rate) {
    rc.querySelector("h3").textContent = `${t("ins.30y", "30 年期房贷利率")} ${Number(rate.rate_30y).toFixed(2)}%`;
    rc.querySelector("p").textContent = `${t("ins.rate_note", "15 年期")} ${Number(rate.rate_15y).toFixed(2)}% · ${rate.source || ""} · ${rate.rate_date}`;
  }
}

$("#contact-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target, msg = $("#contact-msg"), btn = form.querySelector("button[type=submit]");
  await withBusy(btn, t("f.sending", "提交中…"), async () => {
    const r = await submitLead(form);
    if (!r.ok) { msg.textContent = r.error; msg.className = "form-msg err"; return; }
    form.reset(); msg.textContent = t("f.thanks", "收到了，我们会在一个工作日内联系你。"); msg.className = "form-msg ok";
  });
});

document.addEventListener("langchange", render);
auth.ready.then(load).catch((e) => { console.error(e); toast("数据加载失败，请刷新重试", true); });
})();
