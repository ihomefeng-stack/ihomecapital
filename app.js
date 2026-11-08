"use strict";
/* 房屋投资 · Property Investments — frontend app
   Live mode: Supabase (config.js) + RLS-safe queries.
   Demo mode: config placeholders detected -> built-in DEMO dataset + role switcher. */

const CFG = window.APP_CONFIG || {};
const DEMO_MODE = !CFG.SUPABASE_URL || CFG.SUPABASE_URL.indexOf("YOUR_") === 0;
let sb = null;
if (!DEMO_MODE && window.supabase) sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

/* ---------------- DEMO dataset (mirrors supabase/seed.sql; all DEMO) ---------------- */
const DEMO = {
  rates: { rate_date: "2026-10-29", rate_30y: 7.24, rate_15y: 6.60, source: "Freddie Mac PMMS" },
  listings: [
    { id: "b1", title: "21435 Via Pepita", address: "21435 Via Pepita", city: "Yorba Linda", price: 1380000, beds: 3, baths: 2.5, sqft: 2183, status: "在售", zillow_url: "https://www.zillow.com/homes/21435-Via-Pepita-Yorba-Linda,-CA-92886_rb/" },
    { id: "b2", title: "1846 Holly Oak Dr", address: "1846 Holly Oak Dr", city: "Monterey Park", price: 998000, beds: 3, baths: 2, sqft: 1600, status: "在售", zillow_url: "https://www.zillow.com/homes/1846-Holly-Oak-Dr-Monterey-Park,-CA-91755_rb/" }
  ],
  projects: [
    { id: "p1", type: "flip", title: "El Verano 翻新项目", address: "7437 El Verano Dr", city: "Buena Park", zip: "90621", status: "出售中", beds: 4, baths: 2, living_sqft: 1750, lot_sqft: 6000, year_built: 1960, notes: "DEMO 演示项目", teaser_annualized: 9.3, arv: 880000, expected_sale_price: 835000, hold_days: 180, zillow_url: "https://www.zillow.com/homes/7437-El-Verano-Dr-Buena-Park,-CA-90621_rb/" },
    { id: "p2", type: "flip", title: "Via Pepita 翻新项目", address: "21435 Via Pepita", city: "Yorba Linda", zip: "92886", status: "出售中", beds: 3, baths: 2.5, living_sqft: 2183, lot_sqft: 7400, year_built: 1989, notes: "DEMO 演示项目", teaser_annualized: 5.5, arv: 1450000, expected_sale_price: 1380000, hold_days: 270, zillow_url: "https://www.zillow.com/homes/21435-Via-Pepita-Yorba-Linda,-CA-92886_rb/" },
    { id: "p3", type: "flip", title: "Santa Anita 翻新项目", address: "1425 S Santa Anita Ave", city: "Arcadia", zip: "91006", status: "装修中", beds: 4, baths: 3, living_sqft: 2400, lot_sqft: 15000, year_built: 1955, notes: "DEMO 演示项目（进行中）", teaser_annualized: 12.0, arv: 2100000, expected_sale_price: null, hold_days: 365, zillow_url: "https://www.zillow.com/homes/1425-S-Santa-Anita-Ave-Arcadia,-CA-91006_rb/" },
    { id: "p4", type: "flip", title: "Baker Ave 翻新项目", address: "1346 W Baker Ave", city: "Fullerton", zip: "92833", status: "进行中", beds: 3, baths: 2, living_sqft: 1350, lot_sqft: 5800, year_built: 1958, notes: "DEMO 演示项目", teaser_annualized: 16.0, arv: 1025000, expected_sale_price: null, hold_days: 240, zillow_url: "https://www.zillow.com/homes/1346-W-Baker-Ave-Fullerton,-CA-92833_rb/" },
    { id: "p5", type: "flip", title: "Binney St 翻新项目", address: "15062 Binney St", city: "Hacienda Heights", zip: "91745", status: "Escrow 中", beds: 3, baths: 2, living_sqft: 1500, lot_sqft: 6500, year_built: 1962, notes: "DEMO 演示项目", teaser_annualized: 18.0, arv: 1100000, expected_sale_price: null, hold_days: 210, zillow_url: "https://www.zillow.com/homes/15062-Binney-St-Hacienda-Heights,-CA-91745_rb/" },
    { id: "p6", type: "flip", title: "Holly Oak 翻新项目", address: "1846 Holly Oak Dr", city: "Monterey Park", zip: "91755", status: "出售中", beds: 3, baths: 2, living_sqft: 1600, lot_sqft: 6200, year_built: 1957, notes: "DEMO 演示项目（买入待录入）", teaser_annualized: 10.0, arv: 1150000, expected_sale_price: null, hold_days: 240, zillow_url: "https://www.zillow.com/homes/1846-Holly-Oak-Dr-Monterey-Park,-CA-91755_rb/" },
    { id: "p7", type: "lending", title: "借款项目 A · 过桥借款", address: null, city: "Covina", zip: null, status: "募集中", notes: "DEMO：抵押房产位于 Covina 区域", teaser_annualized: null, loan_amount: 300000, loan_term_months: 12, loan_status: "募集中", interest_rate: null, zillow_url: "https://www.zillow.com/homes/Covina,-CA_rb/" }
  ],
  // [section, item, amount, note, isRevenue]
  pnl: {
    p1: [
      ["acquisition","买入价 (Purchase Price)",718000,"DEMO",0],["acquisition","Escrow 费用（买入）",1800,"",0],["acquisition","Title 费用（买入）",1200,"",0],["acquisition","其他费用（买入）",500,"",0],
      ["holding","水电气垃圾 (Utilities)",500,"预计",0],["holding","保险费用 (Insurance)",1500,"",0],["holding","草地维护 (Lawn Care)",500,"",0],["holding","监理设计 (Design/PM)",3000,"",0],["holding","室内清洁 (Cleaning)",350,"",0],["holding","Staging 家具摆设+拍照",3000,"",0],
      ["renovation","装修合约 (Main Contractor)",30000,"",0],["renovation","空调/暖气 (HVAC)",2900,"",0],["renovation","维修",4200,"买家要求维修",0],["renovation","灯",195,"",0],["renovation","厨房设备 (Appliances)",1657,"",0],
      ["sale","卖出价格 (Sale Price)",835000,"DEMO 测算售价",1],["sale","Title 费用（卖方）",382,"",0],["sale","Escrow 费用（卖方）",500,"",0],["sale","佣金费用 (Agent Commissions)",25050,"3%",0],["sale","warranty NHD",995,"",0],["sale","公证/地税 (Notary/Tax)",2021,"",0]
    ],
    p2: [
      ["acquisition","买入价 (Purchase Price)",1250000,"DEMO",0],["acquisition","Escrow 费用（买入）",2500,"",0],["acquisition","Title 费用（买入）",2000,"",0],["acquisition","其他费用（买入）",1000,"",0],
      ["holding","水电气垃圾 (Utilities)",600,"预计",0],["holding","保险费用 (Insurance)",1800,"",0],["holding","草地维护 (Lawn Care)",600,"",0],["holding","监理设计 (Design/PM)",3000,"",0],["holding","室内清洁 (Cleaning)",350,"",0],["holding","Staging 家具摆设+拍照",2500,"",0],
      ["renovation","装修合约 (Main Contractor)",10000,"",0],["renovation","维修",3500,"",0],["renovation","灯",700,"",0],["renovation","厨房设备 (Appliances)",1540,"",0],
      ["sale","卖出价格 (Sale Price)",1380000,"DEMO 挂牌价",1],["sale","Title 费用（卖方）",500,"",0],["sale","Escrow 费用（卖方）",600,"",0],["sale","佣金费用 (Agent Commissions)",41400,"3%",0],["sale","warranty NHD",1095,"",0],["sale","公证/地税 (Notary/Tax)",2500,"",0]
    ],
    p3: [["acquisition","买入价 (Purchase Price)",1470000,"DEMO",0],["acquisition","Escrow 费用（买入）",3000,"",0],["acquisition","Title 费用（买入）",2500,"",0],["acquisition","其他费用（买入）",1000,"",0],["holding","保险费用 (Insurance)",2000,"已发生",0],["holding","监理设计 (Design/PM)",3000,"已发生",0],["renovation","装修合约 (Main Contractor)",25000,"进行中",0]],
    p4: [["acquisition","买入价 (Purchase Price)",770000,"DEMO",0],["acquisition","Escrow 费用（买入）",1500,"",0],["acquisition","Title 费用（买入）",1100,"",0],["acquisition","其他费用（买入）",400,"",0],["holding","水电气垃圾 (Utilities)",300,"已发生",0],["holding","保险费用 (Insurance)",1500,"已发生",0],["renovation","装修合约 (Main Contractor)",20000,"进行中",0]],
    p5: [["acquisition","买入价 (Purchase Price)",820000,"DEMO",0],["acquisition","Escrow 费用（买入）",1600,"",0],["acquisition","Title 费用（买入）",1200,"",0],["acquisition","其他费用（买入）",500,"",0]],
    p6: [["holding","监理设计 (Design/PM)",3000,"买入待录入",0],["holding","Staging 家具摆设+拍照",3000,"DEMO",0]],
    p7: []
  },
  investor: { id: "demo-investor", email: "demo-investor@example.com", display_name: "演示投资人 (DEMO)", role: "investor" },
  investments: [
    { id: "i1", investor_id: "demo-investor", project_id: "p1", amount: 80000, share_pct: 10.02, status: "Escrow 中", distributed: 0 },
    { id: "i2", investor_id: "demo-investor", project_id: "p2", amount: 120000, share_pct: 9.05, status: "出售中", distributed: 0 },
    { id: "i3", investor_id: "demo-investor", project_id: "p7", amount: 50000, share_pct: null, status: "募集中", distributed: 0 }
  ],
  profiles: [
    { id: "demo-investor", email: "demo-investor@example.com", display_name: "演示投资人 (DEMO)", role: "investor" },
    { id: "demo-agent", email: "demo-agent@example.com", display_name: "演示代理 (DEMO)", role: "agent" }
  ],
  submissions: [
    { id: "s1", agent_id: "demo-agent", title: "示例房源（待审核）", address: "123 Sample St", city: "Pomona", price: 650000, beds: 3, baths: 2, sqft: 1400, description: "示例：代理提交，等待管理员审核。", status: "pending", zillow_url: "" },
    { id: "s2", agent_id: "demo-agent", title: "示例房源（已上架）", address: "456 Demo Ave", city: "Walnut", price: 880000, beds: 4, baths: 2, sqft: 1750, description: "示例：已通过审核并上架的代理房源。", status: "approved", zillow_url: "" }
  ]
};

/* ---------------- helpers ---------------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => (n == null || n === "" || isNaN(n)) ? "—" : "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
const pct = (n) => (n == null || isNaN(n)) ? "—" : Number(n).toFixed(1) + "%";
const SECTION_NAMES = { acquisition: "买入 Acquisition", holding: "持有费用 Holding", renovation: "装修费用 Renovation", sale: "卖出 Sale & Selling Costs" };

/* P&L math — single source of truth.
   lines: [{section,item,amount,note,is_revenue}]
   totalCosts = acquisition + holding + renovation + seller costs (sale lines excl. revenue)
   profit = revenue - totalCosts ; margin = profit / totalCosts
   annualized = profit / totalCosts / (holdDays/365) * 100                     */
function pnlTotals(lines) {
  const sub = { acquisition: 0, holding: 0, renovation: 0, sale: 0 };
  let revenue = 0;
  (lines || []).forEach((l) => {
    const a = Number(l.amount) || 0;
    if (l.is_revenue) revenue += a; else sub[l.section] = (sub[l.section] || 0) + a;
  });
  const totalCosts = sub.acquisition + sub.holding + sub.renovation + sub.sale;
  const profit = revenue > 0 ? revenue - totalCosts : null;
  return { sub, revenue, totalCosts, profit,
           margin: profit != null && totalCosts > 0 ? (profit / totalCosts) * 100 : null };
}
function annualized(profit, totalCosts, holdDays) {
  if (profit == null || !totalCosts || !holdDays) return null;
  return profit / totalCosts / (holdDays / 365) * 100;
}

/* ---------------- state ---------------- */
const state = {
  role: "visitor",          // visitor | investor | agent | admin
  user: null,               // live-mode auth user
  profile: null,
  listings: [], projects: [], rates: null,
  pnlCache: {},             // projectId -> lines (live mode)
  myInvestments: [],
  profiles: [], submissions: [],
  rentalsPublic: [], rentalProps: [], rentalUnits: [], rentalExpenses: [],
  rentalCollections: [], rentRoll: [], rentalTenants: [], rentalPayments: [], rentalReno: []
};

