"use strict";
/* iHome Capital — shared core: Supabase client, helpers, i18n, header/footer, login, lead forms.
   Every page loads: supabase-js (CDN) → config.js → assets/core.js → its own page script. */

(function () {
const CFG = window.APP_CONFIG || {};
const sb = window.supabase && CFG.SUPABASE_URL ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;
const SITE = {
  company: "Universal Elite Inc", dre: "CA DRE #02039413",
  phone: "(626) 510-0292", phoneHref: "+16265100292",
  email: CFG.CONTACT_EMAIL || "", wechat: CFG.WECHAT_ID || ""
};

/* ---------- tiny helpers ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => (n == null || n === "" || isNaN(n)) ? "—" : "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
const pct = (n, d = 1) => (n == null || isNaN(n)) ? "—" : Number(n).toFixed(d) + "%";
const num = (n) => (n == null || n === "" || isNaN(n)) ? "—" : Number(n).toLocaleString("en-US", { maximumFractionDigits: 1 });
const qs = (k) => new URLSearchParams(location.search).get(k);
const today = () => new Date().toISOString().slice(0, 10);
const ROLE_NAMES = { visitor: "访客", investor: "投资人", agent: "合作代理", admin: "管理员" };
const roleName = (r) => ROLE_NAMES[r] || r;

/* ---------- i18n (public pages) ---------- */
const I18N = window.I18N || { zh: {}, en: {} };
let lang = "zh";
try { lang = localStorage.getItem("lang") || "zh"; } catch (e) {}
function t(key, fallback) {
  const d = I18N[lang] || {};
  if (d[key] != null) return d[key];
  if (I18N.zh && I18N.zh[key] != null) return I18N.zh[key];
  return fallback != null ? fallback : key;
}
function applyI18n(root) {
  document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
  // 中文原文写在 HTML 里；第一次切换时记住原文，切回中文时还原
  $$("[data-i18n]", root).forEach((el) => {
    if (el.__zh == null) el.__zh = el.innerHTML;
    const v = lang === "en" ? (I18N.en || {})[el.dataset.i18n] : el.__zh;
    if (v != null) el.innerHTML = v;
  });
  $$("[data-i18n-ph]", root).forEach((el) => {
    if (el.__zhph == null) el.__zhph = el.placeholder;
    el.placeholder = lang === "en" ? ((I18N.en || {})[el.dataset.i18nPh] || el.__zhph) : el.__zhph;
  });
  if (window.__zhTitle == null) window.__zhTitle = document.title;
  const tk = document.body && document.body.dataset.i18nTitle;
  document.title = lang === "en" && tk && (I18N.en || {})[tk] ? I18N.en[tk] : window.__zhTitle;
}
function setLang(l) {
  lang = l; try { localStorage.setItem("lang", l); } catch (e) {}
  applyI18n(); renderHeader(); document.dispatchEvent(new CustomEvent("langchange"));
}

/* ---------- errors → 中文 ---------- */
function errZh(err) {
  const m = String((err && err.message) || err || "");
  const map = [
    [/invalid login credentials/i, "邮箱或密码不对。忘记密码可以点「忘记密码？」重设。"],
    [/email not confirmed/i, "邮箱还没确认：请先去邮箱点确认链接，再回来登录。"],
    [/user already registered|already been registered/i, "这个邮箱已经注册过了，请直接登录。"],
    [/password should be at least (\d+)/i, (x) => `密码至少需要 ${x[1]} 位。`],
    [/(weak|pwned|leaked|compromised).*password|password.*(weak|pwned|leaked)/i, "这个密码太常见或已泄露过，请换一个。"],
    [/rate limit|too many requests|security purposes.*after/i, "操作太频繁，请稍等一分钟再试。"],
    [/unable to validate email|invalid email|email address.*invalid/i, "邮箱格式不对，请检查一下。"],
    [/signups? not allowed|signup is disabled/i, "目前不开放自助注册，请联系我们开通账号。"],
    [/same.*(old|previous) password|different from the old/i, "新密码不能和旧密码一样。"],
    [/invalid.*(totp|code)|code.*(invalid|expired)/i, "验证码不对或已过期，请看验证器里最新的 6 位数字。"],
    [/failed to fetch|network/i, "网络连接失败，请检查网络后重试。"],
    [/jwt expired|session.*(expired|missing)|not authenticated/i, "登录已过期，请重新登录。"],
    [/row-level security|permission denied|only admins/i, "没有权限做这个操作。"],
    [/duplicate key/i, "这条记录已经存在了。"],
    [/violates foreign key/i, "这条记录还被其他数据引用，不能直接删除。"],
    [/payload too large|exceeded the maximum allowed size/i, "文件太大了（单张照片最大 10 MB）。"],
    [/mime type|invalid.*type/i, "只能上传 JPG / PNG / WebP 图片。"]
  ];
  for (const [re, zh] of map) { const x = m.match(re); if (x) return typeof zh === "function" ? zh(x) : zh; }
  return m || "出错了，请重试。";
}

/* ---------- toast / busy / modal ---------- */
let toastTimer = null;
function toast(msg, isErr) {
  let el = $("#toast");
  if (!el) { el = document.createElement("div"); el.id = "toast"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite"); document.body.appendChild(el); }
  const text = String(msg == null ? "" : msg);
  el.textContent = text; el.className = "toast" + (isErr ? " err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), Math.min(8000, 2600 + text.length * 60));
}
async function withBusy(btn, label, fn) {
  if (!btn) return fn();
  if (btn.disabled) return;
  const old = btn.textContent;
  btn.disabled = true; btn.classList.add("loading"); if (label) btn.textContent = label;
  try { return await fn(); }
  finally { btn.disabled = false; btn.classList.remove("loading"); if (!label || btn.textContent === label) btn.textContent = old; }
}
function openModal(id) {
  const m = document.getElementById(id); if (!m) return;
  m.classList.remove("hidden"); document.body.classList.add("modal-open");
  const f = m.querySelector("input:not([type=hidden]):not([tabindex='-1'])");
  if (f && matchMedia("(min-width: 641px)").matches) setTimeout(() => f.focus(), 30);
}
function closeModal(id) {
  const m = document.getElementById(id); if (!m) return;
  m.classList.add("hidden");
  if (!$$(".modal,.drawer").some((x) => !x.classList.contains("hidden"))) document.body.classList.remove("modal-open");
  if (m.dataset.onclose && window[m.dataset.onclose]) window[m.dataset.onclose]();
}
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const open = $$(".modal,.drawer").filter((x) => !x.classList.contains("hidden")).pop();
  if (open && !open.dataset.locked) closeModal(open.id);
});
document.addEventListener("click", (e) => {
  const t2 = e.target;
  if (t2.classList && (t2.classList.contains("modal") || t2.classList.contains("drawer")) && !t2.dataset.locked) closeModal(t2.id);
  const c = t2.closest && t2.closest("[data-close]"); if (c) closeModal(c.dataset.close);
});

/* ---------- project math (single source of truth) ---------- */
function projectGroup(p) {
  const s = String(p.status || "");
  if (/已售|售出|sold|完成|已结束|已还款/i.test(s)) return "sold";
  if (/取消|cancel/i.test(s)) return "cancelled";
  return "active";
}
function pnlTotals(lines) {
  const sub = { acquisition: 0, holding: 0, renovation: 0, sale: 0 };
  let revenue = 0;
  (lines || []).forEach((l) => { const a = Number(l.amount) || 0; if (l.is_revenue) revenue += a; else sub[l.section] = (sub[l.section] || 0) + a; });
  const totalCosts = sub.acquisition + sub.holding + sub.renovation + sub.sale;
  const profit = revenue > 0 ? revenue - totalCosts : null;
  return { sub, revenue, totalCosts, profit, margin: profit != null && totalCosts > 0 ? (profit / totalCosts) * 100 : null };
}
function annualized(profit, totalCosts, holdDays) {
  if (profit == null || !totalCosts || !holdDays) return null;
  return profit / totalCosts / (holdDays / 365) * 100;
}
const SECTION_NAMES = { acquisition: "买入", holding: "持有费用", renovation: "装修费用", sale: "卖出与卖方费用" };
function statusBadge(status) {
  const g = projectGroup({ status });
  const cls = g === "sold" ? "ok" : g === "cancelled" ? "" : /escrow/i.test(status || "") ? "info" : /募集|计息/.test(status || "") ? "warn" : "accent";
  return `<span class="badge ${cls}">${esc(status || "—")}</span>`;
}
function photoOf(p) { return p.photo_url || (p.gallery && p.gallery[0]) || ""; }
function imgOrPh(src, alt, label) {
  return src ? `<img src="${esc(src)}" alt="${esc(alt || "")}" loading="lazy" decoding="async">`
             : `<span class="ph-label">${esc(label || t("ph.photo", "照片待上传"))}</span>`;
}

/* 公开项目卡片（首页 / 项目列表共用）。公开层只放事实：买入价、卖出价、持有天数，不放预计回报。 */
function projectCard(p) {
  const sold = projectGroup(p) === "sold";
  const meta = [p.city, p.beds ? `${num(p.beds)} ${t("u.bed", "卧")}` : "", p.living_sqft ? `${num(p.living_sqft)} sqft` : ""].filter(Boolean).join(" · ");
  let foot;
  if (p.type === "lending") foot = `<span>${esc(t("card.loan", "借款项目"))}</span><span>${p.loan_amount ? `<b>${money(p.loan_amount)}</b>` : ""}</span>`;
  else if (sold && p.buy_price && p.sell_price) foot = `<span>${esc(t("card.buy", "买入"))} ${money(p.buy_price)}</span><span>${esc(t("card.sell", "卖出"))} <b>${money(p.sell_price)}</b></span>${p.days_held ? `<span>${p.days_held} ${esc(t("u.days", "天"))}</span>` : ""}`;
  else if (p.buy_price) foot = `<span>${esc(t("card.buy", "买入"))} ${money(p.buy_price)}</span><span>${statusBadge(p.status)}</span>`;
  else foot = `<span>${statusBadge(p.status)}</span>`;
  return `<a class="card" href="project.html?id=${encodeURIComponent(p.id)}">
    <div class="card-media">${imgOrPh(photoOf(p), p.title)}${!sold ? statusBadge(p.status) : ""}</div>
    <div class="card-body"><div class="card-meta">${esc(meta)}</div><h3 class="card-title">${esc(p.title)}</h3><div class="card-foot">${foot}</div></div></a>`;
}
function median(arr) { const a = arr.filter((x) => x != null && !isNaN(x)).map(Number).sort((x, y) => x - y); if (!a.length) return null; const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2); }
function bigMoney(n) { if (n == null) return "—"; return lang === "en" ? "$" + (n / 1e6).toFixed(1) + "M" : "$" + Math.round(n / 1e4).toLocaleString("en-US") + " 万"; }
function sortProjects(list) {
  const rank = { active: 0, sold: 1, cancelled: 2 };
  const d = (p) => String(p.buy_date || p.created_at || "");
  return list.slice().sort((a, b) => (rank[projectGroup(a)] - rank[projectGroup(b)]) || d(b).localeCompare(d(a)));
}

/* ---------- auth state ---------- */
const auth = { user: null, profile: null, role: "visitor", ready: null };
async function loadProfile() {
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  auth.user = data.session ? data.session.user : null;
  if (!auth.user) { auth.profile = null; auth.role = "visitor"; return; }
  const { data: prof } = await sb.from("profiles").select("*").eq("id", auth.user.id).maybeSingle();
  auth.profile = prof || null; auth.role = (prof && prof.role) || "visitor";
}
const homeFor = (role) => role === "admin" ? "admin.html" : role === "investor" ? "portal.html" : role === "agent" ? "agent.html" : null;

/* 页面要求某种身份；不满足就弹登录或跳走 */
async function requireRole(roles, opts) {
  await auth.ready;
  if (!auth.user) { openLogin({ locked: true, reason: (opts && opts.reason) || "请先登录" }); return false; }
  if (!roles.includes(auth.role)) {
    const home = homeFor(auth.role);
    document.body.innerHTML = `<div class="wrap" style="padding:80px 20px;max-width:560px"><h1 class="h-md">这个页面需要${esc(roles.map(roleName).join(" / "))}权限</h1>
      <p class="muted" style="margin:12px 0 24px">你的账号目前是「${esc(roleName(auth.role))}」。${auth.role === "visitor" ? "我们确认身份后会为你开通权限，开通后刷新即可。" : ""}</p>
      <div class="cta-row">${home ? `<a class="btn btn-primary" href="${home}">去我的页面</a>` : ""}<a class="btn" href="index.html">回首页</a></div></div>`;
    return false;
  }
  if (auth.role === "admin" && !(await ensureAal2())) return false;
  return true;
}

/* ---------- 两步验证（管理员） ---------- */
async function mfaState() {
  if (!sb || !sb.auth.mfa) return { current: "aal1", next: "aal1" };
  const { data } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  return { current: (data && data.currentLevel) || "aal1", next: (data && data.nextLevel) || "aal1" };
}
async function ensureAal2() {
  const s = await mfaState();
  if (s.next === "aal2" && s.current !== "aal2") { openLogin({ locked: true, step: "mfa" }); return false; }
  return true;
}

/* ---------- header & footer ---------- */
function navLinks() {
  const page = location.pathname.split("/").pop() || "index.html";
  const links = [["projects.html", "nav.projects", "项目业绩"], ["index.html#how", "nav.how", "投资方式"], ["sell.html", "nav.sell", "卖房给我们"],
                 ["index.html#about", "nav.about", "关于我们"], ["index.html#contact", "nav.contact", "联系"]];
  return links.map(([h, k, d]) => `<a href="${h}"${h.split("#")[0] === page && !h.includes("#") ? ' aria-current="page"' : ""}>${esc(t(k, d))}</a>`).join("");
}
function renderHeader() {
  const el = $("#site-header"); if (!el) return;
  const home = homeFor(auth.role);
  const acct = auth.user
    ? `<span class="user-chip">${esc((auth.profile && auth.profile.display_name) || auth.user.email)}</span>
       ${home ? `<a class="btn btn-sm btn-soft" href="${home}">${esc(t("nav.mine", "我的账户"))}</a>` : ""}
       <button class="btn btn-sm" type="button" data-act="logout">${esc(t("nav.logout", "退出"))}</button>`
    : `<button class="btn btn-sm" type="button" data-act="login">${esc(t("nav.login", "投资人登录"))}</button>`;
  el.className = "site-header";
  el.innerHTML = `<div class="wrap">
    <a class="brand" href="index.html">iHome Capital</a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="main-nav" data-act="menu">${esc(t("nav.menu", "菜单"))}</button>
    <nav class="main-nav" id="main-nav" aria-label="主导航">${navLinks()}</nav>
    <div class="head-actions">
      ${Object.keys(I18N.en || {}).length ? `<button class="lang-btn" type="button" data-act="lang" aria-label="Switch language">${lang === "en" ? "中文" : "EN"}</button>` : ""}
      ${acct}
    </div></div>`;
}
function renderFooter() {
  const el = $("#site-footer"); if (!el) return;
  el.className = "site-footer";
  el.innerHTML = `<div class="wrap">
    <div class="row"><b>iHome Capital</b><span>${SITE.company} · ${SITE.dre}</span>
      <a href="tel:${SITE.phoneHref}">${SITE.phone}</a>${SITE.email ? `<a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a>` : ""}
      ${SITE.wechat ? `<span>${esc(t("footer.wechat", "微信"))}：${esc(SITE.wechat)}</span>` : ""}
      <a href="sell.html">${esc(t("nav.sell", "卖房给我们"))}</a><a href="agent.html">${esc(t("footer.agents", "合作代理"))}</a></div>
    <p style="max-width:900px">${esc(t("footer.disclaimer", "本网站内容仅供参考，不构成任何证券的出售要约或购买邀约。所示数据为历史成交记录，不代表未来结果；房地产投资有风险，可能损失本金。投资机会仅向符合条件的投资人提供，具体条款以正式投资文件为准。"))}</p>
  </div>`;
}
document.addEventListener("click", async (e) => {
  const a = e.target.closest && e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act;
  if (act === "login") { e.preventDefault(); openLogin(); }
  if (act === "logout") { e.preventDefault(); if (window.beforeLogout && !window.beforeLogout()) return; await sb.auth.signOut(); toast("已退出登录"); if (/(portal|admin|agent)\.html/.test(location.pathname)) location.href = "index.html"; }
  if (act === "lang") setLang(lang === "en" ? "zh" : "en");
  if (act === "menu") { const n = $("#main-nav"); n.classList.toggle("open"); a.setAttribute("aria-expanded", n.classList.contains("open")); }
});

/* ---------- login / signup / reset / MFA modal ---------- */
let authMode = "login";
function ensureAuthModal() {
  if ($("#auth-modal")) return;
  const d = document.createElement("div");
  d.innerHTML = `
  <div id="auth-modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="auth-title">
    <div class="modal-card">
      <button class="modal-close" type="button" data-close="auth-modal" aria-label="关闭">×</button>
      <h2 class="h-md" id="auth-title">登录</h2>
      <p class="muted small" id="auth-hint" style="margin:6px 0 10px"></p>
      <form id="auth-form" class="form" novalidate>
        <label class="field hidden" id="auth-name-wrap"><span>姓名</span><input id="auth-name" autocomplete="name" placeholder="方便我们认出你"></label>
        <label class="field" id="auth-email-wrap"><span>邮箱</span><input id="auth-email" type="email" autocomplete="email" inputmode="email" required></label>
        <label class="field" id="auth-pw-wrap"><span>密码</span><span class="pw-wrap"><input id="auth-password" type="password" autocomplete="current-password" required><button type="button" class="pw-toggle" id="auth-pw-toggle">显示</button></span></label>
        <label class="field hidden" id="auth-pw2-wrap"><span>再次输入新密码</span><input id="auth-password2" type="password" autocomplete="new-password"></label>
        <label class="field hidden" id="auth-code-wrap"><span>验证器里的 6 位验证码</span><input id="auth-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}"></label>
        <button class="btn btn-primary btn-lg" type="submit" id="auth-submit">登录</button>
        <p class="form-msg" id="auth-msg" role="alert"></p>
        <p class="small" id="auth-links"><a href="#" data-mode="signup">没有账号？注册</a> · <a href="#" data-mode="forgot">忘记密码？</a></p>
      </form>
    </div>
  </div>`;
  document.body.appendChild(d.firstElementChild);
  $("#auth-form").addEventListener("submit", onAuthSubmit);
  $("#auth-pw-toggle").addEventListener("click", () => { const i = $("#auth-password"), s = i.type === "password"; i.type = s ? "text" : "password"; $("#auth-pw-toggle").textContent = s ? "隐藏" : "显示"; });
  $("#auth-links").addEventListener("click", (e) => { const m = e.target.dataset && e.target.dataset.mode; if (m) { e.preventDefault(); setAuthMode(m); } });
}
function setAuthMode(mode, reason) {
  authMode = mode;
  const show = (id, on) => $(id).classList.toggle("hidden", !on);
  const T = { login: ["登录", "投资人、合作代理用邮箱登录。", "登录"], signup: ["注册账号", "注册后默认是访客；我们确认身份后，会为你开通投资人或合作代理权限。", "注册"],
              forgot: ["重设密码", "填写注册邮箱，我们发一封重设密码的邮件给你。", "发送重设邮件"], reset: ["设置新密码", "请输入新密码（至少 8 位）。", "保存新密码"],
              mfa: ["两步验证", "打开手机上的验证器（Google Authenticator / 1Password 等），输入 iHome Capital 的 6 位验证码。", "验证"] }[mode];
  $("#auth-title").textContent = T[0]; $("#auth-hint").textContent = reason || T[1]; $("#auth-submit").textContent = T[2];
  show("#auth-name-wrap", mode === "signup"); show("#auth-email-wrap", ["login", "signup", "forgot"].includes(mode));
  show("#auth-pw-wrap", ["login", "signup", "reset"].includes(mode)); show("#auth-pw2-wrap", mode === "reset");
  show("#auth-code-wrap", mode === "mfa"); show("#auth-links", ["login", "signup", "forgot"].includes(mode));
  $("#auth-links").innerHTML = mode === "login" ? `<a href="#" data-mode="signup">没有账号？注册</a> · <a href="#" data-mode="forgot">忘记密码？</a>` : `<a href="#" data-mode="login">返回登录</a>`;
  $("#auth-password").setAttribute("autocomplete", mode === "login" ? "current-password" : "new-password");
  $("#auth-msg").textContent = ""; $("#auth-msg").className = "form-msg";
}
function openLogin(opts) {
  opts = opts || {};
  ensureAuthModal();
  setAuthMode(opts.step || "login", opts.reason);
  const m = $("#auth-modal");
  if (opts.locked) { m.dataset.locked = "1"; $(".modal-close", m).classList.add("hidden"); } else { delete m.dataset.locked; $(".modal-close", m).classList.remove("hidden"); }
  openModal("auth-modal");
}
async function onAuthSubmit(e) {
  e.preventDefault();
  const msg = $("#auth-msg"), btn = $("#auth-submit");
  const say = (text, ok) => { msg.textContent = text; msg.className = "form-msg " + (ok ? "ok" : "err"); };
  await withBusy(btn, "处理中…", async () => {
    const email = $("#auth-email").value.trim().toLowerCase(), pw = $("#auth-password").value;
    if (authMode === "login") {
      if (!email || !pw) return say("请填写邮箱和密码。");
      const { error } = await sb.auth.signInWithPassword({ email, password: pw });
      if (error) return say(errZh(error));
      $("#auth-password").value = "";
      const s = await mfaState();
      if (s.next === "aal2" && s.current !== "aal2") { setAuthMode("mfa"); return; }
      return afterLogin();
    }
    if (authMode === "mfa") {
      const code = $("#auth-code").value.trim();
      if (!/^\d{6}$/.test(code)) return say("请输入 6 位数字验证码。");
      const { data: f } = await sb.auth.mfa.listFactors();
      const factor = f && f.totp && f.totp.find((x) => x.status === "verified");
      if (!factor) return afterLogin();
      const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
      if (error) return say(errZh(error));
      $("#auth-code").value = "";
      return afterLogin();
    }
    if (authMode === "signup") {
      if (!email) return say("请填写邮箱。");
      if (pw.length < 8) return say("密码至少需要 8 位。");
      const { data, error } = await sb.auth.signUp({ email, password: pw, options: { data: { display_name: $("#auth-name").value.trim() }, emailRedirectTo: location.origin + "/" } });
      if (error) return say(errZh(error));
      if (data && data.session) return afterLogin();
      setAuthMode("login");
      return say(`注册成功！确认邮件已发到 ${email}，点邮件里的链接后回来登录（没收到请看垃圾邮件箱）。`, true);
    }
    if (authMode === "forgot") {
      if (!email) return say("请填写注册邮箱。");
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/index.html" });
      if (error) return say(errZh(error));
      return say(`重设邮件已发到 ${email}，点邮件里的链接设置新密码。`, true);
    }
    if (authMode === "reset") {
      const pw2 = $("#auth-password2").value;
      if (pw.length < 8) return say("密码至少需要 8 位。");
      if (pw !== pw2) return say("两次输入的密码不一致。");
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) return say(errZh(error));
      history.replaceState(null, "", location.pathname);
      toast("密码已更新");
      return afterLogin();
    }
  });
}
async function afterLogin() {
  const m = $("#auth-modal"); if (m) { delete m.dataset.locked; closeModal("auth-modal"); }
  await loadProfile(); renderHeader();
  const home = homeFor(auth.role);
  const page = location.pathname.split("/").pop();
  if (home && page !== home) { location.href = home; return; }
  if (!home) { toast("已登录。你的账号还在等待开通投资人/代理权限，开通后刷新即可。"); return; }
  location.reload();
}

