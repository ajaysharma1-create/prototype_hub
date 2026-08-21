/* Mentor Onboarding — a first-pass mentor profile setup journey.

   ── Where the fields come from ──────────────────────────────────────────────
   Every field on every step is one the product already collects. The source is
   ../../field-inventory.md, which inventories the current Tally onboarding form
   and the platform profile, and assigns each field a collection stage. This
   prototype implements exactly two of those stages and stops:

     Signup                 -> step 2
     Before profile review  -> steps 2, 3 and 4
     Before going live      -> step 5

   The three later stages — "Before accepting paid calls", "Before first payout"
   and "Optional / later" — are deliberately absent. They carry registered name,
   entity type, tax residency, billing address, Aadhaar, PAN, bank account and
   LOE, and the field inventory stages them after onboarding for good reasons.
   Pulling them forward into a welcome flow would be inventing a product
   decision. The banking half already has its own prototype next door, in
   ../banking-details-review.

   No field here is invented to make a screen feel complete, and no field is
   asked for twice.

   ── The taxonomy step ───────────────────────────────────────────────────────
   Step 4 is the mentor side of the MU taxonomy, and it uses the same rules the
   taxonomy work states rather than a second model for onboarding:

     · Industry — leaf selection only, capped at 2, Industry Group derived by
       the system and shown but never selectable. From
       "MentorUnion Taxonomy Changes - Industry_Domain_Expertise.md".
     · Functional Domain — capped at 2, the current Tally limit.
     · Expertise — capped at 8, the current Tally limit, and the browse list is
       narrowed to the selected domains, which is the one parent/child
       relationship the taxonomy sources actually state.

   The expertise cap is an open decision in the taxonomy folder (§7.2). Until it
   closes, this flow enforces what the product enforces today rather than
   inventing a number.

   ── What it does not do ─────────────────────────────────────────────────────
   No approval, verification, background-check or profile-review state is shown
   after step 7. In the current flow a manager creates the profile manually
   (../../current-flow-inventory.md, step 5) and the LOE is a weekly batch, so
   there is no real-time status to render and nothing is claimed. Step 7 hands
   the mentor to the profile overview, which exists.

   Loaded as a plain script, not an ES module, for the same file-system reason
   the mentee-side prototype is. */

const missing = ['MU_ICONS', 'MU_TAXONOMY'].filter((k) => !window[k]);
const screenEl = document.getElementById('screen');

if (missing.length) {
  screenEl.innerHTML = '<div class="card"><div class="card__title">This page did not load</div>'
    + '<div class="card__body">Missing: ' + missing.join(', ')
    + '. Open index.html so the data files load in order.</div></div>';
  throw new Error('Missing data globals: ' + missing.join(', '));
}

const icons = window.MU_ICONS;
const { functionalDomains, expertiseByDomain, industryGroups, agendas } = window.MU_TAXONOMY;

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

const iconWrap = (n) => '<span data-icon="' + n + '" data-size="16" aria-hidden="true"></span>';

/* ── Taxonomy lookups ──────────────────────────────────────────────────── */

const industryToGroup = new Map();
industryGroups.forEach((g) => g.industries.forEach((i) => industryToGroup.set(i.name, g.group)));

const expertiseToDomain = new Map();
Object.entries(expertiseByDomain).forEach(([domain, list]) => {
  list.forEach((e) => { if (!expertiseToDomain.has(e)) expertiseToDomain.set(e, domain); });
});

/* ── Reference values ──────────────────────────────────────────────────── */

/* field-inventory.md, Tally field 14: "Undergraduate, Postgraduate/Masters,
   PhD/Doctorate". The institution question that follows depends on which of the
   three is chosen, which is the fix for the audit finding that UG, PG and PhD
   institution are all currently mandatory for every mentor. */
const QUALIFICATIONS = ['Undergraduate', 'Postgraduate / Masters', 'PhD / Doctorate'];
const INSTITUTION_LABEL = {
  'Undergraduate': 'Undergraduate college or university',
  'Postgraduate / Masters': 'Postgraduate college or university',
  'PhD / Doctorate': 'Doctorate university',
};

