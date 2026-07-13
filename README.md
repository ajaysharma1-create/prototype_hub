# Prototype Hub

Prototype Hub is the published directory for Product Manager-approved MentorUnion product and design prototypes. It is a static HTML, CSS, and JavaScript project with no build step or environment variables.

Only a prototype with explicit Product Manager approval for publication may appear in `prototypes.json`. “Approved for review” means approved for prototype review; it does not indicate that the proposed product behaviour is approved for launch.

## Local usage

Run a static server from this directory:

```powershell
cd prototype-hub
python -m http.server 8000
```

Open `http://localhost:8000/`. Opening `index.html` directly is not supported because browsers restrict local `fetch()` requests to `prototypes.json`.

No package installation, build command, or environment file is required.

## Folder structure

```text
prototype-hub/
├── favicon.ico
├── index.html
├── README.md
├── prototypes.json
├── assets/
│   ├── previews/
│   │   ├── mentorship-credits-pricing.webp
│   │   └── placeholder.svg
│   ├── icons/
│   │   └── hub-mark.svg
│   └── shared/
│       ├── app.js
│       └── styles.css
└── prototypes/
    └── proposed_pricing_unified.html
```

The local `audit/` directory contains ignored validation evidence. It is not part of the public repository or Vercel deployment.

## Add an approved prototype

1. Confirm explicit Product Manager approval for the exact artifact being published.
2. Copy the final shareable artifact and any required local assets into `prototypes/` using relative, stable paths.
3. Capture an accurate 16:10 preview from a clean default state and place it in `assets/previews/`.
4. Add complete, verified metadata to `prototypes.json`.
5. Confirm that the copied artifact and metadata contain no private paths, credentials, personal data, or confidential notes.
6. Validate the preview, directory link, prototype interactions, search, applicable filters, keyboard use, and responsive layout.
7. Update the top-level `updatedAt` date in `prototypes.json`.
8. Commit the change with a summary that identifies the prototype and approval reference.

Drafts, alternatives, rejected concepts, superseded files, and internal working material must not be published.

Each entry uses this structure:

```json
{
  "id": "",
  "name": "",
  "project": "",
  "description": "",
  "type": "",
  "status": "approved",
  "version": "",
  "updatedAt": "YYYY-MM-DD",
  "preview": "assets/previews/example.webp",
  "previewAlt": "",
  "prototypePath": "prototypes/example.html",
  "sourcePath": "",
  "approvedBy": "",
  "approvalReference": "",
  "device": ""
}
```

Use an empty `version` when the artifact has no documented version. Do not infer names, dates, ownership, purpose, approval, or version from a filename. `sourcePath` may be empty; if used, copy the public reference under `prototypes/` and use its relative path. The card renders it as a secondary `Related reference` link. Approval fields are publicly downloadable metadata, so record only the minimum non-confidential evidence required.

The renderer rejects incomplete entries, non-approved status values, duplicate IDs, invalid dates, absolute paths, traversal paths, and prototype routes that are not HTML files.

## Preview assets

Use a 16:10 image, preferably 960 × 600 pixels in WebP format. Capture the prototype’s default state without open menus, modals, selections, tooltips, or test data. Do not use stock imagery. Add factual alternative text that describes what is visible.

If a preview fails to load, the directory replaces it with `assets/previews/placeholder.svg`. The fallback is a safeguard, not a substitute for checking the real preview before publication.

## Vercel deployment

Import the repository into Vercel as a static project:

1. Select the repository in Vercel.
2. Choose **Other** as the framework preset.
3. Keep the project root at `.`.
4. Leave the build command and output directory unset.
5. Deploy and repeat the release checks against the generated URL.

The project needs no `vercel.json`, rewrite, build output, server function, or environment variable. All internal deployment routes use relative paths and resolve to physical files, so direct prototype routes and refreshes work without a fallback rule.

The current pricing prototype requests Google Fonts from `fonts.googleapis.com` and `fonts.gstatic.com`; system-font fallbacks keep it usable when those requests are unavailable. The hub itself has no external runtime dependency.

Do not connect or deploy a Vercel project until the repository owner authorises it.

## Release checks

Before publishing a change, confirm:

- every listed artifact has explicit Product Manager publication approval;
- no draft, alternate, rejected, or superseded prototype is listed;
- the directory loads through a static server without a build process;
- every directory prototype link and preview returns successfully;
- search and each visible metadata filter can be combined and reset;
- missing previews show the neutral fallback;
- there are no browser console errors or failed local requests;
- no absolute path, credential, personal data, confidential note, or private evidence is exposed;
- focus order, visible focus states, native control labels, and touch targets remain usable;
- the page has no horizontal overflow at 320, 360, 375, 390, 430, 768, 1024, 1280, 1440, and 1920 pixels;
- landscape mobile, 200% browser zoom, long names, missing previews, and empty results remain usable.

Prototype interactions may intentionally simulate product actions. Any inert policy, contact, authentication, or purchase control must be documented as a prototype limitation rather than represented as a live service.

### Current prototype limitations

`proposed_pricing_unified.html` is a review prototype, not a live purchase surface. Authentication, checkout, and recommendation actions are simulated; refund, terms, privacy, and contact links are intentionally inactive. Pack naming, selected pack benefits, and USD readiness remain proposals for review rather than launch commitments. Its only external dependency is optional Google Fonts typography.

## Maintenance ownership

**Owner:** TBD — assign a Product or Design Operations maintainer before public deployment.

The maintainer owns approval verification, metadata accuracy, preview quality, link checks, responsive regression checks, and publication hygiene.
