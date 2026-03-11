# EVV Module - Migration Guide

## Overview

This migration creates 8 new tables for the Electronic Visit Verification (EVV) module, fully integrated with existing `employees` and `clients` tables.

## Tables Created

1. **`evv_service_types`** - Lookup table for service types (seeded with 5 types)
2. **`evv_funding_sources`** - Lookup table for funding sources (seeded with 5 sources)
3. **`evv_visits`** - Core visit records with clock times, GPS status, verification status
4. **`evv_gps_captures`** - GPS coordinates captured at clock-in/out
5. **`evv_exceptions`** - Visit exceptions (late, no-show, geofence breach, missing notes)
6. **`evv_corrections`** - Audit trail of manual clock-in/out edits by admin
7. **`evv_audit_log`** - Full activity log for every visit action
8. **`evv_settings`** - Org-level EVV configuration (single row, seeded with defaults)

## Running the Migration

### Option 1: Supabase CLI (Recommended)

```bash
# From project root
cd supabase
supabase db push
```

This will apply all pending migrations including `013_create_evv_tables.sql`.

### Option 2: Supabase Dashboard

1. Go to your Supabase project → **SQL Editor**
2. Open `/supabase/migrations/013_create_evv_tables.sql`
3. Copy the entire file contents
4. Paste into SQL Editor → Run

### Option 3: Manual psql

```bash
psql "your-database-connection-string" < supabase/migrations/013_create_evv_tables.sql
```

## Verification

After migration, verify tables were created:

```sql
-- Check all EVV tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'evv_%';

-- Verify seed data
SELECT * FROM evv_service_types;
SELECT * FROM evv_funding_sources;
SELECT * FROM evv_settings;
```

You should see:
- 5 service types
- 5 funding sources
- 1 settings row

## Frontend Integration

The frontend is already connected:

✅ **Main EVV page** (`app/(app)/evv/page.tsx`) - fetches visits with joins  
✅ **Detail drawer** (`components/evv/time-clock-detail-drawer.tsx`) - saves corrections & resolves exceptions  
✅ **Settings component** (`components/evv/evv-settings.tsx`) - reads/writes EVV settings  
✅ **Timesheet approval** (`app/(app)/evv/timesheets/page.tsx`) - fetches pending timesheets

## Adding Test Data

After migration, you can add test visits:

```sql
-- Example: Create a test visit
INSERT INTO evv_visits (
  employee_id,
  client_id,
  service_type_id,
  funding_source_id,
  scheduled_start,
  scheduled_end,
  clock_in,
  clock_out,
  break_minutes,
  gps_status,
  gps_distance_meters,
  arrival_status,
  verification_status,
  care_notes_completed
) VALUES (
  (SELECT id FROM employees WHERE role = 'caregiver' LIMIT 1),
  (SELECT id FROM clients LIMIT 1),
  (SELECT id FROM evv_service_types WHERE name = 'Personal Care'),
  (SELECT id FROM evv_funding_sources WHERE name = 'Medicaid'),
  now() - interval '2 hours',
  now() + interval '2 hours',
  now() - interval '1.5 hours',
  NULL, -- Active shift, not clocked out yet
  0,
  'verified',
  25,
  'on-time',
  'pending',
  true
);
```

## Security Notes

Current RLS policies allow all authenticated users to:
- **Read** all EVV data
- **Insert** visits, GPS captures, exceptions, audit logs
- **Update** visits, exceptions, settings

For production, tighten RLS policies to check user role (admin/manager) using `auth.jwt() ->> 'role'` or similar.

## Next Steps

1. Run the migration
2. Verify tables in Supabase Dashboard
3. Add test employees and clients (if not already present)
4. Create test visits using SQL or the CRM UI (once caregiver mobile app is built)
5. Test the EVV dashboard, detail drawer, exception resolution, and settings
