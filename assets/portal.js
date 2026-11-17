"use strict";
/* 投资人门户：我的投资总览、项目损益、出租物业、账户；可打印对账单 */
(function () {
const A = window.App;
const { sb, $, $$, esc, money, pct, num, qs, toast, withBusy, projectGroup, pnlTotals, annualized, SECTION_NAMES, statusBadge, auth, roleName, errZh } = A;
const S = { view: "overview", invs: [], projects: {}, pnl: {}, props: [], units: [], cols: [], exps: [], reno: [], investors: [], viewAs: null, open: null };
const main = $("#main");

/* ---------- data ---------- */
async function load() {
  const [inv, prj] = await Promise.all([
    sb.from("investments").select("*").order("created_at", { ascending: false }),
    sb.from("projects").select("*")
  ]);
  S.invs = inv.data || [];
  S.projects = Object.fromEntries((prj.data || []).map((p) => [p.id, p]));
  if (auth.role === "admin") {
    const pf = await sb.from("profiles").select("id,email,display_name,role").eq("role", "investor").order("created_at");
    S.investors = pf.data || [];
    if (!S.viewAs && S.investors.length) S.viewAs = S.investors[0].id;
  }
  const ids = [...new Set(S.invs.map((i) => i.project_id))];
  if (ids.length) {
    const { data } = await sb.from("pnl_lines").select("*").in("project_id", ids).order("sort");
    S.pnl = {}; (data || []).forEach((l) => { (S.pnl[l.project_id] = S.pnl[l.project_id] || []).push(l); });
  }
  const [rp, un, ex, rn, col] = await Promise.all([
    sb.from("rental_properties").select("*"), sb.from("units").select("*").order("unit_label"),
    sb.from("property_expenses").select("*").order("due_date", { ascending: false }),
    sb.from("rental_reno_lines").select("*"), sb.from("investor_rental_collections").select("*").order("period", { ascending: false })
  ]);
  S.props = rp.data || []; S.units = un.data || []; S.exps = ex.data || []; S.reno = rn.data || []; S.cols = col.data || [];
}
const myInvs = () => auth.role === "admin" ? S.invs.filter((i) => i.investor_id === S.viewAs) : S.invs.filter((i) => i.investor_id === auth.user.id);

/* ---------- math ---------- */
function position(inv) {
  const p = S.projects[inv.project_id] || {};
  const lines = S.pnl[inv.project_id] || [];
  const tt = pnlTotals(lines);
  const share = inv.share_pct != null ? Number(inv.share_pct) : (tt.totalCosts ? Number(inv.amount) / tt.totalCosts * 100 : null);
  const myProfit = share != null && tt.profit != null ? tt.profit * share / 100 : null;
  const done = projectGroup(p) === "sold";
  const outstanding = Math.max(0, Number(inv.amount || 0) + (done && myProfit ? myProfit : 0) - Number(inv.distributed || 0));
  return { p, lines, tt, share, myProfit, done, outstanding, ann: annualized(tt.profit, tt.totalCosts, p.hold_days) };
}
function stageOf(p) {
  if (p.type === "lending") { const s = String(p.loan_status || p.status || ""); return { steps: ["募集", "放款计息", "还款结清"], at: /还款|结清|完成/.test(s) ? 2 : /募集/.test(s) ? 0 : 1 }; }
  const s = String(p.status || "");
  const at = /已售|售出|完成/.test(s) ? 4 : /escrow/i.test(s) ? 3 : /出售|挂牌/.test(s) ? 2 : /装修|进行/.test(s) ? 1 : 0;
  return { steps: ["买入", "装修", "挂牌出售", "Escrow", "结算分配"], at };
}

/* ---------- views ---------- */
function viewOverview() {
  const list = myInvs();
  const pos = list.map((i) => Object.assign({ inv: i }, position(i)));
  const total = list.reduce((s, i) => s + Number(i.amount || 0), 0);
  const back = list.reduce((s, i) => s + Number(i.distributed || 0), 0);
  const active = pos.filter((x) => !x.done);
  const inPlay = active.reduce((s, x) => s + Number(x.inv.amount || 0), 0);
  const realized = pos.filter((x) => x.done && x.myProfit != null).reduce((s, x) => s + x.myProfit, 0);
  const who = auth.role === "admin" ? S.investors.find((x) => x.id === S.viewAs) : auth.profile;
  const picker = auth.role === "admin" ? `<label class="field no-print" style="min-width:260px"><span>以投资人视角查看（管理员）</span><select id="view-as">${S.investors.map((x) => `<option value="${x.id}" ${x.id === S.viewAs ? "selected" : ""}>${esc(x.display_name || x.email)}</option>`).join("")}</select></label>` : "";
  main.innerHTML = `
  <div class="print-only" style="margin-bottom:16px"><b>iHome Capital 投资人对账单</b> · ${esc((who && (who.display_name || who.email)) || "")} · ${A.today()}</div>
  <div class="page-head"><div><h1>我的投资</h1><div class="muted small">${esc((who && (who.display_name || who.email)) || "")}</div></div>
    <div class="toolbar">${picker}<button class="btn no-print" type="button" id="print">打印 / 保存 PDF 对账单</button></div></div>
  ${!list.length ? `<div class="panel"><h2 class="h-sm">还没有绑定的项目</h2><p class="muted" style="margin-top:6px">如果你已经投资但这里看不到，请联系我们：<a href="tel:+16265100292">(626) 510-0292</a>。</p></div>` : `
  <section class="kpis" aria-label="总览">
    <div class="kpi"><div class="l">总投入</div><div class="v">${money(total)}</div><div class="s">${list.length} 个项目</div></div>
    <div class="kpi"><div class="l">已收回（本金 + 利润）</div><div class="v">${money(back)}</div><div class="s">按已分配记录</div></div>
    <div class="kpi"><div class="l">在投本金</div><div class="v">${money(inPlay)}</div><div class="s">${active.length} 个进行中项目</div></div>
    <div class="kpi accent"><div class="l">已完成项目的利润（我的部分）</div><div class="v">${realized ? money(realized) : "—"}</div><div class="s">按项目损益表与份额计算</div></div>
  </section>
  <h2 class="h-sm" style="margin:32px 0 12px">我参与的项目</h2>
  <div class="table-box"><table class="t" style="min-width:720px">
    <thead><tr><th>项目</th><th>类型</th><th>状态</th><th class="r">我的投入</th><th class="r">份额</th><th class="r">已收回</th><th class="r">待收回</th></tr></thead>
    <tbody>${pos.map((x) => `<tr class="click${S.open === x.inv.project_id ? " sel" : ""}" data-pid="${x.inv.project_id}" tabindex="0">
      <td><b>${esc(x.p.title || "项目")}</b><div class="sub">${esc(x.p.city || "")}</div></td>
      <td>${x.p.type === "lending" ? "短期借款" : "合伙翻新"}</td><td>${statusBadge(x.inv.status && x.p.type === "lending" ? x.inv.status : x.p.status)}</td>
      <td class="r">${money(x.inv.amount)}</td><td class="r">${x.share == null ? "—" : pct(x.share)}</td>
      <td class="r">${money(x.inv.distributed)}</td><td class="r">${money(x.outstanding)}</td></tr>`).join("")}</tbody>
  </table></div>
  <div id="pdetail"></div>`}
  <p class="muted small" style="margin-top:24px">数字来自项目损益表，进行中项目的利润为预计值；最终以结算为准。有疑问请直接联系我们。</p>`;
  const va = $("#view-as"); if (va) va.addEventListener("change", (e) => { S.viewAs = e.target.value; S.open = null; viewOverview(); });
  $("#print") && $("#print").addEventListener("click", () => { $$("details", main).forEach((d) => d.open = true); window.print(); });
  $$("tr.click", main).forEach((tr) => { const go = () => { S.open = tr.dataset.pid; renderDetail(); }; tr.addEventListener("click", go); tr.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); }); });
  const want = S.open || qs("project");
  if (want && list.some((i) => i.project_id === want)) { S.open = want; renderDetail(false); }
  else if (pos.length === 1) { S.open = pos[0].inv.project_id; renderDetail(false); }
}

