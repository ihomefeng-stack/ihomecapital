"use strict";
(function () {
const { $, t, withBusy, submitLead } = window.App;
$("#sell-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target, msg = $("#sell-msg"), btn = form.querySelector("button[type=submit]");
  const f = new FormData(form);
  const bad = (m) => { msg.textContent = m; msg.className = "form-msg err"; };
  if (!String(f.get("address") || "").trim()) return bad(t("sf.need_addr", "请填写房子地址。"));
  if (!String(f.get("phone") || "").trim()) return bad(t("sf.need_phone", "请留一个电话，方便我们联系你。"));
  if (!f.get("consent")) return bad(t("sf.need_consent", "请勾选同意我们联系你。"));
  const details = {}; ["city", "zip", "condition", "timeline", "occupancy", "role", "asking"].forEach((k) => { const v = String(f.get(k) || "").trim(); if (v) details[k] = v; });
  await withBusy(btn, t("f.sending", "提交中…"), async () => {
    const r = await submitLead(form, { kind: "sell", details });
    if (!r.ok) return bad(r.error);
    form.reset();
    msg.textContent = t("sf.thanks", "收到了！我们通常一个工作日内打电话给你。着急的话可以直接打 (626) 510-0292。");
    msg.className = "form-msg ok";
  });
});
})();
