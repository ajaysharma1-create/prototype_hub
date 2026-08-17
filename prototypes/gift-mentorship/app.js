/* Gift a Career - MentorUnion
   Landing → one unified gifting page → guided design editor → provider
   checkout → confirmation, plus the recipient's Claim a Gift journey. There is
   no visible step tracker: the page hierarchy and a single continuation action
   carry the flow.

   Everything runs in the browser. There is no backend: no email is sent, no
   payment is taken, no account is created and no code is issued or validated by
   a server. Points that stand in for real infrastructure are marked SIMULATED. */

(() => {
  "use strict";

  /* SIMULATED issuance store. localStorage rather than sessionStorage so a code
     bought in one tab can be claimed in another - the closest a front-end build
     gets to a shared ledger. It is neither secret nor authoritative. */
  const LEDGER_KEY = "mentorunion-gift-codes-v1";
  const BALANCE_KEY = "mentorunion-credit-balance-v1";
  /* What each account actually holds, itemised. Kept apart from the ledger on
     purpose: the ledger must stay unable to say who claimed a code, so the
     entitlement is written against the account and carries no code. */
  const WALLET_KEY = "mentorunion-credit-wallet-v1";

  const GST_RATE = 0.18;
  const MESSAGE_MAX = 300;
  const NAME_MAX = 80;
  const SCHEDULE_MAX_DAYS = 365;

  /* Credits, prices and validity are transcribed from the approved catalogue in
     live/credit-purchase/pricing-page-research/b2c_pricing_landing_page.html.
     Credits are the internal unit. Purchaser-facing copy is expressed as
     conversations - derived arithmetic on the published 1–3 credit range. */
  const CREDIT_COST_MAX = 3;

  /* Descriptions are the approved catalogue copy, transcribed verbatim from
     b2c_pricing_landing_page.html - not rewritten for this journey. */
  const GIFTS = {
    focus: { id: "focus", name: "Focus", credits: 4, price: 4500, validityLabel: "2 months",
             description: "Turn one question into a clear next step" },
    growth: { id: "growth", name: "Growth", credits: 10, price: 10500, validityLabel: "4 months",
              featured: true, description: "Shape direction with multiple perspectives" },
    accelerator: { id: "accelerator", name: "Accelerator", credits: 25, price: 22500, validityLabel: "6 months",
                   description: "Work towards a magical breakthrough" }
  };
  const GIFT_IDS = Object.keys(GIFTS);

  /* The six gift designs. Structure, palettes, ornaments and voice are
     transcribed from prototype-hub/prototypes/gift-mentorship, which the brief
     names as the source of truth. Copy is re-pointed away from credits-and-
     sessions to the direction framing this journey uses; the mechanics every
     recipient needs are shared, so the framing changes but the facts never do.

     `base` is the flat palette each design is built on. It is what the editor's
     derived presets and every contrast calculation work from, so a customised
     card is measured against its own template rather than a global default.

     `nudge` is the contextual line shown once the design is chosen. Each is
     specific to that design's occasion - no design borrows another's tone. */

  /* Eyebrows are set in capitals, but a {{marker}} is a variable name rather than
     copy, so it keeps the casing it is declared with and stays greppable. */
  const isVar = (v) => /^\{\{.+\}\}$/.test(String(v));
  const upper = (v) => (isVar(v) ? v : String(v).toUpperCase());

  const DESIGNS = {
    signature: {
      id: "signature", name: "Signature", occasion: "Any occasion",
      base: { edge: "linear-gradient(90deg,#39B6D8,#F7D344,#E38330)", hero: "#0d0d0d", body: "#faf7ec", fg: "#ffffff", accent: "#39b6d8" },
      ornaments: null,
      nudge: "No occasion to lean on here - so the note does the work. A line about why you thought of them is enough.",
      subject: (d) => `${d.sender} sent you something for what's next`,
      eyebrow: (d) => `A GIFT FROM ${upper(d.sender)}`,
      headline: (d) => `${d.name}, your next conversation is already paid for`,
      lead: (d) => `Time with mentors you pick yourself - ${d.range}, 30 minutes each, whenever you're ready.`,
      closing: (d) => `There's no rush. The gift waits until you claim it, and the ${d.validity} only start counting from that day.`
    },
    milestone: {
      id: "milestone", name: "Milestone", occasion: "New job or promotion",
      base: { edge: "linear-gradient(90deg,#f7d344,#e9a63c,#e38330)", hero: "#f6f1df", body: "#fffdf4", fg: "#17150f", accent: "#d8a520" },
      ornaments: { label: "Underline", options: [["scribble", "Scribble"], ["rule", "Straight rule"], ["none", "None"]] },
      nudge: "They already did the hard part. Name the thing you watched them pull off.",
      subject: (d) => `Congratulations from ${d.sender}`,
      eyebrow: (d) => `CONGRATULATIONS FROM ${upper(d.sender)}`,
      headline: (d) => `You did it, ${d.name}`,
      lead: (d) => `${d.sender} sent you time with people who have already made the move you're making - ${d.range}, whenever you want them.`,
      closing: (d) => `Claim whenever you're ready; the ${d.validity} start from that day, not today.`
    },
    birthday: {
      id: "birthday", name: "Birthday", occasion: "Birthday", showCredits: true,
      base: { edge: "linear-gradient(90deg,#e38330,#f7d344,#39b6d8)", hero: "#231710", body: "#fdf8ee", fg: "#ffe9cf", accent: "#f0a65e" },
      ornaments: { label: "Ribbon", options: [["ribbon", "Ribbon"], ["none", "None"]] },
      nudge: "A birthday gift they'll still be using months from now. Keep the note light - it's a birthday.",
      subject: (d) => `Happy birthday, ${d.name} - a gift from ${d.sender}`,
      eyebrow: (d) => `HAPPY BIRTHDAY FROM ${upper(d.sender)}`,
      headline: (d) => `Happy birthday, ${d.name}`,
      lead: (d) => `Not a thing to find space for - just time with people who have been where you're going.`,
      closing: (d) => `Claim them when you like; the ${d.validity} start from that day.`
    },
    chapter: {
      id: "chapter", name: "New chapter", occasion: "Career change",
      base: { edge: "linear-gradient(90deg,#39b6d8,#5cc4bd,#7fd0b2)", hero: "#f1f5f4", body: "#fbfdfc", fg: "#0f1715", accent: "#2e94a8" },
      ornaments: { label: "Headline rule", options: [["rule", "Rule"], ["none", "None"]] },
      nudge: "Mid-turn, most people mainly need to hear that it's navigable. You've seen them navigate before - say so.",
      subject: (d) => `${d.sender} sent you something for the new chapter`,
      eyebrow: (d) => `FROM ${upper(d.sender)}`,
      headline: (d) => `New chapter, ${d.name}`,
      lead: (d) => `${d.sender} thought you could use someone to think it through with - ${d.range} with mentors who have made the same turn.`,
      closing: (d) => `Nothing expires while the gift sits unclaimed, and the ${d.validity} start the day you claim it.`
    },
    rakhi: {
      id: "rakhi", name: "Rakhi", occasion: "Raksha Bandhan",
      base: { edge: "linear-gradient(90deg,#a3302a,#d97b2b,#edc25c)", hero: "#3f1a11", body: "#fdf5e6", fg: "#fff6e6", accent: "#edc25c" },
      ornaments: { label: "Thread", options: [["thread", "Woven thread"], ["none", "None"]] },
      nudge: "The promise behind the thread is looking out for them. This is that promise in a form that outlasts the day.",
      subject: (d) => `Happy Raksha Bandhan, ${d.name}`,
      eyebrow: (d) => `RAKSHA BANDHAN · FROM ${upper(d.sender)}`,
      headline: (d) => `Happy Raksha Bandhan, ${d.name}`,
      lead: (d) => `${d.sender} sent you ${d.range} with mentors of your choosing - the kind of looking out for you that lasts a good deal longer than a day.`,
      closing: (d) => `Claim them whenever you like; the ${d.validity} start from that day.`
    },
    note: {
      id: "note", name: "Quiet note", occasion: "Message first", messageHero: true,
      base: { edge: "linear-gradient(90deg,#39b6d8,#4d7f9b)", hero: "#111619", body: "#f7fafb", fg: "#e2eef3", accent: "#39b6d8" },
      ornaments: { label: "Quote marks", options: [["quotes", "Shown"], ["none", "Hidden"]] },
      nudge: "Here the note is the gift and everything else is packaging. A few honest lines carry it.",
      subject: (d) => `A note from ${d.sender}`,
      eyebrow: (d) => `FROM ${upper(d.sender)}`,
      headline: (d) => `${d.name}, this came with a note`,
      lead: (d) => `Along with it, ${d.range} with mentors you choose yourself.`,
      closing: (d) => `A conversation costs 1 to 3 credits, always shown before you book. The ${d.validity} start the day you claim them, not today.`
    }
  };
  const DESIGN_IDS = Object.keys(DESIGNS);

  /* ------------------------------------------------- guided editor sets -- */

  /* A curated set, not a library. Two are already loaded by the page; the rest
     are system faces that resolve without a network request. */
  const FONTS = {
    brand: { id: "brand", name: "Brand sans", stack: '"Montserrat","Helvetica Neue",Arial,sans-serif', weights: [400, 600, 700] },
    editorial: { id: "editorial", name: "Editorial serif", stack: '"Instrument Serif",Georgia,serif', weights: [400] },
    classic: { id: "classic", name: "Classic serif", stack: 'Georgia,"Times New Roman",serif', weights: [400, 700] },
    humanist: { id: "humanist", name: "Humanist sans", stack: '"Trebuchet MS","Segoe UI",system-ui,sans-serif', weights: [400, 700] },
    typewriter: { id: "typewriter", name: "Typewriter", stack: '"Courier New",ui-monospace,monospace', weights: [400, 700] }
  };
  const FONT_IDS = Object.keys(FONTS);

  /* Sizes are a fixed scale, not a free number: every step is inside a range the
     card composition survives. */
  const SIZE_STEPS = [["0.85", "S"], ["1", "M"], ["1.15", "L"], ["1.3", "XL"]];
  const WEIGHT_STEPS = [["400", "Regular"], ["600", "Medium"], ["700", "Bold"]];
  const ALIGN_STEPS = [["start", "Left"], ["center", "Centre"]];
  const LEADING_STEPS = [["1.3", "Tight"], ["1.45", "Normal"], ["1.7", "Relaxed"]];
  const DENSITY_STEPS = [["compact", "Compact"], ["standard", "Standard"], ["roomy", "Roomy"]];
  const EDGE_STEPS = [["brand", "Brand gradient"], ["accent", "Solid accent"], ["none", "None"]];
  const FRAME_STEPS = [["none", "None"], ["hairline", "Hairline"]];

  const PRESETS = [["original", "Original"], ["deep", "Deep"], ["soft", "Soft"], ["bold", "Bold"]];

  /* `weight` and `leading` say which controls the card actually consumes for
     that region. A control with no effect on the selected region is not shown
     at all rather than shown and ignored. */
  const REGIONS = [
    { id: "headline", name: "Headline", leading: false, weight: true },
    { id: "message", name: "Your message", leading: true, weight: false },
    { id: "signoff", name: "Sign-off", leading: false, weight: true }
  ];

  const EDITOR_GROUPS = [["template", "Template"], ["type", "Type"], ["colour", "Colour"], ["details", "Details"]];

  const DEFAULT_CUSTOM = {
    preset: "original", bg: "", accent: "",
    headlineFont: "", headlineScale: "1", headlineWeight: "", headlineAlign: "", headlineColor: "",
    messageFont: "", messageScale: "1", messageAlign: "", messageLeading: "", messageColor: "",
    signoffFont: "", signoffScale: "1", signoffWeight: "", signoffAlign: "", signoffColor: "",
    edge: "brand", frame: "none", density: "standard", ornament: "", lead: "on"
  };

  /* ---------------------------------------------------- calling codes ---- */

  /* Every sovereign state plus the territories that carry their own calling
     code, so nobody has to type a prefix or find their country missing. Held as
     one string to keep the table readable; the shared codes (+1, +44, +7, +590,
     +599) are why the country name, not the dial code, is the option's value. */
  const COUNTRY_CODES = `Afghanistan 93|Åland Islands 358|Albania 355|Algeria 213|American Samoa 1684|Andorra 376|
Angola 244|Anguilla 1264|Antigua and Barbuda 1268|Argentina 54|Armenia 374|Aruba 297|Australia 61|Austria 43|
Azerbaijan 994|Bahamas 1242|Bahrain 973|Bangladesh 880|Barbados 1246|Belarus 375|Belgium 32|Belize 501|Benin 229|
Bermuda 1441|Bhutan 975|Bolivia 591|Bonaire 599|Bosnia and Herzegovina 387|Botswana 267|Brazil 55|
British Virgin Islands 1284|Brunei 673|Bulgaria 359|Burkina Faso 226|Burundi 257|Cambodia 855|Cameroon 237|Canada 1|
Cape Verde 238|Cayman Islands 1345|Central African Republic 236|Chad 235|Chile 56|China 86|Christmas Island 61|
Cocos (Keeling) Islands 61|Colombia 57|Comoros 269|Congo 242|Congo (DRC) 243|Cook Islands 682|Costa Rica 506|
Côte d'Ivoire 225|Croatia 385|Cuba 53|Curaçao 599|Cyprus 357|Czechia 420|Denmark 45|Djibouti 253|Dominica 1767|
Dominican Republic 1809|Ecuador 593|Egypt 20|El Salvador 503|Equatorial Guinea 240|Eritrea 291|Estonia 372|
Eswatini 268|Ethiopia 251|Falkland Islands 500|Faroe Islands 298|Fiji 679|Finland 358|France 33|French Guiana 594|
French Polynesia 689|Gabon 241|Gambia 220|Georgia 995|Germany 49|Ghana 233|Gibraltar 350|Greece 30|Greenland 299|
Grenada 1473|Guadeloupe 590|Guam 1671|Guatemala 502|Guernsey 44|Guinea 224|Guinea-Bissau 245|Guyana 592|Haiti 509|
Honduras 504|Hong Kong 852|Hungary 36|Iceland 354|India 91|Indonesia 62|Iran 98|Iraq 964|Ireland 353|Isle of Man 44|
Israel 972|Italy 39|Jamaica 1876|Japan 81|Jersey 44|Jordan 962|Kazakhstan 7|Kenya 254|Kiribati 686|Kosovo 383|
Kuwait 965|Kyrgyzstan 996|Laos 856|Latvia 371|Lebanon 961|Lesotho 266|Liberia 231|Libya 218|Liechtenstein 423|
Lithuania 370|Luxembourg 352|Macao 853|Madagascar 261|Malawi 265|Malaysia 60|Maldives 960|Mali 223|Malta 356|
Marshall Islands 692|Martinique 596|Mauritania 222|Mauritius 230|Mayotte 262|Mexico 52|Micronesia 691|Moldova 373|
Monaco 377|Mongolia 976|Montenegro 382|Montserrat 1664|Morocco 212|Mozambique 258|Myanmar 95|Namibia 264|Nauru 674|
Nepal 977|Netherlands 31|New Caledonia 687|New Zealand 64|Nicaragua 505|Niger 227|Nigeria 234|Niue 683|
Norfolk Island 672|North Korea 850|North Macedonia 389|Northern Mariana Islands 1670|Norway 47|Oman 968|Pakistan 92|
Palau 680|Palestine 970|Panama 507|Papua New Guinea 675|Paraguay 595|Peru 51|Philippines 63|Pitcairn Islands 64|
Poland 48|Portugal 351|Puerto Rico 1787|Qatar 974|Réunion 262|Romania 40|Russia 7|Rwanda 250|Saint Barthélemy 590|
Saint Helena 290|Saint Kitts and Nevis 1869|Saint Lucia 1758|Saint Martin 590|Saint Pierre and Miquelon 508|
Saint Vincent and the Grenadines 1784|Samoa 685|San Marino 378|São Tomé and Príncipe 239|Saudi Arabia 966|
Senegal 221|Serbia 381|Seychelles 248|Sierra Leone 232|Singapore 65|Sint Maarten 1721|Slovakia 421|Slovenia 386|
Solomon Islands 677|Somalia 252|South Africa 27|South Korea 82|South Sudan 211|Spain 34|Sri Lanka 94|Sudan 249|
Suriname 597|Svalbard and Jan Mayen 47|Sweden 46|Switzerland 41|Syria 963|Taiwan 886|Tajikistan 992|Tanzania 255|
Thailand 66|Timor-Leste 670|Togo 228|Tokelau 690|Tonga 676|Trinidad and Tobago 1868|Tunisia 216|Türkiye 90|
Turkmenistan 993|Turks and Caicos Islands 1649|Tuvalu 688|Uganda 256|Ukraine 380|United Arab Emirates 971|
United Kingdom 44|United States 1|Uruguay 598|US Virgin Islands 1340|Uzbekistan 998|Vanuatu 678|Vatican City 39|
Venezuela 58|Vietnam 84|Wallis and Futuna 681|Western Sahara 212|Yemen 967|Zambia 260|Zimbabwe 263`
    .split("|")
    .map((entry) => {
      const cleaned = entry.trim();
      const cut = cleaned.lastIndexOf(" ");
      return [cleaned.slice(0, cut), cleaned.slice(cut + 1)];
    });

  const DEFAULT_COUNTRY = "India";
  const DIALS = new Map(COUNTRY_CODES);
  function dialOf(country) { return DIALS.get(country) || DIALS.get(DEFAULT_COUNTRY); }

  /* -------------------------------------------------------- claim codes -- */

  /* No I, L, O, U, 0 or 1: the characters people mistype when copying a code off
     a printed card. 30 characters, so one check character catches most single
     slips before anything is looked up. */
  const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

  /* One source for each CTA label, so the nav and the landing stand-in can never
     drift apart - the stand-in tells people to click them by name. */
  const GIFT_CTA = "Gift a Career";
  const SIGNUP_CTA = "Signup";

  /* ------------------------------------------- signed-in platform ------- */

  /* SIMULATED session. The claiming journey happens inside the authenticated
     platform, so the account is a given: the page already knows who is signed
     in and never asks again. There is no auth here - this stands in for the
     session a real platform would already hold. */
  const SESSION = { name: "Ananya Rao", email: "ananya.rao@example.com" };

  const CLAIM_CTA = "Claim your Gift";

  /* Prototype claim codes. Deterministic, so every state can be demonstrated
     and re-demonstrated without hunting for a code from a purchase.

     Only the seven-character payload is written here; the check character is
     computed by the same `checkChar` the real format uses, so a fixture can
     never drift out of the format and be rejected before lookup. Credits,
     names, ranges and validity are read from GIFTS at seed time rather than
     copied, so the catalogue stays the single source.

     `expires` is the ONLY place an expiry is ever set. `issueCode` does not
     set one and is unchanged: a genuinely purchased gift still never expires
     while it sits unclaimed, which is the rule this build already enforces.
     See the implementation report's open decision on gift-code expiry. */
  const PROTOTYPE_CODES = [
    { payload: "TESTGRW", giftId: "growth", seed: "unclaimed",
      note: "Valid and unclaimed. Redeems on submit." },
    { payload: "TESTFCS", giftId: "focus", seed: "unclaimed",
      note: "Valid and unclaimed, smallest gift." },
    { payload: "TESTACC", giftId: "accelerator", seed: "unclaimed",
      note: "Valid and unclaimed, largest gift." },
    { payload: "TESTDNE", giftId: "growth", seed: "claimed",
      note: "Already claimed before this session began." },
    { payload: "TESTXPD", giftId: "focus", seed: "expired", expiresDaysAgo: 26,
      note: "Exists, but past the date it could be claimed." }
  ];

  /* Never seeded, and named here so the invalid path has documented inputs
     too. Both answer identically - see `resolveClaim`. */
  const PROTOTYPE_INVALID = [
    { code: "MU-TEST-BADQ", note: "Correctly formed, but no such gift exists." },
    { code: "MU-TEST-BADX", note: "Check character does not match; never reaches a lookup." }
  ];

  /* The mentor listing, transcribed from the All Mentors screen in
     live/mentee-direct-onboarding/prototype. Same eight mentors, same agendas,
     same fields - this is that dashboard's data, not a new catalogue. */
  const AGENDAS = ["Resume Prep", "Mock Interview", "Career Roadmap", "Building Startup",
                   "Grow Your Brand", "Case / Guesstimates", "Pitchdeck Review"];

  const MENTOR_SUBFILTERS = ["All", "Cover Letter", "Resume Review", "SOP & Assignment",
                             "LinkedIn Profile", "Professional Projects"];

  const MENTOR_SORTS = [["best", "Best match (recommended)"], ["rating", "Highest rated"],
                        ["experience", "Experience (high to low)"]];

  /* The collapsed facets the dashboard shows but does not implement. Kept for
     fidelity and answered honestly when pressed, like every other out-of-scope
     destination in this build. */
  const MENTOR_FACETS = ["Functional Domain", "Expertise", "Industry", "Company / Brand",
                         "Experience Level", "Rating", "Availability"];

  const MENTORS = [
    { name: "Vikram Nair", role: "Director, Product · ex-Microsoft, ex-Swiggy", exp: "9+ yrs", calls: "140+ calls", rating: "4.9", domains: ["Tech & Product", "Data Science & AI"], agendas: ["Career Roadmap", "Mock Interview", "Resume Prep"], credits: 2 },
    { name: "Sara Iyer", role: "Partner · ex-McKinsey", exp: "12+ yrs", calls: "210+ calls", rating: "5.0", domains: ["Consulting & Strategy"], agendas: ["Case / Guesstimates", "Career Roadmap"], credits: 3 },
    { name: "Rohan Das", role: "CXO · ex-Microsoft", exp: "15+ yrs", calls: "95+ calls", rating: "4.8", domains: ["Communication & Leadership", "Tech & Product"], agendas: ["Career Roadmap", "Grow Your Brand"], credits: 2 },
    { name: "Neha Kapoor", role: "VP Marketing · ex-Unilever", exp: "11+ yrs", calls: "130+ calls", rating: "4.9", domains: ["Sales, Brand & Marketing"], agendas: ["Grow Your Brand", "Mock Interview"], credits: 2 },
    { name: "Arjun Verma", role: "Founder · YC-backed", exp: "7+ yrs", calls: "80+ calls", rating: "4.7", domains: ["Entrepreneurship & Startups"], agendas: ["Building Startup", "Pitchdeck Review"], credits: 2 },
    { name: "Priya Menon", role: "Sr Data Scientist · ex-Google", exp: "8+ yrs", calls: "110+ calls", rating: "5.0", domains: ["Data Science & AI", "Tech & Product"], agendas: ["Mock Interview", "Resume Prep"], credits: 2 },
    { name: "Karan Shah", role: "Principal PM · ex-Amazon", exp: "10+ yrs", calls: "120+ calls", rating: "4.8", domains: ["Tech & Product", "Chief of Staff & Founder's Office"], agendas: ["Resume Prep", "Mock Interview", "Career Roadmap"], credits: 2 },
    { name: "Ananya Rao", role: "Director Strategy · ex-Bain", exp: "13+ yrs", calls: "160+ calls", rating: "4.9", domains: ["Consulting & Strategy", "PEVC, Banking & Investments"], agendas: ["Case / Guesstimates", "Career Roadmap"], credits: 3 }
  ];

  const ROUTES = ["", "gift", "personalise", "checkout", "gift/confirmed", "claim",
                  "app", "app/credits", "app/claim"];
  const ROUTE_TITLES = {
    "": GIFT_CTA,
    "gift": "Create your gift",
    "personalise": "Personalise the design",
    "checkout": "Checkout",
    "gift/confirmed": "Gift confirmed",
    "claim": "Claim a gift",
    "app": "All Mentors",
    "app/credits": "Your credits",
    "app/claim": CLAIM_CTA
  };

  /* Routes rendered inside the signed-in platform shell rather than the
     marketing one. The two shells are mutually exclusive. */
  const PLATFORM_ROUTES = ["app", "app/credits", "app/claim"];

  /* Addresses that are already in print and must keep working, forwarded to
     where the journey now lives. `mentorunion.com/claim` is on every gift card
     ever produced by this build, and claiming now happens inside the signed-in
     platform, so a card already handed over still lands in the right place. */
  const ROUTE_ALIASES = { "claim": "app/claim" };

  /* Transparent 376x111 lockup - white artwork, used on dark grounds directly.
     The supplied dark-variant board is used on light heroes, where its white
     ground is multiplied away. Which one is used follows the measured luminance
     of the hero, so a recoloured card never renders an illegible lockup. */
  const LOGO_LIGHT = "assets/logos/mentor-union-logo.png";
  const LOGO_DARK = "assets/logos/white-bg-logo.png";

  const CLAIM_URL = "mentorunion.com/claim";

  /* The guided design editor is built and works, but is out of scope for this
     build. The flag is the only thing holding it shut: nothing below it has been
     removed, so setting this to true restores the route, the control and the
     whole editor exactly as it was. */
  const PERSONALISE_ENABLED = false;
  const PERSONALISE_OFF = "Personalising the design isn't covered in this build.";

  /* Off while design and engineering walk the flow: an empty field stops nothing,
     so the journey can be crossed end to end without retyping a recipient every
     time. Anything actually entered is still checked, so a malformed email still
     says so. Set this to true to require the details again; no rule below it has
     been removed. */
  const REQUIRE_DETAILS = false;

  const app = document.querySelector("#app");
  const liveRegion = document.querySelector("#live-region");
  const toastRegion = document.querySelector("#toast-region");
  const navInner = document.querySelector(".nav-inner");
  const menuToggle = document.querySelector(".menu-toggle");
  const pageMain = document.querySelector(".page-main");
  const platShell = document.querySelector("#plat-shell");
  const platView = document.querySelector("#plat-view");
  const platTitle = document.querySelector("#plat-page-title");

  const timers = { payment: null, toast: null, claim: null, giftEmail: null };

  /* --------------------------------------------------------------- state -- */

  function initialState() {
    return {
      giftId: "growth",
      designId: "rakhi",
      form: { recipientName: "", recipientEmail: "", recipientCountry: DEFAULT_COUNTRY, recipientPhone: "",
              purchaserName: "", purchaserEmail: "", message: "" },
      /* No channel is chosen for the purchaser. Deciding how a gift reaches
         someone is part of giving it, so the page waits for that decision rather
         than assuming email. `when` is the timing default *within* email, which
         only exists once email has been chosen. */
      delivery: { email: false, whatsapp: false, printable: false, when: "now", date: "", time: "09:00" },
      custom: {},
      editor: { group: "type", region: "headline" },
      errors: {},
      /* Set only by the commit action. With every field optional, an entered name
         no longer proves a gift was configured, so this is what the checkout
         checks instead: it is reachable by committing and by nothing else. */
      committed: false,
      payment: { method: "upi", status: "idle", failure: "" },
      previewOpen: true,
      /* Which comic panel is showing, so a re-render of the gifting form does
         not snap the strip back to the first one. */
      comicScene: 0,
      order: null,
      /* SIMULATED delivery switch, exposed on the confirmation page so the
         retry and give-up paths can be walked without a mail service. */
      forceEmailFailure: false,
      claim: { input: "", stage: "entry", code: "", account: "", claimedCredits: 0, errors: {} },
      /* The signed-in claim page. `problem` is the last resolved failure and
         `gift` the facts of a completed redemption; only one is ever set. */
      appClaim: { input: "", status: "idle", problem: "", expiredOn: "", gift: null },
      /* Mentor listing state. `agenda` and `sort` really do reorder the list;
         `sub` is the dashboard's secondary chip row, which is presentational
         there and presentational here. */
      mentors: { agenda: AGENDAS[0], sub: MENTOR_SUBFILTERS[0], sort: "best" }
    };
  }

  /* The gifting session lives for the life of the page and nowhere else. A gift
     carries someone's name, address, phone number and a personal note, so a
     refresh or a step backwards clears it rather than leaving it sitting in
     storage for whoever opens the tab next. Nothing is written to sessionStorage.

     The issued-code ledger and the credit balance are separate: those stand in
     for the server, so they survive on purpose. */
  let state = initialState();

  /* Everything the purchaser configured, discarded. The recipient's claim
     journey is a different person's session and is left alone. */
  function resetGift() {
    const keepClaim = state.claim;
    state = initialState();
    state.claim = keepClaim;
    if (timers.payment) window.clearTimeout(timers.payment);
  }

  /* ------------------------------------------------------------- helpers -- */

  function e(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function money(value) {
    return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(value));
  }

  function gift() { return GIFTS[state.giftId] || GIFTS.growth; }
  function design() { return DESIGNS[state.designId] || DESIGNS.signature; }

  function custom(designId = state.designId) {
    const t = DESIGNS[designId] || DESIGNS.signature;
    const stored = state.custom[designId] || {};
    const fallbackOrnament = t.ornaments ? t.ornaments.options[0][0] : "";
    return { ...DEFAULT_CUSTOM, ornament: fallbackOrnament, ...stored };
  }

  function setCustom(patch) {
    state.custom[state.designId] = { ...custom(), ...patch };
  }

  function isCustomised(designId = state.designId) {
    const c = custom(designId);
    const base = { ...DEFAULT_CUSTOM, ornament: c.ornament };
    return Object.keys(DEFAULT_CUSTOM).some((k) => String(c[k]) !== String(base[k]));
  }

  function quote(g = gift()) {
    const tax = Math.round(g.price * GST_RATE);
    return { base: g.price, tax, total: g.price + tax };
  }

  /* Minimum assumes every conversation costs the published maximum; maximum
     assumes the published minimum. Both ends are the catalogue's own range. */
  function conversationLabel(g = gift()) {
    return `${Math.ceil(g.credits / CREDIT_COST_MAX)}–${g.credits} conversations`;
  }

  function isoDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function todayISO() { return isoDate(new Date()); }
  function maxScheduleISO() { const d = new Date(); d.setDate(d.getDate() + SCHEDULE_MAX_DAYS); return isoDate(d); }

  /* Scheduling is allowed from today, so a same-day slot must still be in the
     future. A few minutes of slack keeps a just-past-the-minute pick usable. */
  function scheduledAt(delivery = state.delivery) {
    if (!delivery.date || !delivery.time) return null;
    const at = new Date(`${delivery.date}T${delivery.time}`);
    return Number.isNaN(at.getTime()) ? null : at;
  }

  function formatTime(value) {
    const at = new Date(`2000-01-01T${value}`);
    if (Number.isNaN(at.getTime())) return value;
    return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).format(at);
  }

  function scheduleSummary(delivery = state.delivery) {
    return `${formatDate(delivery.date)} at ${formatTime(delivery.time)}`;
  }

  function formatDate(value) {
    const d = value instanceof Date ? value : new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(d);
  }

  function firstName(value) { return String(value || "").trim().split(/\s+/)[0] || ""; }

  function orderReference() {
    const now = new Date();
    return `MU-G${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  }

  function maskEmail(email) {
    const [local = "", domain = ""] = String(email).split("@");
    if (!local || !domain) return "the intended address";
    return `${local.slice(0, 1)}${"•".repeat(Math.min(Math.max(local.length - 1, 3), 6))}@${domain}`;
  }

  /* The action label follows what the purchaser actually chose, so the button
     describes their gift rather than the transaction behind it. */
  function commitLabel(delivery = state.delivery) {
    /* Only email actually sends anything, so only email earns "Send". */
    if (delivery.email && delivery.when === "later") return "Schedule this gift";
    if (delivery.email) return "Send this gift";
    if (delivery.whatsapp || delivery.printable) return "Finish this gift";
    /* Nothing chosen yet: the label cannot describe a delivery that isn't there. */
    return "Complete this gift";
  }

  /* ---------------------------------------------------------- colour ----- */

  function hexToRgb(hex) {
    const h = String(hex || "").replace("#", "").trim();
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    if (!/^[0-9a-f]{6}$/i.test(full)) return { r: 0, g: 0, b: 0 };
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex({ r, g, b }) {
    return "#" + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
  }

  function relLuminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  function contrastRatio(a, b) {
    const l1 = relLuminance(a);
    const l2 = relLuminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  function rgbToHsl(hex) {
    const { r, g, b } = hexToRgb(hex);
    const rr = r / 255, gg = g / 255, bb = b / 255;
    const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l: l * 100 };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0));
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    return { h: h * 60, s: s * 100, l: l * 100 };
  }

  function hslToHex({ h, s, l }) {
    const S = Math.min(100, Math.max(0, s)) / 100;
    const L = Math.min(100, Math.max(0, l)) / 100;
    const k = (n) => (n + h / 30) % 12;
    const a = S * Math.min(L, 1 - L);
    const f = (n) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return rgbToHex({ r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 });
  }

  function readableOn(bg) {
    return contrastRatio("#ffffff", bg) >= contrastRatio("#0f0f0f", bg) ? "#ffffff" : "#0f0f0f";
  }

  /* Walks a chosen colour towards the far end of its own lightness until it
     clears the ratio on the ground it will sit on. Hue is kept, so the result is
     still the colour the purchaser picked - just legible. */
  function ensureContrast(fg, bg, min = 4.5) {
    if (!fg) return fg;
    if (contrastRatio(fg, bg) >= min) return fg;
    const hsl = rgbToHsl(fg);
    const goLighter = relLuminance(bg) < 0.5;
    for (let i = 0; i < 100; i += 1) {
      hsl.l += goLighter ? 1 : -1;
      if (hsl.l <= 0 || hsl.l >= 100) break;
      if (contrastRatio(hslToHex(hsl), bg) >= min) return hslToHex(hsl);
    }
    return readableOn(bg);
  }

  function fade(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /* Presets are computed from each template's own accent, so all four stay
     inside that design's family rather than repainting it as a different card. */
  function presetPalette(t, id) {
    const accent = t.base.accent;
    const hsl = rgbToHsl(accent);
    if (id === "deep") return { hero: hslToHex({ h: hsl.h, s: Math.min(hsl.s, 34), l: 8 }), accent };
    if (id === "soft") return { hero: hslToHex({ h: hsl.h, s: Math.min(hsl.s, 42), l: 93 }),
                                accent: hslToHex({ h: hsl.h, s: hsl.s, l: Math.min(hsl.l, 36) }) };
    if (id === "bold") return { hero: hslToHex({ h: hsl.h, s: Math.min(Math.max(hsl.s, 42), 70), l: 24 }),
                                accent: hslToHex({ h: hsl.h, s: hsl.s, l: Math.max(hsl.l, 62) }) };
    return { hero: t.base.hero, accent };
  }

  /* Resolves a design plus its customisation into concrete colours. Everything
     downstream - the card, the thumbnails, the printable card and the logo
     variant - reads from here, so they cannot disagree. */
  function resolved(t = design(), c = custom(t.id)) {
    const preset = c.preset && c.preset !== "original" ? presetPalette(t, c.preset) : null;
    const heroSet = Boolean(c.bg || preset);
    const hero = c.bg || (preset ? preset.hero : t.base.hero);
    const accent = c.accent || (preset ? preset.accent : t.base.accent);
    const paper = t.base.body;
    const heroFg = readableOn(hero);
    const adjusted = [];

    const clamp = (value, ground, key) => {
      if (!value) return "";
      const safe = ensureContrast(value, ground);
      if (safe.toLowerCase() !== value.toLowerCase()) adjusted.push(key);
      return safe;
    };

    return {
      hero, accent, paper, heroFg, heroSet,
      accentSet: Boolean(c.accent || preset),
      light: relLuminance(hero) > 0.45,
      /* Ornament accent has to stay visible on the hero it decorates. */
      heroAccent: ensureContrast(accent, hero, 3),
      /* --em-ink is accent used as text on the paper, so it takes the full 4.5. */
      ink: ensureContrast(accent, paper, 4.5),
      headlineColor: clamp(c.headlineColor, hero, "Headline"),
      signoffColor: clamp(c.signoffColor, hero, "Sign-off"),
      messageColor: clamp(c.messageColor, t.messageHero ? hero : paper, "Message"),
      adjusted
    };
  }

  /* Only overridden roles are emitted, so an untouched design renders exactly
     the stylesheet's transcribed palette. */
  function cardVars(t = design(), c = custom(t.id), r = resolved(t, c)) {
    const v = [];
    if (r.heroSet) {
      v.push(`--em-hero-bg:${r.hero}`);
      v.push(`--em-hero-fg:${r.heroFg}`);
      v.push(`--em-hero-muted:${fade(r.heroFg, 0.74)}`);
      v.push(`--em-hero-faint:${fade(r.heroFg, 0.55)}`);
      v.push(`--em-hero-eyebrow:${ensureContrast(r.accent, r.hero, 4.5)}`);
    }
    if (r.accentSet) {
      v.push(`--em-accent:${r.heroAccent}`);
      v.push(`--em-ink:${r.ink}`);
    }
    if (c.edge === "accent") v.push(`--em-edge:${r.accentSet ? r.heroAccent : t.base.accent}`);
    if (r.headlineColor) v.push(`--emc-headline-color:${r.headlineColor}`);
    if (r.messageColor) v.push(`--emc-message-color:${r.messageColor}`);
    if (r.signoffColor) v.push(`--emc-signoff-color:${r.signoffColor}`);

    REGIONS.forEach(({ id }) => {
      const font = c[`${id}Font`];
      if (font && FONTS[font]) v.push(`--emc-${id}-font:${FONTS[font].stack}`);
      const scale = c[`${id}Scale`];
      if (scale && scale !== "1") v.push(`--emc-${id}-scale:${scale}`);
      const weight = c[`${id}Weight`];
      if (weight) v.push(`--emc-${id}-weight:${weight}`);
      const align = c[`${id}Align`];
      if (align) v.push(`--emc-${id}-align:${align}`);
    });
    /* A centred headline must centre in the card, not inside its 22ch measure. */
    if (c.headlineAlign === "center") v.push("--emc-headline-measure:none");
    if (c.messageLeading) v.push(`--emc-message-leading:${c.messageLeading}`);
    return v.join(";");
  }

  /* ------------------------------------------------------- gift codes ---- */

  function checkChar(payload) {
    let sum = 0;
    for (let i = 0; i < payload.length; i += 1) sum += (CODE_ALPHABET.indexOf(payload[i]) + 1) * (i + 1);
    return CODE_ALPHABET[sum % CODE_ALPHABET.length];
  }

  function formatCode(payload) { return `MU-${payload.slice(0, 4)}-${payload.slice(4, 8)}`; }

  /* SIMULATED issuance. crypto.getRandomValues is a real CSPRNG, but the code is
     minted, stored and validated entirely in this browser - there is no server
     issuing it and nothing stops anyone reading or editing the store. */
  function generateCode() {
    const ledger = readLedger();
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const bytes = new Uint32Array(7);
      (window.crypto || window.msCrypto).getRandomValues(bytes);
      const seven = Array.from(bytes, (n) => CODE_ALPHABET[n % CODE_ALPHABET.length]).join("");
      const code = formatCode(seven + checkChar(seven));
      if (!ledger[code]) return code;
    }
    return formatCode(Array.from({ length: 8 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join(""));
  }

  function normaliseCode(raw) {
    const cleaned = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^MU/, "");
    return cleaned.slice(0, 8);
  }

  function displayCode(raw) {
    const p = normaliseCode(raw);
    if (!p) return "";
    return p.length <= 4 ? `MU-${p}` : `MU-${p.slice(0, 4)}-${p.slice(4)}`;
  }

  /* Shape and check character are verified before the store is touched, so a
     mistyped code never becomes a lookup - and a wrong code and an unknown code
     are answered identically. */
  function codeWellFormed(raw) {
    const p = normaliseCode(raw);
    if (p.length !== 8) return false;
    if ([...p].some((ch) => !CODE_ALPHABET.includes(ch))) return false;
    return checkChar(p.slice(0, 7)) === p[7];
  }

  function readLedger() {
    try { return JSON.parse(localStorage.getItem(LEDGER_KEY) || "{}"); }
    catch (_error) { return {}; }
  }

  function writeLedger(ledger) {
    try { localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger)); }
    catch (_error) { /* Storage unavailable - the claim journey cannot be demonstrated. */ }
  }

  function issueCode(order) {
    const code = generateCode();
    const ledger = readLedger();
    /* Nothing identifying is recorded against a code: the claim page must not be
       able to tell anyone who bought it or who claimed it. */
    ledger[code] = {
      status: "unclaimed",
      credits: order.credits,
      giftName: order.giftName,
      range: order.range,
      validityLabel: order.validityLabel,
      issuedAt: new Date().toISOString(),
      claimedAt: null
    };
    writeLedger(ledger);
    return code;
  }

  function readBalance(account) {
    try { return JSON.parse(localStorage.getItem(BALANCE_KEY) || "{}")[account.toLowerCase()] || 0; }
    catch (_error) { return 0; }
  }

  function addBalance(account, credits) {
    let all = {};
    try { all = JSON.parse(localStorage.getItem(BALANCE_KEY) || "{}"); } catch (_error) { all = {}; }
    const key = account.toLowerCase();
    all[key] = (all[key] || 0) + credits;
    try { localStorage.setItem(BALANCE_KEY, JSON.stringify(all)); } catch (_error) { /* ignore */ }
    return all[key];
  }

  /* ------------------------------------------- account entitlements ------ */

  /* What the account holds, itemised, so the credits page can say what each
     block of credits was and how long it lasts. Deliberately carries no code:
     linking an account to a code is exactly what the ledger refuses to do. */
  function readWallet(account) {
    try { return JSON.parse(localStorage.getItem(WALLET_KEY) || "{}")[String(account).toLowerCase()] || []; }
    catch (_error) { return []; }
  }

  function addEntitlement(account, entry) {
    let all = {};
    try { all = JSON.parse(localStorage.getItem(WALLET_KEY) || "{}"); } catch (_error) { all = {}; }
    const key = String(account).toLowerCase();
    all[key] = [entry, ...(all[key] || [])];
    try { localStorage.setItem(WALLET_KEY, JSON.stringify(all)); } catch (_error) { /* ignore */ }
    return all[key];
  }

  /* ------------------------------------------------ validity arithmetic -- */

  /* The catalogue states validity as "2 months" / "4 months" / "6 months", and
     this build's established rule is that the clock starts the day the gift is
     claimed. Both facts already exist, so the end date is arithmetic on them
     rather than a new commercial term. An unparseable label yields no date and
     the label is shown alone. */
  function validityMonths(label) {
    const found = /(\d+)\s*month/i.exec(String(label || ""));
    return found ? Number(found[1]) : 0;
  }

  function addMonths(from, months) {
    const d = new Date(from.getTime());
    const day = d.getDate();
    /* Set to the 1st before shifting: 31 January + 1 month must not roll into
       March. The day is then clamped to the target month's length. */
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
    return d;
  }

  function validityEnd(fromISO, label) {
    const months = validityMonths(label);
    if (!months) return null;
    const from = new Date(fromISO);
    return Number.isNaN(from.getTime()) ? null : addMonths(from, months);
  }

  /* --------------------------------------------- prototype claim codes --- */

  function prototypeCode(payload) { return formatCode(payload + checkChar(payload)); }

  /* SIMULATED. Writes the fixture codes into the same store real issuance
     uses, so the claim page has one lookup path rather than a test branch.

     A fixture is only written when it is absent, so a code claimed in an
     earlier session stays claimed across reloads - which is the single-use
     rule, not a bug. `force` is the developer reset behind the details block
     on the claim page; it touches nothing but the fixtures. */
  function seedPrototypeCodes({ force = false } = {}) {
    const ledger = readLedger();
    let changed = false;

    PROTOTYPE_CODES.forEach((fixture) => {
      const code = prototypeCode(fixture.payload);
      if (ledger[code] && !force) return;
      const g = GIFTS[fixture.giftId];
      if (!g) return;

      const issued = new Date();
      issued.setDate(issued.getDate() - 40);
      const expired = fixture.seed === "expired";
      const expiresAt = expired
        ? new Date(Date.now() - (fixture.expiresDaysAgo || 1) * 86400000).toISOString()
        : null;

      ledger[code] = {
        status: fixture.seed === "claimed" ? "claimed" : "unclaimed",
        credits: g.credits,
        giftName: g.name,
        range: conversationLabel(g),
        validityLabel: g.validityLabel,
        issuedAt: issued.toISOString(),
        claimedAt: fixture.seed === "claimed" ? new Date(Date.now() - 9 * 86400000).toISOString() : null,
        expiresAt,
        /* Marks a fixture so the developer reset can never disturb a code that
           came out of a real run through the purchase flow. */
        prototype: true
      };
      changed = true;
    });

    if (changed) writeLedger(ledger);
  }

  /* Surrounding whitespace, lower case, missing or extra dashes and a typed or
     omitted MU prefix all reduce to the same payload. Unlike the shared
     `normaliseCode` this does not truncate, so an over-long entry stays
     over-long and is answered as invalid rather than quietly passing. */
  function claimPayload(raw) {
    return String(raw || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^MU/, "");
  }

  /* Issued codes carry no `expiresAt`, so this is false for every gift that
     came out of the purchase flow - the build's "no expiry" rule is intact. */
  function codeExpired(record) {
    if (!record || !record.expiresAt) return false;
    const at = new Date(record.expiresAt);
    return !Number.isNaN(at.getTime()) && at.getTime() < Date.now();
  }

  /* ============================================================
     The claim seam.

     Every simulated part of redemption is behind this one function. It takes
     what the user typed and returns an outcome plus, on success, the facts
     the success screen needs. The UI switches on `outcome` and reads nothing
     from storage itself, so replacing this body with a server call - and
     nothing else - moves the flow onto a real backend.

     outcome: "empty" | "invalid" | "already-claimed" | "expired" | "redeemed"
     ============================================================ */
  function resolveClaim(rawInput, account) {
    const typed = String(rawInput || "").trim();
    const cleaned = claimPayload(typed);

    if (!cleaned) return { outcome: "empty" };

    /* Shape and check character before the store is consulted, so a mistyped
       code never becomes a lookup - and an unknown code is answered exactly as
       a malformed one, so the page cannot be used to discover which codes
       exist. The length test is this surface's own: the shared normaliser
       truncates, which would let trailing junk pass as a valid code. */
    if (cleaned.length !== 8 || !codeWellFormed(typed)) return { outcome: "invalid" };

    const code = displayCode(typed);
    const ledger = readLedger();
    const record = ledger[code];
    if (!record) return { outcome: "invalid" };
    if (record.status === "claimed") return { outcome: "already-claimed" };
    if (codeExpired(record)) return { outcome: "expired", expiredOn: record.expiresAt };

    /* Claimed here, on the record just read, then written back in the same
       breath: a code claimed in another tab between a look and a submit is
       caught rather than double-spent. */
    const claimedAt = new Date().toISOString();
    record.status = "claimed";
    record.claimedAt = claimedAt;
    writeLedger(ledger);

    const gift = {
      credits: record.credits,
      giftName: record.giftName,
      range: record.range,
      validityLabel: record.validityLabel,
      claimedAt
    };
    addBalance(account, record.credits);
    addEntitlement(account, gift);

    return { outcome: "redeemed", gift, balance: readBalance(account) };
  }

  /* --------------------------------------------------------- form parts -- */

  function field({ id, label, value, type = "text", autocomplete = "off", inputmode = "text",
                   maxlength = 254, placeholder = "", help = "", errorKey = "" }) {
    const key = errorKey || id;
    const error = state.errors[key] || "";
    const described = [help ? `${id}-help` : "", `${id}-error`].filter(Boolean).join(" ");
    return `
      <div class="field">
        <label class="field__label" for="${id}">${e(label)}</label>
        <input id="${id}" name="${id}" data-field="${id}" type="${type}" inputmode="${inputmode}"
               autocomplete="${autocomplete}" maxlength="${maxlength}" value="${e(value)}"
               placeholder="${e(placeholder)}" aria-invalid="${error ? "true" : "false"}"
               aria-describedby="${described}">
        ${help ? `<span class="field__help" id="${id}-help">${e(help)}</span>` : ""}
        <span class="field__error" id="${id}-error" role="alert">${e(error)}</span>
      </div>`;
  }

  /* The country carries the calling code, so the purchaser types the number the
     way they would say it. The select sits transparently over the readout: the
     closed control shows the dial code rather than a long country name, and the
     native picker - including the mobile wheel - is still the real control. */
  function phoneField(f) {
    const error = state.errors.recipientPhone || "";
    return `
      <div class="field">
        <label class="field__label" for="recipientPhone">Their WhatsApp number
          <span class="field__optional">optional</span></label>
        <div class="phone-input" data-invalid="${error ? "true" : "false"}">
          <span class="phone-input__country">
            <select id="recipientCountry" data-field="recipientCountry" aria-label="Country calling code">
              ${COUNTRY_CODES.map(([name, dial]) =>
                `<option value="${e(name)}" ${name === f.recipientCountry ? "selected" : ""}>${e(name)} +${e(dial)}</option>`).join("")}
            </select>
            <span class="phone-input__dial" aria-hidden="true">+${e(dialOf(f.recipientCountry))}</span>
            <span class="phone-input__caret" aria-hidden="true"></span>
          </span>
          <input id="recipientPhone" name="recipientPhone" data-field="recipientPhone" type="tel" inputmode="tel"
                 autocomplete="tel-national" maxlength="18" value="${e(f.recipientPhone)}"
                 placeholder="98765 43210" aria-invalid="${error ? "true" : "false"}"
                 aria-describedby="recipientPhone-help recipientPhone-error">
        </div>
        <span class="field__help" id="recipientPhone-help">Once you've paid, WhatsApp opens with the gift and
          claim code written for you - add a number and it's addressed too.</span>
        <span class="field__error" id="recipientPhone-error" role="alert">${e(error)}</span>
      </div>`;
  }

  /* A row of mutually exclusive values rendered as one compact control. Used
     throughout the editor so a whole choice costs one line, not one card each. */
  function segmented({ name, label, value, options, action, extra = "", disabled = false }) {
    return `
      <div class="control">
        <span class="control__label" id="${name}-label">${e(label)}</span>
        <div class="segmented" role="radiogroup" aria-labelledby="${name}-label" ${disabled ? 'aria-disabled="true"' : ""}>
          ${options.map(([val, text]) => `
            <button class="segmented__item" type="button" role="radio" aria-checked="${String(val) === String(value)}"
                    data-action="${action}" data-key="${e(name)}" data-value="${e(val)}" ${disabled ? "disabled" : ""}>
              ${e(text)}
            </button>`).join("")}
        </div>
        ${extra}
      </div>`;
  }

  /* ------------------------------------------------------------ landing -- */

  /* The marketing site is out of scope. This route stands in for it so the nav has
     somewhere to sit and the prototype has an obvious starting point.

     Two ways in, because there are two journeys: the purchaser configures a gift
     on the public site, and the recipient claims one inside the signed-in
     platform. Sign-up is out of scope, so "Signup" stands in for it. */
  function renderLanding() {
    return `
      <section class="stand-in">
        <h1 class="stand-in__note" tabindex="-1">
          <span>Consider this as a Landing page.</span>
          <span>To send a gift, click <em>“${e(GIFT_CTA)}”</em>.</span>
          <span>To claim one, click <em>“${e(SIGNUP_CTA)}”</em>,</span>
          <span>which takes you inside the platform.</span>
        </h1>
      </section>`;
  }

  /* ====================================================== comic strip ====
     A six-panel Rakhi story above the gifting form. It is an aside, not a
     banner: it renders inside the page's own container, so its edges are the
     form's edges, and it is sized so the form is still the thing you came for.

     The panels are illustrations, not captioned boxes. Each scene is one
     full-bleed drawing with speech bubbles sitting over it; nothing announces
     "Scene 3" and nobody is labelled SISTER above their line. Who is speaking
     is carried by which character the bubble's tail points at, and by the two
     bubble colours - with the name repeated for screen readers only.

     Bubbles are HTML positioned over the art rather than text inside the SVG,
     because text set in an SVG cannot reflow: a longer line would clip or
     shrink. As HTML it wraps, and the bubble grows with it.

     Continuity is what makes six drawings one moment: the same two people in
     the same clothes, the same hallway, the suitcase that arrives in panel one
     and is still on the floor in panel two, the rakhi that is tied in panel
     three and stays on his wrist for the rest of the strip, and the card that
     is hidden behind her back in four before it is revealed in five. */

  /* One warm domestic palette for the whole strip, so the eye reads it as a
     single afternoon. The only cool, saturated thing in six panels is the
     MentorUnion card - which is exactly why it lands when it appears. */
  const CK = {
    wall: "#F3E2C7", wallDeep: "#E7CDA6", floor: "#C98A5C", floorDark: "#A96B44",
    ink: "#42211F", line: "#6B392F",
    door: "#8A4A33", doorDark: "#6E3826",
    marigold: "#E8A22B", gold: "#F4CE72", maroon: "#8E3130",
    skin: "#E9BB8E", skinShade: "#D19A69",
    hair: "#2E1B18",
    sister: "#D9762F", sisterDeep: "#B85F22",
    brother: "#43506B", brotherDeep: "#33405A",
    reveal: "#39B6D8", revealDeep: "#1F8CAB", card: "#FBF4E6"
  };

  /* --- faces -------------------------------------------------------------
     Six expressions, drawn on the same head so the two characters stay the
     same people throughout. Eyes are dots and brows are short strokes: at this
     size that reads more clearly than anatomy, and it keeps the drawing calm
     enough to sit next to a product form. */
  function ckFace(expr) {
    const eye = (x, r = 2) => `<circle cx="${x}" cy="-2" r="${r}" fill="${CK.ink}"/>`;
    const F = {
      calling: `${eye(-6)}${eye(6)}
        <path d="M-9.5 -7.5q3.5 -2 6.5 -1M3 -8.5q3 -1 6.5 1" stroke="${CK.ink}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <path d="M-5 5.5q5 4.5 10 0" stroke="${CK.ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
      grin: `${eye(-6)}${eye(6)}
        <path d="M-10 -8q3.5 -2.5 7 -1M3 -9q3.5 -1.5 7 1" stroke="${CK.ink}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <path d="M-7 4q7 8 14 0Z" fill="${CK.ink}"/>`,
      tease: `${eye(-6)}${eye(6)}
        <path d="M-10 -9.5q3.5 -1 7 0.5M3 -7.5q3.5 -1.5 7 0" stroke="${CK.ink}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <path d="M-5 5.5q5 3.5 10 -1.5" stroke="${CK.ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
      warm: `
        <path d="M-9 -2.5q3 -3 6 0M3 -2.5q3 -3 6 0" stroke="${CK.ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M-5 5q5 4.5 10 0" stroke="${CK.ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
      surprise: `${eye(-6, 2.6)}${eye(6, 2.6)}
        <path d="M-10 -9.5q3.5 -3 7 -1M3 -10.5q3.5 -2 7 1" stroke="${CK.ink}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <ellipse cx="0" cy="6.5" rx="3.4" ry="4.2" fill="${CK.ink}"/>`,
      beam: `
        <path d="M-9.5 -1q3 -4 6.5 0M3 -1q3.5 -4 6.5 0" stroke="${CK.ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M-8 3.5q8 9 16 0Z" fill="${CK.ink}"/>
        <path d="M-11 2.5q2.5 2 4.5 0M6.5 2.5q2.5 2 4.5 0" stroke="${CK.sisterDeep}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".45"/>`
    };
    return F[expr] || F.warm;
  }

  /* Long hair, saffron kurta. `arm` swaps the gesture without redrawing her. */
  function ckSister({ x, y = 0, expr = "warm", arm = "down", flip = false, scale = 1 }) {
    const arms = {
      down: `<path d="M-19 -46c-5 8-6 18-5 27M19 -46c5 8 6 18 5 27" stroke="${CK.sister}" stroke-width="9" fill="none" stroke-linecap="round"/>`,
      wave: `<path d="M-19 -46c-5 8-6 18-5 27" stroke="${CK.sister}" stroke-width="9" fill="none" stroke-linecap="round"/>
             <path d="M19 -47c9-4 15-13 15-23" stroke="${CK.sister}" stroke-width="9" fill="none" stroke-linecap="round"/>
             <circle cx="34" cy="-71" r="5.5" fill="${CK.skin}"/>`,
      offer: `<path d="M-19 -46c-5 8-6 18-5 27" stroke="${CK.sister}" stroke-width="9" fill="none" stroke-linecap="round"/>
              <path d="M19 -46c10 1 18 4 25 8" stroke="${CK.sister}" stroke-width="9" fill="none" stroke-linecap="round"/>
              <circle cx="46" cy="-37" r="5.5" fill="${CK.skin}"/>`,
      tying: `<path d="M-19 -46c-4 9 2 17 10 21" stroke="${CK.sister}" stroke-width="9" fill="none" stroke-linecap="round"/>
              <path d="M19 -46c2 10-3 17-9 21" stroke="${CK.sister}" stroke-width="9" fill="none" stroke-linecap="round"/>`,
      /* One hand out for the box, the other tucked behind her - the card is
         already there, three panels before anyone sees it. */
      hiding: `<path d="M19 -46c10 2 17 6 22 11" stroke="${CK.sister}" stroke-width="9" fill="none" stroke-linecap="round"/>
               <circle cx="43" cy="-33" r="5.5" fill="${CK.skin}"/>
               <path d="M-19 -46c-9 5-13 13-11 21" stroke="${CK.sisterDeep}" stroke-width="9" fill="none" stroke-linecap="round"/>`
    };
    return `
      <g transform="translate(${x} ${y})${flip ? " scale(-1 1)" : ""}${scale !== 1 ? ` scale(${scale})` : ""}">
        <ellipse cx="0" cy="2" rx="26" ry="5" fill="${CK.ink}" opacity=".13"/>
        <path d="M-20 0c0-30 3-48 5-56h30c2 8 5 26 5 56Z" fill="${CK.sister}"/>
        <path d="M-15 -56h30c1 5 2 12 3 20h-36c1-8 2-15 3-20Z" fill="${CK.sisterDeep}" opacity=".55"/>
        ${arms[arm] || arms.down}
        <path d="M-8 -60c0-6 16-6 16 0Z" fill="${CK.skin}"/>
        <g transform="translate(0 -78)">
          <path d="M-19 6c-2-16 5-26 19-26s21 10 19 26c-1 9-4 13-5 20h-6c1-9 2-12 2-19h-20c0 7 1 10 2 19h-6c-1-7-4-11-5-20Z" fill="${CK.hair}"/>
          <circle cx="0" cy="0" r="16" fill="${CK.skin}"/>
          <path d="M-16 -3c-1-13 6-19 16-19s17 6 16 19c-3-7-9-10-16-10s-13 3-16 10Z" fill="${CK.hair}"/>
          ${ckFace(expr)}
          <circle cx="-16.5" cy="4" r="2.6" fill="${CK.gold}"/>
          <circle cx="16.5" cy="4" r="2.6" fill="${CK.gold}"/>
        </g>
      </g>`;
  }

  /* Short hair, slate kurta. Muted on purpose: nothing he wears should compete
     with the card when it arrives. */
  function ckBrother({ x, y = 0, expr = "warm", arm = "down", flip = false, scale = 1, rakhi = false }) {
    const arms = {
      down: `<path d="M-18 -45c-5 8-6 17-5 26M18 -45c5 8 6 17 5 26" stroke="${CK.brother}" stroke-width="9" fill="none" stroke-linecap="round"/>`,
      open: `<path d="M-18 -46c-10-2-17-8-20-16M18 -46c10-2 17-8 20-16" stroke="${CK.brother}" stroke-width="9" fill="none" stroke-linecap="round"/>
             <circle cx="-40" cy="-64" r="5.5" fill="${CK.skin}"/><circle cx="40" cy="-64" r="5.5" fill="${CK.skin}"/>`,
      /* Wrist forward, so the rakhi has somewhere to be tied. */
      wrist: `<path d="M-18 -45c-5 8-6 17-5 26" stroke="${CK.brother}" stroke-width="9" fill="none" stroke-linecap="round"/>
              <path d="M18 -46c-9 4-16 7-24 8" stroke="${CK.brother}" stroke-width="9" fill="none" stroke-linecap="round"/>
              <circle cx="-27" cy="-38" r="5.5" fill="${CK.skin}"/>`,
      giving: `<path d="M18 -45c5 8 6 17 5 26" stroke="${CK.brother}" stroke-width="9" fill="none" stroke-linecap="round"/>
               <path d="M-18 -46c-10 2-17 6-22 11" stroke="${CK.brother}" stroke-width="9" fill="none" stroke-linecap="round"/>
               <circle cx="-42" cy="-33" r="5.5" fill="${CK.skin}"/>`,
      /* Hands up, palms out: the universal "wait, what?" */
      startled: `<path d="M-18 -46c-11 1-18-4-21-12M18 -46c11 1 18-4 21-12" stroke="${CK.brother}" stroke-width="9" fill="none" stroke-linecap="round"/>
                 <circle cx="-41" cy="-60" r="6" fill="${CK.skin}"/><circle cx="41" cy="-60" r="6" fill="${CK.skin}"/>`
    };
    /* Whichever hand the pose puts forward is where the rakhi has to be, or it
       ends up floating on his hip. */
    const wristAt = { wrist: "-25 -39", giving: "-40 -34", startled: "39 -57", open: "38 -61", down: "22 -22" };
    const band = rakhi
      ? `<g transform="translate(${wristAt[arm] || wristAt.down})">
           <path d="M-5.5 0q5.5 -4 11 0" stroke="${CK.maroon}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
           <circle r="3.2" fill="${CK.maroon}"/><circle r="1.5" fill="${CK.gold}"/>
         </g>` : "";
    return `
      <g transform="translate(${x} ${y})${flip ? " scale(-1 1)" : ""}${scale !== 1 ? ` scale(${scale})` : ""}">
        <ellipse cx="0" cy="2" rx="25" ry="5" fill="${CK.ink}" opacity=".13"/>
        <path d="M-19 0c0-28 2-46 4-54h30c2 8 4 26 4 54Z" fill="${CK.brother}"/>
        <path d="M-15 -54h30c1 5 2 11 3 18h-36c1-7 2-13 3-18Z" fill="${CK.brotherDeep}" opacity=".6"/>
        ${arms[arm] || arms.down}
        ${band}
        <path d="M-8 -58c0-6 16-6 16 0Z" fill="${CK.skin}"/>
        <g transform="translate(0 -76)">
          <circle cx="0" cy="0" r="16" fill="${CK.skin}"/>
          <path d="M-16 -2c-1-14 6-20 16-20s17 6 16 20c-2-8-6-11-10-9-5 2-13 2-16-1-2-2-4 3-6 10Z" fill="${CK.hair}"/>
          ${ckFace(expr)}
        </g>
      </g>`;
  }

  /* --- props, carried scene to scene ------------------------------------ */
  const ckSuitcase = (x, y, s = 1) => `
    <g transform="translate(${x} ${y}) scale(${s})">
      <rect x="-21" y="-27" width="42" height="27" rx="4" fill="${CK.maroon}"/>
      <rect x="-21" y="-18" width="42" height="4" fill="${CK.gold}" opacity=".85"/>
      <path d="M-7 -27v-5a7 7 0 0 1 14 0v5" fill="none" stroke="${CK.ink}" stroke-width="2.6"/>
      <circle cx="-12" cy="-8" r="3.4" fill="${CK.gold}" opacity=".8"/>
      <rect x="4" y="-12" width="11" height="7" rx="1.5" fill="${CK.wall}" opacity=".55"/>
    </g>`;

  const ckGift = (x, y, s = 1, rot = 0) => `
    <g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
      <rect x="-15" y="-13" width="30" height="26" rx="3" fill="${CK.maroon}"/>
      <rect x="-15" y="-3" width="30" height="5" fill="${CK.gold}"/>
      <rect x="-2.5" y="-13" width="5" height="26" fill="${CK.gold}"/>
      <path d="M-2 -13c-6-7-13-4-11 1M2 -13c6-7 13-4 11 1" fill="none" stroke="${CK.gold}" stroke-width="3" stroke-linecap="round"/>
    </g>`;

  /* The hero object. `glow` is only switched on for the reveal. */
  const ckCard = (x, y, s = 1, rot = -6, glow = false) => `
    <g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
      ${glow ? `<circle r="62" fill="${CK.reveal}" opacity=".16"/><circle r="42" fill="${CK.reveal}" opacity=".18"/>` : ""}
      <rect x="-31" y="-20" width="62" height="40" rx="4" fill="${CK.card}" stroke="${CK.revealDeep}" stroke-width="1.6"/>
      <rect x="-31" y="-20" width="62" height="9" rx="4" fill="${CK.reveal}"/>
      <rect x="-31" y="-15" width="62" height="4" fill="${CK.reveal}"/>
      <circle cx="-19" cy="4" r="6.5" fill="none" stroke="${CK.revealDeep}" stroke-width="2"/>
      <path d="M-22 4l2.4 2.6 4.4-5" fill="none" stroke="${CK.revealDeep}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="-7" y="0" width="30" height="3" rx="1.5" fill="${CK.line}" opacity=".45"/>
      <rect x="-7" y="7" width="19" height="3" rx="1.5" fill="${CK.line}" opacity=".28"/>
    </g>`;

  /* The room. One hallway, lit the same way in every panel. */
  const ckRoom = ({ toran = true } = {}) => `
    <rect width="480" height="160" fill="${CK.wall}"/>
    <path d="M0 132h480v28H0Z" fill="${CK.floor}"/>
    <path d="M0 132h480v4H0Z" fill="${CK.floorDark}" opacity=".5"/>
    <circle cx="404" cy="20" r="72" fill="${CK.gold}" opacity=".22"/>
    <circle cx="404" cy="20" r="44" fill="${CK.gold}" opacity=".18"/>
    ${toran ? `
      <g opacity=".95">
        <path d="M0 8q120 22 240 22t240-22" fill="none" stroke="${CK.maroon}" stroke-width="2.4"/>
        ${Array.from({ length: 13 }, (_, i) => {
          const t = i / 12;
          const cx = t * 480;
          const cy = 8 + Math.sin(Math.PI * t) * 22;
          return `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${i % 2 ? 4.5 : 6}" fill="${i % 2 ? CK.gold : CK.marigold}"/>`;
        }).join("")}
      </g>` : ""}`;

  const ckDoor = (open) => open
    ? `<g>
         <rect x="40" y="34" width="92" height="98" rx="3" fill="${CK.doorDark}" opacity=".35"/>
         <path d="M132 34l46-13v124l-46-13Z" fill="${CK.door}"/>
         <path d="M132 34l46-13v124l-46-13Z" fill="${CK.ink}" opacity=".12"/>
         <circle cx="141" cy="86" r="3.2" fill="${CK.gold}"/>
       </g>`
    : `<g>
         <rect x="40" y="34" width="92" height="98" rx="3" fill="${CK.door}"/>
         <rect x="50" y="44" width="72" height="36" rx="2" fill="${CK.doorDark}" opacity=".55"/>
         <rect x="50" y="88" width="72" height="34" rx="2" fill="${CK.doorDark}" opacity=".55"/>
         <circle cx="122" cy="86" r="3.4" fill="${CK.gold}"/>
       </g>`;

  /* --- the six panels ----------------------------------------------------
     Bubble coordinates are percentages of the drawing, so they travel with it
     when it scales. `tail` names the corner the tail leaves from, which is how
     the bubble points at whoever is speaking. */
  const COMIC_SCENES = [
    {
      id: 1,
      bg: CK.wall,
      alt: "A decorated front door, closed. Outside it a young woman stands with her suitcase, one hand raised from the doorbell, calling out.",
      art: `
        ${ckRoom()}
        ${ckDoor(false)}
        <g transform="translate(150 86)">
          <circle r="9" fill="${CK.wallDeep}" stroke="${CK.line}" stroke-width="2"/>
          <circle r="3.6" fill="${CK.marigold}"/>
          <g fill="none" stroke="${CK.marigold}" stroke-width="2.6" stroke-linecap="round" opacity=".85">
            <path d="M15 -12q7 12 0 24"/><path d="M25 -20q13 20 0 40"/>
          </g>
        </g>
        <text x="186" y="66" transform="rotate(-7 186 66)" font-family="'Montserrat',sans-serif"
              font-size="17" font-weight="800" fill="${CK.maroon}" letter-spacing="0.5">TING TONG!</text>
        ${ckSuitcase(292, 132)}
        ${ckSister({ x: 368, y: 132, expr: "calling", arm: "wave" })}`,
      bubbles: [
        { who: "Sister", text: "Guess who made it home for Rakhi?", x: 47, y: 20, w: 194, tail: "br" }
      ]
    },
    {
      id: 2,
      bg: CK.wall,
      alt: "The door is flung open. Her brother bursts out with his arms wide, grinning. Her suitcase is still on the floor between them.",
      art: `
        ${ckRoom()}
        ${ckDoor(true)}
        <g fill="none" stroke="${CK.line}" stroke-width="3" stroke-linecap="round" opacity=".5">
          <path d="M192 56q13 5 24 0"/><path d="M188 78q15 6 28 0"/><path d="M192 100q13 5 24 0"/>
        </g>
        ${ckBrother({ x: 250, y: 132, expr: "grin", arm: "open" })}
        ${ckSuitcase(330, 132, 0.8)}
        ${ckSister({ x: 402, y: 132, expr: "warm", arm: "down", flip: true })}`,
      bubbles: [
        { who: "Brother", text: "Finally!", x: 40, y: 20, w: 130, tail: "bl" }
      ]
    },
    {
      id: 3,
      /* A close-up, cropped at the shoulders. Changing the crop here is what
         stops six two-shots in a row from reading as one flat scene. */
      bg: CK.wallDeep,
      alt: "Close on their hands. She is tying a red and gold rakhi around his wrist, and both of them are smiling.",
      /* A real close-up, not the two-shot shrunk down. Drawing the forearms
         directly - rather than reusing the standing figures and hoping their
         arms meet - is the only way the hands actually hold the thread. The
         heads sit at the top edge, cropped by the frame, which is the comic
         device that says "we have moved in closer" without a caption. */
      art: `
        <rect width="480" height="160" fill="${CK.wallDeep}"/>
        <circle cx="240" cy="86" r="120" fill="${CK.wall}"/>
        <circle cx="240" cy="86" r="120" fill="${CK.gold}" opacity=".14"/>

        ${/* her head and shoulder, cropped by the left edge */ ""}
        <g transform="translate(96 62)">
          <path d="M-40 98c0-30 14-46 40-46s40 16 40 46Z" fill="${CK.sister}"/>
          <g transform="translate(0 -8)">
            <path d="M-25 8c-3-21 7-34 25-34s28 13 25 34c-2 12-5 17-6 26h-8c1-12 3-16 3-25h-28c0 9 2 13 3 25h-8c-1-9-4-14-6-26Z" fill="${CK.hair}"/>
            <circle r="21" fill="${CK.skin}"/>
            <path d="M-21 -4c-1-17 8-25 21-25s22 8 21 25c-4-9-12-13-21-13s-17 4-21 13Z" fill="${CK.hair}"/>
            <g transform="scale(1.3)">${ckFace("tease")}</g>
            <circle cx="-21" cy="6" r="3.4" fill="${CK.gold}"/>
          </g>
        </g>

        ${/* his head and shoulder, cropped by the right edge */ ""}
        <g transform="translate(384 62)">
          <path d="M-40 98c0-30 14-46 40-46s40 16 40 46Z" fill="${CK.brother}"/>
          <g transform="translate(0 -8)">
            <circle r="21" fill="${CK.skin}"/>
            <path d="M-21 -3c-1-18 8-26 21-26s22 8 21 26c-3-11-8-14-13-12-7 3-17 3-21-1-3-3-6 4-8 13Z" fill="${CK.hair}"/>
            <g transform="scale(1.3)">${ckFace("warm")}</g>
          </g>
        </g>

        ${/* his forearm from the right, wrist turned up in the middle */ ""}
        <path d="M366 150c-22-6-46-18-70-24" stroke="${CK.brother}" stroke-width="26" fill="none" stroke-linecap="round"/>
        <path d="M300 128c-16-4-28-4-38 0" stroke="${CK.skin}" stroke-width="23" fill="none" stroke-linecap="round"/>

        ${/* her hands coming in from the left, fingers at the knot */ ""}
        <path d="M120 152c26-6 44-16 62-24" stroke="${CK.sister}" stroke-width="24" fill="none" stroke-linecap="round"/>
        <path d="M176 130c14-6 24-8 32-8" stroke="${CK.skin}" stroke-width="21" fill="none" stroke-linecap="round"/>
        <path d="M206 120c8-1 14 1 18 4" stroke="${CK.skinShade}" stroke-width="9" fill="none" stroke-linecap="round"/>

        ${/* the rakhi itself, tied where the two hands meet */ ""}
        <g transform="translate(252 122)">
          <path d="M-26 6q26 -20 52 -2" fill="none" stroke="${CK.maroon}" stroke-width="6" stroke-linecap="round"/>
          <path d="M-26 13q26 -20 52 -2" fill="none" stroke="${CK.gold}" stroke-width="3" stroke-linecap="round" opacity=".9"/>
          <g transform="translate(0 -6)">
            ${Array.from({ length: 8 }, (_, i) => `<ellipse rx="5.5" ry="12" fill="${CK.marigold}" opacity=".9" transform="rotate(${i * 22.5})"/>`).join("")}
            <circle r="8.5" fill="${CK.maroon}"/><circle r="3.6" fill="${CK.gold}"/>
          </g>
        </g>`,
      bubbles: [
        { who: "Sister", text: "Happy Rakhi, idiot.", x: 20, y: 16, w: 168, tail: "tl" },
        { who: "Brother", text: "Happy Rakhi.", x: 61, y: 58, w: 148, tail: "tr" }
      ]
    },
    {
      id: 4,
      bg: CK.wall,
      alt: "He holds out a wrapped gift box. She reaches for it with one hand, keeping her other hand hidden behind her back.",
      art: `
        ${ckRoom()}
        ${ckBrother({ x: 170, y: 138, expr: "grin", arm: "giving", flip: true, rakhi: true })}
        ${ckGift(233, 106, 0.9, -8)}
        ${ckSister({ x: 312, y: 138, expr: "warm", arm: "hiding", flip: true })}
        <g opacity=".5" fill="none" stroke="${CK.marigold}" stroke-width="2.4" stroke-linecap="round">
          <path d="M268 74q9 -7 18 -2"/><path d="M272 62q11 -9 22 -3"/>
        </g>`,
      bubbles: [
        { who: "Brother", text: "Here's your official Rakhi tax.", x: 3, y: 14, w: 186, tail: "bl" },
        { who: "Sister", text: "Aww, thanks. But wait… I got you something too.", x: 55, y: 60, w: 200, tail: "tr" }
      ]
    },
    {
      id: 5,
      /* The reveal. Closer, quieter background, and the only cool colour in the
         whole strip lands here. */
      bg: CK.wallDeep,
      alt: "She holds out a MentorUnion gift card, which glows against the warm room. He steps back with his hands up, astonished.",
      art: `
        <rect width="480" height="160" fill="${CK.wallDeep}"/>
        <path d="M0 134h480v26H0Z" fill="${CK.floorDark}"/>
        <circle cx="240" cy="84" r="116" fill="${CK.wall}" opacity=".9"/>
        ${Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return `<circle cx="${(240 + Math.cos(a) * 104).toFixed(0)}" cy="${(84 + Math.sin(a) * 62).toFixed(0)}" r="2.4" fill="${CK.reveal}" opacity=".5"/>`;
        }).join("")}
        ${ckBrother({ x: 104, y: 140, expr: "surprise", arm: "startled", scale: 1.02, rakhi: true })}
        ${ckSister({ x: 380, y: 140, expr: "tease", arm: "offer", flip: true, scale: 1.02 })}
        ${ckCard(244, 84, 1.12, -7, true)}`,
      bubbles: [
        { who: "Brother", text: "Wait… for me? Isn't it meant to be the other way around?", x: 2, y: 8, w: 196, tail: "bl" },
        { who: "Sister", text: "You've been stressing about breaking into that top MNC for months…", x: 52, y: 58, w: 204, tail: "tr" }
      ]
    },
    {
      id: 6,
      /* The payoff is still the two of them; the career part is a small
         vignette behind, not a product explainer. */
      bg: CK.wall,
      alt: "The two of them together, still holding the card. Behind them a small office tower is lit up, with a mentor figure and a dotted path leading to it.",
      art: `
        ${ckRoom({ toran: false })}
        <g opacity=".42">
          <rect x="318" y="34" width="64" height="98" rx="3" fill="${CK.brother}"/>
          <rect x="394" y="58" width="44" height="74" rx="3" fill="${CK.brotherDeep}"/>
          ${Array.from({ length: 12 }, (_, i) =>
            `<rect x="${326 + (i % 3) * 18}" y="${44 + Math.floor(i / 3) * 20}" width="11" height="11" rx="1.5"
                   fill="${i === 4 ? CK.gold : CK.wall}" opacity="${i === 4 ? 1 : 0.5}"/>`).join("")}
          <g transform="translate(416 122) scale(0.34)">
            ${ckBrother({ x: 0, y: 0, expr: "warm", arm: "down" })}
          </g>
        </g>
        <g fill="${CK.reveal}" opacity=".6">
          ${Array.from({ length: 7 }, (_, i) =>
            `<circle cx="${228 + i * 13}" cy="${96 - Math.sin((i / 6) * Math.PI) * 34}" r="${2.8 - i * 0.14}"/>`).join("")}
        </g>
        ${ckSister({ x: 112, y: 138, expr: "beam", arm: "offer" })}
        ${ckBrother({ x: 226, y: 138, expr: "beam", arm: "down", flip: true, rakhi: true })}
        ${ckCard(170, 92, 0.78, -8)}`,
      bubbles: [
        { who: "Sister", text: "Now you can get 1:1 guidance from someone already working there, and land your dream job.", x: 3, y: 8, w: 214, tail: "bl" },
        { who: "Brother", text: "Best Rakhi ever. Thank you, Didi!", x: 56, y: 64, w: 186, tail: "tl" }
      ]
    }
  ];

  /* Rendered once with the page. Moving between panels scrolls the track
     directly rather than going through render(), so the form below never
     rebuilds and nothing the purchaser has typed is disturbed. */
  function renderComic() {
    const arrow = (dir, d) => `
      <button class="comic__arrow comic__arrow--${dir}" type="button" data-comic-step="${dir === "prev" ? -1 : 1}"
              aria-label="${dir === "prev" ? "Previous" : "Next"} moment">
        <svg width="17" height="17" viewBox="0 0 14 14" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="${d}"/>
        </svg>
      </button>`;

    return `
      <section class="comic" aria-label="A short Rakhi story, told in six panels" data-comic>
        <div class="comic__stage">
          <div class="comic__track" data-comic-track tabindex="0" role="group"
               aria-label="Rakhi story, ${COMIC_SCENES.length} panels">
            ${COMIC_SCENES.map((s, i) => `
              <article class="comic__panel" id="comic-panel-${s.id}" role="tabpanel"
                       aria-label="Panel ${i + 1} of ${COMIC_SCENES.length}">
                <div class="comic__art" style="--ck-pad:${s.bg}">
                  <svg viewBox="0 0 480 160" role="img" aria-label="${e(s.alt)}"
                       preserveAspectRatio="xMidYMax meet">${s.art}</svg>
                </div>
                <div class="comic__script">
                  ${s.bubbles.map((bub) => `
                    <p class="comic__bubble" data-who="${e(bub.who.toLowerCase())}" data-tail="${e(bub.tail)}"
                       style="--x:${bub.x}%;--y:${bub.y}%;--w:${bub.w}px">
                      <span class="sr-only">${e(bub.who)}:</span>${e(bub.text)}
                    </p>`).join("")}
                </div>
              </article>`).join("")}
          </div>

          ${arrow("prev", "M9 2.5 4 7l5 4.5")}
          ${arrow("next", "M5 2.5 10 7l-5 4.5")}
        </div>

        ${/* The progress indicator is a rakhi thread: six beads on a cord, the
              one you are on tied off in gold. */ ""}
        <div class="comic__thread">
          <span class="comic__cord" aria-hidden="true"></span>
          <div class="comic__beads" role="tablist" aria-label="Story panels">
            ${COMIC_SCENES.map((s, i) => `
              <button class="comic__bead" type="button" role="tab" data-comic-go="${i}"
                      aria-selected="${i === 0}" aria-controls="comic-panel-${s.id}"
                      aria-label="Panel ${i + 1} of ${COMIC_SCENES.length}"></button>`).join("")}
          </div>
        </div>
      </section>`;
  }

  /* ======================================================================
     Unified gifting configuration - one page, no visible step tracker
     ====================================================================== */

  function sizeCard(g) {
    const selected = state.giftId === g.id;
    return `
      <button class="size-card" type="button" data-action="choose-gift" data-gift="${g.id}" aria-pressed="${selected}">
        ${g.featured ? '<span class="size-card__flag">Popular</span>' : ""}
        <span class="size-card__top">
          <span class="size-card__name">${e(g.name)}</span>
          <span class="size-card__price numeric">${e(money(g.price))}</span>
        </span>
        <span class="size-card__meta">${e(conversationLabel(g))}<br>${e(g.description)}</span>
      </button>`;
  }

  /* The thumbnail is the real card, scaled down and cropped to its top - the
     part that carries each design's signature (edge gradient, hero ground,
     lockup colour, ornament, headline treatment). It renders that design's own
     saved customisation, so the reel shows what the purchaser has made. */
  function designOption(t) {
    const selected = state.designId === t.id;
    return `
      <button class="design-option" type="button" data-action="choose-design" data-design="${t.id}"
              aria-pressed="${selected}">
        <span class="design-thumb">
          <span class="design-thumb__scale" aria-hidden="true">${emailCard(t, THUMB_DATA, { custom: custom(t.id) })}</span>
        </span>
        <span class="design-option__name">${e(t.name)}${isCustomised(t.id) ? '<span class="design-option__dot" aria-hidden="true"></span>' : ""}</span>
        <span class="sr-only">${e(t.occasion)}${isCustomised(t.id) ? ", personalised" : ""}</span>
      </button>`;
  }

  function renderConfig() {
    /* Arriving here means editing, not paying. Clear any finished payment
       attempt so returning to checkout opens a fresh one rather than
       re-showing the previous failure. */
    if (state.payment.status !== "idle") {
      state.payment.status = "idle";
      state.payment.failure = "";
    }
    const g = gift();
    const q = quote(g);
    const f = state.form;
    const d = state.delivery;
    const scheduled = d.when === "later";
    const over = f.message.length > MESSAGE_MAX;

    return `
      <div class="container container--wide">
        ${/* Inside the page container, so the strip's left and right edges are
              the gifting form's own. It is above the heading and pushes it
              down; it does not overlay or bleed. */ ""}
        ${renderComic()}
        <header class="config-head">
          <p class="eyebrow">GIFT A CAREER</p>
          <h1 class="heading-1" tabindex="-1">Give someone a clearer next step</h1>
          <p class="lead">They choose their own mentors and book when they're ready. Nothing expires
            while the gift sits unclaimed.</p>
        </header>

        <div class="config-grid">
          <form class="config-form" id="config-form" novalidate>

            <section class="section" data-section="design" aria-labelledby="sec-design">
              <div class="section__head">
                <h2 class="section__title" id="sec-design">Choose a design</h2>
                <span class="section__aside" data-design-name>${e(design().occasion)}</span>
              </div>
              <div class="design-grid" role="group" aria-labelledby="sec-design">
                ${DESIGN_IDS.map((id) => designOption(DESIGNS[id])).join("")}
              </div>
              <p class="nudge" data-nudge>${e(design().nudge)}</p>
            </section>

            <div class="preview-pane">
              <div class="preview-pane__head">
                <span class="eyebrow">Their inbox</span>
                <button class="preview-toggle" type="button" data-action="toggle-preview"
                        aria-expanded="${state.previewOpen}" aria-controls="preview-body">
                  ${state.previewOpen ? "Hide preview" : "Show preview"}
                </button>
              </div>
              <div class="preview-body" id="preview-body" ${state.previewOpen ? "" : "hidden"}>
                <div id="preview-mount">${emailCard()}</div>
              </div>
            </div>

            <section class="section" data-section="size" aria-labelledby="sec-size">
              <div class="section__head">
                <h2 class="section__title" id="sec-size">Choose a gift</h2>
                <span class="section__aside">A conversation costs 1–3 credits</span>
              </div>
              <div class="size-row">${GIFT_IDS.map((id) => sizeCard(GIFTS[id])).join("")}</div>
            </section>

            <!-- No visible heading: "Their name"/"Their email" already say whose
                 details these are. The group keeps its accessible name. -->
            <section class="section section--bare" data-section="recipient" aria-label="Recipient details">
              <div class="field-row">
                ${field({ id: "recipientName", label: "Their name", value: f.recipientName, maxlength: NAME_MAX, placeholder: "Priya" })}
                ${field({ id: "recipientEmail", label: d.email ? "Their email" : "Their email (optional)",
                          value: f.recipientEmail, type: "email", inputmode: "email", placeholder: "name@example.com" })}
              </div>
            </section>

            <section class="section" data-section="message" aria-labelledby="sec-message">
              <div class="section__head">
                <h2 class="section__title" id="sec-message">Gift card message</h2>
                <span class="field__counter numeric" data-counter data-over="${over}">${f.message.length}/${MESSAGE_MAX}</span>
              </div>
              <div class="field">
                <label class="field__label sr-only" for="message">Gift card message</label>
                <textarea id="message" name="message" data-field="message" maxlength="${MESSAGE_MAX}"
                          placeholder="Why you thought of them…"
                          aria-invalid="${state.errors.message ? "true" : "false"}"
                          aria-describedby="message-error">${e(f.message)}</textarea>
                <span class="field__error" id="message-error" role="alert">${e(state.errors.message || "")}</span>
              </div>
              <p class="nudge">A couple of lines in your own words is what makes this theirs rather than ours.</p>
            </section>

            <section class="section section--bare" data-section="you" aria-label="Your details">
              <div class="field-row">
                ${field({ id: "purchaserName", label: "Your name", value: f.purchaserName, autocomplete: "name",
                          maxlength: NAME_MAX, placeholder: "The name they'll recognise" })}
                ${field({ id: "purchaserEmail", label: "Your email", value: f.purchaserEmail, type: "email",
                          autocomplete: "email", inputmode: "email", placeholder: "you@example.com" })}
              </div>
            </section>

            <section class="section" data-section="delivery" aria-labelledby="sec-delivery">
              <div class="section__head"><h2 class="section__title" id="sec-delivery">How would you like them to receive it?</h2></div>
              <div class="deliver-stack">
                <div class="delivery-methods" role="group" aria-labelledby="sec-delivery">
                  ${deliveryOption("toggle-email", "email", "Email", d.email)}
                  ${deliveryOption("toggle-whatsapp", "whatsapp", "WhatsApp", d.whatsapp)}
                  ${deliveryOption("toggle-printable", "pdf", "Printable card", d.printable)}
                </div>

                ${d.email ? `
                  <div class="deliver-reveal">
                    <div class="radio-row" role="radiogroup" aria-label="When the email arrives">
                      <label class="radio-card">
                        <input type="radio" name="delivery-when" value="now" data-action="set-delivery" ${scheduled ? "" : "checked"}>
                        <span>Send after payment</span>
                      </label>
                      <label class="radio-card">
                        <input type="radio" name="delivery-when" value="later" data-action="set-delivery" ${scheduled ? "checked" : ""}>
                        <span>Schedule for later</span>
                      </label>
                    </div>
                    ${scheduled ? `
                      <div class="schedule-reveal">
                        <div class="schedule-row">
                          <div class="field">
                            <label class="field__label" for="scheduleDate">Date</label>
                            <input id="scheduleDate" name="scheduleDate" data-field="scheduleDate" data-native-picker type="date"
                                   value="${e(d.date)}" min="${todayISO()}" max="${maxScheduleISO()}" required
                                   aria-invalid="${state.errors.scheduleDate ? "true" : "false"}"
                                   aria-describedby="schedule-error">
                          </div>
                          <div class="field">
                            <label class="field__label" for="scheduleTime">Time</label>
                            <input id="scheduleTime" name="scheduleTime" data-field="scheduleTime" data-native-picker type="time"
                                   value="${e(d.time)}" step="900" required
                                   aria-invalid="${state.errors.scheduleTime ? "true" : "false"}"
                                   aria-describedby="schedule-error">
                          </div>
                        </div>
                        <span class="field__error" id="schedule-error" role="alert">${e(state.errors.scheduleDate || state.errors.scheduleTime || "")}</span>
                        ${d.date && d.time && !state.errors.scheduleDate && !state.errors.scheduleTime
                          ? `<p class="schedule-confirm">Arrives ${e(scheduleSummary())}</p>` : ""}
                      </div>` : ""}
                  </div>` : ""}

                ${/* After the email block, so the scheduling radios above can only
                      read as belonging to email - the order matches the channels.
                      Scheduling is not offered here: nothing sends the message for
                      you, so a scheduled WhatsApp would be a promise the build
                      cannot keep. */ ""}
                ${d.whatsapp ? `<div class="deliver-reveal">${phoneField(f)}</div>` : ""}
              </div>
              <span class="field__error" id="delivery-error" role="alert">${e(state.errors.delivery || "")}</span>
            </section>

            <div class="summary-bar">
              <div class="summary-total">
                <div>
                  <span class="summary-total__label">${e(g.name)} · ${e(conversationLabel(g))}</span>
                  <span class="summary-total__tax">Includes GST (18%)</span>
                </div>
                <strong class="numeric" data-total>${e(money(q.total))}</strong>
              </div>
              <div class="config-actions">
                <button class="button button--accent button--pay button--block" type="submit" data-commit>${e(commitLabel())}</button>
                ${/* Marked with aria-disabled rather than the disabled attribute:
                      a disabled button swallows the click, and the control has to
                      be able to answer someone who tries it. */ ""}
                <button class="button button--ghost button--block" type="button" data-action="personalise-more"
                        ${PERSONALISE_ENABLED ? "" : 'aria-disabled="true"'}>
                  Personalise the design more
                </button>
                <p class="caption caption--fine">Gift purchases are non-refundable.</p>
              </div>
            </div>
          </form>
        </div>
      </div>`;
  }

  /* ======================================================================
     Guided design editor - controls beside a large preview
     ====================================================================== */

  function colourControl({ key, label, value, fallback, applied = "" }) {
    const shown = (value ? (applied || value) : fallback) || fallback;
    return `
      <div class="control control--colour">
        <label class="control__label" for="col-${key}">${e(label)}</label>
        <span class="colour-input">
          <input id="col-${key}" type="color" value="${e(shown)}" data-action="set-colour" data-key="${e(key)}">
          <span class="colour-input__value numeric">${e(shown.toUpperCase())}</span>
        </span>
        ${value ? `<button class="link-button" type="button" data-action="clear-colour" data-key="${e(key)}">Reset</button>` : ""}
      </div>`;
  }

  function editorTypePanel(t, c) {
    const region = REGIONS.find((r) => r.id === state.editor.region) || REGIONS[0];
    const fontId = c[`${region.id}Font`];
    const face = FONTS[fontId];
    /* Weight is only offered where the region takes it and the chosen face
       actually has more than one. Instrument Serif ships a single weight, so the
       control is replaced by a line saying why rather than pretending to work. */
    const weightAvailable = region.weight && (!face || face.weights.length > 1);

    return `
      <div class="control">
        <span class="control__label" id="region-label">Editable region</span>
        <div class="segmented segmented--wide" role="radiogroup" aria-labelledby="region-label">
          ${REGIONS.map((r) => `
            <button class="segmented__item" type="button" role="radio" aria-checked="${r.id === region.id}"
                    data-action="set-region" data-value="${r.id}">${e(r.name)}</button>`).join("")}
        </div>
      </div>

      <div class="control">
        <span class="control__label" id="font-label">Font</span>
        <div class="font-list" role="radiogroup" aria-labelledby="font-label">
          ${FONT_IDS.map((id) => `
            <button class="font-option" type="button" role="radio" aria-checked="${id === (fontId || "")}"
                    style="font-family:${FONTS[id].stack}"
                    data-action="set-custom" data-key="${region.id}Font" data-value="${id}">
              <span class="font-option__sample">Aa</span>
              <span class="font-option__name">${e(FONTS[id].name)}</span>
            </button>`).join("")}
        </div>
        ${fontId ? `<button class="link-button" type="button" data-action="set-custom" data-key="${region.id}Font" data-value="">Use the template's font</button>` : ""}
      </div>

      ${segmented({ name: `${region.id}Scale`, label: "Size", value: c[`${region.id}Scale`], options: SIZE_STEPS, action: "set-custom" })}
      ${weightAvailable
        ? segmented({ name: `${region.id}Weight`, label: "Weight",
                      value: c[`${region.id}Weight`] || (region.id === "headline" ? "700" : "400"),
                      options: WEIGHT_STEPS, action: "set-custom" })
        : region.weight
          ? `<p class="control__note">${e(face.name)} has one weight, so there is nothing to set here.</p>`
          : ""}
      ${segmented({ name: `${region.id}Align`, label: "Alignment", value: c[`${region.id}Align`] || "start", options: ALIGN_STEPS, action: "set-custom" })}
      ${region.leading ? segmented({ name: "messageLeading", label: "Line spacing", value: c.messageLeading || "1.45", options: LEADING_STEPS, action: "set-custom" }) : ""}`;
  }

  function editorColourPanel(t, c) {
    const r = resolved(t, c);
    return `
      <div class="control">
        <span class="control__label" id="preset-label">Palette</span>
        <div class="preset-row" role="radiogroup" aria-labelledby="preset-label">
          ${PRESETS.map(([id, name]) => {
            const p = presetPalette(t, id);
            return `
              <button class="preset" type="button" role="radio" aria-checked="${c.preset === id && !c.bg}"
                      data-action="set-preset" data-value="${id}">
                <span class="preset__swatch" style="background:${p.hero}"><i style="background:${p.accent}"></i></span>
                <span class="preset__name">${e(name)}</span>
              </button>`;
          }).join("")}
        </div>
      </div>

      ${/* Text swatches show the colour that was actually applied, not the raw
            pick, so the control and the card never disagree about what is set. */ ""}
      ${colourControl({ key: "bg", label: "Background", value: c.bg, fallback: r.hero })}
      ${colourControl({ key: "accent", label: "Accent", value: c.accent, fallback: r.accent })}
      ${colourControl({ key: "headlineColor", label: "Headline text", value: c.headlineColor, applied: r.headlineColor, fallback: r.heroFg })}
      ${colourControl({ key: "messageColor", label: "Message text", value: c.messageColor, applied: r.messageColor,
                        fallback: t.messageHero ? r.heroFg : "#4a4640" })}

      ${r.adjusted.length
        ? `<p class="control__note control__note--flag">${e(r.adjusted.join(" and "))} ${r.adjusted.length > 1 ? "were" : "was"} lightened to stay readable on this background.</p>`
        : `<p class="control__note">Text colours are checked against the background as you pick them and adjusted if they fall below the readable threshold.</p>`}`;
  }

  function editorDetailsPanel(t, c) {
    return `
      ${segmented({ name: "edge", label: "Top edge", value: c.edge, options: EDGE_STEPS, action: "set-custom" })}
      ${segmented({ name: "frame", label: "Frame", value: c.frame, options: FRAME_STEPS, action: "set-custom" })}
      ${segmented({ name: "density", label: "Spacing", value: c.density, options: DENSITY_STEPS, action: "set-custom" })}
      ${t.ornaments ? segmented({ name: "ornament", label: t.ornaments.label, value: c.ornament, options: t.ornaments.options, action: "set-custom" }) : ""}
      ${t.showCredits ? segmented({ name: "lead", label: "Open with the number", value: c.lead, options: [["on", "Yes"], ["off", "No"]], action: "set-custom" }) : ""}
      ${!t.ornaments ? '<p class="control__note">Signature carries no ornament of its own - the edge, frame and spacing are its adjustable parts.</p>' : ""}`;
  }

  function editorTemplatePanel() {
    return `
      <div class="control">
        <span class="control__label" id="tpl-label">Template</span>
        <div class="tpl-grid" role="radiogroup" aria-labelledby="tpl-label">
          ${DESIGN_IDS.map((id) => {
            const t = DESIGNS[id];
            return `
              <button class="tpl-option" type="button" role="radio" aria-checked="${id === state.designId}"
                      data-action="choose-design" data-design="${id}">
                <span class="design-thumb">
                  <span class="design-thumb__scale" aria-hidden="true">${emailCard(t, THUMB_DATA, { custom: custom(id) })}</span>
                </span>
                <span class="tpl-option__name">${e(t.name)}</span>
                <span class="tpl-option__meta">${e(t.occasion)}</span>
              </button>`;
          }).join("")}
        </div>
      </div>
      <p class="control__note">Switching templates keeps everything you have entered. Each template
        remembers its own colours and type, so you can compare them.</p>`;
  }

  function renderEditor() {
    /* Held shut at the route as well as the control, so a typed or bookmarked
       #/personalise gets the same answer as the button. */
    if (!PERSONALISE_ENABLED) { toast(PERSONALISE_OFF); announce(PERSONALISE_OFF); return redirect("gift"); }
    if (!state.form.recipientName) return redirect("gift");
    const t = design();
    const c = custom();
    const group = state.editor.group;
    const q = quote();

    const panel = group === "template" ? editorTemplatePanel()
      : group === "colour" ? editorColourPanel(t, c)
      : group === "details" ? editorDetailsPanel(t, c)
      : editorTypePanel(t, c);

    return `
      <div class="container container--wide editor">
        <header class="editor-head">
          <button class="link-button link-button--back" type="button" data-action="go" data-route="gift">
            <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M9.5 2.5L4.5 7l5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Back to the gift
          </button>
          <h1 class="heading-1" tabindex="-1">Make it look like you</h1>
          <p class="nudge nudge--lead">${e(t.nudge)}</p>
        </header>

        <div class="editor-grid">
          <div class="editor-stage">
            <div class="editor-stage__inner">
              <div id="preview-mount" class="editor-card">${emailCard()}</div>
            </div>
          </div>

          <div class="editor-panel">
            <div class="editor-tabs" role="tablist" aria-label="Customisation groups">
              ${EDITOR_GROUPS.map(([id, name]) => `
                <button class="editor-tab" type="button" role="tab" id="tab-${id}"
                        aria-selected="${group === id}" aria-controls="panel-${group}"
                        data-action="set-editor-group" data-value="${id}">${e(name)}</button>`).join("")}
            </div>

            <div class="editor-panel__body" id="panel-${group}" role="tabpanel" aria-labelledby="tab-${group}" tabindex="0">
              ${panel}
            </div>

            <div class="editor-foot">
              ${isCustomised() ? `<button class="link-button" type="button" data-action="reset-design">Reset ${e(t.name)} to the original</button>` : ""}
              <p class="editor-locked">The MentorUnion lockup and the terms line are fixed. The claim
                code is added to the finished gift once payment goes through.</p>
            </div>
          </div>
        </div>

        <div class="editor-commit">
          <button class="button button--accent button--pay" type="button" data-action="commit" data-commit>${e(commitLabel())}</button>
          <p class="caption">Payment opens next · ${e(money(q.total))} · Gift purchases are non-refundable.</p>
        </div>
      </div>`;
  }

  /* Channel marks. These carry the channel's own colour, which is a deliberate
     exception to §"no provider colour, logo or visual language has leaked into
     MentorUnion-owned UI" in the website design schema: recognition at a glance
     is what the delivery step is being judged on. The colour is contained inside
     a 28px disc and appears nowhere else, so no page-level token changes. */
  const CHANNEL_ICONS = {
    email: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="2.2" y="5.2" width="19.6" height="13.6" rx="2.6" fill="#fff"/>
      <path d="M3.8 7.6 12 13.5l8.2-5.9" fill="none" stroke="#2B6CE9" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    whatsapp: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#fff" d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.89-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.6.14-.14.3-.35.44-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.7.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.42-.08-.12-.28-.2-.58-.34"/>
      <path fill="#fff" d="M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m0-21.79a11.87 11.87 0 0 0-10.3 17.79L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45 11.9 11.9 0 0 0 0-23.8"/></svg>`,
    pdf: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6.1 2.6h7.3L18.7 8v13.4H6.1z" fill="#fff"/>
      <path d="M13.4 2.6 18.7 8h-5.3z" fill="#F7C9CA"/>
      <rect x="4.3" y="12.2" width="13.3" height="6.4" rx="1.4" fill="#C4181C"/>
      <text x="10.95" y="16.95" text-anchor="middle" font-size="4.5" font-weight="700"
            letter-spacing=".25" fill="#fff" font-family="inherit">PDF</text></svg>`
  };

  function channelMark(icon) {
    return `<span class="channel-mark" data-channel="${icon}" aria-hidden="true">${CHANNEL_ICONS[icon]}</span>`;
  }

  /* A pressed toggle rather than a checkbox: the channels are independent, any
     combination is valid, and the card itself has to read as chosen or not. The
     word stays beside the mark as the control's accessible name. */
  function deliveryOption(action, icon, label, on) {
    return `
      <button class="channel-card" type="button" data-action="${action}" aria-pressed="${on ? "true" : "false"}">
        ${channelMark(icon)}
        <span class="channel-name">${e(label)}</span>
      </button>`;
  }

  /* ------------------------------------------------------- gift preview -- */

  /* Anything the purchaser supplies that is still empty renders as {{Label}}, using
     the same wording as the field that fills it. A glance at any design then says
     which words are data and which are ours. Values from the chosen gift - range,
     credits, validity - are always resolved, so they never need a marker. */
  const VAR = {
    recipientName: "{{Their name}}",
    purchaserName: "{{Your name}}",
    message: "{{Gift card message}}"
  };

  function previewData() {
    const g = gift();
    return {
      name: state.form.recipientName.trim() || VAR.recipientName,
      sender: firstName(state.form.purchaserName) || VAR.purchaserName,
      email: state.form.recipientEmail.trim(),
      message: state.form.message,
      range: conversationLabel(g),
      credits: g.credits,
      validity: g.validityLabel
      /* No code, ever. This data drives the live preview and the six thumbnails,
         which only exist while a gift is being configured - and a code that has
         been issued belongs to an order that was already paid for, not to the
         gift on screen. The issued code reaches the printable card and the
         Email and WhatsApp messages from the order itself. */
    };
  }

  const SCRIBBLE = `
    <svg class="email-scribble" viewBox="0 0 542 40" aria-hidden="true" focusable="false" preserveAspectRatio="none">
      <defs><linearGradient id="em-scribble" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="542" y2="0">
        <stop offset="0" stop-color="var(--sc-1)"/><stop offset=".5" stop-color="var(--sc-2)"/><stop offset="1" stop-color="var(--sc-3)"/>
      </linearGradient></defs>
      <path d="M3 27 C34 17 70 9 101 2 L53 30 C91 26 134 14 175 11 L160 36 C190 27 220 17 248 13 C256 12 256 20 264 22 C282 28 305 17 328 16 C339 16 343 22 356 22 C375 23 397 14 418 10 C448 4 478 10 507 17 C520 20 530 18 539 19"
            fill="none" stroke="url(#em-scribble)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  const RULE = '<span class="email-rule" aria-hidden="true"></span>';

  /* A rakhi: two woven cords meeting at a central rosette. */
  const RAKHI = `
    <svg class="email-rakhi" viewBox="0 0 420 56" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
      <g fill="none" stroke="currentColor" stroke-linecap="round">
        <path d="M2 28 C40 16 74 40 112 28 C140 19 156 34 176 28" stroke-width="2.4" opacity=".85"/>
        <path d="M2 34 C40 22 74 46 112 34 C140 25 156 40 176 34" stroke-width="1.2" opacity=".45"/>
        <path d="M418 28 C380 16 346 40 308 28 C280 19 264 34 244 28" stroke-width="2.4" opacity=".85"/>
        <path d="M418 34 C380 22 346 46 308 34 C280 25 264 40 244 34" stroke-width="1.2" opacity=".45"/>
      </g>
      <g transform="translate(210 28)">
        ${Array.from({ length: 8 }, (_, i) => `<ellipse rx="7.5" ry="15" fill="currentColor" opacity=".22" transform="rotate(${i * 22.5})"/>`).join("")}
        <circle r="11" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".7"/>
        <circle r="4.6" fill="currentColor"/>
      </g>
    </svg>`;

  /* The lockup is never a customisable region. Which master is used follows the
     measured luminance of the hero the purchaser chose, so recolouring the card
     changes which variant renders - never whether it is legible. */
  function brandMark(light) {
    return `
      <div class="email-brand">
        ${light
          ? `<span class="email-logo-board"><img src="${LOGO_DARK}" width="512" height="512" alt="MentorUnion"></span>`
          : `<img class="email-logo" src="${LOGO_LIGHT}" width="376" height="111" alt="MentorUnion">`}
        <span>MENTORSHIP GIFT</span>
      </div>`;
  }

  function emailHero(t, d, c, r) {
    const brand = brandMark(r.light);
    const eyebrow = `<p class="email-eyebrow" data-em="eyebrow">${e(t.eyebrow(d))}</p>`;
    const headline = `<h2 data-em="headline">${e(t.headline(d))}</h2>`;
    const lead = `<p data-em="lead">${e(t.lead(d))}</p>`;

    if (t.id === "milestone") {
      const mark = c.ornament === "scribble" ? SCRIBBLE : c.ornament === "rule" ? RULE : "";
      return `<header class="email-hero">${brand}${eyebrow}${headline}${mark}${lead}</header>`;
    }

    if (t.id === "birthday") {
      const number = c.lead === "off" ? "" :
        `<p class="email-credits"><strong class="numeric" data-em="credits">${e(d.range.replace(" conversations", ""))}</strong><span>conversations, on us</span></p>`;
      return `<header class="email-hero">${brand}${eyebrow}${number}${headline}${lead}</header>`;
    }

    if (t.id === "rakhi") {
      return `<header class="email-hero">${brand}${c.ornament === "thread" ? RAKHI : ""}${eyebrow}${headline}${lead}</header>`;
    }

    /* Quiet note puts the message itself in the hero, so the marker belongs there
       too - otherwise this is the one design that never names the variable. */
    if (t.id === "note") {
      const marks = c.ornament !== "none";
      const written = d.message.trim();
      const body = written
        ? `<blockquote class="email-hero-note" data-em="heronote">${marks ? `“${e(written)}”` : e(written)}</blockquote>`
        : `<blockquote class="email-hero-note" data-em="heronote" data-empty="true">${e(VAR.message)}</blockquote>`;
      return `<header class="email-hero">${brand}${eyebrow}${body}${lead}</header>`;
    }

    return `<header class="email-hero">${brand}${eyebrow}${headline}${lead}</header>`;
  }

  /* Fixed sample content for the design thumbnails, so the six read as stable
     design swatches rather than six copies of whatever is half-typed. */
  const THUMB_DATA = {
    name: "Priya", sender: "Ajay", email: "priya@example.com",
    message: "You have been carrying this decision for months. Go talk to people who already made it.",
    range: "4–10 conversations", credits: 10, validity: "4 months", code: ""
  };

  /* Every design reserves the same slot for the redemption code, but the slot is
     structural, not visual: no code exists until a payment succeeds, so before
     that the block is not drawn at all. A dotted frame or a {{marker}} here would
     be showing the purchaser a code that has not been created. */
  function codeBlock(code) {
    if (!code) return "";
    return `
      <div class="email-code" data-em="code" data-issued="true">
        <span class="email-code__label">Claim code</span>
        <span class="email-code__value numeric">${e(code)}</span>
        <span class="email-code__where">${e(CLAIM_URL)}</span>
      </div>`;
  }

  /* One component renders the full preview and every thumbnail, so a miniature
     can never drift from the design it opens. */
  function emailCard(t = design(), d = previewData(), opts = {}) {
    const c = opts.custom || custom(t.id);
    const r = resolved(t, c);
    /* The quiet-note design already leads with the message; don't print it twice. */
    const showQuote = !t.messageHero;
    return `
      <article class="email-card email-card--${t.id}" data-edge="${e(c.edge)}" data-frame="${e(c.frame)}"
               data-density="${e(c.density)}" data-ornament="${e(c.ornament)}" style="${e(cardVars(t, c, r))}">
        <div class="email-edge"></div>
        ${emailHero(t, d, c, r)}
        <div class="email-body">
          ${showQuote ? `<blockquote class="email-quote" data-em="quote" data-empty="${d.message.trim() ? "false" : "true"}">${
            d.message.trim() ? `“${e(d.message.trim())}”` : e(VAR.message)
          }</blockquote>` : ""}
          <p class="email-closing" data-em="closing">${e(t.closing(d))}</p>
          ${codeBlock(d.code)}
          ${/* A real anchor, not a styled paragraph: in an inbox this has to be
                clickable. The preview is inert, so it does nothing there. */ ""}
          <a class="email-cta" href="https://${CLAIM_URL}${d.code ? `/${d.code}` : ""}"
             target="_blank" rel="noopener">Claim your gift</a>
          ${/* The footnote is about the code, so it appears with the code. */ ""}
          ${d.code ? `<p class="email-foot" data-em="foot">Anyone with this code can claim it, once. Keep it to yourself until you have.</p>` : ""}
        </div>
      </article>`;
  }

  /* Design and customisation changes swap the whole card; content edits patch in
     place so the caret and focus never move. */
  function updatePreview({ full = false } = {}) {
    const mount = app.querySelector("#preview-mount");
    if (!mount) return;
    if (full) { mount.innerHTML = emailCard(); markPreviewInert(); return; }

    const t = design();
    const c = custom();
    const d = previewData();
    const set = (key, text) => {
      const el = mount.querySelector(`[data-em="${key}"]`);
      if (el) el.textContent = text;
    };

    /* The quiet-note hero carries the message, or its {{marker}} while empty -
       the element is always present now, so this patches rather than re-renders. */
    if (t.messageHero) {
      const note = mount.querySelector('[data-em="heronote"]');
      if (!note) { mount.innerHTML = emailCard(); markPreviewInert(); return; }
      const written = d.message.trim();
      note.dataset.empty = written ? "false" : "true";
      note.textContent = written
        ? (c.ornament === "none" ? written : `“${written}”`)
        : VAR.message;
    }

    set("eyebrow", t.eyebrow(d));
    set("headline", t.headline(d));
    set("lead", t.lead(d));
    set("closing", t.closing(d));
    set("credits", d.range.replace(" conversations", ""));

    const quoteEl = mount.querySelector('[data-em="quote"]');
    if (quoteEl) {
      const has = Boolean(d.message.trim());
      quoteEl.dataset.empty = has ? "false" : "true";
      quoteEl.textContent = has ? `“${d.message.trim()}”` : VAR.message;
    }
  }

  /* The preview is a picture of the email, not a working copy. */
  function markPreviewInert() {
    const card = app.querySelector("#preview-mount .email-card");
    if (card) card.inert = true;
  }

  /* The printable card is drawn at its true print size - 480 x 672 CSS pixels,
     exactly 5 x 7 inches - and scaled down only to preview it. The factor is
     measured rather than expressed in CSS, because a container-query division
     produces a length and scale() takes a number. */
  function fitPrintPreview() {
    const box = app.querySelector(".print-preview");
    const shell = box && box.querySelector(".print-shell");
    if (!box || !shell) return;
    shell.style.setProperty("--pp-scale", String(box.clientWidth / 480));
  }

  /* ==================================================================
     Printable gift card - 5 x 7 inches, portrait
     ================================================================== */

  /* 480 x 672 CSS pixels is exactly 5 x 7 inches at the CSS-fixed 96px/inch, so
     the same element is a screen preview and a full-bleed print with no
     rescaling. A greeting-card proportion, not a document page. */
  function printCard(order) {
    const t = DESIGNS[order.designId] || DESIGNS.signature;
    const c = { ...DEFAULT_CUSTOM, ...(order.custom || {}) };
    const r = resolved(t, c);
    const d = {
      name: order.recipientName, sender: order.senderName, email: order.recipientEmail,
      message: order.message, range: order.range, credits: order.credits,
      validity: order.validityLabel, code: order.code
    };
    /* The card keeps its own ornament at print proportions. Birthday's ribbon is
       drawn by the hero's ::before, so it needs no element here. */
    const ornament = t.id === "milestone" && c.ornament === "scribble" ? SCRIBBLE
      : t.id === "milestone" && c.ornament === "rule" ? RULE
      : t.id === "rakhi" && c.ornament === "thread" ? RAKHI : "";

    return `
      <div class="print-card email-card--${t.id}" data-edge="${e(c.edge)}" data-density="${e(c.density)}"
           data-ornament="${e(c.ornament)}" style="${e(cardVars(t, c, r))}">
        <div class="print-card__edge"></div>
        <div class="print-card__hero">
          ${brandMark(r.light)}
          ${ornament}
          <p class="print-card__eyebrow">${e(t.eyebrow(d))}</p>
          ${/* Quiet note's identity is the message as the hero; that has to hold
                at card proportions or the design becomes one of the other five. */ ""}
          ${t.messageHero && d.message.trim()
            ? `<blockquote class="print-card__hero-note">${c.ornament === "none" ? e(d.message.trim()) : `“${e(d.message.trim())}”`}</blockquote>`
            : `<h2 class="print-card__headline">${e(t.headline(d))}</h2>`}
        </div>
        <div class="print-card__body">
          ${!t.messageHero && d.message.trim() ? `<blockquote class="print-card__note">“${e(d.message.trim())}”</blockquote>` : ""}
          <p class="print-card__lead">${e(t.lead(d))}</p>
          ${/* Same rule as the email: the card is only ever composed once a code
                exists, and it composes without the block if one somehow doesn't. */ ""}
          ${d.code ? `
            <div class="print-card__code">
              <span class="print-card__code-label">Claim code</span>
              <strong class="print-card__code-value numeric">${e(d.code)}</strong>
              <span class="print-card__code-where">Redeem at ${e(CLAIM_URL)}</span>
            </div>` : ""}
          ${/* The same call to action the email carries, so a card handed over in
                person tells the recipient what to do as plainly as an inbox does. */ ""}
          <p class="print-card__cta">Claim your gift</p>
          <p class="print-card__fine">${e(t.closing(d))}${d.code ? " Anyone with this code can claim it, once." : ""}</p>
        </div>
      </div>`;
  }

  /* --------------------------------------------- provider checkout -------- */

  /* SIMULATED. Structure is modelled on the approved Razorpay demo in
     live/credit-purchase/pricing-page-research/b2c_pricing_landing_page.html.
     No provider SDK is loaded, no card details are collected, no money moves. */
  function renderCheckout() {
    /* Reached by committing a gift, never by URL and never by stepping back into
       it after the session was cleared. */
    if (!state.committed) return redirect("gift");
    const g = gift();
    const q = quote(g);
    const st = state.payment.status;
    if (st === "failed" || st === "cancelled") return renderPaymentProblem(g, q, st);

    const busy = st === "processing";
    return `
      <div class="container container--narrow">
        <p class="demo-banner">
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor"/>
            <path d="M8 7v4M8 4.7v.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>Simulated checkout. No real payment is processed, no money is charged and no card
            details are collected. Choose an outcome below to test either path.</span>
        </p>

        <div class="rzp-shell" aria-busy="${busy}">
          <aside class="rzp-order" aria-label="Order summary">
            <span class="rzp-merchant">MentorUnion</span>
            <h3>${e(g.name)} · gift</h3>
            <p class="rzp-order-sub">${e(conversationLabel(g))} for ${e(recipientLabel())}</p>
            <div class="rzp-amount">
              <span>Amount</span>
              <strong class="numeric">${e(money(q.total))}</strong>
              <p class="rzp-order-sub">${e(money(q.base))} + GST ${e(money(q.tax))}</p>
            </div>
            <div class="rzp-contact"><span>Billed to</span><strong>${e(state.form.purchaserEmail)}</strong></div>
            <p class="rzp-secured">Checkout structure modelled on Razorpay<br><strong>razorpay</strong> · demonstration only</p>
          </aside>

          <section class="rzp-payment" aria-labelledby="rzp-title">
            <div class="rzp-payment-top">
              <button class="rzp-back" type="button" data-action="go" data-route="gift" ${busy ? "disabled" : ""}>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M9.5 2.5L4.5 7l5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Back
              </button>
              <span class="rzp-wordmark">Modelled on <strong>razorpay</strong></span>
            </div>
            <h2 id="rzp-title" tabindex="-1">Choose how to pay</h2>
            <p class="rzp-payment-copy">This mirrors the structure of a hosted checkout. Method
              availability depends on currency and merchant configuration.</p>

            <fieldset class="rzp-methods">
              <legend>Payment method</legend>
              <div class="rzp-method-grid">
                <label class="rzp-method">
                  <input type="radio" name="rzp-method" value="upi" data-action="set-method"
                         ${state.payment.method === "upi" ? "checked" : ""} ${busy ? "disabled" : ""}>
                  <span><strong>UPI apps &amp; QR</strong><span>Open an app or scan on desktop</span></span>
                </label>
                <label class="rzp-method">
                  <input type="radio" name="rzp-method" value="card" data-action="set-method"
                         ${state.payment.method === "card" ? "checked" : ""} ${busy ? "disabled" : ""}>
                  <span><strong>Card</strong><span>Credit or debit card</span></span>
                </label>
              </div>
            </fieldset>

            ${state.payment.method === "upi" ? `
              <div class="rzp-detail">
                <h3>Pay using a UPI app</h3>
                <p>A live mobile checkout opens an installed app; desktop checkout can show a
                  scannable QR. This demo does neither.</p>
                <div class="rzp-chips" aria-hidden="true"><span>G Pay</span><span>PhonePe</span><span>Paytm</span><span>QR code</span></div>
              </div>` : `
              <div class="rzp-detail">
                <h3>Card details</h3>
                <p>Razorpay would collect and secure card details in the live checkout. This
                  prototype collects nothing.</p>
                <div class="rzp-chips" aria-hidden="true"><span>Card number</span><span>MM / YY</span><span>CVV</span></div>
              </div>`}

            <div class="rzp-actions">
              <button class="rzp-pay" type="button" data-action="pay-success" ${busy ? "disabled" : ""}>
                ${busy ? '<span class="spinner" aria-hidden="true"></span>Confirming payment…' : `Simulate successful payment · ${e(money(q.total))}`}
              </button>
              <button class="rzp-alt" type="button" data-action="pay-failure" ${busy ? "disabled" : ""}>Simulate a failed payment</button>
              <button class="rzp-alt" type="button" data-action="pay-cancel" ${busy ? "disabled" : ""}>Close checkout without paying</button>
            </div>
          </section>
        </div>
      </div>`;
  }

  /* Neither path implies the gift went out, and no code exists yet. */
  function renderPaymentProblem(g, q, kind) {
    const cancelled = kind === "cancelled";
    return `
      <div class="container container--narrow route-view">
        <div class="outcome">
          <div class="outcome__icon outcome__icon--failure" aria-hidden="true">${cancelled ? "↺" : "!"}</div>
          <h1 class="heading-1" tabindex="-1">${cancelled ? "Checkout closed" : "Payment didn't go through"}</h1>
          <p>${cancelled ? "You closed the checkout before paying, so nothing was charged."
                         : e(state.payment.failure || "Your bank declined the payment.")}
            <strong>Your gift has not been sent</strong>, no claim code has been created and
            ${e(recipientLabel())} hasn't been notified.</p>

          <section class="outcome-card" aria-labelledby="problem-summary">
            <h2 class="heading-5" id="problem-summary">Your gift is saved</h2>
            <div class="outcome-line">
              <div>
                <strong>${e(g.name)} · ${e(conversationLabel(g))}</strong>
                <span>For ${e(recipientLabel())} · ${e(deliverySummary())}</span>
              </div>
              <strong class="numeric">${e(money(q.total))}</strong>
            </div>
            <p class="note">Everything you entered - including the design you personalised - is still
              here. Pick up where you left off, or change the gift before trying again.</p>
          </section>

          <div class="outcome__actions">
            <button class="button button--primary" type="button" data-action="retry-payment">Try payment again</button>
            <button class="button button--secondary" type="button" data-action="go" data-route="gift">Edit the gift</button>
          </div>
        </div>
      </div>`;
  }

  function deliverySummary(delivery = state.delivery) {
    const parts = [];
    if (delivery.email) {
      parts.push(delivery.when === "later" && delivery.date
        ? `Email scheduled for ${scheduleSummary(delivery)}`
        : "Email as soon as payment succeeds");
    }
    if (delivery.whatsapp) parts.push("WhatsApp message ready after payment");
    if (delivery.printable) parts.push("Printable card");
    return parts.join(" · ") || "No delivery chosen";
  }

  /* ============================================================ WhatsApp ==
     Message templates, written to the WhatsApp Cloud API's own shape.

     These are the artefacts that would be submitted to Meta for approval, one
     per gift design, so the occasion the purchaser chose survives into the
     message the recipient actually receives. Nothing here sends anything: the
     structure is real, the delivery is not. See §"what is real and what is not"
     in whatsapp-template-spec.md.

     The header is an IMAGE, not text: the gift card is meant to be the first
     thing the recipient sees, and an image header is the only place the Cloud
     API will put media on a template message. That moved the recipient's name
     out of the header and into the body, so the body now carries six
     parameters in ascending order of appearance - Meta's validator requires
     placeholders to be sequential and a body may neither open nor close on one:

       header       the gift-card image, by link
       body {{1}}  recipient's first name
       body {{2}}  sender's first name
       body {{3}}  conversations range, e.g. "4-10 conversations"
       body {{4}}  the purchaser's note, already quoted, or its stand-in
       body {{5}}  claim code
       body {{6}}  validity window, e.g. "4 months"
       button {{1}}  claim code, as the URL's dynamic suffix

     The claim link lives in the URL button and never in the body. That is what
     keeps WhatsApp from rendering a link preview above the message and pushing
     the gift card out of first position - a button is structured, an inline URL
     is not.

     Footer is capped at 60 characters with no variables, and a URL button's
     label at 25. Those limits are held below rather than assumed. */

  const WA_API_VERSION = "v23.0";
  const WA_LANGUAGE = "en";
  const WA_FOOTER = "Gifted through MentorUnion";
  const WA_BUTTON_LABEL = "Claim your gift";
  const WA_BUTTON_URL = "https://mentorunion.com/claim/{{1}}";

  /* DOES NOT EXIST YET. The image header needs a publicly reachable PNG of the
     card that was actually bought, rendered per order. This prototype draws the
     card in the browser and has no server to render or host one, so this is the
     address the integration has to be able to produce - not a file anyone can
     fetch today. See the report's open items. */
  const WA_CARD_MEDIA = (order) => `https://cdn.mentorunion.com/gift-cards/${order.code}.png`;

  /* A template cannot skip a placeholder: every one it declares must be supplied
     on every send. When no note was written, {{3}} still has to carry something,
     and it has to read as a paragraph in its own right rather than as an empty
     quotation. */
  const WA_NO_NOTE = "They did not leave a note, but they chose this one for you.";

  /* WhatsApp is a conversation, not an inbox, so these read as a person
     talking rather than a receipt. Short lines, no platform vocabulary beyond
     the code the recipient has to type. */
  const WHATSAPP_TEMPLATES = {
    signature: {
      name: "gift_ready_signature",
      body: "{{1}}, {{2}} sent you something for what comes next: {{3}} with MentorUnion, with mentors you pick "
        + "yourself.\n\n{{4}}\n\nYour code is {{5}}. No rush at all - the gift waits until you claim it, and the "
        + "{{6}} only start from that day."
    },
    milestone: {
      name: "gift_ready_milestone",
      body: "You did it, {{1}}. {{2}} sent you {{3}} with MentorUnion - time with people who have already made the "
        + "move you are making.\n\n{{4}}\n\nYour code is {{5}}. Claim it whenever you are ready; the {{6}} start from "
        + "that day, not today."
    },
    birthday: {
      name: "gift_ready_birthday",
      body: "Happy birthday, {{1}}. Not another thing to find space for - {{2}} sent you {{3}} with MentorUnion, with "
        + "people who have been where you are going.\n\n{{4}}\n\nYour code is {{5}}. Claim it when you like; the {{6}} "
        + "start from that day."
    },
    chapter: {
      name: "gift_ready_chapter",
      body: "{{1}}, {{2}} sent you something for the turn you are making: {{3}} with MentorUnion, with mentors who "
        + "have made the same one.\n\n{{4}}\n\nYour code is {{5}}. Nothing expires while it sits unclaimed, and the "
        + "{{6}} start the day you claim it."
    },
    rakhi: {
      name: "gift_ready_rakhi",
      body: "Happy Raksha Bandhan, {{1}}. {{2}} sent you {{3}} with MentorUnion - the kind of looking out for you "
        + "that lasts a good deal longer than a day.\n\n{{4}}\n\nYour code is {{5}}. Claim it whenever you like; the "
        + "{{6}} start from that day."
    },
    note: {
      name: "gift_ready_note",
      body: "{{1}}, this came with more than a note. {{2}} sent you {{3}} with mentors you choose yourself, and "
        + "wrote:\n\n{{4}}\n\nYour code is {{5}}. A conversation costs 1 to 3 credits, always shown before you book, "
        + "and the {{6}} start the day you claim them."
    }
  };

  /* Template parameters may not carry newlines, tabs, or runs of four or more
     spaces; a send containing them is rejected outright rather than reformatted.
     The note is free text typed by a purchaser, so it is flattened here. */
  function waParam(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function waTemplate(order) {
    return WHATSAPP_TEMPLATES[order.designId] || WHATSAPP_TEMPLATES.signature;
  }

  /* The six body parameters, in the order the contract above declares them. */
  function waBodyParams(order) {
    const note = waParam(order.message);
    return [
      waParam(recipientLabel(order.recipientName)),
      waParam(order.senderName),
      waParam(order.range),
      note ? `"${note}"` : WA_NO_NOTE,
      order.code,
      waParam(order.validityLabel)
    ];
  }

  /* The request as it would leave the server: exactly the body posted to
     /{phone-number-id}/messages, no more and no less. Built only from a paid
     order, so the claim code in it is always one that exists. */
  function waPayload(order) {
    const t = waTemplate(order);
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: order.recipientPhoneE164 || "",
      type: "template",
      template: {
        name: t.name,
        language: { code: WA_LANGUAGE },
        components: [
          /* The gift card, first, as the message's own media rather than as a
             link the client has to unfurl. */
          { type: "header", parameters: [{ type: "image", image: { link: WA_CARD_MEDIA(order) } }] },
          { type: "body", parameters: waBodyParams(order).map((text) => ({ type: "text", text })) },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: order.code }] }
        ]
      }
    };
  }

  function waRequest(order) {
    return {
      method: "POST",
      url: `https://graph.facebook.com/${WA_API_VERSION}/{PHONE_NUMBER_ID}/messages`,
      headers: { Authorization: "Bearer {ACCESS_TOKEN}", "Content-Type": "application/json" },
      body: waPayload(order)
    };
  }

  /* Substituting the parameters back into the registered text gives the message
     the recipient would read. The prepared share below is built from this, so
     what the prototype actually sends and what the API would send are the same
     words rather than two drafts that drift. */
  function waRendered(order) {
    const t = waTemplate(order);
    const body = waBodyParams(order);
    return {
      media: WA_CARD_MEDIA(order),
      body: t.body.replace(/\{\{([1-6])\}\}/g, (_m, n) => body[Number(n) - 1]),
      footer: WA_FOOTER,
      buttonLabel: WA_BUTTON_LABEL,
      buttonUrl: WA_BUTTON_URL.replace("{{1}}", order.code)
    };
  }

  /* The finished gift as plain text, for the click-to-chat share.

     Deliberately carries NO URL. WhatsApp unfurls the first link it finds and
     puts the preview above the message, which is exactly what was displacing
     the gift card. On the Cloud API path the claim link lives in a URL button
     and never appears in the body; here there is no button to put it in, so it
     is left out entirely and the recipient is told where to type the code
     instead. The code is the thing that actually redeems the gift - the link is
     only a shortcut to the same page. */
  function giftShareText(order) {
    const m = waRendered(order);
    return `${m.body}\n\nOpen MentorUnion and enter it under ${CLAIM_CTA}.\n\n${m.footer}`;
  }

  /* PROTOTYPE BEHAVIOUR, not an integration. wa.me is WhatsApp's own
     click-to-chat link: it opens WhatsApp with the message composed and, when a
     number was collected, the conversation already chosen. The purchaser still
     presses send.

     It cannot attach media. There is no parameter for it and no way to add one
     - the gift card cannot ride along on this path, which is why the card stays
     primary inside MentorUnion and the Cloud API template carries it as an
     image header instead. Nothing here sends a WhatsApp message on
     MentorUnion's behalf; waRequest() describes the call, it does not make it. */
  function whatsappShareHref(order) {
    return `https://wa.me/${order.recipientPhoneE164 || ""}?text=${encodeURIComponent(giftShareText(order))}`;
  }

  /* Same principle for email: the purchaser's own mail client, prefilled. */
  function mailShareHref(order) {
    const subject = `${order.senderName} sent you a MentorUnion gift`;
    return `mailto:${encodeURIComponent(order.recipientEmail)}`
      + `?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(giftShareText(order))}`;
  }

  /* ============================================================== email ==
     Three messages, all SIMULATED: nothing is composed, queued or sent, and
     there is no mail service behind any of this. What is real is the content
     and the rules about who receives which one.

       purchaser  <- receipt, after a successful payment, always
       purchaser  <- delivery failed, only after the retries are exhausted
       recipient  <- the gift itself, only when email delivery was chosen

     The recipient's message is the gift card. It is built by emailCard() and is
     not restated here; only its envelope is. The purchaser's messages are text,
     because a receipt is not a gift. */

  /* Only ever shown to the purchaser, who typed these details in the first
     place. The recipient never sees the amount paid, and the purchaser never
     sees the recipient's claim activity. */
  function purchaserReceiptEmail(order) {
    const rows = [
      ["Gift", `${order.giftName} · ${order.range}`],
      ["Design", order.designName],
      ["For", order.recipientName || "Not named"],
      ["Delivery", deliverySummary(order.delivery)],
      ["Amount paid", money(order.total)],
      ["Order", order.reference]
    ];
    if (order.delivery.email && order.recipientEmail) rows.splice(4, 0, ["Sent to", order.recipientEmail]);

    return {
      to: order.purchaserEmail,
      subject: order.recipientName
        ? `Your gift for ${order.recipientName} is paid for`
        : "Your MentorUnion gift is paid for",
      preheader: `${order.giftName} · ${money(order.total)} · order ${order.reference}`,
      heading: "Your gift is paid for",
      lead: order.recipientName
        ? `${order.recipientName}'s gift is ready. Here is what you bought and how it reaches them.`
        : "Your gift is ready. Here is what you bought and how it reaches them.",
      rows,
      next: purchaserNextSteps(order),
      /* The code is on the purchaser's own confirmation screen already; it is
         repeated here because on the WhatsApp and printed routes they are the
         one who has to pass it on. */
      code: order.code,
      fine: "Gift purchases are non-refundable."
    };
  }

  function purchaserNextSteps(order) {
    const out = [];
    if (order.delivery.email) {
      out.push(order.delivery.when === "later" && order.delivery.date
        ? `We email the gift to ${order.recipientEmail || "them"} on ${scheduleSummary(order.delivery)}.`
        : `We email the gift to ${order.recipientEmail || "them"} now.`);
    }
    if (order.delivery.whatsapp) {
      out.push(order.recipientPhone
        ? `Your WhatsApp message to ${order.recipientPhone} is written and waiting for you to send.`
        : "Your WhatsApp message is written and waiting for you to send.");
    }
    if (order.delivery.printable) out.push("Your printable card is ready to download whenever you want it.");
    out.push(`They claim it in their own time. The ${order.validityLabel} of booking time start the day they claim, not today.`);
    return out;
  }

  /* Sent to the purchaser, and only to the purchaser, once the recipient email
     has failed every attempt it is allowed. It names the gift well enough for
     them to know which one, and offers the routes this product already has. */
  function deliveryFailureEmail(order) {
    const who = order.recipientEmail || order.recipientName || "your recipient";
    return {
      to: order.purchaserEmail,
      subject: order.recipientName
        ? `We couldn't deliver ${order.recipientName}'s gift`
        : "We couldn't deliver your gift email",
      preheader: `Order ${order.reference} · the gift is safe and the code still works`,
      heading: "The gift email didn't get through",
      lead: `We tried ${EMAIL_MAX_ATTEMPTS} times to email ${who} and could not deliver it. `
        + "Nothing was lost: the gift is paid for and the claim code below still works.",
      rows: [
        ["Gift", `${order.giftName} · ${order.range}`],
        ["For", order.recipientName || "Not named"],
        ["Address we tried", order.recipientEmail || "No address was given"],
        ["Order", order.reference]
      ],
      next: [
        "Send them the claim code yourself - it is the whole gift, and it works from any account.",
        "Your printable card is still available on the confirmation page.",
        "If the address was wrong, pass the code on however suits you; there is nothing to re-buy."
      ],
      code: order.code,
      fine: "You are receiving this because you bought the gift."
    };
  }

  /* Both purchaser emails share a shape, so they render the same way. */
  function emailPreview(m) {
    const rows = m.rows.map(([k, v]) => `  ${k}: ${v}`).join("\n");
    const next = m.next.map((line) => `  - ${line}`).join("\n");
    return `To: ${m.to}\nSubject: ${m.subject}\nPreheader: ${m.preheader}\n\n`
      + `${m.heading}\n\n${m.lead}\n\n${rows}\n\n  Claim code: ${m.code}\n\nWhat happens next\n${next}\n\n${m.fine}`;
  }

  function envelopePreview(m) {
    return `To: ${m.to}\nSubject: ${m.subject}\nPreheader: ${m.preheader}\n\n`
      + "Body: the gift card, rendered by emailCard() - the same component the purchaser previewed.";
  }

  /* The recipient's envelope. The message body is the gift card itself. */
  function recipientEmailMeta(order) {
    const t = DESIGNS[order.designId] || DESIGNS.signature;
    return {
      to: order.recipientEmail,
      subject: t.subject({ name: recipientLabel(order.recipientName), sender: order.senderName }),
      preheader: `${order.range} with mentors you choose · your code is ${order.code}`
    };
  }

  /* ------------------------------------------- simulated email delivery --
     A bounded attempt model, so the prototype can show the difference between
     "not delivered yet", "still trying" and "gave up". The claim code is minted
     once, by completeOrder, and nothing in here can mint another - a retry
     re-sends the same gift or it does nothing. */

  const EMAIL_MAX_ATTEMPTS = 3;
  const EMAIL_RETRY_DELAY = 1800;

  function initialEmailDelivery(order) {
    if (!order.delivery.email) return { required: false, status: "not-required", attempts: 0 };
    if (order.delivery.when === "later" && order.delivery.date) {
      return { required: true, status: "scheduled", attempts: 0 };
    }
    return { required: true, status: "pending", attempts: 0 };
  }

  /* SIMULATED. `forceFailure` is the developer switch on the confirmation page;
     without it every attempt succeeds. */
  function attemptGiftEmail() {
    const order = state.order;
    if (!order) return;
    const d = order.emailDelivery;
    if (!d.required) return;
    /* Already delivered, or already given up: a second call is a no-op rather
       than a second gift. */
    if (d.status === "sent" || d.status === "failed") return;
    if (d.status === "sending") return;
    if (d.attempts >= EMAIL_MAX_ATTEMPTS) return;

    d.attempts += 1;
    d.status = "sending";
    render();

    timers.giftEmail = window.setTimeout(() => {
      const failed = state.forceEmailFailure;
      if (!failed) {
        d.status = "sent";
        d.sentAt = new Date().toISOString();
        render();
        announce(`Gift emailed to ${order.recipientEmail || "the recipient"}.`);
        return;
      }
      if (d.attempts < EMAIL_MAX_ATTEMPTS) {
        d.status = "retrying";
        render();
        timers.giftEmail = window.setTimeout(attemptGiftEmail, EMAIL_RETRY_DELAY);
        return;
      }
      /* Out of attempts. The purchaser is told by email, and by email only -
         no other channel is used to report a delivery problem. */
      d.status = "failed";
      d.failedAt = new Date().toISOString();
      render();
      announce("We could not deliver the gift email. You have been sent a message about it.");
    }, 900);
  }

  function emailStatusLabel(order) {
    const d = order.emailDelivery;
    switch (d.status) {
      case "scheduled": return `Scheduled for ${scheduleSummary(order.delivery)}`;
      case "pending": return "Queued";
      case "sending": return `Sending${d.attempts > 1 ? ` · attempt ${d.attempts} of ${EMAIL_MAX_ATTEMPTS}` : ""}`;
      case "retrying": return `Delivery failed · retrying (${d.attempts} of ${EMAIL_MAX_ATTEMPTS})`;
      case "sent": return "Delivered";
      case "failed": return `Not delivered after ${EMAIL_MAX_ATTEMPTS} attempts`;
      default: return "";
    }
  }

  function shareCard({ href, action, icon, name, note, state: badge = "" }) {
    const inner = `
      ${channelMark(icon)}
      <span class="share-card__text">
        <span class="share-card__name">${e(name)}${badge ? `<span class="share-card__state">${e(badge)}</span>` : ""}</span>
        <span class="share-card__note">${e(note)}</span>
      </span>`;
    return href
      ? `<a class="share-card" href="${e(href)}" target="_blank" rel="noopener">${inner}</a>`
      : `<button class="share-card" type="button" data-action="${e(action)}">${inner}</button>`;
  }

  /* Every route stays open after payment. What the purchaser chose earlier shapes
     what each card says, never which cards exist - nobody should have to go back
     and re-buy a gift to print the card they already paid for. */
  function shareSection(order, scheduled) {
    return `
      <section class="share-section" aria-labelledby="share-title">
        <h2 class="heading-5" id="share-title">Choose how you'd like to share it</h2>
        <div class="share-row">
          ${shareCard({
            href: mailShareHref(order), icon: "email", name: "Email",
            state: order.delivery.email ? (scheduled ? "Scheduled" : "Sent") : "",
            note: "Opens your mail app, written out"
          })}
          ${shareCard({
            href: whatsappShareHref(order), icon: "whatsapp", name: "WhatsApp",
            state: order.delivery.whatsapp ? "Ready" : "",
            note: order.recipientPhone ? `Opens a message to ${order.recipientPhone}` : "Opens WhatsApp, message written"
          })}
          ${shareCard({
            action: "print-card", icon: "pdf", name: "Printable card",
            state: order.delivery.printable ? "Ready" : "",
            note: "Print it or save it as a PDF"
          })}
        </div>
      </section>`;
  }

  function renderConfirmed() {
    const order = state.order;
    if (!order) return redirect("gift");
    const scheduled = order.delivery.email && order.delivery.when === "later" && order.delivery.date;

    return `
      <div class="container container--wide route-view">
        <div class="confirm-head">
          <div class="confetti" aria-hidden="true">
            ${[["12%", "#39B6D8", "0ms"], ["30%", "#F7D344", "120ms"], ["50%", "#E38330", "60ms"],
               ["70%", "#39B6D8", "180ms"], ["88%", "#F7D344", "40ms"]]
              .map(([left, color, delay]) => `<i style="left:${left};background:${color};animation-delay:${delay}"></i>`).join("")}
          </div>
          <div class="outcome__icon outcome__icon--success" aria-hidden="true">✓</div>
          ${/* The possessive needs a name to hang off; without one the gift is
                still ready, so the sentence simply loses its owner. */ ""}
          <h1 class="heading-1" tabindex="-1">${order.recipientName
            ? `${e(order.recipientName)}'s gift is ready`
            : "Your gift is ready"}</h1>
          <p class="lead">${scheduled
            ? `It's built, paid for and waiting. It reaches them on ${e(scheduleSummary(order.delivery))}.`
            : order.delivery.email
              ? "It's built, paid for and on its way to their inbox."
              : order.delivery.whatsapp
                ? "It's built and paid for, with a WhatsApp message written and waiting for you to send."
                : "It's built and paid for. Print the card whenever you're ready to hand it over."}</p>
        </div>

        <div class="confirm-grid">
          <div class="confirm-main">
            <section class="claim-code-card" aria-labelledby="code-title">
              <h2 class="heading-5" id="code-title">Their claim code</h2>
              <p class="claim-code-card__value numeric" data-code>${e(order.code)}</p>
              <div class="claim-code-card__actions">
                <button class="button button--secondary" type="button" data-action="copy-code">Copy code</button>
                <a class="button button--quiet" href="#/app/claim">Open the claim page</a>
              </div>
              <p class="caption">Single use. Anyone holding it can claim it, and it stops working the
                moment it is claimed. It has no expiry date.</p>
            </section>

            ${shareSection(order, scheduled)}

            <section class="outcome-card" aria-labelledby="confirm-summary">
              <h2 class="heading-5" id="confirm-summary">What happens next</h2>
              <ol class="next-list">
                ${order.delivery.email ? `
                  <li data-email-status="${e(order.emailDelivery.status)}">
                    <strong>Email · ${e(emailStatusLabel(order))}</strong>
                    ${/* Without an address the sentence has no subject, so it
                          says who receives it in the general. */ ""}
                    <span>${order.emailDelivery.status === "failed"
                      ? `We tried ${EMAIL_MAX_ATTEMPTS} times and could not reach ${e(order.recipientEmail || recipientLabel(order.recipientName))}. We've emailed you about it. The gift is paid for and the code below still works.`
                      : order.emailDelivery.status === "retrying"
                        ? `That attempt didn't get through, so we're trying ${e(order.recipientEmail || recipientLabel(order.recipientName))} again.`
                        : scheduled
                          ? `Nothing has been sent yet. ${e(order.recipientEmail || recipientLabel(order.recipientName))} receives the ${e(order.designName)} design at the time you picked.`
                          : `${e(order.recipientEmail || recipientLabel(order.recipientName))} receives the ${e(order.designName)} design, with the card as the message itself.`}</span>
                  </li>` : ""}
                ${order.delivery.whatsapp ? `
                  <li>
                    <strong>WhatsApp message ready</strong>
                    <span>The message and the claim code are written${order.recipientPhone ? ` and addressed to ${e(order.recipientPhone)}` : ""}.
                      You send it yourself - MentorUnion doesn't message anyone on your behalf.</span>
                  </li>` : ""}
                ${order.delivery.printable ? `
                  <li>
                    <strong>Printable card ready now</strong>
                    <span>A 5 × 7 inch card built from the same design. Print it or save it as a PDF.</span>
                  </li>` : ""}
                <li>
                  <strong>They claim it in their own time</strong>
                  <span>The code has no expiry. ${e(order.validityLabel)} of booking time starts the day they claim it, not today.</span>
                </li>
              </ol>
              <p class="caption caption--fine">Order ${e(order.reference)} · ${e(money(order.total))} paid ·
                receipt to ${e(order.purchaserEmail)}. Gift purchases are non-refundable.
                <em>Simulated - no email leaves the browser.</em></p>
            </section>

            <div class="outcome__actions outcome__actions--start">
              <a class="button button--primary" href="#/">Back to MentorUnion</a>
              <button class="button button--secondary" type="button" data-action="gift-again">Create another gift</button>
            </div>

            ${/* Last on the page and shut by default, so the purchaser's screen
                  is unchanged and engineering still has the request to hand while
                  walking the flow. It exists only here, after payment, because
                  the payload cannot be built before a code exists. */ ""}
            <details class="dev-note">
              <summary>Engineering reference: the messages this order would send</summary>

              <p class="dev-note__lede"><strong>Purchaser receipt — email, always.</strong> Sent on a successful
                payment. The only message the purchaser gets unless delivery fails.</p>
              <pre class="dev-note__code"><code>${e(emailPreview(purchaserReceiptEmail(order)))}</code></pre>

              ${order.delivery.email ? `
                <p class="dev-note__lede"><strong>Recipient gift — email.</strong> The body is the gift card itself,
                  rendered by the same code that draws the preview; only the envelope is text.</p>
                <pre class="dev-note__code"><code>${e(envelopePreview(recipientEmailMeta(order)))}</code></pre>` : ""}

              ${order.delivery.whatsapp ? `
                <p class="dev-note__lede"><strong>Recipient gift — WhatsApp Cloud API.</strong> Template
                  <code>${e(waTemplate(order).name)}</code>, chosen by the gift design. The card is the image header
                  and the claim link is a URL button, so no link preview displaces it. Nothing is sent by this
                  prototype; this is the request the integration would make.</p>
                <pre class="dev-note__code"><code>${e(JSON.stringify(waRequest(order), null, 2))}</code></pre>
                <p class="dev-note__lede">What the click-to-chat share actually opens with. No URL, because WhatsApp
                  would unfurl it above the message; and no image, because a <code>wa.me</code> link cannot carry
                  one.</p>
                <pre class="dev-note__code"><code>${e(giftShareText(order))}</code></pre>` : ""}

              ${order.delivery.printable && !order.delivery.email && !order.delivery.whatsapp ? `
                <p class="dev-note__lede"><strong>Printable card only.</strong> No recipient message is generated for
                  this route - the card is the delivery.</p>` : ""}

              ${order.emailDelivery.required ? `
                <p class="dev-note__lede"><strong>Delivery failure notice — email to the purchaser.</strong> Sent only
                  after ${EMAIL_MAX_ATTEMPTS} failed attempts, and only to the purchaser.</p>
                <pre class="dev-note__code"><code>${e(emailPreview(deliveryFailureEmail(order)))}</code></pre>
                <p class="dev-note__lede">Simulate the failure path. Retries re-send this same order and cannot mint a
                  second code.</p>
                <div class="dev-note__actions">
                  <button class="button button--secondary" type="button" data-action="toggle-email-failure">
                    ${state.forceEmailFailure ? "Stop failing delivery" : "Make delivery fail"}
                  </button>
                  ${/* Locked only while an attempt is actually in flight. A
                        delivered gift can still be sent again - that is a real
                        thing to want - and a failed one can be tried again. */ ""}
                  <button class="button button--quiet" type="button" data-action="retry-gift-email"
                          ${["sending", "retrying"].includes(order.emailDelivery.status) ? "disabled" : ""}>
                    ${order.emailDelivery.status === "sent" ? "Send again" : "Retry now"}
                  </button>
                </div>` : ""}
            </details>
          </div>

          <aside class="confirm-aside" aria-labelledby="print-title">
            <h2 class="heading-5" id="print-title">Printable card</h2>
            <div class="print-preview">
              <div class="print-shell" id="print-root">${printCard(order)}</div>
            </div>
            ${/* Available whatever was chosen before payment: the card is part of
                  the gift that was paid for, not a separate purchase. */ ""}
            <button class="button button--primary button--block" type="button" data-action="print-card">Download printable card</button>
            <p class="caption">5 × 7 inches, full bleed. Your browser's print dialog can save it as a PDF.</p>
          </aside>
        </div>
      </div>`;
  }

  /* ==================================================================
     Claim a Gift - SUPERSEDED signed-out journey

     This is the original website-styled claim page, which found the gift and
     then asked for an email to sign in with. Claiming now happens inside the
     signed-in platform - see renderAppClaim - so `#/claim` forwards there and
     nothing renders this any more.

     It is left in place, unreferenced, only until the team confirms that no
     signed-out claim surface is wanted. Nothing links to it; deleting it and
     its handlers is a tidy-up, not a behaviour change.
     ================================================================== */

  function renderClaim() {
    const c = state.claim;
    const signedIn = Boolean(c.account);
    const ledger = readLedger();
    const record = c.stage === "found" || c.stage === "claimed" ? ledger[displayCode(c.code)] : null;

    const codeEntry = `
      <form class="claim-form" id="claim-form" novalidate>
        <div class="field">
          <label class="field__label" for="claimCode">Gift code</label>
          <input id="claimCode" name="claimCode" data-field="claimCode" type="text" inputmode="text"
                 autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="14"
                 class="claim-input numeric" value="${e(c.input)}" placeholder="MU-XXXX-XXXX"
                 aria-invalid="${c.errors.claimCode ? "true" : "false"}" aria-describedby="claimCode-error">
          <span class="field__error" id="claimCode-error" role="alert">${e(c.errors.claimCode || "")}</span>
        </div>
        <button class="button button--accent button--pay button--block" type="submit">Check this code</button>
      </form>`;

    let body;
    if (c.stage === "invalid") {
      body = `
        <div class="claim-state claim-state--warn">
          <h2 class="heading-5">We couldn't validate that code</h2>
          <p>Check it against the card or email it came on - codes never contain the letters I, L, O or
            U, or the digits 0 or 1.</p>
        </div>
        ${codeEntry}`;
    } else if (c.stage === "claimed") {
      body = `
        <div class="claim-state claim-state--warn">
          <h2 class="heading-5">This gift has already been claimed</h2>
          <p>A gift code works once. If you think this is wrong, the person who sent it can check their
            order with support.</p>
        </div>
        ${codeEntry}`;
    } else if (c.stage === "found" && record) {
      body = `
        <div class="claim-state claim-state--ready">
          <span class="eyebrow">Ready to claim</span>
          <h2 class="heading-3">${e(record.giftName)} · ${e(record.range)}</h2>
          <p>${e(record.credits)} credits, added to your MentorUnion balance. You choose the mentors and
            book when you're ready - ${e(record.validityLabel)} from the day you claim.</p>
        </div>

        <div class="claim-account">
          ${signedIn
            ? `<p class="claim-account__who">Signed in as <strong>${e(c.account)}</strong>
                 <button class="link-button" type="button" data-action="claim-signout">Not you?</button></p>`
            : `<div class="field">
                 <label class="field__label" for="claimAccount">Sign in to claim</label>
                 <input id="claimAccount" name="claimAccount" data-field="claimAccount" type="email"
                        inputmode="email" autocomplete="email" placeholder="you@example.com"
                        value="${e(c.account)}" aria-invalid="${c.errors.claimAccount ? "true" : "false"}"
                        aria-describedby="claimAccount-error">
                 <span class="field__error" id="claimAccount-error" role="alert">${e(c.errors.claimAccount || "")}</span>
               </div>
               <p class="caption">Simulated sign-in. No password is asked for and no account is created.</p>`}
        </div>

        <button class="button button--accent button--pay button--block" type="button" data-action="claim-confirm">
          Add ${e(record.credits)} credits to my account
        </button>
        <button class="button button--quiet button--block" type="button" data-action="claim-restart">Use a different code</button>`;
    } else if (c.stage === "done") {
      const balance = readBalance(c.account);
      body = `
        <div class="claim-state claim-state--done">
          <div class="outcome__icon outcome__icon--success" aria-hidden="true">✓</div>
          <h2 class="heading-3">${e(state.claim.claimedCredits)} credits are in your account</h2>
          <p>Added to <strong>${e(c.account)}</strong>. Your balance is now
            <strong class="numeric">${e(balance)} credits</strong> - enough for
            ${e(Math.ceil(balance / CREDIT_COST_MAX))}–${e(balance)} conversations.</p>
          <div class="outcome__actions">
            <a class="button button--primary" href="#/" data-inert-nav>Find a mentor</a>
            <button class="button button--secondary" type="button" data-action="claim-restart">Claim another gift</button>
          </div>
        </div>`;
    } else {
      body = `
        <p class="lead">Enter the code from your gift card or email. It works once, from any account,
          and has no expiry date.</p>
        ${codeEntry}`;
    }

    return `
      <div class="container container--narrow route-view">
        <div class="claim">
          <header class="claim-head">
            <p class="eyebrow">CLAIM A GIFT</p>
            <h1 class="heading-1" tabindex="-1">Someone sent you time with a mentor</h1>
          </header>
          ${body}
          <p class="caption caption--fine">Codes are issued and checked inside this browser for the
            prototype. <em>Simulated - there is no server validating them.</em></p>
        </div>
      </div>`;
  }

  /* ==================================================================
     Signed-in platform - Your credits, and Claim your Gift

     Every screen below is built from the All Mentors dashboard in
     live/mentee-direct-onboarding/prototype - its panels, fields, buttons,
     callouts, success badge and credit chip - within the rules of
     shared/design/platform-design-schema.md. Nothing here reuses a component
     from the gifting journey, and the gifting journey reuses nothing from
     here.

     Icons are inline SVG on the schema's own icon rule (stroke, round caps
     and joins) rather than the dashboard's Material Symbols webfont: this
     prototype must render with no network, and a missing icon font would
     print the glyph names as text.
     ================================================================== */

  function conversationsFor(credits) {
    return `${Math.ceil(credits / CREDIT_COST_MAX)}–${credits} conversations`;
  }

  const COIN_ICON = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="6.2" rx="8" ry="3.2"/>
      <path d="M4 6.2v11.6c0 1.77 3.58 3.2 8 3.2s8-1.43 8-3.2V6.2"/>
      <path d="M4 12c0 1.77 3.58 3.2 8 3.2s8-1.43 8-3.2"/>
    </svg>`;

  /* The dashboard's credit chip: the platform's existing way of stating an
     amount of credits, reused rather than re-invented. */
  function creditChip(credits) {
    return `
      <p class="plat-credit-chip">
        ${COIN_ICON}
        <b>${e(credits)}</b>
        <span>${credits === 1 ? "credit" : "credits"}</span>
      </p>`;
  }

  /* -------------------------------------------------- browse mentors ---- */

  /* The All Mentors screen from live/mentee-direct-onboarding/prototype: agenda
     tabs, a sort/facet rail and a card grid. Its own structure, its own data
     and its own component metrics; the one thing added is the Claim your Gift
     action, which lives in the shared topbar above it rather than in the page.

     Agenda and sort genuinely reorder the list. The chip row and the collapsed
     facets are presentational on the dashboard too - they are reproduced for
     fidelity and say so when pressed rather than pretending to filter. */
  function renderAppMentors() {
    const m = state.mentors;
    const matching = MENTORS.filter((x) => x.agendas.includes(m.agenda));
    const list = (matching.length ? matching : MENTORS).slice();

    if (m.sort === "rating") list.sort((a, b) => Number(b.rating) - Number(a.rating));
    else if (m.sort === "experience") list.sort((a, b) => parseInt(b.exp, 10) - parseInt(a.exp, 10));
    else list.sort((a, b) => Number(b.rating) - Number(a.rating) || parseInt(b.exp, 10) - parseInt(a.exp, 10));

    return `
      <div class="plat-browse">
        <div class="plat-agendas" role="group" aria-label="Session agenda">
          ${AGENDAS.map((a) => `
            <button class="plat-agenda" type="button" data-action="set-agenda" data-value="${e(a)}"
                    aria-pressed="${a === m.agenda}">${e(a)}</button>`).join("")}
        </div>

        <div class="plat-subchips" role="group" aria-label="Sub-agenda">
          ${MENTOR_SUBFILTERS.map((s) => `
            <button class="plat-subchip" type="button" data-action="set-subfilter" data-value="${e(s)}"
                    aria-pressed="${s === m.sub}">${e(s)}</button>`).join("")}
        </div>

        <div class="plat-amlayout">
          <aside class="plat-filters" aria-label="Sort and filter">
            <div class="plat-fcard">
              <p class="plat-fh">Sort by</p>
              <div role="radiogroup" aria-label="Sort by">
                ${MENTOR_SORTS.map(([id, label]) => `
                  <button class="plat-opt" type="button" role="radio" aria-checked="${id === m.sort}"
                          data-action="set-mentor-sort" data-value="${id}">
                    <span class="plat-rd" aria-hidden="true"></span>${e(label)}
                  </button>`).join("")}
              </div>
              ${MENTOR_FACETS.map((f) => `
                <button class="plat-grp" type="button" data-inert-nav>
                  ${e(f)}
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="m6 9.5 6 6 6-6"/>
                  </svg>
                </button>`).join("")}
            </div>
          </aside>

          <div class="plat-mcards">
            ${list.map((x) => `
              <article class="plat-mcard">
                <div class="plat-mcard__ph" aria-hidden="true">
                  <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="8.5" r="3.8"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/>
                  </svg>
                  <span class="plat-mcard__rt">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8Z"/>
                    </svg>${e(x.rating)}
                  </span>
                </div>
                <div class="plat-mcard__body">
                  <h2 class="plat-mname">${e(x.name)}</h2>
                  <p class="plat-mrole">${e(x.role)}</p>
                  <p class="plat-mmeta">${e(x.exp)} · ${e(x.calls)}</p>
                  <p class="plat-mtags">
                    <span>${e(x.domains[0])}</span><span>${e(m.agenda)}</span>
                  </p>
                  <button class="plat-btn plat-btn--ghost plat-btn--full" type="button" data-inert-nav>
                    Book — ${e(x.credits)} credits
                  </button>
                </div>
              </article>`).join("")}
          </div>
        </div>
      </div>`;
  }

  function renderAppHome() {
    const balance = readBalance(SESSION.email);
    const wallet = readWallet(SESSION.email);

    return `
      <div class="plat-col--wide">
        <section class="plat-card" aria-labelledby="balance-title">
          <h2 class="plat-card__title" id="balance-title">Available balance</h2>
          <div class="plat-balance">
            ${creditChip(balance)}
            <span class="plat-balance__note">${balance > 0
              ? `Enough for ${e(conversationsFor(balance))}. A conversation costs 1 to 3 credits, always shown before you book.`
              : "A conversation costs 1 to 3 credits, always shown before you book."}</span>
          </div>
        </section>

        <section class="plat-card" aria-labelledby="wallet-title">
          <h2 class="plat-card__title" id="wallet-title">Where these came from</h2>
          ${wallet.length === 0
            ? `<p class="plat-empty">Nothing claimed yet. If someone has sent you a gift,
                 <a href="#/app/claim">claim it with your code</a>.</p>`
            : `<ul class="plat-list">
                 ${wallet.map((item) => {
                   const until = validityEnd(item.claimedAt, item.validityLabel);
                   return `
                     <li>
                       <span class="plat-list__name">${e(item.giftName)} gift · ${e(item.credits)} credits</span>
                       <span class="plat-list__meta">Claimed ${e(formatDate(new Date(item.claimedAt)))}${
                         until ? ` · valid until ${e(formatDate(until))}` : ` · valid ${e(item.validityLabel)}`}</span>
                     </li>`;
                 }).join("")}
               </ul>`}
        </section>

        <p class="plat-fine">Balances and claimed gifts in this prototype are held in this browser.
          <em>Simulated — no account or server is involved.</em></p>
      </div>`;
  }

  /* ---------------------------------------------------- claim your gift -- */

  /* One woven cord, drawn the way the Rakhi gift design draws it - a heavier
     stroke with a lighter one shadowing it. Mirrored by CSS for the other side
     of the success badge. */
  const OK_CORD = `
    <svg class="plat-ok__cord" width="58" height="20" viewBox="0 0 58 20" fill="none"
         stroke="currentColor" stroke-linecap="round" aria-hidden="true">
      <path d="M2 9C14 3 26 15 38 9c7-3.5 12 1.5 18 0" stroke-width="1.7" opacity=".85"/>
      <path d="M2 12.5C14 6.5 26 18.5 38 12.5c7-3.5 12 1.5 18 0" stroke-width="1" opacity=".45"/>
    </svg>`;

  /* The resting content of the slot under the field. Shared, because the input
     handler puts it back the moment a problem stops applying. */
  const CLAIM_HINT = `<span class="plat-fhint" id="appClaimCode-hint">Twelve characters, in the
    shape MU-XXXX-XXXX. Capitals, dashes and stray spaces are all handled for you.</span>`;

  const NOTE_GLYPH = `
    <svg class="plat-note__icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true">
      <circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.2"/><path d="M12 16.4h.01"/>
    </svg>`;

  /* One component for every claim outcome that is not a success, on the
     dashboard's callout geometry. The heading names what happened, the body
     says what to do about it, and the tint is a cue the message never depends
     on - schema 5 and 9. */
  function claimNote(problem, detail) {
    const COPY = {
      empty: {
        severe: false,
        title: "Enter your claim code",
        body: "The code is printed on the gift you were sent."
      },
      /* An unknown code and a malformed one are answered identically, so the
         page cannot be used to work out which codes exist. */
      invalid: {
        severe: true,
        title: "We couldn't validate that code",
        body: "Check it against the gift it came on. Codes never contain the letters I, L, O or U, or the digits 0 or 1."
      },
      /* Names no one: not who claimed it, and not when. */
      "already-claimed": {
        severe: true,
        title: "This gift has already been claimed",
        body: "A claim code works once. If you think this is wrong, the person who sent it can check their order with support."
      },
      expired: {
        severe: true,
        title: "This gift can no longer be claimed",
        body: `It passed its claim date${detail ? ` on <strong>${e(detail)}</strong>` : ""}. The person who sent it can check their order with support.`
      }
    };
    const copy = COPY[problem];
    if (!copy) return "";
    return `
      <div class="plat-note ${copy.severe ? "plat-note--problem" : ""}" role="alert">
        ${NOTE_GLYPH}
        <div>
          <p class="plat-note__title">${copy.title}</p>
          <p class="plat-note__body">${copy.body}</p>
        </div>
      </div>`;
  }

  function renderAppClaim() {
    const c = state.appClaim;
    if (c.gift) return renderAppClaimSuccess(c.gift);

    const busy = c.status === "checking";
    const detail = c.problem === "expired" && c.expiredOn ? formatDate(new Date(c.expiredOn)) : "";

    return `
      <div class="plat-col">
        ${/* Back goes to the platform's home, which is the mentor listing. */ ""}
        <a class="plat-back" href="#/app">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9.5 2.5 4.5 7l5 4.5"/>
          </svg>
          All mentors
        </a>

        <p class="plat-lede">Enter the code from your gift and its credits are added to this account —
          ${e(SESSION.email)}. Nothing else is needed.</p>

        <section class="plat-card">
          <form id="app-claim-form" novalidate ${busy ? 'aria-busy="true"' : ""}>
            <label class="plat-flabel" for="appClaimCode">Claim code</label>
            <div class="plat-field plat-field--code" data-disabled="${busy ? "true" : "false"}">
              <input id="appClaimCode" data-field="appClaimCode" type="text" inputmode="text"
                     autocomplete="off" autocapitalize="characters" spellcheck="false"
                     maxlength="20" value="${e(c.input)}" placeholder="MU-XXXX-XXXX"
                     ${busy ? "disabled" : ""}
                     aria-invalid="${c.problem ? "true" : "false"}"
                     aria-describedby="${c.problem ? "app-claim-note" : "appClaimCode-hint"}">
            </div>

            ${/* One supporting block under the field, never two. A note answers
                  the same question the hint was answering and answers it about
                  the code actually typed, so it takes the hint's place rather
                  than stacking on top of it - which keeps the hierarchy clean
                  and roughly halves how far the button moves. */ ""}
            <div class="plat-fieldnote" id="app-claim-note">${
              c.problem ? claimNote(c.problem, detail) : CLAIM_HINT}</div>

            <div class="plat-actions">
              <button class="plat-btn plat-btn--primary plat-btn--full" type="submit"
                      data-claim-submit ${busy ? "disabled" : ""}>
                ${busy ? '<span class="plat-spinner" aria-hidden="true"></span>Checking your code' : "Claim this gift"}
              </button>
            </div>
          </form>

          ${prototypeCodeReference()}
        </section>
      </div>`;
  }

  function renderAppClaimSuccess(g) {
    const balance = readBalance(SESSION.email);
    const until = validityEnd(g.claimedAt, g.validityLabel);

    return `
      <div class="plat-col">
        <section class="plat-card plat-ok">
          ${/* The rakhi again, at the size the moment deserves: two woven cords
                running into a central knot, with the success badge as the knot.
                Same motif and same single colour as the header action, so the
                occasion is referenced twice in one language rather than twice
                in two. The cords are decoration and are hidden from assistive
                technology; the badge and the wording carry the meaning. */ ""}
          <div class="plat-ok__crest">
            ${OK_CORD}
            <div class="plat-ok__badge" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor"
                   stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 16.5 13.5 22 24 11"/>
              </svg>
            </div>
            ${OK_CORD}
          </div>

          <h1 class="plat-ok__title" tabindex="-1">Gift claimed</h1>
          <p class="plat-ok__sub">${e(g.credits)} credits are in
            <strong>${e(SESSION.name)}</strong>'s account and ready to use now.</p>

          ${creditChip(g.credits)}

          <dl class="plat-rows">
            <div>
              <dt>Gift</dt>
              <dd>${e(g.giftName)} · ${e(g.range)}</dd>
            </div>
            <div>
              <dt>Added to</dt>
              <dd>${e(SESSION.email)}</dd>
            </div>
            <div>
              <dt>Balance now</dt>
              <dd>${e(balance)} credits
                <span>Enough for ${e(conversationsFor(balance))}. A conversation costs 1 to 3 credits,
                  always shown before you book.</span></dd>
            </div>
            <div>
              <dt>Valid until</dt>
              ${/* The clock starts on the day of claiming - the rule this build
                    already states on every gift design and on the confirmation. */ ""}
              <dd>${until ? e(formatDate(until)) : e(g.validityLabel)}
                <span>${e(g.validityLabel)}, counted from today — the day you claimed it.</span></dd>
            </div>
          </dl>

          <div class="plat-actions">
            ${/* Both actions now land somewhere real: the mentor listing the
                  credits are for, and the page that itemises them. */ ""}
            <a class="plat-btn plat-btn--primary" href="#/app">Find a mentor</a>
            <a class="plat-btn plat-btn--ghost" href="#/app/credits">Your credits</a>
          </div>
        </section>
      </div>`;
  }

  /* Developer-facing, shut by default, and following the same `details`
     convention the confirmation page already uses for its engineering
     reference. The claim surface a stakeholder walks through carries no test
     instructions unless they open this. */
  function prototypeCodeReference() {
    const rows = PROTOTYPE_CODES.map((f) => {
      const code = prototypeCode(f.payload);
      const record = readLedger()[code];
      const live = !record ? "missing"
        : record.status === "claimed" ? "claimed"
        : codeExpired(record) ? "expired"
        : "unclaimed";
      return `<tr><td>${e(code)}</td><td>${e(live)}</td><td>${e(f.note)}</td></tr>`;
    }).join("");

    const invalidRows = PROTOTYPE_INVALID
      .map((f) => `<tr><td>${e(f.code)}</td><td>invalid</td><td>${e(f.note)}</td></tr>`).join("");

    return `
      <details class="plat-dev">
        <summary>Prototype reference: claim codes for testing</summary>
        <div class="plat-dev__scroll">
          <table>
            <caption>Seeded into this browser on load. A code claimed here stays claimed, so the
              single-use rule holds across reloads. Reset restores only these five.</caption>
            <thead><tr><th>Code</th><th>State now</th><th>What it demonstrates</th></tr></thead>
            <tbody>${rows}${invalidRows}</tbody>
          </table>
        </div>
        <div class="plat-actions">
          <button class="plat-btn plat-btn--ghost" type="button" data-action="reset-prototype-codes">
            Reset prototype codes
          </button>
        </div>
      </details>`;
  }

  /* ------------------------------------------------------------ routing -- */

  function currentRoute() {
    const raw = rawRoute();
    if (ROUTES.includes(raw)) return raw;
    /* `claim/<code>` is the address the gift card, the email button and the
       WhatsApp button all point at. It resolves to the claim page like a bare
       `claim` does; the code it carries is picked up in render(). */
    return /^claim\/[^/]+$/.test(raw) ? "claim" : "";
  }

  function rawRoute() {
    return window.location.hash.replace(/^#\/?/, "").replace(/\/$/, "");
  }

  /* The code out of a `claim/<code>` address, if there is one. Normalised the
     same way a typed code is, so a link and a keystroke reach the same lookup. */
  function routeClaimCode() {
    const found = /^claim\/([^/]+)$/.exec(rawRoute());
    return found ? displayCode(found[1]) : "";
  }

  function redirect(route) { window.setTimeout(() => navigate(route), 0); return ""; }

  /* Each history entry is stamped with a rising number, because `popstate` says
     the user moved but never which way. Comparing the entry's stamp with the one
     we were on tells a Back press from a Forward one.

     Routing pushes the entry itself rather than assigning `location.hash`: the
     assignment fires `popstate` before the stamp can be written, which would make
     every ordinary step forward look like a step back. */
  let navIndex = 0;
  const stampEntry = (n) => {
    try { window.history.replaceState({ giftNav: n }, ""); }
    catch (_error) { /* History unavailable - back navigation simply won't reset. */ }
  };
  stampEntry(0);

  function navigate(route) {
    const next = `#/${route}`;
    if (window.location.hash === next) { render(); return; }
    navIndex += 1;
    try { window.history.pushState({ giftNav: navIndex }, "", next); }
    catch (_error) { window.location.hash = next; return; }
    render();
  }

  /* Stepping backwards abandons the gift, so Back and a refresh leave the same
     clean page. Every in-page way of revising a gift - "Back to the gift" in the
     editor, "Back" in the checkout, "Edit the gift" after a failed payment -
     moves forward through history, so the work those are meant to keep never
     reaches this handler. */
  window.addEventListener("popstate", (event) => {
    const to = event.state && typeof event.state.giftNav === "number" ? event.state.giftNav : null;
    if (to === null) {
      /* An entry this app did not stamp: a plain `href="#/…"` link, which is
         always a step forward. Stamp it so the next Back press can be read. */
      navIndex += 1;
      stampEntry(navIndex);
      return;
    }
    const backwards = to < navIndex;
    navIndex = to;
    if (backwards) resetGift();
  });

  const RENDERERS = {
    "": renderLanding,
    "gift": renderConfig,
    "personalise": renderEditor,
    "checkout": renderCheckout,
    "gift/confirmed": renderConfirmed,
    "app": renderAppMentors,
    "app/credits": renderAppHome,
    "app/claim": renderAppClaim
  };

  let lastRoute = null;

  function render() {
    let route = currentRoute();

    /* A printed address is resolved here, synchronously, rather than by
       rendering the old route and then navigating: there is no flash of the
       wrong shell, and no second history entry for Back to bounce off.
       `replaceState` fires neither hashchange nor popstate, so this cannot
       loop. */
    if (ROUTE_ALIASES[route]) {
      /* A code in the address is carried across to the claim field, so the
         button on the card, the email and the WhatsApp message all land on a
         page that already knows which gift is being claimed. */
      const linked = routeClaimCode();
      route = ROUTE_ALIASES[route];
      try { window.history.replaceState({ giftNav: navIndex }, "", `#/${route}`); }
      catch (_error) { /* History unavailable - the alias still renders below. */ }
      if (linked) {
        state.appClaim = { ...initialState().appClaim, input: linked };
        lastRoute = route;
      }
    }

    const platform = PLATFORM_ROUTES.includes(route);

    if (route !== lastRoute) {
      /* A check still in flight is abandoned when the page is left, so it can
         never resolve - and quietly spend a code - against a screen that is no
         longer there. */
      if (timers.claim) { window.clearTimeout(timers.claim); timers.claim = null; }
      /* Arriving at the claim page always starts clean. A finished claim is
         not a screen to come back to: the credits are on the credits page, and
         the code that produced them is spent. */
      if (route === "app/claim") state.appClaim = { ...initialState().appClaim };
    }

    /* One shell or the other, never both: the marketing site and the
       signed-in dashboard are different design systems. #app is moved between
       them rather than duplicated, so there is still one mount point and every
       existing `app.querySelector` keeps working on either surface. */
    document.body.dataset.surface = platform ? "platform" : "site";
    /* Lets the shared topbar carry chrome that belongs to one route only -
       the mentor search - without the shell being rebuilt per page. */
    document.body.dataset.route = route;
    platShell.hidden = !platform;
    const home = platform ? platView : pageMain;
    if (app.parentElement !== home) home.appendChild(app);

    app.innerHTML = (RENDERERS[route] || renderLanding)();
    document.title = `${ROUTE_TITLES[route] || "Gift a Career"} · MentorUnion`;
    markPreviewInert();
    fitPrintPreview();
    restoreComic();

    /* The dashboard's topbar carries the page title, so it is set here rather
       than drawn by the page. */
    if (platform) platTitle.textContent = ROUTE_TITLES[route];

    document.querySelectorAll("[data-nav]").forEach((link) => {
      link.dataset.current = String(link.dataset.nav === "gift"
        && ["gift", "personalise", "checkout", "gift/confirmed"].includes(route));
    });
    document.querySelectorAll("[data-app-nav]").forEach((link) => {
      const current = link.dataset.appNav === route;
      link.dataset.current = String(current);
      if (current) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    if (route !== lastRoute) {
      window.scrollTo({ top: 0, behavior: "auto" });
      /* On the dashboard the page title lives in the shared topbar, so that is
         what receives focus on a route change. */
      const target = platform ? platTitle : app.querySelector("[tabindex='-1']");
      target?.focus({ preventScroll: true });
      lastRoute = route;
    }
    closeMenu();
  }

  /* --------------------------------------------------------- validation -- */

  function isValidEmail(value) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(value).trim()); }
  function containsLink(value) { return /(https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|in|io|co)\b)/i.test(String(value)); }
  /* The country's calling code is chosen, not typed, so this checks the national
     number alone: digits, spaces and the separators people paste, nothing else.
     Lengths run from 4 (Niue) to 13 (Austria) nationally. */
  function phoneDigits(value) { return String(value || "").replace(/\D/g, ""); }
  function isValidPhone(value) {
    /* A `+` means the country code has been typed in as well, which would dial
       it twice. The selector is the only place a calling code comes from. */
    if (String(value).includes("+")) return false;
    if (/[^\d\s()\-.]/.test(String(value))) return false;
    const digits = phoneDigits(value);
    return digits.length >= 4 && digits.length <= 14;
  }

  /* Copy that names the recipient has to read as a sentence when no name was
     given, which an unfilled flow now allows. The card designs already mark an
     empty name as {{Their name}}; running prose cannot, so it stands them in. */
  function recipientLabel(name = state.form.recipientName) {
    return String(name || "").trim() || "your recipient";
  }

  /* Written the way it would be dialled internationally. */
  function phoneDisplay(f = state.form) {
    return f.recipientPhone.trim() ? `+${dialOf(f.recipientCountry)} ${f.recipientPhone.trim()}` : "";
  }
  function phoneE164(f = state.form) {
    return f.recipientPhone.trim() ? dialOf(f.recipientCountry) + phoneDigits(f.recipientPhone) : "";
  }

  function validateField(name, raw) {
    const value = String(raw ?? "").trim();
    /* Requiredness is the only thing suspended. An empty field passes; a filled
       one is checked exactly as before, so the rules below still hold and still
       demonstrate themselves the moment anything is typed. */
    if (!REQUIRE_DETAILS && !value) return "";
    switch (name) {
      case "recipientName":
        if (!value) return "Add their name.";
        if (value.length > NAME_MAX) return `Keep this under ${NAME_MAX} characters.`;
        return "";
      case "recipientEmail":
        /* Only required when the gift is actually being emailed. A printed card
           is handed over in person, so no address exists to ask for. */
        if (!state.delivery.email) return value && !isValidEmail(value) ? "That doesn't look like a complete email address." : "";
        if (!value) return "Add the address the gift should go to.";
        if (!isValidEmail(value)) return "That doesn't look like a complete email address.";
        if (value.toLowerCase() === state.form.purchaserEmail.trim().toLowerCase())
          return "This is your own address. Use theirs so it lands with them.";
        return "";
      case "purchaserName":
        if (!value) return "Add your name so they know who it's from.";
        if (value.length > NAME_MAX) return `Keep this under ${NAME_MAX} characters.`;
        return "";
      case "purchaserEmail":
        if (!value) return "Add your address for the receipt.";
        if (!isValidEmail(value)) return "That doesn't look like a complete email address.";
        return "";
      case "recipientPhone":
        /* Never required: the purchaser sends the WhatsApp message themselves, so
           a number only saves them picking the contact. It is still checked when
           one is given, so a malformed number never reaches the share link. */
        if (!value) return "";
        if (!isValidPhone(value)) return `Enter just the number - +${dialOf(state.form.recipientCountry)} is already set.`;
        return "";
      case "message":
        if (value.length > MESSAGE_MAX) return `Your note is ${value.length - MESSAGE_MAX} characters over.`;
        if (containsLink(value)) return "Links can't be included in the note.";
        return "";
      case "delivery":
        if (!state.delivery.email && !state.delivery.printable && !state.delivery.whatsapp) return "Choose at least one way to give it.";
        return "";
      case "scheduleDate":
        if (!state.delivery.email || state.delivery.when !== "later") return "";
        if (!value) return "Pick the date it should arrive.";
        if (value < todayISO()) return "Pick today or a later date.";
        if (value > maxScheduleISO()) return "Pick a date within the next year.";
        return "";
      case "scheduleTime": {
        if (!state.delivery.email || state.delivery.when !== "later") return "";
        if (!value) return "Pick a time.";
        const at = scheduledAt({ ...state.delivery, time: value });
        if (at && at.getTime() < Date.now() + 5 * 60 * 1000) return "Pick a time later today, or a later date.";
        return "";
      }
      default: return "";
    }
  }

  function validateGroup(names) {
    let ok = true;
    names.forEach((name) => {
      const value = name === "scheduleDate" ? state.delivery.date
        : name === "scheduleTime" ? state.delivery.time
        : name === "delivery" ? ""
        : state.form[name];
      const error = validateField(name, value);
      if (error) { state.errors[name] = error; ok = false; } else delete state.errors[name];
    });
    return ok;
  }

  function requiredNames() {
    const names = ["recipientName", "recipientEmail", "recipientPhone", "purchaserName", "purchaserEmail", "message", "delivery"];
    if (state.delivery.email && state.delivery.when === "later") names.push("scheduleDate", "scheduleTime");
    return names;
  }

  /* A channel toggle re-renders the section it lives in, which would otherwise
     drop focus to the body and strand keyboard users mid-choice. */
  function restoreChannelFocus(action) {
    window.setTimeout(() => app.querySelector(`.channel-card[data-action="${action}"]`)?.focus({ preventScroll: true }), 0);
  }

  function focusFirstError() {
    window.setTimeout(() => {
      const el = app.querySelector('[aria-invalid="true"]');
      if (el) { el.focus(); el.scrollIntoView({ block: "center", behavior: "smooth" }); }
    }, 0);
  }

  /* Everything the checkout needs is collected on the gifting page, so both the
     direct action and the editor's action verify it here - the editor never
     hands an incomplete gift to the provider. */
  function commitToPayment() {
    if (!validateGroup(requiredNames())) {
      if (currentRoute() !== "gift") { navigate("gift"); window.setTimeout(focusFirstError, 60); }
      else { render(); focusFirstError(); }
      announce("Check the highlighted details.");
      return;
    }
    state.committed = true;
    navigate("checkout");
  }

  /* ------------------------------------------------------------ payment -- */

  function startPayment(outcome) {
    if (state.payment.status === "processing") return;
    state.payment.status = "processing";
    state.payment.failure = "";
    render();
    announce("Confirming your payment.");
    timers.payment = window.setTimeout(() => {
      if (outcome === "success") completeOrder();
      else {
        state.payment.status = "failed";
        state.payment.failure = "Your bank declined the payment.";
        render();
        announce("Payment failed. Your gift has not been sent.");
      }
    }, 1500);
  }

  function cancelPayment() {
    if (timers.payment) window.clearTimeout(timers.payment);
    state.payment.status = "cancelled";
    render();
    announce("Checkout closed. Nothing was charged and your gift has not been sent.");
  }

  /* The only place a code is ever minted, and the only place delivery is ever
     triggered - both hang off the success path and nothing else. */
  function completeOrder() {
    const g = gift();
    const q = quote(g);
    const t = design();
    const order = {
      reference: orderReference(),
      giftName: g.name,
      credits: g.credits,
      range: conversationLabel(g),
      validityLabel: g.validityLabel,
      designId: t.id,
      designName: t.name,
      custom: custom(),
      total: q.total,
      recipientName: state.form.recipientName.trim(),
      recipientEmail: state.form.recipientEmail.trim(),
      recipientPhone: phoneDisplay(),
      recipientPhoneE164: phoneE164(),
      senderName: firstName(state.form.purchaserName) || "someone",
      purchaserEmail: state.form.purchaserEmail.trim(),
      message: state.form.message,
      delivery: { ...state.delivery }
    };
    /* The one and only place a code is minted. Delivery, including every retry
       below, re-sends this same order; nothing downstream can issue a second
       code or a second gift. */
    order.code = issueCode(order);
    order.emailDelivery = initialEmailDelivery(order);
    state.order = order;
    state.payment.status = "idle";
    navigate("gift/confirmed");

    /* The point at which the server would call the Cloud API. Logged rather than
       sent, so the team walking this prototype can read the exact request the
       integration has to make without one being made. */
    if (order.delivery.whatsapp) {
      /* eslint-disable-next-line no-console */
      console.info("[SIMULATED] WhatsApp Cloud API request that would be issued now:", waRequest(order));
    }
    /* eslint-disable-next-line no-console */
    console.info("[SIMULATED] Purchaser receipt that would be emailed now:", purchaserReceiptEmail(order));

    /* SIMULATED. Immediate email delivery starts on the success path and
       nowhere else. A scheduled gift waits, and PDF-only or WhatsApp-only gifts
       send no email at all. */
    if (order.emailDelivery.status === "pending") window.setTimeout(attemptGiftEmail, 300);

    announce(order.delivery.email && order.delivery.when === "later"
      ? "Payment successful. Your gift is scheduled and the claim code is ready."
      : "Payment successful. Your gift is ready and the claim code has been created.");
  }

  /* --------------------------------------------------------- comic strip -- */

  /* The track is the source of truth for which panel is showing: the dots read
     its scroll position rather than a separate index, so a swipe, a trackpad
     nudge, an arrow press and a dot press can never disagree. No auto-advance -
     the strip is an aside and only moves when someone moves it. */
  function comicTrack() { return app.querySelector("[data-comic-track]"); }

  function comicIndex(track) {
    const panel = track.querySelector(".comic__panel");
    if (!panel) return 0;
    const step = panel.getBoundingClientRect().width + comicGap(track);
    return step > 0 ? Math.round(track.scrollLeft / step) : 0;
  }

  function comicGap(track) {
    const gap = parseFloat(getComputedStyle(track).columnGap);
    return Number.isNaN(gap) ? 0 : gap;
  }

  function comicGo(index, { smooth = true } = {}) {
    const track = comicTrack();
    if (!track) return;
    const panel = track.querySelector(".comic__panel");
    if (!panel) return;
    const max = COMIC_SCENES.length - 1;
    const to = Math.min(Math.max(index, 0), max);
    state.comicScene = to;
    track.scrollTo({
      left: to * (panel.getBoundingClientRect().width + comicGap(track)),
      behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto"
    });
    syncComicDots(to);
  }

  function syncComicDots(index) {
    app.querySelectorAll("[data-comic-go]").forEach((dot) => {
      dot.setAttribute("aria-selected", String(Number(dot.dataset.comicGo) === index));
    });
    const first = index === 0;
    const last = index === COMIC_SCENES.length - 1;
    app.querySelectorAll("[data-comic-step]").forEach((btn) => {
      const back = Number(btn.dataset.comicStep) < 0;
      btn.disabled = back ? first : last;
    });
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* renderConfig rebuilds on every design or gift change, which would otherwise
     snap the strip back to panel one mid-read. The panel is remembered and
     restored without animation. */
  function restoreComic() {
    const track = comicTrack();
    if (!track) return;
    if (state.comicScene) comicGo(state.comicScene, { smooth: false });
    else syncComicDots(0);
    if (track.dataset.bound === "true") return;
    track.dataset.bound = "true";
    let raf = 0;
    track.addEventListener("scroll", () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const i = comicIndex(track);
        state.comicScene = i;
        syncComicDots(i);
      });
    }, { passive: true });
    track.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      comicGo(comicIndex(track) + (event.key === "ArrowRight" ? 1 : -1));
    });
  }

  /* ------------------------------------------------------ announcements -- */

  function announce(message) {
    liveRegion.textContent = "";
    window.setTimeout(() => { liveRegion.textContent = message; }, 50);
  }

  function toast(message) {
    if (timers.toast) window.clearTimeout(timers.toast);
    toastRegion.innerHTML = `<p class="toast">${e(message)}</p>`;
    timers.toast = window.setTimeout(() => { toastRegion.innerHTML = ""; }, 3600);
  }

  /* ---------------------------------------------------------- nav menu -- */

  /* The collapsed state is the stylesheet's default below the breakpoint, so the
     menu is shut on mobile and tablet before this script runs and stays shut if
     it never does. JS only ever opens it. */
  function menuIsCollapsed() { return window.matchMedia("(max-width: 64rem)").matches; }

  function setMenu(open) {
    navInner.dataset.menu = open ? "open" : "closed";
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  function closeMenu() { setMenu(false); }

  /* ------------------------------------------------------------- events -- */

  document.addEventListener("click", (event) => {
    const nativePicker = event.target.closest("[data-native-picker]");
    if (nativePicker && typeof nativePicker.showPicker === "function") {
      try { nativePicker.showPicker(); } catch (_error) { /* Native fallback remains available. */ }
    }

    if (event.target.closest("[data-inert-nav]")) {
      /* Unrelated navbar and footer destinations stay visible but do not
         navigate anywhere in this prototype. */
      event.preventDefault();
      toast("Outside this prototype - only the gifting journey is built.");
      closeMenu();
      return;
    }

    /* Tapping the page outside an open menu closes it. */
    if (navInner.dataset.menu === "open" && !event.target.closest(".nav-inner")) closeMenu();

    /* The persistent action is a link, so pressing it while already on the
       claim page changes no hash and fires no navigation. Left alone, it would
       do visibly nothing to someone sitting on a finished claim with a second
       gift to redeem. It returns the page to a clean form instead. */
    if (event.target.closest('[data-app-nav="app/claim"]') && currentRoute() === "app/claim") {
      event.preventDefault();
      const c = state.appClaim;
      if (c.gift || c.problem || c.input) {
        state.appClaim = { ...initialState().appClaim };
        render();
      }
      window.setTimeout(() => app.querySelector("#appClaimCode")?.focus(), 0);
      return;
    }

    /* The comic moves the track directly rather than going through render(),
       so nothing typed into the gifting form below it is rebuilt. */
    const comicStep = event.target.closest("[data-comic-step]");
    if (comicStep) {
      const track = comicTrack();
      if (track) comicGo(comicIndex(track) + Number(comicStep.dataset.comicStep));
      return;
    }
    const comicDot = event.target.closest("[data-comic-go]");
    if (comicDot) { comicGo(Number(comicDot.dataset.comicGo)); return; }

    const trigger = event.target.closest("[data-action]");
    if (!trigger) return;

    switch (trigger.dataset.action) {
      case "toggle-menu": setMenu(navInner.dataset.menu !== "open"); break;

      case "go":
        event.preventDefault();
        navigate(trigger.dataset.route);
        break;

      case "choose-gift": {
        state.giftId = trigger.dataset.gift;
        app.querySelectorAll('[data-action="choose-gift"]').forEach((card) => {
          card.setAttribute("aria-pressed", String(card.dataset.gift === state.giftId));
        });
        updateTotals();
        updatePreview();
        announce(`${GIFTS[state.giftId].name} selected.`);
        break;
      }

      case "choose-design": {
        state.designId = trigger.dataset.design;
        if (currentRoute() === "personalise") { render(); announce(`${design().name} template selected.`); break; }
        app.querySelectorAll('[data-action="choose-design"]').forEach((card) => {
          card.setAttribute("aria-pressed", String(card.dataset.design === state.designId));
        });
        const label = app.querySelector("[data-design-name]");
        if (label) label.textContent = design().occasion;
        const nudge = app.querySelector("[data-nudge]");
        if (nudge) nudge.textContent = design().nudge;
        updatePreview({ full: true });
        announce(`${design().name} design selected.`);
        break;
      }

      /* The editor commits straight to the provider, so the gift has to be
         complete before it opens. */
      case "personalise-more": {
        if (!PERSONALISE_ENABLED) { toast(PERSONALISE_OFF); announce(PERSONALISE_OFF); break; }
        if (!validateGroup(requiredNames())) {
          render();
          focusFirstError();
          announce("Check the highlighted details before personalising.");
          break;
        }
        navigate("personalise");
        break;
      }

      case "set-editor-group":
        state.editor.group = trigger.dataset.value;
        render();
        break;

      case "set-region":
        state.editor.region = trigger.dataset.value;
        render();
        break;

      case "set-custom": {
        setCustom({ [trigger.dataset.key]: trigger.dataset.value });
        render();
        break;
      }

      case "set-preset":
        /* A palette replaces any hand-picked background: the two would otherwise
           silently disagree about which one is in force. */
        setCustom({ preset: trigger.dataset.value, bg: "", accent: "" });
        render();
        break;

      case "clear-colour":
        setCustom({ [trigger.dataset.key]: "" });
        render();
        break;

      case "reset-design":
        delete state.custom[state.designId];
        render();
        announce(`${design().name} reset to the original design.`);
        break;

      case "commit": commitToPayment(); break;

      /* Channels are pressed toggles, so they arrive here rather than as a form
         change. Any combination is valid; none starts pressed. */
      case "toggle-email":
        state.delivery.email = !state.delivery.email;
        delete state.errors.delivery;
        delete state.errors.recipientEmail;
        if (!state.delivery.email) { delete state.errors.scheduleDate; delete state.errors.scheduleTime; }
        render();
        restoreChannelFocus("toggle-email");
        break;

      case "toggle-whatsapp":
        state.delivery.whatsapp = !state.delivery.whatsapp;
        delete state.errors.delivery;
        if (!state.delivery.whatsapp) delete state.errors.recipientPhone;
        render();
        restoreChannelFocus("toggle-whatsapp");
        break;

      case "toggle-printable":
        state.delivery.printable = !state.delivery.printable;
        delete state.errors.delivery;
        render();
        restoreChannelFocus("toggle-printable");
        break;

      case "toggle-preview": {
        state.previewOpen = !state.previewOpen;
        const body = app.querySelector("#preview-body");
        if (body) body.hidden = !state.previewOpen;
        trigger.setAttribute("aria-expanded", String(state.previewOpen));
        trigger.textContent = state.previewOpen ? "Hide preview" : "Show preview";
        break;
      }

      case "pay-success": startPayment("success"); break;
      case "pay-failure": startPayment("failure"); break;
      case "pay-cancel": cancelPayment(); break;

      case "retry-payment":
        state.payment.status = "idle";
        state.payment.failure = "";
        render();
        break;

      case "copy-code": {
        const code = state.order?.code || "";
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(code).then(() => toast("Claim code copied."), () => toast(code));
        } else toast(code);
        break;
      }

      /* SIMULATED PDF. The printable card is real geometry - 5 x 7 inches at
         full bleed - but it is the browser's own print pipeline that renders it,
         not a PDF generator in the page. */
      case "print-card": window.print(); break;

      case "gift-again":
        resetGift();
        navigate("gift");
        break;

      /* SIMULATED delivery controls, inside the collapsed engineering block. */
      case "toggle-email-failure":
        state.forceEmailFailure = !state.forceEmailFailure;
        render();
        app.querySelector(".dev-note")?.setAttribute("open", "");
        break;

      case "retry-gift-email": {
        const d = state.order?.emailDelivery;
        if (!d) break;
        /* Sending again, whether after success or after giving up, starts the
           allowance over. It re-sends this same order either way: the code was
           minted once at payment and nothing here can mint another. */
        if (d.status === "failed" || d.status === "sent") { d.attempts = 0; d.status = "pending"; }
        attemptGiftEmail();
        app.querySelector(".dev-note")?.setAttribute("open", "");
        break;
      }

      case "claim-confirm": claimConfirm(); break;

      case "claim-signout":
        state.claim.account = "";
        render();
        break;

      case "claim-restart":
        state.claim = { ...initialState().claim, account: state.claim.account };
        render();
        break;

      /* The listing re-renders, so focus is put back on the control that was
         pressed - otherwise a keyboard user is dropped to the top of the page
         every time they change an agenda. */
      case "set-agenda":
      case "set-subfilter":
      case "set-mentor-sort": {
        const key = { "set-agenda": "agenda", "set-subfilter": "sub", "set-mentor-sort": "sort" }[trigger.dataset.action];
        state.mentors[key] = trigger.dataset.value;
        const back = `[data-action="${trigger.dataset.action}"][data-value="${CSS.escape(trigger.dataset.value)}"]`;
        render();
        window.setTimeout(() => app.querySelector(back)?.focus({ preventScroll: true }), 0);
        break;
      }

      /* Developer control inside the collapsed reference block. Restores the
         five fixtures to their documented states and leaves every genuinely
         issued code, and every balance, exactly where it is. */
      case "reset-prototype-codes": {
        seedPrototypeCodes({ force: true });
        state.appClaim = { ...initialState().appClaim };
        render();
        const details = app.querySelector(".plat-dev");
        if (details) details.open = true;
        toast("Prototype claim codes reset.");
        break;
      }

      default: break;
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;

    if (target.dataset.action === "set-delivery") {
      state.delivery.when = target.value;
      /* The date and time are kept when switching back to immediate delivery,
         so toggling between the two options never discards a chosen slot. */
      if (target.value === "now") { delete state.errors.scheduleDate; delete state.errors.scheduleTime; }
      render();
      if (target.value === "later") window.setTimeout(() => app.querySelector("#scheduleDate")?.focus(), 0);
      return;
    }
    if (target.dataset.field === "recipientCountry") {
      state.form.recipientCountry = target.value;
      /* The number itself may now be the wrong length for the new country. */
      validateGroup(["recipientPhone"]);
      render();
      window.setTimeout(() => app.querySelector("#recipientCountry")?.focus({ preventScroll: true }), 0);
      return;
    }
    if (target.dataset.action === "set-method") { state.payment.method = target.value; render(); return; }
    /* The picker repaints the card live on `input`; the panel catches up once
       the picker closes, so the Reset control appears without interrupting a
       drag. */
    if (target.dataset.action === "set-colour") { render(); return; }
    /* Date and time inputs fire change, not input. */
    if (target.dataset.field === "scheduleDate" || target.dataset.field === "scheduleTime") {
      if (target.dataset.field === "scheduleDate") state.delivery.date = target.value;
      else state.delivery.time = target.value;
      /* Re-check both: a date change can invalidate an already-valid time. */
      validateGroup(["scheduleDate", "scheduleTime"]);
      render();
      window.setTimeout(() => app.querySelector(`#${target.id}`)?.focus(), 0);
    }
  });

  /* Live colour input: repaint the card without rebuilding the panel, so the
     native picker stays open while the user drags. */
  document.addEventListener("input", (event) => {
    const target = event.target;

    if (target.dataset.action === "set-colour") {
      setCustom({ [target.dataset.key]: target.value });
      const mount = app.querySelector("#preview-mount");
      if (mount) { mount.innerHTML = emailCard(); markPreviewInert(); }
      const readout = target.parentElement?.querySelector(".colour-input__value");
      if (readout) readout.textContent = target.value.toUpperCase();
      return;
    }

    const name = target.dataset.field;
    if (!name) return;

    if (name === "claimCode") {
      /* Uppercase in place and nothing else. Reformatting mid-word fights the
         typist and pasting a code from a card has to survive either shape, so
         separators and the MU prefix are normalised only at lookup. */
      const upper = target.value.toUpperCase();
      if (upper !== target.value) {
        const at = target.selectionStart;
        target.value = upper;
        target.setSelectionRange(at, at);
      }
      state.claim.input = upper;
      if (state.claim.errors.claimCode) {
        delete state.claim.errors.claimCode;
        target.setAttribute("aria-invalid", "false");
        const slot = app.querySelector("#claimCode-error");
        if (slot) slot.textContent = "";
      }
      return;
    }
    if (name === "claimAccount") {
      state.claim.account = target.value;
      return;
    }

    if (name === "appClaimCode") {
      /* Uppercase in place, caret held, and nothing else. Reformatting between
         keystrokes fights the typist, and a code pasted off a card has to
         survive whatever shape it arrives in - separators, spaces and the MU
         prefix are all reconciled at submit, not here. */
      const upper = target.value.toUpperCase();
      if (upper !== target.value) {
        const at = target.selectionStart;
        target.value = upper;
        target.setSelectionRange(at, at);
      }
      state.appClaim.input = upper;
      /* An answered problem stops applying the moment the code changes, but a
         new one is never raised mid-typing. */
      if (state.appClaim.problem) {
        state.appClaim.problem = "";
        state.appClaim.expiredOn = "";
        target.setAttribute("aria-invalid", "false");
        target.setAttribute("aria-describedby", "appClaimCode-hint");
        /* The hint returns to the slot the note was occupying, so clearing a
           problem restores the resting layout rather than leaving a gap. */
        const slot = app.querySelector("#app-claim-note");
        if (slot) slot.innerHTML = CLAIM_HINT;
      }
      return;
    }

    if (name in state.form) state.form[name] = target.value;
    else if (name === "scheduleDate") state.delivery.date = target.value;

    if (name === "message") {
      const counter = app.querySelector("[data-counter]");
      if (counter) {
        counter.textContent = `${target.value.length}/${MESSAGE_MAX}`;
        counter.dataset.over = String(target.value.length > MESSAGE_MAX);
      }
    }

    /* Clear an error as soon as the field becomes valid; never introduce one
       mid-typing. */
    if (state.errors[name] && !validateField(name, target.value)) {
      delete state.errors[name];
      target.setAttribute("aria-invalid", "false");
      const slot = app.querySelector(`#${CSS.escape(name)}-error`);
      if (slot) slot.textContent = "";
    }

    updatePreview();
  });

  document.addEventListener("focusout", (event) => {
    const name = event.target.dataset?.field;
    /* Claim codes are answered on submit, never on blur: leaving the field is
       not a claim, and a blur-time verdict would clear the alert the submit
       just raised. */
    if (!name || name === "scheduleDate" || name === "claimCode" || name === "claimAccount"
        || name === "appClaimCode") return;
    const error = validateField(name, event.target.value);
    if (error) state.errors[name] = error; else delete state.errors[name];
    event.target.setAttribute("aria-invalid", error ? "true" : "false");
    const slot = app.querySelector(`#${CSS.escape(name)}-error`);
    if (slot) slot.textContent = error;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (navInner.dataset.menu === "open") {
      closeMenu();
      menuToggle.focus();
    }
  });

  /* Totals move with the gift size without re-rendering the form. */
  function updateTotals() {
    const g = gift();
    const q = quote(g);
    const total = app.querySelector("[data-total]");
    if (total) total.textContent = money(q.total);
    const label = app.querySelector(".summary-total__label");
    if (label) label.textContent = `${g.name} · ${conversationLabel(g)}`;
  }

  /* ---------------------------------------------------------- claiming -- */

  function claimLookup() {
    const raw = state.claim.input;
    if (!normaliseCode(raw)) {
      state.claim.errors.claimCode = "Enter the code from your gift.";
      return;
    }
    /* Shape and check character first: a malformed code is answered without the
       store ever being consulted, and an unknown code gets the same answer as an
       invalid one so the page cannot be used to discover which codes exist. */
    if (!codeWellFormed(raw)) { state.claim.stage = "invalid"; return; }
    const code = displayCode(raw);
    const record = readLedger()[code];
    if (!record) { state.claim.stage = "invalid"; return; }
    state.claim.code = code;
    state.claim.stage = record.status === "claimed" ? "claimed" : "found";
  }

  function claimConfirm() {
    const account = String(state.claim.account || "").trim();
    if (!isValidEmail(account)) {
      state.claim.errors.claimAccount = account ? "That doesn't look like a complete email address." : "Sign in to add the credits to an account.";
      render();
      window.setTimeout(() => app.querySelector("#claimAccount")?.focus(), 0);
      return;
    }
    const ledger = readLedger();
    const record = ledger[state.claim.code];
    /* Re-read at the moment of claiming: another tab may have claimed it since
       this page looked it up. */
    if (!record) { state.claim.stage = "invalid"; render(); return; }
    if (record.status === "claimed") { state.claim.stage = "claimed"; render(); announce("This gift code has already been claimed."); return; }

    record.status = "claimed";
    record.claimedAt = new Date().toISOString();
    writeLedger(ledger);
    addBalance(account, record.credits);
    state.claim.claimedCredits = record.credits;
    state.claim.stage = "done";
    state.claim.errors = {};
    render();
    announce(`${record.credits} credits added to your account.`);
  }

  /* ------------------------------------------ claiming inside the app --- */

  /* Two guards, both needed. `checking` stops a second Enter or a double-click
     while the first submission is in flight; `gift` stops a finished claim
     being submitted again at all. Neither depends on the button's disabled
     attribute, which is a presentation detail. */
  function appClaimSubmit() {
    const c = state.appClaim;
    if (c.status === "checking" || c.gift) return;

    /* Nothing typed is answered immediately: there is no lookup to simulate,
       and a spinner for an empty field is theatre. */
    if (!claimPayload(c.input)) {
      c.problem = "empty";
      c.expiredOn = "";
      render();
      window.setTimeout(() => app.querySelector("#appClaimCode")?.focus(), 0);
      return;
    }

    /* The checking state is applied in place rather than re-rendered, so focus
       stays on the button the user just pressed. */
    c.status = "checking";
    c.problem = "";
    c.expiredOn = "";
    const form = app.querySelector("#app-claim-form");
    const button = app.querySelector("[data-claim-submit]");
    const input = app.querySelector("#appClaimCode");
    if (form) form.setAttribute("aria-busy", "true");
    if (input) input.disabled = true;
    if (button) {
      button.disabled = true;
      button.innerHTML = '<span class="plat-spinner" aria-hidden="true"></span>Checking your code';
    }
    announce("Checking your claim code.");

    /* SIMULATED latency. Long enough for the pending state to be a real part
       of the experience, short enough not to be a wait. */
    timers.claim = window.setTimeout(() => {
      const result = resolveClaim(c.input, SESSION.email);
      c.status = "idle";

      if (result.outcome === "redeemed") {
        c.gift = result.gift;
        c.problem = "";
        render();
        /* The form - and the button focus was sitting on - has been replaced
           wholesale, so focus has to be placed deliberately rather than left
           to fall back to the document. The heading states the outcome. */
        window.setTimeout(() => app.querySelector(".plat-ok__title")?.focus({ preventScroll: true }), 0);
        announce(`${result.gift.credits} credits added to your account. Your balance is ${result.balance} credits.`);
        return;
      }

      c.problem = result.outcome;
      c.expiredOn = result.expiredOn || "";
      /* The typed value is kept: the user may only need to correct a
         character, and the alert is rendered beside it rather than replacing
         it. Focus returns to the field so the correction can just be typed. */
      render();
      window.setTimeout(() => {
        const field = app.querySelector("#appClaimCode");
        if (!field) return;
        field.focus();
        field.setSelectionRange(field.value.length, field.value.length);
      }, 0);
    }, 650);
  }

  document.addEventListener("submit", (event) => {
    if (event.target.id === "app-claim-form") {
      event.preventDefault();
      appClaimSubmit();
      return;
    }
    if (event.target.id === "claim-form") {
      event.preventDefault();
      state.claim.errors = {};
      claimLookup();
      render();
      if (state.claim.errors.claimCode) window.setTimeout(() => app.querySelector("#claimCode")?.focus(), 0);
      return;
    }
    if (event.target.id !== "config-form") return;
    event.preventDefault();
    commitToPayment();
  });

  window.addEventListener("hashchange", render);
  /* The preview scale is a screen-only concern: the print stylesheet drops the
     transform entirely, so the sheet always goes to the printer at 1:1. */
  window.addEventListener("resize", () => {
    if (!menuIsCollapsed()) closeMenu();
    fitPrintPreview();
  });

  closeMenu();
  /* SIMULATED. Puts the documented fixtures into the store before the first
     paint, so every claim state is reachable without buying a gift first. */
  seedPrototypeCodes();
  render();
})();
