/* Sandbox giving wiring for donate.html.
 * Overrides the unified app.js placeholder MWE.handleDonationSubmit with the
 * owner-controlled sandbox flow (MWEStore.donate -> POST /api/store/donations).
 * Kept separate so the large shared app.js does not need to change. */
(function () {
  "use strict";
  const MWE = window.MWE;
  if (!MWE) return;
  const toast = (message) => {
    if (typeof window.showToast === "function") window.showToast(message);
    else if (MWE.showMemberToast) MWE.showMemberToast(message);
  };

  MWE.refreshDonationAvailability = async function () {
    const form = document.querySelector("[data-donation-form]");
    if (!form) return;
    const submit = form.querySelector("[data-donation-submit]");
    const status = document.getElementById("donation-payment-status");
    try {
      await window.MWEStore?.ready;
      const payment = await window.MWEStore?.getPaymentSettings?.();
      const enabled = Boolean(payment?.givingSandboxEnabled);
      if (submit) submit.disabled = !enabled;
      if (status) status.textContent = enabled
        ? "Sandbox giving is enabled. This records a pending contribution only; no payment is captured."
        : "Giving is currently unavailable because sandbox mode is off. No payment details are collected.";
    } catch (_) {
      if (submit) submit.disabled = true;
      if (status) status.textContent = "Giving is temporarily unavailable. No payment details are collected.";
    }
  };

  MWE.handleDonationSubmit = async function (e) {
    e.preventDefault();
    const form = e.currentTarget || e.target;
    if (!form?.reportValidity?.()) return;
    const submit = form.querySelector("[data-donation-submit]");
    const amount = Number(document.getElementById("custom-donate-amount")?.value || 0);
    if (!Number.isFinite(amount) || amount < 5) {
      toast("Enter a contribution of at least $5.");
      return;
    }
    const frequency = form.querySelector(".master-freq-btn.active")?.dataset.freq || "one-time";
    const values = new FormData(form);
    if (submit) submit.disabled = true;
    try {
      await window.MWEStore?.ready;
      if (!window.MWEStore?.donate) throw new Error("Giving is unavailable. No charge was made.");
      const result = await window.MWEStore.donate({
        amountCents: Math.round(amount * 100),
        donorName: values.get("donorName"),
        donorEmail: values.get("donorEmail"),
        message: `frequency=${frequency}; sandbox_pending=true`
      });
      const ref = result?.donation?.donationRef || "pending record";
      toast(`Sandbox contribution ${ref} recorded. No payment was captured.`);
      form.reset();
      const pill = form.querySelector(".master-amount-pill:nth-child(2)");
      if (pill && MWE.setDonateAmount) MWE.setDonateAmount(50, pill);
    } catch (error) {
      toast(error?.message || "Giving could not be recorded. No payment was captured.");
    } finally {
      await MWE.refreshDonationAvailability();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { MWE.refreshDonationAvailability(); }, { once: true });
  } else {
    MWE.refreshDonationAvailability();
  }
})();
