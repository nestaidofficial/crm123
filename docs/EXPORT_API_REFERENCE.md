# Export API Reference

## Quick Start

### Client-Side Export

```typescript
import { exportClaimsToExcel } from "@/lib/billing/exports";

// Export claims to Excel
exportClaimsToExcel(claims, {
  filename: "my_claims.xlsx",
  includeLineItems: true,
  includeEVVData: true,
});
```

### Using Export Dialog Component

```typescript
import { ExportClaimsDialog } from "@/components/billing/export-claims-dialog";

function MyComponent() {
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setExportOpen(true)}>
        Export Claims
      </Button>
      
      <ExportClaimsDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        claims={claims}
        selectedClaimIds={selectedIds}
      />
    </>
  );
}
```

### Server-Side Export (API)

```typescript
// POST /api/billing/claims/export
const response = await fetch("/api/billing/claims/export", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    format: "excel",
    includeLineItems: true,
    includeEVVData: true,
    filters: {
      status: "submitted",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    },
  }),
});

// Response is file stream
const blob = await response.blob();
const url = URL.createObjectURL(blob);
const link = document.createElement("a");
link.href = url;
link.download = "claims.xlsx";
link.click();
```

## Export Functions

### CSV Exports

#### `exportClaimsToCSV(claims, options?)`

Export claims to CSV format.

**Parameters:**
- `claims`: Array of claim objects with relations
- `options.filename?`: Custom filename (default: `claims_YYYY-MM-DD.csv`)

**Returns:** `void` (triggers browser download)

**Example:**
```typescript
exportClaimsToCSV(claims, {
  filename: "medicaid_claims_feb.csv"
});
```

---

#### `exportClaimsForClearinghouse(claims, providerConfig, options?)`

Export claims in clearinghouse-compatible CSV format.

**Parameters:**
- `claims`: Array of claims with client, payer, and lines
- `providerConfig`: Provider configuration object
- `options.filename?`: Custom filename

**Returns:** `void`

**Example:**
```typescript
exportClaimsForClearinghouse(claims, {
  providerName: "ABC Home Care",
  npi: "1234567890",
  taxId: "12-3456789",
  taxonomyCode: "251E00000X",
  address: { street: "123 Main", city: "Boston", state: "MA", zip: "02101" }
});
```

---

### Excel Exports

#### `exportClaimsToExcel(claims, options?)`

Export claims to Excel workbook with multiple sheets.

**Parameters:**
- `claims`: Array of claims with relations
- `options.filename?`: Custom filename (default: `claims_YYYY-MM-DD.xlsx`)
- `options.includeLineItems?`: Include line items sheet (default: `true`)
- `options.includeEVVData?`: Include EVV columns (default: `true`)

**Returns:** `void`

**Example:**
```typescript
exportClaimsToExcel(claims, {
  filename: "q1_claims.xlsx",
  includeLineItems: true,
  includeEVVData: false,
});
```

**Output Sheets:**
1. **Claims Summary** - Claim-level data
2. **Line Items** - Service-level details (optional)

---

#### `exportInvoicesToExcel(invoices, options?)`

Export invoices to Excel workbook.

**Parameters:**
- `invoices`: Array of invoices with relations
- `options.filename?`: Custom filename
- `options.includeLineItems?`: Include line items sheet

**Returns:** `void`

---

#### `exportClearinghouseExcel(claims, providerConfig, options?)`

Export clearinghouse format as Excel file.

**Parameters:**
- `claims`: Array of claims with full relations
- `providerConfig`: Provider configuration
- `options.filename?`: Custom filename

**Returns:** `void`

**Example:**
```typescript
exportClearinghouseExcel(claimsWithLines, providerConfig, {
  filename: "availity_upload.xlsx"
});
```

---

### EDI Exports

#### `download837PEDI(ediContent, claimNumber, options?)`

Download a single 837P EDI file.