/* Experience is a number on the Tally form ("Years of Work Experience",
   numeric). It stays a number here rather than becoming a band, because the
   mentee-side experience filter derives its bands from the number. */

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* The scheduler's own vocabulary is not documented in this folder, so the
   windows are kept to three plain parts of the day rather than a fabricated
   slot grid. Real availability is set on the platform profile after onboarding
   (field-inventory.md: Availability, "Before going live"). */
const WINDOWS = [
  { id: 'morning', label: 'Morning', hint: '8am – 12pm' },
  { id: 'afternoon', label: 'Afternoon', hint: '12pm – 5pm' },
  { id: 'evening', label: 'Evening', hint: '5pm – 10pm' },
];

/* field-inventory.md: "Pre-session buffer | Platform profile | System
   scheduling rule | Needed before bookability." */
const BUFFERS = ['No buffer', '15 minutes', '30 minutes', '60 minutes'];

/* ── Steps ─────────────────────────────────────────────────────────────── */

const STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'basic', label: 'Basic details' },
  { id: 'professional', label: 'Professional' },
  { id: 'expertise', label: 'Expertise' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
];

const stepIndex = (id) => STEPS.findIndex((s) => s.id === id);

/* ── State ─────────────────────────────────────────────────────────────── */

const state = {
  step: 'welcome',
  /* Set once the mentor has tried to leave a step, so validation speaks after
     an attempt rather than while they are still typing. */
  attempted: {},
  query: { industry: '', expertise: '' },

  data: {
    firstName: '', lastName: '', email: '', phone: '',
    city: '', country: '', linkedin: '', headshot: '',

    designation: '', organisation: '', years: '',
    qualification: '', institution: '', alumni: '', resume: '',

    industries: new Set(), domains: new Set(), expertise: new Set(),

    agendas: new Set(), days: new Set(), windows: new Set(), buffer: '30 minutes',
  },
};

const CAPS = { industries: 2, domains: 2, expertise: 8 };
const d = state.data;

/* ── Validation ────────────────────────────────────────────────────────── */

/* Required-ness follows the Tally form, with one correction the audit already
   identified: institution is required only for the qualification the mentor
   actually selected, instead of all three being mandatory for everyone. */
const RULES = {
  basic: [
    ['firstName', 'First name', (v) => !!v.trim()],
    ['lastName', 'Last name', (v) => !!v.trim()],
    ['email', 'Email', (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()), 'Enter a valid email address.'],
    ['phone', 'Phone number', (v) => v.replace(/\D/g, '').length >= 8, 'Enter a phone number with country code.'],
    ['city', 'City', (v) => !!v.trim()],
    ['country', 'Country', (v) => !!v.trim()],
    ['linkedin', 'LinkedIn profile', (v) => /^(https?:\/\/)?([\w-]+\.)*linkedin\.com\/.+/i.test(v.trim()),
      'Enter a linkedin.com profile URL.'],
  ],
  professional: [
    ['designation', 'Designation', (v) => !!v.trim()],
    ['organisation', 'Organisation', (v) => !!v.trim()],
    ['years', 'Years of experience', (v) => v !== '' && Number(v) >= 0 && Number(v) <= 60,
      'Enter a number between 0 and 60.'],
    ['qualification', 'Highest qualification', (v) => !!v],
    ['institution', 'Institution', (v) => !!v.trim()],
  ],
};

function errorsFor(step) {
  const out = {};
  (RULES[step] || []).forEach(([key, label, test, message]) => {
    if (!test(String(d[key] ?? ''))) out[key] = message || label + ' is required.';
  });
  if (step === 'expertise') {
    if (!d.industries.size) out.industries = 'Select at least one industry.';
    if (!d.domains.size) out.domains = 'Select at least one functional domain.';
    if (!d.expertise.size) out.expertise = 'Select at least one area of expertise.';
  }
  if (step === 'preferences') {
    if (!d.agendas.size) out.agendas = 'Select at least one session type.';
    if (!d.days.size) out.days = 'Select at least one day.';
    if (!d.windows.size) out.windows = 'Select at least one time of day.';
  }
  return out;
}

