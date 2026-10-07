// Resolves the theme before first paint so CSS has one code path and there is no flash.
// External (not inline) so the CSP can stay at script-src 'self'. A custom theme arrives already
// resolved to CSS variables (theme-vars, written by the theme store), so this stays tiny.
// The Adobe Fonts kit is linked only when the theme in use needs it: a custom theme says so itself
// (adobe), the default theme through the meta tag the content plugin writes.
(() => {
  var root = document.documentElement;
  var kit = document.querySelector('meta[name="adobe-fonts"]');
  var adobe = (needed) => {
    if (!needed || !kit || document.getElementById('adobe-fonts')) {
      return;
    }
    var link = document.createElement('link');
    link.id = 'adobe-fonts';
    link.rel = 'stylesheet';
    link.href = kit.content;
    document.head.appendChild(link);
  };
  var t;
  var custom;
  try {
    t = localStorage.getItem('theme');
    if (t && t.indexOf('custom:') === 0) {
      custom = JSON.parse(localStorage.getItem('theme-vars'));
    }
  } catch (_) {}
  if (custom && (custom.base === 'light' || custom.base === 'dark') && custom.vars) {
    root.dataset.theme = custom.base;
    for (var name in custom.vars) {
      if (name.indexOf('--') === 0) {
        root.style.setProperty(name, String(custom.vars[name]));
      }
    }
    // Saved before themes recorded this: assume the kit, as every theme loaded it then.
    adobe(custom.adobe !== false);
    return;
  }
  adobe(kit && kit.dataset.default === 'on');
  // Anything but an explicit choice follows the system.
  if (t !== 'light' && t !== 'dark') {
    t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  root.dataset.theme = t;
})();
