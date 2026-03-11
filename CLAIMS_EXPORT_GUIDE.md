# Claims Export Guide

## Overview

The billing system supports flexible claim export formats to integrate with various downstream billing and claims systems. This guide covers all available export formats and their use cases.

## Available Export Formats

### 1. CSV Export

**File Extension:** `.csv`  
**Use Case:** Basic spreadsheet viewing, data analysis, simple imports

**Features:**
- Clean, human-readable format
- Compatible with Excel, Google Sheets, and other spreadsheet software
- Includes claim summary data
- Optional line item details

**Output:**
- Single CSV file with claim-level data
- Headers: Claim Number, Client, Payer, State, Billing Period, Amounts, Status, Dates

### 2. Excel Export (XLSX)

**File Extension:** `.xlsx`  
**Use Case:** Professional reporting, multi-sheet analysis, formatted data presentation

**Features:**
- Multi-sheet workbook with proper formatting
- Sheet 1: Claims Summary
- Sheet 2: Line Item Details (optional)
- Auto-sized columns for readability
- Includes EVV verification data (optional)

**Export Options:**
- `includeLineItems`: Add separate sheet with service line details
- `includeEVVData`: Include EVV clock-in/out times and GPS coordinates

**Output Structure:**
```
Sheet 1: Claims Summary
- Claim metadata, amounts, status, dates

Sheet 2: Line Items (if enabled)
- Service dates, procedure codes, units, rates
- EVV verification timestamps
- GPS coordinates for compliance
```

### 3. Comprehensive CSV Export

**File Extension:** `.csv`  
**Use Case:** Complete data export for clearinghouse upload or custom processing

**Features:**
- Flattened format with one row per service line
- Includes ALL data: Agency, Client, Caregiver, EVV, and Service Lines
- Contains complete EVV verification data
- Optimized for clearinghouse processing and regulatory compliance

**Data Sections Included:**

**A) Agency / Provider**
- Legal name, address, TIN/Tax ID, NPI, taxonomy
- Medicaid provider IDs / contract IDs (state + MCO if applicable)
- Submitter info

**B) Client / Member**
- Member/Medicaid ID, DOB, address
- Payer (state MMIS or MCO), plan identifiers
- Authorizations (waiver/auth number, approved units, date range)

**C) Caregiver / Rendering**
- Caregiver identifiers (name, internal ID, NPI if applicable)
- Credentials if needed for audits/denials

**D) EVV Visit**
- Scheduled vs actual check-in/out
- GPS/verification artifacts
- Exceptions/attestations/resolution outcome

**E) Claim-ready service lines**
- Service date(s), HCPCS/CPT + modifiers, units
- Rate/charge, diagnosis pointer if needed
- Links back to visit IDs + authorization IDs

### 4. Clearinghouse CSV

**File Extension:** `.csv`  
**Use Case:** Manual upload to clearinghouses that accept CSV format

**Features:**
- Flattened format with one row per service line
- Includes provider, patient, and service details
- Contains EVV verification data

**Data Included:**
- Provider information (NPI, Tax ID, Name, Address)
- Payer information (Name, Electronic Payer ID)
- Patient demographics (Name, DOB, Address, Member ID)
- Service line details (Date, Code, Modifier, Units, Amount)
- EVV compliance data (Clock in/out, GPS coordinates)

### 5. Clearinghouse Excel

**File Extension:** `.xlsx`  
**Use Case:** Excel version of clearinghouse format for review before upload

**Features:**
- Same data as Clearinghouse CSV but in Excel format
- Better for reviewing large batches before submission
- Easier to filter, sort, and validate data
- Can be opened in Excel for manual review/correction

## How to Use

### From Claims Dashboard

1. Navigate to **Billing → Claims**
2. Filter claims as needed (by status, date range, payer)
3. Click **"Export Claims"** button
4. Select your desired export format:
   - CSV - Quick export for spreadsheet viewing
   - Excel - Professional multi-sheet workbook
   - Comprehensive CSV - Complete data for clearinghouse/custom processing
   - Clearinghouse CSV - Simplified flattened format
   - Clearinghouse Excel - Excel version for review
5. Configure options (for CSV/Excel):
   - Include line item details
   - Include EVV verification data
6. Click **"Export"**

### Export Options

**CSV & Excel Exports:**
- ✅ Include line item details - Adds service-level breakdown
- ✅ Include EVV data - Adds clock times and GPS coordinates

**Clearinghouse Exports:**
- Requires provider configuration to be set up
- Automatically fetches line items for all selected claims

## File Naming Convention

All exports follow a consistent naming pattern:

```
{type}_{identifier}_{YYYY-MM-DD}.{ext}

Examples:
- claims_2026-02-25.csv
- claims_2026-02-25.xlsx
- comprehensive_claims_2026-02-25.csv
- clearinghouse_2026-02-25.xlsx
```

