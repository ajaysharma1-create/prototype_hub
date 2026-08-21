/* MU Taxonomy — Mentor Side.

   ── What this prototype claims, and on what evidence ────────────────────────
   The mentee-side prototype (live/mu_taxonomy_filters/prototype) shows what the
   new taxonomy does to mentor discovery. This one shows what it does to a
   mentor's own profile, and it only says things the taxonomy folder supports:

     · Industry. All 23 existing industries survive into the final 40 under the
       same label — computed, not assumed: no value in `existingIndustries` is
       absent from `allIndustries`. So no mentor loses or has to re-pick an
       industry. What does change is the cap (1 -> 2), the 17 net-new options,
       and the fact that the system now derives the Industry Group.
       Source: MentorUnion Taxonomy Changes - Industry_Domain_Expertise.md.

     · Functional Domain. Four domains are added (isNew: true in taxonomy.js);
       the other fifteen are unchanged. Nothing states that any domain is
       retired or remapped, so this prototype does not remap any.

     · Expertise. `expertiseAliases` is the only stated migration: 39 pairs,
       18 RENAME and 21 MERGE. A RENAME is the same expertise under a new label
       — the taxonomy's own rule 4, "labels are display, identifiers are truth;
       renaming never orphans a mentor" — so it is carried over silently and
       flagged as a wording change, not as work. A MERGE collapses the mentor's
       value into a broader one and is one-way and final (rule 6), so it is
       carried over and flagged for review, because the mentor may now sit under
       a value they did not choose, and two of their selections may collapse
       into one.

   ── What it deliberately does not claim ─────────────────────────────────────
     · It does not remove or rewrite any selection on the mentor's behalf beyond
       the 39 documented amendments. Open decision §7.3 — what happens to
       existing expertise values not named in the amendments — is unresolved, so
       every unnamed value is shown as carried over untouched.
     · It does not auto-assign any net-new industry, domain or expertise. The
       requirements document is explicit: "do not assign any newly added
       Industry unless the mentor selects it later."
     · It does not state a new expertise cap. §7.2 is open; the screens hold the
       cap the Tally form enforces today (8).
     · It does not invent an approval, verification or re-review step after
       saving. Nothing in the folder describes one.

   ── Structure ───────────────────────────────────────────────────────────────
   Seven screens in two halves, and the halves are kept visibly apart because
   they ask different things of the mentor:

     notice   1 What changed · 2 What changed for you · 3 Review or update
     edit     4 Industry · 5 Domains · 6 Expertise -> 7 Updated

   The notice screens carry no form controls and no step rail. The edit screens
   carry both, plus a sticky heading so the axis and its cap stay visible while
   the list scrolls.

   Loaded as a plain script, not an ES module, for the same file-system reason
   the mentee-side prototype is. */

const missing = ['MU_ICONS', 'MU_TAXONOMY', 'MU_MENTOR_PROFILE'].filter((k) => !window[k]);
const screenEl = document.getElementById('screen');

if (missing.length) {
  screenEl.innerHTML = '<div class="card"><div class="card__title">This page did not load</div>'
    + '<div class="card__body">Missing: ' + missing.join(', ')
    + '. Open index.html so the data files load in order.</div></div>';
  throw new Error('Missing data globals: ' + missing.join(', '));
}

const icons = window.MU_ICONS;
const { functionalDomains, expertiseByDomain, industryGroups, expertiseAliases } = window.MU_TAXONOMY;
const profile = window.MU_MENTOR_PROFILE;

/* ── Helpers ───────────────────────────────────────────────────────────── */

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function iconSvg(name, size) {
  const i = icons[name];
  if (!i) return '';
  return '<svg viewBox="' + i.viewBox + '" width="' + size + '" height="' + size
    + '" fill="currentColor" aria-hidden="true">' + i.body + '</svg>';
}

function paintIcons(root) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    el.innerHTML = iconSvg(el.dataset.icon, Number(el.dataset.size || 16));
  });
}

const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

/* ── Taxonomy lookups ──────────────────────────────────────────────────── */

