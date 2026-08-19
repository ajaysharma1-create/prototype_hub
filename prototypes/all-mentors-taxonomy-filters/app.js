/* All Mentors — rendering, navigation and filter behaviour.

   ── The filter model ────────────────────────────────────────────────────────
   The taxonomy specifies filter behaviour for industry only. Everything else
   below is a documented prototype proposal rather than an invisible convention:

     1. Within one axis, values OR.   Tech & Product OR Data Science & AI.
     2. Across axes, they AND.        That agenda AND that domain AND that industry.
     3. Industry matches at either level. Selecting the group Technology, Digital
        & Electronics matches every mentor in any of its four industries. This is
        the one rule the requirements document does state.
     4. Selecting an industry group absorbs any leaf selections beneath it — the
        group already matches all of them, so keeping both would show the same
        mentor set behind two chips.
     5. Expertise does not imply its domain. Selecting Cloud Security does not
        also select Cybersecurity, Privacy & Risk.
     6. Agendas are a filter axis like any other: multi-select, OR within the
        axis, AND against the rest. agends.json is a flat list with no parentage,
        so selecting an agenda never sets an industry, domain or expertise.
     7. Best Match ranks an exact industry above a group match (3 points against
        1), which is the "more precise" ranking the requirements doc asks for
        without defining.

   ── The taxonomy relationships ──────────────────────────────────────────────
   The workspace keeps Industry independent and shows only the relationship
   supported by the sources:

     · Functional Domain -> Expertise is present in the taxonomy, so selecting
       domains narrows the expertise browse list from 243 values to 12 or 13.
     · Industry -> Functional Domain is not present. Mentors carry the two axes
       independently, so selecting an industry does not narrow the domain list.

   Industry Group -> Industry is in the source and is used: groups are the entry
   point to the 40 industries, and selecting a group absorbs its leaves.

   Loaded as a plain script, not an ES module. A module would be fetched under
   CORS rules, and a page opened from the file system has origin `null`, so the
   browser refuses it and nothing on this page renders. Classic scripts carry no
   such restriction, which is what lets index.html be opened by double-click.
   The three data files below each publish one global; index.html loads them
   first, with `defer` preserving order. */

const missing = ['MU_ICONS', 'MU_TAXONOMY', 'MU_MENTORS'].filter((k) => !window[k]);
if (missing.length) {
  document.body.innerHTML = `<p style="margin:40px;font:16px/1.6 system-ui;color:#F0B962">`
    + `This page could not load its data (${missing.join(', ')}).<br>`
    + `Check that icons.js, taxonomy.js and mentors-varied.js sit next to index.html.</p>`;
  throw new Error('Missing data globals: ' + missing.join(', '));
}

const icons = window.MU_ICONS;
const {
  functionalDomains, expertiseByDomain, industryGroups, agendas, expertiseAliases,
} = window.MU_TAXONOMY;
const {
  mentors, experienceLevels, ratingBands, timeZones, availabilityWindows, ACCENT_CTA_INDEX,
} = window.MU_MENTORS;

/* ── Icons ─────────────────────────────────────────────────────────────── */

function iconSvg(name, size) {
  const d = icons[name];
  if (!d) return '';
  return `<svg width="${size}" height="${size}" viewBox="${d.viewBox}" fill="currentColor" aria-hidden="true">${d.body}</svg>`;
}

function paintIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    el.insertAdjacentHTML('afterbegin', iconSvg(el.dataset.icon, Number(el.dataset.size) || 20));
    el.removeAttribute('data-icon');
  });
}

/* The reference badge uses a solid star; the schema's Tabler set only carries the
   outline, so the filled body is drawn here rather than restyling the glyph. */
const STAR = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
  + '<path d="M12 2.7l2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 16.73l-5.5 2.89 1.05-6.12L3.1 9.17l6.15-.9L12 2.7z"/></svg>';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ── Taxonomy lookups ──────────────────────────────────────────────────── */

const industryToGroup = new Map();
industryGroups.forEach((g) => g.industries.forEach((i) => industryToGroup.set(i.name, g.group)));
const groupNames = new Set(industryGroups.map((g) => g.group));
const groupByName = new Map(industryGroups.map((g) => [g.group, g]));

/* An expertise names more than one domain only for `UGC Strategy`, the single
   duplicate among the 243. Both rows stand for one selection. */
const expertiseToDomains = new Map();
functionalDomains.forEach((d) => expertiseByDomain[d.name].forEach((e) => {
  if (!expertiseToDomains.has(e)) expertiseToDomains.set(e, []);
  expertiseToDomains.get(e).push(d.name);
}));

const companies = [...new Set(mentors.map((m) => m.company))].sort((a, b) => a.localeCompare(b));

/* ── State ─────────────────────────────────────────────────────────────── */

const TAX_AXES = ['industry', 'domain', 'expertise'];
const MORE_AXES = ['company', 'experience', 'rating', 'timezone', 'availability'];
const AXES = ['agenda', ...TAX_AXES, ...MORE_AXES];

const AXIS_LABEL = {
  agenda: 'Agenda',
  industry: 'Industry',
  domain: 'Domain',
  expertise: 'Expertise',
  company: 'Company',
  experience: 'Experience',
  rating: 'Rating',
  timezone: 'Time zone',
  availability: 'Availability',
};

const TAX_STAGES = [
  { id: 'industry', label: 'Industry', short: 'Industry' },
  { id: 'domain', label: 'Functional domain', short: 'Domain' },
  { id: 'expertise', label: 'Expertise', short: 'Expertise' },
];

const FILTER_CATEGORIES = [
  ...TAX_STAGES,
  { id: 'more', label: 'More filters', short: 'More' },
];

const SORTS = [
  { id: 'best', label: 'Best Match (Recommended)' },
  { id: 'soonest', label: 'Soonest Available' },
  { id: 'rated', label: 'Highest Rated' },
  { id: 'experience', label: 'Experience (High to Low)' },
  { id: 'new', label: 'New Mentors' },
];