function renderDetail(scroll) {
  const inv = myInvs().find((i) => i.project_id === S.open); if (!inv) return;
  const x = position(inv), p = x.p, st = stageOf(p);
  const sections = ["acquisition", "holding", "renovation", "sale"].map((sec) => {
    const rows = x.lines.filter((l) => l.section === sec && !l.is_revenue);
    if (!rows.length) return "";
    return `<tr class="sec"><td colspan="2">${SECTION_NAMES[sec]}</td></tr>` + rows.map((l) => `<tr><td>${esc(l.item)}${l.note ? ` <span class="muted small">· ${esc(l.note)}</span>` : ""}</td><td class="r">${money(l.amount)}</td></tr>`).join("");
  }).join("");
  const isLoan = p.type === "lending";
  $("#pdetail").innerHTML = `<section class="panel" style="margin-top:24px" aria-labelledby="pd-title">
    <div class="panel-head"><div><h2 class="h-md" id="pd-title">${esc(p.title || "")}</h2><div class="muted small">${esc([p.address, p.city, p.zip].filter(Boolean).join(", "))}${p.zillow_url ? ` · <a href="${esc(p.zillow_url)}" target="_blank" rel="noopener">Zillow ↗</a>` : ""}</div></div>
      <a class="btn btn-sm no-print" href="project.html?id=${encodeURIComponent(p.id)}">公开页面</a></div>
    <ol class="progress" style="grid-template-columns:repeat(${st.steps.length},minmax(0,1fr))" aria-label="项目进度">${st.steps.map((s, i) => `<li class="${i < st.at ? "done" : i === st.at ? "now" : ""}">${s}</li>`).join("")}</ol>
    <div class="cols">
      <div class="c3">
        ${isLoan ? `<table class="pnl"><tr><td>借款金额</td><td class="r">${money(p.loan_amount)}</td></tr><tr><td>年利率</td><td class="r">${p.interest_rate == null ? "待定" : pct(p.interest_rate, 2)}</td></tr><tr><td>期限</td><td class="r">${p.loan_term_months || "—"} 个月</td></tr><tr><td>借款状态</td><td class="r">${esc(p.loan_status || p.status || "")}</td></tr></table>` : `
        <h3 class="h-sm" style="margin-bottom:6px">项目损益</h3>
        <table class="pnl">
          <tr><td>买入成本</td><td class="r">${money(x.tt.sub.acquisition)}</td></tr>
          <tr><td>装修成本</td><td class="r">${money(x.tt.sub.renovation)}</td></tr>
          <tr><td>持有成本</td><td class="r">${money(x.tt.sub.holding)}</td></tr>
          <tr><td>卖方费用</td><td class="r">${money(x.tt.sub.sale)}</td></tr>
          <tr><td><b>总成本</b></td><td class="r"><b>${money(x.tt.totalCosts)}</b></td></tr>
          <tr><td>${x.done ? "成交价" : "预计 / 挂牌售价"}</td><td class="r">${x.tt.revenue ? money(x.tt.revenue) : "—"}</td></tr>
          <tr class="total"><td>${x.done ? "利润" : "预计利润"}</td><td class="r" style="color:var(--accent-ink)">${x.tt.profit == null ? "—（未出售）" : money(x.tt.profit)}</td></tr>
          ${x.tt.margin != null ? `<tr><td class="muted">利润率（利润 ÷ 总成本）</td><td class="r muted">${pct(x.tt.margin)}</td></tr>` : ""}
          ${x.ann != null ? `<tr><td class="muted">年化回报（按 ${p.hold_days} 天）</td><td class="r muted">约 ${pct(x.ann)}</td></tr>` : ""}
        </table>
        ${sections ? `<details style="margin-top:12px"><summary style="cursor:pointer;color:var(--accent-ink)">展开每一行明细（${x.lines.length} 行）</summary><table class="pnl" style="margin-top:8px">${sections}</table></details>` : ""}`}
      </div>
      <div class="c2"><div class="kpi accent" style="padding:22px">
        <h3 class="h-sm" style="margin-bottom:12px">我的部分</h3>
        <ul class="list">
          <li><span>投入</span><span>${money(inv.amount)}</span></li>
          ${!isLoan ? `<li><span>份额</span><span>${x.share == null ? "—" : pct(x.share)}</span></li>
          <li><span>${x.done ? "分得利润" : "预计分得利润"}</span><span>${x.myProfit == null ? "—" : money(x.myProfit)}</span></li>` : `<li><span>利率</span><span>${p.interest_rate == null ? "待定" : pct(p.interest_rate, 2)}</span></li>`}
          <li><span>已收回</span><span>${money(inv.distributed)}</span></li>
          <li><b>待收回</b><b style="color:var(--accent-ink)">${money(x.outstanding)}</b></li>
        </ul>
        ${inv.note ? `<p class="small muted" style="margin-top:10px">备注：${esc(inv.note)}</p>` : ""}
      </div></div>
    </div></section>`;
  $$("tr.click", main).forEach((tr) => tr.style.background = tr.dataset.pid === S.open ? "var(--accent-soft)" : "");
  if (scroll !== false) $("#pdetail").scrollIntoView({ behavior: "smooth", block: "start" });
}