const stepValid = (step) => Object.keys(errorsFor(step)).length === 0;

/* ── Shared fragments ──────────────────────────────────────────────────── */

function stepsHtml(currentId) {
  const at = stepIndex(currentId);
  const shown = STEPS.slice(1, 6);
  return '<nav class="steps steps--long" aria-label="Progress">'
    + shown.map((s, i) => {
      const idx = i + 1;
      const st = idx < at ? 'done' : idx === at ? 'current' : 'todo';
      return (i ? '<span class="steps__sep" aria-hidden="true"></span>' : '')
        + '<span class="steps__item" data-state="' + st + '"'
        + (st === 'current' ? ' aria-current="step"' : '') + '>'
        + '<span class="steps__dot" aria-hidden="true">' + idx + '</span>'
        + '<span class="steps__label">' + esc(s.label) + '</span></span>';
    }).join('')
    + '<span class="steps__count">Step ' + at + ' of ' + shown.length + '</span>'
    + '</nav>';
}

function headHtml(title, lead) {
  return '<div class="head"><h1 class="head__title">' + esc(title) + '</h1>'
    + (lead ? '<p class="head__lead">' + lead + '</p>' : '') + '</div>';
}

function actionsHtml(buttons) {
  return '<div class="actions">' + buttons.map((b) => {
    if (b.spacer) return '<span class="actions__spacer"></span>';
    return '<button class="btn btn--' + b.kind + '" type="button" data-go="' + b.go + '">'
      + esc(b.label) + '</button>';
  }).join('') + '</div>';
}

function field(key, label, opts) {
  const o = opts || {};
  const errs = state.attempted[state.step] ? errorsFor(state.step) : {};
  const err = errs[key];
  const val = esc(String(d[key] ?? ''));
  const control = o.type === 'select'
    ? '<select data-field="' + key + '">'
      + '<option value=""' + (d[key] ? '' : ' selected') + '>' + esc(o.placeholder || 'Select') + '</option>'
      + (o.options || []).map((v) =>
        '<option value="' + esc(v) + '"' + (d[key] === v ? ' selected' : '') + '>' + esc(v) + '</option>').join('')
      + '</select>'
    : '<input data-field="' + key + '" type="' + (o.type || 'text') + '" value="' + val + '"'
      + (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '')
      + (o.inputmode ? ' inputmode="' + o.inputmode + '"' : '')
      + (o.min !== undefined ? ' min="' + o.min + '"' : '')
      + (o.max !== undefined ? ' max="' + o.max + '"' : '')
      + ' autocomplete="' + (o.autocomplete || 'off') + '">';

  return '<label class="field' + (o.wide ? ' field--wide' : '') + '"'
    + (err ? ' data-invalid="true"' : '') + '>'
    + '<span class="field__label">' + esc(label)
    + (o.optional ? '<span class="field__optional">optional</span>' : '') + '</span>'
    + control
    + (err ? '<span class="field__error">' + esc(err) + '</span>'
      : o.hint ? '<span class="field__hint">' + esc(o.hint) + '</span>' : '')
    + '</label>';
}

function upload(key, label, hint, optional) {
  return '<div class="field field--wide">'
    + '<span class="field__label">' + esc(label)
    + (optional ? '<span class="field__optional">optional</span>' : '') + '</span>'
    + '<div class="upload"><label>'
    + '<input type="file" data-file="' + key + '">'
    + '<span class="upload__btn">' + iconWrap('plus') + (d[key] ? 'Replace file' : 'Choose file') + '</span>'
    + '</label>'
    + '<span class="upload__name">' + (d[key] ? esc(d[key]) : 'No file chosen yet') + '</span></div>'
    + '<span class="field__hint">' + esc(hint) + '</span>'
    + '</div>';
}

function picks(axis, options, labelOf, hintOf) {
  return '<div class="picks">' + options.map((o) => {
    const value = typeof o === 'string' ? o : o.id;
    const on = d[axis].has(value);
    return '<button class="pick" type="button" data-pick="' + axis + '" data-value="' + esc(value) + '"'
      + ' aria-pressed="' + on + '">' + esc(labelOf ? labelOf(o) : value)
      + (hintOf && hintOf(o) ? ' · ' + esc(hintOf(o)) : '') + '</button>';
  }).join('') + '</div>';
}

