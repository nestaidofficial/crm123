// =============================================================================
// Billing Export Types
// =============================================================================
// Type definitions for claim export functionality
// =============================================================================

import type {
  BillingClaimApi,
  BillingClaimLineApi,
  BillingProviderConfigApi,
} from "@/lib/db/billing.mapper";

export type ExportFormat = 
  | "csv" 
  | "excel" 
  | "clearinghouse-csv" 
  | "clearinghouse-excel"
  | "json";

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeLineItems?: boolean;
  includeEVVData?: boolean;
  selectedClaimsOnly?: boolean;
}

export interface ClaimExportData extends BillingClaimApi {
  client?: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    dob?: string;
    gender?: string;
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
    payer_type?: string;
  };
  lines?: BillingClaimLineApi[];
}

export interface ProviderExportConfig {
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

export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  filename: string;
  recordCount: number;
  exportedAt: string;
  error?: string;
}

export interface BulkExportRequest {
  format: ExportFormat;
  claimIds?: string[];
  includeLineItems?: boolean;
  includeEVVData?: boolean;
  filters?: {
    status?: string;
    payerId?: string;
    startDate?: string;
    endDate?: string;
  };
}

export interface BulkExportResponse {
  success: boolean;
  message: string;
  downloadUrl?: string;
  error?: string;
}
