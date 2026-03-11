# Caregiver Timesheet Feature - Setup Guide

## Overview

The caregiver timesheet feature tracks approved EVV shifts, calculates pay based on employee pay rates, and provides export functionality (CSV/JSON). This feature integrates the full workflow: Schedule → EVV → Approval → Timesheet → Export.

## Prerequisites

Before using the timesheet feature, you need to run the database migrations.

## Setup Steps

### 1. Run Database Migrations

Apply the new migrations in order:

```bash
# From your Supabase dashboard or CLI:

# Migration 020: Adds payment_status column to evv_visits
# Located at: supabase/migrations/020_evv_payment_status.sql

# Migration 021: Seeds realistic pay rates and links schedule events to EVV visits
# Located at: supabase/migrations/021_seed_schedule_links_and_pay_rates.sql
```

**Using Supabase CLI:**
```bash
cd /Users/rahulchettri/Desktop/NessaCRM
supabase db push
```

**Or manually in Supabase Dashboard:**
1. Go to SQL Editor in your Supabase project
2. Copy and run the contents of `supabase/migrations/020_evv_payment_status.sql`
3. Copy and run the contents of `supabase/migrations/021_seed_schedule_links_and_pay_rates.sql`

### 2. Verify Data

After running migrations, verify:

**Check payment_status column exists:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'evv_visits' AND column_name = 'payment_status';
```

**Check employee pay rates are set:**
```sql
SELECT id, first_name, last_name, role, pay_rate, pay_type 
FROM employees 
WHERE status = 'active' 
LIMIT 5;
```

**Check EVV visits have schedule links:**
```sql
SELECT id, schedule_event_id, payment_status, timesheet_status 
FROM evv_visits 
WHERE clock_out IS NOT NULL 
LIMIT 5;
```

### 3. Access the Timesheet Page

Navigate to: `/evv/timesheets`

## Features

### 🎯 Core Functionality

1. **Week Picker**: Navigate by week (Monday-Sunday)
2. **Search**: Filter by caregiver name
3. **Payment Status Filter**: All / Unpaid / Paid
4. **Summary Stats**: Total shifts, hours, pay, unpaid/paid counts
5. **Weekly Grouping**: Shifts grouped by week with subtotals
6. **Bulk Actions**: Select multiple shifts and mark as paid
7. **Export**: CSV, JSON, and Weekly Summary formats

### 📊 Table Columns

- Shift date (with weekday)
- Caregiver name
- Client name
- Client address (full address)
- Clock in/out times
- Break minutes
- Billable hours (with overtime indicator)
- Pay rate (formatted by type: hourly/salary/per-visit)
- Pay amount (calculated)
- Payment status badge

### 💰 Pay Calculations

The system automatically calculates pay based on:

- **Hourly**: `billableHours × payRate` + overtime at 1.5x
- **Salary**: `(annualSalary / 2080) × billableHours` + overtime at 1.5x
- **Per-Visit**: Flat `payRate` regardless of hours

### 📤 Export Formats

**CSV Export:**
- One row per shift
- Includes all shift details, address, and pay information
- Filename: `timesheets_YYYY-MM-DD.csv`

**JSON Export:**
- Structured JSON with metadata
- Includes summary statistics
- Filename: `timesheets_YYYY-MM-DD.json`

**Weekly Summary:**
- Aggregated by week
- Shows totals for hours, pay, shift count
- Filename: `weekly_summary_YYYY-MM-DD.csv`

## Data Flow

```
Schedule Event (with caregiver + client)
    ↓
EVV Visit (clock in/out captured)
    ↓
Timesheet Status: pending → approved
    ↓
Timesheet Page (query with employee pay_rate join)
    ↓
Payment Status: unpaid → processing → paid
    ↓