const MORE_GROUPS = [
  { id: 'company', title: 'Company/Brand', kind: 'check', searchable: true, options: () => companies },
  { id: 'experience', title: 'Experience Level', kind: 'check', options: () => experienceLevels },
  { id: 'rating', title: 'Rating', kind: 'radio-band', options: () => ratingBands },
  { id: 'timezone', title: 'Location/Time Zone', kind: 'check', options: () => timeZones },
  { id: 'availability', title: 'Availability', kind: 'radio-band', options: () => availabilityWindows },
];

const state = {
  query: '',
  sort: 'best',
  selected: Object.fromEntries(AXES.map((a) => [a, new Set()])),
  stage: 'industry',
  drill: { industry: null, expertise: null, more: null },
  stageQuery: { industry: '', domain: '', expertise: '' },
  funnelExpanded: new Set(),
  moreQuery: {},
  cardView: Object.fromEntries(mentors.map((m) => [m.id, 'Expertise'])),
  expanded: new Set(),
};

const wide = window.matchMedia('(min-width: 768px)');

const taxCount = () => TAX_AXES.reduce((n, a) => n + state.selected[a].size, 0);
const moreCount = () => MORE_AXES.reduce((n, a) => n + state.selected[a].size, 0);
const advancedCount = () => taxCount() + moreCount();
const filterCount = () => AXES.reduce((n, a) => n + state.selected[a].size, 0);
const anyApplied = () => filterCount() > 0 || state.sort !== 'best' || !!state.query;

/* ── Matching ──────────────────────────────────────────────────────────── */

const availabilityCeiling = { 'Available today': 24, 'Available this week': 168, 'Available in 2 weeks': 336 };

function matches(m) {
  const s = state.selected;

  // A null agenda list means the reference does not state which agendas this
  // mentor covers, so no agenda chip narrows the card away.
  if (s.agenda.size && m.agendas && !m.agendas.some((a) => s.agenda.has(a))) return false;

  if (state.query) {
    const q = state.query.trim().toLowerCase();
    const hay = [m.name, m.title, m.company, ...m.domains, ...m.expertise, ...m.industries,
      ...(m.agendas || []),
      ...m.industries.map((i) => industryToGroup.get(i) || '')].join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }

  if (s.domain.size && !m.domains.some((d) => s.domain.has(d))) return false;
  if (s.expertise.size && !m.expertise.some((e) => s.expertise.has(e))) return false;
  if (s.company.size && !s.company.has(m.company)) return false;
  if (s.experience.size && !s.experience.has(m.experienceLevel)) return false;
  if (s.timezone.size && !s.timezone.has(m.timeZone)) return false;

  // Industry matches at leaf level or at group level, per the documented rule.
  if (s.industry.size) {
    const own = new Set([...m.industries, ...m.industries.map((i) => industryToGroup.get(i))]);
    if (![...s.industry].some((v) => own.has(v))) return false;
  }

  if (s.rating.size) {
    const floor = Math.min(...[...s.rating].map((b) => parseFloat(b)));
    if (m.rating < floor) return false;
  }

  if (s.availability.size) {
    const ceiling = Math.max(...[...s.availability].map((v) => availabilityCeiling[v]));
    if (m.availableInHours > ceiling) return false;
  }

  return true;
}

/* "Best match" ranks by how much of what the mentee actually asked for the
   mentor carries, then by rating — an exact leaf match outranks a group match,
   which is the "more precise" ranking the requirements doc asks for. */
function bestScore(m) {
  const s = state.selected;
  let score = 0;
  score += m.domains.filter((d) => s.domain.has(d)).length * 3;
  score += m.expertise.filter((e) => s.expertise.has(e)).length * 3;
  score += m.industries.filter((i) => s.industry.has(i)).length * 3;
  score += m.industries.filter((i) => s.industry.has(industryToGroup.get(i))).length * 1;
  score += (m.agendas || []).filter((a) => s.agenda.has(a)).length * 2;
  score += m.company && s.company.has(m.company) ? 2 : 0;
  return score;
}

const SORTERS = {
  best: (a, b) => bestScore(b) - bestScore(a) || b.rating - a.rating || b.calls - a.calls
    || a.name.localeCompare(b.name),
  soonest: (a, b) => a.availableInHours - b.availableInHours || b.rating - a.rating
    || a.name.localeCompare(b.name),
  rated: (a, b) => b.rating - a.rating || b.calls - a.calls || a.name.localeCompare(b.name),
  experience: (a, b) => b.years - a.years || b.rating - a.rating || a.name.localeCompare(b.name),
  new: (a, b) => a.joinedDaysAgo - b.joinedDaysAgo || a.name.localeCompare(b.name),
};

const matching = () => mentors.filter(matches);

/* ── Navigation ────────────────────────────────────────────────────────── */

/* Items and states follow the reference navigation; labels are shortened
   where the rail's 76px cannot hold them ("Call Records" -> "Calls"), with the
   full label kept as the title. Goal Tracker is drawn muted there, so it is
   disabled here rather than merely grey.

   The active row is All Mentors, not the Dashboard the SVG paints amber: this
   page is All Mentors, and marking anything else current would make the nav lie
   about where the user is. */
const NAV_MAIN = [
  { id: 'dashboard', label: 'Dashboard', full: 'Dashboard', icon: 'nav-dashboard' },
  { id: 'call-records', label: 'Calls', full: 'Call Records', icon: 'nav-call-records' },
  { id: 'all-mentors', label: 'Mentors', full: 'All Mentors', icon: 'nav-all-mentors', href: '#results', current: true },
  { id: 'my-journal', label: 'Journal', full: 'My Journal', icon: 'nav-my-journal' },
  { id: 'goal-tracker', label: 'Goals', full: 'Goal Tracker', icon: 'nav-goal-tracker', disabled: true },
];

