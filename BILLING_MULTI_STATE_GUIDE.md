# Multi-State Medicaid Billing: Best Practices & Constraints

## Executive Summary

This guide outlines the key considerations for operating a home care billing system across multiple states. Medicaid is state-administered, meaning each state has different rules, rates, codes, and submission requirements. NessaCRM's billing system is designed from the ground up to handle this complexity.

## Critical Constraints for Multi-State Operation

### 1. State-Specific Payer Registration

**Constraint:** You must be an enrolled Medicaid provider in each state you operate.

**Implementation:**
- Create one `billing_payers` row per state Medicaid program
- Store your state-specific provider ID in `billing_provider_config.state_provider_ids`:
  ```json
  {
    "MA": "12345",
    "NY": "67890",
    "CA": "ABCD123"
  }
  ```
- The 837P generator pulls the correct provider ID per claim's payer state

**Checklist:**
- [ ] Complete Medicaid provider enrollment in each target state
- [ ] Obtain state-specific provider number
- [ ] Add to provider config
- [ ] Verify credentialing is complete before billing

---

### 2. Procedure Code Mapping (Per State)

**Constraint:** The same service maps to different HCPCS codes in different states.

**Example: Personal Care**
- **Massachusetts**: T1019 with modifier U1
- **New York**: T1019 (no modifier)
- **California**: S5130 (waiver-specific)
- **Texas**: T1019

**Implementation:**
```sql
-- MA MassHealth Personal Care
INSERT INTO billing_service_codes (
  payer_id, service_type_id, code, modifier, rate, unit_type, effective_date
) VALUES (
  '<ma_medicaid_id>', '<personal_care_id>', 'T1019', 'U1', 6.50, '15min', '2024-01-01'
);

-- CA Medi-Cal Personal Care
INSERT INTO billing_service_codes (
  payer_id, service_type_id, code, modifier, rate, unit_type, effective_date
) VALUES (
  '<ca_medicaid_id>', '<personal_care_id>', 'S5130', NULL, 7.25, 'hour', '2024-01-01'
);
```

**Best Practice:**
- Maintain a "code crosswalk" spreadsheet mapping your internal service types to each state's codes
- Review annually when states publish updated fee schedules
- Use `effective_date` and `end_date` to support historical claims after rate changes

---

### 3. Unit Type Conversion

**Constraint:** States measure services in different units.

| State | Unit Type | Conversion from Hours |
|-------|-----------|----------------------|
| MA | 15-min | hours × 4 |
| NY | 15-min | hours × 4 |
| CA (waiver) | Hour | hours × 1 |
| TX | 15-min | hours × 4 |
| FL | 15-min | hours × 4 |

**Implementation:**
The `billing_service_codes.unit_type` field specifies the unit. When generating claims:

```typescript
function convertToUnits(billableHours: number, unitType: string): number {
  switch (unitType) {
    case "15min":
      return billableHours * 4;
    case "hour":
      return billableHours;
    case "visit":
      return 1;
    case "day":
      return 1;
    default:
      return billableHours;
  }
}
```

**Best Practice:**
- Always store `billableHours` from EVV (normalized)
- Convert to payer's unit type at claim generation time
- Round per state rules (some round up, some round to nearest 0.25)

---

### 4. Timely Filing Limits

**Constraint:** Claims must be submitted within a state-specific window from the date of service.

| State | Timely Filing | Consequences |
|-------|---------------|--------------|
| MA | 180 days | Denial if late |
| NY | 365 days | Denial if late |
| CA | 365 days | Denial if late |
| TX | 95 days | **Shortest window** |
| FL | 365 days | Denial if late |

**Implementation:**
- Store in `billing_payers.timely_filing_days`
- Compute `billing_claims.filing_deadline` = service date + timely_filing_days
- Flag claims approaching deadline:
  ```sql
  SELECT claim_number, filing_deadline
  FROM billing_claims
  WHERE status IN ('draft', 'generated')
    AND filing_deadline < CURRENT_DATE + INTERVAL '30 days';
  ```

**Best Practice:**
- Set up automated alerts for claims with `filing_deadline` < 30 days
- Prioritize claim generation for short-window states (TX, MA)
- Batch-generate monthly for long-window states (NY, CA, FL)

---

### 5. Prior Authorization Requirements

**Constraint:** Most Medicaid waiver programs (HCBS, IDD, Regional Center) require prior authorization with unit caps.

**Varies by:**
- State program (standard Medicaid vs. waiver)
- Service type (personal care often requires auth, companion may not)
- Client eligibility tier