const industryToGroup = new Map();
industryGroups.forEach((g) => g.industries.forEach((i) => industryToGroup.set(i.name, g.group)));

const domainIsNew = new Map(functionalDomains.map((d) => [d.name, d.isNew]));
const newDomains = functionalDomains.filter((d) => d.isNew).map((d) => d.name);
const newIndustries = industryGroups.flatMap((g) => g.industries.filter((i) => i.isNew).map((i) => i.name));

/* An expertise names more than one domain only where the source lists it twice;
   the first owner is used for grouping, which is how the mentee-side prototype
   resolves the same case. */
const expertiseToDomain = new Map();
Object.entries(expertiseByDomain).forEach(([domain, list]) => {
  list.forEach((e) => { if (!expertiseToDomain.has(e)) expertiseToDomain.set(e, domain); });
});

const aliasByFrom = new Map(expertiseAliases.map((a) => [a.from, a]));

/* How many of the mentor's own selections resolve to each destination. Two
   collapsing into one is the case worth naming on screen, and it is only
   knowable by counting. */
function mergeSourcesFor(destination, selections) {
  return selections.filter((v) => {
    const a = aliasByFrom.get(v);
    return a && a.to === destination;
  });
}

/* ── Migration ─────────────────────────────────────────────────────────── */

/* The mentor's eight pre-change expertise values, resolved through
   `expertiseAliases`. Order is preserved; duplicates created by a merge are
   folded into the first occurrence and recorded on it. */
function migrateExpertise(selections) {
  const out = [];
  const seen = new Map();

  selections.forEach((value) => {
    const alias = aliasByFrom.get(value);
    const to = alias ? alias.to : value;
    const state = !alias ? 'kept' : alias.action === 'RENAME' ? 'renamed' : 'review';

    if (seen.has(to)) {
      const first = out[seen.get(to)];
      first.from.push(value);
      first.state = 'review';
      first.collapsed = true;
      return;
    }
    seen.set(to, out.length);
    out.push({ value: to, from: [value], state, collapsed: false, domain: expertiseToDomain.get(to) || null });
  });

  return out;
}

const migrated = {
  industries: profile.industries.map((name) => ({
    value: name, state: 'kept', group: industryToGroup.get(name) || null,
  })),
  domains: profile.domains.map((name) => ({
    value: name, state: domainIsNew.get(name) ? 'new' : 'kept',
  })),
  expertise: migrateExpertise(profile.expertise),
};

const counts = {
  kept: migrated.expertise.filter((e) => e.state === 'kept').length
    + migrated.industries.length + migrated.domains.length,
  renamed: migrated.expertise.filter((e) => e.state === 'renamed').length,
  review: migrated.expertise.filter((e) => e.state === 'review').length,
};
const collapsedPairs = migrated.expertise.filter((e) => e.collapsed);
const expertiseBefore = profile.expertise.length;
const expertiseAfter = migrated.expertise.length;

/* ── State ─────────────────────────────────────────────────────────────── */

/* Edits start from the migrated profile, never from the pre-change one: the
   mentor is correcting the result of the change, not redoing their profile. */
const state = {
  screen: 'changed',
  industries: new Set(migrated.industries.map((r) => r.value)),
  domains: new Set(migrated.domains.map((r) => r.value)),
  expertise: new Set(migrated.expertise.map((r) => r.value)),
  query: { industry: '', expertise: '' },
  saved: false,
};

const startingExpertise = new Set(state.expertise);
const startingIndustries = new Set(state.industries);
const startingDomains = new Set(state.domains);

const EDIT_STEPS = [
  { id: 'industry', label: 'Industry' },
  { id: 'domains', label: 'Domains' },
  { id: 'expertise', label: 'Expertise' },
];

const TAG_LABEL = {
  kept: 'Unchanged',
  renamed: 'Renamed',
  review: 'Review',
  new: 'New',
};

/* ── Shared fragments ──────────────────────────────────────────────────── */

const tag = (state_) => '<span class="tag tag--' + state_ + '">' + TAG_LABEL[state_] + '</span>';

