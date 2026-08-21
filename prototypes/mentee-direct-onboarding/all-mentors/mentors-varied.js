/* Twelve varied mentors — the set index.html loads.

   `mentors.js` reproduces the six identical cards the reference screen draws, so
   the taxonomy filters there can only match all six or none. This file is the
   set that exercises them: twelve mentors spread across the taxonomy, each
   tagged only with values that exist in taxonomy.js.

   To load the reference frame instead, change one line in index.html:
     <script src="mentors-varied.js" defer>   ->   <script src="mentors.js" defer>

   SAMPLE, NOT PRODUCT TRUTH. The names, roles, call counts and ratings extend
   the sample set already used in live/mentee-direct-onboarding/prototype. The
   `agendas` array on each mentor is sample data too: agends.json lists the 13
   agendas but no file states which mentor covers which, so the assignments are
   made here so the agenda quick filter has something to bite on, and so each of
   the 13 agendas returns at least one mentor rather than a dead chip. The same
   holds for experienceLevel, timeZone, availableInHours and rating — buckets the
   folder does not define. Domain, expertise and industry are the only mentor
   attributes taken verbatim from the authoritative taxonomy.

   One portrait ships with the design system, so every card uses it.

   Plain global, not an ES module: this page is opened straight off the file
   system, where module scripts are blocked by CORS. */

