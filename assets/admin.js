"use strict";
/* 管理后台：看板 / 潜在客户 / 翻新项目（表格 + 右侧编辑面板）/ 出租 / 投资人 / 房源 / 代理审核 / 账号 / 安全 */
(function () {
const A = window.App;
const { sb, $, $$, esc, money, pct, num, toast, withBusy, openModal, closeModal, projectGroup, pnlTotals, annualized, SECTION_NAMES, statusBadge, auth, roleName, ROLE_NAMES, errZh, today } = A;
const main = $("#main");
const S = { view: "dash", projects: [], profiles: [], investments: [], listings: [], submissions: [], leads: [], rates: null,
  rentRoll: [], rentalTenants: [], rentalPayments: [], rentalProps: [], rentalUnits: [], rentalExpenses: [], rentalReno: [],
  projFilter: "active", projQ: "", leadFilter: "open" };
window.AdminCtx = { state: S, refresh: async () => { await load(); show(S.view, true); } };
let dirty = false;
document.addEventListener("input", (e) => { if (e.target.closest && e.target.closest("#drawer form, .legacy form")) dirty = true; });
document.addEventListener("submit", (e) => { if (e.target.closest && e.target.closest(".legacy")) dirty = false; }, true);
window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
window.beforeLogout = () => !dirty || confirm("有没保存的修改，确定退出？");
const n0 = (v) => (v === "" || v == null ? null : Number(v));
const LEAD_KIND = { invest: "合伙翻新", lend: "短期借款", sell: "卖房", agent: "合作代理", other: "其他" };
const LEAD_ST = { new: ["新线索", "accent"], contacted: ["已联系", "info"], qualified: ["有意向", "ok"], closed: ["已结束", ""], spam: ["垃圾信息", "bad"] };
const profName = (id) => { const p = S.profiles.find((x) => x.id === id); return p ? (p.display_name || p.email) : "—"; };

/* ---------------- data ---------------- */
async function load() {
  const q = await Promise.all([
    sb.from("projects").select("*").order("created_at", { ascending: false }),
    sb.from("profiles").select("*").order("created_at"),
    sb.from("investments").select("*"),
    sb.from("listings").select("*").order("created_at", { ascending: false }),
    sb.from("agent_submissions").select("*").order("created_at", { ascending: false }),
    sb.from("leads").select("*").order("created_at", { ascending: false }).limit(500),
    sb.from("education_rates").select("*").order("rate_date", { ascending: false }).limit(1),
    sb.from("rent_roll_current").select("*"),
    sb.from("tenants").select("*").order("created_at"),
    sb.from("rent_payments").select("*").order("period", { ascending: false }).limit(200),
    sb.from("rental_properties").select("*").order("created_at"),
    sb.from("units").select("*").order("unit_label"),
    sb.from("property_expenses").select("*").order("due_date", { ascending: false }),
    sb.from("rental_reno_lines").select("*").order("spent_date")
  ]);
  const err = q.find((r) => r.error); if (err) console.warn(err.error);
  [S.projects, S.profiles, S.investments, S.listings, S.submissions, S.leads] = q.slice(0, 6).map((r) => r.data || []);
  S.rates = (q[6].data && q[6].data[0]) || null;
  [S.rentRoll, S.rentalTenants, S.rentalPayments, S.rentalProps, S.rentalUnits, S.rentalExpenses, S.rentalReno] = q.slice(7).map((r) => r.data || []);
  counts();
}
function counts() {
  const set = (id, n) => { const el = $(id); if (!el) return; el.textContent = n; el.classList.toggle("hidden", !n); };
  set("#c-leads", S.leads.filter((l) => l.status === "new").length);
  set("#c-review", S.submissions.filter((s) => s.status === "pending").length);
  set("#c-accounts", S.profiles.filter((p) => p.role === "visitor").length);
}

/* ---------------- drawer ---------------- */
function drawer(html, onclose) {
  let d = $("#drawer");
  if (!d) { d = document.createElement("div"); d.id = "drawer"; d.className = "drawer hidden"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); document.body.appendChild(d); }
  d.innerHTML = `<div class="drawer-card"><button class="modal-close" type="button" id="drawer-x" aria-label="关闭">×</button>${html}</div>`;
  d.dataset.onclose = "";
  $("#drawer-x").addEventListener("click", closeDrawer);
  openModal("drawer"); dirty = false;
  return d;
}
function closeDrawer(force) {
  if (dirty && force !== true && !confirm("有没保存的修改，确定关闭？")) return;
  dirty = false; closeModal("drawer");
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#drawer") && !$("#drawer").classList.contains("hidden")) { e.stopImmediatePropagation(); closeDrawer(); } }, true);
document.addEventListener("click", (e) => { if (e.target.id === "drawer") { e.stopImmediatePropagation(); closeDrawer(); } }, true);

/* ---------------- 今日看板 ---------------- */
function viewDash() {
  const unpaid = S.rentRoll.filter((r) => r.pay_status !== "paid");
  const due = unpaid.reduce((s, r) => s + Math.max(0, Number(r.rent_amount || 0) - Number(r.amount_paid || 0)), 0);
  const active = S.projects.filter((p) => projectGroup(p) === "active");
  const byStatus = {}; active.forEach((p) => { byStatus[p.status] = (byStatus[p.status] || 0) + 1; });
  const newLeads = S.leads.filter((l) => l.status === "new");
  const pend = S.submissions.filter((s) => s.status === "pending");
  const visitors = S.profiles.filter((p) => p.role === "visitor");
  const in30 = (d) => d && (new Date(d) - new Date()) / 864e5 <= 30 && (new Date(d) - new Date()) / 864e5 >= -60;
  const upcoming = [];
  S.rentalExpenses.filter((e) => !e.paid_date && in30(e.due_date)).forEach((e) => upcoming.push([e.due_date, `${({ property_tax: "地产税", insurance: "保险" })[e.category] || e.description || e.category} · ${(S.rentalProps.find((p) => p.id === e.property_id) || {}).label || ""}`, money(e.amount)]));
  S.rentalProps.filter((p) => in30(p.insurance_due_date)).forEach((p) => upcoming.push([p.insurance_due_date, `保险续保 · ${p.label}`, ""]));
  S.rentalTenants.filter((t) => t.status === "active" && t.lease_end && (new Date(t.lease_end) - new Date()) / 864e5 <= 60 && (new Date(t.lease_end) - new Date()) / 864e5 >= -30).forEach((t) => upcoming.push([t.lease_end, `租约到期 · ${t.name}`, ""]));
  upcoming.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  const d = new Date();
  main.innerHTML = `
  <div class="page-head"><div><h1>今日看板</h1><div class="muted small">${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日</div></div>
    <div class="toolbar"><button class="btn" type="button" data-go="rentals">＋ 登记收款</button><button class="btn btn-primary" type="button" id="new-proj">＋ 新增项目</button></div></div>
  <section class="kpis" aria-label="需要处理">
    <button type="button" class="kpi ${unpaid.length ? "warn" : ""}" data-go="rentals"><div class="l">本月房租未收齐</div><div class="v">${unpaid.length} 户</div><div class="s">${unpaid.length ? `还差 ${money(due)} · 去登记 →` : "全部收齐"}</div></button>
    <button type="button" class="kpi ${newLeads.length ? "warn" : ""}" data-go="leads"><div class="l">新的潜在客户</div><div class="v">${newLeads.length}</div><div class="s">${newLeads.length ? "还没联系 · 去处理 →" : "没有待联系的"}</div></button>
    <button type="button" class="kpi" data-go="projects"><div class="l">进行中项目</div><div class="v">${active.length}</div><div class="s">${Object.entries(byStatus).map(([k, v]) => `${esc(k)} ${v}`).join(" · ") || "—"}</div></button>
    <button type="button" class="kpi ${pend.length || visitors.length ? "warn" : ""}" data-go="${pend.length ? "review" : "accounts"}"><div class="l">待审核房源 / 待开通账号</div><div class="v">${pend.length} / ${visitors.length}</div><div class="s">${pend.length || visitors.length ? "去处理 →" : "没有待处理"}</div></button>
  </section>
  <div class="cols" style="margin-top:20px">
    <section class="panel c3"><div class="panel-head"><h2 class="h-sm">最新潜在客户</h2><button class="btn btn-sm" type="button" data-go="leads">全部 →</button></div>
      ${newLeads.length || S.leads.length ? `<ul class="list">${S.leads.slice(0, 6).map((l) => `<li><span><b>${esc(l.name || "（未留姓名）")}</b> · ${esc(LEAD_KIND[l.kind] || l.kind)}${l.address ? ` · ${esc(l.address)}` : ""}<br><span class="small muted">${esc(String(l.created_at).slice(0, 16).replace("T", " "))}</span></span><span>${leadBadge(l.status)}</span></li>`).join("")}</ul>` : `<p class="empty">还没有人在网站上留言。表单上线后，新的咨询会出现在这里。</p>`}
    </section>
    <section class="panel c2"><h2 class="h-sm" style="margin-bottom:8px">近期到期（30 天内）</h2>
      ${upcoming.length ? `<ul class="list">${upcoming.slice(0, 8).map(([dt, txt, amt]) => `<li><span>${esc(txt)}</span><span class="${new Date(dt) < new Date() ? "badge bad" : "muted"}" style="white-space:nowrap">${esc(dt)}${amt ? " · " + amt : ""}</span></li>`).join("")}</ul>` : `<p class="empty">30 天内没有到期的费用、保险或租约。</p>`}
    </section>
  </div>
  <section style="margin-top:20px"><div class="panel-head"><h2 class="h-sm">进行中项目</h2><button class="btn btn-sm" type="button" data-go="projects">全部项目 →</button></div>${projectTable(sortP(active).slice(0, 8))}</section>`;
  $("#new-proj").addEventListener("click", () => editProject(null));
  bindProjectRows();
}
const leadBadge = (s) => { const x = LEAD_ST[s] || [s, ""]; return `<span class="badge ${x[1]}">${esc(x[0])}</span>`; };

/* ---------------- 潜在客户 ---------------- */
function viewLeads() {
  const f = S.leadFilter;
  const list = S.leads.filter((l) => f === "all" ? true : f === "open" ? ["new", "contacted", "qualified"].includes(l.status) : l.kind === f);
  main.innerHTML = `<div class="page-head"><h1>潜在客户</h1>
    <div class="chips" id="lf">${[["open", "待跟进"], ["sell", "卖房"], ["invest", "投资"], ["agent", "代理"], ["all", "全部"]].map(([k, l]) => `<button class="chip" type="button" data-f="${k}" aria-pressed="${f === k}">${l}</button>`).join("")}</div></div>
  <p class="muted small" style="margin:-12px 0 16px">网站上的「联系我们」和「卖房给我们」表单提交都会到这里。点一行查看详情、改状态、写跟进备注。</p>
  <div class="table-box"><table class="t" style="min-width:760px"><thead><tr><th>时间</th><th>类型</th><th>姓名</th><th>联系方式</th><th>地址 / 留言</th><th>状态</th></tr></thead><tbody>
  ${list.map((l) => `<tr class="click" data-lid="${l.id}" tabindex="0"><td class="small">${esc(String(l.created_at).slice(0, 16).replace("T", " "))}</td><td>${esc(LEAD_KIND[l.kind] || l.kind)}</td><td>${esc(l.name || "—")}</td>
    <td class="small">${esc(l.phone || "")}${l.phone && l.email ? "<br>" : ""}${esc(l.email || "")}</td><td class="small">${esc((l.address || l.message || "").slice(0, 60))}</td><td>${leadBadge(l.status)}</td></tr>`).join("") || `<tr><td colspan="6" class="empty">没有记录。</td></tr>`}
  </tbody></table></div>`;
  $("#lf").addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (b) { S.leadFilter = b.dataset.f; viewLeads(); } });
  $$("tr[data-lid]").forEach((tr) => { const go = () => openLead(tr.dataset.lid); tr.addEventListener("click", go); tr.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); }); });
}
function openLead(id) {
  const l = S.leads.find((x) => x.id === id); if (!l) return;
  const DET = { city: "城市", zip: "邮编", condition: "房况", timeline: "想多快卖", occupancy: "居住情况", role: "身份", asking: "心理价位" };
  const DV = { good: "基本不用修", some: "需要一些维修", major: "需要大修", unknown: "不确定", asap: "越快越好", "1-3m": "1–3 个月", "3m+": "3 个月以上", exploring: "先了解", owner: "自住/房主", tenant: "有租客", vacant: "空置", agent: "经纪人", family: "家属/继承人", other: "其他" };
  const tel = (l.phone || "").replace(/[^\d+]/g, "");
  drawer(`<h2 class="h-md">${esc(l.name || "（未留姓名）")}</h2><p class="muted small">${esc(LEAD_KIND[l.kind] || l.kind)} · ${esc(String(l.created_at).slice(0, 16).replace("T", " "))} · 来自 ${esc(l.source_page || "")}</p>
    <div class="cta-row" style="margin:16px 0">${tel ? `<a class="btn btn-primary" href="tel:${esc(tel)}">打电话</a><a class="btn" href="sms:${esc(tel)}">发短信</a>` : ""}${l.email ? `<a class="btn" href="mailto:${esc(l.email)}">发邮件</a>` : ""}
      ${l.address ? `<a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/${encodeURIComponent(l.address + " " + ((l.details || {}).city || ""))}">地图 ↗</a>` : ""}</div>
    <ul class="list">${[["电话", l.phone], ["邮箱", l.email], ["地址", l.address], ...Object.entries(l.details || {}).map(([k, v]) => [DET[k] || k, DV[v] || v])].filter(([, v]) => v).map(([k, v]) => `<li><span class="muted">${esc(k)}</span><span>${esc(v)}</span></li>`).join("")}</ul>
    ${l.message ? `<div class="panel" style="margin-top:12px;white-space:pre-line">${esc(l.message)}</div>` : ""}
    <form class="form" id="lead-form" style="margin-top:20px">
      <label class="field"><span>状态</span><select name="status">${Object.entries(LEAD_ST).map(([k, [lab]]) => `<option value="${k}" ${l.status === k ? "selected" : ""}>${lab}</option>`).join("")}</select></label>
      <label class="field"><span>跟进备注</span><textarea name="admin_notes" rows="4">${esc(l.admin_notes || "")}</textarea></label>
      <div class="toolbar"><button class="btn btn-primary" type="submit">保存</button><button class="btn btn-danger" type="button" id="lead-del">删除</button></div>
    </form>`);
  $("#lead-form").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = new FormData(e.target);
    await withBusy(e.target.querySelector("[type=submit]"), "保存中…", async () => {
      const { error } = await sb.from("leads").update({ status: f.get("status"), admin_notes: f.get("admin_notes") || null, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) return toast("保存失败：" + errZh(error), true);
      Object.assign(l, { status: f.get("status"), admin_notes: f.get("admin_notes") }); toast("已保存"); closeDrawer(true); counts(); show(S.view, true);
    });
  });
  $("#lead-del").addEventListener("click", async () => {
    if (!confirm("删除这条潜在客户记录？删除后无法恢复。")) return;
    const { error } = await sb.from("leads").delete().eq("id", id);
    if (error) return toast("删除失败：" + errZh(error), true);
    S.leads = S.leads.filter((x) => x.id !== id); closeDrawer(true); counts(); show(S.view, true); toast("已删除");
  });
}

/* ---------------- 翻新项目 ---------------- */
const sortP = (list) => { const r = { active: 0, sold: 1, cancelled: 2 }; return list.slice().sort((a, b) => (r[projectGroup(a)] - r[projectGroup(b)]) || String(b.buy_date || b.created_at || "").localeCompare(String(a.buy_date || a.created_at || ""))); };
function projectTable(list) {
  return `<div class="table-box"><table class="t" style="min-width:820px"><thead><tr><th>项目</th><th>状态</th><th class="r">买入</th><th class="r">卖出 / 目标</th><th>投资人</th><th>照片</th><th>官网</th></tr></thead><tbody>
  ${list.map((p) => { const invs = S.investments.filter((i) => i.project_id === p.id);
    return `<tr class="click" data-pid="${p.id}" tabindex="0"><td><b>${esc(p.title)}</b><div class="sub">${esc(p.city || "")}${p.type === "lending" ? " · 借款" : ""}</div></td><td>${statusBadge(p.status)}</td>
    <td class="r">${p.type === "lending" ? money(p.loan_amount) : money(p.buy_price)}</td><td class="r">${money(p.sell_price || p.expected_sale_price)}</td>
    <td>${invs.length ? `${invs.length} 人 · ${money(invs.reduce((s, i) => s + Number(i.amount || 0), 0))}` : '<span class="muted">—</span>'}</td>
    <td>${p.photo_url || (p.gallery || []).length ? `${1 + (p.gallery || []).filter((g) => g !== p.photo_url).length} 张` : '<span class="badge warn">缺</span>'}</td><td>${pubBtn("projects", p)}</td></tr>`; }).join("") || `<tr><td colspan="7" class="empty">没有项目。</td></tr>`}
  </tbody></table></div>`;
}
/* 一键上架 / 下架（官网显示或隐藏） */
const pubBtn = (table, r) => `<button type="button" class="btn btn-sm ${r.is_public ? "btn-soft" : ""}" data-pub="${table}" data-id="${r.id}" aria-pressed="${!!r.is_public}" title="${r.is_public ? "点一下从官网下架" : "点一下在官网上架"}">${r.is_public ? "已上架 · 下架" : "已下架 · 上架"}</button>`;
async function togglePublic(btn) {
  const table = btn.dataset.pub, id = btn.dataset.id;
  const list = table === "projects" ? S.projects : S.listings;
  const r = list.find((x) => x.id === id); if (!r) return;
  const next = !r.is_public;
  await withBusy(btn, "保存中…", async () => {
    const { error } = await sb.from(table).update({ is_public: next }).eq("id", id);
    if (error) return toast("操作失败：" + errZh(error), true);
    r.is_public = next;
    toast(`「${r.title}」已${next ? "在官网上架" : "从官网下架"}`);
  });
  btn.outerHTML = pubBtn(table, r);
}
document.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest("[data-pub]");
  if (!b) return;
  e.stopPropagation(); e.preventDefault();
  togglePublic(b);
}, true);
function bindProjectRows() { $$("tr[data-pid]", main).forEach((tr) => { const go = () => editProject(tr.dataset.pid); tr.addEventListener("click", go); tr.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); }); }); }
function viewProjects() {
  const groups = { active: [], sold: [], cancelled: [], all: S.projects };
  S.projects.forEach((p) => groups[projectGroup(p)].push(p));
  const qq = S.projQ.trim().toLowerCase();
  const list = sortP(groups[S.projFilter] || []).filter((p) => !qq || [p.title, p.address, p.city, p.status, p.zip].some((v) => String(v || "").toLowerCase().includes(qq)));
  main.innerHTML = `<div class="page-head"><h1>翻新项目</h1><button class="btn btn-primary" type="button" id="new-proj">＋ 新增项目</button></div>
  <div class="toolbar" style="justify-content:space-between;margin-bottom:16px">
    <div class="chips" id="pf">${[["active", "进行中"], ["sold", "已完成"], ["cancelled", "已取消"], ["all", "全部"]].map(([k, l]) => `<button class="chip" type="button" data-f="${k}" aria-pressed="${S.projFilter === k}">${l}<span class="cnt">${groups[k].length}</span></button>`).join("")}</div>
    <input type="search" id="pq" placeholder="搜索地址 / 城市 / 状态" value="${esc(S.projQ)}" aria-label="搜索项目"></div>
  ${projectTable(list)}`;
  $("#new-proj").addEventListener("click", () => editProject(null));
  $("#pf").addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (b) { S.projFilter = b.dataset.f; viewProjects(); } });
  $("#pq").addEventListener("input", (e) => { S.projQ = e.target.value; const pos = e.target.selectionStart; viewProjects(); const i = $("#pq"); i.focus(); i.setSelectionRange(pos, pos); });
  bindProjectRows();
}

const PF = [ // [name, label, type, group]
  ["title", "标题（通常就是地址）", "text", "all"], ["type", "类型", "type", "all"], ["status", "状态", "status", "all"], ["is_public", "在官网公开", "bool", "all"],
  ["address", "地址", "text", "all"], ["city", "城市", "text", "all"], ["zip", "邮编", "text", "all"],
  ["beds", "卧室", "num", "all"], ["baths", "卫生间", "num", "all"], ["living_sqft", "建筑面积 sqft", "num", "all"], ["lot_sqft", "地块面积 sqft", "num", "all"], ["year_built", "建造年份", "num", "all"],
  ["buy_date", "买入日期", "date", "flip"], ["buy_price", "买入价", "num", "flip"], ["sell_price", "卖出价（成交后填）", "num", "flip"], ["hold_days", "持有天数（买入到卖出）", "num", "flip"],
  ["arv", "ARV", "num", "flip"], ["expected_sale_price", "目标售价", "num", "flip"], ["teaser_annualized", "预计年化 %（仅投资人可见）", "num", "flip"],
  ["loan_amount", "借款金额", "num", "lending"], ["loan_term_months", "期限（月）", "num", "lending"], ["loan_status", "借款状态", "text", "lending"], ["interest_rate", "年利率 %（留空=待定）", "num", "lending"],
  ["zillow_url", "Zillow / 成交记录链接", "text", "all"]
];
const STATUSES = ["募集中", "装修中", "出售中", "Escrow 中", "已售出", "计息中", "已还款", "已取消"];
function editProject(id) {
  const isNew = !id;
  const p = isNew ? { type: "flip", status: "装修中", is_public: true, gallery: [] } : Object.assign({}, S.projects.find((x) => x.id === id));
  let lines = [], invs = isNew ? [] : S.investments.filter((i) => i.project_id === id).map((i) => Object.assign({}, i));
  const field = ([n, lab, ty, grp]) => {
    const v = p[n] == null ? "" : p[n];
    let input;
    if (ty === "type") input = `<select name="type"><option value="flip" ${v === "flip" ? "selected" : ""}>合伙翻新</option><option value="lending" ${v === "lending" ? "selected" : ""}>短期借款</option></select>`;
    else if (ty === "status") input = `<input name="status" list="status-list" value="${esc(v)}"><datalist id="status-list">${STATUSES.map((s) => `<option value="${s}">`).join("")}</datalist>`;
    else if (ty === "bool") input = `<select name="${n}"><option value="true" ${v !== false ? "selected" : ""}>公开</option><option value="false" ${v === false ? "selected" : ""}>不公开</option></select>`;
    else input = `<input name="${n}" type="${ty === "num" ? "number" : ty === "date" ? "date" : "text"}" ${ty === "num" ? 'step="any"' : ""} value="${esc(v)}">`;
    return `<label class="field" data-grp="${grp}"><span>${lab}</span>${input}</label>`;
  };
  drawer(`<h2 class="h-md" id="dw-title">${isNew ? "新增项目" : esc(p.title)}</h2>
    <p class="muted small" style="margin:4px 0 14px">${isNew ? "先填基本信息并保存，再上传照片、录入损益表和绑定投资人。" : `${statusBadge(p.status)} · <a href="project.html?id=${p.id}" target="_blank">查看公开页面 ↗</a>`}</p>
    <div class="chips" id="dtabs" role="tablist">${[["basic", "基本信息"], ["pnl", "损益表"], ["photos", "照片"], ["inv", "投资人"]].map(([k, l], i) => `<button class="chip" type="button" data-t="${k}" aria-pressed="${i === 0}" ${isNew && i ? "disabled" : ""}>${l}</button>`).join("")}</div>
    <div id="dt-basic" style="margin-top:18px"><form class="form" id="pform">
      <div class="form-row">${PF.slice(0, 4).map(field).join("")}</div>
      <div class="form-row">${PF.slice(4, 12).map(field).join("")}</div>
      <div class="form-row">${PF.slice(12, 23).map(field).join("")}</div>
      ${field(PF[23])}
      <label class="field"><span>改造说明（显示在公开项目页「我们做了什么」）</span><textarea name="summary" rows="4" placeholder="例如：全屋重新设计开放式厨房，新增一个卫生间，更换屋顶和窗户…">${esc(p.summary || "")}</textarea></label>
      <label class="field"><span>内部备注（不公开）</span><textarea name="notes" rows="2">${esc(p.notes || "")}</textarea></label>
      <div class="toolbar"><button class="btn btn-primary" type="submit">${isNew ? "创建项目" : "保存基本信息"}</button>${isNew ? "" : `<button class="btn btn-danger" type="button" id="p-del">删除项目</button>`}</div>
      <p class="form-msg" id="pmsg"></p></form></div>
    <div id="dt-pnl" class="hidden" style="margin-top:18px"></div>
    <div id="dt-photos" class="hidden" style="margin-top:18px"></div>
    <div id="dt-inv" class="hidden" style="margin-top:18px"></div>`);
  const syncType = () => { const ty = $("#pform [name=type]").value; $$("#pform [data-grp]").forEach((el) => el.classList.toggle("hidden", el.dataset.grp !== "all" && el.dataset.grp !== ty)); };
  $("#pform [name=type]").addEventListener("change", syncType); syncType();
  $("#dtabs").addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (!b || b.disabled) return;
    if (dirty && !confirm("当前标签有没保存的修改，确定切换？")) return; dirty = false;
    $$("#dtabs .chip").forEach((x) => x.setAttribute("aria-pressed", x === b)); ["basic", "pnl", "photos", "inv"].forEach((k) => $("#dt-" + k).classList.toggle("hidden", k !== b.dataset.t));
    if (b.dataset.t === "pnl") renderPnl(); if (b.dataset.t === "photos") renderPhotos(); if (b.dataset.t === "inv") renderInv(); });

  $("#pform").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = new FormData(e.target), msg = $("#pmsg");
    const row = { summary: f.get("summary") || null, notes: f.get("notes") || null, updated_at: new Date().toISOString() };
    PF.forEach(([n, , ty]) => { const v = f.get(n); row[n] = ty === "num" ? n0(v) : ty === "bool" ? v === "true" : (v || null); });
    if (!row.title) { msg.textContent = "请填写标题。"; msg.className = "form-msg err"; return; }
    if (!row.status) row.status = "装修中";
    await withBusy(e.target.querySelector("[type=submit]"), "保存中…", async () => {
      let res;
      if (isNew) res = await sb.from("projects").insert(row).select("*").single(); else res = await sb.from("projects").update(row).eq("id", id).select("*").single();
      if (res.error) { msg.textContent = errZh(res.error); msg.className = "form-msg err"; return; }
      dirty = false; toast(isNew ? "项目已创建，现在可以上传照片和录入损益表" : "已保存");
      await load();
      if (isNew) { editProject(res.data.id); } else { Object.assign(p, res.data); msg.textContent = "已保存。"; msg.className = "form-msg ok"; $("#dw-title").textContent = p.title; }
      if (["projects", "dash"].includes(S.view)) show(S.view, true);
    });
  });
  const del = $("#p-del"); if (del) del.addEventListener("click", async () => {
    if (!confirm(`确认删除「${p.title}」？损益表和投资人绑定也会一起删除，无法恢复。\n\n如果只是不想在官网显示，把「在官网公开」改成「不公开」即可。`)) return;
    await sb.from("pnl_lines").delete().eq("project_id", id); await sb.from("investments").delete().eq("project_id", id);
    const { error } = await sb.from("projects").delete().eq("id", id);
    if (error) return toast("删除失败：" + errZh(error), true);
    toast("已删除"); closeDrawer(true); await load(); show(S.view, true);
  });

  /* ---- 损益表 ---- */
  async function renderPnl() {
    const box = $("#dt-pnl");
    if (!lines.length) { box.innerHTML = `<p class="empty">加载中…</p>`; const { data } = await sb.from("pnl_lines").select("*").eq("project_id", id).order("sort"); lines = (data || []).map((l) => Object.assign({}, l)); }
    const rowHtml = (l) => `<div class="pnl-row"><select class="pe-sec" aria-label="分类">${Object.keys(SECTION_NAMES).map((s) => `<option value="${s}" ${s === l.section ? "selected" : ""}>${SECTION_NAMES[s]}</option>`).join("")}</select>
      <input class="pe-item" placeholder="项目名" value="${esc(l.item || "")}" aria-label="项目名"><input class="pe-amt" type="number" step="0.01" placeholder="金额" value="${l.amount == null ? "" : l.amount}" aria-label="金额">
      <input class="pe-note" placeholder="备注" value="${esc(l.note || "")}" aria-label="备注"><span style="display:flex;gap:6px;align-items:center"><label class="check" style="font-size:13px"><input type="checkbox" class="pe-rev" ${l.is_revenue ? "checked" : ""}>售价</label><button type="button" class="btn btn-sm btn-danger pe-del" aria-label="删除这一行">×</button></span></div>`;
    box.innerHTML = `<form id="pnl-form"><div id="pnl-rows">${(lines.length ? lines : [{ section: "acquisition", item: "买入价 (Purchase Price)" }]).map(rowHtml).join("")}</div>
      <div class="toolbar" style="margin:10px 0 16px"><button class="btn btn-sm" type="button" id="pnl-add">＋ 加一行</button></div>
      <div class="panel" id="pnl-sum" style="background:var(--bg-soft)"></div>
      <div class="toolbar" style="margin-top:14px"><button class="btn btn-primary" type="submit">保存损益表</button></div><p class="form-msg" id="pnl-msg"></p></form>`;
    const collect = () => $$("#pnl-rows .pnl-row").map((r, i) => ({ section: $(".pe-sec", r).value, item: $(".pe-item", r).value.trim(), amount: Number($(".pe-amt", r).value) || 0, note: $(".pe-note", r).value || null, is_revenue: $(".pe-rev", r).checked, sort: i + 1 })).filter((l) => l.item);
    const sum = () => { const t2 = pnlTotals(collect()); const ann = annualized(t2.profit, t2.totalCosts, Number($("#pform [name=hold_days]").value) || p.hold_days);
      $("#pnl-sum").innerHTML = `<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">${[["买入", t2.sub.acquisition], ["持有", t2.sub.holding], ["装修", t2.sub.renovation], ["卖方费用", t2.sub.sale], ["总成本", t2.totalCosts], ["售价", t2.revenue]].map(([k, v]) => `<div><div class="small muted">${k}</div><b class="num">${money(v)}</b></div>`).join("")}
        <div><div class="small muted">利润</div><b class="num" style="color:var(--accent-ink)">${t2.profit == null ? "—" : money(t2.profit)}</b></div><div><div class="small muted">利润率 / 年化</div><b class="num">${t2.margin == null ? "—" : pct(t2.margin)} / ${ann == null ? "—" : pct(ann)}</b></div></div>`; };
    const wire = () => { $$("#pnl-rows .pe-del").forEach((b) => b.onclick = () => { b.closest(".pnl-row").remove(); dirty = true; sum(); }); };
    $("#pnl-add").addEventListener("click", () => { $("#pnl-rows").insertAdjacentHTML("beforeend", rowHtml({ section: "renovation" })); wire(); $("#pnl-rows .pnl-row:last-child .pe-item").focus(); });
    box.addEventListener("input", sum); wire(); sum();
    $("#pnl-form").addEventListener("submit", async (e) => {
      e.preventDefault(); const msg = $("#pnl-msg"), rows = collect();
      await withBusy(e.target.querySelector("[type=submit]"), "保存中…", async () => {
        const old = await sb.from("pnl_lines").select("id").eq("project_id", id);
        const oldIds = (old.data || []).map((r) => r.id);
        if (rows.length) { const { error } = await sb.from("pnl_lines").insert(rows.map((l) => Object.assign({ project_id: id }, l))); if (error) { msg.textContent = "保存失败（原损益表未改动）：" + errZh(error); msg.className = "form-msg err"; return; } }
        if (oldIds.length) { const { error } = await sb.from("pnl_lines").delete().in("id", oldIds); if (error) { msg.textContent = "新损益表已保存，但旧行清理失败，请刷新检查：" + errZh(error); msg.className = "form-msg err"; return; } }
        dirty = false; lines = rows; msg.textContent = `已保存 ${rows.length} 行。`; msg.className = "form-msg ok"; toast("损益表已保存");
      });
    });
  }

  /* ---- 照片 ---- */
  function renderPhotos() {
    const box = $("#dt-photos");
    const all = [p.photo_url].concat(p.gallery || []).filter((x, i, a) => x && a.indexOf(x) === i);
    box.innerHTML = `<p class="muted small">第一张（蓝框）是封面，显示在项目卡片上。建议用自己拍摄或摄影师授权的照片；手机照片会自动压缩到适合网页的大小。</p>
      <div class="photo-strip" style="margin:14px 0">${all.map((u, i) => `<figure class="${i === 0 ? "cover" : ""}"><img src="${esc(u)}" alt=""><figcaption>${i ? `<button class="btn btn-sm" type="button" data-cover="${esc(u)}">设为封面</button>` : '<span class="badge accent">封面</span>'}<button class="btn btn-sm btn-danger" type="button" data-rm="${esc(u)}" aria-label="移除">×</button></figcaption></figure>`).join("") || `<p class="empty">还没有照片。</p>`}</div>
      <label class="btn btn-primary" style="cursor:pointer">＋ 上传照片（可多选）<input type="file" id="ph-file" accept="image/jpeg,image/png,image/webp" multiple class="sr-only"></label>
      <details style="margin-top:14px"><summary class="small" style="cursor:pointer">或粘贴图片链接</summary><div class="toolbar" style="margin-top:8px"><input id="ph-url" placeholder="https://..." style="max-width:420px"><button class="btn btn-sm" type="button" id="ph-add">添加</button></div></details>
      <p class="form-msg" id="ph-msg"></p>`;
    const save = async (list, note) => {
      const clean = list.filter((x, i, a) => x && a.indexOf(x) === i);
      const row = { photo_url: clean[0] || null, gallery: clean.slice(1) };
      const { error } = await sb.from("projects").update(row).eq("id", id);
      if (error) return toast("保存失败：" + errZh(error), true);
      Object.assign(p, row); const sp = S.projects.find((x) => x.id === id); if (sp) Object.assign(sp, row);
      if (note) toast(note); renderPhotos(); if (["projects", "dash"].includes(S.view)) show(S.view, true);
    };
    $$("[data-cover]", box).forEach((b) => b.onclick = () => save([b.dataset.cover].concat(all.filter((u) => u !== b.dataset.cover)), "已设为封面"));
    $$("[data-rm]", box).forEach((b) => b.onclick = async () => { if (!confirm("从这个项目移除这张照片？")) return;
      const u = b.dataset.rm; await save(all.filter((x) => x !== u), "已移除");
      const m = u.match(/\/storage\/v1\/object\/public\/photos\/(.+)$/); if (m) await sb.storage.from("photos").remove([decodeURIComponent(m[1])]); });
    $("#ph-add").onclick = () => { const u = $("#ph-url").value.trim(); if (!/^https?:\/\//.test(u)) return toast("请粘贴以 https:// 开头的链接", true); save(all.concat(u), "已添加"); };
    $("#ph-file").onchange = async (e) => {
      const files = Array.from(e.target.files || []); if (!files.length) return;
      const msg = $("#ph-msg"); const urls = [];
      for (let i = 0; i < files.length; i++) {
        msg.textContent = `上传中 ${i + 1} / ${files.length}…`; msg.className = "form-msg";
        try {
          const blob = await shrink(files[i]);
          const path = `projects/${id}/${Date.now()}-${i}.jpg`;
          const { error } = await sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
          if (error) throw error;
          urls.push(sb.storage.from("photos").getPublicUrl(path).data.publicUrl);
        } catch (err) { msg.textContent = `第 ${i + 1} 张上传失败：${errZh(err)}`; msg.className = "form-msg err"; }
      }
      if (urls.length) await save(all.concat(urls), `已上传 ${urls.length} 张`);
    };
  }

  /* ---- 投资人绑定 ---- */
  function renderInv() {
    const box = $("#dt-inv");
    const investors = S.profiles.filter((x) => x.role === "investor");
    const t2 = pnlTotals(lines);
    box.innerHTML = investors.length ? `<p class="muted small">勾选参与这个项目的投资人，填金额，一次保存。份额留空会按「投资额 ÷ 总成本」自动算。没有勾选的会解除绑定。</p>
      <form id="inv-form">${investors.map((pr) => { const ex = invs.find((i) => i.investor_id === pr.id) || {};
        return `<div class="panel" data-inv="${pr.id}" style="padding:16px;margin-top:10px"><label class="check"><input type="checkbox" class="b-on" ${ex.id ? "checked" : ""}><b>${esc(pr.display_name || pr.email)}</b> <span class="muted small">${esc(pr.email)}</span></label>
          <div class="form-row" style="margin-top:10px"><label class="field"><span>投资金额</span><input class="b-amount" type="number" step="any" value="${ex.amount ?? ""}"></label><label class="field"><span>份额 %（可空）</span><input class="b-share" type="number" step="any" value="${ex.share_pct ?? ""}"></label>
          <label class="field"><span>已分配（本金+利润）</span><input class="b-dist" type="number" step="any" value="${ex.distributed ?? 0}"></label><label class="field"><span>状态</span><input class="b-status" value="${esc(ex.status || "已确认")}"></label></div>
          <label class="field" style="margin-top:8px"><span>备注（投资人能看到）</span><input class="b-note" value="${esc(ex.note || "")}"></label></div>`; }).join("")}
      <div class="toolbar" style="margin-top:14px"><button class="btn btn-primary" type="submit">保存投资人绑定</button></div><p class="form-msg" id="inv-msg"></p></form>`
      : `<p class="empty">还没有「投资人」角色的账号。请先让对方在官网注册，然后到「账号与权限」把他改成投资人。</p>`;
    const form = $("#inv-form"); if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); const msg = $("#inv-msg"); const up = [], del = [];
      $$("[data-inv]", form).forEach((r) => { const ex = invs.find((i) => i.investor_id === r.dataset.inv);
        if ($(".b-on", r).checked) up.push({ investor_id: r.dataset.inv, project_id: id, amount: $(".b-amount", r).value, share_pct: n0($(".b-share", r).value), distributed: Number($(".b-dist", r).value) || 0, status: $(".b-status", r).value || "已确认", note: $(".b-note", r).value.trim() || null });
        else if (ex && ex.id) del.push(ex.id); });
      if (up.some((u) => u.amount === "" || isNaN(Number(u.amount)))) { msg.textContent = "有勾选的投资人还没填金额。"; msg.className = "form-msg err"; return; }
      if (del.length && !confirm(`将解除 ${del.length} 位投资人的绑定，确定？`)) return;
      await withBusy(form.querySelector("[type=submit]"), "保存中…", async () => {
        const errs = [];
        if (up.length) { const { error } = await sb.from("investments").upsert(up.map((u) => Object.assign(u, { amount: Number(u.amount) })), { onConflict: "investor_id,project_id" }); if (error) errs.push(errZh(error)); }
        if (del.length) { const { error } = await sb.from("investments").delete().in("id", del); if (error) errs.push(errZh(error)); }
        if (errs.length) { msg.textContent = "保存失败：" + errs[0]; msg.className = "form-msg err"; return; }
        dirty = false; await load(); invs = S.investments.filter((i) => i.project_id === id).map((i) => Object.assign({}, i));
        msg.textContent = `已保存：${up.length} 人绑定，${del.length} 人解绑。`; msg.className = "form-msg ok"; toast("投资人绑定已保存");
      });
    });
  }
}

/* 压缩照片：最长边 2000px，JPEG 0.85 */
function shrink(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 25 * 1024 * 1024) return reject(new Error("exceeded the maximum allowed size"));
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => { const max = 2000, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob((b) => b ? resolve(b) : reject(new Error("无法处理这张图片")), "image/jpeg", 0.85); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("invalid type")); };
    img.src = url;
  });
}

/* ---------------- 投资人 ---------------- */
function viewInvestors() {
  const inv = S.profiles.filter((p) => p.role === "investor");
  main.innerHTML = `<div class="page-head"><h1>投资人</h1><a class="btn" href="portal.html">以投资人视角查看门户 →</a></div>
  <p class="muted small" style="margin:-12px 0 16px">把投资人绑定到项目：打开「翻新项目」里的项目 → 「投资人」标签。新投资人先在官网注册，再到「账号与权限」改成投资人。</p>
  <div class="table-box"><table class="t" style="min-width:720px"><thead><tr><th>投资人</th><th>参与项目</th><th class="r">总投入</th><th class="r">已分配</th><th class="r">在投（未完成项目）</th></tr></thead><tbody>
  ${inv.map((pr) => { const mine = S.investments.filter((i) => i.investor_id === pr.id);
    const active = mine.filter((i) => projectGroup(S.projects.find((p) => p.id === i.project_id) || {}) !== "sold");
    return `<tr><td><b>${esc(pr.display_name || "（未填姓名）")}</b><div class="sub">${esc(pr.email)}</div></td>
      <td class="small">${mine.map((i) => { const p = S.projects.find((x) => x.id === i.project_id) || {}; return `<a href="#" data-edit="${i.project_id}">${esc(p.title || "项目")}</a> ${money(i.amount)}`; }).join("<br>") || '<span class="muted">—</span>'}</td>
      <td class="r">${money(mine.reduce((s, i) => s + Number(i.amount || 0), 0))}</td><td class="r">${money(mine.reduce((s, i) => s + Number(i.distributed || 0), 0))}</td><td class="r">${money(active.reduce((s, i) => s + Number(i.amount || 0), 0))}</td></tr>`; }).join("") || `<tr><td colspan="5" class="empty">还没有投资人账号。</td></tr>`}
  </tbody></table></div>`;
  $$("[data-edit]", main).forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); editProject(a.dataset.edit); }));
}

/* ---------------- 在售房源 + 利率 ---------------- */
function viewListings() {
  const r = S.rates || {};
  main.innerHTML = `<div class="page-head"><h1>在售房源</h1><button class="btn btn-primary" type="button" id="new-lst">＋ 新增房源</button></div>
  <div class="table-box"><table class="t" style="min-width:700px"><thead><tr><th>房源</th><th class="r">价格</th><th>卧/卫/面积</th><th>状态</th><th>官网</th></tr></thead><tbody>
  ${S.listings.map((l) => `<tr class="click" data-lst="${l.id}" tabindex="0"><td><b>${esc(l.title)}</b><div class="sub">${esc([l.address !== l.title ? l.address : "", l.city].filter(Boolean).join(", "))}</div></td><td class="r">${money(l.price)}</td>
    <td>${num(l.beds)} / ${num(l.baths)} / ${l.sqft ? num(l.sqft) + " sqft" : "—"}</td><td>${esc(l.status || "")}</td><td>${pubBtn("listings", l)}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">暂无房源。</td></tr>`}
  </tbody></table></div>
  <section class="panel" style="margin-top:24px;max-width:760px"><h2 class="h-sm" style="margin-bottom:12px">首页利率快照</h2>
    <form class="form" id="rate-form"><div class="form-row">
      <label class="field"><span>数据日期</span><input name="rate_date" type="date" value="${esc(r.rate_date || "")}"></label>
      <label class="field"><span>30 年期 %</span><input name="rate_30y" type="number" step="0.01" value="${r.rate_30y ?? ""}"></label>
      <label class="field"><span>15 年期 %</span><input name="rate_15y" type="number" step="0.01" value="${r.rate_15y ?? ""}"></label>
      <label class="field"><span>来源</span><input name="source" value="${esc(r.source || "Freddie Mac PMMS")}"></label></div>
      <div class="toolbar"><button class="btn btn-primary" type="submit">保存利率</button><a class="small" href="https://www.freddiemac.com/pmms" target="_blank" rel="noopener">Freddie Mac 每周四更新 ↗</a></div><p class="form-msg" id="rate-msg"></p></form></section>`;
  $("#new-lst").addEventListener("click", () => editListing(null));
  $$("tr[data-lst]").forEach((tr) => tr.addEventListener("click", () => editListing(tr.dataset.lst)));
  $("#rate-form").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = new FormData(e.target), msg = $("#rate-msg");
    const row = { rate_date: f.get("rate_date") || today(), rate_30y: n0(f.get("rate_30y")), rate_15y: n0(f.get("rate_15y")), source: f.get("source") || null };
    const { error } = S.rates && S.rates.id && S.rates.rate_date === row.rate_date ? await sb.from("education_rates").update(row).eq("id", S.rates.id) : await sb.from("education_rates").insert(row);
    msg.textContent = error ? errZh(error) : "已保存，首页已更新。"; msg.className = "form-msg " + (error ? "err" : "ok"); if (!error) await load();
  });
}
function editListing(id) {
  const l = id ? S.listings.find((x) => x.id === id) : { status: "在售", is_public: true };
  const F = [["title", "标题（地址）"], ["address", "地址"], ["city", "城市"], ["price", "价格", "num"], ["beds", "卧室", "num"], ["baths", "卫生间", "num"], ["sqft", "面积 sqft", "num"], ["status", "状态"], ["photo_url", "照片链接"], ["zillow_url", "Zillow 链接"]];
  drawer(`<h2 class="h-md">${id ? "编辑房源" : "新增房源"}</h2><form class="form" id="lst-form" style="margin-top:16px"><div class="form-row">
    ${F.map(([n, lab, ty]) => `<label class="field"><span>${lab}</span><input name="${n}" ${ty ? 'type="number" step="any"' : ""} value="${esc(l[n] ?? "")}"></label>`).join("")}
    <label class="field"><span>公开显示</span><select name="is_public"><option value="true" ${l.is_public !== false ? "selected" : ""}>公开</option><option value="false" ${l.is_public === false ? "selected" : ""}>隐藏</option></select></label></div>
    <div class="toolbar"><button class="btn btn-primary" type="submit">保存</button>${id ? '<button class="btn btn-danger" type="button" id="lst-del">删除</button>' : ""}</div><p class="form-msg" id="lst-msg"></p></form>`);
  $("#lst-form").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = new FormData(e.target), row = {}; F.forEach(([n, , ty]) => { row[n] = ty ? n0(f.get(n)) : (f.get(n) || null); }); row.is_public = f.get("is_public") === "true";
    if (!row.title) { $("#lst-msg").textContent = "请填写标题。"; $("#lst-msg").className = "form-msg err"; return; }
    const { error } = id ? await sb.from("listings").update(row).eq("id", id) : await sb.from("listings").insert(row);
    if (error) { $("#lst-msg").textContent = errZh(error); $("#lst-msg").className = "form-msg err"; return; }
    toast("已保存"); closeDrawer(true); await load(); show("listings", true);
  });
  const d = $("#lst-del"); if (d) d.addEventListener("click", async () => { if (!confirm("确认删除这个房源？")) return; const { error } = await sb.from("listings").delete().eq("id", id); if (error) return toast(errZh(error), true); toast("已删除"); closeDrawer(true); await load(); show("listings", true); });
}

/* ---------------- 代理审核 ---------------- */
function viewReview() {
  const ST = { pending: ["待审核", "warn"], approved: ["已通过", "ok"], rejected: ["已拒绝", "bad"] };
  const list = S.submissions.slice().sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1));
  main.innerHTML = `<div class="page-head"><h1>代理审核</h1></div>` + (list.length ? list.map((s) => `<section class="panel"><div class="panel-head"><div><h2 class="h-sm">${esc(s.title)}</h2>
    <div class="muted small">${esc(s.city || "")} · ${money(s.price)} · ${num(s.beds)} 卧 / ${num(s.baths)} 卫 · ${s.sqft ? num(s.sqft) + " sqft" : ""} · 提交人 ${esc(profName(s.agent_id))} · ${esc(String(s.created_at).slice(0, 10))}</div></div>
    <span class="badge ${(ST[s.status] || [])[1] || ""}">${esc((ST[s.status] || [s.status])[0])}</span></div>
    ${s.description ? `<p style="white-space:pre-line">${esc(s.description)}</p>` : ""}${s.zillow_url ? `<p class="small" style="margin-top:6px"><a href="${esc(s.zillow_url)}" target="_blank" rel="noopener">房源链接 ↗</a></p>` : ""}
    ${s.status === "pending" ? `<div class="form-row" style="margin-top:12px"><label class="field"><span>给代理的备注（可空）</span><input class="rv-note" data-id="${s.id}"></label></div>
    <div class="toolbar" style="margin-top:10px"><button class="btn btn-primary btn-sm" type="button" data-ok="${s.id}">通过并上架</button><button class="btn btn-sm" type="button" data-ok0="${s.id}">通过（不上架）</button><button class="btn btn-danger btn-sm" type="button" data-no="${s.id}">拒绝</button></div>` : (s.admin_note ? `<p class="small muted">备注：${esc(s.admin_note)}</p>` : "")}
  </section>`).join("") : `<div class="panel"><p class="empty">暂无代理提交的房源。</p></div>`);
  const act = async (id, status, publish) => {
    const s = S.submissions.find((x) => x.id === id); const note = ($(`.rv-note[data-id="${id}"]`) || {}).value || null;
    const { error } = await sb.from("agent_submissions").update({ status, admin_note: note }).eq("id", id);
    if (error) return toast("操作失败：" + errZh(error), true);
    if (publish) { const ins = await sb.from("listings").insert({ title: s.title, address: s.address, city: s.city, price: s.price, beds: s.beds, baths: s.baths, sqft: s.sqft, photo_url: s.photo_url, zillow_url: s.zillow_url, status: "在售", is_public: true, created_by: s.agent_id });
      if (ins.error) toast("已通过，但上架失败：" + errZh(ins.error) + "，请到「在售房源」手动添加", true); else toast("已通过并上架"); }
    else toast(status === "approved" ? "已通过" : "已拒绝");
    await load(); show("review", true);
  };
  $$("[data-ok]").forEach((b) => b.onclick = () => act(b.dataset.ok, "approved", true));
  $$("[data-ok0]").forEach((b) => b.onclick = () => act(b.dataset.ok0, "approved", false));
  $$("[data-no]").forEach((b) => b.onclick = () => act(b.dataset.no, "rejected", false));
}

/* ---------------- 账号与权限 ---------------- */
function viewAccounts() {
  const list = S.profiles.slice().sort((a, b) => (a.role === "visitor" ? 0 : 1) - (b.role === "visitor" ? 0 : 1) || String(b.created_at).localeCompare(String(a.created_at)));
  const nv = list.filter((p) => p.role === "visitor").length;
  main.innerHTML = `<div class="page-head"><h1>账号与权限</h1></div>
  ${nv ? `<p class="badge warn" style="margin-bottom:14px">有 ${nv} 个新注册账号还是「访客」，确认身份后改成投资人或合作代理。</p>` : ""}
  <div class="table-box"><table class="t" style="min-width:640px"><thead><tr><th>姓名</th><th>邮箱</th><th>注册日期</th><th>身份</th></tr></thead><tbody>
  ${list.map((p) => `<tr><td>${esc(p.display_name || "（未填）")}</td><td>${esc(p.email)}</td><td>${esc(String(p.created_at || "").slice(0, 10))}</td>
    <td><select data-role="${p.id}" aria-label="身份" ${p.id === auth.user.id ? "disabled title='不能修改自己的身份'" : ""}>${Object.keys(ROLE_NAMES).map((r) => `<option value="${r}" ${p.role === r ? "selected" : ""}>${ROLE_NAMES[r]}</option>`).join("")}</select></td></tr>`).join("")}
  </tbody></table></div>
  <p class="muted small" style="margin-top:12px">投资人只能看到自己参与的项目；合作代理只能提交和查看自己的房源；管理员能看到并修改全部数据。</p>`;
  $$("[data-role]").forEach((sel) => sel.addEventListener("change", async () => {
    const p = S.profiles.find((x) => x.id === sel.dataset.role), role = sel.value;
    if (role === "admin" && !confirm(`确定把 ${p.email} 设为管理员？管理员可以看到和修改全部数据。`)) { sel.value = p.role; return; }
    const { error } = await sb.from("profiles").update({ role }).eq("id", p.id);
    if (error) { toast("修改失败：" + errZh(error), true); sel.value = p.role; return; }
    p.role = role; counts(); toast(`${p.email} 已改为「${ROLE_NAMES[role]}」`);
  }));
}

/* ---------------- 安全设置：两步验证 ---------------- */
async function viewSecurity() {
  main.innerHTML = `<div class="page-head"><h1>安全设置</h1></div><div id="mfa" class="panel" style="max-width:640px"><p class="empty">加载中…</p></div>
  <section class="panel" style="max-width:640px"><h2 class="h-sm" style="margin-bottom:8px">建议</h2><ul class="list small">
    <li><span>在 Supabase 后台开启 Authentication → Leaked password protection（拒绝已泄露的密码）</span></li>
    <li><span>管理员账号只给需要的人；离职或不再合作时，把他的身份改回「访客」</span></li>
    <li><span>定期在 Supabase → Database → Backups 确认有每日备份</span></li></ul></section>`;
  const box = $("#mfa");
  const { data } = await sb.auth.mfa.listFactors();
  const verified = ((data && data.totp) || []).filter((f) => f.status === "verified");
  if (verified.length) {
    box.innerHTML = `<h2 class="h-sm">两步验证 <span class="badge ok">已开启</span></h2><p class="muted" style="margin:8px 0 16px">登录管理员账号时，需要输入手机验证器里的 6 位验证码。没有验证码，即使密码泄露也进不了后台。</p>
      <button class="btn btn-danger btn-sm" type="button" id="mfa-off">关闭两步验证</button>`;
    $("#mfa-off").onclick = async () => { if (!confirm("关闭后，只用密码就能登录管理员账号。确定关闭？")) return;
      const { error } = await sb.auth.mfa.unenroll({ factorId: verified[0].id }); if (error) return toast(errZh(error), true); toast("已关闭两步验证"); viewSecurity(); };
    return;
  }
  box.innerHTML = `<h2 class="h-sm">两步验证 <span class="badge warn">未开启</span></h2>
    <p class="muted" style="margin:8px 0 16px">管理员能看到所有投资人和租客的资料，强烈建议开启。需要手机上装一个验证器 App（Google Authenticator、Microsoft Authenticator 或 1Password 都可以）。</p>
    <button class="btn btn-primary" type="button" id="mfa-on">开始设置</button><div id="mfa-step"></div>`;
  $("#mfa-on").onclick = async () => {
    for (const f of ((data && data.all) || []).filter((x) => x.status !== "verified")) await sb.auth.mfa.unenroll({ factorId: f.id });
    const { data: en, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "iHome 管理员 " + today() });
    if (error) return toast(errZh(error), true);
    $("#mfa-on").classList.add("hidden");
    $("#mfa-step").innerHTML = `<ol class="list" style="margin-top:8px"><li><span>1. 用验证器 App 扫描下面的二维码</span></li></ol>
      <img src="${en.totp.qr_code}" alt="两步验证二维码" width="200" height="200" style="margin:10px 0;border:1px solid var(--line);border-radius:8px">
      <p class="small muted">扫不了？手动输入密钥：<code style="user-select:all">${esc(en.totp.secret)}</code></p>
      <form class="form" id="mfa-verify" style="margin-top:14px;max-width:320px"><label class="field"><span>2. 输入 App 里显示的 6 位数字</span><input name="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label>
      <button class="btn btn-primary" type="submit">验证并开启</button><p class="form-msg" id="mfa-msg"></p></form>`;
    $("#mfa-verify").addEventListener("submit", async (e) => {
      e.preventDefault(); const code = new FormData(e.target).get("code").trim();
      const { error: er } = await sb.auth.mfa.challengeAndVerify({ factorId: en.id, code });
      if (er) { $("#mfa-msg").textContent = errZh(er); $("#mfa-msg").className = "form-msg err"; return; }
      toast("两步验证已开启"); viewSecurity();
    });
  };
}

/* ---------------- 出租物业（旧版逻辑） ---------------- */
function viewRentals() {
  main.innerHTML = `<div class="page-head"><h1>出租物业</h1></div><div class="legacy" id="admin-tab-body"></div>`;
  window.AdminRentals.render($("#admin-tab-body"));
}

/* ---------------- router ---------------- */
const VIEWS = { dash: viewDash, leads: viewLeads, projects: viewProjects, rentals: viewRentals, investors: viewInvestors, listings: viewListings, review: viewReview, accounts: viewAccounts, security: viewSecurity };
function show(view, keepScroll) {
  if (!keepScroll && dirty && !confirm("有没保存的修改，确定离开这个页面？")) return;
  if (!keepScroll) dirty = false;
  S.view = view;
  $$("#side-nav button").forEach((b) => b.classList.toggle("on", b.dataset.view === view));
  const y = window.scrollY;
  VIEWS[view]();
  if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
  if (location.hash !== "#" + view) history.replaceState(null, "", "#" + view);
}
$("#side-nav").addEventListener("click", (e) => { const b = e.target.closest("[data-view]"); if (b) show(b.dataset.view); });
main.addEventListener("click", (e) => { const g = e.target.closest("[data-go]"); if (g) show(g.dataset.go); });

(async () => {
  if (!(await A.requireRole(["admin"], { reason: "管理员请登录。" }))) return;
  $("#who").textContent = ((auth.profile && auth.profile.display_name) || auth.user.email) + " · 管理员";
  try { await load(); } catch (e) { console.error(e); toast("数据加载失败：" + errZh(e), true); }
  const h = location.hash.slice(1);
  show(VIEWS[h] ? h : "dash", true);
  const s = await A.mfaState();
  if (s.next !== "aal2") { const b = $('#side-nav [data-view="security"]'); if (b && !b.querySelector(".count")) b.insertAdjacentHTML("beforeend", ' <span class="count" style="background:var(--warn)">!</span>'); }
})();
})();