function stepsHtml(currentId) {
  const at = EDIT_STEPS.findIndex((s) => s.id === currentId);
  return '<nav class="steps" aria-label="Progress">'
    + EDIT_STEPS.map((s, i) => {
      const st = i < at ? 'done' : i === at ? 'current' : 'todo';
      return (i ? '<span class="steps__sep" aria-hidden="true"></span>' : '')
        + '<span class="steps__item" data-state="' + st + '"'
        + (st === 'current' ? ' aria-current="step"' : '') + '>'
        + '<span class="steps__dot" aria-hidden="true">' + (i + 1) + '</span>'
        + '<span class="steps__label">' + esc(s.label) + '</span></span>';
    }).join('')
    + '</nav>';
}

function headHtml(eyebrow, title, lead) {
  return '<div class="head">'
    + (eyebrow ? '<span class="head__eyebrow">' + esc(eyebrow) + '</span>' : '')
    + '<h1 class="head__title">' + esc(title) + '</h1>'
    + (lead ? '<p class="head__lead">' + lead + '</p>' : '')
    + '</div>';
}

/* One primary action per screen, always last in the row and always the
   recommended move. */
function actionsHtml(buttons) {
  return '<div class="actions">' + buttons.map((b) => {
    if (b.spacer) return '<span class="actions__spacer"></span>';
    return '<button class="btn btn--' + b.kind + '" type="button" data-go="' + b.go + '"'
      + (b.disabled ? ' disabled' : '') + '>' + esc(b.label) + '</button>';
  }).join('') + '</div>';
}

function chipsHtml(values, axis, removable) {
  if (!values.length) return '<p class="empty">Nothing selected yet.</p>';
  return '<div class="chips">' + values.map((v) =>
    '<span class="chip"><span>' + esc(v) + '</span>'
    + (removable
      ? '<button type="button" data-drop="' + axis + '" data-value="' + esc(v) + '"'
        + ' aria-label="Remove ' + esc(v) + '" data-icon="x" data-size="13"></button>'
      : '') + '</span>').join('') + '</div>';
}

/* ── Screen 1 — What changed ───────────────────────────────────────────── */

function screenChanged() {
  return headHtml(
    'Profile update',
    'We have updated how expertise is organised',
    'MentorUnion has widened the lists mentors pick from, so mentees can find you by what you '
    + 'actually did rather than by the nearest available option. <strong>Your profile is still '
    + 'live and everything you selected has been carried over.</strong>')

    + '<div class="stack">'

    + '<div class="card"><div class="card__title">' + iconWrap('stack') + 'What is different</div>'
    + '<div class="card__body"><p>The three lists you chose from — Industry, Functional Domain and '
    + 'Expertise — are longer and better sorted. Industry now has '
    + industryGroups.reduce((n, g) => n + g.industries.length, 0) + ' options across '
    + industryGroups.length + ' groups, Functional Domain has ' + functionalDomains.length
    + ', and Expertise has ' + Object.values(expertiseByDomain).flat().length + '.</p>'
    + '<p>Some expertise wording was tidied up, and a few near-identical options were combined '
    + 'into one. You can also now pick <strong>two industries</strong> instead of one.</p></div></div>'

    + '<div class="card"><div class="card__title">' + iconWrap('check') + 'What we kept</div>'
    + '<div class="card__body"><p>Every selection on your profile was carried across. Nothing was '
    + 'deleted, and nothing new was added on your behalf — new options are yours to pick if you '
    + 'want them.</p></div></div>'

    + '<div class="card"><div class="card__title">' + iconWrap('user') + 'What we need from you</div>'
    + '<div class="card__body"><p>' + (counts.review
      ? plural(counts.review, 'of your expertise selections has', 'of your expertise selections have')
        + ' moved into a combined option. Worth a look, so you can confirm it still describes you — '
        + 'or swap it for something closer.'
      : 'Nothing. This is for your information only.')
    + '</p></div></div>'

    + '</div>'

    + actionsHtml([
      { kind: 'quiet', label: 'Remind me later', go: 'later' },
      { spacer: true },
      { kind: 'primary', label: 'See what changed for me', go: 'summary' },
    ]);
}

