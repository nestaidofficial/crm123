import { z } from "zod";

// --- Enums & shared ---
const genderEnum = z.enum([
  "Male",
  "Female",
  "Non-binary",
  "Other",
  "Prefer not to say",
]);

const timeWindowEnum = z.enum([
  "Morning (6am–12pm)",
  "Afternoon (12pm–5pm)",
  "Evening (5pm–9pm)",
  "Flexible",
]);

const visitFrequencyEnum = z.enum([
  "Once per week",
  "2–3x per week",
  "Daily",
  "Multiple times per day",
  "As needed",
]);

const dobSchema = z
  .string()
  .min(1, "Date of birth is required")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "DOB must be YYYY-MM-DD");

const phoneSchema = z
  .string()
  .min(7, "Phone must be at least 7 characters")
  .max(20, "Phone must be at most 20 characters");

const addressSchema = z.object({
  street: z.string().min(1, "Street is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State must be at least 2 characters"),
  zip: z.string().min(3, "ZIP must be at least 3 characters"),
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

const schedulePreferencesSchema = z.object({
  daysOfWeek: z.array(z.enum([
    "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday",
  ])),
  timeWindow: timeWindowEnum,
  visitFrequency: visitFrequencyEnum,
});

const medicationSchema = z.object({
  name: z.string().min(1, "Medication name is required"),
  dose: z.string().min(1, "Dose is required"),
  frequency: z.string().min(1, "Frequency is required"),
});

const physicianSchema = z.object({
  name: z.string().min(1, "Physician name is required"),
  phone: phoneSchema,
});

// --- Base (shared by both care types) ---
const baseCreateSchema = z.object({
  careType: z.enum(["non_medical", "medical"]),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dob: dobSchema,
  gender: genderEnum,
  phone: phoneSchema,
  email: z.union([z.string().email(), z.literal("")]).optional(),
  avatarUrl: z.union([z.string().url(), z.literal("")]).optional(),
  address: addressSchema,
  primaryContact: primaryContactSchema,
  emergencyContact: emergencyContactSchema,
  notes: z.string().optional(),
});

// --- Create: discriminated by careType ---
const createNonMedicalSchema = baseCreateSchema.extend({
  careType: z.literal("non_medical"),
  adlNeeds: z.array(z.string()),
  schedulePreferences: schedulePreferencesSchema,
  serviceIds: z.array(z.string().uuid()).optional(),
});

const createMedicalSchema = baseCreateSchema.extend({
  careType: z.literal("medical"),
  diagnosis: z.string().min(1, "Diagnosis is required"),
  physician: physicianSchema,
  medications: z.array(medicationSchema).default([]),
  skilledServices: z.array(z.string()).default([]),
  serviceIds: z.array(z.string().uuid()).optional(),
});

export const CreateClientSchema = z.discriminatedUnion("careType", [
  createNonMedicalSchema,
  createMedicalSchema,
]);

export type CreateClientInput = z.infer<typeof CreateClientSchema>;

// --- Update: partial, with conditional care-plan validation ---
const updateBaseSchema = z.object({
  careType: z.enum(["non_medical", "medical"]).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dob: dobSchema.optional(),
  gender: genderEnum.optional(),
  phone: phoneSchema.optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  avatarUrl: z.union([z.string().url(), z.literal("")]).optional(),
  address: addressSchema.partial().optional(),
  primaryContact: primaryContactSchema.partial().optional(),
  emergencyContact: emergencyContactSchema.partial().optional(),
  notes: z.string().optional(),
  // Care-plan fields (validated conditionally)
  adlNeeds: z.array(z.string()).optional(),
  schedulePreferences: schedulePreferencesSchema.partial().optional(),
  diagnosis: z.string().min(1).optional(),
  physician: physicianSchema.partial().optional(),
  medications: z.array(medicationSchema).optional(),
  skilledServices: z.array(z.string()).optional(),
  serviceIds: z.array(z.string().uuid()).optional(),
}).strict();

export const UpdateClientSchema = updateBaseSchema.superRefine((data, ctx) => {
  const careType = data.careType;
  if (careType === "non_medical") {
    if (data.schedulePreferences !== undefined) {
      const r = schedulePreferencesSchema.safeParse(data.schedulePreferences);
      if (!r.success) {
        r.error.issues.forEach((issue) => ctx.addIssue(issue));
      }
    }
  }
  if (careType === "medical") {
    if (data.diagnosis !== undefined && data.diagnosis.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Diagnosis is required when careType is medical" });
    }
    if (data.physician !== undefined) {
      const r = physicianSchema.safeParse(data.physician);
      if (!r.success) {
        r.error.issues.forEach((issue) => ctx.addIssue(issue));
      }
    }
    if (data.medications !== undefined) {
      const r = z.array(medicationSchema).safeParse(data.medications);
      if (!r.success) {
        r.error.issues.forEach((issue) => ctx.addIssue(issue));
      }
    }
  }
});

export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;
