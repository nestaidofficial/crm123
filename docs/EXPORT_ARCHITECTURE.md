# Export System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Claims Dashboard                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  - Filter claims by status, payer, date            │   │
│  │  - View claim list                                  │   │
│  │  - Click "Export Claims" button                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Export Claims Dialog                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Export Preview Card                                │   │
│  │  - Claims count: 25                                 │   │
│  │  - Line items: 150                                  │   │
│  │  - Total amount: $12,500.00                         │   │
│  │  - Date range: Jan 1 - Jan 31                       │   │
│  │  - Status breakdown                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Format Selection:                                           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐             │
│  │    CSV     │ │   Excel    │ │ EDI (837P) │             │
│  └────────────┘ └────────────┘ └────────────┘             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐             │
│  │ EDI Batch  │ │  CH CSV    │ │  CH Excel  │             │
│  └────────────┘ └────────────┘ └────────────┘             │
│                                                              │
│  Options:                                                    │
│  ☑ Include line items                                       │
│  ☑ Include EVV data                                         │
│                                                              │
│  [Cancel]                          [Export 25 Claims]       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Export Functions                          │
│             (lib/billing/exports.ts)                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
                ┌───────────┴───────────┐
                ↓                       ↓
┌───────────────────────┐   ┌───────────────────────┐
│   Client-Side Export  │   │  Server-Side Export   │
│   (Browser Memory)    │   │  (API Endpoint)       │
└───────────────────────┘   └───────────────────────┘
                ↓                       ↓
        ┌───────┴───────┐       ┌──────┴──────┐
        ↓               ↓       ↓             ↓
    Format          Generate   Query DB    Format
    Data            Blob       Data        Response
        ↓               ↓       ↓             ↓
    Create          Trigger    Stream       File
    Blob            Download   File         Download
```

## Component Architecture

### Layer 1: UI Components

```
ExportClaimsDialog
├── ExportPreviewCard (statistics)
├── RadioGroup (format selection)
├── Checkbox (options)
└── Button (export action)
```

### Layer 2: Export Functions

```
lib/billing/exports.ts
├── CSV Exports
│   ├── exportClaimsToCSV()
│   ├── exportInvoiceLinesToCSV()
│   └── exportClaimsForClearinghouse()
│
├── Excel Exports
│   ├── exportClaimsToExcel()
│   ├── exportInvoicesToExcel()
│   └── exportClearinghouseExcel()
│
├── EDI Exports
│   ├── download837PEDI()
│   ├── downloadBatch837PEDI()
│   └── downloadCombinedEDI()
│
└── JSON Export
    └── exportClaimsToJSON()
```

### Layer 3: Data Sources

```
Claims Dashboard
    ↓
Claims State (filtered)
    ↓
API Routes (/api/billing/claims)
    ↓
Supabase Database
    ├── billing_claims
    ├── billing_claim_lines
    ├── clients
    ├── billing_payers
    └── billing_provider_config
```

## Data Flow

### Client-Side Export Flow

```
User Action
    ↓
ExportClaimsDialog
    ↓
Format Selection & Options
    ↓
Export Function Called
    ↓
Data Transformation
    ├── CSV: Array → CSV String
    ├── Excel: Array → XLSX Workbook
    └── EDI: String → X12 File
    ↓
Blob Creation
    ↓
URL.createObjectURL()
    ↓
DOM Link Element
    ↓
link.click()
    ↓
Browser Download
    ↓
Cleanup (URL.revokeObjectURL)
```

### Server-Side Export Flow

```
API Request
    ↓
POST /api/billing/claims/export
    ↓
Parse Request Body
    ↓
Build Database Query
    ├── Apply filters
    ├── Include relations
    └── Order results
    ↓
Execute Query
    ↓
Fetch Related Data
    ├── Claim lines
    ├── Client info
    └── Payer info
    ↓
Format Data
    ├── CSV: Array → CSV String
    ├── Excel: Array → XLSX Buffer
    └── JSON: Object → JSON String
    ↓
Create Response
    ├── Set Content-Type
    ├── Set Content-Disposition
    └── Stream body
    ↓
Client Receives File
```

## Format Decision Tree

```
What format should I use?
    │
    ├─ Need electronic submission?
    │  └─ YES → EDI (837P)
    │      ├─ Single claim? → EDI Individual
    │      └─ Multiple claims? → EDI Combined
    │
    ├─ Need clearinghouse upload?
    │  └─ YES → Clearinghouse Format
    │      ├─ Portal requires CSV? → Clearinghouse CSV
    │      └─ Want to review first? → Clearinghouse Excel
    │
    ├─ Need multi-sheet report?
    │  └─ YES → Excel
    │      ├─ Include line items? → Yes (default)
    │      └─ Include EVV data? → Yes (default)
    │
    ├─ Need simple spreadsheet?
    │  └─ YES → CSV
    │
    └─ Need data backup?
       └─ YES → JSON