function iconWrap(name) {
  return '<span data-icon="' + name + '" data-size="16" aria-hidden="true"></span>';
}

/* ── Screen 2 — What changed for you ───────────────────────────────────── */

function rowsHtml(rows) {
  return rows.map((r) => '<div class="vrow"><div class="vrow__main">'
    + '<div class="vrow__label">' + esc(r.label) + '</div>'
    + (r.note ? '<div class="vrow__note">' + r.note + '</div>' : '')
    + '</div>' + tag(r.state) + '</div>').join('');
}

function screenSummary() {
  const industryRows = migrated.industries.map((r) => ({
    label: r.value, state: 'kept',
    note: r.group ? 'Counted under ' + esc(r.group) + ' automatically. You do not pick the group.' : '',
  }));

  const domainRows = migrated.domains.map((r) => ({ label: r.value, state: r.state, note: '' }));

  const expertiseRows = migrated.expertise.map((r) => {
    if (r.state === 'kept') return { label: r.value, state: 'kept', note: '' };
    if (r.state === 'renamed') {
      return {
        label: r.value, state: 'renamed',
        note: 'Same expertise, new wording. You had <span class="vrow__was">' + esc(r.from[0])
          + '</span>.',
      };
    }
    const note = r.collapsed
      ? 'Your <span class="vrow__was">' + r.from.map(esc).join('</span> and <span class="vrow__was">')
        + '</span> selections are now one option.'
      : 'Combined with related options. You had <span class="vrow__was">' + esc(r.from[0]) + '</span>.';
    return { label: r.value, state: 'review', note };
  });

  return headHtml(
    'Your profile',
    'What changed for you',
    counts.kept + ' of your selections stayed exactly as they were. '
      + plural(counts.renamed + counts.review, 'was', 'were')
      + ' affected by the update. Nothing was removed from your profile.')

    + '<div class="summary">'
    + '<div class="summary__cell"><div class="summary__n">' + counts.kept + '</div>'
    + '<div class="summary__k">Carried over unchanged</div></div>'
    + '<div class="summary__cell"><div class="summary__n">' + counts.renamed + '</div>'
    + '<div class="summary__k">Renamed only — nothing to do</div></div>'
    + '<div class="summary__cell"><div class="summary__n summary__n--review">' + counts.review + '</div>'
    + '<div class="summary__k">Worth reviewing</div></div>'
    + '</div>'

    + '<div class="stack">'

    + '<div class="card"><div class="card__title">Industry'
    + '<span class="count">' + state.industries.size + ' of ' + profile.caps.industries + '</span></div>'
    + '<div style="margin-top:6px">' + rowsHtml(industryRows) + '</div>'
    + '<div class="card__body">You could pick one industry before. You can now pick two, and '
    + newIndustries.length + ' new industries were added — none of them applied to you '
    + 'automatically.</div></div>'

    + '<div class="card"><div class="card__title">Functional domain'
    + '<span class="count">' + state.domains.size + ' of ' + profile.caps.domains + '</span></div>'
    + '<div style="margin-top:6px">' + rowsHtml(domainRows) + '</div>'
    + '<div class="card__body">Both of your domains are unchanged. ' + newDomains.length
    + ' new domains were added: ' + esc(newDomains.join(', ')) + '.</div></div>'

    + '<div class="card"><div class="card__title">Expertise'
    + '<span class="count">' + expertiseBefore + ' &rarr; ' + expertiseAfter + '</span></div>'
    + '<div style="margin-top:6px">' + rowsHtml(expertiseRows) + '</div>'
    + (collapsedPairs.length
      ? '<div class="card__body">' + plural(collapsedPairs.length, 'pair', 'pairs')
        + ' of your selections turned out to describe the same thing and became one option, so you '
        + 'are using ' + expertiseAfter + ' of your ' + profile.caps.expertise
        + ' expertise slots instead of ' + expertiseBefore + '.</div>'
      : '')
    + '</div>'

    + '</div>'

    + actionsHtml([
      { kind: 'quiet', label: 'Back', go: 'changed' },
      { spacer: true },
      { kind: 'primary', label: 'Continue', go: 'decide' },
    ]);
}