/* ---------------- data layer ---------------- */
async function loadPublic() {
  if (DEMO_MODE) {
    state.listings = DEMO.listings.slice();
    state.projects = DEMO.projects.slice();
    state.rates = DEMO.rates;
    return;
  }
  const [lst, prj, rt] = await Promise.all([
    sb.from("listings").select("*").eq("is_public", true).order("created_at", { ascending: false }),
    sb.from("public_projects").select("*").order("buy_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true }),
    sb.from("education_rates").select("*").order("rate_date", { ascending: false }).limit(1)
  ]);
  state.listings = lst.data || [];
  state.projects = prj.data || [];
  state.rates = (rt.data && rt.data[0]) || null;
}

/* Investor-tier project rows (full table) — RLS limits who can read this. */
async function loadInvestorTier() {
  if (DEMO_MODE) return; // demo projects already carry investor fields
  if (!["investor", "agent", "admin"].includes(state.role)) return;
  const { data } = await sb.from("projects").select("*").order("created_at", { ascending: false });
  if (data && data.length) {
    const byId = Object.fromEntries(state.projects.map((p) => [p.id, p]));
    data.forEach((p) => { byId[p.id] = Object.assign({}, byId[p.id], p); });
    state.projects = Object.values(byId);
  }
}

async function loadPnl(projectId) {
  if (DEMO_MODE) {
    return (DEMO.pnl[projectId] || []).map((a) => ({ section: a[0], item: a[1], amount: a[2], note: a[3], is_revenue: !!a[4] }));
  }
  if (state.pnlCache[projectId]) return state.pnlCache[projectId];
  const { data } = await sb.from("pnl_lines").select("*").eq("project_id", projectId).order("sort");
  const lines = data || [];
  state.pnlCache[projectId] = lines;
  return lines;
}

async function loadMyInvestments() {
  if (DEMO_MODE) {
    state.myInvestments = state.role === "investor" ? DEMO.investments.slice()
      : state.role === "admin" ? DEMO.investments.slice() : [];
    return;
  }
  if (!state.user) { state.myInvestments = []; return; }
  const { data } = await sb.from("investments").select("*");
  state.myInvestments = data || []; // RLS: investor sees own rows; admin sees all
}

async function loadAdminData() {
  if (state.role !== "admin") return;
  if (DEMO_MODE) { state.profiles = DEMO.profiles.slice(); state.submissions = DEMO.submissions.slice(); return; }
  const [pf, sub2, lst2] = await Promise.all([
    sb.from("profiles").select("*").order("created_at"),
    sb.from("agent_submissions").select("*").order("created_at", { ascending: false }),
    sb.from("listings").select("*").order("created_at", { ascending: false })
  ]);
  state.profiles = pf.data || [];
  state.submissions = sub2.data || [];
  state.adminListings = lst2.data || [];
}

async function loadAgentData() {
  if (state.role !== "agent") return;
  if (DEMO_MODE) { state.submissions = DEMO.submissions.filter((s) => s.agent_id === "demo-agent"); return; }
  const { data } = await sb.from("agent_submissions").select("*").order("created_at", { ascending: false });
  state.submissions = data || [];
}

/* ---------------- rendering ---------------- */
function renderRates() {
  const el = $("#rate-card");
  if (!state.rates) { el.innerHTML = "<h3>利率快照</h3><p>暂无数据。</p>"; return; }
  el.innerHTML = `<h3>利率快照 — ${esc(state.rates.source)} · ${esc(state.rates.rate_date)}</h3>
    <div class="kv">
      <div><b>30 年期固定利率</b>${pct(state.rates.rate_30y)}</div>
      <div><b>15 年期固定利率</b>${pct(state.rates.rate_15y)}</div>
      <div><b>说明</b>利率每周更新，数据日期如上，决策前请以最新公布为准。</div>
    </div>`;
}

function renderListings() {
  $("#listing-grid").innerHTML = state.listings.map((l) => `
    <div class="glass card">
      <div class="ph"><span>${esc(l.city || "")} · 在售房源</span></div>
      <div class="body">
        <h3>${esc(l.title)}</h3>
        <div class="price">${money(l.price)}</div>
        <p>${esc(l.address || "")}${l.city ? ", " + esc(l.city) : ""}</p>
        <p>${l.beds ?? "—"} 卧 · ${l.baths ?? "—"} 卫 · ${l.sqft ? Number(l.sqft).toLocaleString() + " sqft" : "—"}</p>
        <p><span class="tag">${esc(l.status || "在售")}</span>
        ${l.zillow_url ? `<a href="${esc(l.zillow_url)}" target="_blank" rel="noopener">Zillow 索引 ↗</a>` : ""}</p>
      </div>
    </div>`).join("") || "<p>暂无在售房源。</p>";
}

function projectCard(p) {
  const isInv = ["investor", "admin"].includes(state.role);
  const mine = state.myInvestments.some((i) => i.project_id === p.id);
  let extra = "";
  if (p.type === "lending") {
    extra = `<p>借款金额 ${money(p.loan_amount)} · 期限 ${p.loan_term_months ?? "—"} 个月 · ${esc(p.loan_status || p.status || "")}</p>
             <p>利率：<strong>${p.interest_rate == null ? "利率待定" : pct(p.interest_rate)}</strong></p>`;
  } else if (p.buy_price != null || p.sell_price != null) {
    extra = `<p>买入 ${money(p.buy_price)}${p.sell_price != null ? ` → 卖出 ${money(p.sell_price)}` : ""}</p>`;
  } else if (isInv && p.arv) {
    extra = `<p>ARV ${money(p.arv)} · 预计年化约 ${pct(p.teaser_annualized)}</p>`;
  } else {
    extra = `<p>预计年化回报约 ${pct(p.teaser_annualized)}</p>`;
  }
  return `<div class="glass card">
    <div class="ph"${p.photo_url ? ` style="background-image:url('${esc(p.photo_url)}');background-size:cover;background-position:center"` : ""}><span>${esc(p.city || "")} · ${p.type === "lending" ? "借款项目" : "翻新项目"}</span></div>
    <div class="body">
      <h3>${esc(p.title)}</h3>
      <p>${p.address ? esc(p.address) + ", " : ""}${esc(p.city || "")}</p>
      <p>${p.beds ? p.beds + " 卧 · " : ""}${p.baths ? p.baths + " 卫 · " : ""}${p.living_sqft ? Number(p.living_sqft).toLocaleString() + " sqft" : ""}</p>
      ${extra}
      <p><span class="tag hot">${esc(p.status || "")}</span>
      ${mine ? '<span class="tag">我已参与</span>' : ""}
      ${p.zillow_url ? `<a href="${esc(p.zillow_url)}" target="_blank" rel="noopener">Zillow 索引 ↗</a>` : ""}</p>
      <div class="row-actions"><button class="btn small" onclick="showDetail('${p.id}')">查看详情</button></div>
      ${!mine && state.role === "investor" ? '<div class="lock">项目明细仅该项目投资人可见</div>' : ""}
    </div></div>`;
}

function renderProjects() { $("#project-grid").innerHTML = state.projects.map(projectCard).join("") || "<p>暂无项目。</p>"; }

function renderMyMoney() {
  const box = $("#my-money");
  if (!["investor", "admin"].includes(state.role) || !state.myInvestments.length) { box.classList.add("hidden"); box.innerHTML = ""; return; }
  const total = state.myInvestments.reduce((s, i) => s + Number(i.amount || 0), 0);
  box.classList.remove("hidden");
  box.innerHTML = `<h3>${state.role === "admin" ? "投资人持仓（管理员）" : "我的钱在哪里"}</h3>` + state.myInvestments.map((i) => {
    const p = state.projects.find((x) => x.id === i.project_id) || {};
    const pnlBtn = p.type === "flip" ? ` <button class="btn small" onclick="showDetail('${i.project_id}')">查看项目损益表</button>` : "";
    return `<div class="list-item"><strong>${esc(p.title || i.project_id)}</strong> — ${money(i.amount)} · 状态：${esc(i.status || p.status || "")}${p.type === "lending" ? " · 利率：" + (p.interest_rate == null ? "待定" : pct(p.interest_rate)) : ""} · 已分配 ${money(i.distributed)}${pnlBtn}</div>`;
  }).join("") + `<div class="list-item"><strong>合计投入：${money(total)}</strong></div>`;
}

/* ---------------- project detail ---------------- */
async function showDetail(projectId) {
  const p = state.projects.find((x) => x.id === projectId);
  if (!p) return;
  const wrap = $("#project-detail");
  const isAdmin = state.role === "admin";
  const myInv = state.myInvestments.find((i) => i.project_id === projectId && (DEMO_MODE ? state.role === "investor" : i.investor_id === (state.user && state.user.id)));
  const canPnl = isAdmin || !!myInv;
  let html = `<div class="glass detail" id="detail-top">
    <h3>${esc(p.title)}</h3>
    <p>${p.address ? esc(p.address) + ", " : ""}${esc(p.city || "")}${p.zip ? " " + esc(p.zip) : ""} · <span class="tag hot">${esc(p.status || "")}</span>
    ${p.zillow_url ? ` · <a href="${esc(p.zillow_url)}" target="_blank" rel="noopener">Zillow 索引 ↗</a>` : ""}</p>
    <div class="kv">
      <div><b>建筑面积</b>${p.living_sqft ? Number(p.living_sqft).toLocaleString() + " sqft" : "—"}</div>
      <div><b>LOT 面积</b>${p.lot_sqft ? Number(p.lot_sqft).toLocaleString() + " sqft" : "—"}</div>
      <div><b>卧室 / 卫生间</b>${p.beds ?? "—"} / ${p.baths ?? "—"}</div>
      <div><b>建造年份</b>${p.year_built ?? "—"}</div>
      <div><b>备注</b>${esc(p.notes || "—")}</div>
    </div>`;

  if (p.type === "lending") {
    html += `<div class="kv">
      <div><b>借款金额</b>${money(p.loan_amount)}</div>
      <div><b>期限</b>${p.loan_term_months ?? "—"} 个月</div>
      <div><b>借款状态</b>${esc(p.loan_status || p.status || "")}</div>
      <div><b>利率</b>${p.interest_rate == null ? "利率待定" : pct(p.interest_rate)}</div>
    </div>`;
  }

  if (p.type === "flip" && canPnl) {
    const lines = await loadPnl(projectId);
    const t = pnlTotals(lines);
    const ann = annualized(t.profit, t.totalCosts, p.hold_days);
    html += renderPnlTable(lines, t, projectId);
    html += `<div class="kv">
      <div><b>总成本</b>${money(t.totalCosts)}</div>
      <div><b>利润</b>${t.profit == null ? "—（未出售）" : money(t.profit)}</div>
      <div><b>利润率（利润÷总成本）</b>${t.margin == null ? "—" : pct(t.margin)}</div>
      <div><b>年化回报</b>${ann == null ? "—" : "约 " + pct(ann)}</div>
    </div>`;
    if (myInv && !isAdmin) html += renderHolding(p, myInv, t);
    if (isAdmin) {
      const invs = DEMO_MODE ? DEMO.investments.filter((i) => i.project_id === projectId)
        : (await sb.from("investments").select("*").eq("project_id", projectId)).data || [];
      if (invs.length) {
        html += `<div class="sec-title">项目投资人（管理员）</div>` + invs.map((i) => {
          const prof = state.profiles.find((x) => x.id === i.investor_id);
          return `<div class="list-item">${esc(prof ? (prof.display_name || prof.email) : i.investor_id)} — ${money(i.amount)} · 份额 ${i.share_pct == null ? "—" : pct(i.share_pct)} · ${esc(i.status || "")} · 已分配 ${money(i.distributed)}</div>`;
        }).join("");
      }
      html += `<div class="row-actions"><button class="btn small" onclick="adminEditProject('${p.id}')">编辑项目 / 损益表</button></div>`;
    }
  } else if (p.type === "flip") {
    html += `<div class="lock">${state.role === "investor" ? "该项目完整损益表仅其投资人可见；你未参与此项目。" : "登录投资人账号可查看投资层数据；完整损益表仅该项目投资人与管理员可见。"}</div>`;
    if (["investor", "admin"].includes(state.role) && p.arv) {
      html += `<div class="kv"><div><b>ARV</b>${money(p.arv)}</div><div><b>预计售价</b>${money(p.expected_sale_price)}</div><div><b>预计年化</b>约 ${pct(p.teaser_annualized)}</div></div>`;
    }
  }

  if (p.type === "lending" && myInv) {
    html += `<div class="sec-title">我的资金</div>
      <div class="kv">
        <div><b>我的出借</b>${money(myInv.amount)}</div>
        <div><b>状态</b>${esc(myInv.status || "")}</div>
        <div><b>利率</b>${p.interest_rate == null ? "待定" : pct(p.interest_rate)}</div>
        <div><b>已收回</b>${money(myInv.distributed)}</div>
        <div><b>待收回本金</b>${money(Number(myInv.amount || 0) - Number(myInv.distributed || 0))}</div>
      </div>`;
  }

  html += `<div class="row-actions"><button class="btn small btn-ghost" onclick="document.getElementById('project-detail').innerHTML=''">收起</button></div></div>`;
  wrap.innerHTML = html;
  $$(".pnl-edit", wrap).forEach((el) => el.addEventListener("click", () => editPnlAmount(el)));
  $("#detail-top").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function editPnlAmount(el) {
  if (state.role !== "admin" || DEMO_MODE) return;
  const lineId = el.dataset.id, pid = el.dataset.pid;
  const lines = state.pnlCache[pid] || [];
  const line = lines.find((l) => l.id === lineId);
  if (!line) return;
  const v = prompt(`修改「${line.item}」的金额 (USD)：`, line.amount);
  if (v == null) return;
  const amt = Number(v);
  if (isNaN(amt)) { alert("请输入数字。"); return; }
  const { error } = await sb.from("pnl_lines").update({ amount: amt }).eq("id", lineId);
  if (error) { alert("保存失败：" + error.message); return; }
  line.amount = amt;
  showDetail(pid);
}
window.showDetail = showDetail;

function renderPnlTable(lines, t, pid) {
  let html = `<div class="sec-title">翻新屋损益表 Property P&amp;L</div>`;
  ["acquisition", "holding", "renovation", "sale"].forEach((sec) => {
    const rows = (lines || []).filter((l) => l.section === sec);
    if (!rows.length) return;
    html += `<div class="sec-title">${SECTION_NAMES[sec]}</div><table class="pnl">
      <tr><th>项目</th><th class="num">金额 (USD)</th><th>备注</th></tr>`;
    const canEdit = pid && state.role === "admin";
    rows.forEach((l) => {
      html += `<tr><td>${esc(l.item)}</td><td class="num">${canEdit ? `<span class="pnl-edit" data-pid="${pid}" data-id="${l.id}" title="点击修改金额">${money(l.amount)}</span>` : money(l.amount)}</td><td>${esc(l.note || "")}</td></tr>`;
    });
    if (sec === "sale") {
      html += `<tr class="subtotal"><td>卖出价格</td><td class="num">${money(t.revenue)}</td><td></td></tr>
               <tr class="subtotal"><td>卖方费用合计</td><td class="num">${money(t.sub.sale)}</td><td></td></tr>`;
    } else {
      html += `<tr class="subtotal"><td>${SECTION_NAMES[sec]} 合计</td><td class="num">${money(t.sub[sec])}</td><td></td></tr>`;
    }
    html += `</table>`;
  });
  html += `<table class="pnl">
    <tr><td>买入成本合计</td><td class="num">${money(t.sub.acquisition)}</td><td></td></tr>
    <tr><td>持有成本合计</td><td class="num">${money(t.sub.holding)}</td><td></td></tr>
    <tr><td>装修成本合计</td><td class="num">${money(t.sub.renovation)}</td><td></td></tr>
    <tr><td>卖方费用合计</td><td class="num">${money(t.sub.sale)}</td><td></td></tr>
    <tr class="grand"><td>总成本 (Total Costs)</td><td class="num">${money(t.totalCosts)}</td><td></td></tr>
    <tr class="grand"><td>利润 (Profit)</td><td class="num">${t.profit == null ? "—" : money(t.profit)}</td><td></td></tr>
    <tr class="grand"><td>利润率</td><td class="num">${t.margin == null ? "—" : pct(t.margin)}</td><td></td></tr>
  </table>`;
  return html;
}

function renderHolding(p, inv, t) {
  const share = inv.share_pct != null ? Number(inv.share_pct) : (t.totalCosts ? (Number(inv.amount) / t.totalCosts) * 100 : null);
  const myCosts = share != null ? (t.totalCosts * share) / 100 : null;
  const myProfit = share != null && t.profit != null ? (t.profit * share) / 100 : null;
  const ann = annualized(t.profit, t.totalCosts, p.hold_days);
  const pending = myProfit != null ? Number(inv.amount) + myProfit - Number(inv.distributed || 0) : null;
  return `<div class="sec-title">我的投资（仅本人可见）</div>
    <div class="kv">
      <div><b>我的投资额</b>${money(inv.amount)}</div>
      <div><b>占项目份额</b>${share == null ? "—" : pct(share)}</div>
      <div><b>对应总成本</b>${money(myCosts)}</div>
      <div><b>对应利润</b>${myProfit == null ? "—" : money(myProfit)}</div>
      <div><b>我的年化回报</b>${ann == null ? "—" : "约 " + pct(ann)}</div>
      <div><b>已分配</b>${money(inv.distributed)}</div>
      <div><b>待分配（本金+利润）</b>${pending == null ? "—" : money(pending)}</div>
      <div><b>状态</b>${esc(inv.status || "")}</div>
    </div>`;
}

/* ---------------- agent area ---------------- */
function renderAgent() {
  const el = $("#agent-area");
  if (state.role === "visitor") {
    el.innerHTML = `<div class="glass panel"><h3>成为合作代理</h3><p>先用页面右上角「登录 / 注册」创建账号，然后联系管理员把你的账号升级为代理，即可在这里提交房源。${DEMO_MODE ? "（演示模式：用顶部身份切换器切到「代理」预览。）" : ""}</p></div>`;
    return;
  }
  if (state.role !== "agent" && state.role !== "admin") {
    el.innerHTML = `<div class="glass panel"><p>你的账号身份是「${esc(state.role)}」。代理提交入口仅对代理账号开放。</p></div>`;
    return;
  }
  const mine = state.submissions;
  el.innerHTML = `<div class="glass panel">
    <h3>提交房源</h3>
    <form id="sub-form">
      <div class="form-grid">
        <label>标题<input name="title" required></label>
        <label>地址<input name="address"></label>
        <label>城市<input name="city"></label>
        <label>价格 (USD)<input name="price" type="number" min="0"></label>
        <label>卧室<input name="beds" type="number" step="0.5"></label>
        <label>卫生间<input name="baths" type="number" step="0.5"></label>
        <label>面积 sqft<input name="sqft" type="number"></label>
        <label>Zillow 链接<input name="zillow_url" type="url" placeholder="https://www.zillow.com/..."></label>
      </div>
      <label>介绍<textarea name="description"></textarea></label>
      <button class="btn btn-pill" type="submit">提交审核</button>
      <p class="form-msg" id="sub-msg"></p>
    </form></div>
    <div class="glass panel"><h3>我提交的房源</h3>
    ${mine.length ? mine.map((s) => `<div class="list-item"><strong>${esc(s.title)}</strong> — ${money(s.price)} · ${esc(s.city || "")} · 状态：<strong>${esc({ pending: "待审核", approved: "已通过（已上架）", rejected: "未通过" }[s.status] || s.status)}</strong>${s.admin_note ? " · 管理员备注：" + esc(s.admin_note) : ""}</div>`).join("") : "<p>还没有提交记录。</p>"}
    </div>`;
  $("#sub-form").addEventListener("submit", onSubmitListing);
}

async function onSubmitListing(e) {
  e.preventDefault();
  const f = new FormData(e.target);
  const row = { title: f.get("title"), address: f.get("address"), city: f.get("city"),
    price: Number(f.get("price")) || null, beds: Number(f.get("beds")) || null,
    baths: Number(f.get("baths")) || null, sqft: Number(f.get("sqft")) || null,
    description: f.get("description"), zillow_url: f.get("zillow_url") };
  const msg = $("#sub-msg");
  if (DEMO_MODE) {
    DEMO.submissions.unshift(Object.assign({ id: "s" + Date.now(), agent_id: "demo-agent", status: "pending" }, row));
    msg.textContent = "演示模式：已加入待审核列表（不会保存）。"; msg.className = "form-msg ok";
    await loadAgentData(); renderAgent(); return;
  }
  row.agent_id = state.user.id;
  const { error } = await sb.from("agent_submissions").insert(row);
  if (error) { msg.textContent = "提交失败：" + error.message; msg.className = "form-msg err"; return; }
  msg.textContent = "已提交，等待管理员审核。"; msg.className = "form-msg ok";
  await loadAgentData(); renderAgent();
}

/* ---------------- admin backend ---------------- */
function renderAdmin() {
  const sec = $("#admin");
  if (state.role !== "admin") { sec.classList.add("hidden"); sec.innerHTML = '<h2>管理员后台</h2><div id="admin-area"></div>'; return; }
  sec.classList.remove("hidden");
  const el = $("#admin-area");
  el.innerHTML = `
  <div class="tabs">
    <button data-tab="project" class="on">项目管理</button>
    <button data-tab="bind">投资人绑定</button>
    <button data-tab="review">代理审核 <span id="review-count"></span></button>
    <button data-tab="roles">账号角色</button>
    <button data-tab="rentals">出租管理</button>
    <button data-tab="listings">房源管理</button>
  </div>
  <div id="admin-tab-body"></div>`;
  $$("#admin-area .tabs button").forEach((b) => b.addEventListener("click", () => {
    $$("#admin-area .tabs button").forEach((x) => x.classList.remove("on"));
    b.classList.add("on"); renderAdminTab(b.dataset.tab);
  }));
  const pending = state.submissions.filter((s) => s.status === "pending").length;
  const rc = $("#review-count"); if (rc && pending) rc.textContent = "(" + pending + ")";
  renderAdminTab("project");
}

function renderAdminTab(tab) {
  const body = $("#admin-tab-body"); if (!body) return;
  if (tab === "project") return adminProjectTab(body);
  if (tab === "bind") return adminBindTab(body);
  if (tab === "review") return adminReviewTab(body);
  if (tab === "roles") return adminRolesTab(body);
  if (tab === "rentals") return adminRentalsTab(body);
  if (tab === "listings") return adminListingsTab(body);
}

function adminProjectTab(body) {
  const opts = state.projects.map((p) => `<option value="${p.id}">${esc(p.title)}（${p.type === "lending" ? "借款" : "翻新"}）</option>`).join("");
  body.innerHTML = `<div class="glass panel">
    <h3>新增 / 编辑项目</h3>
    <label>选择已有项目编辑（或留空新增）<select id="ap-pick"><option value="">＋ 新增项目</option>${opts}</select></label>
    <form id="ap-form">
      <input type="hidden" name="id">
      <div class="form-grid">
        <label>类型<select name="type"><option value="flip">翻新合伙项目</option><option value="lending">借款项目</option></select></label>
        <label>标题<input name="title" required></label>
        <label>状态<input name="status" placeholder="募集中 / 装修中 / 出售中"></label>
        <label>地址<input name="address"></label>
        <label>城市<input name="city"></label>
        <label>邮编<input name="zip"></label>
        <label>卧室<input name="beds" type="number" step="0.5"></label>
        <label>卫生间<input name="baths" type="number" step="0.5"></label>
        <label>建筑面积 sqft<input name="living_sqft" type="number"></label>
        <label>LOT 面积 sqft<input name="lot_sqft" type="number"></label>
        <label>建造年份<input name="year_built" type="number"></label>
        <label>照片 URL<input name="photo_url"></label>
        <label>Zillow 索引链接<input name="zillow_url"></label>
        <label>公开显示<select name="is_public"><option value="true">是</option><option value="false">否</option></select></label>
        <label>买入价格（翻新，卡片显示）<input name="buy_price" type="number"></label>
        <label>卖出价格（翻新，卡片显示）<input name="sell_price" type="number"></label>
        <label>买入日期（翻新，列表按此排序）<input name="buy_date" type="date"></label>
        <label>ARV（翻新）<input name="arv" type="number"></label>
        <label>预计售价（翻新）<input name="expected_sale_price" type="number"></label>
        <label>预计持有天数（翻新）<input name="hold_days" type="number"></label>
        <label>预告年化 %（公开层）<input name="teaser_annualized" type="number" step="0.1"></label>
        <label>借款金额（借款）<input name="loan_amount" type="number"></label>
        <label>借款期限 月（借款）<input name="loan_term_months" type="number"></label>
        <label>借款状态（借款）<input name="loan_status"></label>
        <label>年利率 %（借款，留空=待定）<input name="interest_rate" type="number" step="0.01"></label>
      </div>
      <label>备注<textarea name="notes"></textarea></label>
      <h4>损益表行（翻新项目）</h4>
      <div id="pnl-editor"></div>
      <div class="row-actions"><button type="button" class="btn small" id="pnl-add">＋ 加一行</button></div>
      <div class="row-actions">
        <button class="btn btn-pill" type="submit">保存项目</button>
        <button class="btn danger" type="button" id="ap-delete">删除此项目</button>
      </div>
      <p class="form-msg" id="ap-msg"></p>
    </form></div>`;
  $("#pnl-add").addEventListener("click", () => addPnlRow());
  $("#ap-pick").addEventListener("change", (e) => adminFillProject(e.target.value));
  $("#ap-form").addEventListener("submit", onSaveProject);
  $("#ap-delete").addEventListener("click", onDeleteProject);
  addPnlRow({ section: "acquisition", item: "买入价 (Purchase Price)", amount: "", note: "", is_revenue: false });
}

function addPnlRow(l) {
  l = l || { section: "acquisition", item: "", amount: "", note: "", is_revenue: false };
  const div = document.createElement("div");
  div.className = "pnl-edit-row";
  div.innerHTML = `
    <select class="pe-sec">${Object.keys(SECTION_NAMES).map((s) => `<option value="${s}" ${s === l.section ? "selected" : ""}>${SECTION_NAMES[s]}</option>`).join("")}</select>
    <input class="pe-item" placeholder="项目名" value="${esc(l.item)}">
    <input class="pe-amt" type="number" step="0.01" placeholder="金额" value="${l.amount}">
    <input class="pe-note" placeholder="备注" value="${esc(l.note || "")}">
    <span><label title="售价行"><input type="checkbox" class="pe-rev" ${l.is_revenue ? "checked" : ""}>售价</label>
    <button type="button" class="btn small danger pe-del">×</button></span>`;
  div.querySelector(".pe-del").addEventListener("click", () => div.remove());
  $("#pnl-editor").appendChild(div);
}

function collectPnlRows() {
  return $$("#pnl-editor .pnl-edit-row").map((r, idx) => ({
    section: r.querySelector(".pe-sec").value,
    item: r.querySelector(".pe-item").value.trim(),
    amount: Number(r.querySelector(".pe-amt").value) || 0,
    note: r.querySelector(".pe-note").value,
    is_revenue: r.querySelector(".pe-rev").checked,
    sort: idx + 1
  })).filter((l) => l.item);
}

async function adminFillProject(id) {
  const form = $("#ap-form"); if (!form) return;
  form.reset(); $("#pnl-editor").innerHTML = "";
  if (!id) { addPnlRow({ section: "acquisition", item: "买入价 (Purchase Price)", amount: "", note: "", is_revenue: false }); return; }
  const p = state.projects.find((x) => x.id === id); if (!p) return;
  const set = (n, v) => { const el = form.elements[n]; if (el) el.value = v == null ? "" : v; };
  ["id","type","title","status","address","city","zip","beds","baths","living_sqft","lot_sqft","year_built","photo_url","zillow_url","buy_price","sell_price","buy_date","arv","expected_sale_price","hold_days","teaser_annualized","loan_amount","loan_term_months","loan_status","interest_rate","notes"].forEach((n) => set(n, p[n]));
  set("is_public", String(p.is_public !== false));
  const lines = await loadPnl(id);
  lines.forEach((l) => addPnlRow(l));
  if (!lines.length) addPnlRow();
}
window.adminEditProject = function (id) {
  document.getElementById("admin").scrollIntoView({ behavior: "smooth" });
  const pick = $("#ap-pick"); if (pick) { pick.value = id; adminFillProject(id); }
};

async function onSaveProject(e) {
  e.preventDefault();
  const form = e.target, f = new FormData(form), msg = $("#ap-msg");
  const num = (n) => { const v = f.get(n); return v === "" || v == null ? null : Number(v); };
  const row = { type: f.get("type"), title: f.get("title"), status: f.get("status") || "进行中",
    address: f.get("address") || null, city: f.get("city") || null, zip: f.get("zip") || null,
    beds: num("beds"), baths: num("baths"), living_sqft: num("living_sqft"), lot_sqft: num("lot_sqft"),
    year_built: num("year_built"), photo_url: f.get("photo_url") || null, zillow_url: f.get("zillow_url") || null,
    is_public: f.get("is_public") === "true", notes: f.get("notes") || null,
    buy_price: num("buy_price"), sell_price: num("sell_price"), buy_date: f.get("buy_date") || null,
    arv: num("arv"), expected_sale_price: num("expected_sale_price"), hold_days: num("hold_days"),
    teaser_annualized: num("teaser_annualized"), loan_amount: num("loan_amount"),
    loan_term_months: num("loan_term_months"), loan_status: f.get("loan_status") || null,
    interest_rate: num("interest_rate"), updated_at: new Date().toISOString() };
  const id = f.get("id");
  const lines = collectPnlRows();
  if (DEMO_MODE) {
    if (id) { const p = DEMO.projects.find((x) => x.id === id); Object.assign(p, row); }
    else { const nid = "p" + Date.now(); DEMO.projects.push(Object.assign({ id: nid }, row)); DEMO.pnl[nid] = lines.map((l) => [l.section, l.item, l.amount, l.note, l.is_revenue ? 1 : 0]); }
    if (id) DEMO.pnl[id] = lines.map((l) => [l.section, l.item, l.amount, l.note, l.is_revenue ? 1 : 0]);
    msg.textContent = "演示模式：已更新预览（不会保存到数据库）。"; msg.className = "form-msg ok";
    await refresh(); return;
  }
  let pid = id;
  if (id) { const { error } = await sb.from("projects").update(row).eq("id", id); if (error) { msg.textContent = error.message; msg.className = "form-msg err"; return; } }
  else { const { data, error } = await sb.from("projects").insert(row).select("id").single(); if (error) { msg.textContent = error.message; msg.className = "form-msg err"; return; } pid = data.id; }
  await sb.from("pnl_lines").delete().eq("project_id", pid);
  if (lines.length) {
    const { error } = await sb.from("pnl_lines").insert(lines.map((l) => Object.assign({ project_id: pid }, l)));
    if (error) { msg.textContent = "项目已保存，但损益表行保存失败：" + error.message; msg.className = "form-msg err"; return; }
  }
  delete state.pnlCache[pid];
  msg.textContent = "已保存。"; msg.className = "form-msg ok";
  await refresh();
}

async function onDeleteProject() {
  const id = $("#ap-form").querySelector('input[name="id"]').value;
  const msg = $("#ap-msg");
  if (!id) { msg.textContent = "先选择一个已有项目。"; msg.className = "form-msg err"; return; }
  if (!confirm("确认删除该项目及其损益表、投资绑定？此操作不可撤销。")) return;
  if (DEMO_MODE) { const i = DEMO.projects.findIndex((x) => x.id === id); if (i >= 0) DEMO.projects.splice(i, 1); await refresh(); return; }
  const { error } = await sb.from("projects").delete().eq("id", id);
  msg.textContent = error ? error.message : "已删除。"; msg.className = error ? "form-msg err" : "form-msg ok";
  if (!error) await refresh();
}

function adminListingsTab(body) {
  const listings = (state.adminListings && state.adminListings.length) ? state.adminListings : state.listings;
  const r = state.rates || {};
  body.innerHTML = `
  <div class="glass panel">
    <h3 id="lst-title">新增在售房源</h3>
    <form id="lst-form"><div class="form-grid">
      <label>标题<input name="title" required placeholder="如 21435 Via Pepita"></label>
      <label>地址<input name="address"></label><label>城市<input name="city"></label>
      <label>价格<input name="price" type="number" step="0.01"></label>
      <label>卧室<input name="beds" type="number" step="0.5"></label><label>卫生间<input name="baths" type="number" step="0.5"></label>
      <label>面积 sqft<input name="sqft" type="number"></label>
      <label>状态<input name="status" value="在售"></label>
      <label>Zillow 链接<input name="zillow_url"></label>
      <label>公开显示<select name="is_public"><option value="true">公开</option><option value="false">隐藏</option></select></label>
    </div><div class="row-actions"><button class="btn btn-pill" type="submit" id="lst-submit">添加房源</button><button class="btn small" type="button" id="lst-cancel" style="display:none" onclick="cancelEditListing()">取消编辑</button></div>
    <p class="form-msg" id="lst-msg"></p></form>
    ${listings.map((l) => `<div class="list-item">${esc(l.title || "")} · ${esc(l.address || "")}${l.city ? ", " + esc(l.city) : ""} · ${money(l.price)} · ${esc(l.status || "")}${l.is_public === false ? " · 已隐藏" : ""} <button class="btn small" onclick="editListing('${l.id}')">编辑</button> <button class="btn small danger" onclick="delListing('${l.id}')">删除</button></div>`).join("") || "<p>暂无房源。</p>"}
  </div>

  <div class="glass panel">
    <h3>利率快照（首页展示，改完保存即更新）</h3>
    <form id="rate-form"><div class="form-grid">
      <label>数据日期<input name="rate_date" type="date" value="${esc(r.rate_date || "")}"></label>
      <label>30 年期利率 %<input name="rate_30y" type="number" step="0.01" value="${r.rate_30y ?? ""}"></label>
      <label>15 年期利率 %<input name="rate_15y" type="number" step="0.01" value="${r.rate_15y ?? ""}"></label>
      <label>来源<input name="source" value="${esc(r.source || "Freddie Mac PMMS")}"></label>
    </div><div class="row-actions"><button class="btn btn-pill" type="submit">保存利率</button></div>
    <p class="form-msg" id="rate-msg"></p></form>
  </div>`;

  const numOrNull = (v) => (v === "" || v == null ? null : Number(v));
  $("#lst-form").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = new FormData(e.target), msg = $("#lst-msg");
    const row = { title: f.get("title"), address: f.get("address") || null, city: f.get("city") || null,
      price: numOrNull(f.get("price")), beds: numOrNull(f.get("beds")), baths: numOrNull(f.get("baths")),
      sqft: numOrNull(f.get("sqft")), status: f.get("status") || "在售", zillow_url: f.get("zillow_url") || null,
      is_public: f.get("is_public") === "true" };
    if (DEMO_MODE) { msg.textContent = "演示模式：不保存。"; msg.className = "form-msg"; return; }
    let error;
    if (window.__editingListingId) {
      ({ error } = await sb.from("listings").update(row).eq("id", window.__editingListingId));
      if (!error) window.__editingListingId = null;
      msg.textContent = error ? error.message : "已保存修改。";
    } else {
      ({ error } = await sb.from("listings").insert(row));
      msg.textContent = error ? error.message : "已添加。";
    }
    msg.className = "form-msg " + (error ? "err" : "ok");
    if (!error) await refresh();
  });
  $("#rate-form").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = new FormData(e.target), msg = $("#rate-msg");
    const row = { rate_date: f.get("rate_date") || new Date().toISOString().slice(0, 10),
      rate_30y: numOrNull(f.get("rate_30y")), rate_15y: numOrNull(f.get("rate_15y")), source: f.get("source") || null };
    if (DEMO_MODE) { msg.textContent = "演示模式：不保存。"; msg.className = "form-msg"; return; }
    let error;
    if (state.rates && state.rates.id) ({ error } = await sb.from("education_rates").update(row).eq("id", state.rates.id));
    else ({ error } = await sb.from("education_rates").insert(row));
    msg.textContent = error ? error.message : "已保存，首页利率已更新。";
    msg.className = "form-msg " + (error ? "err" : "ok");
    if (!error) await refresh();
  });
}

