(function () {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) return;
  // Play-as-live renders on livestream.html. A normal ?id= still goes to broadcast.html.
  if (params.get("sim") || params.get("simMock")) return;

  const type = params.get("type") || "church";
  window.location.replace(
    "broadcast.html?type=" + encodeURIComponent(type) + "&id=" + encodeURIComponent(id)
  );
})();