/* ── Screen 3 — Review or update ───────────────────────────────────────── */

function screenDecide() {
  return headHtml(
    null,
    'Review your selections',
    'Your profile works as it is. Reviewing it takes about two minutes and makes sure mentees '
    + 'searching the new lists still find you.')

    + '<div class="stack">'

    + '<div class="card"><div class="card__title">' + iconWrap('adjustments-horizontal')
    + 'What you will go through</div>'
    + '<div class="card__body"><p><strong>Industry</strong> — confirm yours, and add a second if it '
    + 'helps.</p><p><strong>Functional domain</strong> — confirm the areas you work in. These decide '
    + 'which expertise you can pick from.</p><p><strong>Expertise</strong> — check the '
    + plural(counts.review, 'combined option', 'combined options') + ' and swap anything that no '
    + 'longer fits.</p></div></div>'

    + '<div class="card"><div class="card__title">' + iconWrap('help-circle') + 'If you skip it</div>'
    + '<div class="card__body">Your profile stays exactly as it is now, with everything carried '
    + 'over. You can review it any time from your profile settings.</div></div>'

    + '</div>'

    + actionsHtml([
      { kind: 'quiet', label: 'Not now', go: 'later' },
      { spacer: true },
      { kind: 'primary', label: 'Review my profile', go: 'industry' },
    ]);
}

/* ── Selection screens ─────────────────────────────────────────────────── */

/* One row builder for all three axes: a native checkbox in a label, disabled
   once the cap is reached so the limit is felt before it is explained. */
function optionHtml(axis, value, meta) {
  const set = state[axis];
  const on = set.has(value);
  const full = set.size >= profile.caps[axis === 'industries' ? 'industries' : axis];
  const dis = !on && full;
  return '<label class="opt"><input type="checkbox" data-axis="' + axis + '"'
    + ' value="' + esc(value) + '"' + (on ? ' checked' : '') + (dis ? ' disabled' : '') + '>'
    + '<span class="opt__text">' + esc(value)
    + (meta ? '<span class="opt__meta">' + esc(meta) + '</span>' : '') + '</span></label>';
}

function stickyHead(title, current, cap, hint, searchAxis) {
  const over = current > cap;
  return '<div class="sticky-head">'
    + '<div class="card__title">' + esc(title)
    + '<span class="count">' + current + ' of ' + cap + '</span></div>'
    + '<p class="hint' + (over ? ' hint--over' : '') + '">' + hint + '</p>'
    + (searchAxis
      ? '<div class="search"><span data-icon="search" data-size="16" aria-hidden="true"></span>'
        + '<label class="sr-only" for="q">Search ' + esc(title.toLowerCase()) + '</label>'
        + '<input id="q" type="search" autocomplete="off" spellcheck="false"'
        + ' data-query="' + searchAxis + '" value="' + esc(state.query[searchAxis]) + '"'
        + ' placeholder="Search"></div>'
      : '')
    + '</div>';
}

/* ── Screen 4 — Industry ───────────────────────────────────────────────── */

function screenIndustry() {
  const q = state.query.industry.trim().toLowerCase();
  const groups = industryGroups.map((g) => {
    const hits = g.industries.filter((i) =>
      !q || i.name.toLowerCase().includes(q) || g.group.toLowerCase().includes(q));
    return { group: g.group, industries: hits };
  }).filter((g) => g.industries.length);

  const derived = [...state.industries]
    .map((n) => industryToGroup.get(n)).filter(Boolean);
  const uniqueGroups = [...new Set(derived)];

  const body = groups.length
    ? groups.map((g) => '<div class="group"><div class="group__name">' + esc(g.group) + '</div>'
      + '<div class="opts">' + g.industries.map((i) =>
        optionHtml('industries', i.name, i.isNew ? 'New option' : '')).join('')
      + '</div></div>').join('')
    : '<p class="empty">No industry matches &ldquo;' + esc(state.query.industry) + '&rdquo;.</p>';

  return stepsHtml('industry')
    + headHtml(null, 'Where you have worked',
      'Pick the industry you spent your career in. You can now pick a second one.')

    + '<div class="card">'
    + stickyHead('Industry', state.industries.size, profile.caps.industries,
      state.industries.size >= profile.caps.industries
        ? 'You have used both slots. Remove one to pick a different industry.'
        : 'Select up to ' + profile.caps.industries + '. Grouping is worked out for you.',
      'industry')
    + body
    + '</div>'

    + (uniqueGroups.length
      ? '<div class="card"><div class="card__title">Counted under</div>'
        + '<div class="chips">' + uniqueGroups.map((g) =>
          '<span class="chip chip--derived"><span>' + esc(g) + '</span></span>').join('')
        + '</div>'
        + '<div class="card__body">Mentees can search by either the group or the exact industry. '
        + 'An exact match ranks higher.</div></div>'
      : '')

    + actionsHtml([
      { kind: 'quiet', label: 'Back', go: 'decide' },
      { spacer: true },
      { kind: 'primary', label: 'Next', go: 'domains', disabled: state.industries.size === 0 },
    ]);
}

