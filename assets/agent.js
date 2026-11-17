"use strict";
/* 合作代理：提交房源 → 管理员审核 → 上架 */
(function () {
const A = window.App;
const { sb, $, $$, esc, money, toast, withBusy, auth, roleName, errZh, openLogin } = A;
const main = $("#main");
let mine = [];
const ST = { pending: ["待审核", "warn"], approved: ["已通过并上架", "ok"], rejected: ["未通过", "bad"] };

function intro() {
  $(".sidebar .side-nav").classList.add("hidden");
  main.innerHTML = `<div style="max-width:640px">
    <h1 class="h-lg">合作代理</h1>
    <p class="lead" style="margin:12px 0 24px">有适合翻新的房源（off-market、需要大修、急售、继承房等）？成为 iHome Capital 的合作代理，直接在这里提交房源，我们审核后尽快回复，成交按约定付佣金。</p>
    <ol class="list" style="margin-bottom:28px"><li><span>1. 联系我们开通代理账号</span></li><li><span>2. 登录后在这里提交房源</span></li><li><span>3. 管理员审核，结果在这里随时可见</span></li></ol>
    <div class="cta-row">${auth.user ? "" : `<button class="btn btn-primary" type="button" data-act="login">代理登录</button>`}<a class="btn" href="index.html#contact">申请成为合作代理</a></div>
    ${auth.user ? `<p class="muted" style="margin-top:20px">你的账号目前是「${esc(roleName(auth.role))}」，开通代理权限后刷新即可提交房源。</p>` : ""}
  </div>`;
}

async function load() { const { data } = await sb.from("agent_submissions").select("*").order("created_at", { ascending: false }); mine = (data || []).filter((s) => auth.role === "admin" ? s.agent_id === auth.user.id : true); }

function viewSubmit() {
  main.innerHTML = `<div class="page-head"><h1>提交房源</h1></div>
  <section class="panel" style="max-width:820px"><form class="form" id="sub-form" novalidate>
    <div class="form-row"><label class="field"><span>地址 <em>*</em></span><input name="address" required></label><label class="field"><span>城市</span><input name="city"></label></div>
    <div class="form-row"><label class="field"><span>价格 (USD)</span><input name="price" type="number" min="0" inputmode="numeric"></label><label class="field"><span>卧室</span><input name="beds" type="number" step="0.5" min="0"></label>
      <label class="field"><span>卫生间</span><input name="baths" type="number" step="0.5" min="0"></label><label class="field"><span>面积 sqft</span><input name="sqft" type="number" min="0"></label></div>
    <div class="form-row"><label class="field"><span>Zillow / MLS 链接</span><input name="zillow_url" type="url" placeholder="https://"></label><label class="field"><span>照片链接（选填）</span><input name="photo_url" type="url" placeholder="https://"></label></div>
    <label class="field"><span>房况与介绍（为什么适合翻新、卖家情况、看房方式）</span><textarea name="description" rows="4"></textarea></label>
    <button class="btn btn-primary btn-lg" type="submit">提交审核</button><p class="form-msg" id="sub-msg"></p>
  </form></section>`;
  $("#sub-form").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = new FormData(e.target), m = $("#sub-msg");
    const addr = String(f.get("address") || "").trim();
    if (!addr) { m.textContent = "请填写地址。"; m.className = "form-msg err"; return; }
    const n = (k) => { const v = f.get(k); return v === "" || v == null ? null : Number(v); };
    const row = { agent_id: auth.user.id, title: addr, address: addr, city: f.get("city") || null, price: n("price"), beds: n("beds"), baths: n("baths"), sqft: n("sqft"),
      zillow_url: f.get("zillow_url") || null, photo_url: f.get("photo_url") || null, description: f.get("description") || null };
    await withBusy(e.target.querySelector("button[type=submit]"), "提交中…", async () => {
      const { error } = await sb.from("agent_submissions").insert(row);
      if (error) { m.textContent = errZh(error); m.className = "form-msg err"; return; }
      e.target.reset(); toast("已提交，等待审核"); await load(); show("mine");
    });
  });
}
function viewMine() {
  main.innerHTML = `<div class="page-head"><h1>我提交的房源</h1></div>
  <div class="table-box"><table class="t" style="min-width:640px"><thead><tr><th>地址</th><th class="r">价格</th><th>提交日期</th><th>状态</th><th>管理员备注</th></tr></thead><tbody>
  ${mine.map((s) => `<tr><td><b>${esc(s.title)}</b><div class="sub">${esc(s.city || "")}</div></td><td class="r">${money(s.price)}</td><td>${esc(String(s.created_at || "").slice(0, 10))}</td>
    <td><span class="badge ${(ST[s.status] || [])[1] || ""}">${esc((ST[s.status] || [s.status])[0])}</span></td><td class="small">${esc(s.admin_note || "")}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">还没有提交记录。</td></tr>`}
  </tbody></table></div>`;
}
function show(v) { $$("#side-nav button").forEach((b) => b.classList.toggle("on", b.dataset.view === v)); (v === "mine" ? viewMine : viewSubmit)(); }
$("#side-nav").addEventListener("click", (e) => { const b = e.target.closest("[data-view]"); if (b) show(b.dataset.view); });

(async () => {
  await auth.ready;
  if (!auth.user || !["agent", "admin"].includes(auth.role)) { $("#who").textContent = auth.user ? auth.user.email : ""; return intro(); }
  $("#who").textContent = ((auth.profile && auth.profile.display_name) || auth.user.email) + " · " + roleName(auth.role);
  await load(); show(mine.length ? "mine" : "submit");
})();
})();
