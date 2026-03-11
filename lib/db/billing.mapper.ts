// =============================================================================
// Billing Module: Database Row Types and Mapper Functions
// =============================================================================
// Type definitions and mappers for the billing module (payers, service codes,
// client payer assignments, provider config, invoices, claims, payments).
// Converts between snake_case DB rows and camelCase API shapes.
// =============================================================================

// =============================================================================
// Database Row Types (snake_case)
// =============================================================================

export interface BillingPayerRow {
  id: string;
  name: string;
  payer_type: "medicaid" | "private_insurance" | "self_pay" | "hcbs" | "other";
  state: string | null;
  electronic_payer_id: string | null;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  } | null;
  phone: string | null;
  timely_filing_days: number;
  billing_frequency: "weekly" | "biweekly" | "monthly";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillingServiceCodeRow {
  id: string;
  payer_id: string;
  service_type_id: string;
  code: string;
  modifier: string | null;
  description: string | null;
  rate: number;
  unit_type: "15min" | "hour" | "visit" | "day";
  effective_date: string; // ISO date
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ClientPayerAssignmentRow {
  id: string;
  client_id: string;
  payer_id: string;
  member_id: string | null;
  group_number: string | null;
  is_primary: boolean;
  authorization_number: string | null;
  authorized_units: number | null;
  used_units: number;
  authorization_start: string | null; // ISO date
  authorization_end: string | null;
  effective_date: string; // ISO date
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingProviderConfigRow {
  id: string;
  provider_name: string | null;
  npi: string | null;
  tax_id: string | null;
  taxonomy_code: string | null;
  billing_address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  } | null;
  billing_phone: string | null;
  billing_contact_name: string | null;
  state_provider_ids: Record<string, string> | null;
  default_place_of_service: string | null;
  edi_submitter_id: string | null;
  edi_receiver_id: string | null;
  updated_at: string;
}

export interface BillingInvoiceRow {
  id: string;
  invoice_number: string;
  client_id: string;
  payer_id: string | null;
  billing_period_start: string; // ISO date
  billing_period_end: string;
  subtotal: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
  status: "draft" | "sent" | "unpaid" | "partially_paid" | "paid" | "overdue" | "voided";
  due_date: string | null;
  sent_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingInvoiceLineRow {
  id: string;
  invoice_id: string;
  evv_visit_id: string;
  service_code_id: string | null;
  description: string;
  service_date: string; // ISO date
  units: number;
  rate: number;
  amount: number;
  sort_order: number;
  created_at: string;
}

export interface BillingClaimRow {
  id: string;
  claim_number: string;
  client_id: string;
  payer_id: string;
  client_payer_assignment_id: string | null;
  billing_period_start: string; // ISO date
  billing_period_end: string;
  total_amount: number;
  paid_amount: number;
  status: "draft" | "generated" | "submitted" | "accepted" | "rejected" | "paid" | "denied" | "corrected";
  submission_date: string | null;
  response_date: string | null;
  rejection_reason: string | null;
  edi_content: string | null;
  filing_deadline: string | null; // ISO date
  created_at: string;
  updated_at: string;
}

export interface BillingClaimLineRow {
  id: string;
  claim_id: string;
  evv_visit_id: string;
  service_code: string;
  modifier: string | null;
  service_date: string; // ISO date
  units: number;
  rate: number;
  amount: number;
  diagnosis_code: string | null;
  place_of_service: string;
  rendering_provider_npi: string | null;
  evv_clock_in: string | null; // ISO timestamp
  evv_clock_out: string | null;
  evv_gps_lat_in: number | null;
  evv_gps_lon_in: number | null;
  evv_gps_lat_out: number | null;
  evv_gps_lon_out: number | null;
  sort_order: number;
  created_at: string;
}

export interface BillingPaymentRow {
  id: string;
  payment_date: string; // ISO date
  amount: number;
  method: "check" | "ach" | "credit_card" | "cash" | "era" | "other";
  reference_number: string | null;
  payer_id: string | null;
  invoice_id: string | null;
  claim_id: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

// =============================================================================
// API Response Types (camelCase)
// =============================================================================

export interface BillingPayerApi {
  id: string;
  name: string;
  payerType: "medicaid" | "private_insurance" | "self_pay" | "hcbs" | "other";
  state: string | null;
  electronicPayerId: string | null;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  } | null;
  phone: string | null;
  timelyFilingDays: number;
  billingFrequency: "weekly" | "biweekly" | "monthly";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillingServiceCodeApi {
  id: string;
  payerId: string;
  serviceTypeId: string;
  code: string;
  modifier: string | null;
  description: string | null;
  rate: number;
  unitType: "15min" | "hour" | "visit" | "day";
  effectiveDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ClientPayerAssignmentApi {
  id: string;
  clientId: string;
  payerId: string;
  memberId: string | null;
  groupNumber: string | null;
  isPrimary: boolean;
  authorizationNumber: string | null;
  authorizedUnits: number | null;
  usedUnits: number;
  authorizationStart: string | null;
  authorizationEnd: string | null;
  effectiveDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingProviderConfigApi {
  id: string;
  providerName: string;
  npi: string;
  taxId: string;
  taxonomyCode: string | null;
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  billingPhone: string | null;
  billingContactName: string | null;
  stateProviderIds: Record<string, string>;
  defaultPlaceOfService: string;
  ediSubmitterId: string | null;
  ediReceiverId: string | null;
  updatedAt: string;
}

export interface BillingInvoiceApi {
  id: string;
  invoiceNumber: string;
  clientId: string;
  payerId: string | null;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  subtotal: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
  status: "draft" | "sent" | "unpaid" | "partially_paid" | "paid" | "overdue" | "voided";
  dueDate: string | null;
  sentDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingInvoiceLineApi {
  id: string;
  invoiceId: string;
  evvVisitId: string;
  serviceCodeId: string | null;
  description: string;
  serviceDate: string;
  units: number;
  rate: number;
  amount: number;
  sortOrder: number;
  createdAt: string;
}

export interface BillingClaimApi {
  id: string;
  claimNumber: string;
  clientId: string;
  payerId: string;
  clientPayerAssignmentId: string | null;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  totalAmount: number;
  paidAmount: number;
  status: "draft" | "generated" | "submitted" | "accepted" | "rejected" | "paid" | "denied" | "corrected";
  submissionDate: string | null;
  responseDate: string | null;
  rejectionReason: string | null;
  ediContent: string | null;
  filingDeadline: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingClaimLineApi {
  id: string;
  claimId: string;
  evvVisitId: string;
  serviceCode: string;
  modifier: string | null;
  serviceDate: string;
  units: number;
  rate: number;
  amount: number;
  diagnosisCode: string | null;
  placeOfService: string;
  renderingProviderNpi: string | null;
  evvClockIn: string | null;
  evvClockOut: string | null;
  evvGpsLatIn: number | null;
  evvGpsLonIn: number | null;
  evvGpsLatOut: number | null;
  evvGpsLonOut: number | null;
  sortOrder: number;
  createdAt: string;
}

export interface BillingPaymentApi {
  id: string;
  paymentDate: string;
  amount: number;
  method: "check" | "ach" | "credit_card" | "cash" | "era" | "other";
  referenceNumber: string | null;
  payerId: string | null;
  invoiceId: string | null;
  claimId: string | null;
  notes: string | null;
  recordedBy: string | null;
  createdAt: string;
}

// =============================================================================
// Mapper Functions: DB Row → API Response
// =============================================================================

export function mapPayerRowToApi(row: BillingPayerRow): BillingPayerApi {
  return {
    id: row.id,
    name: row.name,
    payerType: row.payer_type,
    state: row.state,
    electronicPayerId: row.electronic_payer_id,
    address: row.address,
    phone: row.phone,
    timelyFilingDays: row.timely_filing_days,
    billingFrequency: row.billing_frequency,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapServiceCodeRowToApi(row: BillingServiceCodeRow): BillingServiceCodeApi {
  return {
    id: row.id,
    payerId: row.payer_id,
    serviceTypeId: row.service_type_id,
    code: row.code,
    modifier: row.modifier,
    description: row.description,
    rate: row.rate,
    unitType: row.unit_type,
    effectiveDate: row.effective_date,
    endDate: row.end_date,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export function mapClientPayerAssignmentRowToApi(row: ClientPayerAssignmentRow): ClientPayerAssignmentApi {
  return {
    id: row.id,
    clientId: row.client_id,
    payerId: row.payer_id,
    memberId: row.member_id,
    groupNumber: row.group_number,
    isPrimary: row.is_primary,
    authorizationNumber: row.authorization_number,
    authorizedUnits: row.authorized_units,
    usedUnits: row.used_units,
    authorizationStart: row.authorization_start,
    authorizationEnd: row.authorization_end,
    effectiveDate: row.effective_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProviderConfigRowToApi(row: BillingProviderConfigRow): BillingProviderConfigApi {
  return {
    id: row.id,
    providerName: row.provider_name ?? "",
    npi: row.npi ?? "",
    taxId: row.tax_id ?? "",
    taxonomyCode: row.taxonomy_code,
    billingAddress: row.billing_address ?? { street: "", city: "", state: "", zip: "" },
    billingPhone: row.billing_phone,
    billingContactName: row.billing_contact_name,
    stateProviderIds: row.state_provider_ids ?? {},
    defaultPlaceOfService: row.default_place_of_service ?? "12",
    ediSubmitterId: row.edi_submitter_id,
    ediReceiverId: row.edi_receiver_id,
    updatedAt: row.updated_at,
  };
}

export function mapInvoiceRowToApi(row: BillingInvoiceRow): BillingInvoiceApi {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    clientId: row.client_id,
    payerId: row.payer_id,
    billingPeriodStart: row.billing_period_start,
    billingPeriodEnd: row.billing_period_end,
    subtotal: row.subtotal,
    tax: row.tax,
    total: row.total,
    paid: row.paid,
    balance: row.balance,
    status: row.status,
    dueDate: row.due_date,
    sentDate: row.sent_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapInvoiceLineRowToApi(row: BillingInvoiceLineRow): BillingInvoiceLineApi {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    evvVisitId: row.evv_visit_id,
    serviceCodeId: row.service_code_id,
    description: row.description,
    serviceDate: row.service_date,
    units: row.units,
    rate: row.rate,
    amount: row.amount,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function mapClaimRowToApi(row: BillingClaimRow): BillingClaimApi {
  return {
    id: row.id,
    claimNumber: row.claim_number,
    clientId: row.client_id,
    payerId: row.payer_id,
    clientPayerAssignmentId: row.client_payer_assignment_id,
    billingPeriodStart: row.billing_period_start,
    billingPeriodEnd: row.billing_period_end,
    totalAmount: row.total_amount,
    paidAmount: row.paid_amount,
    status: row.status,
    submissionDate: row.submission_date,
    responseDate: row.response_date,
    rejectionReason: row.rejection_reason,
    ediContent: row.edi_content,
    filingDeadline: row.filing_deadline,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapClaimLineRowToApi(row: BillingClaimLineRow): BillingClaimLineApi {
  return {
    id: row.id,
    claimId: row.claim_id,
    evvVisitId: row.evv_visit_id,
    serviceCode: row.service_code,
    modifier: row.modifier,
    serviceDate: row.service_date,
    units: row.units,
    rate: row.rate,
    amount: row.amount,
    diagnosisCode: row.diagnosis_code,
    placeOfService: row.place_of_service,
    renderingProviderNpi: row.rendering_provider_npi,
    evvClockIn: row.evv_clock_in,
    evvClockOut: row.evv_clock_out,
    evvGpsLatIn: row.evv_gps_lat_in,
    evvGpsLonIn: row.evv_gps_lon_in,
    evvGpsLatOut: row.evv_gps_lat_out,
    evvGpsLonOut: row.evv_gps_lon_out,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function mapPaymentRowToApi(row: BillingPaymentRow): BillingPaymentApi {
  return {
    id: row.id,
    paymentDate: row.payment_date,
    amount: row.amount,
    method: row.method,
    referenceNumber: row.reference_number,
    payerId: row.payer_id,
    invoiceId: row.invoice_id,
    claimId: row.claim_id,
    notes: row.notes,
    recordedBy: row.recorded_by,
    createdAt: row.created_at,
  };
}

// =============================================================================
// Helper: Generate Invoice Number
// =============================================================================

export function generateInvoiceNumber(sequenceNumber: number): string {
  return `INV-${String(sequenceNumber).padStart(6, "0")}`;
}

// =============================================================================
// Helper: Generate Claim Number
// =============================================================================

export function generateClaimNumber(sequenceNumber: number): string {
  return `CLM-${String(sequenceNumber).padStart(6, "0")}`;
}