**Implementation:**
Track in `client_payer_assignments`:
```sql
authorization_number: "AUTH-12345"
authorized_units: 100.0  -- hours approved
used_units: 45.5         -- consumed so far
authorization_start: "2024-01-01"
authorization_end: "2024-06-30"
```

**Auto-Increment on Claim Submission:**
When a claim is submitted, update `used_units`:
```typescript
const totalUnits = claimLines.reduce((sum, line) => sum + line.units, 0);

await supabase
  .from("client_payer_assignments")
  .update({ used_units: assignment.usedUnits + totalUnits })
  .eq("id", assignment.id);
```

**Best Practice:**
- Warn at 80% of authorized units
- Alert at 95% of authorized units
- Block claim generation when units exhausted
- Track renewal dates and automate authorization request reminders

---

### 6. Place of Service (POS) Codes

**Constraint:** Home care claims must use POS code `12` (Home).

**837P Requirement:**
```
SV1 segment must include POS code
```

**Implementation:**
- Default: `billing_provider_config.default_place_of_service = '12'`
- Override per claim line if needed (e.g., `11` for office visit)
- Stored in `billing_claim_lines.place_of_service`

**Other POS Codes:**
- `11` = Office
- `12` = Home
- `13` = Assisted Living
- `31` = Skilled Nursing Facility
- `32` = Nursing Facility

---

### 7. Diagnosis Codes (ICD-10)

**Constraint:** Medicaid claims require a primary diagnosis code (ICD-10).

**Source:**
- Medical clients: `clients.care_plan.diagnosis` (text field currently)
- Need to parse or store as structured ICD-10 code (e.g., "Z74.01" = Bed confinement status)

**Implementation:**
Store in `billing_claim_lines.diagnosis_code`. Reference in 837P:
```
HI*ABK:Z7401~  (primary diagnosis)
```

**Best Practice:**
- Add an `icd10_code` field to medical client schema
- Validate against ICD-10 code list (consider using an API like CMS HCPCS API)
- Default to Z-codes for general care needs if specific diagnosis unavailable

---

### 8. EVV Mandate (21st Century Cures Act)

**Constraint:** Federal law requires EVV for Medicaid personal care and home health aide services (as of January 1, 2021).

**Required Data:**
- Type of service
- Individual receiving service
- Individual providing service
- Date of service
- Location of service (GPS coordinates)
- Time service begins and ends

**Implementation:**
Already handled! The system embeds EVV data in 837P claims via REF segments:
```
REF*EVV*CLOCK_IN:2024-01-15T08:00:00Z~
REF*EVV*GPS_IN:42.360082,-71.058880~
```

Pulled from:
- `evv_visits.clock_in` / `clock_out`
- `evv_gps_captures.latitude` / `longitude`

**Best Practice:**
- Ensure GPS is captured at clock-in/out (already enforced by EVV module)
- Include EVV data on ALL personal care claims (not just states that explicitly require it in the 837P)
- Keep EVV data for 6 years (federal audit requirement)

---

### 9. Rendering Provider NPI

**Constraint:** Some states require the individual caregiver's NPI on the claim line.

**State Requirements:**
- **Requires caregiver NPI**: MA (for some programs), NY (for skilled)
- **Does not require**: Most states for personal care
- **Optional**: Can always include if available

**Implementation:**
- Add `employees.npi` (optional field, already added by migration)
- Populate for LPNs, RNs, CNAs if state requires
- Included in `billing_claim_lines.rendering_provider_npi`
- Appears in 837P Loop 2400:
  ```
  NM1*82*1*DOE*JANE****XX*1234567890~
  ```

**Best Practice:**
- Only populate NPI for licensed caregivers (LPN, RN, CNA)
- Not required for non-licensed personal care aides
- Include in claim even if state doesn't require it (doesn't hurt)

---

### 10. Billing Frequency

**Constraint:** States have different billing cycles.

| State | Typical Frequency | Claim Submission Deadline |
|-------|-------------------|---------------------------|
| MA | Monthly | By the 10th of following month |
| NY | Monthly | By the 15th of following month |
| CA | Biweekly | Within 7 days of period end |
| TX | Weekly | Within 3 days (urgent) |

**Implementation:**
- Store in `billing_payers.billing_frequency`
- Use to set default billing periods in claim wizard
- Schedule automated claim generation based on frequency

**Best Practice:**
- For weekly states (TX): automate claim generation Friday for Mon-Sun period
- For monthly states: batch-generate on the 1st of the month
- Always allow manual override for exceptions