/* ---------- lead forms → Supabase(leads) + Netlify Forms(email notification) ---------- */
function encodeForm(obj) { return Object.keys(obj).map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(obj[k] == null ? "" : obj[k])).join("&"); }
async function submitLead(form, extra) {
  const f = new FormData(form);
  if (f.get("company_website")) return { ok: true }; // honeypot: bots fill hidden fields
  const lead = {
    kind: f.get("kind") || (extra && extra.kind) || "other",
    name: (f.get("name") || "").trim() || null, phone: (f.get("phone") || "").trim() || null,
    email: (f.get("email") || "").trim() || null, address: (f.get("address") || "").trim() || null,
    message: (f.get("message") || "").trim() || null, details: (extra && extra.details) || {},
    source_page: location.pathname
  };
  if (!lead.phone && !lead.email) return { ok: false, error: t("form.need_contact", "请至少留一个电话或邮箱，方便我们联系你。") };
  let dbErr = null;
  if (sb) { const { error } = await sb.from("leads").insert(lead); dbErr = error; }
  // Netlify Forms：在 Netlify 后台开启表单通知后，每条提交会发邮件给你
  const netlify = Object.assign({ "form-name": form.getAttribute("name") || "contact" }, Object.fromEntries(f.entries()), { details: JSON.stringify(lead.details) });
  let nfOk = false;
  try { const r = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: encodeForm(netlify) }); nfOk = r.ok; } catch (e) {}
  if (dbErr && !nfOk) return { ok: false, error: errZh(dbErr) };
  return { ok: true };
}