/* ── Screen 5 — Functional domain ──────────────────────────────────────── */

function screenDomains() {
  const orphaned = orphanedExpertise();

  return stepsHtml('domains')
    + headHtml(null, 'What you do',
      'Your domains decide which expertise you can pick from on the next screen.')

    + '<div class="card">'
    + stickyHead('Functional domain', state.domains.size, profile.caps.domains,
      state.domains.size >= profile.caps.domains
        ? 'You have used both slots. Remove one to pick a different domain.'
        : 'Select up to ' + profile.caps.domains + '.', null)
    + '<div class="opts">' + functionalDomains.map((d) =>
      optionHtml('domains', d.name, d.isNew ? 'New option' : '')).join('') + '</div>'
    + '</div>'

    + (orphaned.length
      ? '<div class="card"><div class="card__title">' + iconWrap('help-circle')
        + 'Expertise outside your domains</div>'
        + '<div class="card__body">' + plural(orphaned.length, 'selection sits', 'selections sit')
        + ' under a domain you have not selected. ' + (state.domains.size >= profile.caps.domains
          ? 'Keep it by selecting its domain instead of one you have, or drop it on the next screen.'
          : 'Add its domain to keep it, or drop it on the next screen.') + '</div>'
        + '<div style="margin-top:4px">' + orphaned.map((e) =>
          '<div class="vrow"><div class="vrow__main"><div class="vrow__label">' + esc(e.value)
          + '</div><div class="vrow__note">Sits under ' + esc(e.domain) + '</div></div>'
          + '<span class="tag tag--review">Review</span></div>').join('')
        + '</div></div>'
      : '')

    + actionsHtml([
      { kind: 'quiet', label: 'Back', go: 'industry' },
      { spacer: true },
      { kind: 'primary', label: 'Next', go: 'expertise', disabled: state.domains.size === 0 },
    ]);
}

/* Expertise the mentor still holds whose owning domain is no longer selected.
   Selecting a domain narrows the expertise list, so dropping a domain can strand
   a selection; saying so on the domain screen is cheaper than letting the
   mentor find a missing row two screens later. */
function orphanedExpertise() {
  return [...state.expertise]
    .map((v) => ({ value: v, domain: expertiseToDomain.get(v) }))
    .filter((e) => e.domain && !state.domains.has(e.domain));
}

/* ── Screen 6 — Expertise ──────────────────────────────────────────────── */

