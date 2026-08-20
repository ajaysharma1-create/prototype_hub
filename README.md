# Prototype Hub

Prototype Hub is the centralized directory for MentorUnion product projects tracked in
`live/` and `parked/`. It shows current project status and opens a prototype only when a
publishable hub copy exists. Projects without an accessible prototype remain visible as
non-linking cards.

The hub is static HTML, CSS, and JavaScript. It has no application build step or runtime
environment variables. The Credit Purchase route contains a checked-in Vite build generated
from the existing source app.

## Local usage

Run a static server from this directory:

```powershell
cd prototype-hub
python -m http.server 8000
```

Open `http://localhost:8000/`. Opening `index.html` directly is not supported because browsers
restrict local `fetch()` requests to `prototypes.json`.

## Inventory model

`prototypes.json` contains one entry per meaningful product/project, not one entry per file,
research artifact, or design experiment. Related specifications and prototypes remain grouped
under their product.

The only supported statuses are:

- `in-progress` → **In Progress**
- `completed` → **Completed**
- `not-started` → **Not Started**
- `parked` → **Parked**

The default directory view shows In Progress and Completed projects. Not Started and Parked
projects remain in the data and can be revealed from the Status filter. Status labels accompany
all colour marks; Not Started uses the required red mark.

Each entry uses this structure:

```json
{
  "id": "example-project",
  "name": "Example Project",
  "project": "Example Programme",
  "description": "Evidence-backed product summary.",
  "type": "Product flow",
  "status": "in-progress",
  "updatedAt": "YYYY-MM-DD",
  "preview": "assets/previews/example.webp",
  "previewAlt": "What the preview shows.",
  "prototypeAvailable": true,
  "prototypePath": "prototypes/example-project/index.html",
  "device": "Responsive web"
}
```

`prototypePath` must be an empty string when `prototypeAvailable` is `false`. This prevents
placeholder cards from linking to missing implementations. `version`, `device`, and
`sourcePath`, `approvedBy`, and `approvalReference` are optional. `sourcePath`, when used, must
point to a public file under `prototypes/`. Approval fields preserve existing publication
evidence and must not be invented for placeholders or newly copied artifacts.

## Folder structure

```text
prototype-hub/
├── index.html
├── prototypes.json
├── assets/
│   ├── icons/
│   ├── previews/
│   └── shared/
│       ├── app.js
│       └── styles.css
└── prototypes/
    ├── all-mentors-taxonomy-filters/
    ├── credit-purchase/
    ├── gift-mentorship/
    ├── mentee-direct-onboarding/
    ├── zoom-integration-flow/
    └── proposed_pricing_unified.html  # retained legacy pricing artifact; not listed
```

The local `audit/` directory contains ignored audit and validation evidence. It is not part of
the public repository.

## Add or update a project

1. Audit the corresponding `live/` or `parked/` project and confirm its product boundary.
2. Use only the four supported statuses; every source project under `parked/` is `parked`.
3. Add evidence-backed metadata without inventing scope, screens, progress, or ownership.
4. Set `prototypeAvailable` to `false` and leave `prototypePath` empty when there is no safe,
   publishable hub prototype.
5. When a real prototype is publishable, copy only the required static artifact and local assets
   into a deterministic lowercase kebab-case route under `prototypes/`.
6. Confirm the copied artifact contains no credentials, personal data, private paths, or
   confidential notes.
7. Add a factual 16:10 preview when available; otherwise use the neutral placeholder.
8. Update the top-level `updatedAt` date and run the release checks.

Do not publish drafts, rejected concepts, superseded files, or internal working material as
prototype routes. Listing a project card does not imply production launch or management approval.

## Existing prototype limitations

### All Mentors Taxonomy Filters

Search, sorting, taxonomy filters, mentor-card controls, and the booking sheet run entirely in the
browser against illustrative mentor records. No production mentor, availability, credit,
scheduling, or profile service is called. Scheduling and navigation actions are simulated.

### Credit Purchase

The checked-in route is a static build of the active React/Vite prototype. Plan selection,
checkout, wallet changes, booking, transaction history, and support requests are simulated. Its
demo state uses local browser storage; no payment, booking, refund, or message is processed.

### Gift a Career

Payment, email and WhatsApp delivery, scheduling, code issuance, recipient sign-in, balance
allocation, and PDF generation are simulated in the browser. No money moves and no message is
sent. The simulated code ledger and credit balance are not production-grade or secure.

### Mentee Direct Onboarding

OAuth, phone verification, OTP resend, account/profile persistence, welcome-credit allocation,
mentor matching, and booking are simulated. Verification writes entered values only to page
memory and the browser console. Reviewers should not enter real personal data.

### Zoom Integration

Zoom connectivity, attendance persistence, credit and payout updates, support handoff, and
dashboard navigation are simulated. No production Zoom or MentorUnion backend is called. The case
index and prototype controls expose deterministic documented states for review.

The hub itself has no external runtime dependency. Individual prototypes may request optional
Google-hosted fonts or icon fonts; their core local files remain available when those requests
fail, although some typography or icon glyphs may fall back.

## Release checks

Before publishing a change, confirm:

- every meaningful product in `live/` and `parked/` is represented once;
- only the four supported statuses appear and every parked source is marked Parked;
- In Progress and Completed are visible by default;
- Not Started and Parked are hidden by default but retrievable through Status;
- Not Started has a red mark and all statuses retain readable labels;
- every available prototype route and preview resolves successfully;
- unavailable projects render a non-linking state;
- search, Status, Type, Reset, keyboard focus, and empty results work together;
- no absolute path, traversal path, credential, personal data, or private evidence is exposed;
- there is no horizontal overflow at 320, 360, 375, 390, 430, 768, 1024, 1280, 1440, and
  1920 pixels;
- long names, missing previews, mobile controls, 200% zoom, and touch targets remain usable.

## Deployment

The directory can be hosted as a static site with the repository root at `.` and no hub build
command or output directory. Do not connect or deploy a hosting project without repository-owner
authorization.

## Maintenance ownership

**Owner:** TBD. Product or Design Operations should own inventory accuracy, prototype publication
safety, preview quality, route checks, responsive regression checks, and release hygiene.