function viewRentals() {
  const UT = { water: "水", electric: "电", gas: "煤气", trash: "垃圾" };
  main.innerHTML = `<div class="page-head"><h1>出租物业</h1></div>` + (S.props.length ? S.props.map((p) => {
    const units = S.units.filter((u) => u.property_id === p.id);
    const reno = S.reno.filter((l) => l.property_id === p.id).reduce((s, l) => s + Number(l.amount || 0), 0);
    const base = Number(p.purchase_price != null ? p.purchase_price : (p.total_investment || 0));
    const cols = S.cols.filter((c) => c.property_id === p.id).slice(0, 12);
    const exps = S.exps.filter((e) => e.property_id === p.id).slice(0, 10);
    return `<section class="panel"><div class="panel-head"><h2 class="h-md">${esc(p.label)}</h2><span class="badge">${p.type === "multi_family" ? "多户" : "独立屋"} · ${esc(p.city || "")}</span></div>
      <div class="kpis"><div class="kpi"><div class="l">买入价</div><div class="v">${money(base)}</div></div><div class="kpi"><div class="l">翻新维修合计</div><div class="v">${money(reno)}</div></div>
      <div class="kpi"><div class="l">总投资额</div><div class="v">${money(base + reno)}</div></div><div class="kpi"><div class="l">户数（在租）</div><div class="v">${units.length}（${units.filter((u) => u.status === "occupied").length}）</div></div></div>
      <div class="cols" style="margin-top:20px">
        <div class="c3"><h3 class="h-sm" style="margin-bottom:8px">每一户</h3><div class="table-box"><table class="t"><thead><tr><th>户</th><th>状态</th><th class="r">市场租金</th><th>水电由谁付</th></tr></thead><tbody>
          ${units.map((u) => `<tr><td>${esc(u.unit_label)}</td><td>${u.status === "occupied" ? '<span class="badge ok">在租</span>' : '<span class="badge">空置</span>'}</td><td class="r">${money(u.market_rent)}</td><td class="small muted">${["water", "electric", "gas", "trash"].map((k) => `${UT[k]}:${u["util_" + k] === "landlord" ? "房东" : u["util_" + k] === "tenant" ? "租客" : "—"}`).join(" ")}</td></tr>`).join("") || `<tr><td colspan="4" class="empty">暂无</td></tr>`}
        </tbody></table></div></div>
        <div class="c2"><h3 class="h-sm" style="margin-bottom:8px">收租汇总（按月）</h3><ul class="list">${cols.map((c) => `<li><span>${esc(c.period)}</span><span>${money(c.amount_paid)} / ${money(c.amount_due)}</span></li>`).join("") || `<li class="empty">暂无记录</li>`}</ul>
          <h3 class="h-sm" style="margin:16px 0 8px">费用</h3><ul class="list">${exps.map((e) => `<li><span>${esc(e.description || e.category)} · ${esc(e.due_date || "")}</span><span>${money(e.amount)} ${e.paid_date ? "" : '<span class="badge warn">未付</span>'}</span></li>`).join("") || `<li class="empty">暂无记录</li>`}</ul></div>
      </div></section>`;
  }).join("") : `<div class="panel"><p class="muted">你目前没有参与的出租物业。</p></div>`);
}

