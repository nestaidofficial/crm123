# Medicaid Billing: Hybrid Approach Implementation Guide

## Overview

NessaCRM now includes a **complete Hybrid Approach** for Medicaid 837P billing. This approach gives you maximum flexibility by:
- ✅ Generating full 837P EDI files in-house (no third-party dependency)
- ✅ Exporting clearinghouse-compatible CSV files for manual upload
- ✅ Providing batch claim generation from approved timesheets
- ✅ Tracking claim status and payments

You maintain full control while having the option to integrate with clearinghouses later.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     NessaCRM Billing Flow                       │
└─────────────────────────────────────────────────────────────────┘

   Schedule Event → EVV Visit → Timesheet Approval
                                        ↓
                            ┌──────────────────────┐
                            │  Claims Generation   │
                            │  Wizard (Batch Mode) │
                            └──────────────────────┘
                                        ↓
                         ┌─────────────────────────────┐
                         │   837P EDI Generator        │
                         │   (In-House, ANSI X12N)     │
                         └─────────────────────────────┘
                                        ↓
                ┌───────────────────────┴────────────────────────┐
                ↓                                                ↓
      ┌─────────────────────┐                      ┌──────────────────────┐
      │  Download .x12 EDI  │                      │  Export CSV for      │
      │  Files Individually │                      │  Clearinghouse       │
      └─────────────────────┘                      └──────────────────────┘
                ↓                                                ↓
      ┌─────────────────────┐                      ┌──────────────────────┐
      │ Upload to           │                      │ Upload to            │
      │ Clearinghouse       │                      │ Clearinghouse        │
      │ Portal Manually     │                      │ Portal Manually      │
      └─────────────────────┘                      └──────────────────────┘
                ↓                                                ↓
      ┌──────────────────────────────────────────────────────────────┐
      │         Track Status & Record Payments in NessaCRM           │
      └──────────────────────────────────────────────────────────────┘