const NAV_FOOT = [
  { id: 'support', label: 'Support', full: 'Support & FAQs', icon: 'nav-support' },
  { id: 'my-profile', label: 'Profile', full: 'My Profile', icon: 'nav-my-profile' },
  { id: 'settings', label: 'Settings', full: 'Settings', icon: 'nav-settings' },
  { id: 'log-out', label: 'Log out', full: 'Log Out', icon: 'nav-log-out' },
];

// The bottom bar carries the four sections a mentee moves between; everything
// else stays reachable behind More rather than being dropped on small screens.
const TAB_IDS = ['dashboard', 'call-records', 'all-mentors', 'my-journal'];

function navItemHtml(item, cls) {
  const inner = `<span class="${cls}__icon">${iconSvg(item.icon, 18)}</span>`
    + `<span class="${cls}__label">${esc(item.label)}</span>`;

  // A disabled row is not a link: it must not take focus or respond to a click.
  if (item.disabled) {
    return `<span class="${cls}__item" data-nav-item="${esc(item.id)}" aria-disabled="true"
      title="${esc(item.full)} — not available yet">${inner}</span>`;
  }
  return `<a class="${cls}__item" href="${item.href || '#'}" data-nav-item="${esc(item.id)}"
    ${item.current ? ' aria-current="page"' : ''} title="${esc(item.full)}">${inner}</a>`;
}

function renderNav() {
  document.querySelector('.rail__mark').innerHTML = iconSvg('mu-mark', 22);
  document.getElementById('rail-main').innerHTML = NAV_MAIN.map((i) => navItemHtml(i, 'rail')).join('');
  document.getElementById('rail-foot').innerHTML = NAV_FOOT.map((i) => navItemHtml(i, 'rail')).join('');

  const tabs = TAB_IDS.map((id) => NAV_MAIN.find((i) => i.id === id));
  document.getElementById('tabbar').innerHTML = tabs.map((i) => navItemHtml(i, 'tabbar')).join('')
    + `<button class="tabbar__item" type="button" data-more-nav-open aria-haspopup="dialog">
         <span class="tabbar__icon">${iconSvg('menu2', 18)}</span>
         <span class="tabbar__label">More</span>
       </button>`;

  const rest = [...NAV_MAIN.filter((i) => !TAB_IDS.includes(i.id)), ...NAV_FOOT];
  document.getElementById('more-nav-body').innerHTML =
    rest.map((i) => navItemHtml(i, 'navrow')).join('');
}

/* ── Agenda quick filters ──────────────────────────────────────────────── */

function renderAgendas() {
  document.getElementById('agenda-list').innerHTML =
    agendas.map((a) => `<button class="chip" type="button" data-agenda="${esc(a)}"
      aria-pressed="${state.selected.agenda.has(a)}">${esc(a)}</button>`).join('');
  requestAnimationFrame(syncAgendaControls);
}

function syncAgendaControls() {
  const list = document.getElementById('agenda-list');
  const prev = document.querySelector('[data-agenda-scroll="-1"]');
  const next = document.querySelector('[data-agenda-scroll="1"]');
  const overflow = list.scrollWidth > list.clientWidth + 2;
  prev.disabled = !overflow || list.scrollLeft <= 2;
  next.disabled = !overflow || list.scrollLeft + list.clientWidth >= list.scrollWidth - 2;
}

/* ── Stage search ──────────────────────────────────────────────────────── */

const hitTest = (q) => {
  const s = q.trim().toLowerCase();
  return s ? (v) => v.toLowerCase().includes(s) : null;
};

/* Industry hits: a group whose own name matches comes back as a group, so the
   mentee gets one openable row rather than its leaves pasted into the list. */
function industryHits(q) {
  const hit = hitTest(q);
  if (!hit) return null;
  const groups = industryGroups.filter((g) => hit(g.group));
  const named = new Set(groups.map((g) => g.group));
  const leaves = [];
  industryGroups.forEach((g) => {
    if (named.has(g.group)) return;
    g.industries.forEach((i) => {
      if (hit(i.name)) leaves.push({ value: i.name, isNew: i.isNew, crumb: g.group });
    });
  });
  return { groups, leaves };
}

function domainHits(q) {
  const hit = hitTest(q);
  if (!hit) return null;
  return functionalDomains.filter((d) => hit(d.name)).map((d) => ({ value: d.name, isNew: d.isNew }));
}

/* Expertise hits across all 243, plus the retired labels expertise_amendments
   .json maps forward — that file's own RENAME/MERGE pairs, not synonyms
   invented here. */
function expertiseHits(q, onlyDomains) {
  const hit = hitTest(q);
  if (!hit) return null;
  const allowed = onlyDomains
    ? new Set(typeof onlyDomains === 'string' ? [onlyDomains] : onlyDomains)
    : null;
  const live = [];
  const seen = new Set();
  functionalDomains.forEach((d) => {
    if (allowed && !allowed.has(d.name)) return;
    expertiseByDomain[d.name].forEach((e) => {
      const key = d.name + '|' + e;
      if (hit(e) && !seen.has(key)) {
        seen.add(key);
        live.push({ value: e, crumb: d.name });
      }
    });
  });
  const liveValues = new Set(live.map((o) => o.value));
  const aliased = [];
  expertiseAliases.forEach((a) => {
    if (allowed && !allowed.has(a.domain)) return;
    if (hit(a.from) && !hit(a.to) && !liveValues.has(a.to) && !aliased.some((o) => o.value === a.to)) {
      aliased.push({ value: a.to, crumb: `${a.domain} · was “${a.from}”` });
    }
  });
  return [...live, ...aliased];
}

/* ── Option and browse rows ────────────────────────────────────────────── */