**Parameters:**
- `ediContent`: Raw EDI X12 content
- `claimNumber`: Claim identifier
- `options.filename?`: Custom filename

**Returns:** `void`

**Example:**
```typescript
download837PEDI(
  claim.ediContent,
  claim.claimNumber,
  { filename: "claim_CLM-000123.x12" }
);
```

---

#### `downloadBatch837PEDI(claims, options?)`

Download multiple EDI files (one per claim).

**Parameters:**
- `claims`: Array of `{ claimNumber, edi837pContent }`
- `options.filenamePrefix?`: Prefix for filenames (default: `"batch"`)

**Returns:** `void`

**Example:**
```typescript
downloadBatch837PEDI(
  claims.map(c => ({
    claimNumber: c.claimNumber,
    edi837pContent: c.ediContent,
  })),
  { filenamePrefix: "medicaid_ma" }
);
```

---

#### `downloadCombinedEDI(ediContents, options?)`

Download all claims in a single combined EDI file.

**Parameters:**
- `ediContents`: Array of `{ claimNumber, ediContent }`
- `options.filename?`: Custom filename

**Returns:** `void`

**Example:**
```typescript
downloadCombinedEDI(
  claims.map(c => ({
    claimNumber: c.claimNumber,
    ediContent: c.ediContent!,
  })),
  { filename: "batch_submission.x12" }
);
```

---

### JSON Export

#### `exportClaimsToJSON(claims, options?)`

Export claims as JSON (for backup or API transfer).

**Parameters:**
- `claims`: Array of claims with lines
- `options.filename?`: Custom filename
- `options.pretty?`: Pretty-print JSON (default: `true`)

**Returns:** `void`

**Example:**
```typescript
exportClaimsToJSON(claims, {
  filename: "claims_backup.json",
  pretty: true,
});
```

---

## Type Definitions

### ExportFormat

```typescript
type ExportFormat = 
  | "csv" 
  | "excel" 
  | "edi" 
  | "edi-combined" 
  | "clearinghouse-csv" 
  | "clearinghouse-excel"
  | "json";
```

### ClaimExportData

```typescript
interface ClaimExportData extends BillingClaimApi {
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
```

### ProviderExportConfig

```typescript
interface ProviderExportConfig {
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
```

---

## API Endpoints

### POST /api/billing/claims/export

Server-side bulk export endpoint.

**Request Body:**
```typescript
{
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
```

**Response:**
- File stream with appropriate MIME type
- Content-Disposition header with filename
- Direct download

**Example:**
```bash
curl -X POST http://localhost:3000/api/billing/claims/export \
  -H "Content-Type: application/json" \
  -d '{
    "format": "excel",
    "includeLineItems": true,
    "filters": {
      "status": "submitted"
    }
  }' \
  --output claims.xlsx
```

---

## Components

### ExportClaimsDialog

Main export dialog component.

**Props:**
```typescript
interface ExportClaimsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claims: ClaimWithRelations[];
  selectedClaimIds?: string[];
}
```

**Usage:**
```tsx
<ExportClaimsDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  claims={allClaims}
  selectedClaimIds={selectedIds}
/>
```

---

### ExportPreviewCard

Preview card showing export statistics.

**Props:**
```typescript
interface ExportPreviewCardProps {
  claims: Array<BillingClaimApi & { lines?: any[] }>;
  includeLineItems?: boolean;
  includeEVVData?: boolean;
}
```

**Usage:**
```tsx
<ExportPreviewCard
  claims={claims}
  includeLineItems={true}
  includeEVVData={true}
/>
```

---

## Utility Functions

### formatDate(isoDate: string): string

Format ISO date as YYYY-MM-DD.

### formatCurrency(amount: number): string

Format number as currency string ($X.XX).

### arrayToCSV(data: string[][]): string

Convert 2D array to CSV string with proper escaping.

### downloadFile(content: string, filename: string, mimeType: string): void

Trigger browser download of text content.

---

## Constants