function optionHtml(axis, value, meta) {
  const set = d[axis];
  const on = set.has(value);
  const dis = !on && set.size >= CAPS[axis];
  return '<label class="opt"><input type="checkbox" data-axis="' + axis + '" value="' + esc(value) + '"'
    + (on ? ' checked' : '') + (dis ? ' disabled' : '') + '>'
    + '<span class="opt__text">' + esc(value)
    + (meta ? '<span class="opt__meta">' + esc(meta) + '</span>' : '') + '</span></label>';
}

function axisHead(title, axis, hint, searchAxis) {
  const errs = state.attempted[state.step] ? errorsFor(state.step) : {};
  return '<div class="sticky-head">'
    + '<div class="card__title">' + esc(title)
    + '<span class="count">' + d[axis].size + ' of ' + CAPS[axis] + '</span></div>'
    + '<p class="hint' + (errs[axis] ? ' hint--over' : '') + '">'
    + esc(errs[axis] || hint) + '</p>'
    + (searchAxis
      ? '<div class="search"><span data-icon="search" data-size="16" aria-hidden="true"></span>'
        + '<label class="sr-only" for="q-' + searchAxis + '">Search ' + esc(title.toLowerCase()) + '</label>'
        + '<input id="q-' + searchAxis + '" type="search" autocomplete="off" spellcheck="false"'
        + ' data-query="' + searchAxis + '" value="' + esc(state.query[searchAxis]) + '" placeholder="Search">'
        + '</div>'
      : '')
    + '</div>';
}

/* ── Step 1 — Welcome ──────────────────────────────────────────────────── */

function screenWelcome() {
  return headHtml('Set up your mentor profile',
    'Five short steps. Most mentors finish in under ten minutes.')

    + '<div class="stack">'
    + '<div class="card"><div class="card__title">' + iconWrap('user') + 'What you will set up</div>'
    + '<div class="card__body"><p><strong>Who you are</strong> — name, contact details and your '
    + 'LinkedIn profile.</p>'
    + '<p><strong>What you have done</strong> — your role, organisation, experience and '
    + 'education.</p>'
    + '<p><strong>What you can mentor on</strong> — your industry, functional domains and areas '
    + 'of expertise. This is what mentees search on.</p>'
    + '<p><strong>How you want to mentor</strong> — the session types you take and when you are '
    + 'generally free.</p></div></div>'

    + '<div class="card"><div class="card__title">' + iconWrap('file-text') + 'Worth having ready</div>'
    + '<div class="card__body">A headshot, and your resume if you want to attach one. Payment and '
    + 'tax details are not part of this — they come later, before your first payout.</div></div>'
    + '</div>'

    + actionsHtml([{ spacer: true }, { kind: 'primary', label: 'Get Started', go: 'basic' }]);
}

/* ── Step 2 — Basic details ────────────────────────────────────────────── */

function screenBasic() {
  return stepsHtml('basic')
    + headHtml('Your details', 'This is how mentees and the MentorUnion team reach you.')

    + '<div class="card"><div class="fields">'
    + field('firstName', 'First name', { placeholder: 'Vikram', autocomplete: 'given-name' })
    + field('lastName', 'Last name', { placeholder: 'Nair', autocomplete: 'family-name' })
    + field('email', 'Email', { type: 'email', wide: true, placeholder: 'you@company.com',
      autocomplete: 'email', hint: 'This becomes your MentorUnion sign-in.' })
    + field('phone', 'Phone number', { type: 'tel', wide: true, placeholder: '+91 98765 43210',
      autocomplete: 'tel', hint: 'Include your country code. Kept private, used only by the team.' })
    + field('city', 'City', { placeholder: 'Bengaluru', autocomplete: 'address-level2' })
    + field('country', 'Country', { placeholder: 'India', autocomplete: 'country-name' })
    + field('linkedin', 'LinkedIn profile', { type: 'url', wide: true,
      placeholder: 'linkedin.com/in/yourname', hint: 'Shown on your profile.' })
    + upload('headshot', 'Headshot', 'Square image, up to 10 MB. Shown on your mentor card.', true)
    + '</div></div>'

    + actionsHtml([
      { kind: 'quiet', label: 'Back', go: 'welcome' },
      { spacer: true },
      { kind: 'primary', label: 'Continue', go: 'professional' },
    ]);
}

