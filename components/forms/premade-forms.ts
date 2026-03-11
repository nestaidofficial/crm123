import type { FormSection, FormField } from "./form-editor";
import type { Form } from "./form-card";

export function getPremadeForms(): Form[] {
  return [
    {
      id: "form-premade-1",
      name: "Caregiver Application Form",
      category: "Onboarding",
      status: "system",
      usedIn: ["Onboarding", "HR"],
      description: "Complete application form for new caregivers including personal info, work authorization, and skills",
    },
    {
      id: "form-premade-2",
      name: "Client Intake & Care Needs Form",
      category: "Care",
      status: "system",
      usedIn: ["Onboarding"],
      description: "Comprehensive intake form for new clients including demographics, medical conditions, and care goals",
    },
    {
      id: "form-premade-3",
      name: "Caregiver Compliance & Onboarding Checklist",
      category: "Compliance",
      status: "system",
      usedIn: ["Onboarding", "HR"],
      description: "Track background checks, certifications, and required documentation",
    },
    {
      id: "form-premade-4",
      name: "Visit / Shift Completion Form",
      category: "Care",
      status: "system",
      usedIn: ["Shifts", "Billing"],
      description: "Document tasks performed, notes, and client condition during shift",
    },
    {
      id: "form-premade-5",
      name: "Incident / Accident Report Form",
      category: "Compliance",
      status: "system",
      usedIn: ["Incidents"],
      description: "Report and document incidents, accidents, and safety concerns",
    },
  ];
}