```

## State Management

### Export Dialog State

```typescript
// Dialog state
const [open, setOpen] = useState(false)

// Format selection
const [exportFormat, setExportFormat] = useState<ExportFormat>("excel")

// Options
const [includeLineItems, setIncludeLineItems] = useState(true)
const [includeEVVData, setIncludeEVVData] = useState(true)

// Loading
const [exporting, setExporting] = useState(false)
```

### Claims Dashboard State

```typescript
// All claims from API
const [claims, setClaims] = useState<ClaimWithRelations[]>([])

// Filters
const [searchQuery, setSearchQuery] = useState("")
const [statusFilter, setStatusFilter] = useState<string>("all")

// Computed
const filteredClaims = useMemo(() => 
  claims.filter(/* filter logic */),
  [claims, searchQuery, statusFilter]
)

// Export dialog
const [exportDialogOpen, setExportDialogOpen] = useState(false)
```

## Data Models

### Claim with Relations

```typescript
interface ClaimWithRelations extends BillingClaimApi {
  client?: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    address: Address;
  };
  payer?: {
    name: string;
    electronic_payer_id: string | null;
    state: string | null;
  };
  lines?: BillingClaimLineApi[];
}
```

### Export Preview Data

```typescript
interface PreviewData {
  claimCount: number;
  lineItemCount: number;
  totalAmount: number;
  paidAmount: number;
  dateRange: { start: Date; end: Date };
  statusBreakdown: Record<string, number>;
  ediAvailable: number;
}
```

## Security Considerations

### Data Protection
- ✅ PHI (Protected Health Information) in exports
- ✅ Secure download (no server storage)
- ✅ Blob URLs revoked after download
- ✅ API requires authentication
- ✅ No sensitive data in logs

### Access Control
- User must be authenticated
- Claims filtered by user permissions
- Provider config access controlled
- API endpoints protected

## Performance Characteristics

### Client-Side Performance

| Claims | Format | Time | Memory |
|--------|--------|------|--------|
| 10 | CSV | <0.1s | <1MB |
| 10 | Excel | <0.5s | <2MB |
| 10 | EDI | <0.1s | <1MB |
| 100 | CSV | <0.5s | <5MB |
| 100 | Excel | <2s | <10MB |
| 100 | EDI | <1s | <5MB |
| 1000 | CSV | ~5s | ~50MB |
| 1000 | Excel | ~15s | ~100MB |

### Server-Side Performance

| Claims | Format | Time | Transfer |
|--------|--------|------|----------|
| 1000 | CSV | ~2s | ~500KB |
| 1000 | Excel | ~5s | ~1MB |
| 5000 | CSV | ~8s | ~2MB |
| 5000 | Excel | ~20s | ~5MB |

## Scalability

### Current Limits
- Client-side: Recommended <2000 claims
- Server-side: No hard limit (database limited)

### Optimization Strategies
1. Use server-side for >1000 claims
2. Paginate exports if needed
3. Export by date range
4. Filter before export

## Monitoring & Observability

### Metrics to Track (Future)
- Export count by format
- Average export time
- Error rate by format
- Most used formats
- File sizes

### Logging
- Export initiated
- Format selected
- Options chosen
- Success/failure
- Error details

## Dependencies

### Runtime Dependencies
- `xlsx` - Excel file generation
- `@radix-ui/react-radio-group` - UI component

### Type Dependencies
- `@types/node` - Node.js types

### Peer Dependencies
- `next` - Framework
- `react` - UI library
- `lucide-react` - Icons

## Browser Compatibility

### Supported Browsers
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Required Features
- Blob API
- URL.createObjectURL
- Download attribute
- Fetch API

## Maintenance

### Regular Tasks
- Monitor export success rates
- Review error logs
- Update clearinghouse formats
- Test with new browsers
- Validate EDI compliance

### When to Update
- Clearinghouse format changes
- HIPAA specification updates
- State requirements change
- New export formats requested
- Performance issues identified

---

## Contact

For technical questions about this implementation:
- Review code in `lib/billing/exports.ts`
- Check components in `components/billing/`
- See API routes in `app/api/billing/claims/`
- Read type definitions in `lib/billing/export-types.ts`