/* ---------- boot ---------- */
auth.ready = (async () => {
  try { await loadProfile(); } catch (e) { console.error(e); }
  renderHeader(); renderFooter(); applyI18n();
  if (sb) {
    let last = auth.user ? auth.user.id : null;
    sb.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setTimeout(() => openLogin({ step: "reset", locked: true }), 0);
      const uid = session ? session.user.id : null;
      if (uid === last) return; // ignore hourly TOKEN_REFRESHED
      last = uid;
      setTimeout(async () => { await loadProfile(); renderHeader(); document.dispatchEvent(new CustomEvent("authchange")); }, 0);
    });
    if (/type=recovery/.test(location.hash)) setTimeout(() => openLogin({ step: "reset", locked: true }), 0);
    const urlErr = new URLSearchParams(location.hash.slice(1)).get("error_description");
    if (urlErr) { toast(/expired|invalid/i.test(urlErr) ? "邮件链接已过期或已用过，请重新发送。" : urlErr, true); history.replaceState(null, "", location.pathname); }
  }
  if (CFG.ANALYTICS_DOMAIN) { const s = document.createElement("script"); s.defer = true; s.dataset.domain = CFG.ANALYTICS_DOMAIN; s.src = "https://plausible.io/js/script.js"; document.head.appendChild(s); }
})();

window.App = { sb, CFG, SITE, $, $$, esc, money, pct, num, qs, today, t, applyI18n, setLang, get lang() { return lang; },
  errZh, toast, withBusy, openModal, closeModal, projectGroup, projectCard, median, bigMoney, sortProjects, pnlTotals, annualized, SECTION_NAMES, statusBadge, photoOf, imgOrPh,
  auth, roleName, ROLE_NAMES, requireRole, openLogin, submitLead, renderHeader, mfaState };
})();