function screenExpertise() {
  const q = state.query.expertise.trim().toLowerCase();
  const chosen = [...state.domains];

  const groups = chosen.map((d) => {
    const list = (expertiseByDomain[d] || []).filter((e) => !q || e.toLowerCase().includes(q));
    return { domain: d, list };
  }).filter((g) => g.list.length);

  const reviewValues = new Set(migrated.expertise.filter((r) => r.state === 'review').map((r) => r.value));

  const body = groups.length
    ? groups.map((g) => '<div class="group"><div class="group__name">' + esc(g.domain) + '</div>'
      + '<div class="opts">' + g.list.map((e) =>
        optionHtml('expertise', e, reviewValues.has(e) && state.expertise.has(e)
          ? 'Combined during the update — worth a look' : '')).join('')
      + '</div></div>').join('')
    : '<p class="empty">' + (q
      ? 'No expertise in your domains matches &ldquo;' + esc(state.query.expertise) + '&rdquo;.'
      : 'Select a functional domain to see expertise options.') + '</p>';

  const orphaned = orphanedExpertise();

  return stepsHtml('expertise')
    + headHtml(null, 'What you help with',
      'Options are shown under the domains you selected. The '
      + plural(counts.review, 'combined option is', 'combined options are') + ' marked.')

    + '<div class="card">'
    + stickyHead('Expertise', state.expertise.size, profile.caps.expertise,
      state.expertise.size >= profile.caps.expertise
        ? 'You have used all ' + profile.caps.expertise + ' slots. Remove one to add another.'
        : 'Select up to ' + profile.caps.expertise + '.',
      'expertise')
    + body
    + '</div>'

    + '<div class="card"><div class="card__title">Selected'
    + '<span class="count">' + state.expertise.size + ' of ' + profile.caps.expertise + '</span></div>'
    + chipsHtml([...state.expertise], 'expertise', true)
    + (orphaned.length
      ? '<div class="card__body">' + plural(orphaned.length, 'selection is', 'selections are')
        + ' outside your selected domains and cannot be found in the lists above: '
        + orphaned.map((e) => esc(e.value)).join(', ') + '. Remove '
        + (orphaned.length === 1 ? 'it' : 'them') + ' here, or go back and select '
        + (orphaned.length === 1 ? 'its domain' : 'their domains') + '.</div>'
      : '')
    + '</div>'

    + actionsHtml([
      { kind: 'quiet', label: 'Back', go: 'domains' },
      { spacer: true },
      { kind: 'primary', label: 'Review and save', go: 'confirm',
        disabled: state.expertise.size === 0 },
    ]);
}

/* ── Screen 7 — Confirm ────────────────────────────────────────────────── */

function diffRows(startSet, nowSet) {
  const added = [...nowSet].filter((v) => !startSet.has(v));
  const removed = [...startSet].filter((v) => !nowSet.has(v));
  return { added, removed };
}

function screenConfirm() {
  const axes = [
    { key: 'industries', title: 'Industry', go: 'industry' },
    { key: 'domains', title: 'Functional domain', go: 'domains' },
    { key: 'expertise', title: 'Expertise', go: 'expertise' },
  ];
  const start = { industries: startingIndustries, domains: startingDomains, expertise: startingExpertise };

  let touched = 0;
  const cards = axes.map((a) => {
    const d = diffRows(start[a.key], state[a.key]);
    touched += d.added.length + d.removed.length;
    return '<div class="card"><div class="card__title">' + esc(a.title)
      + '<span class="count">' + state[a.key].size + ' of ' + profile.caps[a.key] + '</span></div>'
      + chipsHtml([...state[a.key]], a.key, false)
      + (d.added.length || d.removed.length
        ? '<div class="card__body">'
          + (d.added.length ? '<p>Added: ' + d.added.map(esc).join(', ') + '</p>' : '')
          + (d.removed.length ? '<p>Removed: ' + d.removed.map(esc).join(', ') + '</p>' : '')
          + '</div>'
        : '<div class="card__body">Unchanged from the carried-over profile.</div>')
      + '<div class="actions" style="position:static;margin:12px 0 0;padding:0;border:0;background:none">'
      + '<button class="btn btn--secondary" type="button" data-go="' + a.go + '">Edit '
      + esc(a.title.toLowerCase()) + '</button></div>'
      + '</div>';
  }).join('');

  return headHtml(null, 'Review and save',
    touched
      ? 'You changed ' + plural(touched, 'selection', 'selections') + '. Check it over before saving.'
      : 'You have not changed anything. Saving confirms the carried-over profile as it stands.')

    + '<div class="stack">' + cards + '</div>'

    + actionsHtml([
      { kind: 'quiet', label: 'Back', go: 'expertise' },
      { spacer: true },
      { kind: 'primary', label: 'Save profile', go: 'save' },
    ]);
}