---

## State-by-State Setup Guide

### Massachusetts (MassHealth)

**Payer Setup:**
```sql
INSERT INTO billing_payers (name, payer_type, state, electronic_payer_id, timely_filing_days)
VALUES ('Massachusetts MassHealth', 'medicaid', 'MA', '42008', 180);
```

**Service Codes:**
| Service | Code | Modifier | Rate | Unit |
|---------|------|----------|------|------|
| Personal Care | T1019 | U1 | $6.50 | 15min |
| Companion | S5130 | - | $6.00 | 15min |
| Respite | S5151 | - | $8.00 | 15min |

**Notes:**
- Modifier U1 is mandatory for T1019
- Requires individual caregiver certification
- Prior auth required for > 40 hrs/week

---

### California (Medi-Cal)

**Payer Setup:**
```sql
INSERT INTO billing_payers (name, payer_type, state, electronic_payer_id, timely_filing_days)
VALUES ('California Medi-Cal', 'medicaid', 'CA', 'CAMEDICAID', 365);
```

**Service Codes:**
| Service | Code | Rate | Unit |
|---------|------|------|------|
| Personal Care | S5130 | $7.25 | hour |
| Companion | S5130 | $7.25 | hour |
| Skilled Nursing | G0154 | $45.00 | visit |

**Notes:**
- Uses hourly units (not 15-min)
- Waiver program uses S-codes
- Regional Center may have different rates

---

### New York (Medicaid)

**Payer Setup:**
```sql
INSERT INTO billing_payers (name, payer_type, state, electronic_payer_id, timely_filing_days)
VALUES ('New York Medicaid', 'medicaid', 'NY', 'NYMEDICAID', 365);
```

**Service Codes:**
| Service | Code | Rate | Unit |
|---------|------|------|------|
| Personal Care | T1019 | $19.50 | 15min |
| Home Health Aide | G0156 | $22.00 | 15min |
| Skilled Nursing | G0154 | $55.00 | visit |

**Notes:**
- CDPAP (Consumer Directed) has different codes
- MLTC (Managed Long Term Care) requires pre-auth
- NYC vs. upstate NY may have different rates

---

### Texas (Medicaid)

**Payer Setup:**
```sql
INSERT INTO billing_payers (name, payer_type, state, electronic_payer_id, timely_filing_days)
VALUES ('Texas Medicaid', 'medicaid', 'TX', 'TXMEDICAID', 95);
```

**Service Codes:**
| Service | Code | Rate | Unit |
|---------|------|------|------|
| Personal Care | T1019 | $5.80 | 15min |
| Attendant Care | S5125 | $6.00 | 15min |

**Notes:**
- **Shortest timely filing**: Only 95 days!
- Requires weekly claim submission for cash flow
- Must include Texas-specific payer ID on NPI registry

---

## Recommended Operational Workflow

### Weekly (Every Monday)

1. **Review timesheets** from previous week
   - Navigate to `/evv/timesheets`
   - Ensure all shifts approved
   - Mark caregivers as paid

2. **Check authorization usage**
   - Query clients with `authorization_end < 60 days`
   - Request renewals for clients > 80% of units

3. **Generate TX claims** (if operating in Texas)
   - Short filing window requires weekly submission

### Monthly (1st of Month)

1. **Generate claims** for monthly states (MA, NY, CA, FL)
   - Select previous month as billing period
   - Generate all eligible Medicaid claims
   - Review validation warnings

2. **Generate invoices** for self-pay clients
   - Same period
   - Email or mail invoices

3. **Download 837P files**
   - Export all `generated` claims
   - Submit to state portals or clearinghouse

4. **Update claim status** after submission
   - Mark as `submitted`
   - Track acknowledgment (999 response)

### Quarterly

1. **Review payer contracts** for rate changes
2. **Update service codes** with new rates (effective_date = new quarter start)
3. **Audit rejected claims** and implement corrections
4. **Review aging reports** (claims > 60 days outstanding)

---

## Common Pitfalls & Solutions

### Pitfall 1: Hardcoded Procedure Codes

**Problem:** Code like `if (serviceType === 'personal_care') return 'T1019'` breaks for CA.

**Solution:** Always lookup via `billing_service_codes` table:
```typescript
const code = await supabase
  .from("billing_service_codes")
  .select("code, modifier, rate, unit_type")
  .eq("payer_id", payerId)
  .eq("service_type_id", serviceTypeId)
  .eq("is_active", true)
  .lte("effective_date", serviceDate)
  .or("end_date.is.null,end_date.gte." + serviceDate)
  .single();
```

