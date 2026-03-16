import { z } from "zod";

// --- Enums & shared ---
const roleEnum = z.enum([
  "caregiver",
  "cna",
  "hha",
  "lpn",
  "rn",
  "admin",
  "coordinator",
  "other",
]);

const statusEnum = z.enum(["active", "inactive", "onboarding"]);

const payTypeEnum = z.enum(["hourly", "salary", "per-visit"]);

const genderEnum = z.enum([
  "Male",
  "Female",
  "Non-binary",
  "Other",
  "Prefer not to say",
]);

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

const emergencyContactSchema = z.object({
  name: z.string().min(1, "Emergency contact name is required"),
  phone: phoneSchema,
});

const payrollSchema = z.object({
  bankAccount: z.string().optional(),
  routingNumber: z.string().optional(),
  bankName: z.string().optional(),
});

const dobSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "DOB must be YYYY-MM-DD")
  .optional()
  .or(z.literal("")); // Allow empty string from form

const startDateSchema = z
  .string()
  .min(1, "Start date is required")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD");

// --- Create Employee Schema ---
export const CreateEmployeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional().or(z.literal("")), // Allow empty string
  email: z.string().email("Invalid email address"),
  phone: phoneSchema,
  dob: dobSchema,
  ssn: z.string().optional().or(z.literal("")), // Allow empty string
  gender: genderEnum.optional().or(z.literal("")),
  avatarUrl: z.union([z.string().url(), z.literal("")]).optional(),
  role: roleEnum,
  status: statusEnum.default("active"),
  startDate: startDateSchema,
  department: z.string().min(1, "Department is required"),
  supervisor: z.string().min(1, "Supervisor is required"),
  address: addressSchema,
  emergencyContact: emergencyContactSchema,
  payRate: z.coerce.number().positive("Pay rate must be positive"), // Coerce string to number
  payType: payTypeEnum,
  payroll: payrollSchema.optional(),
  workAuthorization: z.string().optional().or(z.literal("")), // Allow empty string
  npi: z.string().length(10, "NPI must be 10 digits").optional().or(z.literal("")), // National Provider Identifier
  notes: z.string().optional().or(z.literal("")), // Allow empty string
  skills: z.array(z.string()).default([]),
  serviceIds: z.array(z.string().uuid()).optional(),
});

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;

// --- Update Employee Schema (partial) ---
export const UpdateEmployeeSchema = z
  .object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    middleName: z.string().optional().or(z.literal("")),
    email: z.string().email().optional(),
    phone: phoneSchema.optional(),
    dob: dobSchema,
    ssn: z.string().optional().or(z.literal("")),
    gender: genderEnum.optional().or(z.literal("")),
    avatarUrl: z.union([z.string().url(), z.literal("")]).optional(),
    role: roleEnum.optional(),
    status: statusEnum.optional(),
    startDate: startDateSchema.optional(),
    department: z.string().min(1).optional(),
    supervisor: z.string().min(1).optional(),
    address: addressSchema.partial().optional(),
    emergencyContact: emergencyContactSchema.partial().optional(),
    payRate: z.coerce.number().positive().optional(), // Coerce string to number
    payType: payTypeEnum.optional(),
    payroll: payrollSchema.optional(),
    workAuthorization: z.string().optional().or(z.literal("")),
    npi: z.string().length(10, "NPI must be 10 digits").optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
    skills: z.array(z.string()).optional(),
    serviceIds: z.array(z.string().uuid()).optional(),
  })
  .strict();

export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;