/* ── Screen 8 — Updated ────────────────────────────────────────────────── */

function screenDone() {
  const rows = [
    ['Industry', [...state.industries].join(', ')],
    ['Counted under', [...new Set([...state.industries]
      .map((n) => industryToGroup.get(n)).filter(Boolean))].join(', ')],
    ['Functional domain', [...state.domains].join(', ')],
    ['Expertise', [...state.expertise].join(', ')],
  ];

  return '<div class="done">'
    + '<div class="done__mark">' + iconSvg('check', 28) + '</div>'
    + '<h1 class="head__title">Your profile is up to date</h1>'
    + '<p class="head__lead">Mentees searching the new lists will find you under these selections. '
    + 'You can change them any time from your profile.</p>'

    + '<div class="card"><div class="card__title">Saved</div>'
    + '<div style="margin-top:6px">' + rows.filter((r) => r[1]).map((r) =>
      '<div class="vrow"><div class="vrow__main"><div class="vrow__note">' + esc(r[0]) + '</div>'
      + '<div class="vrow__label">' + esc(r[1]) + '</div></div></div>').join('')
    + '</div></div>'

    + '</div>'

    + actionsHtml([
      { spacer: true },
      { kind: 'secondary', label: 'Review again', go: 'industry' },
      { kind: 'primary', label: 'Done', go: 'later' },
    ]);
}

/* ── Screen 9 — Dismissed ──────────────────────────────────────────────── */

/* "Remind me later" and "Done" both land here rather than on a dead end: this
   prototype has no dashboard behind it, and pretending otherwise would be
   inventing a destination. */
function screenLater() {
  return '<div class="done">'
    + '<div class="done__mark">' + iconSvg(state.saved ? 'check' : 'bell', 28) + '</div>'
    + '<h1 class="head__title">' + (state.saved
      ? 'Nothing else to do' : 'We will remind you') + '</h1>'
    + '<p class="head__lead">' + (state.saved
      ? 'Your profile is saved and live.'
      : 'Your profile stays live with everything carried over. The review is waiting in your '
        + 'profile settings whenever you want it.') + '</p>'
    + '</div>'
    + actionsHtml([
      { spacer: true },
      { kind: 'secondary', label: 'Review my profile', go: 'industry' },
      { spacer: true },
    ]);
}

/* ── Render ────────────────────────────────────────────────────────────── */

const SCREENS = {
  changed: screenChanged,
  summary: screenSummary,
  decide: screenDecide,
  industry: screenIndustry,
  domains: screenDomains,
  expertise: screenExpertise,
  confirm: screenConfirm,
  done: screenDone,
  later: screenLater,
};

function render(focus) {
  screenEl.innerHTML = SCREENS[state.screen]();
  paintIcons(screenEl);
  if (focus) {
    screenEl.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
}

function go(to) {
  if (to === 'save') { state.saved = true; state.screen = 'done'; }
  else state.screen = to;
  if (to === 'industry') { state.query.industry = ''; state.query.expertise = ''; }
  render(true);
}

/* ── Events ────────────────────────────────────────────────────────────── */

screenEl.addEventListener('click', (e) => {
  const goBtn = e.target.closest('[data-go]');
  if (goBtn) { go(goBtn.dataset.go); return; }

  const drop = e.target.closest('[data-drop]');
  if (drop) { state[drop.dataset.drop].delete(drop.dataset.value); render(false); }
});

screenEl.addEventListener('change', (e) => {
  const box = e.target.closest('[data-axis]');
  if (!box) return;
  const set = state[box.dataset.axis];
  if (box.checked) set.add(box.value); else set.delete(box.value);
  render(false);
});

/* Re-rendering on every keystroke would take the field out from under the
   cursor, so the query is stored and the caret restored. */
screenEl.addEventListener('input', (e) => {
  const field = e.target.closest('[data-query]');
  if (!field) return;
  state.query[field.dataset.query] = field.value;
  render(false);
  const again = screenEl.querySelector('[data-query="' + field.dataset.query + '"]');
  if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
});

document.getElementById('topbar-name').textContent = profile.name;
render(false);