/* ── Step 3 — Professional details ─────────────────────────────────────── */

function screenProfessional() {
  const q = d.qualification;
  return stepsHtml('professional')
    + headHtml('Your background',
      'The role you are best known for, and where you studied.')

    + '<div class="card"><div class="fields">'
    + field('designation', 'Designation', { wide: true, placeholder: 'Director, Product',
      hint: 'The role you spent most of your career in.' })
    + field('organisation', 'Organisation', { placeholder: 'Microsoft' })
    + field('years', 'Years of experience', { type: 'number', min: 0, max: 60, inputmode: 'numeric',
      placeholder: '9' })
    + field('qualification', 'Highest qualification', { type: 'select', options: QUALIFICATIONS,
      placeholder: 'Select one' })
    + (q
      ? field('institution', INSTITUTION_LABEL[q], { placeholder: 'Institution name' })
      : '<div class="field"><span class="field__label">Institution</span>'
        + '<span class="field__hint">Choose a qualification first — we only ask for the one you '
        + 'hold.</span></div>')
    + '</div></div>'

    + '<div class="card">'
    + '<div class="card__title">Alumni of Masters’ Union or Tetr</div>'
    + '<div class="card__body" style="margin-bottom:10px">Tells the team which programme community '
    + 'you belong to.</div>'
    + '<div class="seg" role="group" aria-label="Alumni of Masters’ Union or Tetr">'
    + ['Yes', 'No'].map((v) => '<button type="button" data-set="alumni" data-value="' + v + '"'
      + ' aria-pressed="' + (d.alumni === v) + '">' + v + '</button>').join('')
    + '</div></div>'

    + '<div class="card">' + upload('resume', 'Resume',
      'Used by the team when reviewing your profile. Not shown publicly.', true) + '</div>'

    + actionsHtml([
      { kind: 'quiet', label: 'Back', go: 'basic' },
      { spacer: true },
      { kind: 'primary', label: 'Continue', go: 'expertise' },
    ]);
}

/* ── Step 4 — Expertise ────────────────────────────────────────────────── */

