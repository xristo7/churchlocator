(function () {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) return;

  const type = params.get("type") || "church";
  window.location.replace(
    "broadcast.html?type=" + encodeURIComponent(type) + "&id=" + encodeURIComponent(id)
  );
})();