## Technical Details

### CSV Format Specifications

- Character encoding: UTF-8
- Delimiter: Comma (`,`)
- Quote character: Double quote (`"`)
- Escaping: Embedded quotes doubled (`""`)
- Line terminator: LF (`\n`)
- Currency format: `$X.XX` (two decimal places)
- Date format: `YYYY-MM-DD`

### Excel Format Specifications

- Format: Office Open XML Workbook (`.xlsx`)
- Sheet names: "Claims Summary", "Line Items"
- Column widths: Auto-sized (minimum 12-15 characters)
- Data types: Preserved (numbers, dates, text)
- Currency values: Numeric (not formatted strings)

## Provider Configuration Requirements

Some exports require provider configuration:

**Required for:**
- Clearinghouse CSV
- Clearinghouse Excel
- Comprehensive CSV

**Required Fields:**
- Provider Name
- NPI (National Provider Identifier)
- Tax ID (EIN)
- Taxonomy Code
- Billing Address
- State Provider IDs (for multi-state operations)

**Setup:**
Navigate to **Settings → Billing → Provider Configuration**

## State-Specific Requirements

### Medicaid Claims

Different states may have specific requirements:

**Massachusetts:**
- Use taxonomy code: 251E00000X (Home Health)
- Place of Service: 12 (Home)
- Member ID format: 11 digits

**New York:**
- eMedNY clearinghouse required
- Additional state-specific modifiers may apply

**Pennsylvania:**
- PROMISe portal for submission
- Specific diagnosis code requirements

## Best Practices

### Before Export

1. ✅ Verify provider configuration is complete
2. ✅ Ensure claims are in correct status (usually "generated" or "ready")
3. ✅ Review claim data for completeness
4. ✅ Confirm EVV data is present (for Medicaid)

### Quality Checks

**CSV/Excel Exports:**
- Review for missing data
- Verify amounts match expected totals
- Check date ranges are correct

**Clearinghouse Exports:**
- Confirm Member IDs are present
- Verify provider address is complete
- Check all required fields are populated

### Error Handling

**"Provider configuration not found"**
- Navigate to Settings → Billing → Provider Configuration
- Complete all required fields
- Save configuration

**"No claims found"**
- Adjust your filters (date range, status, payer)
- Ensure claims have been generated

**"Export failed"**
- Check browser console for detailed error
- Verify claims have all required data
- Ensure provider config is complete

## Integration Examples

### Import into Accounting Software

**QuickBooks:**
1. Export as Excel
2. Open in Excel/Sheets
3. Save as CSV
4. Import to QuickBooks using CSV import

**Sage:**
1. Export as Clearinghouse CSV
2. Map columns to Sage fields
3. Import using Sage CSV template

### Submit to Clearinghouse

**Availity:**
1. Export as Clearinghouse Excel
2. Login to Availity portal
3. Drag and drop Excel file
4. Review validation results
5. Confirm submission

**Office Ally:**
1. Export as Comprehensive CSV
2. Login to Office Ally portal
3. Upload CSV file
4. Review validation
5. Submit batch

## Troubleshooting

### Excel File Won't Open

**Cause:** Browser blocked download or file corrupted  
**Solution:** Try exporting again, check browser download settings

### CSV Opens with Garbled Text

**Cause:** Encoding mismatch  
**Solution:** 
- Open with UTF-8 encoding
- Use Excel "Get Data" → From Text/CSV
- Select UTF-8 encoding option

### Missing EVV Data

**Cause:** EVV clock-in/out not captured  
**Solution:**
- Ensure caregivers clock in/out via mobile app
- Verify GPS permissions enabled
- Check EVV visits are approved

## Future Enhancements

Coming soon:
- ✨ Custom clearinghouse templates
- ✨ State-specific format options
- ✨ Scheduled automated exports
- ✨ Direct API integration with clearinghouses
- ✨ Export templates and presets

## Support

For questions or issues with exports:
1. Check this guide first
2. Review claim data completeness
3. Verify provider configuration
4. Check browser console for errors

## Technical Reference

### Export Functions (developers)

```typescript
// CSV exports
exportClaimsToCSV(claims, { filename: 'custom.csv' })
exportClaimsForClearinghouse(claims, providerConfig)
exportComprehensiveClaimsCSV(data, { filename: 'comprehensive.csv' })

// Excel exports
exportClaimsToExcel(claims, { includeLineItems: true, includeEVVData: true })
exportClearinghouseExcel(claims, providerConfig)

// JSON backup
exportClaimsToJSON(claims, { pretty: true })
```

### Data Types

See `/lib/db/billing.mapper.ts` for complete type definitions:
- `BillingClaimApi`
- `BillingClaimLineApi`
- `BillingProviderConfigApi`
- `ComprehensiveClaimData` (for comprehensive CSV export)