window.editListing = function (id) {
  const src = (state.adminListings && state.adminListings.length) ? state.adminListings : state.listings;
  const l = src.find((x) => x.id === id);
  if (!l) return;
  if (DEMO_MODE) { alert("演示模式：不保存。"); return; }
  const form = $("#lst-form"); if (!form) return;
  const set = (n, v) => { const el = form.elements[n]; if (el) el.value = v == null ? "" : v; };
  set("title", l.title); set("address", l.address); set("city", l.city); set("price", l.price);
  set("beds", l.beds); set("baths", l.baths); set("sqft", l.sqft); set("status", l.status || "在售");
  set("zillow_url", l.zillow_url); set("is_public", l.is_public === false ? "false" : "true");
  window.__editingListingId = id;
  const title = $("#lst-title"); if (title) title.textContent = "编辑房源：" + (l.title || "");
  const btn = $("#lst-submit"); if (btn) btn.textContent = "保存修改";
  const cancel = $("#lst-cancel"); if (cancel) cancel.style.display = "";
  const msg = $("#lst-msg"); if (msg) { msg.textContent = "正在编辑现有房源，改完点「保存修改」；不改了点「取消编辑」。"; msg.className = "form-msg"; }
  form.scrollIntoView({ behavior: "smooth", block: "start" });
};

