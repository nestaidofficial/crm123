import { z } from "zod";

// =============================================================================
// Enums and Shared Schemas
// =============================================================================

export const payerTypeEnum = z.enum(["medicaid", "private_insurance", "self_pay", "hcbs", "other"]);
export const billingFrequencyEnum = z.enum(["weekly", "biweekly", "monthly"]);
export const unitTypeEnum = z.enum(["15min", "hour", "visit", "day"]);
export const invoiceStatusEnum = z.enum(["draft", "sent", "unpaid", "partially_paid", "paid", "overdue", "voided"]);
export const claimStatusEnum = z.enum(["draft", "generated", "submitted", "accepted", "rejected", "paid", "denied", "corrected"]);
export const paymentMethodEnum = z.enum(["check", "ach", "credit_card", "cash", "era", "other"]);

const addressSchema = z.object({
  street: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  zip: z.string().default(""),
});

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

// =============================================================================
// Payer Schemas
// =============================================================================

export const CreatePayerSchema = z.object({
  name: z.string().min(1, "Payer name is required"),
  payerType: payerTypeEnum,
  state: z.string().length(2, "State must be 2-letter code").optional().nullable(),
  electronicPayerId: z.string().optional().nullable(),
  address: addressSchema.optional().nullable(),
  phone: z.string().optional().nullable(),
  timelyFilingDays: z.coerce.number().int().min(30).max(730).default(365),
  billingFrequency: billingFrequencyEnum.default("monthly"),
  isActive: z.boolean().default(true),
});

export const UpdatePayerSchema = CreatePayerSchema.partial();

export type CreatePayerInput = z.infer<typeof CreatePayerSchema>;
export type UpdatePayerInput = z.infer<typeof UpdatePayerSchema>;

// =============================================================================
// Service Code Schemas
// =============================================================================

export const CreateServiceCodeSchema = z.object({
  payerId: z.string().uuid("Invalid payer ID"),
  serviceTypeId: z.string().uuid("Invalid service type ID"),
  code: z.string().min(1, "Code is required"),
  modifier: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  rate: z.coerce.number().positive("Rate must be positive"),
  unitType: unitTypeEnum,
  effectiveDate: dateSchema,
  endDate: dateSchema.optional().nullable(),
  isActive: z.boolean().default(true),
});

export const UpdateServiceCodeSchema = CreateServiceCodeSchema.partial();

export type CreateServiceCodeInput = z.infer<typeof CreateServiceCodeSchema>;
export type UpdateServiceCodeInput = z.infer<typeof UpdateServiceCodeSchema>;

// =============================================================================
// Client Payer Assignment Schemas
// =============================================================================

export const CreateClientPayerAssignmentSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  payerId: z.string().uuid("Invalid payer ID"),
  memberId: z.string().optional().nullable(),
  groupNumber: z.string().optional().nullable(),
  isPrimary: z.boolean().default(true),
  authorizationNumber: z.string().optional().nullable(),
  authorizedUnits: z.coerce.number().positive().optional().nullable(),
  usedUnits: z.coerce.number().nonnegative().default(0),
  authorizationStart: dateSchema.optional().nullable(),
  authorizationEnd: dateSchema.optional().nullable(),
  effectiveDate: dateSchema,
  endDate: dateSchema.optional().nullable(),
});

export const UpdateClientPayerAssignmentSchema = CreateClientPayerAssignmentSchema.partial();

export type CreateClientPayerAssignmentInput = z.infer<typeof CreateClientPayerAssignmentSchema>;
export type UpdateClientPayerAssignmentInput = z.infer<typeof UpdateClientPayerAssignmentSchema>;

// =============================================================================
// Provider Config Schemas
// =============================================================================

export const UpdateProviderConfigSchema = z.object({
  providerName: z.string().optional().nullable(),
  // NPI is optional (private-pay agencies don't need it); if provided must be 10 digits
  npi: z
    .string()
    .refine((v) => !v || v.length === 10, "NPI must be 10 digits")
    .optional()
    .nullable(),
  taxId: z.string().optional().nullable(),
  taxonomyCode: z.string().optional().nullable(),
  billingAddress: addressSchema.optional(),
  billingPhone: z.string().optional().nullable(),
  billingContactName: z.string().optional().nullable(),
  stateProviderIds: z.record(z.string()).optional(),
  defaultPlaceOfService: z.string().default("12").optional(),
  ediSubmitterId: z.string().optional().nullable(),
  ediReceiverId: z.string().optional().nullable(),
});

export type UpdateProviderConfigInput = z.infer<typeof UpdateProviderConfigSchema>;

// =============================================================================
// Invoice Schemas
// =============================================================================

export const CreateInvoiceSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  payerId: z.string().uuid("Invalid payer ID").optional().nullable(),
  billingPeriodStart: dateSchema,
  billingPeriodEnd: dateSchema,
  dueDate: dateSchema.optional().nullable(),
  notes: z.string().optional().nullable(),
  lineItems: z.array(
    z.object({
      evvVisitId: z.string().uuid("Invalid visit ID"),
      description: z.string().min(1, "Description is required"),
      serviceDate: dateSchema,
      units: z.coerce.number().positive("Units must be positive"),
      rate: z.coerce.number().positive("Rate must be positive"),
      amount: z.coerce.number().nonnegative("Amount must be non-negative"),
    })
  ),
});

export const UpdateInvoiceSchema = z.object({
  status: invoiceStatusEnum.optional(),
  dueDate: dateSchema.optional().nullable(),
  sentDate: dateSchema.optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;

// =============================================================================
// Claim Schemas
// =============================================================================

export const CreateClaimSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  payerId: z.string().uuid("Invalid payer ID"),
  clientPayerAssignmentId: z.string().uuid("Invalid assignment ID").optional().nullable(),
  billingPeriodStart: dateSchema,
  billingPeriodEnd: dateSchema,
  lineItems: z.array(
    z.object({
      evvVisitId: z.string().uuid("Invalid visit ID"),
      serviceCode: z.string().min(1, "Service code is required"),
      modifier: z.string().optional().nullable(),
      serviceDate: dateSchema,
      units: z.coerce.number().positive("Units must be positive"),
      rate: z.coerce.number().positive("Rate must be positive"),
      amount: z.coerce.number().nonnegative("Amount must be non-negative"),
      diagnosisCode: z.string().optional().nullable(),
      placeOfService: z.string().default("12"),
      renderingProviderNpi: z.string().optional().nullable(),
    })
  ),
});

export const UpdateClaimSchema = z.object({
  status: claimStatusEnum.optional(),
  submissionDate: dateSchema.optional().nullable(),
  responseDate: dateSchema.optional().nullable(),
  rejectionReason: z.string().optional().nullable(),
});

export type CreateClaimInput = z.infer<typeof CreateClaimSchema>;
export type UpdateClaimInput = z.infer<typeof UpdateClaimSchema>;

// =============================================================================
// Payment Schemas
// =============================================================================

export const CreatePaymentSchema = z.object({
  paymentDate: dateSchema,
  amount: z.coerce.number().positive("Amount must be positive"),
  method: paymentMethodEnum,
  referenceNumber: z.string().optional().nullable(),
  payerId: z.string().uuid("Invalid payer ID").optional().nullable(),
  invoiceId: z.string().uuid("Invalid invoice ID").optional().nullable(),
  claimId: z.string().uuid("Invalid claim ID").optional().nullable(),
  notes: z.string().optional().nullable(),
  recordedBy: z.string().uuid("Invalid user ID").optional().nullable(),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
