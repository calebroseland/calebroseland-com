// Resolves the theme before first paint so CSS has one code path and there is no flash.
// External (not inline) so the CSP can stay at script-src 'self'. A custom theme arrives already
// resolved to CSS variables (theme-vars, written by the theme store), so this stays tiny.
(() => {
  var root = document.documentElement;
  var t;
  var custom;
  try {
    t = localStorage.getItem("theme");
    if (t && t.indexOf("custom:") === 0) custom = JSON.parse(localStorage.getItem("theme-vars"));
  } catch (_) {}
  if (custom && (custom.base === "light" || custom.base === "dark") && custom.vars) {
    root.dataset.theme = custom.base;
    for (var name in custom.vars)
      if (name.indexOf("--") === 0) root.style.setProperty(name, String(custom.vars[name]));
    return;
  }
  t = t === "light" || t === "dark" ? t : "auto";
  root.dataset.theme =
    t === "auto" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : t;
})();