### File Extensions
- CSV: `.csv`
- Excel: `.xlsx`
- EDI: `.x12`
- JSON: `.json`

### MIME Types
- CSV: `text/csv;charset=utf-8;`
- Excel: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- EDI: `text/plain;charset=utf-8;`
- JSON: `application/json;charset=utf-8;`

---

## Error Codes

### Client-Side Errors
- `"No claims to export"` - Empty dataset
- `"Provider configuration not found"` - Missing provider config
- `"No EDI content available"` - Claims not generated

### Server-Side Errors
- `400` - Invalid request or missing provider config
- `404` - No claims found matching criteria
- `500` - Server error during export

---

## Best Practices

### 1. Always validate data before export
```typescript
if (claims.length === 0) {
  toast.error("No claims to export");
  return;
}
```

### 2. Check for required data
```typescript
if (exportFormat === "edi" && !claim.ediContent) {
  toast.error("EDI content not available");
  return;
}
```

### 3. Fetch line items when needed
```typescript
const claimsWithLines = await Promise.all(
  claims.map(async (claim) => {
    if (!claim.lines) {
      const response = await fetch(`/api/billing/claims/${claim.id}`);
      const { data } = await response.json();
      return { ...claim, lines: data.lines };
    }
    return claim;
  })
);
```

### 4. Use appropriate format for use case
- **CSV** - Quick analysis, simple imports
- **Excel** - Professional reports, multiple sheets
- **EDI Individual** - Single claim submission
- **EDI Combined** - Batch submission
- **Clearinghouse** - Portal uploads

### 5. Handle errors gracefully
```typescript
try {
  await handleExport();
  toast.success("Export completed");
} catch (error) {
  console.error("Export failed:", error);
  toast.error("Export failed: " + error.message);
}
```

---

## Testing

### Unit Tests (Future)

```typescript
describe("exportClaimsToCSV", () => {
  it("should generate valid CSV content", () => {
    const claims = [mockClaim1, mockClaim2];
    const result = exportClaimsToCSV(claims);
    expect(result).toContain("Claim Number");
    expect(result).toContain(mockClaim1.claimNumber);
  });
});
```

### Integration Tests (Future)

```typescript
describe("Export API", () => {
  it("should export claims as Excel", async () => {
    const response = await fetch("/api/billing/claims/export", {
      method: "POST",
      body: JSON.stringify({ format: "excel" }),
    });
    
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("spreadsheet");
  });
});
```

---

## Troubleshooting

### Excel file won't open
**Cause:** Corrupted download or browser issue  
**Fix:** Clear browser cache, try again

### EDI validation fails
**Cause:** Missing segments or invalid data  
**Fix:** Regenerate claim, verify provider config

### Clearinghouse export fails
**Cause:** Missing provider configuration  
**Fix:** Set up provider config in Settings → Billing

### Large export times out
**Cause:** Too much data for client-side export  
**Fix:** Use server-side API endpoint instead

---

## Performance Tips

1. **Use server-side API for >1000 claims**
2. **Exclude EVV data if not needed** (reduces file size)
3. **Filter claims before export** (export only what's needed)
4. **Use CSV for fastest exports** (smallest file size)
5. **Use combined EDI for batch** (reduces downloads)

---

## Changelog

### Version 1.0 (2026-02-25)
- ✅ Initial implementation
- ✅ CSV export support
- ✅ Excel multi-sheet export
- ✅ EDI individual and combined
- ✅ Clearinghouse CSV and Excel
- ✅ Export dialog with preview
- ✅ Server-side bulk export API
- ✅ Type definitions
- ✅ Documentation

---

## Support

For issues or questions:
1. Check `CLAIMS_EXPORT_GUIDE.md` for user documentation
2. Review `EXPORT_IMPLEMENTATION_SUMMARY.md` for technical details
3. Examine type definitions in `lib/billing/export-types.ts`
4. Check function implementations in `lib/billing/exports.ts`