function screenExpertise() {
  const qi = state.query.industry.trim().toLowerCase();
  const groups = industryGroups.map((g) => ({
    group: g.group,
    industries: g.industries.filter((i) =>
      !qi || i.name.toLowerCase().includes(qi) || g.group.toLowerCase().includes(qi)),
  })).filter((g) => g.industries.length);

  const derivedGroups = [...new Set([...d.industries]
    .map((n) => industryToGroup.get(n)).filter(Boolean))];

  const qe = state.query.expertise.trim().toLowerCase();
  const expGroups = [...d.domains].map((dom) => ({
    domain: dom,
    list: (expertiseByDomain[dom] || []).filter((e) => !qe || e.toLowerCase().includes(qe)),
  })).filter((g) => g.list.length);

  const stranded = [...d.expertise]
    .filter((v) => { const dom = expertiseToDomain.get(v); return dom && !d.domains.has(dom); });

  return stepsHtml('expertise')
    + headHtml('What you can mentor on',
      'This is what mentees search and filter by, so it does more work than anything else on '
      + 'your profile.')

    + '<div class="card">'
    + axisHead('Industry', 'industries',
      d.industries.size >= CAPS.industries
        ? 'Both slots used. Remove one to pick a different industry.'
        : 'Where you have worked. Select up to ' + CAPS.industries
          + '; grouping is worked out for you.',
      'industry')
    + (groups.length
      ? groups.map((g) => '<div class="group"><div class="group__name">' + esc(g.group) + '</div>'
        + '<div class="opts">' + g.industries.map((i) =>
          optionHtml('industries', i.name, i.isNew ? 'New option' : '')).join('') + '</div></div>').join('')
      : '<p class="empty">No industry matches &ldquo;' + esc(state.query.industry) + '&rdquo;.</p>')
    + (derivedGroups.length
      ? '<div class="chips">' + derivedGroups.map((g) =>
        '<span class="chip chip--derived"><span>Counted under ' + esc(g) + '</span></span>').join('')
        + '</div>'
      : '')
    + '</div>'

    + '<div class="card">'
    + axisHead('Functional domain', 'domains',
      d.domains.size >= CAPS.domains
        ? 'Both slots used. Remove one to pick a different domain.'
        : 'What you do. Select up to ' + CAPS.domains + '; this sets your expertise options below.',
      null)
    + '<div class="opts">' + functionalDomains.map((dm) =>
      optionHtml('domains', dm.name, dm.isNew ? 'New option' : '')).join('') + '</div>'
    + '</div>'

    + '<div class="card">'
    + axisHead('Areas of expertise', 'expertise',
      !d.domains.size ? 'Select a functional domain above to see expertise options.'
        : d.expertise.size >= CAPS.expertise
          ? 'All ' + CAPS.expertise + ' slots used. Remove one to add another.'
          : 'What you help with. Select up to ' + CAPS.expertise + '.',
      'expertise')
    + (expGroups.length
      ? expGroups.map((g) => '<div class="group"><div class="group__name">' + esc(g.domain) + '</div>'
        + '<div class="opts">' + g.list.map((e) => optionHtml('expertise', e)).join('')
        + '</div></div>').join('')
      : '<p class="empty">' + (d.domains.size
        ? 'No expertise in your domains matches &ldquo;' + esc(state.query.expertise) + '&rdquo;.'
        : 'Nothing to show until you select a functional domain.') + '</p>')
    + (stranded.length
      ? '<div class="card__body">' + stranded.length + (stranded.length === 1
        ? ' selection sits' : ' selections sit') + ' under a domain you removed: '
        + stranded.map(esc).join(', ') + '. Re-select that domain to keep '
        + (stranded.length === 1 ? 'it' : 'them') + ', or clear '
        + (stranded.length === 1 ? 'it' : 'them') + ' below.</div>'
        + '<div class="chips">' + stranded.map((v) =>
          '<span class="chip"><span>' + esc(v) + '</span>'
          + '<button type="button" data-drop="expertise" data-value="' + esc(v) + '"'
          + ' aria-label="Remove ' + esc(v) + '" data-icon="x" data-size="13"></button></span>').join('')
        + '</div>'
      : '')
    + '</div>'

    + actionsHtml([
      { kind: 'quiet', label: 'Back', go: 'professional' },
      { spacer: true },
      { kind: 'primary', label: 'Continue', go: 'preferences' },
    ]);
}

/* ── Step 5 — Mentorship preferences ───────────────────────────────────── */

function screenPreferences() {
  const errs = state.attempted.preferences ? errorsFor('preferences') : {};
  return stepsHtml('preferences')
    + headHtml('How you want to mentor',
      'A rough picture is enough. Exact slots are set on your profile once you are live.')

    + '<div class="card">'
    + '<div class="card__title">Session types you can take'
    + '<span class="count">' + d.agendas.size + ' selected</span></div>'
    + '<p class="' + (errs.agendas ? 'field__error' : 'field__hint') + '" style="margin:6px 0 10px">'
    + esc(errs.agendas || 'What a mentee books you for. Pick every one you are comfortable with.')
    + '</p>'
    + picks('agendas', agendas)
    + '</div>'

    + '<div class="card">'
    + '<div class="card__title">Days you are usually free</div>'
    + '<p class="' + (errs.days ? 'field__error' : 'field__hint') + '" style="margin:6px 0 10px">'
    + esc(errs.days || 'A general pattern, not a commitment.') + '</p>'
    + picks('days', DAYS)
    + '<div class="card__title" style="margin-top:18px">Time of day</div>'
    + '<p class="' + (errs.windows ? 'field__error' : 'field__hint') + '" style="margin:6px 0 10px">'
    + esc(errs.windows || 'In your local time.') + '</p>'
    + picks('windows', WINDOWS, (w) => w.label, (w) => w.hint)
    + '</div>'

    + '<div class="card"><div class="fields">'
    + field('buffer', 'Gap between sessions', { type: 'select', options: BUFFERS, wide: true,
      placeholder: 'Select one',
      hint: 'Time held clear after each session before you can be booked again.' })
    + '</div></div>'

    + actionsHtml([
      { kind: 'quiet', label: 'Back', go: 'expertise' },
      { spacer: true },
      { kind: 'primary', label: 'Continue', go: 'review' },
    ]);
}