function optRow(axis, opt, kind = 'check') {
  const type = kind === 'radio-band' ? 'radio' : 'checkbox';
  const included = opt.includedBy ? ' data-included="true"' : '';
  const checked = (state.selected[axis].has(opt.value) || opt.includedBy) ? ' checked' : '';
  const dis = opt.includedBy ? ' disabled' : '';
  const title = opt.includedBy ? ` title="Included by ${esc(opt.includedBy)}"` : '';
  const mark = type === 'radio' ? '' : iconSvg('check', 11);
  const isNew = opt.isNew ? ' <span class="opt__new">New</span>' : '';
  const crumb = opt.crumb ? `<span class="opt__crumb">${esc(opt.crumb)}</span>` : '';
  // `label` lets a row read as "Entire group" while still standing for the group
  // value; the heading above it already names the group.
  const text = esc(opt.label || opt.value);
  return `<label class="opt opt--${type === 'radio' ? 'radio' : 'check'}"${included}${title}>
    <input type="${type}" name="${esc(axis)}" value="${esc(opt.value)}" data-axis="${esc(axis)}"${checked}${dis}>
    <span class="opt__box" aria-hidden="true">${mark}</span>
    <span class="opt__label">${text}${isNew}${crumb}</span>
  </label>`;
}

/* A browse row: the parent you open to reach its children, carrying the child
   count and how many of them are already selected. */
function browseRow(stage, name, count, unit, selected, opts = {}) {
  return `<button class="brow" type="button" data-drill-stage="${esc(stage)}" data-drill="${esc(name)}">
    <span class="brow__name">${esc(name)}${opts.isNew ? ' <span class="opt__new">New</span>' : ''}</span>
    ${selected ? `<span class="brow__sel">${selected} selected</span>` : ''}
    <span class="brow__n">${count} ${esc(count === 1 ? unit.replace(/ies$/, 'y').replace(/s$/, '') : unit)}</span>
    <span class="brow__chev">${iconSvg('chevron-down', 16)}</span>
  </button>`;
}

function backRow(stage, label) {
  return `<button class="fback" type="button" data-drill-stage="${esc(stage)}" data-drill="">
    ${iconSvg('chevron-down', 16)}<span>${esc(label)}</span>
  </button>`;
}

function noMatch(what, q) {
  return `<div class="fnone">
    <p>No ${esc(what)} matches “${esc(q.trim())}”.</p>
    <button type="button" data-stage-clear>Clear search</button>
  </div>`;
}

/* ── Stage bodies ──────────────────────────────────────────────────────── */

function searchRow(stage, placeholder) {
  const q = state.stageQuery[stage];
  return `<div class="fsearch" data-filled="${!!q}">
    ${iconSvg('search', 14)}
    <label class="sr-only" for="stage-search">${esc(placeholder)}</label>
    <input id="stage-search" type="search" autocomplete="off" spellcheck="false" data-stagesearch
           value="${esc(q)}" placeholder="${esc(placeholder)}">
    <button type="button" aria-label="Clear search" data-stage-clear>${iconSvg('x', 14)}</button>
  </div>`;
}

function workspaceHeading(title) {
  return `<header class="fworkspace__head"><h3 id="workspace-title">${esc(title)}</h3></header>`;
}

function industryBody() {
  const q = state.stageQuery.industry;
  const open = state.drill.industry;

  // No search inside a group: the largest holds six industries, and a field
  // above six rows is clutter rather than help.
  if (open) {
    const g = groupByName.get(open);
    const groupPicked = state.selected.industry.has(g.group);
    return workspaceHeading('Industry')
      + backRow('industry', 'All industry groups')
      + `<h4 class="fstage__title">${esc(g.group)}</h4>`
      + optRow('industry', { value: g.group, label: 'Select entire group' }, 'check')
      + '<span class="fstage__rule" aria-hidden="true"></span>'
      + `<div class="flist">${g.industries.map((i) => optRow('industry', {
        value: i.name, isNew: i.isNew, includedBy: groupPicked ? g.group : null,
      })).join('')}</div>`;
  }

  const hits = industryHits(q);
  if (hits) {
    if (!hits.groups.length && !hits.leaves.length) {
      return workspaceHeading('Industry') + searchRow('industry', 'Search industries...') + noMatch('industry', q);
    }
    return workspaceHeading('Industry') + searchRow('industry', 'Search industries...')
      + `<div class="flist">
        ${hits.groups.map((g) => browseRow('industry', g.group, g.industries.length, 'industries',
          g.industries.filter((i) => state.selected.industry.has(i.name)).length)).join('')}
        ${hits.leaves.map((o) => optRow('industry', {
          ...o, includedBy: state.selected.industry.has(o.crumb) ? o.crumb : null,
        })).join('')}
      </div>`;
  }

  return workspaceHeading('Industry')
    + searchRow('industry', 'Search industries...')
    + '<p class="fbrowse">Browse by industry group</p>'
    + `<div class="flist">${industryGroups.map((g) => browseRow(
      'industry', g.group, g.industries.length, 'industries',
      (state.selected.industry.has(g.group) ? g.industries.length
        : g.industries.filter((i) => state.selected.industry.has(i.name)).length),
    )).join('')}</div>`;
}

function domainBody() {
  const q = state.stageQuery.domain;
  const hits = domainHits(q);
  const opts = hits || functionalDomains.map((d) => ({ value: d.name, isNew: d.isNew }));

  return workspaceHeading('Functional Domain')
    + searchRow('domain', 'Search functional domains...')
    + (opts.length ? `<div class="flist flist--domains">${opts.map((o) => optRow('domain', o)).join('')}</div>`
      : noMatch('functional domain', q));
}

function domainContext(domains) {
  if (!domains.length) return '';
  const label = domains.length === 1 ? 'Within' : 'Based on';
  return `<div class="fcontext">
    <span class="fcontext__label">${label}</span>
    <div class="fcontext__chips">${domains.map((d) => chip('domain', d)).join('')}</div>
  </div>`;
}

