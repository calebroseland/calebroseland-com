// Resolves the theme before first paint so CSS has one code path and there is no flash.
// External (not inline) so the CSP can stay at script-src 'self'.
(() => {
  var t;
  try {
    t = localStorage.getItem("theme");
  } catch (_) {}
  t = t || "auto";
  document.documentElement.dataset.theme =
    t === "auto" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : t;
})();