window.cancelEditListing = function () {
  window.__editingListingId = null;
  const form = $("#lst-form"); if (form) form.reset();
  const title = $("#lst-title"); if (title) title.textContent = "新增在售房源";
  const btn = $("#lst-submit"); if (btn) btn.textContent = "添加房源";
  const cancel = $("#lst-cancel"); if (cancel) cancel.style.display = "none";
  const msg = $("#lst-msg"); if (msg) msg.textContent = "";
};

window.delListing = async function (id) {
  if (!confirm("确认删除该房源？")) return;
  if (DEMO_MODE) { alert("演示模式：不删除。"); return; }
  const { error } = await sb.from("listings").delete().eq("id", id);
  if (error) alert("删除失败：" + error.message); else await refresh();
};

function adminBindTab(body) {
  const invs = state.profiles.filter((p) => p.role === "investor");
  const allInv = () => (DEMO_MODE ? DEMO.investments : state.myInvestments);
  body.innerHTML = `<div class="glass panel"><h3>绑定投资人到项目（一套房可多人、一次保存）</h3>
    ${invs.length ? "" : "<p>目前还没有「投资人」角色的账号。先到「账号角色」标签把对方账号提升为投资人，这里才会出现名单。</p>"}
    <div class="form-grid">
      <label>先选项目（房子）<select id="bind-project">${state.projects.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join("")}</select></label>
    </div>
    <form id="bind-multi-form"><div id="bind-rows"></div>
    <button class="btn btn-pill" type="submit">一次性保存全部勾选</button><p class="form-msg" id="bind-msg"></p></form>
    <h4>现有绑定</h4>
    ${allInv().map((i) => {
      const p = state.projects.find((x) => x.id === i.project_id) || {};
      const prof = state.profiles.find((x) => x.id === i.investor_id);
      return `<div class="list-item">${esc(prof ? (prof.display_name || prof.email) : i.investor_id)} → ${esc(p.title || i.project_id)}：<strong>投资金额 ${money(i.amount)}</strong> · 份额 ${i.share_pct == null ? "自动" : pct(i.share_pct)} · ${esc(i.status || "")} · 已分配 ${money(i.distributed)}${i.note ? " · 备注：" + esc(i.note) : ""}
        <span class="row-actions"><button class="btn small danger" onclick="unbindInvestment('${i.id}')">解绑</button></span></div>`;
    }).join("") || "<p>暂无绑定。</p>"}
    </div>`;
  const renderRows = () => {
    const pid = $("#bind-project").value;
    $("#bind-rows").innerHTML = invs.map((prof) => {
      const ex = allInv().find((i) => i.project_id === pid && i.investor_id === prof.id);
      return `<div class="list-item bind-row" data-inv="${prof.id}">
        <label><input type="checkbox" class="b-on" ${ex ? "checked" : ""}> <strong>${esc(prof.display_name || prof.email)}</strong>（${esc(prof.email)}）</label>
        <div class="form-grid">
          <label>投资金额 USD<input class="b-amount" type="number" value="${ex ? ex.amount : ""}" placeholder="金额"></label>
          <label>份额 %（可空，自动算）<input class="b-share" type="number" step="0.01" value="${ex && ex.share_pct != null ? ex.share_pct : ""}"></label>
          <label>已分配 USD<input class="b-dist" type="number" value="${ex ? ex.distributed : 0}"></label>
          <label>状态<input class="b-status" value="${esc(ex ? (ex.status || "已确认") : "已确认")}"></label>
          <label>备注<input class="b-note" value="${esc(ex ? (ex.note || "") : "")}"></label>
        </div></div>`;
    }).join("") || "<p>暂无可选投资人。</p>";
  };
  $("#bind-project").addEventListener("change", renderRows);
  renderRows();
  $("#bind-multi-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pid = $("#bind-project").value, msg = $("#bind-msg");
    const checked = [], toDelete = [];
    $$(".bind-row", body).forEach((r) => {
      const invId = r.dataset.inv;
      const ex = allInv().find((i) => i.project_id === pid && i.investor_id === invId);
      if (r.querySelector(".b-on").checked) {
        checked.push({ invId, amount: r.querySelector(".b-amount").value, share: r.querySelector(".b-share").value,
          dist: r.querySelector(".b-dist").value, status: r.querySelector(".b-status").value, note: r.querySelector(".b-note").value });
      } else if (ex) toDelete.push(ex);
    });
    if (checked.some((c) => c.amount === "" || isNaN(Number(c.amount)))) {
      msg.textContent = "有勾选的投资人还没填金额，补上再保存。"; msg.className = "form-msg err"; return;
    }
    if (DEMO_MODE) {
      checked.forEach((c) => {
        const row = { investor_id: c.invId, project_id: pid, amount: Number(c.amount),
          share_pct: c.share === "" ? null : Number(c.share), status: c.status || "已确认",
          distributed: Number(c.dist) || 0, note: c.note.trim() || null };
        const ex = DEMO.investments.find((i) => i.project_id === pid && i.investor_id === c.invId);
        if (ex) Object.assign(ex, row); else DEMO.investments.push(Object.assign({ id: "i" + Date.now() + Math.random() }, row));
      });
      toDelete.forEach((ex) => { const ix = DEMO.investments.indexOf(ex); if (ix >= 0) DEMO.investments.splice(ix, 1); });
      msg.textContent = "演示模式：已更新（不保存）。"; msg.className = "form-msg ok"; await refresh(); return;
    }
    const errs = [];
    for (const c of checked) {
      const row = { investor_id: c.invId, project_id: pid, amount: Number(c.amount),
        share_pct: c.share === "" ? null : Number(c.share), status: c.status || "已确认",
        distributed: Number(c.dist) || 0, note: c.note.trim() || null };
      const { error } = await sb.from("investments").upsert(row, { onConflict: "investor_id,project_id" });
      if (error) errs.push(error.message);
    }
    for (const ex of toDelete) {
      const { error } = await sb.from("investments").delete().eq("id", ex.id);
      if (error) errs.push(error.message);
    }
    msg.textContent = errs.length ? "部分失败：" + errs[0] : `已保存：写入 ${checked.length} 人，解绑 ${toDelete.length} 人。`;
    msg.className = errs.length ? "form-msg err" : "form-msg ok";
    if (!errs.length) await refresh();
  });
}

