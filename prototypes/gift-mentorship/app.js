/* Gift Mentorship — MentorUnion
   Hash-routed flow covering purchase, delivery, account access and redemption.
   State is held in sessionStorage for the current tab. */

(() => {
  "use strict";

  const STORAGE_KEY = "mentorunion-gift-flow-v2";
  const GST_RATE = 0.18;
  const RESEND_COOLDOWN = 30;

  /* Pack details, prices, feature copy, and tooltip text are transcribed from
     live/credit-purchase/pricing-page-research/b2c_pricing_landing_page.html. */
  const PACKS = {
    p4: {
      id: "p4",
      name: "Focus",
      description: "Turn one question into a clear next step",
      credits: 4,
      price: { INR: 4500, USD: 60 },
      referencePrice: { INR: 6000, USD: 80 },
      rate: { INR: 1125, USD: 15 },
      saving: 25,
      validityMonths: 2,
      validityLabel: "2 months",
      features: [
        { text: "Up to 4 one-on-one sessions" },
        { text: "Book any mentor on the platform" },
        { text: "Valid for 2 months" },
        { text: "Unused credits do not roll over" },
        { text: "Standard support", tip: "Response target: 24–48 hours." }
      ]
    },
    p10: {
      id: "p10",
      name: "Growth",
      description: "Shape direction with multiple perspectives",
      credits: 10,
      price: { INR: 10500, USD: 140 },
      referencePrice: { INR: 15000, USD: 200 },
      rate: { INR: 1050, USD: 14 },
      saving: 30,
      validityMonths: 4,
      validityLabel: "4 months",
      featured: true,
      features: [
        { text: "Up to 10 one-on-one sessions" },
        { text: "AI bot for mentor discovery", tip: "An AI bot helps you discover mentors on the platform." },
        { text: "Book any mentor on the platform" },
        { text: "Valid for 4 months" },
        { text: "Unused credits roll over +15 days" },
        { text: "Faster support", tip: "Response target: within 24 hours." }
      ]
    },
    p25: {
      id: "p25",
      name: "Accelerator",
      description: "Work towards a magical breakthrough",
      credits: 25,
      price: { INR: 22500, USD: 300 },
      referencePrice: { INR: 37500, USD: 500 },
      rate: { INR: 900, USD: 12 },
      saving: 40,
      validityMonths: 6,
      validityLabel: "6 months",
      features: [
        { text: "Up to 25 one-on-one sessions" },
        { text: "AI bot for mentor discovery", tip: "An AI bot helps you discover mentors on the platform." },
        { text: "Priority access to high-demand mentors" },
        { text: "Book any mentor on the platform" },
        { text: "Valid for 6 months" },
        { text: "Unused credits roll over +30 days" },
        { text: "Priority support", tip: "Response target: within 12 hours." }
      ]
    }
  };

  const CUSTOM_CREDITS = {
    min: 1,
    max: 100,
    step: 1,
    rate: { INR: 1500, USD: 20 },
    validityDays: 60
  };

  /* Five gift-email designs. Each is a different occasion with its own subject line,
     headline and closing; the footer, mechanics and claim action are shared so the
     recipient always gets the same facts however the gift is framed. */
  const EMAIL_TEMPLATES = {
    signature: {
      name: "Signature",
      blurb: "Neutral and understated. Works for any occasion.",
      subject: (d) => `${d.sender} sent you ${d.credits} mentorship credits`,
      eyebrow: (d) => `A GIFT FROM ${d.sender.toUpperCase()}`,
      headline: (d) => `${d.name}, your next conversation is already paid for`,
      lead: (d) => `That's up to ${d.credits} one-on-one sessions of 30 minutes, with mentors you pick yourself. Every mentor lists what a call costs — between 1 and 3 credits — before you book.`,
      closing: (d) => `There's no rush. The gift waits until you claim it, and the ${d.validity} only start counting from that day.`
    },
    milestone: {
      name: "Milestone",
      lightHero: true,
      blurb: "For a new job, a promotion, or finishing something hard.",
      subject: (d) => `Congratulations from ${d.sender}`,
      eyebrow: (d) => `CONGRATULATIONS FROM ${d.sender.toUpperCase()}`,
      headline: () => "You did it",
      lead: (d) => `${d.sender} sent you ${d.credits} mentorship credits to mark it — time with people who have already made the move you're making.`,
      closing: (d) => `Sessions run 30 minutes and cost 1 to 3 credits each. Claim whenever you're ready; the ${d.validity} start from that day, not today.`
    },
    birthday: {
      name: "Birthday",
      blurb: "A birthday gift that isn't another thing to store.",
      subject: (d) => `Happy birthday, ${d.name} — a gift from ${d.sender}`,
      eyebrow: (d) => `HAPPY BIRTHDAY FROM ${d.sender.toUpperCase()}`,
      headline: (d) => `Happy birthday, ${d.name}`,
      lead: (d) => `${d.sender} sent you ${d.credits} mentorship credits. Not a thing to find space for — just time with people who have been where you're going.`,
      closing: (d) => `Each session is 30 minutes and costs 1 to 3 credits. Claim them when you like; the ${d.validity} start from that day.`
    },
    chapter: {
      name: "New chapter",
      lightHero: true,
      blurb: "For a career switch, a move, or starting over.",
      subject: (d) => `${d.sender} sent you something for the new chapter`,
      eyebrow: (d) => `FROM ${d.sender.toUpperCase()}`,
      headline: (d) => `New chapter, ${d.name}`,
      lead: (d) => `${d.sender} thought you could use someone to think it through with. ${d.credits} mentorship credits — 30-minute sessions with mentors who have made the same turn.`,
      closing: (d) => `A call costs 1 to 3 credits, shown before you book. Nothing expires while the gift sits unclaimed, and the ${d.validity} start the day you claim it.`
    },
    rakhi: {
      name: "Rakhi",
      blurb: "For Raksha Bandhan. Saffron and gold, with a woven thread.",
      subject: (d) => `Happy Raksha Bandhan, ${d.name}`,
      eyebrow: (d) => `RAKSHA BANDHAN · FROM ${d.sender.toUpperCase()}`,
      headline: (d) => `Happy Raksha Bandhan, ${d.name}`,
      lead: (d) => `${d.sender} sent you ${d.credits} mentorship credits — the kind of looking out for you that lasts a good deal longer than a day.`,
      closing: (d) => `Sessions run 30 minutes and cost 1 to 3 credits each. Claim them whenever you like; the ${d.validity} start from that day.`
    },
    note: {
      name: "Quiet note",
      blurb: "Message first. For when the words matter more than the wrapping.",
      subject: (d) => `A note from ${d.sender}`,
      eyebrow: (d) => `FROM ${d.sender.toUpperCase()}`,
      headline: (d) => `${d.name}, this came with a note`,
      lead: (d) => `Along with it, ${d.credits} mentorship credits — 30-minute sessions with mentors you choose yourself.`,
      closing: (d) => `A call costs 1 to 3 credits, always shown before you book. The ${d.validity} start the day you claim them, not today.`
    }
  };

  const TEMPLATE_IDS = Object.keys(EMAIL_TEMPLATES);

  const RECOMMENDATION_TOPICS = [
    "Resume prep",
    "Mock interviews",
    "Career roadmap",
    "Building a startup",
    "Skill & domain guidance"
  ];

  const ROUTES = new Set([
    "pricing",
    "gift/choose",
    "gift/details",
    "gift/review",
    "checkout",
    "order/confirmation",
    "gift/email",
    "redeem",
    "account",
    "verify",
    "redeem/confirm",
    "redeem/done",
    "redeem/status",
    "wallet"
  ]);

  const ROUTE_TITLES = {
    "pricing": "Mentorship credits",
    "gift/choose": "Choose a gift",
    "gift/details": "Recipient details",
    "gift/review": "Review your gift",
    "checkout": "Checkout",
    "order/confirmation": "Order confirmed",
    "gift/email": "The gift email",
    "redeem": "Your mentorship gift",
    "account": "Sign in",
    "verify": "Verify your email",
    "redeem/confirm": "Confirm redemption",
    "redeem/done": "Credits added",
    "redeem/status": "Gift status",
    "wallet": "My credits"
  };

  const NAV_FOR_ROUTE = {
    "pricing": "pricing",
    "gift/choose": "gift",
    "gift/details": "gift",
    "gift/review": "gift",
    "wallet": "wallet",
    "redeem/done": "wallet"
  };

  const app = document.querySelector("#app");
  const liveRegion = document.querySelector("#live-region");
  const toastRegion = document.querySelector("#toast-region");
  const correctionDialog = document.querySelector("#correction-dialog");
  const correctionForm = document.querySelector("#correction-form");
  const previewDialog = document.querySelector("#preview-dialog");
  const navLinks = document.querySelector("#primary-nav");
  const menuToggle = document.querySelector(".menu-toggle");

  const timers = { payment: null, delivery: null, redemption: null, toast: null, cooldown: null, catalogue: null };
  let lastRoute = "";
  // Which design the preview dialog is showing. Separate from state.emailTemplate so
  // looking at a design never selects it.
  let previewTemplate = "signature";

  /* ------------------------------------------------------------- state -- */

  function initialState() {
    return {
      catalogueReady: false,
      currency: "INR",
      selectedPack: null,
      customPack: null,
      customQuantity: CUSTOM_CREDITS.min,
      emailTemplate: null,
      recommendation: { topics: [], context: "", email: "", sent: null, errors: {} },
      mode: "gift",
      form: {
        recipientName: "",
        recipientEmail: "",
        senderName: "",
        senderEmail: "",
        message: ""
      },
      errors: {},
      payment: {
        method: "upi",
        upiId: "",
        cardNumber: "",
        cardName: "",
        cardExpiry: "",
        cardCvv: "",
        status: "idle"
      },
      order: null,
      gift: null,
      delivery: null,
      link: null,
      redemption: "idle",
      redeemedOn: "",
      validUntil: "",
      session: null,
      authNext: "",
      pendingEmail: "",
      resendAt: 0,
      accounts: {
        "priya@example.com": { name: "Priya", balance: 6, lots: [
          { credits: 6, label: "Growth pack", addedOn: "12 May 2026", validUntil: "12 September 2026" }
        ] },
        "arjun@example.com": { name: "Arjun", balance: 3, lots: [
          { credits: 3, label: "Focus pack", addedOn: "2 June 2026", validUntil: "2 August 2026" }
        ] }
      }
    };
  }

  /* A reload starts a clean session. State lives in memory for the life of the page,
     which is all the flow needs — it survives route changes but not a refresh, so
     nobody lands back inside a half-finished gift with stale details. */
  function loadState() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_error) {
      /* Nothing to clear when storage is unavailable. */
    }
    return initialState();
  }

  let state = loadState();

  function persist() {
    /* State is deliberately not written to storage; see loadState. Kept as the single
       commit point so call sites read the same either way. */
  }

  /* ------------------------------------------------------------ helpers -- */

  function e(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function money(amount, currency = state.currency) {
    const locale = currency === "INR" ? "en-IN" : "en-US";
    const symbol = currency === "INR" ? "₹" : "$";
    const minor = Math.abs(amount - Math.round(amount)) > 0.0001;
    return symbol + new Intl.NumberFormat(locale, {
      minimumFractionDigits: minor ? 2 : 0,
      maximumFractionDigits: minor ? 2 : 0
    }).format(amount);
  }

  function amount(value) {
    return typeof value === "object" && value !== null ? value[state.currency] : value;
  }

  function taxLabel() {
    return state.currency === "INR" ? "GST (18%)" : "Tax (18%)";
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(date);
  }

  function formatTime(date) {
    return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(date);
  }

  function packById(id) {
    if (id === "custom") return state.customPack;
    return PACKS[id] || null;
  }

  function pack() {
    return packById(state.selectedPack) || PACKS.p10;
  }

  // "Custom credits pack" reads badly; the custom option names itself.
  function packLabel(p) {
    return p.id === "custom" ? p.name : `${p.name} pack`;
  }

  function customPackFor(quantity) {
    const n = Math.min(CUSTOM_CREDITS.max, Math.max(CUSTOM_CREDITS.min, quantity));
    return {
      id: "custom",
      name: "Custom credits",
      credits: n,
      price: { INR: n * CUSTOM_CREDITS.rate.INR, USD: n * CUSTOM_CREDITS.rate.USD },
      referencePrice: { INR: n * CUSTOM_CREDITS.rate.INR, USD: n * CUSTOM_CREDITS.rate.USD },
      rate: CUSTOM_CREDITS.rate,
      saving: 0,
      validityDays: CUSTOM_CREDITS.validityDays,
      validityLabel: `${CUSTOM_CREDITS.validityDays} days`
    };
  }

  function quoteFor(p = pack()) {
    const base = amount(p.price);
    const tax = Math.round(base * GST_RATE * 100) / 100;
    const reference = amount(p.referencePrice);
    return {
      base,
      tax,
      total: base + tax,
      savingAmount: reference - base,
      savingPercent: p.saving,
      reference
    };
  }

  function validityWindow(p = pack(), from = new Date()) {
    const start = new Date(from);
    const end = new Date(start);
    if (p.validityDays) {
      end.setDate(end.getDate() + p.validityDays);
    } else {
      const day = end.getDate();
      end.setDate(1);
      end.setMonth(end.getMonth() + p.validityMonths);
      const lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
      end.setDate(Math.min(day, lastDay));
    }
    return { start: formatDate(start), end: formatDate(end) };
  }

  function maskEmail(email) {
    const [local = "", domain = ""] = String(email).split("@");
    if (!local || !domain) return "the intended address";
    return `${local.slice(0, 1)}${"•".repeat(Math.min(Math.max(local.length - 1, 3), 7))}@${domain}`;
  }

  function orderReference() {
    const now = new Date();
    const stamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const tail = String(Math.floor(1000 + Math.random() * 9000));
    return `MU-${stamp}-${tail}`;
  }

  function account(email) {
    return state.accounts[String(email).toLowerCase()] || null;
  }

  function ensureAccount(email, name) {
    const key = String(email).toLowerCase();
    if (!state.accounts[key]) state.accounts[key] = { name: name || nameFromEmail(key), balance: 0, lots: [] };
    return state.accounts[key];
  }

  function nameFromEmail(email) {
    const local = String(email).split("@")[0].replace(/[._-]+/g, " ").trim();
    return local.split(" ").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ") || "there";
  }

  function isRecipientAccount() {
    return Boolean(state.session) &&
      state.session.email.toLowerCase() === String(state.form.recipientEmail).toLowerCase();
  }

  /* -------------------------------------------------------------- icons -- */

  const icons = {
    check: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 L6.5 12 L13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    clock: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 5.5 L9 9.5 L11.5 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    people: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="6" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 15 Q 9 10.5 14.5 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    wallet: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect x="2.5" y="4" width="13" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 9 L13 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    info: '<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 7.2v4M8 4.9v.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    alert: '<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.6v4.2M8 11.2v.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    lock: '<svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><rect x="3.2" y="7" width="9.6" height="6.6" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5.6 7V5.2a2.4 2.4 0 0 1 4.8 0V7" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    tick: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 L10 17.5 L19 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bang: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5v7M12 17.2v.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    gift: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="9.5" width="17" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 13.5h17M12 9.5v11" stroke="currentColor" stroke-width="1.8"/><path d="M12 9.5S10.6 5 8.4 5a2.2 2.2 0 0 0 0 4.5H12zM12 9.5S13.4 5 15.6 5a2.2 2.2 0 0 1 0 4.5H12z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    google: '<svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.3-.2-1.9H9v3.5h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z"/><path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.3c-.8.6-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3z"/><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z"/></svg>',
    linkedin: '<svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true" fill="currentColor"><path d="M4.1 6.5H1.3V17h2.8V6.5zM2.7 1a1.7 1.7 0 1 0 0 3.4A1.7 1.7 0 0 0 2.7 1zM16.7 10.9c0-2.9-1.5-4.6-3.9-4.6-1.3 0-2.2.6-2.7 1.4V6.5H7.4V17h2.8v-5.5c0-1.3.5-2.1 1.7-2.1 1.1 0 1.6.7 1.6 2.1V17h2.8v-6.1z"/></svg>',
    mail: '<svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true"><rect x="1.8" y="3.8" width="14.4" height="10.4" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m2.4 5 6.6 4.6L15.6 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    arrow: '<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9.5M8.5 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    eye: '<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M1.2 8S3.7 3.6 8 3.6 14.8 8 14.8 8 12.3 12.4 8 12.4 1.2 8 1.2 8z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="8" cy="8" r="2.1" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    target: '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="11" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="5" stroke="currentColor" stroke-width="2"/><path d="M16 2v5M16 25v5M2 16h5M25 16h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    bars: '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M7 25V18M16 25V12M25 25V6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M4 27h24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    spark: '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 3l3.2 8.4L28 14l-8.8 2.6L16 25l-3.2-8.4L4 14l8.8-2.6z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'
  };

  const titleMark = `
    <svg class="title-mark" viewBox="0 0 542 40" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="title-gradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="542" y2="0">
          <stop offset="0" stop-color="#39B6D8"/><stop offset=".5" stop-color="#F7D344"/><stop offset="1" stop-color="#E38330"/>
        </linearGradient>
      </defs>
      <path d="M3 27 C34 17 70 9 101 2 L53 30 C91 26 134 14 175 11 L160 36 C190 27 220 17 248 13 C256 12 256 20 264 22 C282 28 305 17 328 16 C339 16 343 22 356 22 C375 23 397 14 418 10 C448 4 478 10 507 17 C520 20 530 18 539 19" fill="none" stroke="url(#title-gradient)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  /* --------------------------------------------------------- components -- */

  function note(text, tone = "") {
    const icon = tone === "error" || tone === "warning" ? icons.alert : icons.info;
    return `<div class="note${tone ? ` note--${tone}` : ""}">${icon}<span>${text}</span></div>`;
  }

  function summaryRow(term, value, modifier = "") {
    return `<div class="summary-row${modifier ? ` summary-row--${modifier}` : ""}"><dt>${e(term)}</dt><dd>${e(value)}</dd></div>`;
  }

  function stepper(current) {
    const steps = ["Gift", "Recipient", "Review", "Payment"];
    return `
      <nav class="stepper" aria-label="Gift purchase progress">
        <ol>
          ${steps.map((label, index) => {
            const number = index + 1;
            const done = number < current;
            return `<li${number === current ? ' aria-current="step"' : ""}${done ? ' class="is-complete"' : ""}>
              <span class="step-number" aria-hidden="true">${done ? "✓" : number}</span>
              <span class="step-label">${label}</span>
            </li>`;
          }).join("")}
        </ol>
      </nav>`;
  }

  function pageHeading({ eyebrow, title, copy, centered = false, level = "title" }) {
    return `
      <header class="page-heading${centered ? " page-heading--center" : ""}">
        ${eyebrow ? `<p class="eyebrow">${e(eyebrow)}</p>` : ""}
        <h1 class="${level}" tabindex="-1">${title}</h1>
        ${copy ? `<p class="lead">${copy}</p>` : ""}
      </header>`;
  }

  function featureRow(feature, index, packId) {
    if (!feature.tip) return `<div class="feature">${icons.check}<span>${e(feature.text)}</span></div>`;
    return `
      <div class="feature">${icons.check}<span class="feature-copy">${e(feature.text)}<span class="feature-help">
        <button class="info-trigger" type="button" aria-expanded="false" aria-controls="feature-tooltip"
                aria-label="More information about ${e(feature.text.toLowerCase())}"
                data-tooltip="${e(feature.tip)}" data-tip-id="${packId}-${index}"></button>
      </span></span></div>`;
  }

  function planCard(p, { selectable }) {
    const selected = state.selectedPack === p.id;
    const q = quoteFor(p);
    const features = selectable
      ? p.features.map((f) => (/^Valid for /.test(f.text) ? { ...f, text: `${f.text}, once claimed` } : f))
      : p.features;
    return `
      <article class="plan-card${p.featured ? " is-featured" : ""}${selected ? " is-selected" : ""}" data-pack="${p.id}">
        <button class="plan-selector" type="button" data-action="select-pack" data-pack-id="${p.id}"
                aria-pressed="${selected}" aria-label="Select the ${e(p.name)} pack, ${p.credits} credits">
          <span class="sr-only">Select ${e(p.name)}</span>
        </button>
        ${p.featured ? `<div class="featured-badge">${selectable ? "MOST GIFTED" : "FEATURED"}</div>` : ""}
        <div class="plan-title-row">
          <div><h3 class="plan-name">${e(p.name)}</h3></div>
        </div>
        <p class="plan-description">${e(p.description)}</p>
        <div class="credit-count"><strong>${p.credits}</strong><span>credits</span></div>
        <div class="price-row">
          <div class="price-primary-line">
            <span class="reference-total"><span class="sr-only">Equivalent at the custom-credit rate: </span><span aria-hidden="true">${money(q.reference)}</span></span>
            <span class="price">${money(q.base)}</span>
            <span class="taxes">+ taxes</span>
          </div>
          <div class="unit-pricing">
            <span class="effective-rate"><span class="sr-only">Current effective rate: </span>${money(amount(p.rate))} / credit</span>
            <span class="savings-label">Save ${p.saving}%</span>
          </div>
        </div>
        <p class="mobile-validity">Valid for ${e(p.validityLabel)}${selectable ? ", once claimed" : ""}</p>
        <div class="card-details">
          <div class="feature-list">
            ${features.map((f, i) => featureRow(f, i, p.id)).join("")}
          </div>
        </div>
        <button class="plan-cta" type="button"
                data-action="${selectable ? "select-pack" : "buy-pack"}" data-pack-id="${p.id}">
          ${selectable ? (selected ? "Selected" : `Choose ${e(p.name)}`) : `Get started with ${p.credits} credits`}
        </button>
        <p class="sr-only">Total with taxes ${money(q.total)}</p>
      </article>`;
  }

  function planGrid({ selectable }) {
    if (!state.catalogueReady) {
      return `<div class="skeleton-grid" aria-busy="true" aria-label="Loading credit packs">
        <div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>
      </div>`;
    }
    const carousel = selectable ? "" : " plan-grid--carousel";
    return `
      ${selectable ? "" : '<p class="sr-only" id="pricing-swipe-instructions">Swipe horizontally, or focus this list and use the left and right arrow keys, to compare credit packs.</p>'}
      <div class="plan-grid${carousel}${state.selectedPack ? " has-selection" : ""}" role="group"
           aria-label="${selectable ? "Choose a gift pack" : "Select a credit pack"}"
           ${selectable ? "" : 'aria-describedby="pricing-swipe-instructions" tabindex="0"'}>
        ${Object.values(PACKS).map((p) => planCard(p, { selectable })).join("")}
      </div>`;
  }

  /* ------------------------------------------------------------ screens -- */

  function customCreditsBlock({ forGift = false } = {}) {
    const q = state.customQuantity;
    const unit = amount(CUSTOM_CREDITS.rate);
    const selected = forGift && state.selectedPack === "custom";
    return `
      <section class="custom-credits${selected ? " is-selected" : ""}" aria-labelledby="custom-title">
        <div class="custom-copy">
          <div class="custom-label">PREFER TO PICK AN EXACT NUMBER?</div>
          <h2 class="custom-title" id="custom-title">Custom credits</h2>
          <div class="custom-price">
            ${money(unit)} / credit · + taxes · valid ${CUSTOM_CREDITS.validityDays} days${forGift ? " once claimed" : ""}
          </div>
        </div>
        <div class="custom-purchase">
          <div class="custom-counter">
            <button class="custom-counter-button" type="button" data-action="custom-decrease"
                    aria-label="Decrease custom credits" ${q <= CUSTOM_CREDITS.min ? "disabled" : ""}>−</button>
            <input class="custom-quantity" type="text" inputmode="numeric" maxlength="3"
                   data-custom-quantity value="${q}"
                   aria-label="Number of credits, ${CUSTOM_CREDITS.min} to ${CUSTOM_CREDITS.max}">
            <button class="custom-counter-button" type="button" data-action="custom-increase"
                    aria-label="Increase custom credits" ${q >= CUSTOM_CREDITS.max ? "disabled" : ""}>+</button>
          </div>
          <div class="custom-total">
            <strong data-custom-total>${money(unit * q)}</strong>
            <span>+ taxes</span>
          </div>
          ${forGift
            ? `<button class="button button--secondary button--small" type="button" data-action="select-custom"
                       aria-pressed="${selected}">${selected ? "Selected" : `Choose ${q} credit${q === 1 ? "" : "s"}`}</button>`
            : `<button class="text-cta" type="button" data-action="buy-custom">
                 <span>Continue with custom credits</span>
                 <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M4 2.5 L9.5 7 L4 11.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
               </button>`}
        </div>
      </section>`;
  }

  function recommendationBlock() {
    const r = state.recommendation;

    if (r.sent) {
      return `
        <section class="recommendation" aria-labelledby="recommendation-title">
          <div>
            <h2 class="section-title" id="recommendation-title">Not sure which pack?</h2>
            <p class="recommendation-copy">Tell us what you're working towards and we'll recommend the right pack.</p>
          </div>
          <div class="recommendation-done">
            <div class="status-mark" aria-hidden="true">${icons.tick}</div>
            <h3 class="sub-title">Your recommendation is on its way</h3>
            <p class="body-copy">We'll email <strong class="wrap-anywhere" style="color:var(--text)">${e(r.sent.email)}</strong> a pack recommendation for ${e(r.sent.topics.join(", "))}.</p>
            <div class="action-list">
              <button class="button button--secondary button--small" type="button" data-action="find-mentor">Browse mentors</button>
              <button class="link-button" type="button" data-action="recommendation-reset">Ask about something else</button>
            </div>
          </div>
        </section>`;
    }

    return `
      <section class="recommendation" aria-labelledby="recommendation-title">
        <div>
          <h2 class="section-title" id="recommendation-title">Not sure which pack?</h2>
          <p class="recommendation-copy">Tell us what you're working towards and we'll recommend the right pack.</p>
        </div>
        <form class="recommendation-form" id="recommendation-form" novalidate>
          <div class="topic-list" role="group" aria-label="Mentorship goals" aria-describedby="recommendation-topic-error">
            ${RECOMMENDATION_TOPICS.map((topic) => `
              <button class="topic" type="button" data-action="toggle-topic" data-topic="${e(topic)}"
                      aria-pressed="${r.topics.includes(topic)}">${e(topic)}</button>`).join("")}
          </div>
          <p class="field-error recommendation-topic-error" id="recommendation-topic-error" role="alert" ${r.errors.topics ? "" : "hidden"}>${e(r.errors.topics || "")}</p>
          <details class="recommendation-more">
            <summary>
              Tell us more
              <span class="optional-label">Optional</span>
              <span class="disclosure-icon" aria-hidden="true">+</span>
            </summary>
            <div class="recommendation-more-content">
              <label for="recommendation-context">A little context</label>
              <textarea class="recommendation-textarea" id="recommendation-context" name="context" maxlength="400"
                        data-recommendation-field="context"
                        aria-describedby="recommendation-character-count"
                        placeholder="For example: I'm changing roles and want to practise two product interviews next month.">${e(r.context)}</textarea>
              <p class="character-count" id="recommendation-character-count"><span data-character-count>${r.context.length}</span>/400</p>
            </div>
          </details>
          <div class="recommendation-contact">
            <label for="recommendation-email">Email address</label>
            <div class="email-row">
              <input class="email-input" id="recommendation-email" name="email" type="email" inputmode="email"
                     autocomplete="email" placeholder="you@company.com" value="${e(r.email)}"
                     data-recommendation-field="email"
                     aria-invalid="${r.errors.email ? "true" : "false"}"
                     aria-describedby="recommendation-email-error">
              <button class="recommendation-submit" type="submit">Get a recommendation</button>
            </div>
            <p class="field-error recommendation-email-error" id="recommendation-email-error" role="alert" ${r.errors.email ? "" : "hidden"}>${e(r.errors.email || "")}</p>
          </div>
        </form>
      </section>`;
  }

  function giftEntryBlock() {
    return `
      <aside class="gift-entry" aria-labelledby="gift-entry-title">
        <div class="gift-entry__copy">
          <p class="eyebrow">FOR SOMEONE ELSE</p>
          <h2 class="section-title" id="gift-entry-title">You probably already know who this is for</h2>
          <p class="body-copy">The friend switching careers. The cousin with a first job offer. The one who keeps asking good questions and running out of people to ask. Send them credits by email and they'll pick their own mentors, in their own time. Nothing expires while the gift sits unopened, and the price stays between you and us.</p>
        </div>
        <button class="button button--primary" type="button" data-route="gift/choose">Gift mentorship ${icons.arrow}</button>
      </aside>`;
  }

  function faqBlock() {
    const items = [
      {
        q: "What is a credit?",
        a: "<p>A credit is what you spend to book mentorship sessions. Credits leave your wallet only when you book, and unused credits stay there until they expire.</p>"
      },
      {
        q: "How many credits does a session cost?",
        a: "<p>Each 1:1 session runs up to 30 minutes and costs 1–3 credits, depending on the mentor. The exact cost is shown on the mentor's profile before you book.</p>"
      },
      {
        q: "How long are credits valid?",
        a: `<p>Validity is counted from the purchase date:</p>
            <ul>
              <li><strong>Focus (4 credits)</strong> — 2 months, no rollover</li>
              <li><strong>Growth (10 credits)</strong> — 4 months, plus 15-day rollover</li>
              <li><strong>Accelerator (25 credits)</strong> — 6 months, plus 30-day rollover</li>
              <li><strong>Custom credits</strong> — 60 days</li>
            </ul>
            <p>Credits expiring soonest are used first. Buying another pack does not extend credits you already hold beyond their stated rollover.</p>`
      },
      {
        q: "Can I buy credits for someone else?",
        a: "<p>Yes. Choose <strong>Gift mentorship</strong> and send a pack by email. Your recipient claims the credits into their own account and picks their own mentors. A gift doesn't expire while it's unclaimed, and validity starts the day they claim it rather than the day you buy it. They never see what you paid.</p>"
      },
      {
        q: "Is this a subscription?",
        a: "<p>No. Every pack is a one-time purchase — nothing renews and you're never charged automatically.</p>"
      },
      {
        q: "What happens if I cancel a session?",
        a: `<p>It depends on when you cancel:</p>
            <ul>
              <li><strong>12+ hours before</strong> — your credit returns to your wallet with its original validity</li>
              <li><strong>Within 12 hours</strong> — the credit is used, unless your mentor waives it</li>
              <li><strong>Mentor cancels or doesn't show</strong> — your credit returns with extended validity</li>
            </ul>
            <p>For sessions booked less than 24 hours ahead, the cutoff is the halfway point between booking time and session start time.</p>`
      },
      {
        q: "How do I pay?",
        a: "<p>Cards and UPI, processed securely. Prices are shown plus taxes; the exact total appears at checkout before you pay.</p>"
      }
    ];

    return `
      <section class="faq" aria-labelledby="faq-title">
        <h2 class="section-title" id="faq-title">Frequently asked questions</h2>
        ${items.map((item) => `
          <details>
            <summary>${e(item.q)}<span class="disclosure-icon" aria-hidden="true">+</span></summary>
            <div class="faq-answer">${item.a}</div>
          </details>`).join("")}
      </section>`;
  }

  function renderPricing() {
    return `
      <section class="route-view">
        <section class="hero">
          <div>
            <p class="eyebrow">PRICING</p>
            <h1 class="display" tabindex="-1">Mentorship Credits</h1>
            ${titleMark}
            <p class="hero-copy">One-time credit packs for 1:1 mentorship sessions. No subscription, nothing auto-renews.</p>
          </div>
          <div class="currency-wrap">
            <div class="segmented" role="group" aria-label="Display currency">
              <button type="button" data-action="set-currency" data-currency="INR" aria-pressed="${state.currency === "INR"}">₹ INR</button>
              <button type="button" data-action="set-currency" data-currency="USD" aria-pressed="${state.currency === "USD"}">$ USD</button>
            </div>
          </div>
        </section>

        <section class="credit-explainer" aria-label="How credits work">
          <div class="explainer-item">${icons.clock}<span class="explainer-copy">
            <span>1 Credit = 1 one-on-one session</span><span>of 30 minutes duration</span></span></div>
          <div class="explainer-item">${icons.people}<span class="explainer-copy">
            <span>Call costs between 1-3 credits</span><span>Check mentor's profile before booking</span></span></div>
          <div class="explainer-item">${icons.wallet}<span class="explainer-copy">
            <span>Your unused credit balance</span><span>remains safe in your wallet</span></span></div>
        </section>

        <section class="pricing-section" aria-label="Credit packs">
          ${planGrid({ selectable: false })}
          ${state.catalogueReady ? customCreditsBlock() : ""}
        </section>

        ${recommendationBlock()}

        ${giftEntryBlock()}

        ${faqBlock()}

        <div class="trust-line">
          <span>One-time purchase. No auto-renewal.</span>
          <a href="#">Refund policy</a>
        </div>
      </section>`;
  }

  function renderGiftChoose() {
    const ready = Boolean(state.selectedPack) && state.catalogueReady;
    return `
      <section class="route-view">
        ${stepper(1)}
        ${pageHeading({
          eyebrow: "GIFT MENTORSHIP",
          title: "Choose the pack you want to give",
          copy: "The clock starts when they claim it, not when you buy it. Until then the gift sits and waits."
        })}
        ${planGrid({ selectable: true })}
        ${state.catalogueReady ? customCreditsBlock({ forGift: true }) : ""}
        <div class="button-row">
          <button class="button button--quiet" type="button" data-route="pricing">← Back to pricing</button>
          <button class="button button--primary" type="button" data-route="gift/details" ${ready ? "" : "disabled"}>
            Continue to recipient details
          </button>
        </div>
      </section>`;
  }

  function field({ id, label, value, type = "text", autocomplete = "off", inputmode = "text", maxlength = 254, placeholder = "", help = "", optional = false }) {
    const error = state.errors[id] || "";
    const described = [help ? `${id}-help` : "", `${id}-error`].filter(Boolean).join(" ");
    return `
      <label class="field" for="${id}">
        <span class="field__label">${e(label)}${optional ? ' <span class="field__optional">· Optional</span>' : ""}</span>
        <input id="${id}" name="${id}" data-field="${id}" type="${type}" inputmode="${inputmode}"
               autocomplete="${autocomplete}" maxlength="${maxlength}" value="${e(value)}" placeholder="${e(placeholder)}"
               aria-invalid="${error ? "true" : "false"}" aria-describedby="${described}">
        ${help ? `<span class="field__help" id="${id}-help">${e(help)}</span>` : ""}
        <span class="field__error" id="${id}-error" role="alert">${e(error)}</span>
      </label>`;
  }

  function renderGiftDetails() {
    if (!state.selectedPack) return redirectTo("gift/choose");
    const p = pack();
    const f = state.form;
    const error = state.errors.message || "";
    return `
      <section class="route-view">
        ${stepper(2)}
        ${pageHeading({
          eyebrow: "GIFT MENTORSHIP",
          title: "Who is this gift for?",
          copy: "Just enough to deliver it, and to make sure nobody else can claim it."
        })}
        <div class="split">
          <form class="surface" id="details-form" novalidate>
            <div class="field-grid">
              ${field({ id: "recipientName", label: "Recipient's name", value: f.recipientName, autocomplete: "name", maxlength: 80, placeholder: "Priya" })}
              ${field({ id: "recipientEmail", label: "Recipient's email", value: f.recipientEmail, type: "email", autocomplete: "email", inputmode: "email", placeholder: "name@example.com", help: "Only this address can claim the gift." })}
              <div class="field-row">
                ${field({ id: "senderName", label: "Your name", value: f.senderName, autocomplete: "name", maxlength: 80, placeholder: "The name they'll recognise" })}
                ${field({ id: "senderEmail", label: "Your email", value: f.senderEmail, type: "email", autocomplete: "email", inputmode: "email", placeholder: "you@example.com", help: "For your receipt and order updates." })}
              </div>
              <label class="field" for="message">
                <span class="field__label">Add a message <span class="field__optional">· Optional</span></span>
                <textarea id="message" name="message" data-field="message" maxlength="300"
                          placeholder="A short note to go with the gift…"
                          aria-invalid="${error ? "true" : "false"}" aria-describedby="message-help message-counter message-error">${e(f.message)}</textarea>
                <span class="field__help" id="message-help">Plain text only. Links can't be included.</span>
                <span class="field__counter numeric" id="message-counter">${String(f.message).length}/300</span>
                <span class="field__error" id="message-error" role="alert">${e(error)}</span>
              </label>
              ${note("Your recipient sees the number of credits and your message. They never see what you paid.")}
            </div>
            <div class="button-row">
              <button class="button button--quiet" type="button" data-route="gift/choose">← Back</button>
              <button class="button button--primary" type="submit">Continue to review</button>
            </div>
          </form>

          <aside class="surface surface--compact surface--sticky" aria-labelledby="details-summary">
            <div class="surface__head">
              <div>
                <span class="meta-label">YOUR GIFT</span>
                <h2 class="card-title" id="details-summary">${e(p.name)} · ${p.credits} credits</h2>
              </div>
              <button class="link-button" type="button" data-route="gift/choose">Change</button>
            </div>
            <dl class="summary-stack">
              ${summaryRow("Sessions", `Up to ${p.credits}`)}
              ${summaryRow("Session length", "30 minutes")}
              ${summaryRow("Cost per session", "1–3 credits")}
              ${summaryRow("Valid for", `${p.validityLabel} once claimed`)}
              ${summaryRow("Price", `${money(amount(p.price))} + taxes`)}
            </dl>
          </aside>
        </div>
      </section>`;
  }

  function renderGiftReview() {
    if (!state.selectedPack) return redirectTo("gift/choose");
    if (!state.form.recipientEmail) return redirectTo("gift/details");
    const p = pack();
    const q = quoteFor(p);
    const f = state.form;
    return `
      <section class="route-view">
        ${stepper(3)}
        ${pageHeading({
          eyebrow: "GIFT MENTORSHIP",
          title: `Review your gift for ${e(f.recipientName)}`,
          copy: "Check the delivery address carefully — this is where the gift link is sent."
        })}
        <div class="split split--review">
          <div class="review-column">
          <section class="surface" aria-labelledby="review-recipient">
            <div class="surface__head">
              <div>
                <span class="meta-label">DELIVERING TO</span>
                <h2 class="card-title" id="review-recipient">${e(f.recipientName)}</h2>
              </div>
              <button class="link-button" type="button" data-route="gift/details">Edit</button>
            </div>
            <p class="wrap-anywhere" style="color:var(--text-soft);font-size:var(--fs-small);font-weight:600">${e(f.recipientEmail)}</p>

            <div class="divider"></div>

            <div class="surface__head">
              <div>
                <span class="meta-label">FROM</span>
                <h3 class="sub-title">${e(f.senderName)}</h3>
                <p class="caption wrap-anywhere" style="margin-top:2px">Receipt to ${e(f.senderEmail)}</p>
              </div>
              <button class="link-button" type="button" data-route="gift/details">Edit</button>
            </div>
            ${f.message
              ? `<blockquote class="gift-note">“${e(f.message)}”</blockquote>`
              : `<p class="caption">No message added.</p>`}

            <div class="divider"></div>
            ${note(`Nothing is added to any account until ${e(f.recipientName)} claims the gift, and it won't expire before then.`)}
          </section>

          <section class="surface email-design" aria-labelledby="email-design-title">
            <div class="surface__head">
              <div>
                <span class="meta-label">HOW IT ARRIVES</span>
                <h2 class="card-title" id="email-design-title">Choose the email design</h2>
                <p class="caption" style="margin-top:6px">Same credits and the same message in each — only the framing changes. Open one to preview it.</p>
              </div>
              <p class="sending-in">Sending in <strong>${e(EMAIL_TEMPLATES[emailTemplateId()].name)}</strong>${state.emailTemplate ? "" : " · the default"}</p>
            </div>
            ${templatePicker()}
          </section>
          </div>

          <aside class="surface surface--sticky" aria-labelledby="review-order">
            <div class="surface__head">
              <div>
                <span class="meta-label">ORDER SUMMARY</span>
                <h2 class="card-title" id="review-order">${e(p.name)} · ${p.credits} credits</h2>
              </div>
              <button class="link-button" type="button" data-route="gift/choose">Edit</button>
            </div>
            <p class="caption" style="margin-bottom:var(--s5)">Up to ${p.credits} sessions · valid ${e(p.validityLabel)} once claimed</p>
            <dl class="summary-stack">
              ${q.savingAmount > 0 ? summaryRow("Standard rate", money(q.reference)) : ""}
              ${q.savingAmount > 0 ? summaryRow(`Pack saving (${q.savingPercent}%)`, `−${money(q.savingAmount)}`) : ""}
              ${summaryRow("Subtotal", money(q.base))}
              ${summaryRow(taxLabel(), money(q.tax))}
              ${summaryRow("Total payable", money(q.total), "total")}
            </dl>
            <button class="button button--primary button--block" type="button" data-action="go-checkout" style="margin-top:var(--s6)">
              Continue to payment
            </button>
          </aside>
        </div>
        <div class="button-row">
          <button class="button button--quiet" type="button" data-route="gift/details">← Back</button>
        </div>
      </section>`;
  }

  function cardBrand(number) {
    const digits = String(number).replace(/\D/g, "");
    if (/^4/.test(digits)) return "VISA";
    if (/^(5[1-5]|2[2-7])/.test(digits)) return "MASTERCARD";
    if (/^3[47]/.test(digits)) return "AMEX";
    if (/^(60|65|81|82|508)/.test(digits)) return "RUPAY";
    return "";
  }

  function renderCheckout() {
    const isGift = state.mode === "gift";
    if (!state.selectedPack) return redirectTo("pricing");
    if (isGift && !state.form.recipientEmail) return redirectTo("gift/details");
    if (!isGift && !state.session) {
      state.authNext = "checkout";
      return redirectTo("account");
    }

    const p = pack();
    const q = quoteFor(p);
    const pay = state.payment;

    if (pay.status === "processing") {
      return `
        <section class="route-view" aria-busy="true">
          <div class="panel panel--narrow">
            <div class="processing">
              <div class="spinner" aria-hidden="true"></div>
              <h1 class="section-title" tabindex="-1">Confirming your payment</h1>
              <p class="lead" style="margin-top:var(--s3)">Don't close this window or press back. This usually takes a few seconds.</p>
            </div>
          </div>
        </section>`;
    }

    const brand = cardBrand(pay.cardNumber);

    return `
      <section class="route-view">
        ${isGift ? stepper(4) : ""}
        ${pageHeading({
          eyebrow: "CHECKOUT",
          title: isGift ? "Pay for your gift" : "Complete your purchase",
          copy: isGift
            ? `${p.credits} credits for ${e(state.form.recipientName)}. The gift email goes out as soon as the payment clears.`
            : `${p.credits} credits are added to your account as soon as the payment clears.`
        })}
        <div class="split split--review">
          <section class="surface" aria-labelledby="payment-title">
            <h2 class="card-title" id="payment-title">Payment method</h2>

            <form id="payment-form" novalidate>
              <div class="checkout-methods" role="radiogroup" aria-label="Payment method">
                <label class="method${pay.method === "upi" ? " is-active" : ""}">
                  <input type="radio" name="method" value="upi" data-method="upi" ${pay.method === "upi" ? "checked" : ""}>
                  <span class="radio-mark" aria-hidden="true"></span>
                  <span class="method__copy"><strong>UPI</strong><span>Pay from any UPI app</span></span>
                  <span class="method__marks" aria-hidden="true"><span>UPI</span></span>
                </label>
                <label class="method${pay.method === "card" ? " is-active" : ""}">
                  <input type="radio" name="method" value="card" data-method="card" ${pay.method === "card" ? "checked" : ""}>
                  <span class="radio-mark" aria-hidden="true"></span>
                  <span class="method__copy"><strong>Card</strong><span>Credit or debit card</span></span>
                  <span class="method__marks" aria-hidden="true">${brand ? `<span>${brand}</span>` : "<span>VISA</span><span>MC</span><span>RUPAY</span>"}</span>
                </label>
              </div>

              <div class="field-grid">
                ${pay.method === "upi"
                  ? field({ id: "upiId", label: "UPI ID", value: pay.upiId, autocomplete: "off", maxlength: 60, placeholder: "yourname@bank", help: "You'll approve the request in your UPI app." })
                  : `
                    ${field({ id: "cardNumber", label: "Card number", value: pay.cardNumber, inputmode: "numeric", autocomplete: "cc-number", maxlength: 23, placeholder: "1234 5678 9012 3456" })}
                    ${field({ id: "cardName", label: "Name on card", value: pay.cardName, autocomplete: "cc-name", maxlength: 80, placeholder: "As printed on the card" })}
                    <div class="field-row">
                      ${field({ id: "cardExpiry", label: "Expiry", value: pay.cardExpiry, inputmode: "numeric", autocomplete: "cc-exp", maxlength: 5, placeholder: "MM/YY" })}
                      ${field({ id: "cardCvv", label: "CVV", value: pay.cardCvv, inputmode: "numeric", autocomplete: "cc-csc", maxlength: 4, placeholder: "123" })}
                    </div>`}
              </div>

              <button class="button button--primary button--block" type="submit" style="margin-top:var(--s7)">
                Pay ${money(q.total)}
              </button>
              <div class="secure-line">${icons.lock}<span>Secured with 256-bit encryption · card details are not stored</span></div>
            </form>

            <div class="button-row">
              <button class="button button--quiet" type="button" data-route="${isGift ? "gift/review" : "pricing"}">← Back</button>
            </div>
          </section>

          <aside class="surface surface--compact surface--sticky" aria-labelledby="checkout-summary">
            <span class="meta-label">ORDER SUMMARY</span>
            <h2 class="card-title" id="checkout-summary" style="margin-top:6px">${e(p.name)} · ${p.credits} credits</h2>
            <dl class="summary-stack" style="margin-top:var(--s5)">
              ${isGift ? summaryRow("For", state.form.recipientName) : summaryRow("For", state.session.name)}
              ${summaryRow("Subtotal", money(q.base))}
              ${summaryRow(taxLabel(), money(q.tax))}
              ${summaryRow("Total payable", money(q.total), "total")}
            </dl>
            ${isGift ? `<p class="caption" style="margin-top:var(--s5)">Delivering to <span class="wrap-anywhere">${e(state.form.recipientEmail)}</span></p>` : ""}
          </aside>
        </div>
      </section>`;
  }

  function renderConfirmation() {
    if (!state.order) return redirectTo("pricing");
    const isGift = state.order.mode === "gift";
    if (isGift && !state.gift) return redirectTo("pricing");
    const record = isGift ? state.gift : state.order;
    const p = record.pack;

    if (!isGift) {
      return `
        <section class="route-view">
          <div class="panel">
            <div class="status-mark" aria-hidden="true">${icons.tick}</div>
            <p class="eyebrow">PAYMENT SUCCESSFUL</p>
            <h1 class="title" tabindex="-1">${p.credits} credits added to your account</h1>
            <p class="lead">Your ${e(packLabel(p))} is ready to use. Credits are valid for ${e(p.validityLabel)}.</p>
            <dl class="summary-stack" style="margin-top:var(--s7)">
              ${summaryRow("Order", record.reference)}
              ${summaryRow("Paid", money(record.total, record.currency))}
              ${summaryRow("Payment method", record.methodLabel)}
              ${summaryRow("Receipt sent to", record.receiptEmail)}
              ${summaryRow("Valid until", record.validUntil)}
            </dl>
            <div class="action-list action-list--divided">
              <button class="button button--primary" type="button" data-action="find-mentor">Find a mentor</button>
              <button class="button button--secondary" type="button" data-route="wallet">View my credits</button>
            </div>
          </div>
        </section>`;
    }

    const redeemed = state.link === "redeemed";
    const sending = state.delivery === "queued";
    return `
      <section class="route-view">
        <div class="panel panel--wide">
          <div class="status-mark" aria-hidden="true">${icons.gift}</div>
          <p class="eyebrow">ORDER CONFIRMED</p>
          <h1 class="title" tabindex="-1">${redeemed ? `${e(state.form.recipientName)} has claimed your gift` : "Your gift is on its way"}</h1>
          <p class="lead">${p.credits} mentorship credits for ${e(state.form.recipientName)}.</p>

          ${record.addressChanged && !redeemed
            ? note(`We've resent the gift to ${e(state.form.recipientEmail)}. The earlier link no longer works.`, "success")
            : ""}

          <table class="detail-table">
            <tbody>
              <tr><th scope="row">Recipient</th><td>${e(state.form.recipientName)} · <span class="wrap-anywhere">${e(state.form.recipientEmail)}</span></td></tr>
              <tr><th scope="row">From</th><td>${e(state.form.senderName)}</td></tr>
              <tr><th scope="row">Gift</th><td>${e(packLabel(p))} · ${p.credits} credits · valid ${e(p.validityLabel)} once claimed</td></tr>
              <tr><th scope="row">Paid</th><td class="numeric">${money(record.total, record.currency)} · ${e(record.methodLabel)}</td></tr>
              <tr><th scope="row">Gift email</th><td>${sending
                ? '<span class="status-line status-line--warning"><span class="status-dot"></span>Sending</span>'
                : `<span class="status-line status-line--success"><span class="status-dot"></span>Delivered${record.lastSentAt ? ` · ${e(record.lastSentAt)}` : ""}</span>`}</td></tr>
              <tr><th scope="row">Status</th><td>${redeemed
                ? `<span class="status-line status-line--success"><span class="status-dot"></span>Claimed${state.redeemedOn ? ` on ${e(state.redeemedOn)}` : ""}</span>`
                : '<span class="status-line status-line--neutral"><span class="status-dot"></span>Waiting to be claimed</span>'}</td></tr>
              <tr><th scope="row">Order</th><td>${e(record.reference)}</td></tr>
              <tr><th scope="row">Order date</th><td>${e(record.placedOn)}</td></tr>
              <tr><th scope="row">Receipt</th><td class="wrap-anywhere">${e(record.receiptEmail)}</td></tr>
            </tbody>
          </table>

          ${state.form.message ? `<blockquote class="gift-note" style="margin-top:var(--s6)">“${e(state.form.message)}”</blockquote>` : ""}

          <div class="action-list action-list--divided">
            <button class="button button--primary" type="button" data-route="gift/email">See what ${e(state.form.recipientName)} receives</button>
            <button class="button button--secondary" type="button" data-route="pricing">Back to pricing</button>
          </div>

          ${redeemed
            ? `<p class="caption" style="margin-top:var(--s6)">This gift has been claimed, so the delivery address can no longer be changed.</p>`
            : `<div class="action-list action-list--spread">
                <button class="link-button" type="button" data-action="resend-gift" ${sending ? "disabled" : ""}>Resend the email</button>
                <button class="link-button" type="button" data-action="open-correction">Change the recipient's email</button>
                <button class="link-button" type="button" data-action="contact-support">Get help with this order</button>
              </div>`}
        </div>
      </section>`;
  }

  const scribble = `
    <svg class="email-scribble" viewBox="0 0 542 40" aria-hidden="true" focusable="false" preserveAspectRatio="none">
      <defs>
        <linearGradient id="email-scribble-gradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="542" y2="0">
          <stop offset="0" stop-color="var(--sc-1)"/><stop offset=".5" stop-color="var(--sc-2)"/><stop offset="1" stop-color="var(--sc-3)"/>
        </linearGradient>
      </defs>
      <path d="M3 27 C34 17 70 9 101 2 L53 30 C91 26 134 14 175 11 L160 36 C190 27 220 17 248 13 C256 12 256 20 264 22 C282 28 305 17 328 16 C339 16 343 22 356 22 C375 23 397 14 418 10 C448 4 478 10 507 17 C520 20 530 18 539 19" fill="none" stroke="url(#email-scribble-gradient)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  /* A rakhi: two woven cords meeting at a central rosette. */
  const rakhiThread = `
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

  function emailData(p = state.gift ? state.gift.pack : pack()) {
    return {
      name: state.form.recipientName || "your recipient",
      sender: state.form.senderName || "someone",
      email: state.form.recipientEmail,
      message: state.form.message,
      credits: p.credits,
      validity: p.validityLabel
    };
  }

  // No design is pre-selected; Signature is what goes out until one is chosen.
  function emailTemplateId() {
    return EMAIL_TEMPLATES[state.emailTemplate] ? state.emailTemplate : "signature";
  }

  const LOGOS = {
    onDark: "assets/logos/black-bg-logo.png",
    onLight: "assets/logos/white-bg-logo.png"
  };

  function emailHero(id, t, d) {
    // Both lockups are opaque 512px boards, so each is paired with the hero it was cut
    // for and blended to drop its own board. Production needs the transparent/vector mark.
    const brand = `
      <div class="email-brand">
        <span class="email-logo logo-crop">
          <img src="${t.lightHero ? LOGOS.onLight : LOGOS.onDark}" width="512" height="512" alt="MentorUnion">
        </span>
        <span>MENTORSHIP GIFT</span>
      </div>`;
    const credits = `<div class="email-credits"><strong>${d.credits}</strong><span>mentorship credits</span></div>`;

    if (id === "milestone") {
      return `
        <header class="email-hero">
          ${brand}
          <p class="eyebrow">${e(t.eyebrow(d))}</p>
          <h2>${e(t.headline(d))}, ${e(d.name)}${scribble}</h2>
          <p>${e(t.lead(d))}</p>
        </header>`;
    }

    if (id === "birthday") {
      return `
        <header class="email-hero">
          ${brand}
          <p class="eyebrow">${e(t.eyebrow(d))}</p>
          ${credits}
          <h2>${e(t.headline(d))}</h2>
          <p>${e(t.lead(d))}</p>
        </header>`;
    }

    if (id === "chapter") {
      return `
        <header class="email-hero">
          ${brand}
          <p class="eyebrow">${e(t.eyebrow(d))}</p>
          <h2>${e(t.headline(d))}</h2>
          <p>${e(t.lead(d))}</p>
        </header>`;
    }

    if (id === "rakhi") {
      return `
        <header class="email-hero">
          ${brand}
          ${rakhiThread}
          <p class="eyebrow">${e(t.eyebrow(d))}</p>
          <h2>${e(t.headline(d))}</h2>
          <p>${e(t.lead(d))}</p>
        </header>`;
    }

    if (id === "note") {
      return `
        <header class="email-hero">
          ${brand}
          <p class="eyebrow">${e(t.eyebrow(d))}</p>
          ${d.message
            ? `<blockquote class="email-hero-note">“${e(d.message)}”</blockquote>`
            : `<h2>${e(t.headline(d))}</h2>`}
          <p>${e(t.lead(d))}</p>
        </header>`;
    }

    return `
      <header class="email-hero">
        ${brand}
        <p class="eyebrow">${e(t.eyebrow(d))}</p>
        <h2>${e(t.headline(d))}</h2>
        <p>${e(t.lead(d))}</p>
      </header>`;
  }

  function emailCard(id = emailTemplateId(), d = emailData()) {
    const t = EMAIL_TEMPLATES[id];
    // The quiet-note design already leads with the message; don't print it twice.
    const showMessage = d.message && id !== "note";
    return `
      <article class="email-card email-card--${id}" aria-label="Gift email preview">
        <div class="email-edge"></div>
        ${emailHero(id, t, d)}
        <div class="email-body">
          ${showMessage ? `<blockquote class="gift-note">“${e(d.message)}”</blockquote>` : ""}
          <p>${e(t.closing(d))}</p>
          <button class="email-button" type="button" data-route="redeem">Claim your credits</button>
          <p class="email-footer">
            Sent to ${e(maskEmail(d.email))} and claimable only from that address, so please don't forward this email.
            · <button class="link-button" type="button" data-action="contact-support">Need help?</button>
          </p>
        </div>
      </article>`;
  }

  function emailMeta(id = emailTemplateId(), d = emailData()) {
    return `
      <div class="email-meta">
        <div><strong>From</strong> MentorUnion &lt;gifts@mentorunion.com&gt;</div>
        <div><strong>To</strong> ${e(d.email)}</div>
        <div><strong>Subject</strong> ${e(EMAIL_TEMPLATES[id].subject(d))}</div>
      </div>`;
  }

  /* A gallery, not a control: cards carry no selected state and nothing is chosen by
     clicking one. The design is committed inside the preview dialog. */
  function templatePicker() {
    return `
      <ul class="template-grid">
        ${TEMPLATE_IDS.map((id) => {
          const t = EMAIL_TEMPLATES[id];
          return `
            <li class="template-option">
              <span class="template-swatch template-swatch--${id}" aria-hidden="true"></span>
              <span class="template-copy">
                <strong>${e(t.name)}</strong>
                <span>${e(t.blurb)}</span>
              </span>
              <button class="template-preview" type="button" data-action="preview-email" data-template="${id}"
                      aria-label="Preview the ${e(t.name)} design">${icons.eye}</button>
            </li>`;
        }).join("")}
      </ul>`;
  }

  function renderGiftEmail() {
    if (!state.gift) return redirectTo("pricing");
    const id = state.gift.template || "signature";
    const d = emailData(state.gift.pack);
    return `
      <section class="route-view">
        ${pageHeading({
          eyebrow: "GIFT EMAIL",
          title: `What ${e(d.name)} receives`,
          copy: `Sent in the ${e(EMAIL_TEMPLATES[id].name)} design. It shows the credits and your message — never the amount you paid.`
        })}
        <div class="email-stage">
          ${emailMeta(id, d)}
          ${emailCard(id, d)}
        </div>
        <div class="button-row">
          <button class="button button--quiet" type="button" data-route="order/confirmation">← Back to your order</button>
          <button class="button button--secondary" type="button" data-route="redeem">Open the gift link</button>
        </div>
      </section>`;
  }

  function renderRedeem() {
    if (!state.gift) return redirectTo("pricing");
    if (state.link === "redeemed") return renderRedeemStatus();

    const p = state.gift.pack;
    const matched = isRecipientAccount();
    return `
      <section class="route-view gift-landing">
        <article class="gift-panel">
          <p class="eyebrow">A GIFT FROM ${e(state.form.senderName).toUpperCase()}</p>
          <h1 class="title" tabindex="-1">${e(state.form.recipientName)}, your next conversation is already paid for</h1>
          <div class="gift-value">
            <strong>${p.credits}</strong><span>mentorship credits</span>
          </div>
          <p class="lead">That's up to ${p.credits} one-on-one sessions of 30 minutes, with mentors you choose. Every mentor shows what a call costs — 1 to 3 credits — before you book.</p>
          ${state.form.message ? `<blockquote class="gift-note" style="margin-top:var(--s6)">“${e(state.form.message)}”</blockquote>` : ""}
          ${note(`Take your time — nothing expires while the gift is unclaimed. Once the credits are in your account, they're valid for ${e(p.validityLabel)}.`)}
          <div class="action-list">
            <button class="button button--primary" type="button" data-action="start-redeem">
              ${matched ? "Continue" : "Claim your credits"}
            </button>
            ${matched ? `<button class="button button--secondary" type="button" data-action="switch-account">Use a different account</button>` : ""}
          </div>
          <p class="caption" style="margin-top:var(--s5)">
            ${matched
              ? `Signed in as ${e(state.session.email)}`
              : `Sent to ${e(maskEmail(state.form.recipientEmail))} · you'll sign in next so the credits reach the right account`}
            · <button class="link-button" type="button" data-action="contact-support">Need help?</button>
          </p>
        </article>
      </section>`;
  }

  function authAccounts() {
    if (state.authNext && state.authNext.startsWith("redeem")) {
      const email = String(state.form.recipientEmail || "").toLowerCase();
      const [local, domain] = email.split("@");
      return {
        google: { email, name: state.form.recipientName || nameFromEmail(email) },
        linkedin: { email: `${local}.work@${domain || "example.com"}`, name: state.form.recipientName || nameFromEmail(email) }
      };
    }
    return {
      google: { email: "arjun@example.com", name: "Arjun" },
      linkedin: { email: "arjun.sharma@work-mail.com", name: "Arjun Sharma" }
    };
  }

  function renderAccount() {
    const forRedemption = state.authNext.startsWith("redeem");
    const choices = authAccounts();
    const p = state.gift ? state.gift.pack : pack();

    const sidebar = forRedemption && state.gift ? `
      <aside class="surface surface--compact surface--sticky" aria-labelledby="auth-context">
        <span class="meta-label">YOUR GIFT IS SAFE</span>
        <h2 class="card-title" id="auth-context" style="margin-top:6px">${p.credits} mentorship credits</h2>
        <dl class="summary-stack" style="margin-top:var(--s5)">
          ${summaryRow("From", state.form.senderName)}
          ${summaryRow("Sessions", `Up to ${p.credits}`)}
          ${summaryRow("Valid for", `${p.validityLabel} after you claim it`)}
          ${summaryRow("Sent to", maskEmail(state.form.recipientEmail))}
        </dl>
        <p class="caption" style="margin-top:var(--s5)">You'll come straight back here after signing in.</p>
      </aside>` : `
      <aside class="surface surface--compact surface--sticky" aria-labelledby="auth-context">
        <span class="meta-label">WHY SIGN IN</span>
        <h2 class="card-title" id="auth-context" style="margin-top:6px">Your credits live in your account</h2>
        <p class="body-copy" style="margin-top:var(--s3)">Signing in keeps your balance, bookings and session history in one place. No payment method is needed to create an account.</p>
      </aside>`;

    return `
      <section class="route-view">
        ${pageHeading({
          eyebrow: forRedemption ? "CLAIM YOUR GIFT" : "ACCOUNT",
          title: forRedemption ? "Add your credits to an account" : "Sign up for MentorUnion",
          copy: forRedemption
            ? "Credits live in an account so nobody else can spend them. Choose the one matching the address the gift was sent to."
            : "Pick the account your credits should go to. If it's new to us, we'll create it as you go."
        })}
        <div class="split">
          <section class="surface" aria-labelledby="auth-title">
            <h2 class="card-title" id="auth-title">Continue with</h2>
            <div class="auth-actions">
              <button class="auth-button google" type="button" data-action="auth" data-provider="google">
                ${icons.google}<span>Continue as ${e(choices.google.email)}</span>
              </button>
              <button class="auth-button linkedin" type="button" data-action="auth" data-provider="linkedin">
                ${icons.linkedin}<span>Continue as ${e(choices.linkedin.email)}</span>
              </button>
            </div>
            <div class="auth-divider" style="margin-block:var(--s5)">or</div>
            <form id="email-auth-form" novalidate>
              ${field({ id: "signInEmail", label: "Use another email address", value: state.pendingEmail, type: "email", autocomplete: "email", inputmode: "email", placeholder: "name@example.com", help: "We'll send a 6-digit code to confirm it's you." })}
              <button class="auth-button email" type="submit" style="margin-top:var(--s4)">
                ${icons.mail}<span>Send me a code</span>
              </button>
            </form>
            <p class="caption" style="margin-top:var(--s6)">By continuing you agree to the Terms of Service and Privacy Policy.</p>
          </section>
          ${sidebar}
        </div>
        <div class="button-row">
          <button class="button button--quiet" type="button" data-route="${forRedemption ? "redeem" : "pricing"}">← Back</button>
        </div>
      </section>`;
  }

  function renderVerify() {
    if (!state.pendingEmail) return redirectTo("account");
    const error = state.errors.code || "";
    const remaining = Math.max(0, Math.ceil((state.resendAt - Date.now()) / 1000));
    return `
      <section class="route-view">
        <div class="panel panel--narrow">
          <p class="eyebrow">VERIFY YOUR EMAIL</p>
          <h1 class="section-title" tabindex="-1">Enter the code we sent you</h1>
          <p class="lead" style="margin-top:var(--s3)">We sent a 6-digit code to <strong class="wrap-anywhere" style="color:var(--text)">${e(state.pendingEmail)}</strong>. It expires in 10 minutes.</p>
          <form id="verify-form" novalidate>
            <fieldset>
              <legend class="sr-only">Six-digit verification code</legend>
              <div class="code-inputs">
                ${Array.from({ length: 6 }, (_, i) => `<input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="1"
                  data-code-index="${i}" aria-label="Digit ${i + 1} of 6" aria-invalid="${error ? "true" : "false"}" aria-describedby="code-error">`).join("")}
              </div>
              <p class="field__error" id="code-error" role="alert">${e(error)}</p>
            </fieldset>
            <div class="action-list">
              <button class="button button--primary" type="submit">Verify and continue</button>
              <button class="button button--quiet" type="button" data-action="resend-code" ${remaining > 0 ? "disabled" : ""}>
                ${remaining > 0 ? `Resend in ${remaining}s` : "Resend code"}
              </button>
            </div>
          </form>
          <div class="action-list action-list--divided">
            <button class="link-button" type="button" data-route="account">Use a different email</button>
          </div>
        </div>
      </section>`;
  }

  function renderRedeemConfirm() {
    if (!state.gift) return redirectTo("pricing");
    if (state.link === "redeemed") return renderRedeemStatus();
    if (!state.session) {
      state.authNext = "redeem/confirm";
      return redirectTo("account");
    }

    const p = state.gift.pack;

    if (!isRecipientAccount()) {
      return `
        <section class="route-view">
          <div class="panel">
            <div class="status-mark status-mark--warning" aria-hidden="true">${icons.bang}</div>
            <p class="eyebrow">WRONG ACCOUNT</p>
            <h1 class="section-title" tabindex="-1">This gift was sent to a different address</h1>
            <p class="lead" style="margin-top:var(--s3)">You're signed in as <strong style="color:var(--text)">${e(state.session.email)}</strong>, but this gift was sent to ${e(maskEmail(state.form.recipientEmail))}. Your gift is safe and hasn't been claimed.</p>
            ${note("Credits can only be added to the address the sender used. Sign in with that account to continue.")}
            <div class="action-list">
              <button class="button button--primary" type="button" data-action="switch-account">Sign in with another account</button>
              <button class="button button--secondary" type="button" data-route="redeem">Back to the gift</button>
            </div>
          </div>
        </section>`;
    }

    const existing = account(state.session.email);
    const before = existing ? existing.balance : 0;
    const validity = validityWindow(p);
    const processing = state.redemption === "processing";

    return `
      <section class="route-view" ${processing ? 'aria-busy="true"' : ""}>
        <div class="panel">
          ${processing ? '<div class="spinner" aria-hidden="true"></div>' : `<div class="status-mark status-mark--info" aria-hidden="true">${icons.gift}</div>`}
          <p class="eyebrow">${processing ? "ADDING YOUR CREDITS" : "CONFIRM"}</p>
          <h1 class="section-title" tabindex="-1">${processing ? "Adding your credits…" : "Add these credits to your account"}</h1>
          <p class="lead" style="margin-top:var(--s3)">${p.credits} mentorship credits from ${e(state.form.senderName)}.</p>
          <dl class="summary-stack" style="margin-top:var(--s7)">
            ${summaryRow("Account", state.session.email)}
            ${summaryRow("Current balance", `${before} credits`)}
            ${summaryRow("This gift", `+${p.credits} credits`, "credit")}
            ${summaryRow("New balance", `${before + p.credits} credits`, "total")}
            ${summaryRow("Gift valid until", validity.end)}
          </dl>
          ${note("Once added, these credits belong to this account and can't be moved. The clock starts today.")}
          <div class="action-list">
            <button class="button button--primary" type="button" data-action="confirm-redeem" ${processing ? "disabled" : ""}>
              Add ${p.credits} credits
            </button>
            <button class="button button--quiet" type="button" data-action="switch-account" ${processing ? "disabled" : ""}>Not your account?</button>
          </div>
        </div>
      </section>`;
  }

  function renderRedeemDone() {
    if (!state.gift || state.link !== "redeemed" || !state.session) return redirectTo("redeem");
    const p = state.gift.pack;
    const acc = account(state.session.email);
    const before = acc.balance - p.credits;
    return `
      <section class="route-view">
        <div class="panel panel--wide">
          <div class="status-mark" aria-hidden="true">${icons.tick}</div>
          <p class="eyebrow">GIFT CLAIMED</p>
          <h1 class="title" tabindex="-1">${p.credits} credits are in your account</h1>
          <p class="lead">Your gift from ${e(state.form.senderName)} is ready to use. Find someone worth talking to and book when it suits you.</p>

          <div class="balance-grid">
            <div class="balance-cell">
              <span class="meta-label">BEFORE</span>
              <strong>${before}</strong><small>credits</small>
            </div>
            <div class="balance-cell balance-cell--gain">
              <span class="meta-label">GIFT ADDED</span>
              <strong>+${p.credits}</strong><small>credits</small>
            </div>
            <div class="balance-cell">
              <span class="meta-label">NEW BALANCE</span>
              <strong>${acc.balance}</strong><small>credits</small>
            </div>
          </div>

          ${note(`These gift credits are valid until ${e(state.validUntil)}. Each mentor's cost — 1 to 3 credits — is shown on their profile before you book.`)}

          <div class="action-list action-list--divided">
            <button class="button button--primary" type="button" data-action="find-mentor">Find a mentor</button>
            <button class="button button--secondary" type="button" data-route="wallet">View my credits</button>
          </div>
        </div>
      </section>`;
  }

  function renderRedeemStatus() {
    const p = state.gift ? state.gift.pack : pack();
    const mine = isRecipientAccount();
    return `
      <section class="route-view">
        <div class="panel">
          <div class="status-mark status-mark--neutral" aria-hidden="true">${icons.tick}</div>
          <p class="eyebrow">ALREADY CLAIMED</p>
          <h1 class="section-title" tabindex="-1">This gift has already been claimed</h1>
          <p class="lead" style="margin-top:var(--s3)">
            ${p.credits} credits were added${state.redeemedOn ? ` on ${e(state.redeemedOn)}` : ""} to the account this gift was sent to. A gift can only be claimed once.
          </p>
          ${note(mine
            ? "The credits are in your account and ready to use."
            : "Sign in to the account the gift was sent to if you want to see the credits.")}
          <div class="action-list">
            ${mine
              ? `<button class="button button--primary" type="button" data-route="wallet">View my credits</button>`
              : `<button class="button button--primary" type="button" data-action="switch-account">Sign in</button>`}
            <button class="button button--quiet" type="button" data-action="contact-support">Something looks wrong?</button>
          </div>
        </div>
      </section>`;
  }

  function renderWallet() {
    if (!state.session) {
      state.authNext = "wallet";
      return redirectTo("account");
    }
    const acc = ensureAccount(state.session.email, state.session.name);

    if (!acc.lots.length) {
      return `
        <section class="route-view">
          ${pageHeading({
            eyebrow: "MY CREDITS",
            title: "You don't have any credits yet",
            copy: "Buy a pack to start booking 1:1 sessions, or claim a gift someone has sent you."
          })}
          <div class="panel panel--narrow">
            <div class="status-mark status-mark--neutral" aria-hidden="true">${icons.wallet}</div>
            <h2 class="card-title">Balance: 0 credits</h2>
            <p class="body-copy" style="margin-top:var(--s3)">Credits are valid for a fixed period from the day they're added, and each mentor shows what a call costs before you book.</p>
            <div class="action-list">
              <button class="button button--primary" type="button" data-route="pricing">Browse credit packs</button>
            </div>
          </div>
        </section>`;
    }

    return `
      <section class="route-view">
        ${pageHeading({
          eyebrow: "MY CREDITS",
          title: `${acc.balance} credits available`,
          copy: `Signed in as ${e(state.session.email)}. Credits are spent when you book, and each mentor lists what a call costs.`
        })}
        <div class="panel panel--wide">
          <div class="surface__head">
            <div>
              <span class="meta-label">YOUR PACKS</span>
              <h2 class="card-title" style="margin-top:6px">Where your credits came from</h2>
            </div>
            <button class="link-button" type="button" data-route="pricing">Buy more</button>
          </div>
          <div class="lot-list">
            ${acc.lots.map((lot) => `
              <div class="lot">
                <div class="lot__copy">
                  <strong>${e(lot.label)}</strong>
                  <span>Added ${e(lot.addedOn)} · valid until ${e(lot.validUntil)}</span>
                </div>
                <span class="lot__value">${lot.credits} credits</span>
              </div>`).join("")}
          </div>
          <div class="action-list action-list--divided">
            <button class="button button--primary" type="button" data-action="find-mentor">Find a mentor</button>
            <button class="button button--secondary" type="button" data-route="pricing">Buy more credits</button>
            <button class="link-button" type="button" data-action="sign-out">Sign out</button>
          </div>
        </div>
      </section>`;
  }

  /* ------------------------------------------------------------ routing -- */

  let pendingRedirect = "";

  function redirectTo(route) {
    pendingRedirect = route;
    return `<section class="route-view"><div class="panel panel--narrow"><div class="processing"><div class="spinner" aria-hidden="true"></div></div></div></section>`;
  }

  function currentRoute() {
    const raw = window.location.hash.replace(/^#\/?/, "");
    return ROUTES.has(raw) ? raw : "pricing";
  }

  function navigate(route) {
    const target = ROUTES.has(route) ? route : "pricing";
    if (currentRoute() === target) {
      render();
      return;
    }
    window.location.hash = `#/${target}`;
  }

  const RENDERERS = {
    "pricing": renderPricing,
    "gift/choose": renderGiftChoose,
    "gift/details": renderGiftDetails,
    "gift/review": renderGiftReview,
    "checkout": renderCheckout,
    "order/confirmation": renderConfirmation,
    "gift/email": renderGiftEmail,
    "redeem": renderRedeem,
    "account": renderAccount,
    "verify": renderVerify,
    "redeem/confirm": renderRedeemConfirm,
    "redeem/done": renderRedeemDone,
    "redeem/status": renderRedeemStatus,
    "wallet": renderWallet
  };

  function render() {
    const route = currentRoute();
    pendingRedirect = "";
    const markup = RENDERERS[route]();

    if (pendingRedirect && pendingRedirect !== route) {
      const target = pendingRedirect;
      pendingRedirect = "";
      persist();
      navigate(target);
      return;
    }

    document.title = `${ROUTE_TITLES[route]} · MentorUnion`;
    hideTooltip();
    app.innerHTML = markup;
    syncChrome(route);
    syncPricingCarousel();
    persist();

    if (lastRoute !== route) {
      lastRoute = route;
      window.scrollTo({ top: 0, behavior: "auto" });
      window.setTimeout(() => {
        const heading = app.querySelector("h1");
        if (heading) heading.focus({ preventScroll: true });
      }, 0);
    }

    if (route === "verify" && state.resendAt > Date.now()) startCooldown();
    if (!state.catalogueReady && (route === "pricing" || route === "gift/choose") && !timers.catalogue) {
      timers.catalogue = window.setTimeout(() => {
        timers.catalogue = null;
        state.catalogueReady = true;
        persist();
        const now = currentRoute();
        if (now === "pricing" || now === "gift/choose") render();
      }, 450);
    }
  }

  function syncChrome(route) {
    const active = NAV_FOR_ROUTE[route] || "";
    navLinks.querySelectorAll("[data-nav]").forEach((link) => {
      if (link.dataset.nav === active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    const signIn = navLinks.querySelector('[data-action="sign-in"], [data-action="sign-out"]');
    if (signIn) {
      if (state.session) {
        signIn.dataset.action = "sign-out";
        signIn.textContent = state.session.name;
        signIn.setAttribute("title", `Signed in as ${state.session.email}`);
      } else {
        signIn.dataset.action = "sign-in";
        signIn.textContent = "Sign up";
        signIn.removeAttribute("title");
      }
    }

    navLinks.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
  }

  /* --------------------------------------------------------- validation -- */

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value).trim());
  }

  function containsLink(value) {
    return /(?:https?:\/\/|www\.|\b(?:[a-z0-9-]+\.)+[a-z]{2,63}(?:\/\S*)?\b)/i.test(value);
  }

  function validateDetail(name, value) {
    const trimmed = String(value ?? "").trim();
    if (name === "recipientName") {
      if (!trimmed) return "Enter your recipient's name.";
      if (trimmed.length > 80) return "Use 80 characters or fewer.";
    }
    if (name === "senderName") {
      if (!trimmed) return "Enter the name your recipient will recognise.";
      if (trimmed.length > 80) return "Use 80 characters or fewer.";
    }
    if (name === "recipientEmail") {
      if (!trimmed) return "Enter your recipient's email address.";
      if (!isValidEmail(trimmed)) return "Enter a complete email address, like name@example.com.";
      const sender = String(state.form.senderEmail || "").trim().toLowerCase();
      if (sender && trimmed.toLowerCase() === sender) {
        return "This is your own address. Buy credits for yourself from the pricing page instead.";
      }
    }
    if (name === "senderEmail") {
      if (!trimmed) return "Enter your email address so we can send your receipt.";
      if (!isValidEmail(trimmed)) return "Enter a complete email address, like name@example.com.";
    }
    if (name === "message") {
      if (trimmed.length > 300) return "Keep your message to 300 characters or fewer.";
      if (containsLink(trimmed)) return "Messages can't contain links. Remove it to continue.";
    }
    return "";
  }

  function luhn(number) {
    const digits = String(number).replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    let double = false;
    for (let i = digits.length - 1; i >= 0; i -= 1) {
      let value = Number(digits[i]);
      if (double) {
        value *= 2;
        if (value > 9) value -= 9;
      }
      sum += value;
      double = !double;
    }
    return sum % 10 === 0;
  }

  function validatePayment(name, value) {
    const trimmed = String(value ?? "").trim();
    if (name === "upiId") {
      if (!trimmed) return "Enter your UPI ID.";
      if (!/^[\w.\-]{2,}@[a-z]{2,}$/i.test(trimmed)) return "Enter a UPI ID in the form yourname@bank.";
    }
    if (name === "cardNumber") {
      if (!trimmed) return "Enter your card number.";
      if (!luhn(trimmed)) return "Check the card number and try again.";
    }
    if (name === "cardName") {
      if (!trimmed) return "Enter the name printed on the card.";
    }
    if (name === "cardExpiry") {
      if (!trimmed) return "Enter the expiry date.";
      const match = trimmed.match(/^(\d{2})\/(\d{2})$/);
      if (!match) return "Use the format MM/YY.";
      const month = Number(match[1]);
      const year = 2000 + Number(match[2]);
      if (month < 1 || month > 12) return "Enter a month between 01 and 12.";
      const expiry = new Date(year, month, 0, 23, 59, 59);
      if (expiry < new Date()) return "This card has expired.";
    }
    if (name === "cardCvv") {
      if (!trimmed) return "Enter the CVV.";
      if (!/^\d{3,4}$/.test(trimmed)) return "The CVV is 3 or 4 digits.";
    }
    return "";
  }

  function paymentFields() {
    return state.payment.method === "upi"
      ? ["upiId"]
      : ["cardNumber", "cardName", "cardExpiry", "cardCvv"];
  }

  function fieldError(name) {
    const isPayment = ["upiId", "cardNumber", "cardName", "cardExpiry", "cardCvv"].includes(name);
    const value = isPayment ? state.payment[name] : state.form[name];
    return isPayment ? validatePayment(name, value) : validateDetail(name, value);
  }

  function refreshFieldError(name) {
    const input = document.querySelector(`[data-field="${name}"]`);
    const output = document.querySelector(`#${CSS.escape(name)}-error`);
    const error = fieldError(name);
    if (error) state.errors[name] = error;
    else delete state.errors[name];
    if (input) input.setAttribute("aria-invalid", error ? "true" : "false");
    if (output) output.textContent = error;
    persist();
  }

  function validateGroup(names) {
    const errors = {};
    names.forEach((name) => {
      const error = fieldError(name);
      if (error) errors[name] = error;
    });
    state.errors = errors;
    persist();
    return Object.keys(errors).length === 0;
  }

  /* ------------------------------------------------------------ actions -- */

  function goToCheckout(mode, packId) {
    state.mode = mode;
    if (packId) state.selectedPack = packId;
    state.payment.status = "idle";
    state.errors = {};
    if (mode === "self" && !state.session) {
      state.authNext = "checkout";
      persist();
      navigate("account");
      return;
    }
    persist();
    navigate("checkout");
  }

  function submitPayment() {
    if (state.payment.status === "processing") return;
    if (!validateGroup(paymentFields())) {
      render();
      window.setTimeout(() => app.querySelector('[aria-invalid="true"]')?.focus(), 0);
      announce("Check the highlighted payment details.");
      return;
    }

    state.payment.status = "processing";
    persist();
    render();
    announce("Confirming your payment.");

    timers.payment = window.setTimeout(() => {
      completeOrder();
    }, 1400);
  }

  function completeOrder() {
    const p = pack();
    const q = quoteFor(p);
    const now = new Date();
    const methodLabel = state.payment.method === "upi"
      ? `UPI · ${state.payment.upiId}`
      : `${cardBrand(state.payment.cardNumber) || "Card"} ending ${String(state.payment.cardNumber).replace(/\D/g, "").slice(-4)}`;

    state.payment.status = "idle";
    state.payment.cardNumber = "";
    state.payment.cardCvv = "";

    if (state.mode === "self") {
      const acc = ensureAccount(state.session.email, state.session.name);
      const validity = validityWindow(p, now);
      acc.balance += p.credits;
      acc.lots.unshift({
        credits: p.credits,
        label: packLabel(p),
        addedOn: validity.start,
        validUntil: validity.end
      });
      state.order = {
        mode: "self",
        pack: p,
        reference: orderReference(),
        total: q.total,
        currency: state.currency,
        methodLabel,
        placedOn: formatDate(now),
        receiptEmail: state.session.email,
        validUntil: validity.end
      };
      persist();
      navigate("order/confirmation");
      announce(`Payment successful. ${p.credits} credits added to your account.`);
      return;
    }

    state.gift = {
      mode: "gift",
      pack: p,
      template: emailTemplateId(),
      reference: orderReference(),
      total: q.total,
      currency: state.currency,
      methodLabel,
      placedOn: formatDate(now),
      receiptEmail: state.form.senderEmail,
      lastSentAt: "",
      addressChanged: false
    };
    state.order = { mode: "gift", reference: state.gift.reference };
    state.link = "active";
    state.delivery = "queued";
    persist();
    navigate("order/confirmation");
    announce("Payment successful. Your gift is being sent.");
    scheduleDelivery();
  }

  function scheduleDelivery() {
    if (timers.delivery) window.clearTimeout(timers.delivery);
    timers.delivery = window.setTimeout(() => {
      state.delivery = "sent";
      if (state.gift) state.gift.lastSentAt = formatTime(new Date());
      persist();
      if (currentRoute() === "order/confirmation") render();
      toast("Gift email delivered.");
    }, 2200);
  }

  function resendGift() {
    if (!state.gift || state.link === "redeemed" || state.delivery === "queued") return;
    state.delivery = "queued";
    persist();
    render();
    announce("Resending the gift email.");
    scheduleDelivery();
  }

  function signIn(email, name) {
    const key = String(email).toLowerCase();
    const existing = account(key);
    ensureAccount(key, name);
    state.session = { email: key, name: existing ? existing.name : (name || nameFromEmail(key)) };
    state.pendingEmail = "";
    state.errors = {};
    const next = state.authNext || "wallet";
    state.authNext = "";
    persist();
    navigate(next);
    announce(`Signed in as ${key}.`);
  }

  function startCooldown() {
    if (timers.cooldown) window.clearTimeout(timers.cooldown);
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((state.resendAt - Date.now()) / 1000));
      const button = document.querySelector('[data-action="resend-code"]');
      if (!button) return;
      if (remaining > 0) {
        button.textContent = `Resend in ${remaining}s`;
        button.disabled = true;
        timers.cooldown = window.setTimeout(tick, 1000);
      } else {
        button.textContent = "Resend code";
        button.disabled = false;
      }
    };
    tick();
  }

  function confirmRedemption() {
    if (state.redemption === "processing" || state.link === "redeemed") return;
    state.redemption = "processing";
    persist();
    render();
    announce("Adding your credits.");

    timers.redemption = window.setTimeout(() => {
      const p = state.gift.pack;
      const acc = ensureAccount(state.session.email, state.session.name);
      const validity = validityWindow(p);
      acc.balance += p.credits;
      acc.lots.unshift({
        credits: p.credits,
        label: `${packLabel(p)} · gift from ${state.form.senderName}`,
        addedOn: validity.start,
        validUntil: validity.end
      });
      state.redemption = "done";
      state.link = "redeemed";
      state.redeemedOn = validity.start;
      state.validUntil = validity.end;
      persist();
      navigate("redeem/done");
      announce(`${p.credits} credits added to your account.`);
    }, 1200);
  }

  /* Patch the counter in place. Re-rendering the whole route for a quantity tick
     rebuilt every card and made the page flicker. */
  function setCustomQuantity(next, { fromInput = false } = {}) {
    const clamped = Math.min(CUSTOM_CREDITS.max, Math.max(CUSTOM_CREDITS.min, Number(next) || CUSTOM_CREDITS.min));
    state.customQuantity = clamped;
    if (state.selectedPack === "custom") state.customPack = customPackFor(clamped);
    persist();

    const unit = amount(CUSTOM_CREDITS.rate);
    const field = document.querySelector("[data-custom-quantity]");
    const total = document.querySelector("[data-custom-total]");
    const minus = document.querySelector('[data-action="custom-decrease"]');
    const plus = document.querySelector('[data-action="custom-increase"]');
    const choose = document.querySelector('[data-action="select-custom"]');

    if (field && !fromInput) field.value = String(clamped);
    if (total) total.textContent = money(unit * clamped);
    if (minus) minus.disabled = clamped <= CUSTOM_CREDITS.min;
    if (plus) plus.disabled = clamped >= CUSTOM_CREDITS.max;
    if (choose && state.selectedPack !== "custom") {
      choose.textContent = `Choose ${clamped} credit${clamped === 1 ? "" : "s"}`;
    }
    announce(`${clamped} ${clamped === 1 ? "credit" : "credits"}, ${money(unit * clamped)} plus taxes.`);
  }

  /* Let the selection land visibly before moving on — unless motion is reduced,
     where the pause would just read as lag. */
  function advanceAfterSelection(route = "gift/details") {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => navigate(route), reduced ? 0 : 340);
  }

  function renderPreview() {
    const id = EMAIL_TEMPLATES[previewTemplate] ? previewTemplate : emailTemplateId();
    const d = emailData();
    previewDialog.querySelector("#preview-picker").innerHTML = `
      <div class="preview-tabs" role="tablist" aria-label="Gift email design">
        ${TEMPLATE_IDS.map((tid) => `
          <button class="preview-tab${tid === id ? " is-active" : ""}" type="button" role="tab"
                  aria-selected="${tid === id}" data-action="set-preview" data-template="${tid}">
            ${e(EMAIL_TEMPLATES[tid].name)}
          </button>`).join("")}
      </div>`;
    previewDialog.querySelector("#preview-stage").innerHTML = `${emailMeta(id, d)}${emailCard(id, d)}`;
    previewDialog.querySelector('[data-action="use-template"]').textContent =
      id === emailTemplateId() ? "Keep this design" : "Use this design";
  }

  function announce(message) {
    liveRegion.textContent = "";
    window.setTimeout(() => { liveRegion.textContent = message; }, 10);
  }

  function toast(message) {
    if (timers.toast) window.clearTimeout(timers.toast);
    toastRegion.innerHTML = `<div class="toast">${icons.check}<span>${e(message)}</span></div>`;
    timers.toast = window.setTimeout(() => { toastRegion.innerHTML = ""; }, 3600);
  }

  /* ------------------------------------------------------------- events -- */

  document.addEventListener("click", (event) => {
    const inert = event.target.closest('a[href="#"]');
    if (inert) {
      event.preventDefault();
      return;
    }

    const routeTrigger = event.target.closest("[data-route]");
    if (routeTrigger) {
      event.preventDefault();
      navigate(routeTrigger.dataset.route);
      return;
    }

    const trigger = event.target.closest("[data-action]");
    if (!trigger) return;
    const action = trigger.dataset.action;

    if (action === "toggle-menu") {
      const open = navLinks.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(open));
      return;
    }

    if (action === "set-currency") {
      state.currency = trigger.dataset.currency;
      persist();
      render();
      announce(`Prices now shown in ${state.currency}.`);
      return;
    }

    if (action === "custom-decrease" || action === "custom-increase") {
      const direction = action === "custom-increase" ? 1 : -1;
      setCustomQuantity(state.customQuantity + (direction * CUSTOM_CREDITS.step));
      return;
    }

    if (action === "buy-custom") {
      state.customPack = customPackFor(state.customQuantity);
      goToCheckout("self", "custom");
      return;
    }

    if (action === "select-custom") {
      state.customPack = customPackFor(state.customQuantity);
      state.selectedPack = "custom";
      persist();
      render();
      announce(`${state.customQuantity} custom credits selected.`);
      advanceAfterSelection();
      return;
    }

    // Previewing never changes the selection — only "Use this design" commits.
    if (action === "preview-email") {
      previewTemplate = EMAIL_TEMPLATES[trigger.dataset.template] ? trigger.dataset.template : emailTemplateId();
      renderPreview();
      previewDialog.showModal();
      window.setTimeout(() => document.querySelector("#preview-title")?.focus(), 0);
      return;
    }

    if (action === "set-preview") {
      previewTemplate = trigger.dataset.template;
      renderPreview();
      window.setTimeout(() => previewDialog.querySelector(`[data-template="${previewTemplate}"]`)?.focus(), 0);
      announce(`Previewing the ${EMAIL_TEMPLATES[previewTemplate].name} design.`);
      return;
    }

    if (action === "close-preview") { previewDialog.close(); return; }

    if (action === "use-template") {
      state.emailTemplate = previewTemplate;
      persist();
      previewDialog.close();
      toast(`${EMAIL_TEMPLATES[state.emailTemplate].name} design selected.`);
      return;
    }

    if (action === "toggle-topic") {
      const topic = trigger.dataset.topic;
      const topics = state.recommendation.topics;
      state.recommendation.topics = topics.includes(topic)
        ? topics.filter((item) => item !== topic)
        : [...topics, topic];
      delete state.recommendation.errors.topics;
      persist();
      trigger.setAttribute("aria-pressed", String(state.recommendation.topics.includes(topic)));
      const topicError = document.querySelector("#recommendation-topic-error");
      if (topicError) topicError.hidden = true;
      return;
    }

    if (action === "recommendation-reset") {
      state.recommendation = { topics: [], context: "", email: "", sent: null, errors: {} };
      persist();
      render();
      window.setTimeout(() => app.querySelector("#recommendation-form .topic")?.focus(), 0);
      return;
    }

    if (action === "select-pack") {
      // The card CTA commits and moves on; clicking the card body only selects.
      const commits = trigger.classList.contains("plan-cta") && currentRoute() === "gift/choose";
      state.selectedPack = trigger.dataset.packId;
      state.customPack = null;
      persist();
      render();
      announce(`${PACKS[state.selectedPack].name} pack selected, ${PACKS[state.selectedPack].credits} credits.`);
      if (commits) advanceAfterSelection();
      return;
    }

    if (action === "buy-pack") {
      state.customPack = null;
      goToCheckout("self", trigger.dataset.packId);
      return;
    }

    if (action === "go-checkout") {
      goToCheckout("gift");
      return;
    }

    if (action === "resend-gift") { resendGift(); return; }

    if (action === "open-correction") {
      document.querySelector("#correction-old-email").textContent = state.form.recipientEmail;
      const input = document.querySelector("#corrected-email");
      input.value = "";
      input.setAttribute("aria-invalid", "false");
      document.querySelector("#corrected-email-error").textContent = "";
      correctionDialog.showModal();
      window.setTimeout(() => input.focus(), 0);
      return;
    }

    if (action === "close-correction") { correctionDialog.close(); return; }

    if (action === "start-redeem") {
      if (isRecipientAccount()) navigate("redeem/confirm");
      else {
        state.authNext = "redeem/confirm";
        persist();
        navigate("account");
      }
      return;
    }

    if (action === "switch-account") {
      state.session = null;
      state.pendingEmail = "";
      state.authNext = state.gift && state.link !== "redeemed" ? "redeem/confirm" : "wallet";
      persist();
      navigate("account");
      return;
    }

    if (action === "auth") {
      const choice = authAccounts()[trigger.dataset.provider];
      signIn(choice.email, choice.name);
      return;
    }

    if (action === "resend-code") {
      if (state.resendAt > Date.now()) return;
      state.resendAt = Date.now() + RESEND_COOLDOWN * 1000;
      delete state.errors.code;
      persist();
      render();
      toast(`A new code is on its way to ${state.pendingEmail}.`);
      return;
    }

    if (action === "confirm-redeem") { confirmRedemption(); return; }

    if (action === "sign-in") {
      state.authNext = "wallet";
      persist();
      navigate("account");
      return;
    }

    if (action === "sign-out") {
      state.session = null;
      persist();
      navigate("pricing");
      toast("You've been signed out.");
      return;
    }

    if (action === "find-mentor") { toast("Mentor search opens next."); return; }
    if (action === "contact-support") { toast("Our support team will be in touch by email."); return; }
  });

  document.addEventListener("change", (event) => {
    const method = event.target.closest("[data-method]");
    if (!method) return;
    state.payment.method = method.dataset.method;
    state.errors = {};
    persist();
    render();
    window.setTimeout(() => {
      app.querySelector(`[data-method="${state.payment.method}"]`)?.focus();
    }, 0);
  });

  document.addEventListener("input", (event) => {
    const quantity = event.target.closest("[data-custom-quantity]");
    if (quantity) {
      const digits = quantity.value.replace(/\D/g, "").slice(0, 3);
      quantity.value = digits;
      // Let the field sit empty mid-edit; commit on blur.
      if (digits) setCustomQuantity(digits, { fromInput: true });
      return;
    }

    const recommendationField = event.target.closest("[data-recommendation-field]");
    if (recommendationField) {
      const name = recommendationField.dataset.recommendationField;
      state.recommendation[name] = recommendationField.value;
      if (name === "context") {
        const counter = document.querySelector("[data-character-count]");
        if (counter) counter.textContent = String(recommendationField.value.length);
      }
      if (name === "email" && state.recommendation.errors.email) {
        delete state.recommendation.errors.email;
        recommendationField.setAttribute("aria-invalid", "false");
        const emailError = document.querySelector("#recommendation-email-error");
        if (emailError) emailError.hidden = true;
      }
      persist();
      return;
    }

    const fieldEl = event.target.closest("[data-field]");
    if (fieldEl) {
      const name = fieldEl.dataset.field;

      if (name === "cardNumber") {
        const digits = fieldEl.value.replace(/\D/g, "").slice(0, 19);
        fieldEl.value = digits.replace(/(.{4})/g, "$1 ").trim();
      }
      if (name === "cardExpiry") {
        const digits = fieldEl.value.replace(/\D/g, "").slice(0, 4);
        fieldEl.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
      }
      if (name === "cardCvv") {
        fieldEl.value = fieldEl.value.replace(/\D/g, "").slice(0, 4);
      }

      if (["upiId", "cardNumber", "cardName", "cardExpiry", "cardCvv"].includes(name)) {
        state.payment[name] = fieldEl.value;
      } else if (name === "signInEmail") {
        state.pendingEmail = fieldEl.value;
      } else {
        state.form[name] = fieldEl.value;
        if (name === "message") {
          const counter = document.querySelector("#message-counter");
          if (counter) counter.textContent = `${fieldEl.value.length}/300`;
        }
      }

      persist();
      if (state.errors[name]) refreshFieldError(name);
      return;
    }

    const codeInput = event.target.closest("[data-code-index]");
    if (codeInput) {
      codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 1);
      if (codeInput.value) {
        document.querySelector(`[data-code-index="${Number(codeInput.dataset.codeIndex) + 1}"]`)?.focus();
      }
    }
  });

  document.addEventListener("focusout", (event) => {
    const quantity = event.target.closest("[data-custom-quantity]");
    if (quantity) {
      setCustomQuantity(quantity.value);
      quantity.value = String(state.customQuantity);
      return;
    }

    const fieldEl = event.target.closest("[data-field]");
    if (fieldEl && fieldEl.dataset.field !== "signInEmail") refreshFieldError(fieldEl.dataset.field);
  });

  document.addEventListener("keydown", (event) => {
    const codeInput = event.target.closest("[data-code-index]");
    if (codeInput && event.key === "Backspace" && !codeInput.value) {
      document.querySelector(`[data-code-index="${Number(codeInput.dataset.codeIndex) - 1}"]`)?.focus();
    }
  });

  document.addEventListener("paste", (event) => {
    if (!event.target.closest("[data-code-index]")) return;
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    event.preventDefault();
    document.querySelectorAll("[data-code-index]").forEach((input, index) => { input.value = digits[index] || ""; });
    document.querySelector(`[data-code-index="${Math.min(digits.length, 6) - 1}"]`)?.focus();
  });

  document.addEventListener("submit", (event) => {
    if (event.target.id === "details-form") {
      event.preventDefault();
      ["recipientName", "recipientEmail", "senderName", "senderEmail"].forEach((key) => {
        state.form[key] = String(state.form[key] || "").trim();
      });
      if (validateGroup(["recipientName", "recipientEmail", "senderName", "senderEmail", "message"])) {
        navigate("gift/review");
      } else {
        render();
        window.setTimeout(() => app.querySelector('[aria-invalid="true"]')?.focus(), 0);
        announce("Check the highlighted details.");
      }
      return;
    }

    if (event.target.id === "payment-form") {
      event.preventDefault();
      submitPayment();
      return;
    }

    if (event.target.id === "recommendation-form") {
      event.preventDefault();
      const r = state.recommendation;
      r.errors = {};
      if (!r.topics.length) r.errors.topics = "Choose at least one goal so we can recommend a pack.";
      if (!isValidEmail(r.email)) r.errors.email = "Enter a complete email address, like you@company.com.";
      persist();
      if (Object.keys(r.errors).length) {
        render();
        window.setTimeout(() => {
          const target = r.errors.topics
            ? app.querySelector("#recommendation-form .topic")
            : app.querySelector("#recommendation-email");
          target?.focus();
        }, 0);
        announce("Check the highlighted recommendation details.");
        return;
      }
      r.sent = { email: r.email.trim(), topics: [...r.topics] };
      persist();
      render();
      announce(`Recommendation request sent. We'll email ${r.sent.email}.`);
      return;
    }

    if (event.target.id === "email-auth-form") {
      event.preventDefault();
      const email = String(state.pendingEmail || "").trim();
      const output = document.querySelector("#signInEmail-error");
      const input = document.querySelector("#signInEmail");
      if (!isValidEmail(email)) {
        if (output) output.textContent = "Enter a complete email address, like name@example.com.";
        if (input) { input.setAttribute("aria-invalid", "true"); input.focus(); }
        return;
      }
      state.pendingEmail = email;
      state.resendAt = Date.now() + RESEND_COOLDOWN * 1000;
      delete state.errors.code;
      persist();
      navigate("verify");
      announce(`A verification code has been sent to ${email}.`);
      return;
    }

    if (event.target.id === "verify-form") {
      event.preventDefault();
      const code = Array.from(document.querySelectorAll("[data-code-index]")).map((input) => input.value).join("");
      if (!/^\d{6}$/.test(code)) {
        state.errors.code = "Enter all six digits of the code.";
        persist();
        render();
        window.setTimeout(() => app.querySelector("[data-code-index]")?.focus(), 0);
        return;
      }
      delete state.errors.code;
      signIn(state.pendingEmail);
    }
  });

  correctionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.querySelector("#corrected-email");
    const output = document.querySelector("#corrected-email-error");
    const next = input.value.trim();

    let error = "";
    if (!isValidEmail(next)) error = "Enter a complete email address, like name@example.com.";
    else if (next.toLowerCase() === String(state.form.recipientEmail).toLowerCase()) error = "That's the address we're already using.";

    if (error) {
      input.setAttribute("aria-invalid", "true");
      output.textContent = error;
      input.focus();
      return;
    }

    state.form.recipientEmail = next;
    state.gift.addressChanged = true;
    state.delivery = "queued";
    persist();
    correctionDialog.close();
    render();
    announce(`The gift is now being sent to ${next}.`);
    scheduleDelivery();
  });

  correctionDialog.addEventListener("close", () => {
    document.querySelector('[data-action="open-correction"]')?.focus();
  });

  // The picker behind the dialog goes stale while designs are switched inside it.
  previewDialog.addEventListener("close", () => {
    render();
    window.setTimeout(() => app.querySelector('[data-action="preview-email"]')?.focus(), 0);
  });

  /* ------------------------------------------------- feature tooltips -- */

  const infoTooltip = document.querySelector("#feature-tooltip");
  let activeTrigger = null;
  let pinnedTrigger = null;

  function positionTooltip(trigger = activeTrigger) {
    if (!trigger) return;
    const margin = 12;
    const gap = 10;
    const rect = trigger.getBoundingClientRect();
    const width = infoTooltip.offsetWidth;
    const height = infoTooltip.offsetHeight;
    const maxLeft = Math.max(margin, window.innerWidth - width - margin);
    const maxTop = Math.max(margin, window.innerHeight - height - margin);
    let left = rect.left + (rect.width / 2) - (width / 2);
    let top = rect.top - height - gap;
    left = Math.min(Math.max(left, margin), maxLeft);
    if (top < margin) top = rect.bottom + gap;
    top = Math.min(Math.max(top, margin), maxTop);
    infoTooltip.style.left = `${Math.round(left)}px`;
    infoTooltip.style.top = `${Math.round(top)}px`;
  }

  function showTooltip(trigger, { pinned = false } = {}) {
    document.querySelectorAll(".info-trigger").forEach((button) => {
      button.setAttribute("aria-expanded", String(button === trigger));
      button.removeAttribute("aria-describedby");
    });
    activeTrigger = trigger;
    if (pinned) pinnedTrigger = trigger;
    infoTooltip.textContent = trigger.dataset.tooltip;
    infoTooltip.setAttribute("aria-hidden", "false");
    trigger.setAttribute("aria-describedby", "feature-tooltip");
    positionTooltip(trigger);
    infoTooltip.classList.add("is-visible");
  }

  function hideTooltip() {
    document.querySelectorAll(".info-trigger").forEach((button) => {
      button.setAttribute("aria-expanded", "false");
      button.removeAttribute("aria-describedby");
    });
    infoTooltip.classList.remove("is-visible");
    infoTooltip.setAttribute("aria-hidden", "true");
    activeTrigger = null;
    pinnedTrigger = null;
  }

  document.addEventListener("pointerover", (event) => {
    const trigger = event.target.closest(".info-trigger");
    if (trigger) {
      if (!pinnedTrigger) showTooltip(trigger);
    } else if (activeTrigger && !pinnedTrigger && !event.target.closest("#feature-tooltip")) {
      hideTooltip();
    }
  });

  document.addEventListener("focusin", (event) => {
    const trigger = event.target.closest(".info-trigger");
    if (trigger) showTooltip(trigger);
    else if (activeTrigger && pinnedTrigger !== activeTrigger) hideTooltip();
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest(".info-trigger");
    if (trigger) {
      if (pinnedTrigger === trigger) hideTooltip();
      else showTooltip(trigger, { pinned: true });
      return;
    }
    if (pinnedTrigger) hideTooltip();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeTrigger) hideTooltip();
  });

  window.addEventListener("scroll", () => {
    if (activeTrigger) positionTooltip();
  }, { passive: true });

  window.addEventListener("resize", () => {
    if (activeTrigger) positionTooltip();
    syncPricingCarousel();
  });

  /* ------------------------------------------- mobile pricing carousel -- */

  const carouselQuery = window.matchMedia("(max-width: 700px), (max-width: 1000px) and (max-height: 500px) and (orientation: landscape)");

  function centreCard(card, behavior = "smooth") {
    const grid = app.querySelector(".plan-grid--carousel");
    if (!carouselQuery.matches || !grid || !card) return;
    const gridRect = grid.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const target = grid.scrollLeft + (cardRect.left + (cardRect.width / 2)) - (gridRect.left + (gridRect.width / 2));
    if (Math.abs(target - grid.scrollLeft) < 1) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    grid.scrollTo({ left: target, behavior: reduced ? "auto" : behavior });
  }

  function syncPricingCarousel() {
    const grid = app.querySelector(".plan-grid--carousel");
    if (!grid) return;
    if (!carouselQuery.matches) {
      grid.scrollLeft = 0;
      return;
    }
    const cards = [...grid.querySelectorAll(".plan-card")];
    const target = cards.find((card) => card.dataset.pack === state.selectedPack)
      || cards.find((card) => card.dataset.pack === "p10")
      || cards[0];
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => centreCard(target, "auto"));
    });
  }

  carouselQuery.addEventListener("change", syncPricingCarousel);

  document.addEventListener("keydown", (event) => {
    const grid = event.target.closest(".plan-grid--carousel");
    if (!grid || !carouselQuery.matches || event.target !== grid) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const cards = [...grid.querySelectorAll(".plan-card")];
    const current = Math.max(0, cards.findIndex((card) => card.dataset.pack === state.selectedPack));
    const next = Math.min(cards.length - 1, Math.max(0, current + (event.key === "ArrowRight" ? 1 : -1)));
    state.selectedPack = cards[next].dataset.pack;
    state.customPack = null;
    persist();
    render();
    centreCard(app.querySelector(`.plan-card[data-pack="${state.selectedPack}"]`));
  });

  window.addEventListener("hashchange", render);

  if (!window.location.hash) window.location.replace("#/pricing");
  else render();
})();
