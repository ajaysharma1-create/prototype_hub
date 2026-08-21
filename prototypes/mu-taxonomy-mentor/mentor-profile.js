/* The one mentor this prototype speaks to, in the state the taxonomy change
   finds them: the selections they made under the old taxonomy.

   SAMPLE, NOT PRODUCT TRUTH — but every value below is taken from the taxonomy
   files rather than made up, because the whole point of the screen is to show a
   mentor what the documented migration does to what they already hold:

     industries  — from `existing_industries` in taxonomy.js. All 23 existing
                   industries survive into the final 40 under the same label, so
                   this one is carried forward untouched.
     domains     — from `functionalDomains`, both marked isNew: false, so both
                   survive the change.
     expertise   — eight values, which is the current Tally form's cap
                   (field-inventory.md, "Areas of Expertise: select up to 8").
                   Five of them are `from` values in `expertiseAliases`:

                     Product Management  -> RENAME -> Product Management & Strategy
                     UI/UX Design        -> MERGE  -> UX/UI & Design Thinking
                     Design Thinking     -> MERGE  -> UX/UI & Design Thinking
                     Data Analytics      -> MERGE  -> Data Analytics & Visualization
                     Data Visualization  -> MERGE  -> Data Analytics & Visualization

                   Two pairs collapse to one value each, which is why eight
                   selections come out the other side as six. The remaining
                   three already carry their final label.

   Vikram Nair is the same sample mentor the mentee-side All Mentors prototype
   and the mentee onboarding prototype both use, so the two sides of the
   taxonomy change describe one person rather than two.

   Plain global, not an ES module: this page is opened straight off the file
   system, where module scripts are blocked by CORS. */

window.MU_MENTOR_PROFILE = {
  name: 'Vikram Nair',
  title: 'Director, Product',
  company: 'Microsoft',

  /* Pre-change selections. */
  industries: ['Tech, IT, Telecom, AI and ML'],
  domains: ['Tech & Product', 'Data Science & AI'],
  expertise: [
    'Product Management',
    'Product Analytics',
    'UI/UX Design',
    'Design Thinking',
    'Agile & Scrum',
    'Data Analytics',
    'Data Visualization',
    'Machine Learning',
  ],

  /* Selection caps.

     `industries` moves from 1 to 2: the Tally form allows "any 1"
     (field-inventory.md) and the industries requirement sets the new limit at
     "a maximum of 2" (MentorUnion Taxonomy Changes - Industry_Domain_Expertise.md).
     That increase is a change the mentor can act on, so the screens say so.

     `domains` (2) and `expertise` (8) are the current Tally caps and are not
     changed by this work. The taxonomy folder records the expertise cap as an
     open decision (Taxonomy Filters - Baseline and Required Changes.md, §7.2);
     until it is closed, the prototype holds the cap the product enforces today
     rather than inventing a new one. */
  caps: { industries: 2, domains: 2, expertise: 8 },
  capsBefore: { industries: 1, domains: 2, expertise: 8 },
};