window.unbindInvestment = async function (id) {
  if (!confirm("确认解绑这条投资？（删除投资人 × 项目的绑定记录）")) return;
  if (DEMO_MODE) { alert("演示模式：不删除。"); return; }
  const { error } = await sb.from("investments").delete().eq("id", id);
  if (error) { alert("解绑失败：" + error.message); return; }
  await refresh();
};

function adminReviewTab(body) {
  body.innerHTML = `<div class="glass panel"><h3>代理房源审核</h3>
  ${state.submissions.length ? state.submissions.map((s) => {
    const agent = state.profiles.find((p) => p.id === s.agent_id);
    return `<div class="list-item"><strong>${esc(s.title)}</strong> — ${money(s.price)} · ${esc(s.city || "")} · 提交人：${esc(agent ? (agent.display_name || agent.email) : s.agent_id)} · 状态：${esc(s.status)}
      <div class="row-actions">
        <button class="btn small" onclick="reviewSubmission('${s.id}', true)">通过并上架</button>
        <button class="btn small danger" onclick="reviewSubmission('${s.id}', false)">拒绝</button>
      </div></div>`;
  }).join("") : "<p>暂无提交。</p>"}</div>`;
}
window.reviewSubmission = async function (id, ok) {
  const s = state.submissions.find((x) => x.id === id); if (!s) return;
  if (DEMO_MODE) {
    s.status = ok ? "approved" : "rejected";
    if (ok) DEMO.listings.unshift({ id: "b" + Date.now(), title: s.title, address: s.address, city: s.city, price: s.price, beds: s.beds, baths: s.baths, sqft: s.sqft, status: "在售", zillow_url: s.zillow_url || "" });
    await refresh(); return;
  }
  const { error } = await sb.from("agent_submissions").update({ status: ok ? "approved" : "rejected" }).eq("id", id);
  if (error) { alert("操作失败：" + error.message); return; }
  if (ok) {
    await sb.from("listings").insert({ title: s.title, address: s.address, city: s.city, price: s.price,
      beds: s.beds, baths: s.baths, sqft: s.sqft, photo_url: s.photo_url, zillow_url: s.zillow_url,
      status: "在售", is_public: true, created_by: s.agent_id });
  }
  await refresh();
};

function adminRolesTab(body) {
  body.innerHTML = `<div class="glass panel"><h3>账号角色管理</h3>
  ${state.profiles.map((p) => `<div class="list-item">${esc(p.display_name || "")} ${esc(p.email)} —
    <select onchange="setRole('${p.id}', this.value)">
      ${["visitor", "investor", "agent", "admin"].map((r) => `<option value="${r}" ${p.role === r ? "selected" : ""}>${r}</option>`).join("")}
    </select></div>`).join("") || "<p>暂无账号。</p>"}
  <p class="form-msg">提示：新注册账号默认是 visitor；把合作伙伴改成 investor、外部代理改成 agent 后，他们登录即按对应权限看数据。</p></div>`;
}
window.setRole = async function (id, role) {
  if (DEMO_MODE) { const p = DEMO.profiles.find((x) => x.id === id); if (p) p.role = role; return; }
  const { error } = await sb.from("profiles").update({ role }).eq("id", id);
  if (error) alert("修改失败：" + error.message);
};

/* ---------------- auth ---------------- */
let authMode = "login";
function openAuth() { $("#auth-modal").classList.remove("hidden"); }
function closeAuth() { $("#auth-modal").classList.add("hidden"); }

async function syncAuthUI() {
  const badge = $("#user-badge"), btnA = $("#btn-auth"), btnL = $("#btn-logout");
  if (DEMO_MODE) {
    btnA.classList.add("hidden"); btnL.classList.add("hidden");
    badge.classList.remove("hidden");
    badge.textContent = "演示身份：" + state.role;
    return;
  }
  if (state.user) {
    const { data } = await sb.from("profiles").select("*").eq("id", state.user.id).single();
    state.profile = data || null;
    state.role = (data && data.role) || "visitor";
    badge.classList.remove("hidden");
    badge.textContent = (data && (data.display_name || data.email)) + " · " + state.role;
    btnA.classList.add("hidden"); btnL.classList.remove("hidden");
  } else {
    state.role = "visitor"; state.profile = null;
    badge.classList.add("hidden"); btnA.classList.remove("hidden"); btnL.classList.add("hidden");
  }
}

async function onAuthSubmit(e) {
  e.preventDefault();
  const email = $("#auth-email").value, pw = $("#auth-password").value, msg = $("#auth-msg");
  msg.textContent = ""; msg.className = "form-msg";
  if (authMode === "signup") {
    const { error } = await sb.auth.signUp({ email, password: pw, options: { data: { display_name: $("#auth-name").value } } });
    if (error) { msg.textContent = error.message; msg.classList.add("err"); return; }
    msg.textContent = "注册成功。如邮箱确认已开启，请先去邮箱点确认链接再登录。"; msg.classList.add("ok");
    return;
  }
  const { error } = await sb.auth.signInWithPassword({ email, password: pw });
  if (error) { msg.textContent = error.message; msg.classList.add("err"); return; }
  closeAuth();
}

/* ---------------- password reset ---------------- */
function openReset() { $("#reset-modal").classList.remove("hidden"); }
function closeReset() { $("#reset-modal").classList.add("hidden"); }

async function onForgotPassword(e) {
  e.preventDefault();
  const email = $("#auth-email").value.trim();
  const msg = $("#auth-reset-msg");
  msg.textContent = ""; msg.className = "form-msg";
  if (!email) { msg.textContent = "请先填写邮箱，再点「忘记密码？」。"; msg.classList.add("err"); return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  });
  if (error) { msg.textContent = error.message; msg.classList.add("err"); return; }
  msg.textContent = "重置邮件已发送，请去邮箱点链接设置新密码"; msg.classList.add("ok");
}

async function onResetSubmit(e) {
  e.preventDefault();
  const pw = $("#reset-password").value, pw2 = $("#reset-password2").value, msg = $("#reset-msg");
  msg.textContent = ""; msg.className = "form-msg";
  if (pw.length < 6) { msg.textContent = "密码至少需要 6 位。"; msg.classList.add("err"); return; }
  if (pw !== pw2) { msg.textContent = "两次输入的密码不一致。"; msg.classList.add("err"); return; }
  const { error } = await sb.auth.updateUser({ password: pw });
  if (error) { msg.textContent = error.message; msg.classList.add("err"); return; }
  closeReset();
  await sb.auth.signOut(); // 退出重置会话，回到未登录状态用新密码登录
  authMode = "login";
  $("#auth-title").textContent = "登录";
  $("#auth-submit").textContent = "登录";
  $("#auth-name-wrap").classList.add("hidden");
  $("#auth-toggle").textContent = "没有账号？注册";
  $("#auth-forgot").classList.remove("hidden");
  const amsg = $("#auth-msg");
  amsg.textContent = "密码已更新，请用新密码登录"; amsg.className = "form-msg ok";
  openAuth();
}

/* ---------------- orchestration ---------------- */
async function refresh() {
  await loadPublic();
  await loadInvestorTier();
  await loadMyInvestments();
  await loadAdminData();
  await loadAgentData();
  await loadRentals();
  renderRates(); renderListings(); renderProjects(); renderMyMoney();
  renderAgent(); renderAdmin(); renderRentals();
  $("#project-detail").innerHTML = "";
}

async function init() {
  // theme
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  $("#btn-theme").addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme === "dark" ? "" : "dark";
    document.documentElement.dataset.theme = cur;
    localStorage.setItem("theme", cur);
  });

  if (DEMO_MODE) {
    $("#demo-bar").classList.remove("hidden");
    $("#demo-role").addEventListener("change", async (e) => { state.role = e.target.value; await syncAuthUI(); await refresh(); });
  } else {
    $("#btn-auth").addEventListener("click", openAuth);
    $("#auth-close").addEventListener("click", closeAuth);
    $("#auth-toggle").addEventListener("click", (e) => {
      e.preventDefault();
      authMode = authMode === "login" ? "signup" : "login";
      $("#auth-title").textContent = authMode === "login" ? "登录" : "注册";
      $("#auth-submit").textContent = authMode === "login" ? "登录" : "注册";
      $("#auth-name-wrap").classList.toggle("hidden", authMode === "login");
      $("#auth-toggle").textContent = authMode === "login" ? "没有账号？注册" : "已有账号？登录";
      $("#auth-forgot").classList.toggle("hidden", authMode === "signup");
      $("#auth-reset-msg").textContent = ""; $("#auth-reset-msg").className = "form-msg";
    });
    $("#auth-form").addEventListener("submit", onAuthSubmit);
    $("#auth-forgot").addEventListener("click", onForgotPassword);
    $("#reset-form").addEventListener("submit", onResetSubmit);
    $("#reset-close").addEventListener("click", closeReset);
    $("#btn-logout").addEventListener("click", async () => { await sb.auth.signOut(); });
    const { data } = await sb.auth.getSession();
    state.user = data.session ? data.session.user : null;
    if (window.location.hash.indexOf("type=recovery") >= 0) openReset();
    sb.auth.onAuthStateChange(async (event, session) => {
      state.user = session ? session.user : null;
      if (event === "PASSWORD_RECOVERY") openReset();
      await syncAuthUI(); await refresh();
    });
  }
  await syncAuthUI();
  await refresh();
}

document.addEventListener("DOMContentLoaded", init);

/* ================= 出租物业模块 (Rentals) =================
   分级：游客看 public_rentals 概要+年回报；投资人看自己物业的部分明细（无租客个人信息）；
   管理员看全部（含租客电话）并可增删改。 */
const UTIL_NAMES = { water: "水", electric: "电", gas: "煤气", trash: "垃圾" };
const RENO_KINDS = { pre_reno: "拿房前翻新", renovation: "翻新", repair: "维修", eviction: "赶租客/清退", other: "其他" };
const EXP_CATS = { insurance: "保险", property_tax: "地产税", trash: "垃圾费", water: "水费", electric: "电费", gas: "煤气费", maintenance: "维修维护", other: "其他" };

