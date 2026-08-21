/* Onboarding bridge for the All Mentors screen.

   Everything else in this folder is a byte-for-byte copy of
   live/mu_taxonomy_filters/prototype — the MU Taxonomy mentee-side All Mentors
   screen. This file, and the one <script> tag that loads it, are the only
   additions. Nothing in index.html, app.js, styles.css, taxonomy.js,
   icons.js or mentors-varied.js is edited, so the screen's controls, filter
   behaviour, hierarchy, content and layout are the ones that were reviewed and
   built there.

   What the bridge adds is strictly around the screen: a strip above it carrying
   the way back into onboarding and, after signup, the matched-mentor line the
   onboarding flow used to draw itself. Both are onboarding's concerns, not the
   discovery screen's.

   It reads two query parameters, both set by onboarding-app.html:

     from=onboarding   show the strip at all
     match=<name>      name the mentor the signup answers matched

   Opened without them — which is how the screen is opened from the hub, or by
   double-click — the bridge renders nothing and the page is the All Mentors
   prototype exactly as it stands.

   Plain global, not an ES module, for the same reason the rest of the folder is:
   a page opened from the file system has origin `null` and module scripts are
   blocked by CORS there. */

(function () {
  var params = new URLSearchParams(window.location.search);
  if (params.get('from') !== 'onboarding') return;

  var match = (params.get('match') || '').trim();
  /* This file sits one level below onboarding-app.html, in both the source
     prototype and the hub copy. */
  var back = '../onboarding-app.html';

  var css = document.createElement('style');
  css.textContent = [
    /* The strip sits above the rail and the topbar rather than inside either.
       It borrows the page's own tokens, so it reads as part of the product and
       not as a prototype banner pasted on top. */
    '.ob-strip{position:relative;z-index:30;display:flex;align-items:center;gap:12px;',
    'padding:10px 20px;background:var(--surface-card);',
    'border-bottom:1px solid var(--border-subtle);font-family:var(--font-sans)}',
    '.ob-strip__text{min-width:0;flex:1;font-size:13px;line-height:1.45;color:var(--text-tertiary)}',
    '.ob-strip__text b{color:var(--text-primary);font-weight:600}',
    '.ob-strip__back{display:inline-flex;align-items:center;gap:7px;flex:none;min-height:36px;',
    'padding:0 13px;border:1px solid var(--border-control);border-radius:var(--radius-2);',
    'background:none;color:var(--text-primary);font:600 13px var(--font-sans);cursor:pointer}',
    '.ob-strip__back:hover{border-color:var(--border-strong);background:var(--surface-hover)}',
    /* The rail is fixed with `inset: 0 auto 0 0`, so it starts at the top of the
       viewport and would sit over the strip. Moving its top edge down is enough
       — `bottom: 0` is already set, so it restretches on its own. */
    '.ob-shifted .rail{top:var(--ob-h,52px)}',
    '@media (max-width:767px){.ob-strip{padding:10px 16px;gap:10px}',
    '.ob-strip__text{font-size:12px}}',
    '@media (max-width:430px){.ob-strip{flex-wrap:wrap}',
    '.ob-strip__back{width:100%;justify-content:center;order:2}}',
  ].join('');
  document.head.appendChild(css);

  var strip = document.createElement('div');
  strip.className = 'ob-strip';
  strip.innerHTML =
    '<button class="ob-strip__back" type="button">&larr; Back to signup</button>'
    + '<p class="ob-strip__text">' + (match
      ? 'Based on your answers, your closest match is <b>' + escapeHtml(match) + '</b>. '
        + 'Browse everyone below.'
      : 'Browsing all mentors. Your credits are claimed when you finish signing up.')
    + '</p>';

  strip.querySelector('.ob-strip__back').addEventListener('click', function () {
    window.location.href = back;
  });

  document.body.insertBefore(strip, document.body.firstChild);
  document.body.classList.add('ob-shifted');

  /* The rail offset has to match the strip's real height, which depends on
     whether the text wrapped, so it is measured rather than guessed — and
     re-measured when the window changes width. */
  function sync() {
    document.body.style.setProperty('--ob-h', strip.offsetHeight + 'px');
  }
  sync();
  window.addEventListener('resize', sync);
  if (window.ResizeObserver) new ResizeObserver(sync).observe(strip);

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