### Pitfall 2: Ignoring Unit Type

**Problem:** Submitting 8 hours as "8 units" to a 15-min payer = underbilling by 75%.

**Solution:** Always convert hours to payer's unit type:
```typescript
const units = unitType === "15min" ? billableHours * 4 : billableHours;
```

### Pitfall 3: Missing Prior Auth

**Problem:** Submitting claims without authorization = automatic denial.

**Solution:** Query `client_payer_assignments` before generating claim:
```typescript
const assignment = await supabase
  .from("client_payer_assignments")
  .select("*")
  .eq("client_id", clientId)
  .eq("payer_id", payerId)
  .eq("is_primary", true)
  .lte("authorization_start", serviceDate)
  .gte("authorization_end", serviceDate)
  .single();

if (!assignment || !assignment.authorization_number) {
  throw new Error("No active authorization for this payer");
}
```

### Pitfall 4: Late Filing

**Problem:** Missing timely filing deadline = lost revenue (claims denied).

**Solution:** Track `filing_deadline` on claims:
```sql
CREATE VIEW claims_at_risk AS
SELECT 
  claim_number,
  filing_deadline,
  filing_deadline - CURRENT_DATE as days_remaining
FROM billing_claims
WHERE status IN ('draft', 'generated')
  AND filing_deadline < CURRENT_DATE + INTERVAL '30 days'
ORDER BY filing_deadline ASC;
```

Set up daily alerts for claims with < 14 days remaining.

### Pitfall 5: Expired Authorizations

**Problem:** Client runs out of authorized units mid-month.

**Solution:** Proactive monitoring:
```sql
SELECT 
  c.first_name,
  c.last_name,
  cpa.authorization_end,
  cpa.authorized_units,
  cpa.used_units,
  (cpa.authorized_units - cpa.used_units) as remaining
FROM client_payer_assignments cpa
JOIN clients c ON c.id = cpa.client_id
WHERE cpa.authorization_end > CURRENT_DATE
  AND cpa.authorization_end < CURRENT_DATE + INTERVAL '60 days'
  OR (cpa.authorized_units - cpa.used_units) < 10
ORDER BY cpa.authorization_end ASC;
```

Send weekly report to care coordinators.

---

## Fee Schedule Management

### Annual Rate Updates

Most states publish updated fee schedules effective January 1.

**Process:**
1. **November**: Download new fee schedule from state Medicaid website
2. **December**: Update `billing_service_codes`:
   - Set `end_date = '2024-12-31'` on old codes
   - Insert new codes with `effective_date = '2025-01-01'`
3. **January 1**: New rates automatically apply to new claims

**Example:**
```sql
-- End old rate
UPDATE billing_service_codes
SET end_date = '2024-12-31'
WHERE payer_id = '<ma_medicaid_id>'
  AND code = 'T1019'
  AND effective_date = '2024-01-01';

-- Add new rate
INSERT INTO billing_service_codes (
  payer_id, service_type_id, code, modifier, rate, unit_type, effective_date
) VALUES (
  '<ma_medicaid_id>', '<personal_care_id>', 'T1019', 'U1', 6.75, '15min', '2025-01-01'
);
```

### Mid-Year Rate Changes

Some states adjust rates mid-year (e.g., CA adjusts July 1 for fiscal year).

Use the same process:
- Keep historical rate with `end_date`
- Add new rate with new `effective_date`

---

## 837P EDI Compliance

### File Format Requirements

**ANSI ASC X12N 005010X222A1** (HIPAA 5010)

**Mandatory Segments:**
- ISA/IEA: Interchange envelope
- GS/GE: Functional group
- ST/SE: Transaction set
- BHT: Beginning of hierarchical transaction
- Loop 1000A: Submitter
- Loop 1000B: Receiver
- Loop 2000A: Billing provider (NPI, tax ID)
- Loop 2000B: Subscriber (client, member ID)
- Loop 2300: Claim information
- Loop 2400: Service lines (procedure codes, units, dates)

**Validation:**
- Segment terminators: `~` (tilde)
- Element separators: `*` (asterisk)
- No extra whitespace or line breaks
- Control numbers must match in headers/trailers

Use the validator:
```typescript
import { validate837P } from "@/lib/billing/edi-837p";
const { isValid, errors } = validate837P(ediContent);
```

### Testing 837P Files