function expertiseGroup(domain) {
  return `<section class="fexpert-group">
    <h4>${esc(domain)}</h4>
    <div class="flist">${expertiseByDomain[domain]
      .map((e) => optRow('expertise', { value: e })).join('')}</div>
  </section>`;
}

function expertiseBody() {
  const q = state.stageQuery.expertise;
  const open = state.drill.expertise;
  const picked = [...state.selected.domain];

  if (picked.length) {
    const hits = expertiseHits(q, picked);
    const content = hits
      ? (hits.length ? `<div class="flist">${hits.map((o) => optRow('expertise', o)).join('')}</div>`
        : noMatch('expertise', q))
      : (picked.length === 1 ? expertiseGroup(picked[0]) : picked.map(expertiseGroup).join(''));

    return workspaceHeading('Expertise')
      + domainContext(picked)
      + searchRow('expertise', 'Search expertise...')
      + content;
  }

  if (open) {
    const hits = expertiseHits(q, open);
    const kids = hits || expertiseByDomain[open].map((e) => ({ value: e }));
    return workspaceHeading('Expertise')
      + backRow('expertise', 'All functional domains')
      + `<h4 class="fstage__title">${esc(open)}</h4>`
      + searchRow('expertise', `Search ${open} expertise...`)
      + (kids.length ? `<div class="flist">${kids.map((o) => optRow('expertise', o)).join('')}</div>`
        : noMatch('expertise', q));
  }

  const hits = expertiseHits(q, null);
  if (hits) {
    return workspaceHeading('Expertise')
      + searchRow('expertise', 'Search any expertise...')
      + (hits.length ? `<div class="flist">${hits.map((o) => optRow('expertise', o)).join('')}</div>`
        : noMatch('expertise', q));
  }

  return workspaceHeading('Expertise')
    + searchRow('expertise', 'Search any expertise...')
    + '<p class="fbrowse">Or browse by Functional Domain</p>'
    + `<div class="flist">${functionalDomains.map((d) => browseRow(
      'expertise', d.name, expertiseByDomain[d.name].length, 'expertise',
      expertiseByDomain[d.name].filter((e) => state.selected.expertise.has(e)).length,
      { isNew: d.isNew },
    )).join('')}</div>`;
}

function moreBrowseRow(group) {
  const selected = state.selected[group.id].size;
  return `<button class="brow brow--more" type="button" data-drill-stage="more" data-drill="${esc(group.id)}">
    <span class="brow__name">${esc(group.title)}</span>
    ${selected ? `<span class="brow__sel">${selected}</span>` : ''}
    <span class="brow__chev">${iconSvg('chevron-down', 16)}</span>
  </button>`;
}

function moreBody() {
  const open = state.drill.more;
  if (!open) {
    return workspaceHeading('More filters')
      + `<div class="flist">${MORE_GROUPS.map(moreBrowseRow).join('')}</div>`;
  }

  const group = MORE_GROUPS.find((g) => g.id === open);
  return workspaceHeading('More filters')
    + backRow('more', 'All more filters')
    + `<h4 class="fstage__title">${esc(group.title)}</h4>`
    + (group.searchable
      ? `<div class="fsearch" data-filled="${!!state.moreQuery[group.id]}">
           ${iconSvg('search', 14)}
           <label class="sr-only" for="more-search">Search ${esc(group.title)}</label>
           <input id="more-search" type="search" autocomplete="off" spellcheck="false"
                  data-moresearch="${esc(group.id)}" value="${esc(state.moreQuery[group.id] || '')}"
                  placeholder="Search ${esc(group.title.toLowerCase())}...">
         </div>` : '')
    + `<div class="flist" id="more-options">${smallGroupOptions(group)}</div>`;
}

const STAGE_BODY = {
  industry: industryBody,
  domain: domainBody,
  expertise: expertiseBody,
  more: moreBody,
};

/* ── Funnel ────────────────────────────────────────────────────────────── */

const FUNNEL_CHIP_CAP = 1;

function stageValues(id) {
  return [...state.selected[id]];
}

function chip(axis, value, extra = '', showAxis = false) {
  const label = showAxis
    ? (axis === 'industry' && groupNames.has(value) ? 'Industry group' : AXIS_LABEL[axis])
    : '';
  return `<span class="fchip${extra}">${label ? `<span class="fchip__kind">${label}</span>` : ''}${esc(value)}
    <button type="button" aria-label="Remove ${esc(AXIS_LABEL[axis])} filter ${esc(value)}"
            data-remove-axis="${esc(axis)}" data-remove-value="${esc(value)}">${iconSvg('x', 12)}</button>
  </span>`;
}

function resultStage(id) {
  const vals = stageValues(id);
  if (!vals.length) return '';
  const all = state.funnelExpanded.has(id);
  const shown = all ? vals : vals.slice(0, FUNNEL_CHIP_CAP);
  const rest = vals.length - shown.length;
  return `<span class="fstep" data-result-axis="${id}">
    ${shown.map((v) => chip(id, v, '', true)).join('')}
    ${rest > 0 ? `<button class="fchip fchip--more" type="button" data-funnel-expand="${id}">+${rest}</button>` : ''}
    ${all && vals.length > FUNNEL_CHIP_CAP
      ? `<button class="fchip fchip--more" type="button" data-funnel-expand="${id}">Less</button>` : ''}
  </span>`;
}

/* Industry is independent. Domain and Expertise are grouped without implying a
   directional step between them. */