const DEMO_RENTALS = {
  pub: [
    { id: "r1", label: "Elliott Ave 多户公寓（DEMO）", type: "multi_family", city: "South El Monte", state: "CA", unit_count: 7, occupied_count: 7, gross_annual_rent: 88884, annualized_return_pct: 6.8 },
    { id: "r2", label: "Walnut 独立屋（DEMO）", type: "single_family", city: "Walnut", state: "CA", unit_count: 1, occupied_count: 1, gross_annual_rent: 39600, annualized_return_pct: 5.9 }
  ],
  props: [
    { id: "r1", label: "Elliott Ave 多户公寓（DEMO）", type: "multi_family", address: "10808 Elliott Ave", city: "South El Monte", zip: "91733", owner_entity: "TRIPLE CO INVESTMENT LLC", project_id: null, purchase_price: 997000, total_investment: null, insurance_carrier: "DEMO Insurance", insurance_policy_no: "DEMO-001", insurance_premium: 4200, insurance_due_date: "2027-03-01", property_tax_annual: 23250.23, notes: "" },
    { id: "r2", label: "Walnut 独立屋（DEMO）", type: "single_family", address: "（演示地址）", city: "Walnut", zip: "91789", owner_entity: "House Well Group LLC", project_id: null, purchase_price: 595000, total_investment: null, insurance_carrier: "", insurance_policy_no: "", insurance_premium: 1800, insurance_due_date: "2027-01-15", property_tax_annual: 7500, notes: "" }
  ],
  units: [
    { id: "u1", property_id: "r1", unit_label: "A", beds: 2, baths: 1, sqft: 850, market_rent: 1150, util_water: "landlord", util_electric: "tenant", util_gas: "tenant", util_trash: "landlord", status: "occupied" },
    { id: "u2", property_id: "r1", unit_label: "B", beds: 2, baths: 1, sqft: 850, market_rent: 1100, util_water: "landlord", util_electric: "tenant", util_gas: "tenant", util_trash: "landlord", status: "occupied" },
    { id: "u3", property_id: "r2", unit_label: "主屋", beds: 4, baths: 3, sqft: 2100, market_rent: 3300, util_water: "tenant", util_electric: "tenant", util_gas: "tenant", util_trash: "tenant", status: "occupied" }
  ],
  tenants: [
    { id: "t1", unit_id: "u1", name: "演示租客 A (DEMO)", phone: "626-555-0101", email: "", lease_start: "2026-01-01", lease_end: "2026-12-31", rent_amount: 1057, due_day: 1, deposit: 1057, status: "active" },
    { id: "t2", unit_id: "u2", name: "演示租客 B (DEMO)", phone: "626-555-0102", email: "", lease_start: "2026-03-01", lease_end: "2027-02-28", rent_amount: 1000, due_day: 1, deposit: 1000, status: "active" },
    { id: "t3", unit_id: "u3", name: "演示租客 C (DEMO)", phone: "626-555-0103", email: "", lease_start: "2025-09-01", lease_end: "2026-08-31", rent_amount: 3300, due_day: 1, deposit: 3300, status: "active" }
  ],
  expenses: [
    { id: "e1", property_id: "r1", unit_id: null, category: "property_tax", description: "地产税第一期", amount: 11625.12, due_date: "2026-12-10", paid_date: null, vendor: "LA County", recurring: "semiannual" },
    { id: "e2", property_id: "r1", unit_id: null, category: "trash", description: "垃圾费", amount: 210, due_date: "2026-11-15", paid_date: null, vendor: "", recurring: "monthly" }
  ],
  payments: [],
  reno: [
    { id: "rn1", property_id: "r1", item: "全屋翻新 (DEMO)", amount: 85000, spent_date: "2025-06-01", note: "" },
    { id: "rn2", property_id: "r1", item: "换屋顶 (DEMO)", amount: 18000, spent_date: "2025-08-15", note: "" },
    { id: "rn3", property_id: "r2", item: "厨房翻新 (DEMO)", amount: 25000, spent_date: "2025-03-10", note: "" }
  ]
};

async function loadRentals() {
  state.rentalsPublic = []; state.rentalProps = []; state.rentalUnits = []; state.rentalExpenses = [];
  state.rentalCollections = []; state.rentRoll = []; state.rentalTenants = []; state.rentalPayments = []; state.rentalReno = [];
  if (DEMO_MODE) {
    state.rentalsPublic = DEMO_RENTALS.pub.slice();
    if (["investor", "admin"].includes(state.role)) {
      state.rentalProps = DEMO_RENTALS.props.slice();
      state.rentalUnits = DEMO_RENTALS.units.slice();
      state.rentalExpenses = DEMO_RENTALS.expenses.slice();
      state.rentalReno = DEMO_RENTALS.reno.slice();
    }
    if (state.role === "admin") {
      state.rentalTenants = DEMO_RENTALS.tenants.slice();
      state.rentalPayments = DEMO_RENTALS.payments.slice();
      state.rentRoll = buildDemoRentRoll();
    }
    return;
  }
  const pub = await sb.from("public_rentals").select("*");
  state.rentalsPublic = pub.data || [];
  if (!state.user) return;
  if (["investor", "admin"].includes(state.role)) {
    const [rp, un, ex, rn] = await Promise.all([
      sb.from("rental_properties").select("*").order("created_at"),
      sb.from("units").select("*").order("unit_label"),
      sb.from("property_expenses").select("*").order("due_date", { ascending: false }),
      sb.from("rental_reno_lines").select("*").order("spent_date")
    ]);
    state.rentalProps = rp.data || []; state.rentalUnits = un.data || []; state.rentalExpenses = ex.data || []; state.rentalReno = rn.data || [];
    if (state.role === "investor") {
      const col = await sb.from("investor_rental_collections").select("*").order("period", { ascending: false });
      state.rentalCollections = col.data || [];
    }
  }
  if (state.role === "admin") {
    const [tn, rr, pm] = await Promise.all([
      sb.from("tenants").select("*").order("created_at"),
      sb.from("rent_roll_current").select("*"),
      sb.from("rent_payments").select("*").order("period", { ascending: false }).limit(200)
    ]);
    state.rentalTenants = tn.data || []; state.rentRoll = rr.data || []; state.rentalPayments = pm.data || [];
  }
}

function buildDemoRentRoll() {
  const period = new Date().toISOString().slice(0, 7);
  return DEMO_RENTALS.tenants.filter((t) => t.status === "active").map((t) => {
    const u = DEMO_RENTALS.units.find((x) => x.id === t.unit_id);
    const p = DEMO_RENTALS.props.find((x) => x.id === (u && u.property_id));
    return { property_id: p && p.id, property_label: p && p.label, unit_label: u && u.unit_label, tenant_id: t.id, tenant_name: t.name, tenant_phone: t.phone, rent_amount: t.rent_amount, due_day: t.due_day, period, amount_paid: 0, pay_status: "unpaid", days_late_est: Math.max(0, new Date().getDate() - t.due_day) };
  });
}

function rentalCard(r) {
  const typeName = r.type === "multi_family" ? "多户 Multi-family" : "独立屋 Single-family";
  const ret = r.annualized_return_pct == null ? "—" : Number(r.annualized_return_pct).toFixed(1) + "%";
  return `<div class="glass card">
    ${r.photo_url ? `<img class="card-photo" src="${esc(r.photo_url)}" alt="">` : ""}
    <h3>${esc(r.label)}</h3>
    <p>${typeName} · ${esc(r.city || "")}, ${esc(r.state || "CA")}</p>
    <div class="kv"><span>户数</span><strong>${r.unit_count} 户（在租 ${r.occupied_count}）</strong></div>
    <div class="kv"><span>年租金（毛）</span><strong>$${Number(r.gross_annual_rent || 0).toLocaleString()}</strong></div>
    <div class="kv"><span>年回报</span><strong>${ret}</strong></div>
  </div>`;
}

function renderRentals() {
  const grid = $("#rental-grid"); if (!grid) return;
  grid.innerHTML = state.rentalsPublic.map(rentalCard).join("") || "<p>暂无出租物业。</p>";
  const inv = $("#rental-investor"); if (!inv) return;
  if (!["investor", "admin"].includes(state.role) || !state.rentalProps.length) { inv.innerHTML = ""; return; }
  inv.innerHTML = state.rentalProps.map((p) => {
    const units = state.rentalUnits.filter((u) => u.property_id === p.id);
    const tenantByUnit = {};
    state.rentalTenants.forEach((t) => { if (t.status === "active") tenantByUnit[t.unit_id] = t; });
    const rows = units.map((u) => {
      const t = tenantByUnit[u.id];
      const rent = t ? t.rent_amount : u.market_rent;
      const utils = ["water", "electric", "gas", "trash"].map((k) => `${UTIL_NAMES[k]}：${u["util_" + k] === "landlord" ? "房东" : u["util_" + k] === "tenant" ? "租客" : "—"}`).join(" · ");
      return `<div class="list-item"><strong>${esc(u.unit_label)}</strong> — ${u.status === "occupied" ? "在租" : "空置"} · 月租 $${Number(rent || 0).toLocaleString()}<br><span class="form-msg">${utils}</span></div>`;
    }).join("");
    const cols = state.rentalCollections.filter((c) => c.property_id === p.id).slice(0, 6)
      .map((c) => `<div class="list-item">${esc(c.period)}：应收 $${Number(c.amount_due).toLocaleString()} · 实收 $${Number(c.amount_paid).toLocaleString()}</div>`).join("");
    const exps = state.rentalExpenses.filter((e) => e.property_id === p.id).slice(0, 8)
      .map((e) => `<div class="list-item">${EXP_CATS[e.category] || e.category} $${Number(e.amount).toLocaleString()} · 到期 ${esc(e.due_date || "—")} · ${e.paid_date ? "已付 " + esc(e.paid_date) : "未付"}</div>`).join("");
    const renoLines = state.rentalReno.filter((l) => l.property_id === p.id);
    const renoTotal = renoLines.reduce((s, l) => s + Number(l.amount || 0), 0);
    const cutoff = Date.now() - 365 * 24 * 3600 * 1000;
    const annualMaint = state.rentalExpenses.filter((e) => e.property_id === p.id && e.category === "maintenance" && e.paid_date && new Date(e.paid_date).getTime() >= cutoff)
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const baseInvest = Number(p.purchase_price != null ? p.purchase_price : (p.total_investment || 0));
    const renoHtml = renoLines.map((l) => `<div class="list-item">${RENO_KINDS[l.kind] || ""} · ${esc(l.item)} · $${Number(l.amount || 0).toLocaleString()} · ${esc(l.spent_date || "—")}${l.note ? " · " + esc(l.note) : ""}</div>`).join("");
    return `<div class="glass panel"><h3>${esc(p.label)} — ${state.role === "admin" ? "明细" : "我的物业明细（部分）"}</h3>
      <div class="kv"><span>买入价</span><strong>$${baseInvest.toLocaleString()}</strong></div>
      <div class="kv"><span>翻新维修合计</span><strong>$${renoTotal.toLocaleString()}</strong></div>
      <div class="kv"><span>总投资额</span><strong>$${(baseInvest + renoTotal).toLocaleString()}</strong></div>
      <div class="kv"><span>年维护花费（近12个月）</span><strong>$${annualMaint.toLocaleString()}</strong></div>
      ${renoHtml ? "<h4>翻新维修账（含赶租客清退）</h4>" + renoHtml : ""}
      <div class="kv"><span>保险</span><strong>${esc(p.insurance_carrier || "—")} · 保费 $${Number(p.insurance_premium || 0).toLocaleString()} · 到期 ${esc(p.insurance_due_date || "—")}</strong></div>
      <div class="kv"><span>年地产税</span><strong>$${Number(p.property_tax_annual || 0).toLocaleString()}（两期：12/10、4/10）</strong></div>
      <h4>每一户</h4>${rows || "<p>暂无户数据。</p>"}
      ${cols ? "<h4>收租汇总（按月）</h4>" + cols : ""}
      ${exps ? "<h4>费用</h4>" + exps : ""}
    </div>`;
  }).join("");
}

