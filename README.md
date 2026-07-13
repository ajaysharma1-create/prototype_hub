# Prototype Hub

Prototype Hub is the public directory for MentorUnion product and design prototypes that have explicit Product Manager approval. The current repository audit found no prototype with documented approval, so the published directory contains zero prototype cards. Ten current candidate groups remain withheld pending approval or finalisation.

Target repository: [ajaysharma1-create/prototype_hub](https://github.com/ajaysharma1-create/prototype_hub.git)

## Publication rule

A prototype may be added to the published hub only after explicit Product Manager approval is recorded in a durable reference. An approved project scope, a product decision, a file named “final”, or a shareable review artifact does not by itself approve the prototype for publication.

Drafts, alternate explorations, rejected concepts, superseded files, and internal working files must not be published. Candidate files remain outside <code>prototypes.json</code> and <code>prototypes/</code> until approval is verified.

## Use locally

No package install or build process is required.

For the current empty directory, open <code>index.html</code> directly in a modern browser. To load <code>prototypes.json</code> after approved entries are added, serve the folder with any static file server:

~~~powershell
cd prototype-hub
python -m http.server 8000
~~~

Then open <code>http://localhost:8000/</code>. The same relative paths work when the repository is deployed through Vercel.

## Add an approved prototype

1. Confirm explicit Product Manager approval and retain a durable approval reference.
2. Copy the final, self-contained prototype into <code>prototypes/</code>.
3. Add or generate an accurate preview in <code>assets/previews/</code>. Use an existing approved thumbnail or screenshot first; use the neutral placeholder only when an accurate preview cannot be produced.
4. Add the prototype metadata to <code>prototypes.json</code> with <code>status</code> set to <code>approved</code>.
5. Validate every local link and asset. Paths must be relative and must remain inside this repository.
6. Test responsiveness, keyboard navigation, focus order, and the prototype’s intended interaction.
7. Update the top-level <code>updatedAt</code> value in <code>prototypes.json</code>.
8. Commit the prototype with a clear change summary that names the approval reference.

Each published entry uses this shape:

~~~json
{
  "id": "",
  "name": "",
  "project": "",
  "description": "",
  "type": "",
  "status": "approved",
  "version": "",
  "updatedAt": "",
  "preview": "",
  "prototypePath": "",
  "sourcePath": "",
  "approvedBy": "",
  "approvalReference": ""
}
~~~

Use ISO dates in <code>YYYY-MM-DD</code> format. <code>prototypePath</code> must point to the copied prototype entry file. <code>sourcePath</code> may point to a public specification or research file copied into this repository; it must never expose an original workspace path, private note, credential, personal data, or confidential evidence.

The page renders only entries whose status is exactly <code>approved</code>. This is a final publication guard, not a substitute for review.

## Vercel deployment

The hub is ready to deploy from the repository root as a static Vercel project. No generated build directory is required.

1. In Vercel, choose **Add New → Project** and import <code>ajaysharma1-create/prototype_hub</code>.
2. Set the framework preset to **Other**.
3. Keep the root directory as <code>.</code>.
4. Leave the build command empty and use <code>.</code> as the output directory if Vercel requests one.
5. Deploy, then repeat the link, interaction, responsive, and console checks against the generated URL.

Each push to the connected production branch can trigger a new Vercel deployment after repository access is configured.

## Folder structure

~~~text
prototype-hub/
├── index.html
├── README.md
├── prototypes.json
├── assets/
│   ├── previews/
│   │   └── placeholder.svg
│   ├── icons/
│   │   └── hub-mark.svg
│   └── shared/
│       ├── app.js
│       └── styles.css
└── prototypes/
~~~

A local <code>audit/</code> directory may exist in the source workspace. It is ignored by Git and must not be included in the public repository.

## Release checks

Before publishing a change, confirm:

- every listed prototype has explicit Product Manager approval;
- no draft, alternate, rejected, or superseded prototype is present;
- the page and every prototype open without a build process;
- all prototype and related-reference links work;
- every preview loads, uses the correct aspect ratio, and has meaningful alternative text;
- search and project, type, and status filters work, including the no-results state;
- no absolute path, credential, personal data, confidential note, or private evidence is exposed;
- there are no browser console errors;
- the layout has no horizontal overflow at 320, 375, 430, 768, 1024, 1280, and 1440 pixels;
- controls are keyboard accessible and touch targets remain usable.

## Maintenance ownership

**Owner:** TBD — assign a Product or Design Operations maintainer before the first public release.

The maintainer owns approval verification, metadata quality, link checks, preview accuracy, responsive regression checks, and removal-by-archive when a published prototype is superseded.