function renderFunnel() {
  const industry = resultStage('industry');
  const domain = resultStage('domain');
  const expertise = resultStage('expertise');
  const aside = [...[...state.selected.agenda].map((v) => ({ axis: 'agenda', value: v })),
    ...MORE_AXES.flatMap((a) => [...state.selected[a]].map((v) => ({ axis: a, value: v })))];
  const el = document.getElementById('funnel');

  if (!industry && !domain && !expertise && !aside.length) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;

  const related = domain || expertise
    ? `<span class="funnel__related">${domain}${expertise}</span>`
    : '';

  el.innerHTML = `<div class="funnel__path">${industry}${related}
      ${aside.map((m) => chip(m.axis, m.value, ' fchip--aside', true)).join('')}
    </div>
    <button class="funnel__clear" type="button" data-clear-all>Clear all</button>`;
}

/* ── Workspace ─────────────────────────────────────────────────────────── */

function renderStages() {
  const countFor = (id) => id === 'more' ? moreCount() : state.selected[id].size;
  const summaryFor = (id) => {
    if (id === 'more') {
      const n = moreCount();
      return n ? `+${n} selected` : '';
    }
    const values = [...state.selected[id]];
    if (values.length) return values.length === 1 ? values[0] : `${values[0]} · +${values.length - 1}`;
    if (id === 'expertise' && state.selected.domain.size) {
      const available = new Set([...state.selected.domain].flatMap((d) => expertiseByDomain[d] || [])).size;
      return `${available} available`;
    }
    return '';
  };

  const item = (category) => {
    const active = state.stage === category.id;
    const n = countFor(category.id);
    const summary = summaryFor(category.id);
    return `<button class="fstages__item" id="filter-tab-${category.id}" type="button"
      role="tab" data-stage="${category.id}" aria-selected="${active}"
      aria-controls="fsheet-body" tabindex="${active ? '0' : '-1'}">
      <span class="fstages__label">${esc(category.label)}</span>
      ${n ? `<span class="fstages__count">${n}</span>` : ''}
      <span class="fstages__chev">${iconSvg('chevron-down', 16)}</span>
      ${summary ? `<span class="fstages__summary" title="${esc(summary)}">${esc(summary)}</span>` : ''}
    </button>`;
  };

  const [industry, domain, expertise, more] = FILTER_CATEGORIES;
  document.getElementById('fsheet-stages').innerHTML = `
    <span class="fstages__eyebrow">Filter by</span>
    ${item(industry)}
    ${item(domain)}
    ${item(expertise)}
    ${item(more)}`;
}

function renderStageBody(preserveScroll = true) {
  const el = document.getElementById('fsheet-body');
  const top = preserveScroll ? el.scrollTop : 0;
  el.innerHTML = STAGE_BODY[state.stage]();
  el.scrollTop = top;
  el.setAttribute('aria-labelledby', `filter-tab-${state.stage}`);
}

function smallGroupOptions(g) {
  const q = (state.moreQuery[g.id] || '').trim().toLowerCase();
  const opts = g.options().filter((v) => !q || v.toLowerCase().includes(q));
  if (!opts.length) return '<p class="fgroup__empty">No matches in this filter.</p>';
  return opts.map((v) => optRow(g.id, { value: v }, g.kind)).join('');
}

function renderWorkspace() {
  renderStages();
  renderStageBody(false);
}

/* ── Cards ─────────────────────────────────────────────────────────────── */

function cardHtml(m, index) {
  const view = state.cardView[m.id];
  const all = view === 'Domain' ? m.domains : m.expertise;
  const expanded = state.expanded.has(m.id);
  const shown = expanded ? all : all.slice(0, 2);
  const extra = all.length - shown.length;

  const accentCta = index === ACCENT_CTA_INDEX ? ' data-cta="accent"' : '';

  return `<article class="mentor" data-mentor="${esc(m.id)}"${accentCta}>
    <div class="mentor__media">
      <img class="mentor__watermark" src="assets/mark-watermark.svg" alt="" aria-hidden="true">
      <img class="mentor__photo" src="assets/mentor-portrait.png" alt="">
      <span class="mentor__rating">${STAR}${m.rating.toFixed(1)}</span>
    </div>

    <div class="mentor__body">
      <h3 class="mentor__name">
        <span>${esc(m.name)}</span>
        <span class="mentor__linkedin" aria-label="LinkedIn verified">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0Z"/></svg>
        </span>
      </h3>
      <p class="mentor__role">${esc(m.title)}</p>
      <p class="mentor__meta">${m.years}+ Yrs of Experience | ${m.calls}+ Calls</p>

      <span class="mentor__rule" aria-hidden="true"></span>

      <div class="mentor__toggle" role="group" aria-label="Show domains or expertise">
        <button type="button" data-view="Domain" aria-pressed="${view === 'Domain'}">Domain</button>
        <button type="button" data-view="Expertise" aria-pressed="${view === 'Expertise'}">Expertise</button>
      </div>

      <div class="mentor__tags">
        ${shown.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}
        ${extra > 0 ? `<button class="tag tag--more" type="button" data-more
            aria-label="Show ${extra} more ${view === 'Domain' ? 'domains' : 'expertise'}"
            title="${esc(all.slice(2).join(', '))}">+</button>` : ''}
      </div>

      <button class="mentor__cta" type="button" data-book>Schedule a Call</button>
    </div>
  </article>`;
}

/* ── Results ───────────────────────────────────────────────────────────── */