/* ---------------- 管理员：出租管理 ---------------- */
function adminRentalsTab(body) {
  const period = new Date().toISOString().slice(0, 7);
  const roll = state.rentRoll;
  const dueTotal = roll.reduce((s, r) => s + Number(r.rent_amount || 0), 0);
  const paidTotal = roll.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
  const unpaid = roll.filter((r) => r.pay_status !== "paid");
  const rollRows = roll.map((r) => `<div class="list-item">
    <strong>${esc(r.property_label)}</strong> · ${esc(r.unit_label)} · ${esc(r.tenant_name)} · <a href="tel:${esc(r.tenant_phone || "")}">${esc(r.tenant_phone || "")}</a>
    — 应收 $${Number(r.rent_amount || 0).toLocaleString()} · 已收 $${Number(r.amount_paid || 0).toLocaleString()} ·
    ${r.pay_status === "paid" ? "✅ 已付" : r.pay_status === "partial" ? "◐ 部分" : "⚠️ 未付" + (r.days_late_est > 0 ? "（逾期约 " + r.days_late_est + " 天）" : "")}
    ${r.pay_status !== "paid" ? `<button class="btn small" onclick="markPaidPrompt('${r.tenant_id}', ${Number(r.rent_amount || 0)}, ${Number(r.amount_paid || 0)})">登记收款</button>` : ""}
  </div>`).join("");
  const smsText = "Hi, this is a friendly reminder that your rent of $X for [unit] was due on the 1st and is still outstanding. Please arrange payment as soon as possible. Thank you!";
  const upcoming = state.rentalExpenses.filter((e) => !e.paid_date).slice(0, 12)
    .map((e) => { const p = state.rentalProps.find((x) => x.id === e.property_id); return `<div class="list-item">${esc(p ? p.label : "")} · ${EXP_CATS[e.category] || e.category} $${Number(e.amount).toLocaleString()} · 到期 ${esc(e.due_date || "—")} ${e.vendor ? "· " + esc(e.vendor) : ""}</div>`; }).join("");
  const propOpts = state.rentalProps.map((p) => `<option value="${p.id}">${esc(p.label)}</option>`).join("");
  const unitOpts = state.rentalUnits.map((u) => { const p = state.rentalProps.find((x) => x.id === u.property_id); return `<option value="${u.id}">${esc(p ? p.label : "")} · ${esc(u.unit_label)}</option>`; }).join("");
  const projOpts = state.projects.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join("");

  body.innerHTML = `
  <div class="glass panel">
    <h3>本月收租总览（${period}）</h3>
    <div class="kv"><span>应收合计</span><strong>$${dueTotal.toLocaleString()}</strong></div>
    <div class="kv"><span>已收合计</span><strong>$${paidTotal.toLocaleString()}</strong></div>
    <div class="kv"><span>未收户数</span><strong>${unpaid.length}</strong></div>
    ${rollRows || "<p>暂无在租租客。</p>"}
    <div class="row-actions"><button class="btn small" id="gen-bills">生成本月应收记录</button></div>
    <h4>收款记录（可修正 / 删除）</h4>
    ${state.rentalPayments.slice(0, 40).map((pm) => { const t = state.rentalTenants.find((x) => x.id === pm.tenant_id); return `<div class="list-item">${esc(pm.period || "")} · ${esc(t ? t.name : "")} · 应收 $${Number(pm.amount_due || 0).toLocaleString()} · 已收 $${Number(pm.amount_paid || 0).toLocaleString()}${pm.paid_date ? " · " + esc(pm.paid_date) : ""}${pm.method ? " · " + esc(pm.method) : ""} <button class="btn small" onclick="fixPayment('${pm.id}')">修正</button> <button class="btn small danger" onclick="delPayment('${pm.id}')">删除</button></div>`; }).join("") || "<p>暂无收款记录。</p>"}
    <h4>催缴名单（短信）</h4>
    ${unpaid.length ? unpaid.map((r) => `<div class="list-item">${esc(r.tenant_name)} · ${esc(r.unit_label)} · $${Number(Number(r.rent_amount || 0) - Number(r.amount_paid || 0)).toLocaleString()} 未付 · <a href="sms:${esc(r.tenant_phone || "")}">发短信</a> · <a href="tel:${esc(r.tenant_phone || "")}">${esc(r.tenant_phone || "")}</a></div>`).join("") : "<p>本月全部收齐 🎉</p>"}
    <p class="form-msg">催缴模板（英文）：${esc(smsText)} — 点「发短信」用手机短信单发；群发功能需接短信服务商（Twilio）后上线。</p>
    <h4>待付费用（未付，到期在前）</h4>
    ${upcoming || "<p>暂无未付费用。</p>"}
  </div>

  <div class="glass panel">
    <h3 id="rp-title">新增出租物业</h3>
    <form id="rp-form"><div class="form-grid">
      <label>名称<input name="label" required placeholder="如 Elliott Ave 七户"></label>
      <label>类型<select name="type"><option value="multi_family">多户 Multi-family</option><option value="single_family">独立屋 Single-family</option></select></label>
      <label>地址<input name="address"></label><label>城市<input name="city"></label><label>邮编<input name="zip"></label>
      <label>持有公司<input name="owner_entity"></label>
      <label>照片 URL（认楼用）<input name="photo_url"></label>
      <label>关联投资项目（决定投资人可见）<select name="project_id"><option value="">不关联</option>${projOpts}</select></label>
      <label>买入价<input name="purchase_price" type="number"></label>
      <label>总投入（无买入价时用这个算年回报）<input name="total_investment" type="number"></label>
      <label>保险公司<input name="insurance_carrier"></label><label>保单号<input name="insurance_policy_no"></label>
      <label>年保费<input name="insurance_premium" type="number" step="0.01"></label>
      <label>保险到期日<input name="insurance_due_date" type="date"></label>
      <label>年地产税<input name="property_tax_annual" type="number" step="0.01"></label>
    </div><label>备注<textarea name="notes"></textarea></label>
    <div class="row-actions"><button class="btn btn-pill" type="submit" id="rp-submit">添加物业</button><button class="btn small" type="button" id="rp-cancel" style="display:none" onclick="cancelEditProp()">取消编辑</button></div>
    <p class="form-msg" id="rp-msg"></p></form>
    ${state.rentalProps.map((p) => `<div class="list-item">${esc(p.label)}（${p.type === "multi_family" ? "多户" : "独立屋"}）<button class="btn small" onclick="editRentalProp('${p.id}')">编辑</button> <button class="btn small danger" onclick="delRentalProp('${p.id}')">删除</button></div>`).join("")}
  </div>

  <div class="glass panel">
    <h3>新增户 / 租客</h3>
    <h4 id="unit-title">新增户</h4>
    <form id="unit-form"><div class="form-grid">
      <label>物业<select name="property_id">${propOpts}</select></label>
      <label>户号<input name="unit_label" required placeholder="A / 101 / 主屋"></label>
      <label>卧室<input name="beds" type="number" step="0.5"></label><label>卫生间<input name="baths" type="number" step="0.5"></label>
      <label>面积 sqft<input name="sqft" type="number"></label><label>市场租金<input name="market_rent" type="number"></label>
      <label>水费<select name="util_water"><option value="landlord">房东付</option><option value="tenant">租客付</option></select></label>
      <label>电费<select name="util_electric"><option value="tenant">租客付</option><option value="landlord">房东付</option></select></label>
      <label>煤气<select name="util_gas"><option value="tenant">租客付</option><option value="landlord">房东付</option></select></label>
      <label>垃圾<select name="util_trash"><option value="landlord">房东付</option><option value="tenant">租客付</option></select></label>
      <label>状态<select name="status"><option value="occupied">在租</option><option value="vacant">空置</option></select></label>
    </div><div class="row-actions"><button class="btn small" type="submit" id="unit-submit">添加户</button><button class="btn small" type="button" id="unit-cancel" style="display:none" onclick="cancelEditUnit()">取消编辑</button></div><p class="form-msg" id="unit-msg"></p></form>
    ${state.rentalUnits.map((u) => { const p = state.rentalProps.find((x) => x.id === u.property_id); return `<div class="list-item">${esc(p ? p.label : "")} · ${esc(u.unit_label)} · ${u.beds ?? "—"}卧/${u.baths ?? "—"}卫 · 市场租金 $${Number(u.market_rent || 0).toLocaleString()} · ${u.status === "occupied" ? "在租" : "空置"} <button class="btn small" onclick="editUnit('${u.id}')">编辑</button> <button class="btn small danger" onclick="delUnit('${u.id}')">删除</button></div>`; }).join("")}
    <h4 id="tenant-title">新增租客</h4>
    <form id="tenant-form"><div class="form-grid">
      <label>户<select name="unit_id">${unitOpts}</select></label>
      <label>租客姓名<input name="name" required></label>
      <label>手机号（催缴用）<input name="phone"></label>
      <label>邮箱<input name="email"></label>
      <label>月租<input name="rent_amount" type="number" step="0.01" required></label>
      <label>每月到期日<input name="due_day" type="number" value="1" min="1" max="28"></label>
      <label>押金<input name="deposit" type="number" step="0.01"></label>
      <label>租约开始<input name="lease_start" type="date"></label><label>租约结束<input name="lease_end" type="date"></label>
    </div><div class="row-actions"><button class="btn small" type="submit" id="tenant-submit">添加租客</button><button class="btn small" type="button" id="tenant-cancel" style="display:none" onclick="cancelEditTenant()">取消编辑</button></div><p class="form-msg" id="tenant-msg"></p></form>
    ${state.rentalTenants.map((t) => { const u = state.rentalUnits.find((x) => x.id === t.unit_id); return `<div class="list-item">${esc(t.name)} · ${esc(u ? u.unit_label : "")} · $${Number(t.rent_amount || 0).toLocaleString()}/月 · ${esc(t.phone || "")} · 租约至 ${esc(t.lease_end || "—")} <button class="btn small" onclick="editTenant('${t.id}')">编辑</button> <button class="btn small danger" onclick="delTenant('${t.id}')">删除</button></div>`; }).join("")}
  </div>

  <div class="glass panel">
    <h3 id="exp-title">新增费用</h3>
    <form id="exp-form"><div class="form-grid">
      <label>物业<select name="property_id">${propOpts}</select></label>
      <label>类别<select name="category">${Object.keys(EXP_CATS).map((k) => `<option value="${k}">${EXP_CATS[k]}</option>`).join("")}</select></label>
      <label>说明<input name="description"></label>
      <label>金额<input name="amount" type="number" step="0.01" required></label>
      <label>到期日<input name="due_date" type="date"></label><label>已付日<input name="paid_date" type="date"></label>
      <label>供应商<input name="vendor"></label>
      <label>周期<select name="recurring"><option value="one_time">一次性</option><option value="monthly">每月</option><option value="quarterly">每季</option><option value="semiannual">每半年</option><option value="annual">每年</option></select></label>
    </div><div class="row-actions"><button class="btn small" type="submit" id="exp-submit">添加费用</button><button class="btn small" type="button" id="exp-cancel" style="display:none" onclick="cancelEditExpense()">取消编辑</button></div><p class="form-msg" id="exp-msg"></p></form>
    ${state.rentalExpenses.slice().sort((a, b) => String(b.due_date || "").localeCompare(String(a.due_date || ""))).slice(0, 40).map((e) => { const p = state.rentalProps.find((x) => x.id === e.property_id); return `<div class="list-item">${esc(p ? p.label : "")} · ${EXP_CATS[e.category] || e.category} · ${esc(e.description || "")} · $${Number(e.amount || 0).toLocaleString()} · 到期 ${esc(e.due_date || "—")}${e.paid_date ? " · 已付 " + esc(e.paid_date) : " · 未付"} <button class="btn small" onclick="editExpense('${e.id}')">编辑</button> <button class="btn small danger" onclick="delExpense('${e.id}')">删除</button></div>`; }).join("")}
  </div>

  <div class="glass panel">
    <h3 id="reno-title">翻新维修账（计入总投资额）</h3>
    <form id="reno-form"><div class="form-grid">
      <label>物业<select name="property_id">${propOpts}</select></label>
      <label>分类<select name="kind"><option value="pre_reno">拿房前翻新</option><option value="renovation">翻新</option><option value="repair">维修</option><option value="eviction">赶租客 / 清退</option><option value="other">其他</option></select></label>
      <label>项目<input name="item" required placeholder="如 全屋翻新 / 换屋顶 / 律师费清退"></label>
      <label>金额<input name="amount" type="number" step="0.01" required></label>
      <label>日期<input name="spent_date" type="date"></label>
      <label>备注<input name="note"></label>
    </div><div class="row-actions"><button class="btn small" type="submit" id="reno-submit">添加一笔</button><button class="btn small" type="button" id="reno-cancel" style="display:none" onclick="cancelEditRenoLine()">取消编辑</button></div><p class="form-msg" id="reno-msg"></p></form>
    ${state.rentalProps.map((p) => {
      const lines = state.rentalReno.filter((l) => l.property_id === p.id);
      if (!lines.length) return "";
      const tot = lines.reduce((s, l) => s + Number(l.amount || 0), 0);
      const base = Number(p.purchase_price != null ? p.purchase_price : (p.total_investment || 0));
      return `<h4>${esc(p.label)} — 翻新维修合计 $${tot.toLocaleString()} · 买入价 $${base.toLocaleString()} · 总投资额 $${(base + tot).toLocaleString()}</h4>` +
        lines.map((l) => `<div class="list-item">${RENO_KINDS[l.kind] || ""} · ${esc(l.item)} · $${Number(l.amount || 0).toLocaleString()} · ${esc(l.spent_date || "—")} <button class="btn small" onclick="editRenoLine('${l.id}')">编辑</button> <button class="btn small danger" onclick="delRenoLine('${l.id}')">删除</button></div>`).join("");
    }).join("")}
  </div>`;

  const numOrNull = (v) => (v === "" || v == null ? null : Number(v));
  $("#gen-bills").addEventListener("click", genMonthlyBills);
  $("#rp-form").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = new FormData(e.target), msg = $("#rp-msg");
    const row = { label: f.get("label"), type: f.get("type"), address: f.get("address") || null, city: f.get("city") || null, zip: f.get("zip") || null,
      owner_entity: f.get("owner_entity") || null, photo_url: f.get("photo_url") || null, project_id: f.get("project_id") || null, purchase_price: numOrNull(f.get("purchase_price")), total_investment: numOrNull(f.get("total_investment")),
      insurance_carrier: f.get("insurance_carrier") || null, insurance_policy_no: f.get("insurance_policy_no") || null,
      insurance_premium: numOrNull(f.get("insurance_premium")), insurance_due_date: f.get("insurance_due_date") || null,
      property_tax_annual: numOrNull(f.get("property_tax_annual")), notes: f.get("notes") || null };
    if (DEMO_MODE) { msg.textContent = "演示模式：不保存。"; msg.className = "form-msg"; return; }
    let error;
    if (window.__editingPropId) {
      ({ error } = await sb.from("rental_properties").update(row).eq("id", window.__editingPropId));
      if (!error) window.__editingPropId = null;
      msg.textContent = error ? error.message : "已保存修改。";
    } else {
      ({ error } = await sb.from("rental_properties").insert(row));
      msg.textContent = error ? error.message : "已添加。";
    }
    msg.className = "form-msg " + (error ? "err" : "ok");
    if (!error) await refresh();
  });
  $("#unit-form").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = new FormData(e.target), msg = $("#unit-msg");
    const row = { property_id: f.get("property_id"), unit_label: f.get("unit_label"), beds: numOrNull(f.get("beds")), baths: numOrNull(f.get("baths")),
      sqft: numOrNull(f.get("sqft")), market_rent: numOrNull(f.get("market_rent")), util_water: f.get("util_water"), util_electric: f.get("util_electric"),
      util_gas: f.get("util_gas"), util_trash: f.get("util_trash"), status: f.get("status") };
    if (DEMO_MODE) { msg.textContent = "演示模式：不保存。"; return; }
    let error;
    if (window.__editingUnitId) {
      ({ error } = await sb.from("units").update(row).eq("id", window.__editingUnitId));
      if (!error) window.__editingUnitId = null;
      msg.textContent = error ? error.message : "已保存修改。";
    } else {
      ({ error } = await sb.from("units").insert(row));
      msg.textContent = error ? error.message : "已添加。";
    }
    msg.className = "form-msg " + (error ? "err" : "ok");
    if (!error) await refresh();
  });
  $("#tenant-form").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = new FormData(e.target), msg = $("#tenant-msg");
    const row = { unit_id: f.get("unit_id"), name: f.get("name"), phone: f.get("phone") || null, email: f.get("email") || null,
      rent_amount: numOrNull(f.get("rent_amount")), due_day: numOrNull(f.get("due_day")) || 1, deposit: numOrNull(f.get("deposit")),
      lease_start: f.get("lease_start") || null, lease_end: f.get("lease_end") || null, status: "active" };
    if (DEMO_MODE) { msg.textContent = "演示模式：不保存。"; return; }
    let error;
    if (window.__editingTenantId) {
      const upd = Object.assign({}, row); delete upd.status;
      ({ error } = await sb.from("tenants").update(upd).eq("id", window.__editingTenantId));
      if (!error) { window.__editingTenantId = null; await sb.from("units").update({ status: "occupied" }).eq("id", row.unit_id); }
      msg.textContent = error ? error.message : "已保存修改。";
    } else {
      const res = await sb.from("tenants").insert(row).select("id").single();
      error = res.error;
      if (!error && res.data) await sb.from("units").update({ status: "occupied" }).eq("id", row.unit_id);
      msg.textContent = error ? error.message : "已添加。";
    }
    msg.className = "form-msg " + (error ? "err" : "ok");
    if (!error) await refresh();
  });
  $("#exp-form").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = new FormData(e.target), msg = $("#exp-msg");
    const row = { property_id: f.get("property_id"), category: f.get("category"), description: f.get("description") || null,
      amount: numOrNull(f.get("amount")), due_date: f.get("due_date") || null, paid_date: f.get("paid_date") || null,
      vendor: f.get("vendor") || null, recurring: f.get("recurring") };
    if (DEMO_MODE) { msg.textContent = "演示模式：不保存。"; return; }
    let error;
    if (window.__editingExpId) {
      ({ error } = await sb.from("property_expenses").update(row).eq("id", window.__editingExpId));
      if (!error) window.__editingExpId = null;
      msg.textContent = error ? error.message : "已保存修改。";
    } else {
      ({ error } = await sb.from("property_expenses").insert(row));
      msg.textContent = error ? error.message : "已添加。";
    }
    msg.className = "form-msg " + (error ? "err" : "ok");
    if (!error) await refresh();
  });
  $("#reno-form").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = new FormData(e.target), msg = $("#reno-msg");
    const row = { property_id: f.get("property_id"), kind: f.get("kind") || "renovation", item: f.get("item"), amount: numOrNull(f.get("amount")),
      spent_date: f.get("spent_date") || null, note: f.get("note") || null };
    if (DEMO_MODE) { msg.textContent = "演示模式：不保存。"; return; }
    let error;
    if (window.__editingRenoId) {
      ({ error } = await sb.from("rental_reno_lines").update(row).eq("id", window.__editingRenoId));
      if (!error) window.__editingRenoId = null;
      msg.textContent = error ? error.message : "已保存修改。";
    } else {
      ({ error } = await sb.from("rental_reno_lines").insert(row));
      msg.textContent = error ? error.message : "已添加。";
    }
    msg.className = "form-msg " + (error ? "err" : "ok");
    if (!error) await refresh();
  });
}

