// =============================================================================
// Billing Export Utilities
// =============================================================================
// Export functions for invoices, claims, and 837P EDI files.
// Triggers browser downloads of CSV, Excel, JSON, and EDI formats.
// =============================================================================

import type {
  BillingInvoiceApi,
  BillingInvoiceLineApi,
  BillingClaimApi,
  BillingClaimLineApi,
} from "@/lib/db/billing.mapper";
import type { ExportFormat, ClaimExportData } from "@/lib/billing/export-types";

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(isoDate: string): string {
  return isoDate.split("T")[0];
}

/**
 * Convert array to CSV string
 */
function arrayToCSV(data: string[][]): string {
  return data
    .map((row) =>
      row
        .map((cell) => {
          const cellStr = String(cell ?? "");
          if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(",")
    )
    .join("\n");
}

/**
 * Trigger browser download
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =============================================================================
// Invoice Exports
// =============================================================================

/**
 * Export invoices to CSV
 */
export function exportInvoicesToCSV(
  invoices: Array<BillingInvoiceApi & { client?: { first_name: string; last_name: string } }>,
  options?: { filename?: string }
): void {
  const filename = options?.filename ?? `invoices_${new Date().toISOString().split("T")[0]}.csv`;

  const headers = [
    "Invoice Number",
    "Client",
    "Billing Period",
    "Subtotal",
    "Tax",
    "Total",
    "Paid",
    "Balance",
    "Status",
    "Due Date",
    "Sent Date",
  ];

  const rows = invoices.map((inv) => [
    inv.invoiceNumber,
    inv.client ? `${inv.client.first_name} ${inv.client.last_name}` : "",
    `${formatDate(inv.billingPeriodStart)} - ${formatDate(inv.billingPeriodEnd)}`,
    formatCurrency(inv.subtotal),
    formatCurrency(inv.tax),
    formatCurrency(inv.total),
    formatCurrency(inv.paid),
    formatCurrency(inv.balance),
    inv.status,
    inv.dueDate ? formatDate(inv.dueDate) : "",
    inv.sentDate ? formatDate(inv.sentDate) : "",
  ]);

  const csvData = [headers, ...rows];
  const csvContent = arrayToCSV(csvData);
  downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
}

/**
 * Export invoice line items to CSV
 */
export function exportInvoiceLinesToCSV(
  lines: BillingInvoiceLineApi[],
  invoiceNumber: string,
  options?: { filename?: string }
): void {
  const filename =
    options?.filename ?? `invoice_${invoiceNumber}_lines_${new Date().toISOString().split("T")[0]}.csv`;

  const headers = [
    "Invoice Number",
    "Service Date",
    "Description",
    "Units",
    "Rate",
    "Amount",
  ];

  const rows = lines.map((line) => [
    invoiceNumber,
    formatDate(line.serviceDate),
    line.description,
    line.units.toFixed(2),
    formatCurrency(line.rate),
    formatCurrency(line.amount),
  ]);

  const csvData = [headers, ...rows];
  const csvContent = arrayToCSV(csvData);
  downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
}

// =============================================================================
// Claim Exports
// =============================================================================

/**
 * Export claims to CSV
 */
export function exportClaimsToCSV(
  claims: Array<
    BillingClaimApi & {
      client?: { first_name: string; last_name: string };
      payer?: { name: string; state: string | null };
    }
  >,
  options?: { filename?: string }
): void {
  const filename = options?.filename ?? `claims_${new Date().toISOString().split("T")[0]}.csv`;

  const headers = [
    "Claim Number",
    "Client",
    "Payer",
    "State",
    "Billing Period",
    "Total Amount",
    "Paid Amount",
    "Status",
    "Submission Date",
    "Filing Deadline",
  ];

  const rows = claims.map((claim) => [
    claim.claimNumber,
    claim.client ? `${claim.client.first_name} ${claim.client.last_name}` : "",
    claim.payer?.name || "",
    claim.payer?.state || "",
    `${formatDate(claim.billingPeriodStart)} - ${formatDate(claim.billingPeriodEnd)}`,
    formatCurrency(claim.totalAmount),
    formatCurrency(claim.paidAmount),
    claim.status,
    claim.submissionDate ? formatDate(claim.submissionDate) : "",
    claim.filingDeadline ? formatDate(claim.filingDeadline) : "",
  ]);

  const csvData = [headers, ...rows];
  const csvContent = arrayToCSV(csvData);
  downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
}

/**
 * Export claim lines to CSV
 */
export function exportClaimLinesToCSV(
  lines: BillingClaimLineApi[],
  claimNumber: string,
  options?: { filename?: string }
): void {
  const filename =
    options?.filename ?? `claim_${claimNumber}_lines_${new Date().toISOString().split("T")[0]}.csv`;

  const headers = [
    "Claim Number",
    "Service Date",
    "Procedure Code",
    "Modifier",
    "Units",
    "Rate",
    "Amount",
    "POS",
    "Diagnosis",
    "EVV Clock In",
    "EVV Clock Out",
  ];

  const rows = lines.map((line) => [
    claimNumber,
    formatDate(line.serviceDate),
    line.serviceCode,
    line.modifier || "",
    line.units.toFixed(2),
    formatCurrency(line.rate),
    formatCurrency(line.amount),
    line.placeOfService,
    line.diagnosisCode || "",
    line.evvClockIn || "",
    line.evvClockOut || "",
  ]);

  const csvData = [headers, ...rows];
  const csvContent = arrayToCSV(csvData);
  downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
}

/**
 * Export comprehensive claims CSV with Agency, Client, Caregiver, EVV, and Service Line data
 * This is a flat format with one row per service line, including all related data.
 */
export interface ComprehensiveClaimData {
  // Agency/Provider
  agencyLegalName: string;
  agencyAddress: string;
  agencyCity: string;
  agencyState: string;
  agencyZip: string;
  agencyTaxId: string;
  agencyNpi: string;
  agencyTaxonomyCode: string;
  medicaidProviderId: string;
  mcoContractId: string;
  
  // Client/Member
  memberMedicaidId: string;
  clientFirstName: string;
  clientLastName: string;
  clientDob: string;
  clientGender: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientZip: string;
  payerName: string;
  payerType: string;
  payerState: string;
  electronicPayerId: string;
  authorizationNumber: string;
  authorizedUnits: string;
  usedUnits: string;
  authStartDate: string;
  authEndDate: string;
  
  // Caregiver/Rendering
  caregiverFirstName: string;
  caregiverLastName: string;
  caregiverInternalId: string;
  caregiverNpi: string;
  caregiverCredentials: string;
  
  // EVV Visit
  visitId: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualClockIn: string;
  actualClockOut: string;
  gpsLatIn: string;
  gpsLonIn: string;
  gpsLatOut: string;
  gpsLonOut: string;
  gpsDistanceMeters: string;
  arrivalStatus: string;
  verificationStatus: string;
  exceptionNotes: string;
  
  // Claim-Ready Service Lines
  claimNumber: string;
  serviceDate: string;
  hcpcsCptCode: string;
  modifier: string;
  units: string;
  unitType: string;
  rate: string;
  chargeAmount: string;
  diagnosisCode: string;
  placeOfService: string;
  renderingProviderNpi: string;
  visitIdLink: string;
  authorizationIdLink: string;
}

export function exportComprehensiveClaimsCSV(
  data: ComprehensiveClaimData[],
  options?: { filename?: string }
): void {
  const filename = options?.filename ?? `comprehensive_claims_${new Date().toISOString().split("T")[0]}.csv`;

  const headers = [
    // A) Agency/Provider
    "Agency Legal Name",
    "Agency Address",
    "Agency City",
    "Agency State",
    "Agency ZIP",
    "Agency TIN/Tax ID",
    "Agency NPI",
    "Agency Taxonomy Code",
    "Medicaid Provider ID",
    "MCO Contract ID",
    
    // B) Client/Member
    "Member/Medicaid ID",
    "Client First Name",
    "Client Last Name",
    "Client DOB",
    "Client Gender",
    "Client Address",
    "Client City",
    "Client State",
    "Client ZIP",
    "Payer Name",
    "Payer Type",
    "Payer State",
    "Electronic Payer ID",
    "Authorization Number",
    "Authorized Units",
    "Used Units",
    "Auth Start Date",
    "Auth End Date",
    
    // C) Caregiver/Rendering
    "Caregiver First Name",
    "Caregiver Last Name",
    "Caregiver Internal ID",
    "Caregiver NPI",
    "Caregiver Credentials",
    
    // D) EVV Visit
    "Visit ID",
    "Scheduled Start",
    "Scheduled End",
    "Actual Clock In",
    "Actual Clock Out",
    "GPS Lat In",
    "GPS Lon In",
    "GPS Lat Out",
    "GPS Lon Out",
    "GPS Distance (m)",
    "Arrival Status",
    "Verification Status",
    "Exception/Attestation Notes",
    
    // E) Claim-Ready Service Lines
    "Claim Number",
    "Service Date",
    "HCPCS/CPT Code",
    "Modifier",
    "Units",
    "Unit Type",
    "Rate",
    "Charge Amount",
    "Diagnosis Code",
    "Place of Service",
    "Rendering Provider NPI",
    "Visit ID Link",
    "Authorization ID Link",
  ];

  const rows = data.map((row) => [
    // A) Agency/Provider
    row.agencyLegalName,
    row.agencyAddress,
    row.agencyCity,
    row.agencyState,
    row.agencyZip,
    row.agencyTaxId,
    row.agencyNpi,
    row.agencyTaxonomyCode,
    row.medicaidProviderId,
    row.mcoContractId,
    
    // B) Client/Member
    row.memberMedicaidId,
    row.clientFirstName,
    row.clientLastName,
    row.clientDob,
    row.clientGender,
    row.clientAddress,
    row.clientCity,
    row.clientState,
    row.clientZip,
    row.payerName,
    row.payerType,
    row.payerState,
    row.electronicPayerId,
    row.authorizationNumber,
    row.authorizedUnits,
    row.usedUnits,
    row.authStartDate,
    row.authEndDate,
    
    // C) Caregiver/Rendering
    row.caregiverFirstName,
    row.caregiverLastName,
    row.caregiverInternalId,
    row.caregiverNpi,
    row.caregiverCredentials,
    
    // D) EVV Visit
    row.visitId,
    row.scheduledStart,
    row.scheduledEnd,
    row.actualClockIn,
    row.actualClockOut,
    row.gpsLatIn,
    row.gpsLonIn,
    row.gpsLatOut,
    row.gpsLonOut,
    row.gpsDistanceMeters,
    row.arrivalStatus,
    row.verificationStatus,
    row.exceptionNotes,
    
    // E) Claim-Ready Service Lines
    row.claimNumber,
    row.serviceDate,
    row.hcpcsCptCode,
    row.modifier,
    row.units,
    row.unitType,
    row.rate,
    row.chargeAmount,
    row.diagnosisCode,
    row.placeOfService,
    row.renderingProviderNpi,
    row.visitIdLink,
    row.authorizationIdLink,
  ]);

  const csvData = [headers, ...rows];
  const csvContent = arrayToCSV(csvData);
  downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
}

// =============================================================================
// Excel Exports
// =============================================================================

/**
 * Export claims to Excel with multiple sheets (summary + line items)
 */
export async function exportClaimsToExcel(
  claims: Array<
    BillingClaimApi & {
      client?: { first_name: string; last_name: string };
      payer?: { name: string; state: string | null };
      lines?: BillingClaimLineApi[];
    }
  >,
  options?: {
    filename?: string;
    includeLineItems?: boolean;
    includeEVVData?: boolean;
  }
): Promise<void> {
  const XLSX = await import("xlsx");
  const filename = options?.filename ?? `claims_${new Date().toISOString().split("T")[0]}.xlsx`;
  const includeLineItems = options?.includeLineItems ?? true;
  const includeEVVData = options?.includeEVVData ?? true;

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Claims Summary
  const summaryHeaders = [
    "Claim Number",
    "Client",
    "Payer",
    "State",
    "Billing Period Start",
    "Billing Period End",
    "Total Amount",
    "Paid Amount",
    "Balance",
    "Status",
    "Submission Date",
    "Response Date",
    "Filing Deadline",
    "Rejection Reason",
  ];

  const summaryRows = claims.map((claim) => ({
    "Claim Number": claim.claimNumber,
    "Client": claim.client ? `${claim.client.first_name} ${claim.client.last_name}` : "",
    "Payer": claim.payer?.name || "",
    "State": claim.payer?.state || "",
    "Billing Period Start": formatDate(claim.billingPeriodStart),
    "Billing Period End": formatDate(claim.billingPeriodEnd),
    "Total Amount": claim.totalAmount,
    "Paid Amount": claim.paidAmount,
    "Balance": claim.totalAmount - claim.paidAmount,
    "Status": claim.status,
    "Submission Date": claim.submissionDate ? formatDate(claim.submissionDate) : "",
    "Response Date": claim.responseDate ? formatDate(claim.responseDate) : "",
    "Filing Deadline": claim.filingDeadline ? formatDate(claim.filingDeadline) : "",
    "Rejection Reason": claim.rejectionReason || "",
  }));

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  
  // Auto-size columns
  const summaryColWidths = summaryHeaders.map((header) => ({ wch: Math.max(header.length, 15) }));
  summarySheet["!cols"] = summaryColWidths;
  
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Claims Summary");

  // Sheet 2: Line Items (if requested)
  if (includeLineItems) {
    const lineItemHeaders = [
      "Claim Number",
      "Service Date",
      "Procedure Code",
      "Modifier",
      "Units",
      "Rate",
      "Amount",
      "Place of Service",
      "Diagnosis Code",
      ...(includeEVVData ? ["EVV Clock In", "EVV Clock Out", "EVV Lat In", "EVV Lon In", "EVV Lat Out", "EVV Lon Out"] : []),
    ];

    const lineItemRows = claims.flatMap((claim) =>
      (claim.lines || []).map((line) => ({
        "Claim Number": claim.claimNumber,
        "Service Date": formatDate(line.serviceDate),
        "Procedure Code": line.serviceCode,
        "Modifier": line.modifier || "",
        "Units": line.units,
        "Rate": line.rate,
        "Amount": line.amount,
        "Place of Service": line.placeOfService,
        "Diagnosis Code": line.diagnosisCode || "",
        ...(includeEVVData && {
          "EVV Clock In": line.evvClockIn || "",
          "EVV Clock Out": line.evvClockOut || "",
          "EVV Lat In": line.evvGpsLatIn?.toString() || "",
          "EVV Lon In": line.evvGpsLonIn?.toString() || "",
          "EVV Lat Out": line.evvGpsLatOut?.toString() || "",
          "EVV Lon Out": line.evvGpsLonOut?.toString() || "",
        }),
      }))
    );

    if (lineItemRows.length > 0) {
      const lineItemSheet = XLSX.utils.json_to_sheet(lineItemRows);
      const lineItemColWidths = lineItemHeaders.map((header) => ({ wch: Math.max(header.length, 12) }));
      lineItemSheet["!cols"] = lineItemColWidths;
      XLSX.utils.book_append_sheet(workbook, lineItemSheet, "Line Items");
    }
  }

  // Generate Excel file and trigger download
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export invoices to Excel with multiple sheets
 */
export async function exportInvoicesToExcel(
  invoices: Array<
    BillingInvoiceApi & {
      client?: { first_name: string; last_name: string };
      lines?: BillingInvoiceLineApi[];
    }
  >,
  options?: {
    filename?: string;
    includeLineItems?: boolean;
  }
): Promise<void> {
  const XLSX = await import("xlsx");
  const filename = options?.filename ?? `invoices_${new Date().toISOString().split("T")[0]}.xlsx`;
  const includeLineItems = options?.includeLineItems ?? true;

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Invoices Summary
  const summaryRows = invoices.map((inv) => ({
    "Invoice Number": inv.invoiceNumber,
    "Client": inv.client ? `${inv.client.first_name} ${inv.client.last_name}` : "",
    "Billing Period Start": formatDate(inv.billingPeriodStart),
    "Billing Period End": formatDate(inv.billingPeriodEnd),
    "Subtotal": inv.subtotal,
    "Tax": inv.tax,
    "Total": inv.total,
    "Paid": inv.paid,
    "Balance": inv.balance,
    "Status": inv.status,
    "Due Date": inv.dueDate ? formatDate(inv.dueDate) : "",
    "Sent Date": inv.sentDate ? formatDate(inv.sentDate) : "",
  }));

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet["!cols"] = Array(12).fill({ wch: 15 });
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Invoices");

  // Sheet 2: Line Items
  if (includeLineItems) {
    const lineItemRows = invoices.flatMap((inv) =>
      (inv.lines || []).map((line) => ({
        "Invoice Number": inv.invoiceNumber,
        "Service Date": formatDate(line.serviceDate),
        "Description": line.description,
        "Units": line.units,
        "Rate": line.rate,
        "Amount": line.amount,
      }))
    );

    if (lineItemRows.length > 0) {
      const lineItemSheet = XLSX.utils.json_to_sheet(lineItemRows);
      lineItemSheet["!cols"] = Array(6).fill({ wch: 15 });
      XLSX.utils.book_append_sheet(workbook, lineItemSheet, "Line Items");
    }
  }

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


/**
 * Export billing summary CSV (aggregated data)
 */
export function exportBillingSummaryToCSV(
  summary: {
    period: string;
    totalInvoices: number;
    totalInvoiceAmount: number;
    totalClaims: number;
    totalClaimAmount: number;
    totalReceived: number;
    outstanding: number;
  },
  options?: { filename?: string }
): void {
  const filename = options?.filename ?? `billing_summary_${new Date().toISOString().split("T")[0]}.csv`;

  const headers = [
    "Period",
    "Total Invoices",
    "Invoice Amount",
    "Total Claims",
    "Claim Amount",
    "Total Received",
    "Outstanding",
  ];

  const rows = [
    [
      summary.period,
      summary.totalInvoices.toString(),
      formatCurrency(summary.totalInvoiceAmount),
      summary.totalClaims.toString(),
      formatCurrency(summary.totalClaimAmount),
      formatCurrency(summary.totalReceived),
      formatCurrency(summary.outstanding),
    ],
  ];

  const csvData = [headers, ...rows];
  const csvContent = arrayToCSV(csvData);
  downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
}

// =============================================================================
// Clearinghouse-Compatible Exports
// =============================================================================

/**
 * Export claims in clearinghouse-compatible CSV format
 * This format is designed for manual upload to clearinghouses like:
 * - Change Healthcare
 * - Availity
 * - Office Ally
 * - Waystar
 */
export function exportClaimsForClearinghouse(
  claims: Array<
    BillingClaimApi & {
      client?: {
        first_name: string;
        last_name: string;
        date_of_birth: string;
        address: {
          street: string;
          city: string;
          state: string;
          zip: string;
        };
      };
      payer?: {
        name: string;
        electronic_payer_id: string | null;
        state: string | null;
      };
      lines: BillingClaimLineApi[];
    }
  >,
  providerConfig: {
    providerName: string;
    npi: string;
    taxId: string;
    taxonomyCode: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
  },
  options?: { filename?: string }
): void {
  const filename =
    options?.filename ?? `clearinghouse_claims_${new Date().toISOString().split("T")[0]}.csv`;

  const headers = [
    "Claim Number",
    "Provider NPI",
    "Provider Tax ID",
    "Provider Name",
    "Provider Address",
    "Provider City",
    "Provider State",
    "Provider ZIP",
    "Payer Name",
    "Payer ID",
    "Patient First Name",
    "Patient Last Name",
    "Patient DOB",
    "Member ID",
    "Patient Address",
    "Patient City",
    "Patient State",
    "Patient ZIP",
    "Service Date",
    "Procedure Code",
    "Modifier",
    "Units",
    "Charge Amount",
    "Diagnosis Code",
    "Place of Service",
    "EVV Clock In",
    "EVV Clock Out",
    "EVV Latitude",
    "EVV Longitude",
  ];

  const rows = claims.flatMap((claim) =>
    claim.lines.map((line) => [
      claim.claimNumber,
      providerConfig.npi,
      providerConfig.taxId,
      providerConfig.providerName,
      providerConfig.address.street,
      providerConfig.address.city,
      providerConfig.address.state,
      providerConfig.address.zip,
      claim.payer?.name || "",
      claim.payer?.electronic_payer_id || "",
      claim.client?.first_name || "",
      claim.client?.last_name || "",
      claim.client?.date_of_birth ? formatDate(claim.client.date_of_birth) : "",
      "", // Member ID - would come from client_payer_assignment
      claim.client?.address.street || "",
      claim.client?.address.city || "",
      claim.client?.address.state || "",
      claim.client?.address.zip || "",
      formatDate(line.serviceDate),
      line.serviceCode,
      line.modifier || "",
      line.units.toFixed(2),
      formatCurrency(line.amount),
      line.diagnosisCode || "",
      line.placeOfService,
      line.evvClockIn || "",
      line.evvClockOut || "",
      (line as any).evvLatitude?.toString() || "",
      (line as any).evvLongitude?.toString() || "",
    ])
  );

  const csvData = [headers, ...rows];
  const csvContent = arrayToCSV(csvData);
  downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
}


// =============================================================================
// Enhanced Export Options
// =============================================================================

export type ClaimExportFormat = "csv" | "excel" | "clearinghouse";

export interface ExportOptions {
  format: ClaimExportFormat;
  filename?: string;
  includeLineItems?: boolean;
  includeEVVData?: boolean;
  selectedClaimsOnly?: boolean;
}

/**
 * Unified export function that handles all formats
 */
export async function exportClaims(
  claims: Array<
    BillingClaimApi & {
      client?: {
        first_name: string;
        last_name: string;
        date_of_birth: string;
        address: {
          street: string;
          city: string;
          state: string;
          zip: string;
        };
      };
      payer?: {
        name: string;
        electronic_payer_id: string | null;
        state: string | null;
      };
      lines?: BillingClaimLineApi[];
    }
  >,
  options: ExportOptions,
  providerConfig?: {
    providerName: string;
    npi: string;
    taxId: string;
    taxonomyCode: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
  }
): Promise<void> {
  if (claims.length === 0) {
    throw new Error("No claims to export");
  }

  const timestamp = new Date().toISOString().split("T")[0];

  switch (options.format) {
    case "csv":
      exportClaimsToCSV(claims, { filename: options.filename });
      break;

    case "excel":
      exportClaimsToExcel(claims, {
        filename: options.filename,
        includeLineItems: options.includeLineItems,
        includeEVVData: options.includeEVVData,
      });
      break;

    case "clearinghouse":
      if (!providerConfig) {
        throw new Error("Provider configuration required for clearinghouse export");
      }
      exportClaimsForClearinghouse(claims as any, providerConfig, {
        filename: options.filename,
      });
      break;

    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
}

/**
 * Export clearinghouse CSV to Excel format (enhanced version)
 */
export async function exportClearinghouseExcel(
  claims: Array<
    BillingClaimApi & {
      client?: {
        first_name: string;
        last_name: string;
        date_of_birth: string;
        address: {
          street: string;
          city: string;
          state: string;
          zip: string;
        };
      };
      payer?: {
        name: string;
        electronic_payer_id: string | null;
        state: string | null;
      };
      lines: BillingClaimLineApi[];
    }
  >,
  providerConfig: {
    providerName: string;
    npi: string;
    taxId: string;
    taxonomyCode: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
  },
  options?: { filename?: string }
): Promise<void> {
  const XLSX = await import("xlsx");
  const filename =
    options?.filename ?? `clearinghouse_claims_${new Date().toISOString().split("T")[0]}.xlsx`;

  const workbook = XLSX.utils.book_new();

  const rows = claims.flatMap((claim) =>
    claim.lines.map((line) => ({
      "Claim Number": claim.claimNumber,
      "Provider NPI": providerConfig.npi,
      "Provider Tax ID": providerConfig.taxId,
      "Provider Name": providerConfig.providerName,
      "Provider Address": providerConfig.address.street,
      "Provider City": providerConfig.address.city,
      "Provider State": providerConfig.address.state,
      "Provider ZIP": providerConfig.address.zip,
      "Payer Name": claim.payer?.name || "",
      "Payer ID": claim.payer?.electronic_payer_id || "",
      "Patient First Name": claim.client?.first_name || "",
      "Patient Last Name": claim.client?.last_name || "",
      "Patient DOB": claim.client?.date_of_birth ? formatDate(claim.client.date_of_birth) : "",
      "Member ID": "", // Member ID would come from client_payer_assignment
      "Patient Address": claim.client?.address.street || "",
      "Patient City": claim.client?.address.city || "",
      "Patient State": claim.client?.address.state || "",
      "Patient ZIP": claim.client?.address.zip || "",
      "Service Date": formatDate(line.serviceDate),
      "Procedure Code": line.serviceCode,
      "Modifier": line.modifier || "",
      "Units": line.units,
      "Charge Amount": line.amount,
      "Diagnosis Code": line.diagnosisCode || "",
      "Place of Service": line.placeOfService,
      "EVV Clock In": line.evvClockIn || "",
      "EVV Clock Out": line.evvClockOut || "",
      "EVV Latitude In": line.evvGpsLatIn?.toString() || "",
      "EVV Longitude In": line.evvGpsLonIn?.toString() || "",
      "EVV Latitude Out": line.evvGpsLatOut?.toString() || "",
      "EVV Longitude Out": line.evvGpsLonOut?.toString() || "",
    }))
  );

  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = Array(30).fill({ wch: 15 });
  XLSX.utils.book_append_sheet(workbook, sheet, "Clearinghouse Data");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =============================================================================
// Advanced Export Features
// =============================================================================

/**
 * Export claims as JSON (for backup or data transfer)
 */
export function exportClaimsToJSON(
  claims: Array<BillingClaimApi & { lines?: BillingClaimLineApi[] }>,
  options?: { filename?: string; pretty?: boolean }
): void {
  const filename = options?.filename ?? `claims_${new Date().toISOString().split("T")[0]}.json`;
  const pretty = options?.pretty ?? true;

  const jsonContent = pretty ? JSON.stringify(claims, null, 2) : JSON.stringify(claims);

  downloadFile(jsonContent, filename, "application/json;charset=utf-8;");
}

