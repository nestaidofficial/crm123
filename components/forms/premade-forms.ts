import type { FormSection, FormField } from "./form-editor";
import type { Form } from "./form-card";

export function getPremadeForms(): Form[] {
  return [];
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

    default:
      return [];
  }
}