export function getPremadeFormSections(formId: string): FormSection[] {
  switch (formId) {
    case "form-premade-1": // Caregiver Application Form
      return [
        {
          id: "section-1",
          name: "Personal Information",
          visible: true,
          fields: [
            { id: "f1", label: "Full Name", type: "text", required: true },
            { id: "f2", label: "Date of Birth", type: "date", required: true },
            { id: "f3", label: "Phone Number", type: "text", required: true },
            { id: "f4", label: "Email Address", type: "text", required: true },
            { id: "f5", label: "Home Address", type: "text", required: true },
            { id: "f6", label: "City", type: "text", required: false },
            { id: "f7", label: "State", type: "text", required: false },
            { id: "f8", label: "Zip Code", type: "text", required: false },
          ],
        },
        {
          id: "section-2",
          name: "Work Authorization",
          visible: true,
          fields: [
            { id: "f9", label: "Are you legally authorized to work in the U.S.?", type: "yesno", required: true },
            { id: "f10", label: "Will you require visa sponsorship now or in the future?", type: "yesno", required: false },
            { id: "f11", label: "Government-issued ID Type", type: "dropdown", required: false, options: ["Driver's License", "State ID", "Passport"] },
            { id: "f12", label: "ID Number", type: "text", required: false },
            { id: "f13", label: "ID Expiration Date", type: "date", required: false },
            { id: "f14", label: "Upload ID Document", type: "file", required: false },
          ],
        },
        {
          id: "section-3",
          name: "Experience & Background",
          visible: true,
          fields: [
            { id: "f15", label: "Years of caregiving experience", type: "number", required: true },
            { id: "f16", label: "Previous caregiving roles", type: "text", required: false },
            { id: "f17", label: "Experience with seniors?", type: "yesno", required: false },
            { id: "f18", label: "Experience with disabilities?", type: "yesno", required: false },
            { id: "f19", label: "Languages spoken", type: "multiselect", required: false, options: ["English", "Spanish", "French", "Other"] },
            { id: "f20", label: "Comfortable with pets?", type: "yesno", required: false },
          ],
        },
        {
          id: "section-4",
          name: "Skills & Services",
          visible: true,
          fields: [
            { id: "f21", label: "Skills", type: "multiselect", required: false, options: ["Personal care (bathing, grooming)", "Mobility assistance", "Dementia / Alzheimer's care", "Medication reminders", "Meal preparation", "Light housekeeping", "Transfers / lifting", "Companionship"] },
          ],
        },
        {
          id: "section-5",
          name: "Availability",
          visible: true,
          fields: [
            { id: "f22", label: "Available days", type: "multiselect", required: false, options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
            { id: "f23", label: "Available hours", type: "text", required: false },
            { id: "f24", label: "Preferred shift type", type: "dropdown", required: false, options: ["Day", "Night", "Live-in"] },
            { id: "f25", label: "Willing to work weekends?", type: "yesno", required: false },
            { id: "f26", label: "Willing to travel between clients?", type: "yesno", required: false },
          ],
        },
        {
          id: "section-6",
          name: "Transportation",
          visible: true,
          fields: [
            { id: "f27", label: "Do you have reliable transportation?", type: "yesno", required: false },
            { id: "f28", label: "Valid driver's license?", type: "yesno", required: false },
            { id: "f29", label: "Auto insurance active?", type: "yesno", required: false },
            { id: "f30", label: "Upload insurance document", type: "file", required: false },
          ],
        },
        {
          id: "section-7",
          name: "References",
          visible: true,
          fields: [
            { id: "f31", label: "Reference Name", type: "text", required: false },
            { id: "f32", label: "Relationship", type: "text", required: false },
            { id: "f33", label: "Phone or Email", type: "text", required: false },
          ],
        },
        {
          id: "section-8",
          name: "Consent & Signature",
          visible: true,
          fields: [
            { id: "f34", label: "I certify the information is accurate", type: "checkbox", required: true },
            { id: "f35", label: "Signature", type: "signature", required: true },
            { id: "f36", label: "Date", type: "date", required: false },
          ],
        },
      ];

    case "form-premade-2": // Client Intake & Care Needs Form
      return [
        {
          id: "section-1",
          name: "Client Information",
          visible: true,
          fields: [
            { id: "f1", label: "Client Full Name", type: "text", required: true },
            { id: "f2", label: "Date of Birth", type: "date", required: false },
            { id: "f3", label: "Gender", type: "dropdown", required: false, options: ["Male", "Female", "Other", "Prefer not to say"] },
            { id: "f4", label: "Primary Language", type: "text", required: false },
            { id: "f5", label: "Home Address", type: "text", required: true },
            { id: "f6", label: "Phone Number", type: "text", required: false },
          ],
        },
        {
          id: "section-2",
          name: "Emergency Contacts",
          visible: true,
          fields: [
            { id: "f7", label: "Primary Contact Name", type: "text", required: true },
            { id: "f8", label: "Relationship", type: "text", required: false },
            { id: "f9", label: "Phone Number", type: "text", required: true },
            { id: "f10", label: "Secondary Contact Name", type: "text", required: false },
            { id: "f11", label: "Phone Number", type: "text", required: false },
          ],
        },
        {
          id: "section-3",
          name: "Medical Information",
          visible: true,
          fields: [
            { id: "f12", label: "Primary diagnosis / conditions", type: "text", required: false },
            { id: "f13", label: "Allergies", type: "text", required: false },
            { id: "f14", label: "Mobility level", type: "dropdown", required: false, options: ["Independent", "Assisted", "Wheelchair", "Bedbound"] },
            { id: "f15", label: "Cognitive status", type: "dropdown", required: false, options: ["Alert", "Mild impairment", "Dementia"] },
            { id: "f16", label: "Fall risk?", type: "yesno", required: false },
          ],
        },
        {
          id: "section-4",
          name: "ADLs & Care Needs",
          visible: true,
          fields: [
            { id: "f17", label: "Care Needs", type: "multiselect", required: false, options: ["Bathing", "Dressing", "Toileting", "Feeding", "Transferring", "Medication reminders", "Incontinence care"] },
          ],
        },
        {
          id: "section-5",
          name: "Preferences & Notes",
          visible: true,
          fields: [
            { id: "f18", label: "Preferred caregiver gender", type: "dropdown", required: false, options: ["No preference", "Male", "Female"] },
            { id: "f19", label: "Language preference", type: "text", required: false },
            { id: "f20", label: "Pets in home?", type: "yesno", required: false },
            { id: "f21", label: "Safety concerns", type: "text", required: false },
            { id: "f22", label: "Special instructions", type: "text", required: false },
          ],
        },
        {
          id: "section-6",
          name: "Consent",
          visible: true,
          fields: [
            { id: "f23", label: "Consent to receive home care services", type: "checkbox", required: true },
            { id: "f24", label: "Signature", type: "signature", required: true },
            { id: "f25", label: "Date", type: "date", required: false },
          ],
        },
      ];

    case "form-premade-3": // Caregiver Compliance & Onboarding Checklist
      return [
        {
          id: "section-1",
          name: "Background & Identity",
          visible: true,
          fields: [
            { id: "f1", label: "Background check completed", type: "yesno", required: false },
            { id: "f2", label: "Background check date", type: "date", required: false },
            { id: "f3", label: "ID verified", type: "yesno", required: false },
            { id: "f4", label: "Upload background report", type: "file", required: false },
          ],
        },
        {
          id: "section-2",
          name: "Certifications",
          visible: true,
          fields: [
            { id: "f5", label: "CPR certification valid", type: "yesno", required: false },
            { id: "f6", label: "CPR expiration date", type: "date", required: false },
            { id: "f7", label: "First Aid certified", type: "yesno", required: false },
            { id: "f8", label: "Upload certificates", type: "file", required: false },
          ],
        },
        {
          id: "section-3",
          name: "Health Requirements",
          visible: true,
          fields: [
            { id: "f9", label: "TB test completed", type: "yesno", required: false },
            { id: "f10", label: "TB test date", type: "date", required: false },
            { id: "f11", label: "Vaccinations up to date", type: "yesno", required: false },
            { id: "f12", label: "Upload health records", type: "file", required: false },
          ],
        },
        {
          id: "section-4",
          name: "Employment Documents",
          visible: true,
          fields: [
            { id: "f13", label: "W-4 completed", type: "yesno", required: false },
            { id: "f14", label: "I-9 completed", type: "yesno", required: false },
            { id: "f15", label: "Contract signed", type: "yesno", required: false },
            { id: "f16", label: "Upload signed documents", type: "file", required: false },
          ],
        },
        {
          id: "section-5",
          name: "HR Review",
          visible: true,
          fields: [
            { id: "f17", label: "Reviewed by", type: "text", required: false },
            { id: "f18", label: "Review notes", type: "text", required: false },
            { id: "f19", label: "Approved for scheduling", type: "yesno", required: false },
            { id: "f20", label: "Approval date", type: "date", required: false },
          ],
        },
      ];

    case "form-premade-4": // Visit / Shift Completion Form
      return [
        {
          id: "section-1",
          name: "Shift Details",
          visible: true,
          fields: [
            { id: "f1", label: "Client Name", type: "text", required: false },
            { id: "f2", label: "Shift Date", type: "date", required: false },
            { id: "f3", label: "Shift Time", type: "text", required: false },
            { id: "f4", label: "Caregiver Name", type: "text", required: false },
          ],
        },
        {
          id: "section-2",
          name: "Tasks Performed",
          visible: true,
          fields: [
            { id: "f5", label: "Tasks", type: "multiselect", required: false, options: ["Personal care", "Meal preparation", "Medication reminder", "Mobility assistance", "Companionship", "Light housekeeping"] },
          ],
        },
        {
          id: "section-3",
          name: "Visit Notes",
          visible: true,
          fields: [
            { id: "f6", label: "Care notes", type: "text", required: false },
            { id: "f7", label: "Client condition", type: "dropdown", required: false, options: ["Stable", "Improved", "Declined"] },
            { id: "f8", label: "Mood", type: "dropdown", required: false, options: ["Happy", "Neutral", "Distressed"] },
          ],
        },
        {
          id: "section-4",
          name: "Issues & Follow-up",
          visible: true,
          fields: [
            { id: "f9", label: "Any issues during visit?", type: "yesno", required: false },
            { id: "f10", label: "Describe issue", type: "text", required: false },
            { id: "f11", label: "Follow-up required?", type: "yesno", required: false },
          ],
        },
        {
          id: "section-5",
          name: "Confirmation",
          visible: true,
          fields: [
            { id: "f12", label: "Caregiver signature", type: "signature", required: false },
            { id: "f13", label: "Client / family signature", type: "signature", required: false },
            { id: "f14", label: "Date & time", type: "date", required: false },
          ],
        },
      ];

    case "form-premade-5": // Incident / Accident Report Form
      return [
        {
          id: "section-1",
          name: "Incident Details",
          visible: true,
          fields: [
            { id: "f1", label: "Date of incident", type: "date", required: true },
            { id: "f2", label: "Time of incident", type: "text", required: false },
            { id: "f3", label: "Location", type: "dropdown", required: false, options: ["Client home", "Facility", "Other"] },
            { id: "f4", label: "Type of incident", type: "dropdown", required: false, options: ["Fall", "Injury", "Medication", "Behavior", "Other"] },
          ],
        },
        {
          id: "section-2",
          name: "People Involved",
          visible: true,
          fields: [
            { id: "f5", label: "Client involved?", type: "yesno", required: false },
            { id: "f6", label: "Caregiver involved?", type: "yesno", required: false },
            { id: "f7", label: "Other individuals", type: "text", required: false },
          ],
        },
        {
          id: "section-3",
          name: "Description",
          visible: true,
          fields: [
            { id: "f8", label: "Detailed description of incident", type: "text", required: true },
            { id: "f9", label: "Injury occurred?", type: "yesno", required: false },
            { id: "f10", label: "Severity", type: "dropdown", required: false, options: ["Minor", "Moderate", "Severe"] },
          ],
        },
        {
          id: "section-4",
          name: "Immediate Action Taken",
          visible: true,
          fields: [
            { id: "f11", label: "Action taken", type: "text", required: false },
            { id: "f12", label: "Emergency services contacted?", type: "yesno", required: false },
            { id: "f13", label: "Family notified?", type: "yesno", required: false },
            { id: "f14", label: "Supervisor notified?", type: "yesno", required: false },
          ],
        },
        {
          id: "section-5",
          name: "Review & Sign-off",
          visible: true,
          fields: [
            { id: "f15", label: "Reviewed by", type: "text", required: false },
            { id: "f16", label: "Review notes", type: "text", required: false },
            { id: "f17", label: "Corrective action required?", type: "yesno", required: false },
            { id: "f18", label: "Signature", type: "signature", required: false },
            { id: "f19", label: "Date", type: "date", required: false },
          ],
        },
      ];

    default:
      return [];
  }
}
