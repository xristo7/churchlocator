/* Shared new-password policy (mirrors src/password-policy.js).
   Inputs marked with data-password-policy get minlength/maxlength, a pattern,
   custom validity, and a live checklist. Remove the attribute to switch the
   policy off (e.g. when a shared field flips to "Sign in"). Sign-in fields
   must never carry data-password-policy. */
(function () {
  "use strict";
  if (window.MWEPasswordPolicy) return;

  var MIN = 8, MAX = 128;
  var RULES = [
    { key: "length", label: "At least 8 characters", test: function (pw) { return pw.length >= MIN; } },
    { key: "uppercase", label: "An uppercase letter", test: function (pw) { return /[A-Z]/.test(pw); } },
    { key: "lowercase", label: "A lowercase letter", test: function (pw) { return /[a-z]/.test(pw); } },
    { key: "number", label: "A number", test: function (pw) { return /[0-9]/.test(pw); } },
    { key: "symbol", label: "A symbol", test: function (pw) { return /[^A-Za-z0-9]/.test(pw); } }
  ];
  var PATTERN = "(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,128}";
  var SELECTOR = "input[data-password-policy]";
  var state = new WeakMap();

  function check(value) {
    var pw = typeof value === "string" ? value : "";
    if (pw.length > MAX) return { ok: false, missing: ["max_length"], message: "Password must be " + MAX + " characters or fewer." };
    var failed = RULES.filter(function (rule) { return !rule.test(pw); });
    return {
      ok: failed.length === 0,
      missing: failed.map(function (rule) { return rule.key; }),
      message: failed.length ? "Password must include: " + failed.map(function (rule) { return rule.label.toLowerCase(); }).join(", ") + "." : ""
    };
  }

  function isEnabled(input) {
    return input.hasAttribute("data-password-policy") && input.getAttribute("data-password-policy") !== "off";
  }

  function anchorFor(input) {
    return input.closest(".account-password-field, .password-input-wrapper") || input;
  }

  function ensureHints(input) {
    var entry = state.get(input);
    if (entry) return entry;
    var list = document.createElement("ul");
    list.className = "password-policy-hints";
    list.setAttribute("aria-live", "polite");
    list.id = (input.id || input.name || "password") + "-policy-hints-" + Math.random().toString(36).slice(2, 7);
    RULES.forEach(function (rule) {
      var item = document.createElement("li");
      item.dataset.rule = rule.key;
      item.textContent = rule.label;
      list.appendChild(item);
    });
    anchorFor(input).insertAdjacentElement("afterend", list);
    entry = { list: list, onInput: function () { update(input); } };
    input.addEventListener("input", entry.onInput);
    state.set(input, entry);
    return entry;
  }

  function update(input) {
    var entry = state.get(input);
    if (!entry) return;
    if (!isEnabled(input)) { input.setCustomValidity(""); return; }
    var pw = input.value || "";
    var result = check(pw);
    entry.list.querySelectorAll("li").forEach(function (item) {
      var met = result.missing.indexOf(item.dataset.rule) === -1 && pw.length > 0;
      item.classList.toggle("is-met", met);
      item.setAttribute("aria-checked", met ? "true" : "false");
    });
    // An empty, optional field is left to the "required" attribute.
    input.setCustomValidity(pw === "" || result.ok ? "" : result.message);
  }

  function apply(input) {
    var entry = ensureHints(input);
    if (isEnabled(input)) {
      input.minLength = MIN;
      input.maxLength = MAX;
      input.pattern = PATTERN;
      input.title = "At least 8 characters with an uppercase letter, a lowercase letter, a number, and a symbol.";
      input.setAttribute("aria-describedby", entry.list.id);
      entry.list.hidden = false;
    } else {
      input.removeAttribute("pattern");
      if (input.getAttribute("aria-describedby") === entry.list.id) input.removeAttribute("aria-describedby");
      entry.list.hidden = true;
    }
    update(input);
  }

  function setEnabled(input, enabled) {
    if (!input) return;
    if (enabled) input.setAttribute("data-password-policy", "");
    else if (state.has(input)) input.setAttribute("data-password-policy", "off");
    if (state.has(input) || enabled) apply(input);
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches(SELECTOR)) apply(root);
    root.querySelectorAll(SELECTOR).forEach(apply);
  }

  function start() {
    scan(document);
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === "attributes") {
          if (mutation.target.matches && mutation.target.matches("input")) {
            if (isEnabled(mutation.target) || state.has(mutation.target)) apply(mutation.target);
          }
        } else mutation.addedNodes.forEach(scan);
      });
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-password-policy"] });
  }

  window.MWEPasswordPolicy = { MIN_LENGTH: MIN, MAX_LENGTH: MAX, PATTERN: PATTERN, check: check, enhance: apply, setEnabled: setEnabled, refresh: update };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