Export (CSV/JSON)
```

## Constraints & Behaviors

### Filtering
- Only shows shifts with `timesheet_status = 'approved'`
- Only includes shifts with both `clock_in` AND `clock_out` (completed shifts)
- Defaults to current week (Monday-Sunday)

### Pay Rates
- Pay rates come from `employees.pay_rate` and `employees.pay_type`
- Migration 021 sets realistic rates:
  - Caregivers: $22-30/hr
  - CNAs: $24-30/hr
  - HHAs: $26-33/hr
  - LPNs: $30-35/hr
  - RNs: $38-45/hr
  - Admin/Coordinators: $50k-65k/yr (salary)

### Overtime
- Overtime hours tracked in `evv_visits.overtime_minutes`
- Calculated at 1.5x regular pay rate
- Displayed separately in the hours column

### Client Address
- Pulled from `clients.address` JSONB field
- Shows full address: street, city, state, zip

## API Endpoints

### GET `/api/evv/timesheets`

**Query Parameters:**
- `caregiverId` - Filter by specific caregiver (UUID)
- `q` - Search caregiver name (string)
- `startDate` - Start date filter (YYYY-MM-DD)
- `endDate` - End date filter (YYYY-MM-DD)
- `paymentStatus` - Filter: `unpaid` | `paid` | `processing` | `all`
- `timesheetStatus` - Filter: `approved` | `pending` | `flagged` | `all` (default: `approved`)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "shiftDate": "2024-01-15",
      "weekStart": "2024-01-15",
      "weekEnd": "2024-01-21",
      "caregiver": {
        "id": "uuid",
        "name": "John Doe",
        "payRate": 25.00,
        "payType": "hourly"
      },
      "client": {
        "id": "uuid",
        "name": "Jane Smith",
        "address": {
          "street": "123 Main St",
          "city": "Boston",
          "state": "MA",
          "zip": "02101"
        }
      },
      "clockIn": "2024-01-15T08:00:00Z",
      "clockOut": "2024-01-15T16:00:00Z",
      "breakMinutes": 30,
      "overtimeMinutes": 0,
      "billableHours": 7.5,
      "overtimeHours": 0,
      "payAmount": 187.50,
      "serviceType": "Personal Care",
      "fundingSource": "Medicaid",
      "paymentStatus": "unpaid",
      "timesheetStatus": "approved",
      "verificationStatus": "verified"
    }
  ],
  "summary": {
    "totalHours": 45.5,
    "totalPay": 1250.00,
    "shiftCount": 6,
    "unpaidCount": 4,
    "paidCount": 2
  }
}
```

### PATCH `/api/evv/timesheets`

**Body:**
```json
{
  "ids": ["uuid1", "uuid2"],
  "paymentStatus": "paid"
}
```

**Response:**
```json
{
  "success": true,
  "updatedCount": 2
}
```

## Troubleshooting

### "Cannot read properties of undefined" error

**Cause:** The `payment_status` column doesn't exist in the database yet.

**Solution:** Run migration 020 as described in Setup Steps above.

### No timesheets showing up

**Possible causes:**
1. No approved EVV visits in the selected week
2. Shifts don't have both clock_in and clock_out times
3. Date range filter excludes all data

**Solution:**
- Check that EVV visits have `timesheet_status = 'approved'`
- Ensure shifts are completed (have clock_out)
- Try selecting "This Week" or a different week

### Pay amounts showing $0

**Cause:** Employee pay_rate is 0 or not set.

**Solution:** Run migration 021 to seed realistic pay rates, or manually update:
```sql
UPDATE employees 
SET pay_rate = 25.00, pay_type = 'hourly' 
WHERE role = 'caregiver' AND pay_rate = 0;
```

### Export files not downloading

**Cause:** Browser blocking downloads or popup blocker.

**Solution:** 
- Check browser console for errors
- Allow downloads from the site
- Disable popup blockers for the site

## Files Modified/Created

**Database:**
- `supabase/migrations/020_evv_payment_status.sql` (NEW)
- `supabase/migrations/021_seed_schedule_links_and_pay_rates.sql` (NEW)

**Backend:**
- `app/api/evv/timesheets/route.ts` (NEW)
- `lib/db/evv.mapper.ts` (MODIFIED - added TimesheetEntry type and mapper)

**Frontend:**
- `app/(app)/evv/timesheets/page.tsx` (COMPLETE REWRITE)
- `components/evv/time-clock-table.tsx` (MODIFIED - added optional pay fields)
- `lib/export-timesheet.ts` (NEW)

## Testing Checklist

- [ ] Run both migrations (020 and 021)
- [ ] Verify payment_status column exists
- [ ] Verify employee pay_rates are set
- [ ] Navigate to /evv/timesheets
- [ ] See approved shifts for current week
- [ ] Search for specific caregiver
- [ ] Filter by payment status
- [ ] Navigate between weeks
- [ ] Select shifts and mark as paid
- [ ] Export to CSV
- [ ] Export to JSON
- [ ] Export weekly summary
- [ ] Verify pay calculations are correct
- [ ] Check overtime is calculated at 1.5x

## Support

For issues or questions, check:
1. Supabase dashboard for migration status
2. Browser console for JavaScript errors
3. Network tab for API request/response details