/* ── Step 6 — Review ───────────────────────────────────────────────────── */

const listOr = (set, empty) => (set.size ? [...set].join(', ') : empty);

function reviewGroup(title, go, rows) {
  return '<div class="card review__group">'
    + '<div class="review__head"><h2>' + esc(title) + '</h2>'
    + '<button class="review__edit" type="button" data-go="' + go + '">Edit</button></div>'
    + '<div class="review__list">' + rows.map(([k, v]) =>
      '<div class="review__k">' + esc(k) + '</div>'
      + '<div class="review__v' + (v ? '' : ' review__v--empty') + '">'
      + esc(v || 'Not added') + '</div>').join('') + '</div></div>';
}

function screenReview() {
  const groups = [...new Set([...d.industries].map((n) => industryToGroup.get(n)).filter(Boolean))];
  const days = DAYS.filter((x) => d.days.has(x));
  const windows = WINDOWS.filter((w) => d.windows.has(w.id)).map((w) => w.label);

  return stepsHtml('review')
    + headHtml('Check your profile',
      'Everything you entered, grouped. Edit anything that is not right.')

    + reviewGroup('You', 'basic', [
      ['Name', [d.firstName, d.lastName].filter(Boolean).join(' ')],
      ['Email', d.email],
      ['Phone', d.phone],
      ['Location', [d.city, d.country].filter(Boolean).join(', ')],
      ['LinkedIn', d.linkedin],
      ['Headshot', d.headshot],
    ])

    + reviewGroup('Background', 'professional', [
      ['Role', [d.designation, d.organisation].filter(Boolean).join(', ')],
      ['Experience', d.years === '' ? '' : d.years + (Number(d.years) === 1 ? ' year' : ' years')],
      ['Education', [d.qualification, d.institution].filter(Boolean).join(' · ')],
      ['Alumni', d.alumni],
      ['Resume', d.resume],
    ])

    + reviewGroup('Mentoring on', 'expertise', [
      ['Industry', listOr(d.industries, '')],
      ['Counted under', groups.join(', ')],
      ['Functional domain', listOr(d.domains, '')],
      ['Expertise', listOr(d.expertise, '')],
    ])

    + reviewGroup('How you mentor', 'preferences', [
      ['Session types', listOr(d.agendas, '')],
      ['Days', days.join(', ')],
      ['Time of day', windows.join(', ')],
      ['Gap between sessions', d.buffer],
    ])

    + actionsHtml([
      { kind: 'quiet', label: 'Back', go: 'preferences' },
      { spacer: true },
      { kind: 'primary', label: 'Submit profile', go: 'done' },
    ]);
}

/* ── Step 7 — Done ─────────────────────────────────────────────────────── */

function screenDone() {
  return '<div class="done">'
    + '<div class="done__mark">' + iconSvg('check', 28) + '</div>'
    + '<h1 class="head__title">Profile setup complete</h1>'
    + '<p class="head__lead">Everything you entered has been saved to your mentor profile. You can '
    + 'change any of it from your profile at any time.</p>'

    + '<div class="card"><div class="card__title">' + iconWrap('user') + 'Next</div>'
    + '<div class="card__body"><p>Your profile overview is where the rest of your setup lives — '
    + 'availability, and the payment and tax details needed before your first payout.</p></div>'
    + '</div>'
    + '</div>'

    + '<div class="actions">'
    + '<span class="actions__spacer"></span>'
    + '<button class="btn btn--secondary" type="button" data-go="review">Back to review</button>'
    + '<a class="btn btn--primary" href="../banking-details-review/index.html">Go to my profile</a>'
    + '</div>';
}

/* ── Render ────────────────────────────────────────────────────────────── */

