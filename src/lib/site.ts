export const PRACTICE = {
  name: "Corporate Metabolic Clinic",
  doctor: "Dr Ben Azouz",
  tagline: "Your Health. Your Performance. Your Future.",
  strap: "A New Generation of General Practice",
  addressLine1: "135 Daisy St",
  addressLine2: "Sandown, Sandton, Johannesburg",
  phone: "+27 63 662 9349",
  phoneHref: "tel:+27636629349",
  whatsapp: "27636629349",
  email: "contact@doctorbenazouz.co.za",
  website: "www.metabolicclinic.co.za",
} as const;

export const whatsappLink = (message = "Hello, I'd like to enquire about an appointment.") =>
  `https://wa.me/${PRACTICE.whatsapp}?text=${encodeURIComponent(message)}`;

export type Service = {
  slug: string;
  title: string;
  short: string;
  intro: string[];
  covers: string[];
  seek: string[];
  comingSoon?: boolean;
  icon: string;
};

export const SERVICES: Service[] = [
  {
    slug: "executive-health",
    title: "Executive Health",
    short: "Proactive health assessments and screening built around a demanding schedule.",
    icon: "briefcase",
    intro: [
      "High performance depends on a body and mind that can sustain it. Executive Health is a structured, unhurried assessment that establishes your true health baseline - cardiovascular risk, metabolic function, stress physiology, sleep quality and fitness - in a single coordinated visit.",
      "You leave with a clear written picture of where you stand, what needs attention now, and a practical plan that fits the way you actually live and work.",
    ],
    covers: [
      "Comprehensive history, examination and cardiovascular risk profiling",
      "Extended blood panel: metabolic, lipid, liver, kidney, thyroid, hormonal markers",
      "Resting ECG and, where indicated, lung function testing",
      "Body composition and blood pressure assessment",
      "Stress, burnout, sleep and mental well-being review",
      "A written plan with follow-up intervals and referrals where needed",
    ],
    seek: [
      "You have not had a thorough check-up in over two years",
      "Fatigue, poor sleep or reduced concentration are affecting performance",
      "There is a family history of heart disease, stroke or diabetes",
      "Your company requires an annual executive medical",
    ],
  },
  {
    slug: "metabolic-medicine",
    title: "Metabolic Medicine & Weight Management",
    short: "Evidence-based weight management and metabolic care.",
    icon: "activity",
    intro: [
      "Obesity and insulin resistance are chronic medical conditions, not personal failures. We assess the underlying metabolic picture - insulin, glucose, lipids, thyroid, hormones and medication effects - before recommending any treatment.",
      "Care is longitudinal: regular reviews, honest measurement, and adjustment over months rather than weeks. Where medication is clinically appropriate it is prescribed and monitored properly, alongside nutrition and activity that you can sustain.",
    ],
    covers: [
      "Full metabolic screening and insulin resistance assessment",
      "Structured weight management with realistic, measurable targets",
      "Prediabetes and type 2 diabetes prevention, control and remission planning",
      "Medically supervised pharmacotherapy where indicated, with follow-up",
      "Cholesterol, blood pressure and fatty liver management",
      "Nutrition, sleep and activity coaching integrated into the plan",
    ],
    seek: [
      "Weight has crept up steadily despite repeated attempts to change it",
      "You have been told (or suspect) you are prediabetic or have raised blood sugar",
      "Central weight gain with fatigue, cravings or afternoon energy crashes",
      "A family history of type 2 diabetes or metabolic syndrome",
    ],
  },
  {
    slug: "chronic-disease",
    title: "Chronic Disease Management",
    short: "Consistent, monitored care for long-term conditions with one doctor who knows your history.",
    icon: "heart-pulse",
    intro: [
      "Long-term conditions are best managed by a doctor who sees the whole picture over time. Regular review, accurate monitoring and small timely adjustments prevent the complications that come from drifting care.",
      "Each condition is managed against clear targets, with medication reviewed for effectiveness and side effects, and education so you understand your own numbers.",
    ],
    covers: [
      "Hypertension and cholesterol management",
      "Type 2 diabetes: monitoring, medication and complication screening",
      "Asthma and COPD, including spirometry and inhaler technique",
      "Thyroid disorders",
      "Osteoarthritis and osteoporosis",
      "HIV and TB care, monitoring and adherence support",
    ],
    seek: [
      "You have a diagnosed condition but no regular review schedule",
      "Readings or symptoms have changed since your last visit",
      "You are on several medicines and want them reviewed together",
      "You have moved practices and need continuity of care",
    ],
  },
  {
    slug: "preventive-travel",
    title: "Preventative & Travel Medicine",
    short: "Stay ahead of illness at home and abroad - screening, vaccinations and travel planning.",
    icon: "plane",
    intro: [
      "Prevention is the least expensive medicine there is. Screening intervals are set against your age, family history and personal risk, so you are tested for what matters and spared what does not.",
      "For travel, advice is destination-specific: vaccinations, malaria prophylaxis, altitude and food safety, plus a travel kit and documentation for your itinerary.",
    ],
    covers: [
      "Health risk assessments and age-appropriate screening schedules",
      "Adult and childhood vaccinations, including annual influenza",
      "Travel consultations with destination-specific risk advice",
      "Yellow fever, typhoid, hepatitis and other travel vaccinations",
      "Malaria prophylaxis and traveller's medical kits",
      "Pre-employment and fitness-to-travel certificates",
    ],
    seek: [
      "You are travelling internationally in the next four to eight weeks",
      "Your vaccinations are out of date or unknown",
      "You want to know which screenings apply at your age",
      "You are planning a trip to a malaria or yellow fever region",
    ],
  },
  {
    slug: "womens-mens-health",
    title: "Women's & Men's Health",
    short: "Discreet, thorough care for the health matters specific to women and men.",
    icon: "users",
    intro: [
      "Sex-specific health needs deserve unhurried, private consultation. Routine screening picks up change early; frank conversation makes sure the things patients hesitate to raise are actually addressed.",
      "Contraception, hormonal change, prostate health and hormone therapy are all managed with proper assessment and long-term monitoring rather than a quick prescription.",
    ],
    covers: [
      "Routine screening: blood pressure, cholesterol, glucose, cervical and breast checks",
      "Family planning and contraception - pill, IUD, injectable and barrier methods",
      "Pre-conception advice and menopause support",
      "Prostate health, PSA testing and urinary symptom assessment",
      "Testosterone assessment and medically monitored therapy",
      "Sexual health screening, treatment and advice",
    ],
    seek: [
      "You are due for a routine screening or Pap smear",
      "You want to review or change your contraception",
      "Changes in urinary pattern, or pelvic / breast changes",
      "Reduced energy, libido or muscle mass that may be hormonal",
    ],
  },
  {
    slug: "mental-health",
    title: "Mental Health & Well-being",
    short: "A safe, judgement-free space for assistance with stress, anxiety, low mood and sleep.",
    icon: "brain",
    intro: [
      "Mental and physical health are inseparable. Stress, anxiety and low mood show up as sleep disruption, blood pressure, weight change and fatigue - and they are treated as seriously as any other clinical problem here.",
      "Consultations are longer, confidential and unhurried. Treatment may involve lifestyle change, therapy referral, medication, or a combination, reviewed regularly rather than left to run.",
    ],
    covers: [
      "Assessment and treatment of anxiety, depression and burnout",
      "Workplace stress and executive burnout support",
      "Insomnia and sleep quality assessment",
      "Medication initiation, review and safe adjustment",
      "Referral to psychologists and psychiatrists where indicated",
      "Lifestyle coaching: sleep, activity, alcohol and recovery",
    ],
    seek: [
      "Persistent low mood, worry or irritability lasting more than two weeks",
      "Sleep that is not restoring you",
      "Loss of motivation or enjoyment in work and life",
      "You feel you are running on empty and cannot recover",
    ],
  },
  {
    slug: "acute-urgent-care",
    title: "Acute & Urgent Care",
    short: "Prompt attention for sudden illness and minor injury, without the hospital wait.",
    icon: "stethoscope",
    intro: [
      "Sudden illness and minor injury need attention quickly, but rarely need an emergency department. Same-day and urgent appointments cover the ground between a routine check-up and hospital care.",
      "You are examined, treated and given clear written follow-up instructions, with escalation arranged immediately if the assessment warrants it.",
    ],
    covers: [
      "Respiratory, urinary, ear and skin infections",
      "Fever, influenza and gastrointestinal illness",
      "Wound cleaning, suturing and dressing",
      "Sprains, minor burns and soft tissue injury",
      "Acute allergic reactions and rashes",
      "Sick notes and follow-up planning",
    ],
    seek: [
      "A fever that is not settling with home measures",
      "A cut, sprain or burn that needs professional attention",
      "A cough, headache or abdominal pain that is worsening quickly",
      "Redness, swelling, heat or discharge around a wound",
    ],
  },
  {
    slug: "diagnostics-procedures",
    title: "Diagnostics & Minor Procedures",
    short: "In-room testing and minor procedures for faster answers and fewer appointments.",
    icon: "microscope",
    intro: [
      "Many investigations can be done in the consulting room, so you get answers in one visit rather than three. Results are explained in plain language along with what happens next.",
      "Minor procedures are performed under local anaesthetic in a sterile treatment room, with proper aftercare and review.",
    ],
    covers: [
      "Resting ECG and blood pressure monitoring",
      "Blood collection and point-of-care testing",
      "Spirometry (lung function testing)",
      "Skin lesion assessment, biopsy and removal",
      "Wound care, suturing and abscess drainage",
      "Ear syringing, and joint or soft tissue injections",
    ],
    seek: [
      "A skin lesion has changed in size, colour or shape",
      "You need routine bloods or an ECG before a procedure or medical",
      "Persistent breathlessness or wheeze needing lung function testing",
      "A wound, cyst or lesion that needs a minor procedure",
    ],
  },
  {
    slug: "iv-recovery-lounge",
    title: "IV & Recovery Lounge",
    short: "Clinician-led wellness infusions and recovery support. Coming soon.",
    icon: "droplets",
    comingSoon: true,
    intro: [
      "A dedicated, doctor-supervised infusion lounge is opening at our Sandton rooms - for hydration, targeted micronutrient support and recovery after illness, travel or heavy training loads.",
      "Every infusion will be prescribed after clinical assessment, not chosen from a menu.",
    ],
    covers: [
      "Hydration and electrolyte replacement",
      "Vitamin and micronutrient infusions where clinically indicated",
      "Post-illness and post-travel recovery support",
      "Iron infusions under medical supervision",
      "Pre-assessment bloods and follow-up review",
    ],
    seek: [],
  },
];

export const bookableServices = SERVICES.filter((s) => !s.comingSoon);

export const JOURNEY = [
  { title: "Book", copy: "Easy online or WhatsApp booking" },
  { title: "Consult", copy: "Unhurried, personalised consultation" },
  { title: "Assess", copy: "Advanced testing and evaluation" },
  { title: "Plan", copy: "A personalised plan and support" },
  { title: "Optimise", copy: "Ongoing follow-up and monitoring" },
  { title: "Thrive", copy: "Better health. Better life." },
];