function renderSort() {
  document.getElementById('toolbar-sort').innerHTML = `
    <label class="sortsel">
      <span class="sortsel__label">Sort by</span>
      <select id="mentor-sort" data-sort aria-label="Sort mentor results" aria-controls="grid">
        ${SORTS.map((s) => `<option value="${s.id}"${state.sort === s.id ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}
      </select>
      ${iconSvg('chevron-down', 14)}
    </label>`;
}

function renderResults() {
  const list = matching().sort(SORTERS[state.sort]);
  const grid = document.getElementById('grid');

  if (!list.length) {
    grid.classList.remove('grid');
    grid.innerHTML = `<div class="results__empty">
      <h2>No mentors match these filters.</h2>
      <p>Filters narrow the list, they never widen it.</p>
      <div class="results__empty-actions">
        <button type="button" data-sheet-open>Adjust filters</button>
        <button type="button" data-clear-all>Clear filters</button>
      </div>
    </div>`;
  } else {
    grid.classList.add('grid');
    grid.innerHTML = list.map((m, i) => cardHtml(m, i)).join('');
  }

  renderFunnel();
  syncChrome();
}

/* The Filters badge counts advanced-filter selections — taxonomy plus the
   secondary axes. It is a filter count, never a mentor count. */
function syncChrome() {
  const n = advancedCount();
  const badge = document.getElementById('filters-badge');
  badge.textContent = String(n);
  badge.hidden = n === 0;
  document.querySelector('.toolbar__filters').setAttribute('aria-label',
    n ? `Filters, ${n} active` : 'Filters');
  document.querySelector('.fsheet__clear').disabled = !anyApplied();
  document.querySelector('.fsheet__reset').disabled = !anyApplied();
}

/* ── Selection plumbing ────────────────────────────────────────────────── */

function setSelection(axis, value, on, kind) {
  const set = state.selected[axis];
  if (kind === 'radio') {
    set.clear();
    if (on) set.add(value);
  } else if (on) {
    set.add(value);
  } else {
    set.delete(value);
  }

  /* Selecting an industry group absorbs its leaves: the group already matches
     every mentor beneath it, so keeping both would surface one mentor set behind
     two chips. Deselecting the group does not restore them. */
  if (axis === 'industry' && on && groupNames.has(value)) {
    groupByName.get(value).industries.forEach((i) => set.delete(i.name));
  }
}

/* Nothing downstream is ever silently dropped. The only relationship that could
   invalidate a selection is Industry Group -> Industry, handled above by
   absorbing leaves into the group that already covers them. Removing a domain
   does not invalidate an expertise: axes AND, so the expertise still narrows
   the result set on its own, and it stays visible in the funnel summary even
   when the browse list is scoped away from it. */
function afterSelectionChange(axis) {
  if (axis === 'agenda') renderAgendas();
  if (isSheetOpen()) {
    const activeInput = document.activeElement?.matches?.('[data-axis]')
      ? { axis: document.activeElement.dataset.axis, value: document.activeElement.value }
      : null;
    renderStages();
    const bodyDependsOnSelection = (axis === 'industry' && state.stage === 'industry' && state.drill.industry)
      || (axis === 'domain' && state.stage === 'expertise')
      || (axis === 'expertise' && state.stage === 'expertise');
    if (bodyDependsOnSelection) {
      renderStageBody();
      if (activeInput) {
        const same = [...document.querySelectorAll(`[data-axis="${activeInput.axis}"]`)]
          .find((input) => input.value === activeInput.value);
        if (same) same.focus();
      }
    }
  }
  renderResults();
}

const isSheetOpen = () => document.getElementById('filter-sheet').open;
let sheetOpener = null;

/* ── Wiring ────────────────────────────────────────────────────────────── */

function render() {
  renderNav();
  renderAgendas();
  renderSort();
  renderResults();
}

function openSheet() {
  const sheet = document.getElementById('filter-sheet');
  sheetOpener = document.activeElement;
  renderWorkspace();
  sheet.showModal();
  requestAnimationFrame(() => document.querySelector('.fstages__item[aria-selected="true"]')?.focus());
}

document.addEventListener('click', (e) => {
  const navItem = e.target.closest('[data-nav-item]');
  if (navItem) {
    if (navItem.getAttribute('aria-disabled') === 'true') { e.preventDefault(); return; }
    document.getElementById('more-nav').close();
    return;
  }

  if (e.target.closest('[data-more-nav-open]')) { document.getElementById('more-nav').showModal(); return; }
  if (e.target.closest('[data-more-nav-close]')) { document.getElementById('more-nav').close(); return; }

  const agenda = e.target.closest('[data-agenda]');
  if (agenda) {
    const v = agenda.dataset.agenda;
    setSelection('agenda', v, !state.selected.agenda.has(v));
    afterSelectionChange('agenda');
    return;
  }

  const agendaScroll = e.target.closest('[data-agenda-scroll]');
  if (agendaScroll) {
    const list = document.getElementById('agenda-list');
    list.scrollBy({
      left: Number(agendaScroll.dataset.agendaScroll) * Math.max(240, list.clientWidth * 0.7),
      behavior: 'smooth',
    });
    return;
  }

  if (e.target.closest('[data-sheet-open]')) { openSheet(); return; }
  if (e.target.closest('[data-sheet-close]')) { document.getElementById('filter-sheet').close(); return; }

  const stage = e.target.closest('[data-stage]');
  if (stage) {
    const keepFocus = document.activeElement === stage;
    state.stage = stage.dataset.stage;
    renderStages();
    renderStageBody(false);
    if (keepFocus) document.querySelector('.fstages__item[aria-selected="true"]')?.focus();
    return;
  }

  const drill = e.target.closest('[data-drill-stage]');
  if (drill) {
    const s = drill.dataset.drillStage;
    state.drill[s] = drill.dataset.drill || null;
    if (s !== 'more') state.stageQuery[s] = '';
    renderStageBody(false);
    return;
  }

  if (e.target.closest('[data-stage-clear]')) {
    state.stageQuery[state.stage] = '';
    renderStageBody();
    const input = document.getElementById('stage-search');
    if (input) input.focus();
    return;
  }

  const funnelExpand = e.target.closest('[data-funnel-expand]');
  if (funnelExpand) {
    const id = funnelExpand.dataset.funnelExpand;
    if (state.funnelExpanded.has(id)) state.funnelExpanded.delete(id); else state.funnelExpanded.add(id);
    renderFunnel();
    return;
  }

  const clearAxis = e.target.closest('[data-clear-axis]');
  if (clearAxis) {
    const a = clearAxis.dataset.clearAxis;
    state.selected[a].clear();
    state.funnelExpanded.delete(a);
    afterSelectionChange(a);
    return;
  }

  const remove = e.target.closest('[data-remove-axis]');
  if (remove) {
    const { removeAxis, removeValue } = remove.dataset;
    state.selected[removeAxis].delete(removeValue);
    afterSelectionChange(removeAxis);
    return;
  }

  if (e.target.closest('[data-clear-all]')) {
    AXES.forEach((a) => state.selected[a].clear());
    state.sort = 'best';
    state.stageQuery = { industry: '', domain: '', expertise: '' };
    state.drill = { industry: null, expertise: null, more: null };
    state.stage = 'industry';
    state.moreQuery = {};
    state.funnelExpanded.clear();
    state.expanded.clear();
    state.query = '';
    const input = document.getElementById('search-input');
    input.value = '';
    document.getElementById('search').dataset.filled = 'false';
    renderAgendas();
    renderSort();
    if (isSheetOpen()) renderWorkspace();
    renderResults();
    return;
  }

  const view = e.target.closest('[data-view]');
  if (view) {
    const card = view.closest('[data-mentor]');
    state.cardView[card.dataset.mentor] = view.dataset.view;
    renderResults();
    return;
  }

  const more = e.target.closest('[data-more]');
  if (more) {
    state.expanded.add(more.closest('[data-mentor]').dataset.mentor);
    renderResults();
    return;
  }

  const book = e.target.closest('[data-book]');
  if (book) { openBooking(book.closest('[data-mentor]').dataset.mentor); return; }

  if (e.target.closest('[data-close]')) document.getElementById('booking').close();
});

/* Arrow keys move through the persistent category navigation. */
document.addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
  const current = e.target.closest('.fstages__item');
  if (!current) return;
  e.preventDefault();
  const ids = FILTER_CATEGORIES.map((s) => s.id);
  const i = ids.indexOf(current.dataset.stage);
  if (e.key === 'Home') state.stage = ids[0];
  else if (e.key === 'End') state.stage = ids.at(-1);
  else {
    const next = ['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : ids.length - 1;
    state.stage = ids[(i + next) % ids.length];
  }
  renderStages();
  renderStageBody(false);
  const el = document.querySelector('.fstages__item[aria-selected="true"]');
  if (el) el.focus();
});

document.addEventListener('change', (e) => {
  const sort = e.target.closest('[data-sort]');
  if (sort) { state.sort = sort.value; renderResults(); return; }

  const axis = e.target.dataset.axis;
  if (!axis) return;

  setSelection(axis, e.target.value, e.target.checked, e.target.type);
  afterSelectionChange(axis);
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'search-input') {
    state.query = e.target.value;
    document.getElementById('search').dataset.filled = String(!!e.target.value);
    renderResults();
    return;
  }

  if (e.target.dataset.stagesearch !== undefined) {
    state.stageQuery[state.stage] = e.target.value;
    const el = document.getElementById('fsheet-body');
    el.innerHTML = STAGE_BODY[state.stage]();
    const input = document.getElementById('stage-search');
    if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
    return;
  }

  // Repaint only the option list so the search field keeps focus and caret.
  const which = e.target.dataset.moresearch;
  if (which) {
    state.moreQuery[which] = e.target.value;
    document.getElementById('more-options').innerHTML = smallGroupOptions(MORE_GROUPS.find((g) => g.id === which));
  }
});

document.querySelector('.search__clear').addEventListener('click', () => {
  const input = document.getElementById('search-input');
  input.value = '';
  state.query = '';
  document.getElementById('search').dataset.filled = 'false';
  renderResults();
  input.focus();
});

/* Crossing the breakpoint swaps the rail for the tab bar; the More sheet only
   belongs to the tab bar. */
wide.addEventListener('change', () => {
  if (wide.matches) document.getElementById('more-nav').close();
});

document.getElementById('agenda-list').addEventListener('scroll', syncAgendaControls, { passive: true });
window.addEventListener('resize', syncAgendaControls);
document.getElementById('filter-sheet').addEventListener('close', () => {
  if (sheetOpener?.isConnected) sheetOpener.focus();
});

/* Native dialogs do not close themselves when their backdrop is clicked. A
   backdrop click targets the dialog element but lands outside its rendered box. */
document.getElementById('filter-sheet').addEventListener('pointerdown', (e) => {
  const sheet = e.currentTarget;
  if (e.target !== sheet) return;
  const rect = sheet.getBoundingClientRect();
  const outside = e.clientX < rect.left || e.clientX > rect.right
    || e.clientY < rect.top || e.clientY > rect.bottom;
  if (outside) sheet.close();
});

/* ── Booking sheet ─────────────────────────────────────────────────────── */

function slotLabel(hours) {
  if (hours <= 24) return 'Today';
  if (hours <= 48) return 'Tomorrow';
  if (hours <= 168) return `In ${Math.round(hours / 24)} days`;
  return `In ${Math.round(hours / 168)} weeks`;
}

function openBooking(id) {
  const m = mentors.find((x) => x.id === id);
  document.getElementById('booking-name').textContent = `Schedule with ${m.name}`;
  document.getElementById('booking-role').textContent = m.title;
  document.getElementById('booking-slot').textContent = `${slotLabel(m.availableInHours)}, 4:00 PM IST`;
  document.getElementById('booking-tz').textContent = m.timeZone;
  document.getElementById('booking-cost').textContent = '1 credit';
  document.getElementById('booking').showModal();
}

document.getElementById('booking-confirm').addEventListener('click', () => {
  const el = document.getElementById('credit-count');
  const left = Math.max(0, Number(el.textContent) - 1);
  el.textContent = String(left);
  document.getElementById('booking').close();
});

/* ── Boot ──────────────────────────────────────────────────────────────── */

paintIcons();
render();
