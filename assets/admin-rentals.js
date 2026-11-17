"use strict";
/* 出租管理（从旧版后台移植，逻辑不变；外观由 app.css 的 .legacy 样式统一）。
   依赖 admin.js 暴露的 window.AdminCtx：state / refresh。 */
(function () {
const { sb, $, $$, esc, toast, errZh, money } = window.App;
const DEMO_MODE = false;
const state = window.AdminCtx.state;
const refresh = () => window.AdminCtx.refresh();
const UTIL_NAMES = { water: "水", electric: "电", gas: "煤气", trash: "垃圾" };
const RENO_KINDS = { pre_reno: "拿房前翻新", renovation: "翻新", repair: "维修", eviction: "赶租客/清退", other: "其他" };
const EXP_CATS = { insurance: "保险", property_tax: "地产税", trash: "垃圾费", water: "水费", electric: "电费", gas: "煤气费", maintenance: "维修维护", other: "其他" };

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
      msg.textContent = error ? errZh(error) : "已保存修改。";
    } else {
      ({ error } = await sb.from("rental_properties").insert(row));
      msg.textContent = error ? errZh(error) : "已添加。";
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
      msg.textContent = error ? errZh(error) : "已保存修改。";
    } else {
      ({ error } = await sb.from("units").insert(row));
      msg.textContent = error ? errZh(error) : "已添加。";
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
      msg.textContent = error ? errZh(error) : "已保存修改。";
    } else {
      const res = await sb.from("tenants").insert(row).select("id").single();
      error = res.error;
      if (!error && res.data) await sb.from("units").update({ status: "occupied" }).eq("id", row.unit_id);
      msg.textContent = error ? errZh(error) : "已添加。";
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
      msg.textContent = error ? errZh(error) : "已保存修改。";
    } else {
      ({ error } = await sb.from("property_expenses").insert(row));
      msg.textContent = error ? errZh(error) : "已添加。";
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
      msg.textContent = error ? errZh(error) : "已保存修改。";
    } else {
      ({ error } = await sb.from("rental_reno_lines").insert(row));
      msg.textContent = error ? errZh(error) : "已添加。";
    }
    msg.className = "form-msg " + (error ? "err" : "ok");
    if (!error) await refresh();
  });
}

async function genMonthlyBills() {
  if (DEMO_MODE) { toast("演示模式：不生成。"); return; }
  const period = new Date().toISOString().slice(0, 7);
  const rows = state.rentalTenants.filter((t) => t.status === "active")
    .map((t) => ({ tenant_id: t.id, period, amount_due: t.rent_amount || 0 }));
  if (!rows.length) { toast("暂无在租租客。"); return; }
  const { error } = await sb.from("rent_payments").upsert(rows, { onConflict: "tenant_id,period", ignoreDuplicates: true });
  toast(error ? "生成失败：" + errZh(error) : "已生成 " + period + " 应收记录。");
  if (!error) await refresh();
}

window.markPaidPrompt = async function (tenantId, due, alreadyPaid) {
  const rest = Math.max(0, due - alreadyPaid);
  const v = prompt("登记收款金额（应收 $" + due + "，还差 $" + rest + "）:", rest);
  if (v == null) return;
  const add = Number(v); if (!(add > 0)) { toast("金额无效。"); return; }
  const method = prompt("收款方式（Zelle / 支票 / 现金 / 其他）:", "Zelle") || null;
  if (DEMO_MODE) { toast("演示模式：不保存。"); return; }
  const period = new Date().toISOString().slice(0, 7);
  const { error } = await sb.from("rent_payments").upsert(
    { tenant_id: tenantId, period, amount_due: due, amount_paid: alreadyPaid + add, paid_date: new Date().toISOString().slice(0, 10), method },
    { onConflict: "tenant_id,period" });
  toast(error ? "登记失败：" + errZh(error) : "已登记。");
  if (!error) await refresh();
};

window.fixPayment = async function (id) {
  const pm = state.rentalPayments.find((x) => x.id === id);
  if (!pm) return;
  const v = prompt("修正已收金额（应收 $" + Number(pm.amount_due || 0).toLocaleString() + "，当前已收 $" + Number(pm.amount_paid || 0).toLocaleString() + "）:", pm.amount_paid || 0);
  if (v == null) return;
  const amt = Number(v); if (isNaN(amt) || amt < 0) { toast("金额无效。"); return; }
  if (DEMO_MODE) { toast("演示模式：不保存。"); return; }
  const { error } = await sb.from("rent_payments").update({ amount_paid: amt, paid_date: amt > 0 ? (pm.paid_date || new Date().toISOString().slice(0, 10)) : null }).eq("id", id);
  toast(error ? "修正失败：" + errZh(error) : "已修正。");
  if (!error) await refresh();
};

window.delPayment = async function (id) {
  if (!confirm("确认删除这条收款记录？")) return;
  if (DEMO_MODE) { toast("演示模式：不删除。"); return; }
  const { error } = await sb.from("rent_payments").delete().eq("id", id);
  if (error) toast("删除失败：" + errZh(error)); else await refresh();
};