async function genMonthlyBills() {
  if (DEMO_MODE) { alert("演示模式：不生成。"); return; }
  const period = new Date().toISOString().slice(0, 7);
  const rows = state.rentalTenants.filter((t) => t.status === "active")
    .map((t) => ({ tenant_id: t.id, period, amount_due: t.rent_amount || 0 }));
  if (!rows.length) { alert("暂无在租租客。"); return; }
  const { error } = await sb.from("rent_payments").upsert(rows, { onConflict: "tenant_id,period", ignoreDuplicates: true });
  alert(error ? "生成失败：" + error.message : "已生成 " + period + " 应收记录。");
  if (!error) await refresh();
}

window.markPaidPrompt = async function (tenantId, due, alreadyPaid) {
  const rest = Math.max(0, due - alreadyPaid);
  const v = prompt("登记收款金额（应收 $" + due + "，还差 $" + rest + "）:", rest);
  if (v == null) return;
  const add = Number(v); if (!(add > 0)) { alert("金额无效。"); return; }
  const method = prompt("收款方式（Zelle / 支票 / 现金 / 其他）:", "Zelle") || null;
  if (DEMO_MODE) { alert("演示模式：不保存。"); return; }
  const period = new Date().toISOString().slice(0, 7);
  const { error } = await sb.from("rent_payments").upsert(
    { tenant_id: tenantId, period, amount_due: due, amount_paid: alreadyPaid + add, paid_date: new Date().toISOString().slice(0, 10), method },
    { onConflict: "tenant_id,period" });
  alert(error ? "登记失败：" + error.message : "已登记。");
  if (!error) await refresh();
};

window.fixPayment = async function (id) {
  const pm = state.rentalPayments.find((x) => x.id === id);
  if (!pm) return;
  const v = prompt("修正已收金额（应收 $" + Number(pm.amount_due || 0).toLocaleString() + "，当前已收 $" + Number(pm.amount_paid || 0).toLocaleString() + "）:", pm.amount_paid || 0);
  if (v == null) return;
  const amt = Number(v); if (isNaN(amt) || amt < 0) { alert("金额无效。"); return; }
  if (DEMO_MODE) { alert("演示模式：不保存。"); return; }
  const { error } = await sb.from("rent_payments").update({ amount_paid: amt, paid_date: amt > 0 ? (pm.paid_date || new Date().toISOString().slice(0, 10)) : null }).eq("id", id);
  alert(error ? "修正失败：" + error.message : "已修正。");
  if (!error) await refresh();
};

window.delPayment = async function (id) {
  if (!confirm("确认删除这条收款记录？")) return;
  if (DEMO_MODE) { alert("演示模式：不删除。"); return; }
  const { error } = await sb.from("rent_payments").delete().eq("id", id);
  if (error) alert("删除失败：" + error.message); else await refresh();
};

window.delRentalProp = async function (id) {
  if (!confirm("确认删除该出租物业及其全部户、租客、费用记录？")) return;
  if (DEMO_MODE) { alert("演示模式：不删除。"); return; }
  const { error } = await sb.from("rental_properties").delete().eq("id", id);
  if (error) alert("删除失败：" + error.message); else await refresh();
};

window.editRentalProp = function (id) {
  const p = state.rentalProps.find((x) => x.id === id);
  if (!p) return;
  if (DEMO_MODE) { alert("演示模式：不保存。"); return; }
  const form = $("#rp-form"); if (!form) return;
  const set = (n, v) => { const el = form.elements[n]; if (el) el.value = v == null ? "" : v; };
  set("label", p.label); set("type", p.type || "multi_family"); set("address", p.address); set("city", p.city); set("zip", p.zip);
  set("owner_entity", p.owner_entity); set("photo_url", p.photo_url); set("project_id", p.project_id || "");
  set("purchase_price", p.purchase_price); set("total_investment", p.total_investment);
  set("insurance_carrier", p.insurance_carrier); set("insurance_policy_no", p.insurance_policy_no);
  set("insurance_premium", p.insurance_premium); set("insurance_due_date", p.insurance_due_date);
  set("property_tax_annual", p.property_tax_annual); set("notes", p.notes);
  window.__editingPropId = id;
  const title = $("#rp-title"); if (title) title.textContent = "编辑出租物业：" + (p.label || "");
  const btn = $("#rp-submit"); if (btn) btn.textContent = "保存修改";
  const cancel = $("#rp-cancel"); if (cancel) cancel.style.display = "";
  const msg = $("#rp-msg"); if (msg) { msg.textContent = "正在编辑现有物业，改完点「保存修改」；不改了点「取消编辑」。"; msg.className = "form-msg"; }
  form.scrollIntoView({ behavior: "smooth", block: "start" });
};

window.cancelEditProp = function () {
  window.__editingPropId = null;
  const form = $("#rp-form"); if (form) form.reset();
  const title = $("#rp-title"); if (title) title.textContent = "新增出租物业";
  const btn = $("#rp-submit"); if (btn) btn.textContent = "添加物业";
  const cancel = $("#rp-cancel"); if (cancel) cancel.style.display = "none";
  const msg = $("#rp-msg"); if (msg) msg.textContent = "";
};

function fillForm(formId, obj, fields) {
  const form = $(formId); if (!form) return null;
  const set = (n, v) => { const el = form.elements[n]; if (el) el.value = v == null ? "" : v; };
  fields.forEach((n) => set(n, obj[n]));
  return form;
}
function editUi(formId, titleId, titleText, btnId, btnText, cancelId, msgId) {
  const form = $(formId); if (!form) return;
  const title = $(titleId); if (title) title.textContent = titleText;
  const btn = $(btnId); if (btn) btn.textContent = btnText;
  const cancel = $(cancelId); if (cancel) cancel.style.display = "";
  const msg = $(msgId); if (msg) { msg.textContent = "正在编辑现有记录，改完点「保存修改」；不改了点「取消编辑」。"; msg.className = "form-msg"; }
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}
function cancelUi(flagName, formId, titleId, titleText, btnId, btnText, cancelId, msgId) {
  window[flagName] = null;
  const form = $(formId); if (form) form.reset();
  const title = $(titleId); if (title) title.textContent = titleText;
  const btn = $(btnId); if (btn) btn.textContent = btnText;
  const cancel = $(cancelId); if (cancel) cancel.style.display = "none";
  const msg = $(msgId); if (msg) msg.textContent = "";
}

window.editUnit = function (id) {
  const u = state.rentalUnits.find((x) => x.id === id);
  if (!u) return;
  if (DEMO_MODE) { alert("演示模式：不保存。"); return; }
  if (!fillForm("#unit-form", u, ["property_id", "unit_label", "beds", "baths", "sqft", "market_rent", "util_water", "util_electric", "util_gas", "util_trash", "status"])) return;
  window.__editingUnitId = id;
  editUi("#unit-form", "#unit-title", "编辑户：" + (u.unit_label || ""), "#unit-submit", "保存修改", "#unit-cancel", "#unit-msg");
};
window.cancelEditUnit = function () { cancelUi("__editingUnitId", "#unit-form", "#unit-title", "新增户", "#unit-submit", "添加户", "#unit-cancel", "#unit-msg"); };
window.delUnit = async function (id) {
  if (!confirm("确认删除该户？（该户下的租客会一并受影响）")) return;
  if (DEMO_MODE) { alert("演示模式：不删除。"); return; }
  const { error } = await sb.from("units").delete().eq("id", id);
  if (error) alert("删除失败：" + error.message); else await refresh();
};

window.editTenant = function (id) {
  const t = state.rentalTenants.find((x) => x.id === id);
  if (!t) return;
  if (DEMO_MODE) { alert("演示模式：不保存。"); return; }
  if (!fillForm("#tenant-form", t, ["unit_id", "name", "phone", "email", "rent_amount", "due_day", "deposit", "lease_start", "lease_end"])) return;
  window.__editingTenantId = id;
  editUi("#tenant-form", "#tenant-title", "编辑租客：" + (t.name || ""), "#tenant-submit", "保存修改", "#tenant-cancel", "#tenant-msg");
};
window.cancelEditTenant = function () { cancelUi("__editingTenantId", "#tenant-form", "#tenant-title", "新增租客", "#tenant-submit", "添加租客", "#tenant-cancel", "#tenant-msg"); };

window.editExpense = function (id) {
  const e2 = state.rentalExpenses.find((x) => x.id === id);
  if (!e2) return;
  if (DEMO_MODE) { alert("演示模式：不保存。"); return; }
  if (!fillForm("#exp-form", e2, ["property_id", "category", "description", "amount", "due_date", "paid_date", "vendor", "recurring"])) return;
  window.__editingExpId = id;
  editUi("#exp-form", "#exp-title", "编辑费用", "#exp-submit", "保存修改", "#exp-cancel", "#exp-msg");
};
window.cancelEditExpense = function () { cancelUi("__editingExpId", "#exp-form", "#exp-title", "新增费用", "#exp-submit", "添加费用", "#exp-cancel", "#exp-msg"); };
window.delExpense = async function (id) {
  if (!confirm("确认删除这笔费用？")) return;
  if (DEMO_MODE) { alert("演示模式：不删除。"); return; }
  const { error } = await sb.from("property_expenses").delete().eq("id", id);
  if (error) alert("删除失败：" + error.message); else await refresh();
};

window.editRenoLine = function (id) {
  const l = state.rentalReno.find((x) => x.id === id);
  if (!l) return;
  if (DEMO_MODE) { alert("演示模式：不保存。"); return; }
  if (!fillForm("#reno-form", l, ["property_id", "kind", "item", "amount", "spent_date", "note"])) return;
  window.__editingRenoId = id;
  editUi("#reno-form", "#reno-title", "编辑翻新维修账", "#reno-submit", "保存修改", "#reno-cancel", "#reno-msg");
};
window.cancelEditRenoLine = function () { cancelUi("__editingRenoId", "#reno-form", "#reno-title", "翻新维修账（计入总投资额）", "#reno-submit", "添加一笔", "#reno-cancel", "#reno-msg"); };

window.delRenoLine = async function (id) {
  if (!confirm("确认删除这笔翻新维修记录？")) return;
  if (DEMO_MODE) { alert("演示模式：不删除。"); return; }
  const { error } = await sb.from("rental_reno_lines").delete().eq("id", id);
  if (error) alert("删除失败：" + error.message); else await refresh();
};

window.delTenant = async function (id) {
  if (!confirm("确认删除该租客？")) return;
  if (DEMO_MODE) { alert("演示模式：不删除。"); return; }
  const { error } = await sb.from("tenants").delete().eq("id", id);
  if (error) alert("删除失败：" + error.message); else await refresh();
};