const SCREENS = {
  welcome: screenWelcome,
  basic: screenBasic,
  professional: screenProfessional,
  expertise: screenExpertise,
  preferences: screenPreferences,
  review: screenReview,
  done: screenDone,
};

function render(scroll) {
  screenEl.innerHTML = SCREENS[state.step]();
  paintIcons(screenEl);
  if (scroll) {
    screenEl.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
}

/* Moving forward validates; moving back or jumping to a step from the review
   never does, because being sent back to fix something and then blocked from
   leaving is the worst version of this. */
const VALIDATED = ['basic', 'professional', 'expertise', 'preferences'];

function go(to) {
  const from = state.step;
  const forward = stepIndex(to) > stepIndex(from);

  if (forward && VALIDATED.includes(from)) {
    state.attempted[from] = true;
    if (!stepValid(from)) {
      render(false);
      const bad = screenEl.querySelector('[data-invalid="true"] input, [data-invalid="true"] select')
        || screenEl.querySelector('.hint--over, .field__error');
      if (bad) {
        bad.scrollIntoView({ block: 'center' });
        if (bad.focus) bad.focus({ preventScroll: true });
      }
      return;
    }
  }

  state.step = to;
  render(true);
}

/* ── Events ────────────────────────────────────────────────────────────── */

screenEl.addEventListener('click', (e) => {
  const goBtn = e.target.closest('[data-go]');
  if (goBtn) { go(goBtn.dataset.go); return; }

  const pick = e.target.closest('[data-pick]');
  if (pick) {
    const set = d[pick.dataset.pick];
    if (set.has(pick.dataset.value)) set.delete(pick.dataset.value);
    else set.add(pick.dataset.value);
    render(false);
    return;
  }

  const set = e.target.closest('[data-set]');
  if (set) { d[set.dataset.set] = set.dataset.value; render(false); return; }

  const drop = e.target.closest('[data-drop]');
  if (drop) { d[drop.dataset.drop].delete(drop.dataset.value); render(false); }
});

screenEl.addEventListener('change', (e) => {
  const box = e.target.closest('[data-axis]');
  if (box) {
    const set = d[box.dataset.axis];
    if (box.checked) set.add(box.value); else set.delete(box.value);
    render(false);
    return;
  }

  const file = e.target.closest('[data-file]');
  if (file) {
    d[file.dataset.file] = file.files && file.files[0] ? file.files[0].name : '';
    render(false);
    return;
  }

  const sel = e.target.closest('select[data-field]');
  if (sel) {
    d[sel.dataset.field] = sel.value;
    /* Changing qualification changes which institution is asked for, so the
       stale answer goes with it rather than being silently kept. */
    if (sel.dataset.field === 'qualification') d.institution = '';
    render(false);
  }
});

/* Once a step has been attempted, a field's message has to clear as soon as the
   mentor fixes it — but re-rendering the screen on every keystroke would take
   the field out from under the caret, and re-rendering when they tab away would
   destroy the element the browser is moving focus to. So the one field that
   changed is updated in place and nothing else is touched. */
function refreshField(key) {
  if (!state.attempted[state.step]) return;
  const input = screenEl.querySelector('[data-field="' + key + '"]');
  const wrap = input && input.closest('.field');
  if (!wrap) return;

  const message = errorsFor(state.step)[key];
  wrap.toggleAttribute('data-invalid', !!message);

  let note = wrap.querySelector('.field__error');
  if (message) {
    if (!note) {
      note = document.createElement('span');
      note.className = 'field__error';
      wrap.appendChild(note);
    }
    note.textContent = message;
  } else if (note) {
    note.remove();
  }
}

/* Text fields are written straight to state, so the caret stays put. */
screenEl.addEventListener('input', (e) => {
  const q = e.target.closest('[data-query]');
  if (q) {
    state.query[q.dataset.query] = q.value;
    render(false);
    const again = screenEl.querySelector('[data-query="' + q.dataset.query + '"]');
    if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
    return;
  }
  const f = e.target.closest('input[data-field]');
  if (f) { d[f.dataset.field] = f.value; refreshField(f.dataset.field); }
});

render(false);