window.delRentalProp = async function (id) {
  if (!confirm("确认删除该出租物业及其全部户、租客、费用记录？")) return;
  if (DEMO_MODE) { toast("演示模式：不删除。"); return; }
  const { error } = await sb.from("rental_properties").delete().eq("id", id);
  if (error) toast("删除失败：" + errZh(error)); else await refresh();
};

window.editRentalProp = function (id) {
  const p = state.rentalProps.find((x) => x.id === id);
  if (!p) return;
  if (DEMO_MODE) { toast("演示模式：不保存。"); return; }
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
  if (DEMO_MODE) { toast("演示模式：不保存。"); return; }
  if (!fillForm("#unit-form", u, ["property_id", "unit_label", "beds", "baths", "sqft", "market_rent", "util_water", "util_electric", "util_gas", "util_trash", "status"])) return;
  window.__editingUnitId = id;
  editUi("#unit-form", "#unit-title", "编辑户：" + (u.unit_label || ""), "#unit-submit", "保存修改", "#unit-cancel", "#unit-msg");
};
window.cancelEditUnit = function () { cancelUi("__editingUnitId", "#unit-form", "#unit-title", "新增户", "#unit-submit", "添加户", "#unit-cancel", "#unit-msg"); };
window.delUnit = async function (id) {
  if (!confirm("确认删除该户？（该户下的租客会一并受影响）")) return;
  if (DEMO_MODE) { toast("演示模式：不删除。"); return; }
  const { error } = await sb.from("units").delete().eq("id", id);
  if (error) toast("删除失败：" + errZh(error)); else await refresh();
};

window.editTenant = function (id) {
  const t = state.rentalTenants.find((x) => x.id === id);
  if (!t) return;
  if (DEMO_MODE) { toast("演示模式：不保存。"); return; }
  if (!fillForm("#tenant-form", t, ["unit_id", "name", "phone", "email", "rent_amount", "due_day", "deposit", "lease_start", "lease_end"])) return;
  window.__editingTenantId = id;
  editUi("#tenant-form", "#tenant-title", "编辑租客：" + (t.name || ""), "#tenant-submit", "保存修改", "#tenant-cancel", "#tenant-msg");
};
window.cancelEditTenant = function () { cancelUi("__editingTenantId", "#tenant-form", "#tenant-title", "新增租客", "#tenant-submit", "添加租客", "#tenant-cancel", "#tenant-msg"); };

window.editExpense = function (id) {
  const e2 = state.rentalExpenses.find((x) => x.id === id);
  if (!e2) return;
  if (DEMO_MODE) { toast("演示模式：不保存。"); return; }
  if (!fillForm("#exp-form", e2, ["property_id", "category", "description", "amount", "due_date", "paid_date", "vendor", "recurring"])) return;
  window.__editingExpId = id;
  editUi("#exp-form", "#exp-title", "编辑费用", "#exp-submit", "保存修改", "#exp-cancel", "#exp-msg");
};
window.cancelEditExpense = function () { cancelUi("__editingExpId", "#exp-form", "#exp-title", "新增费用", "#exp-submit", "添加费用", "#exp-cancel", "#exp-msg"); };
window.delExpense = async function (id) {
  if (!confirm("确认删除这笔费用？")) return;
  if (DEMO_MODE) { toast("演示模式：不删除。"); return; }
  const { error } = await sb.from("property_expenses").delete().eq("id", id);
  if (error) toast("删除失败：" + errZh(error)); else await refresh();
};

window.editRenoLine = function (id) {
  const l = state.rentalReno.find((x) => x.id === id);
  if (!l) return;
  if (DEMO_MODE) { toast("演示模式：不保存。"); return; }
  if (!fillForm("#reno-form", l, ["property_id", "kind", "item", "amount", "spent_date", "note"])) return;
  window.__editingRenoId = id;
  editUi("#reno-form", "#reno-title", "编辑翻新维修账", "#reno-submit", "保存修改", "#reno-cancel", "#reno-msg");
};
window.cancelEditRenoLine = function () { cancelUi("__editingRenoId", "#reno-form", "#reno-title", "翻新维修账（计入总投资额）", "#reno-submit", "添加一笔", "#reno-cancel", "#reno-msg"); };

window.delRenoLine = async function (id) {
  if (!confirm("确认删除这笔翻新维修记录？")) return;
  if (DEMO_MODE) { toast("演示模式：不删除。"); return; }
  const { error } = await sb.from("rental_reno_lines").delete().eq("id", id);
  if (error) toast("删除失败：" + errZh(error)); else await refresh();
};

window.delTenant = async function (id) {
  if (!confirm("确认删除该租客？")) return;
  if (DEMO_MODE) { toast("演示模式：不删除。"); return; }
  const { error } = await sb.from("tenants").delete().eq("id", id);
  if (error) toast("删除失败：" + errZh(error)); else await refresh();
};


window.AdminRentals = { render: adminRentalsTab };
})();
