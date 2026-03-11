export const WIZARD_STEPS = [
  { stepIndex: 1, title: "Basics" },
  { stepIndex: 2, title: "Contacts & Address" },
  { stepIndex: 3, title: "Care Plan" },
  { stepIndex: 4, title: "Review & Create" },
] as const;

/** Field paths used for step-only validation via trigger() */
export const FIELDS_BY_STEP: Record<number, string[]> = {
  1: [
    "careType",
    "firstName",
    "lastName",
    "dob",
    "gender",
    "phone",
    "email",
  ],
  2: [
    "address.street",
    "address.city",
    "address.state",
    "address.zip",
    "primaryContact.name",
    "primaryContact.relation",
    "primaryContact.phone",
    "emergencyContact.name",
    "emergencyContact.phone",
    "notes",
  ],
  3: [], // filled dynamically from careType in wizard
};

/** Non-medical step 3 fields */
export const FIELDS_STEP_3_NON_MEDICAL: string[] = [
  "adlNeeds",
  "schedulePreferences.daysOfWeek",
  "schedulePreferences.timeWindow",
  "schedulePreferences.visitFrequency",
];

/** Medical step 3 fields */
export const FIELDS_STEP_3_MEDICAL: string[] = [
  "diagnosis",
  "physicianName",
  "physicianPhone",
  "medications",
  "skilledServices",
];

export const ADL_OPTIONS = [
  "Bathing",
  "Dressing",
  "Grooming",
  "Mobility",
  "Toileting",
  "Eating",
  "Transferring",
  "Medication reminders",
  "Light housekeeping",
  "Laundry",
  "Meal prep",
  "Shopping",
  "Companionship",
  "Transportation",
] as const;

export const SKILLED_SERVICES_OPTIONS = [
  "Skilled nursing",
  "Physical therapy",
  "Occupational therapy",
  "Speech therapy",
  "Wound care",
  "IV therapy",
  "Medication management",
  "Vital signs monitoring",
  "Catheter care",
  "Diabetes management",
] as const;

export const DAYS_OF_WEEK_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const TIME_WINDOW_OPTIONS = [
  "Morning (6am–12pm)",
  "Afternoon (12pm–5pm)",
  "Evening (5pm–9pm)",
  "Flexible",
] as const;

export const VISIT_FREQUENCY_OPTIONS = [
  "Once per week",
  "2–3x per week",
  "Daily",
  "Multiple times per day",
  "As needed",
] as const;