**Option 1: State Test Portal**
Most states have a test/sandbox portal for 837P submission.

**Option 2: EDI Validator Tools**
- [X12 Parser](https://x12parser.com/) (online)
- Availity test environment (if using clearinghouse)

**Option 3: Manual Review**
```typescript
import { format837PForDisplay } from "@/lib/billing/edi-837p";
console.log(format837PForDisplay(ediContent)); // Adds line breaks for readability
```

---

## Security & Compliance

### HIPAA Requirements

**PHI in EDI:**
- Client name, DOB, Medicaid ID
- Service dates, diagnoses
- Provider NPI, tax ID

**Transmission:**
- Encrypt 837P files at rest (Supabase encrypts TEXT columns)
- Use HTTPS for clearinghouse API
- Use SFTP for batch file submission to states

**Retention:**
- Keep `billing_claims.edi_content` for 6 years (CMS requirement)
- Keep `evv_audit_log` for 6 years (EVV mandate)

### Access Controls

**Role-based access:**
- Billing staff: Can generate claims/invoices
- Care coordinators: Can view claims, cannot edit
- Caregivers: Cannot access billing

**Audit trail:**
- Log who generated each claim (`created_at`, `recorded_by`)
- Log who recorded each payment
- Track all claim status changes

---

## Clearinghouse Integration (Future)

If integrating with a clearinghouse (Availity, Change Healthcare, Claim.MD):

**Workflow:**
1. Generate claim + 837P via `/api/billing/claims` (POST)
2. Submit 837P to clearinghouse API:
   ```typescript
   const response = await clearinghouse.submitClaim({
     ediContent: claim.ediContent,
     payerId: claim.payerId,
   });
   ```
3. Store clearinghouse reference:
   ```typescript
   await supabase
     .from("billing_claims")
     .update({ 
       status: "submitted",
       submission_date: new Date().toISOString(),
       // Store clearinghouse claim ID in notes or new column
     })
     .eq("id", claimId);
   ```
4. Poll for 999 (acknowledgment) and 277 (status):
   ```typescript
   const status = await clearinghouse.getClaimStatus(clearinghouseClaimId);
   // Update billing_claims.status based on 277 response
   ```
5. Parse 835 (ERA) for payment:
   ```typescript
   const remittance = await clearinghouse.getRemittance(eraId);
   // Create billing_payment row with method = 'era'
   ```

**Pros:**
- Automated submission and status tracking
- Handles 999/277/835 parsing
- Consolidated reporting across states

**Cons:**
- Per-claim fee ($0.50-$2.00)
- Monthly subscription ($50-$500)
- Vendor lock-in

---

## Summary: Multi-State Readiness Checklist

**Infrastructure:**
- [ ] One payer per state Medicaid program
- [ ] Service code mappings for each state × service type
- [ ] Per-state provider IDs in provider config
- [ ] Timely filing days configured per payer
- [ ] Unit type conversion logic in place

**Operations:**
- [ ] Weekly timesheet approval workflow
- [ ] Monthly claim generation schedule
- [ ] Authorization tracking and renewal process
- [ ] Timely filing alert system
- [ ] Rejected claim correction workflow

**Compliance:**
- [ ] EVV data captured on all shifts
- [ ] 837P files validated before submission
- [ ] HIPAA-compliant transmission (HTTPS/SFTP)
- [ ] 6-year retention policy for claims and EVV
- [ ] Access controls and audit logging

**State-Specific:**
- [ ] Fee schedules updated annually
- [ ] State portal access or clearinghouse account
- [ ] State-specific modifiers (e.g., MA U1)
- [ ] State-specific authorization rules documented

---

## Resources

- **CMS HCPCS Codes**: https://www.cms.gov/medicare/coding-billing/healthcare-common-procedure-system
- **ICD-10 Codes**: https://www.cms.gov/medicare/coding-billing/icd-10-codes
- **837P Implementation Guide**: Washington Publishing Company (WPC)
- **State Medicaid Portals**: Search "[State] Medicaid provider portal"
- **Clearinghouse Options**: Availity, Change Healthcare, Claim.MD, Office Ally

---

## Support

For state-specific questions:
1. Consult the state's Medicaid provider manual (usually online)
2. Call the state Medicaid provider hotline
3. Join state-specific home care associations for guidance

For technical questions about NessaCRM's billing implementation:
- See `BILLING_SETUP.md` for setup instructions
- Check API documentation in route files
- Review migration `022_billing_tables.sql` for schema details
