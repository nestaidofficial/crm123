import { z } from "zod";

// Match API phone validation so PATCH does not 400
const phoneSchema = z
  .string()
  .min(7, "Phone must be at least 7 characters")
  .max(20, "Phone must be at most 20 characters");

const addressSchema = z.object({
  street: z.string().min(1, "Street is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().min(1, "ZIP is required"),
});

const primaryContactSchema = z.object({
  name: z.string().min(1, "Primary contact name is required"),
  relation: z.string().min(1, "Relation is required"),
  phone: phoneSchema,
});

const emergencyContactSchema = z.object({
  name: z.string().min(1, "Emergency contact name is required"),
  phone: phoneSchema,
  relation: z.string().optional(),
});

const baseSchema = z.object({
  careType: z.enum(["non_medical", "medical"]),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
  phone: phoneSchema,
  email: z.string().optional(),
  avatar: z.string().optional(),
  address: addressSchema,
  primaryContact: primaryContactSchema,
  emergencyContact: emergencyContactSchema,
  notes: z.string().optional(),
});

const schedulePreferencesSchema = z.object({
  daysOfWeek: z.array(z.string()),
  timeWindow: z.string().min(1, "Time window is required"),
  visitFrequency: z.string().min(1, "Visit frequency is required"),
});

export const nonMedicalSchema = baseSchema.extend({
  careType: z.literal("non_medical"),
  adlNeeds: z.array(z.string()),
  schedulePreferences: schedulePreferencesSchema,
});

export const medicalSchema = baseSchema.extend({
  careType: z.literal("medical"),
  diagnosis: z.string().min(1, "Diagnosis is required"),
  physicianName: z.string().min(1, "Physician name is required"),
  physicianPhone: z.string().min(1, "Physician phone is required"),
  medications: z.array(
    z.object({
      name: z.string().min(1, "Medication name is required"),
      dose: z.string().min(1, "Dose is required"),
      frequency: z.string().min(1, "Frequency is required"),
    })
  ),
  skilledServices: z.array(z.string()),
});

export const clientFormSchema = z.discriminatedUnion("careType", [
  nonMedicalSchema,
  medicalSchema,
]);

/** @deprecated Use clientFormSchema */
export const patientFormSchema = clientFormSchema;

export type ClientFormValues = z.infer<typeof clientFormSchema>;
export type NonMedicalFormValues = z.infer<typeof nonMedicalSchema>;
export type MedicalFormValues = z.infer<typeof medicalSchema>;

export type SavedClient = ClientFormValues & { id: string };

export const defaultNonMedicalValues: NonMedicalFormValues = {
  careType: "non_medical",
  firstName: "",
  lastName: "",
  dob: "",
  gender: "",
  phone: "",
  email: "",
  address: { street: "", city: "", state: "", zip: "" },
  primaryContact: { name: "", relation: "", phone: "" },
  emergencyContact: { name: "", phone: "" },
  notes: "",
  adlNeeds: [],
  schedulePreferences: {
    daysOfWeek: [],
    timeWindow: "",
    visitFrequency: "",
  },
};

export const defaultMedicalValues: MedicalFormValues = {
  careType: "medical",
  firstName: "",
  lastName: "",
  dob: "",
  gender: "",
  phone: "",
  email: "",
  address: { street: "", city: "", state: "", zip: "" },
  primaryContact: { name: "", relation: "", phone: "" },
  emergencyContact: { name: "", phone: "" },
  notes: "",
  diagnosis: "",
  physicianName: "",
  physicianPhone: "",
  medications: [],
  skilledServices: [],
};

export const defaultClientFormValues: ClientFormValues = defaultNonMedicalValues;