```

---

## Features Included

### 1. **Batch Claim Generation Wizard** ✅
- **4-step guided workflow**:
  1. Select date range and Medicaid clients
  2. Validate timesheets and client data
  3. Preview claim summary
  4. Generate claims with embedded EVV

- **Automatic validation**:
  - Checks for missing Member IDs
  - Verifies approved timesheets exist
  - Validates service rates
  - Prevents claims with errors

- **Location**: `/billing/claims` → "Generate New Claims" tab

### 2. **837P EDI File Generation** ✅
- **Full ANSI X12N 5010A1 compliance**
- **Embedded EVV data** (GPS coordinates, clock-in/out times)
- **Automatic formatting** with proper segment separators
- **Individual file downloads** for each claim

### 3. **Clearinghouse CSV Export** ✅
- **One-click export** of all claims in clearinghouse format
- **Includes all required fields**:
  - Provider NPI, Tax ID, address
  - Payer electronic ID
  - Patient demographics and Member ID
  - Service codes, modifiers, units
  - EVV data (clock times, GPS)

- **Compatible with**:
  - Change Healthcare
  - Availity
  - Office Ally
  - Waystar
  - Most major clearinghouses

### 4. **Claims Dashboard** ✅
- **Status tracking**:
  - Draft → Submitted → Paid → Denied
- **Bulk operations**:
  - Export multiple claims to CSV
  - Download batch EDI files
  - Filter by status, client, payer
- **Payment recording**:
  - Record ERA/835 payments
  - Automatic claim status updates
  - Balance tracking

### 5. **Export Options** ✅
- **Standard CSV**: For reporting and analysis
- **Clearinghouse CSV**: For manual clearinghouse upload
- **Individual EDI files**: Download .x12 files one at a time
- **Batch EDI download**: Get all EDI files for selected claims

---

## Step-by-Step Workflow

### **Step 1: Setup (One-Time)**

#### A. Configure Provider Information
1. Go to **Settings → Billing Settings** (`/settings/billing`)
2. Enter:
   - Provider NPI
   - Tax ID (EIN)
   - Taxonomy Code
   - State Medicaid IDs (JSON format)
   - EDI submitter/receiver IDs

#### B. Assign Medicaid to Clients
1. Go to **Clients** → Select a client
2. Click **Insurance & Billing** tab
3. Click **Add Payer**
4. Select Medicaid program (e.g., "Massachusetts Medicaid")
5. Enter **Member ID**
6. Add **Authorization** (if required)

---

### **Step 2: Deliver Care & Approve Timesheets**

1. **Schedule shifts** in the Schedule module
2. **Caregivers clock in/out** via EVV
3. **Approve timesheets** at `/evv/timesheets`

---

### **Step 3: Generate Claims**

#### Navigate to Claims Generation
1. Go to **Billing** in sidebar
2. Click **Medicaid Claims** button (or go directly to `/billing/claims`)
3. Click **Generate New Claims** tab

#### Use the 4-Step Wizard

**Step 1: Select Clients & Date Range**
- Pick billing period (start/end dates)
- Select Medicaid clients (checkboxes)
- Click **Next**

**Step 2: Validation**
- System checks for:
  - Missing Member IDs → Fix in client insurance tab
  - Missing service rates → Fix in employee profile
  - No approved timesheets → Approve shifts first
- Errors must be fixed; warnings are informational
- Click **Next**

**Step 3: Preview**
- Review summary:
  - Total claims
  - Total units
  - Total amount
- Click **Generate Claims**

**Step 4: Results**
- View all generated claims
- Download EDI files individually or in batch
- Click **Download All EDI Files** for batch download

---

### **Step 4: Submit to Clearinghouse**

#### Option A: EDI File Upload (Recommended)

1. **Download EDI files** from wizard results
2. **Log into your clearinghouse** (Change Healthcare, Availity, etc.)
3. **Upload .x12 files** to clearinghouse portal
4. **Receive acknowledgment** (997/999)
5. **Track claim** in clearinghouse dashboard

#### Option B: CSV Upload (If EDI Not Supported)

1. Go to **Manage Claims** tab
2. Click **Export for Clearinghouse**
3. **Upload CSV** to clearinghouse portal
4. Clearinghouse converts to EDI and submits

---

### **Step 5: Track Claims**

1. Go to **Billing → Medicaid Claims → Manage Claims** tab
2. **Filter claims** by status:
   - Draft (just created)
   - Submitted (sent to clearinghouse)
   - Paid (payment received)
   - Denied (rejected by Medicaid)

3. **Update claim status manually**:
   - Click **⋮** (three dots) on a claim
   - Select "Mark as Submitted" after uploading to clearinghouse

---

### **Step 6: Record Payments**

#### When ERA/835 Arrives

1. **Find the claim** in Manage Claims tab
2. Click **⋮** (three dots) → **Record Payment**
3. Enter:
   - Payment amount
   - ERA/835 reference number
4. Click **Record Payment**

**System automatically**:
- Updates claim status to "Paid"
- Records paid amount
- Calculates balance (should be $0 if paid in full)

---

## Key Files & Components

### Frontend Components
- `/components/billing/generate-claims-wizard.tsx` - 4-step batch generation wizard
- `/components/billing/claims-dashboard.tsx` - Claim tracking and management
- `/app/(app)/billing/claims/page.tsx` - Main claims page

### Backend APIs
- `/app/api/billing/claims/route.ts` - GET (list claims), POST (create claim)
- `/app/api/billing/claims/[id]/route.ts` - GET, PATCH (update), DELETE
- `/app/api/billing/payments/route.ts` - POST (record payment)

### Core Logic
- `/lib/billing/edi-837p.ts` - 837P EDI generator (ANSI X12N 5010A1)
- `/lib/billing/exports.ts` - CSV and EDI export functions

### Database
- `billing_claims` - Claim records
- `billing_claim_lines` - Service line items
- `billing_payments` - Payment tracking

---

## Export Format Examples

### Standard CSV Export
```csv
Claim Number,Client,Payer,State,Billing Period,Total Amount,Paid Amount,Status,Submission Date,Filing Deadline
CLM-000123,John Doe,Massachusetts Medicaid,MA,2024-02-01 - 2024-02-28,$1040.00,$0.00,draft,,2024-08-01
```

### Clearinghouse CSV Export
```csv
Claim Number,Provider NPI,Provider Tax ID,Provider Name,Provider Address,Provider City,Provider State,Provider ZIP,Payer Name,Payer ID,Patient First Name,Patient Last Name,Patient DOB,Member ID,Patient Address,Patient City,Patient State,Patient ZIP,Service Date,Procedure Code,Modifier,Units,Charge Amount,Diagnosis Code,Place of Service,EVV Clock In,EVV Clock Out,EVV Latitude,EVV Longitude
CLM-000123,1234567890,12-3456789,Acme Home Care,123 Main St,Boston,MA,02101,Massachusetts Medicaid,42008,John,Doe,1960-05-15,MCD123456,456 Oak St,Cambridge,MA,02139,2024-02-15,T1019,U1,16.00,$104.00,Z74.1,12,2024-02-15T08:00:00Z,2024-02-15T12:00:00Z,42.3601,-71.0589
```

### 837P EDI File (.x12)
```
ISA*00*          *00*          *ZZ*SENDER123      *ZZ*RECEIVER456    *240215*0800*^*00501*000000001*0*P*:~
GS*HC*SENDER123*RECEIVER456*20240215*0800*1*X*005010X222A1~
ST*837*0001*005010X222A1~
BHT*0019*00*CLM000123*20240215*0800*CH~
NM1*41*2*ACME HOME CARE*****46*1234567890~
...
SE*45*0001~
GE*1*1~
IEA*1*000000001~
```

---

## Troubleshooting

### Issue: "No Medicaid clients found"
**Solution**: Assign Medicaid payers to clients in the Insurance & Billing tab.

### Issue: "Missing Member ID" validation error
**Solution**: 
1. Go to client detail page
2. Insurance & Billing tab
3. Add Member ID to the Medicaid payer assignment

### Issue: "No approved timesheets found"
**Solution**: Go to `/evv/timesheets` and approve caregiver shifts.

### Issue: EDI file not downloading
**Solution**: Check that the claim was successfully created. The EDI content is generated during claim creation.

### Issue: Clearinghouse rejects CSV upload
**Solution**: 
1. Verify provider NPI and Tax ID are correct in `/settings/billing`
2. Ensure all Member IDs are valid
3. Check that procedure codes match clearinghouse requirements
4. Try EDI file upload instead (.x12 format)

---

## Best Practices

1. **Generate claims weekly** to catch errors early
2. **Validate client data** before generating claims (Member IDs, authorizations)
3. **Mark claims as "Submitted"** immediately after uploading to clearinghouse
4. **Record payments promptly** when ERA/835 files arrive
5. **Export both EDI and CSV** for backup and reconciliation
6. **Monitor filing deadlines** in the dashboard (varies by state: 90-365 days)
7. **Appeal denials within 30 days** with supporting EVV documentation

---

## Next Steps: Future Enhancements

### Phase 2 (Optional - Automated Integration)
If you want to eliminate manual uploads:
1. **Integrate with clearinghouse API** (Availity, Change Healthcare)
2. **Auto-submit claims** with one click
3. **Auto-fetch ERA/835** payments
4. **Auto-update claim status**

### Phase 3 (Optional - Partnership)
Partner with specialized billing vendors like:
- Paradigm (home care billing)
- Sandata (EVV + billing aggregator)
- HHAeXchange (integrated platform)

---

## Support & Resources

### Documentation
- Full setup guide: `/Desktop/NessaCRM/BILLING_SETUP.md`
- Multi-state guidance: `/Desktop/NessaCRM/BILLING_MULTI_STATE_GUIDE.md`
- Implementation summary: `/Desktop/NessaCRM/BILLING_IMPLEMENTATION_SUMMARY.md`

### State-Specific Resources
- **Massachusetts**: [MassHealth Provider Portal](https://www.masshealthproviders.com/)
- **New York**: [eMedNY](https://www.emedny.org/)
- **California**: [Medi-Cal Provider Portal](https://www.medi-cal.ca.gov/)

### Clearinghouses
- **Change Healthcare**: https://www.changehealthcare.com/
- **Availity**: https://www.availity.com/
- **Office Ally**: https://www.officeally.com/
- **Waystar**: https://waystar.com/

---

## Quick Reference: Navigation

| Feature | Path | Description |
|---------|------|-------------|
| Generate Claims | `/billing/claims` → Generate tab | Batch claim wizard |
| Manage Claims | `/billing/claims` → Manage tab | Track status, record payments |
| Provider Config | `/settings/billing` | NPI, Tax ID, Medicaid IDs |
| Client Insurance | `/clients/[id]` → Insurance tab | Assign payers, Member IDs |
| Timesheet Approval | `/evv/timesheets` | Approve shifts for billing |

---

## Summary

The **Hybrid Approach** gives you:
- ✅ **Full control**: Generate 837P EDI files in-house
- ✅ **Flexibility**: Export CSV for clearinghouses that prefer it
- ✅ **No third-party dependency**: Works out of the box
- ✅ **Future-proof**: Easy to integrate APIs later

You can submit claims to any clearinghouse starting today, with zero additional costs or integrations required!
