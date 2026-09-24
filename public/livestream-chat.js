(function (root) {
  "use strict";

  const mountedChats = new WeakMap();
  const pollIntervalMs = 3000;

  async function request(path, body) {
    if (root.MWEPlatform?.api) return root.MWEPlatform.api(path, body);
    const response = await fetch("/api/" + path, {
      method: body ? "POST" : "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: body ? { "content-type": "application/json" } : {},
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      const error = new Error(data.error || "Livestream chat is unavailable.");
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function status(messages, text, kind) {
    let element = messages.querySelector("[data-chat-status]");
    if (!element) {
      element = document.createElement("p");
      element.dataset.chatStatus = "";
      messages.append(element);
    }
    element.className = "broadcast-chat-status" + (kind ? " is-" + kind : "");
    element.textContent = text;
    return element;
  }

  function messageElement(message) {
    const article = document.createElement("article");
    article.dataset.messageId = message.id;
    if (message.own) article.classList.add("is-own");

    const sender = document.createElement("b");
    sender.textContent = message.own ? "You" : message.name;
    const copy = document.createElement("p");
    copy.textContent = message.body;
    const time = document.createElement("time");
    const createdAt = new Date(message.createdAt);
    time.dateTime = message.createdAt;
    time.textContent = Number.isNaN(createdAt.getTime()) ? "" : createdAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    article.append(sender, copy, time);
    return article;
  }

  function mount({ streamType, entityId, messages, form, input }) {
    if (!streamType || !entityId || !messages || !form || !input) return null;
    mountedChats.get(messages)?.destroy();

    const path = "livestream-chat/" + encodeURIComponent(streamType) + "/" + encodeURIComponent(entityId);
    const seen = new Set();
    const currentUser = root.MWEPlatform?.session || null;
    const submitButton = form.querySelector("button");
    let stopped = false;
    let loading = false;
    let timer = null;

    messages.replaceChildren();
    status(messages, "Loading live conversation…");
    input.maxLength = 300;
    input.autocomplete = "off";
    input.readOnly = !currentUser;
    input.placeholder = currentUser ? "Write a message…" : "Sign in to join the chat";
    submitButton?.setAttribute("aria-label", currentUser ? "Send message" : "Sign in to chat");

    function append(records) {
      const nearBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 80;
      messages.querySelector("[data-chat-status]")?.remove();
      for (const record of records) {
        if (!record?.id || seen.has(record.id)) continue;
        seen.add(record.id);
        messages.append(messageElement(record));
      }
      if (!seen.size) status(messages, "No messages yet. Start the conversation.", "empty");
      else if (nearBottom) messages.scrollTop = messages.scrollHeight;
    }

    async function refresh(initial = false) {
      if (stopped || loading || (!initial && document.hidden)) return;
      loading = true;
      try {
        const result = await request(path);
        append(result.messages || []);
      } catch (error) {
        if (initial || !seen.size) status(messages, error.message || "Livestream chat is unavailable.", "error");
      } finally {
        loading = false;
      }
    }

    function askForSignIn() {
      root.MWE?.openMemberLogin?.(location.href);
      root.showToast?.("Sign in to join the live conversation.");
    }

    async function submit(event) {
      event.preventDefault();
      if (!currentUser) {
        askForSignIn();
        return;
      }
      const body = input.value.trim();
      if (!body) return;
      input.disabled = true;
      if (submitButton) submitButton.disabled = true;
      try {
        const result = await request(path, { body });
        input.value = "";
        append([result.message]);
      } catch (error) {
        root.showToast?.(error.message || "Your chat message could not be sent.");
      } finally {
        input.disabled = false;
        if (submitButton) submitButton.disabled = false;
        input.focus();
      }
    }

    const onInputClick = () => { if (!currentUser) askForSignIn(); };
    const onButtonClick = event => {
      if (currentUser) return;
      event.preventDefault();
      askForSignIn();
    };
    const onVisibility = () => { if (!document.hidden) refresh(); };
    form.addEventListener("submit", submit);
    input.addEventListener("click", onInputClick);
    submitButton?.addEventListener("click", onButtonClick);
    document.addEventListener("visibilitychange", onVisibility);
    refresh(true);
    timer = window.setInterval(refresh, pollIntervalMs);

    const controller = {
      destroy() {
        stopped = true;
        window.clearInterval(timer);
        form.removeEventListener("submit", submit);
        input.removeEventListener("click", onInputClick);
        submitButton?.removeEventListener("click", onButtonClick);
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
    mountedChats.set(messages, controller);
    return controller;
  }

  root.MWELivestreamChat = { mount };
})(window);