window.MU_MENTORS = (function () {
  const experienceLevels = ['0–5 Yrs', '5–10 Yrs', '10–15 Yrs', '15+ Yrs'];
  const ratingBands = ['4.8 and above', '4.5 and above', '4.0 and above'];
  const timeZones = ['India · IST', 'UAE · GST', 'Singapore · SGT', 'United Kingdom · GMT', 'United States · EST'];
  const availabilityWindows = ['Available today', 'Available this week', 'Available in 2 weeks'];

  const mentors = [
    {
      id: 'vikram-nair',
      name: 'Vikram Nair',
      title: 'Director, Product, Microsoft',
      company: 'Microsoft',
      years: 9,
      calls: 140,
      rating: 4.9,
      experienceLevel: '5–10 Yrs',
      timeZone: 'India · IST',
      availableInHours: 6,
      joinedDaysAgo: 420,
      domains: ['Tech & Product', 'Data Science & AI'],
      expertise: ['Product Management & Strategy', 'Product Analytics', 'Product Discovery & User Research'],
      industries: ['Tech, IT, Telecom, AI and ML', 'Retail, E-commerce and Q-commerce'],
      agendas: ['Resume Review', 'Interview Prep', 'Career Discovery', 'Domain Practicums'],
    },
    {
      id: 'sara-iyer',
      name: 'Sara Iyer',
      title: 'Partner, McKinsey & Company',
      company: 'McKinsey & Company',
      years: 12,
      calls: 210,
      rating: 5.0,
      experienceLevel: '10–15 Yrs',
      timeZone: 'India · IST',
      availableInHours: 52,
      joinedDaysAgo: 610,
      domains: ['Consulting & Strategy', 'PEVC, Banking & Investments'],
      expertise: ['Corporate Strategy', 'Management Consulting', 'Growth & Market Entry Strategy'],
      industries: ['Consulting, Legal, and Professional Services', 'Banking, Insurance, and Financial Services'],
      agendas: ['Case Guestimates', 'Interview Prep', 'Career Discovery', 'Last Mile Prep (LMP)'],
    },
    {
      id: 'rohan-das',
      name: 'Rohan Das',
      title: 'Former Country Head, SoftBank',
      company: 'SoftBank',
      years: 16,
      calls: 95,
      rating: 4.8,
      experienceLevel: '15+ Yrs',
      timeZone: 'Singapore · SGT',
      availableInHours: 30,
      joinedDaysAgo: 300,
      domains: ['Communication & Leadership', 'PEVC, Banking & Investments'],
      expertise: ['Leadership Presence', 'Team Leadership', 'Venture Capital'],
      industries: ['Banking, Insurance, and Financial Services', 'Tech, IT, Telecom, AI and ML'],
      agendas: ['Industry Trends & Insights', 'Communication Skills', 'Develop Networking Skills'],
    },
    {
      id: 'neha-kapoor',
      name: 'Neha Kapoor',
      title: 'VP Marketing, Unilever',
      company: 'Unilever',
      years: 11,
      calls: 130,
      rating: 4.9,
      experienceLevel: '10–15 Yrs',
      timeZone: 'United Kingdom · GMT',
      availableInHours: 14,
      joinedDaysAgo: 240,
      domains: ['Sales, Brand & Marketing', 'Media, PR & Creator Economy'],
      expertise: ['Product & Brand Marketing', 'Digital & Performance Marketing', 'Media Relations'],
      industries: ['FMCG', 'Beauty, Personal Care & Cosmetics'],
      agendas: ['Industry Trends & Insights', 'Portfolio & Assignment Review', 'Communication Skills'],
    },
    {
      id: 'arjun-verma',
      name: 'Arjun Verma',
      title: 'Founder, YC-backed SaaS',
      company: 'Y Combinator',
      years: 7,
      calls: 80,
      rating: 4.7,
      experienceLevel: '5–10 Yrs',
      timeZone: 'United States · EST',
      availableInHours: 3,
      joinedDaysAgo: 95,
      domains: ['Entrepreneurship & Startups', 'Tech & Product'],
      expertise: ['Product Market Fit', 'Fundraising & Investor Pitching', 'Go-to-Market Strategy (GTM)'],
      industries: ['Tech, IT, Telecom, AI and ML', 'Data Centres & Cloud Infrastructure'],
      agendas: ['Pitchdeck Review', 'Startup Fundraising', 'Career Discovery'],
    },
    {
      id: 'priya-menon',
      name: 'Priya Menon',
      title: 'Senior Data Scientist, Google',
      company: 'Google',
      years: 8,
      calls: 110,
      rating: 5.0,
      experienceLevel: '5–10 Yrs',
      timeZone: 'India · IST',
      availableInHours: 20,
      joinedDaysAgo: 150,
      domains: ['Data Science & AI', 'Tech & Product'],
      expertise: ['Data Analytics & Visualization', 'Machine Learning', 'Data Engineering'],
      industries: ['Tech, IT, Telecom, AI and ML'],
      agendas: ['Interview Prep', 'Assignment Review', 'Domain Practicums', 'Resume Review'],
    },
    {
      id: 'karan-shah',
      name: 'Karan Shah',
      title: 'Principal PM, Amazon',
      company: 'Amazon',
      years: 10,
      calls: 120,
      rating: 4.8,
      experienceLevel: '10–15 Yrs',
      timeZone: 'India · IST',
      availableInHours: 70,
      joinedDaysAgo: 520,
      domains: ['Tech & Product', "Chief of Staff & Founder's Office"],
      expertise: ['Product Management & Strategy', 'Internal Communication', 'Cross-Functional Execution'],
      industries: ['Retail, E-commerce and Q-commerce', 'Logistics and Supply Chain'],
      agendas: ['Resume Review', 'Interview Prep', 'Portfolio & Assignment Review'],
    },
    {
      id: 'ananya-rao',
      name: 'Ananya Rao',
      title: 'Director Strategy, Bain & Company',
      company: 'Bain & Company',
      years: 13,
      calls: 160,
      rating: 4.9,
      experienceLevel: '10–15 Yrs',
      timeZone: 'UAE · GST',
      availableInHours: 44,
      joinedDaysAgo: 380,
      domains: ['Consulting & Strategy', 'Accounting & Finance'],
      expertise: ['Corporate Strategy', 'Corporate Finance', 'Business Transformation'],
      industries: ['Consulting, Legal, and Professional Services', 'Oil, Gas, Solar and Energy'],
      agendas: ['Case Guestimates', 'Last Mile Prep (LMP)', 'Career Discovery'],
    },
    {
      id: 'devika-shetty',
      name: 'Devika Shetty',
      title: 'Head of Security Engineering, Cloudflare',
      company: 'Cloudflare',
      years: 14,
      calls: 62,
      rating: 4.7,
      experienceLevel: '10–15 Yrs',
      timeZone: 'United States · EST',
      availableInHours: 9,
      joinedDaysAgo: 40,
      domains: ['Cybersecurity, Privacy & Risk', 'Tech & Product'],
      expertise: ['Security Operations', 'Cloud Security', 'Cyber Risk & Governance'],
      industries: ['Cybersecurity Products & Services', 'Data Centres & Cloud Infrastructure'],
      agendas: ['Domain Practicums', 'Interview Prep', 'Industry Trends & Insights'],
    },
    {
      id: 'imran-qureshi',
      name: 'Imran Qureshi',
      title: 'Creator Partnerships Lead, Spotify',
      company: 'Spotify',
      years: 6,
      calls: 74,
      rating: 4.6,
      experienceLevel: '5–10 Yrs',
      timeZone: 'United Kingdom · GMT',
      availableInHours: 2,
      joinedDaysAgo: 25,
      domains: ['Media, PR & Creator Economy', 'Content Creation'],
      expertise: ['Media Relations', 'Social Media Strategy', 'Influencer Partnerships'],
      industries: ['Creator Economy & Influencer Marketing', 'Media and Entertainment'],
      agendas: ['Develop Networking Skills', 'Communication Skills', 'Industry Trends & Insights'],
    },
    {
      id: 'meera-krishnan',
      name: 'Meera Krishnan',
      title: 'Head of People, Razorpay',
      company: 'Razorpay',
      years: 12,
      calls: 190,
      rating: 4.8,
      experienceLevel: '10–15 Yrs',
      timeZone: 'India · IST',
      availableInHours: 26,
      joinedDaysAgo: 470,
      domains: ['Human Resources & Org Strategy', 'Coaching & Mental Wellbeing'],
      expertise: ['Talent Acquisition & Employer Brand', 'Performance Management', 'Counselling'],
      industries: ['Banking, Insurance, and Financial Services', 'Tech, IT, Telecom, AI and ML'],
      agendas: ['Resume Review', 'Interview Prep', 'Career Discovery', 'Communication Skills'],
    },
    {
      id: 'sanjay-pillai',
      name: 'Sanjay Pillai',
      title: 'Former Plant Head, Tata Steel',
      company: 'Tata Steel',
      years: 22,
      calls: 48,
      rating: 4.5,
      experienceLevel: '15+ Yrs',
      timeZone: 'India · IST',
      availableInHours: 120,
      joinedDaysAgo: 18,
      domains: ['Operations & Supply Chain', 'Sustainability & ESG'],
      expertise: ['Supply Chain Management', 'Manufacturing Operations', 'Sustainability Strategy'],
      industries: ['Steel and Metals', 'Logistics and Supply Chain'],
      agendas: ['Industry Trends & Insights', 'Domain Practicums', 'Last Mile Prep (LMP)'],
    },
  ];

  /* No card is painted amber here: with twelve distinct mentors the reference's
     fifth-card highlight has nothing to mean, so amber is hover-only. */
  const ACCENT_CTA_INDEX = -1;

  return { experienceLevels, ratingBands, timeZones, availabilityWindows, mentors, ACCENT_CTA_INDEX };
})();
