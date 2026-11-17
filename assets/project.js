"use strict";
(function () {
const { sb, $, esc, t, money, num, qs, toast, projectGroup, statusBadge, imgOrPh, photoOf, auth } = window.App;
let p = null, mine = false;

function render() {
  const el = $("#detail");
  if (!p) { el.innerHTML = `<div class="panel"><h1 class="h-md">${esc(t("pd.nf", "没有找到这个项目"))}</h1><p class="muted" style="margin-top:8px">${esc(t("pd.nf2", "它可能已经下线，或者链接不完整。"))}</p><p style="margin-top:16px"><a class="btn" href="projects.html">${esc(t("pd.back", "← 全部项目"))}</a></p></div>`; return; }
  document.title = `${p.title}${p.city ? " · " + p.city : ""} · iHome Capital`;
  const sold = projectGroup(p) === "sold";
  const photos = [photoOf(p)].concat(p.gallery || []).filter((x, i, a) => x && a.indexOf(x) === i);
  const facts = [
    [t("pd.beds", "卧室 / 卫浴"), `${p.beds ? num(p.beds) : "—"} / ${p.baths ? num(p.baths) : "—"}`],
    [t("pd.sqft", "建筑面积"), p.living_sqft ? `${num(p.living_sqft)} sqft` : "—"],
    [t("pd.lot", "地块面积"), p.lot_sqft ? `${num(p.lot_sqft)} sqft` : "—"],
    [t("pd.year", "建造年份"), p.year_built || "—"]
  ];
  if (p.type === "lending") facts.unshift([t("pd.loan", "借款金额"), money(p.loan_amount)], [t("pd.term", "期限"), p.loan_term_months ? `${p.loan_term_months} ${t("u.months", "个月")}` : "—"]);
  else {
    if (p.buy_price) facts.unshift([t("card.buy", "买入"), money(p.buy_price)]);
    if (sold && p.sell_price) facts.splice(1, 0, [t("card.sell", "卖出"), money(p.sell_price)]);
    if (sold && p.days_held) facts.splice(2, 0, [t("pd.days", "持有天数"), `${p.days_held} ${t("u.days", "天")}`]);
  }
  el.innerHTML = `
    <div class="gallery">
      <div class="main">${imgOrPh(photos[0], p.title)}</div>
      ${photos.slice(1, 3).map((s) => `<div class="thumb">${imgOrPh(s, p.title)}</div>`).join("")}
    </div>
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;align-items:flex-start;margin-top:28px">
      <div>
        <div class="card-meta">${esc([p.city, p.state || "CA", p.zip].filter(Boolean).join(", "))} · ${p.type === "lending" ? esc(t("card.loan", "借款项目")) : esc(t("pd.flip", "翻新项目"))}</div>
        <h1 class="h-lg" style="margin:6px 0 10px">${esc(p.title)}</h1>
        ${statusBadge(p.status)}
      </div>
      <div class="cta-row" style="margin:0">
        ${mine ? `<a class="btn btn-primary" href="portal.html?project=${encodeURIComponent(p.id)}">${esc(t("pd.mine", "查看我的持仓与损益表"))}</a>` : `<a class="btn btn-primary" href="index.html#contact">${esc(t("pd.ask", "咨询类似项目"))}</a>`}
        ${p.zillow_url ? `<a class="btn" href="${esc(p.zillow_url)}" target="_blank" rel="noopener">${esc(t("pd.record", "公开成交记录"))} ↗</a>` : ""}
      </div>
    </div>
    <div class="facts">${facts.map(([k, v]) => `<div><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join("")}</div>
    ${p.summary ? `<section class="panel"><h2 class="h-sm" style="margin-bottom:8px">${esc(t("pd.what", "我们做了什么"))}</h2><p style="white-space:pre-line;color:var(--ink-3)">${esc(p.summary)}</p></section>` : ""}
    ${photos.length > 3 ? `<section style="margin-top:24px"><h2 class="h-sm" style="margin-bottom:12px">${esc(t("pd.photos", "更多照片"))}</h2><div class="grid">${photos.slice(3).map((s) => `<div class="card"><div class="card-media">${imgOrPh(s, p.title)}</div></div>`).join("")}</div></section>` : ""}
    <p class="muted small" style="margin-top:28px">${esc(t("pd.note", "所示为历史数据，不代表未来结果。参与项目的投资人登录后可查看完整损益表。"))}</p>`;
}
document.addEventListener("langchange", render);
auth.ready.then(async () => {
  const id = qs("id");
  if (id) {
    const { data, error } = await sb.from("public_projects").select("*").eq("id", id).maybeSingle();
    if (error) toast("加载失败，请刷新重试", true);
    p = data || null;
    if (p && auth.user) { const inv = await sb.from("investments").select("id").eq("project_id", id).eq("investor_id", auth.user.id).limit(1); mine = !!(inv.data && inv.data.length); }
  }
  render();
});
})();
