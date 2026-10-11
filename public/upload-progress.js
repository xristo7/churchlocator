/* Shared upload helper: real byte progress via XMLHttpRequest (fetch has no upload progress).
   MWEUpload.send({ url, formData, file, container, label }) -> Promise<{ ok, status, data }>
   Renders filename, size, percentage, a cancel button, then success or error into `container`.
   Rejects with { name: "AbortError" } when cancelled. Endpoints are unchanged; cookies are sent same-origin. */
(function () {
  "use strict";
  function formatBytes(n) {
    if (!Number.isFinite(n) || n < 0) return "";
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + " KB";
    return (n / 1024 / 1024).toFixed(1) + " MB";
  }
  function el(tag, cls, text) { const node = document.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; }

  function render(container, file, label) {
    const box = el("div", "mwe-upload");
    box.dataset.state = "uploading";
    const head = el("div", "mwe-upload-head");
    const name = el("span", "mwe-upload-name", file ? file.name : (label || "Upload"));
    const pct = el("span", "mwe-upload-pct", "0%");
    head.append(name, pct);
    const bar = el("div", "mwe-upload-bar");
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", "100");
    bar.setAttribute("aria-valuenow", "0");
    bar.setAttribute("aria-label", (label || "Uploading") + (file ? " " + file.name : ""));
    const fill = el("span", "mwe-upload-fill");
    bar.append(fill);
    const foot = el("div", "mwe-upload-foot");
    const size = el("span", "mwe-upload-size", file ? "0 B of " + formatBytes(file.size) : "");
    size.setAttribute("aria-live", "polite");
    const cancel = el("button", "mwe-upload-cancel", "Cancel");
    cancel.type = "button";
    foot.append(size, cancel);
    box.append(head, bar, foot);
    container.replaceChildren(box);
    container.hidden = false;
    return {
      box, cancel,
      progress(loaded, total) {
        const p = total ? Math.min(100, Math.round(loaded / total * 100)) : 0;
        fill.style.width = p + "%"; pct.textContent = p + "%"; bar.setAttribute("aria-valuenow", String(p));
        size.textContent = formatBytes(loaded) + " of " + formatBytes(total);
        if (p >= 100) size.textContent = "Processing…";
      },
      done(state, message) {
        box.dataset.state = state; cancel.remove();
        if (state === "success") { fill.style.width = "100%"; pct.textContent = "100%"; bar.setAttribute("aria-valuenow", "100"); }
        size.textContent = message; size.setAttribute("role", state === "error" ? "alert" : "status");
      }
    };
  }

  function send(opts) {
    const { url, formData, file, container, label, method = "POST", successMessage = "Upload complete", timeoutMs = 0 } = opts;
    const ui = container ? render(container, file, label) : null;
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.withCredentials = true;
      xhr.responseType = "text";
      if (timeoutMs) xhr.timeout = timeoutMs;
      xhr.upload.onprogress = event => { if (event.lengthComputable) { ui?.progress(event.loaded, event.total); opts.onProgress?.(event.loaded, event.total); } };
      const fail = (message, name) => { ui?.done(name === "AbortError" ? "cancelled" : "error", message); const error = new Error(message); error.name = name || "UploadError"; reject(error); };
      xhr.onload = () => {
        let data = null; try { data = JSON.parse(xhr.responseText); } catch {}
        const ok = xhr.status >= 200 && xhr.status < 300 && data?.ok !== false;
        if (ok) ui?.done("success", successMessage);
        else ui?.done("error", data?.error || "Upload failed (" + xhr.status + ").");
        resolve({ ok, status: xhr.status, data });
      };
      xhr.onerror = () => fail("The upload lost its connection. Check your network and try again.");
      xhr.ontimeout = () => fail("The upload took too long. Check your connection and try again.", "TimeoutError");
      xhr.onabort = () => fail("Upload cancelled.", "AbortError");
      ui?.cancel.addEventListener("click", () => xhr.abort());
      opts.signal?.addEventListener("abort", () => xhr.abort());
      xhr.send(formData);
    });
  }
  window.MWEUpload = { send, formatBytes };
})();