function viewAccount() {
  const pr = auth.profile || {};
  main.innerHTML = `<div class="page-head"><h1>账户</h1></div>
  <section class="panel" style="max-width:560px"><form class="form" id="acct-form">
    <label class="field"><span>邮箱</span><input value="${esc(auth.user.email)}" disabled></label>
    <label class="field"><span>姓名</span><input name="display_name" value="${esc(pr.display_name || "")}"></label>
    <p class="small muted">身份：${esc(roleName(auth.role))}</p>
    <button class="btn btn-primary" type="submit">保存姓名</button><p class="form-msg" id="acct-msg"></p></form></section>
  <section class="panel" style="max-width:560px"><h2 class="h-sm" style="margin-bottom:12px">修改密码</h2><form class="form" id="pw-form">
    <label class="field"><span>新密码（至少 8 位）</span><input name="pw" type="password" autocomplete="new-password" minlength="8"></label>
    <label class="field"><span>再输入一次</span><input name="pw2" type="password" autocomplete="new-password"></label>
    <button class="btn" type="submit">更新密码</button><p class="form-msg" id="pw-msg"></p></form></section>`;
  $("#acct-form").addEventListener("submit", async (e) => { e.preventDefault(); const m = $("#acct-msg"); const name = new FormData(e.target).get("display_name").trim();
    const { error } = await sb.from("profiles").update({ display_name: name }).eq("id", auth.user.id);
    m.textContent = error ? errZh(error) : "已保存"; m.className = "form-msg " + (error ? "err" : "ok"); if (!error && auth.profile) auth.profile.display_name = name; });
  $("#pw-form").addEventListener("submit", async (e) => { e.preventDefault(); const f = new FormData(e.target), m = $("#pw-msg");
    if (String(f.get("pw")).length < 8) { m.textContent = "密码至少需要 8 位。"; m.className = "form-msg err"; return; }
    if (f.get("pw") !== f.get("pw2")) { m.textContent = "两次输入的密码不一致。"; m.className = "form-msg err"; return; }
    await withBusy(e.target.querySelector("button"), "更新中…", async () => { const { error } = await sb.auth.updateUser({ password: f.get("pw") });
      m.textContent = error ? errZh(error) : "密码已更新"; m.className = "form-msg " + (error ? "err" : "ok"); if (!error) e.target.reset(); }); });
}

function show(view) {
  S.view = view;
  $$("#side-nav button").forEach((b) => b.classList.toggle("on", b.dataset.view === view));
  ({ overview: viewOverview, rentals: viewRentals, account: viewAccount })[view]();
  window.scrollTo(0, 0);
}
$("#side-nav").addEventListener("click", (e) => { const b = e.target.closest("[data-view]"); if (b) show(b.dataset.view); });

(async () => {
  if (!(await A.requireRole(["investor", "admin"], { reason: "投资人请登录后查看自己的项目。" }))) return;
  $("#who").textContent = ((auth.profile && auth.profile.display_name) || auth.user.email) + " · " + roleName(auth.role);
  try { await load(); } catch (e) { console.error(e); toast("数据加载失败：" + errZh(e), true); }
  if (!S.props.length) { const b = $('#side-nav [data-view="rentals"]'); if (b) b.classList.add("hidden"); }
  show("overview");
})();
})();
