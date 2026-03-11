# Real-Time Dashboard Implementation Guide

This guide explains the real-time dashboard implementation in Nessa CRM, including Supabase integration, real-time subscriptions, and activity logging.

## Overview

The dashboard has been fully integrated with Supabase to provide real-time updates across all components:

- **Overview Cards**: Real-time statistics (clients, caregivers, visits, tasks, revenue, compliance)
- **Activity Feed**: Live activity stream with automatic updates
- **Visit Completion Chart**: Real-time visit completion rates with weekly breakdown
- **Quick Stats**: Top-level metrics that update instantly

## Architecture

### 1. Database Schema

#### Activity Log Table (`activity_log`)
Tracks all system activities for the dashboard feed:

```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY,
  agency_id UUID NOT NULL,
  type TEXT NOT NULL, -- care_note, schedule, client, employee, visit, alert, task, document, billing, compliance
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  status TEXT, -- completed, pending, urgent, info
  client_id UUID,
  employee_id UUID,
  schedule_event_id UUID,
  evv_visit_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ
);
```

**Migration**: `supabase/migrations/034_create_activity_log.sql`

### 2. Real-Time Subscriptions

#### Supabase Real-Time Hook (`lib/hooks/useSupabaseRealtime.ts`)

Two hooks for real-time subscriptions:

1. **`useSupabaseRealtime`**: Subscribe to a single event type
   ```typescript
   useSupabaseRealtime("clients", "INSERT", (payload) => {
     console.log("New client:", payload.new);
   });
   ```

2. **`useSupabaseRealtimeMulti`**: Subscribe to multiple event types
   ```typescript
   useSupabaseRealtimeMulti("clients", {
     onInsert: (record) => console.log("Created:", record),
     onUpdate: (record) => console.log("Updated:", record),
     onDelete: (record) => console.log("Deleted:", record),
   });
   ```

### 3. API Endpoints

#### Dashboard Statistics (`/api/dashboard/stats`)
Returns real-time statistics for overview cards:
- Total clients (with month-over-month change)
- Active caregivers
- Scheduled visits today
- Pending tasks
- Revenue this month (with month-over-month change)
- Compliance status (percentage of employees with complete verifications)

**Usage**:
```typescript
const response = await apiFetch("/api/dashboard/stats");
const { data } = await response.json();
```

#### Activity Log (`/api/dashboard/activities`)
Returns recent activity log entries:

**GET**: Fetch activities
```typescript
const response = await apiFetch("/api/dashboard/activities?limit=10");
```

**POST**: Create activity
```typescript
await apiFetch("/api/dashboard/activities", {
  method: "POST",
  body: JSON.stringify({
    type: "client",
    title: "New client registered",
    description: "John Doe added to system",
    actor_name: "Current User",
    status: "completed",
  }),
});
```

#### Visit Statistics (`/api/dashboard/visit-stats`)
Returns visit completion statistics:
- This week completion rate
- This month completion rate
- Weekly breakdown (last 7 days)

**Usage**:
```typescript
const response = await apiFetch("/api/dashboard/visit-stats");
const { data } = await response.json();
```

### 4. Activity Logger (`lib/activity-logger.ts`)

Helper functions to log activities:

```typescript
// Log client activity
await logClientActivity("created", "John Doe", "Current User", clientId);

// Log employee activity
await logEmployeeActivity("updated", "Jane Smith", "Current User", employeeId);

// Log schedule activity
await logScheduleActivity("assigned", "Shift assigned to John", "Current User", eventId);

// Log visit activity
await logVisitActivity("completed", "Visit completed successfully", "Jane Smith", visitId);

// Log care note
await logCareNoteActivity("John Doe", "Jane Smith", visitId);

// Log compliance alert
await logComplianceAlert("Missing documentation for visit #4489", "System", employeeId);
```

## Component Implementation

### Overview Cards (`components/dashboard/overview-cards.tsx`)

**Features**:
- Fetches real-time statistics from `/api/dashboard/stats`
- Subscribes to changes in: `clients`, `employees`, `schedule_events`, `schedule_event_tasks`, `billing_invoices`
- Automatically refreshes when any related data changes
- Shows loading skeleton while fetching

**Real-time Updates**:
```typescript
useSupabaseRealtimeMulti("clients", {
  onInsert: () => fetchStats(),
  onUpdate: () => fetchStats(),
  onDelete: () => fetchStats(),
});
```

### Activity Feed (`components/dashboard/activity-feed.tsx`)

**Features**:
- Fetches recent activities from `/api/dashboard/activities`
- Subscribes to `activity_log` table for real-time updates
- Automatically prepends new activities as they occur
- Shows user initials, activity type icon, status badge, and timestamp

**Real-time Updates**:
```typescript
useSupabaseRealtime("activity_log", "*", (payload) => {
  if (payload.eventType === "INSERT") {
    setActivities((prev) => [payload.new, ...prev].slice(0, 10));
  }
});
```

### Charts Section (`components/dashboard/charts-section.tsx`)

**Features**:
- Fetches visit completion statistics from `/api/dashboard/visit-stats`
- Subscribes to `schedule_events` for real-time updates
- Shows weekly breakdown with visual bar chart
- Displays this week and this month completion rates with trends

**Real-time Updates**:
```typescript
useSupabaseRealtimeMulti("schedule_events", {
  onInsert: () => fetchStats(),
  onUpdate: () => fetchStats(),
  onDelete: () => fetchStats(),
});
```

### Dashboard Page (`app/(app)/dashboard/page.tsx`)

**Features**:
- Coordinates all dashboard components
- Manages quick stats (staff, caregivers, credentials)
- Subscribes to `employees` and `employee_verifications` for real-time updates
- Hydrates employee store on mount

**Real-time Updates**:
```typescript
useSupabaseRealtimeMulti("employees", {
  onInsert: () => hydrate(),
  onUpdate: () => hydrate(),
  onDelete: () => hydrate(),
});
```

## Store Integration

Activity logging is automatically integrated into Zustand stores:

### Clients Store (`store/useClientsStore.ts`)
- Logs activity when clients are created, updated, or deleted
- Activities appear immediately in dashboard feed

### Employees Store (`store/useEmployeesStore.ts`)
- Logs activity when employees are created, updated, or deleted
- Activities appear immediately in dashboard feed

### Schedule Store (`store/useScheduleStore.ts`)
- Logs activity when schedule events are created, updated, or deleted
- Activities appear immediately in dashboard feed

## Setup Instructions

### 1. Run Database Migrations

```bash
# Navigate to your Supabase project
cd supabase

# Run the new migrations
supabase db push

# Or apply manually via Supabase Dashboard SQL Editor:
# - migrations/034_create_activity_log.sql
# - migrations/035_seed_activity_log.sql
```

### 2. Enable Real-Time in Supabase

1. Go to your Supabase Dashboard
2. Navigate to Database → Replication
3. Enable real-time for these tables:
   - `activity_log`
   - `clients`
   - `employees`
   - `schedule_events`
   - `schedule_event_tasks`
   - `billing_invoices`
   - `employee_verifications`

### 3. Verify Environment Variables

Ensure your `.env.local` has:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Test Real-Time Updates

1. Open the dashboard: `http://localhost:3000/dashboard`
2. In another tab, create a new client or employee
3. Watch the dashboard update automatically without refresh
4. Check the Activity Feed for new entries

## Real-Time Features

### Automatic Updates
- **No manual refresh needed**: Dashboard updates automatically when data changes
- **Optimistic updates**: Some operations show changes immediately, then sync with server
- **Live activity feed**: New activities appear instantly in the feed
- **Real-time statistics**: All metrics update as data changes

### Performance Optimizations
- **Debounced updates**: Multiple rapid changes are batched
- **Selective subscriptions**: Only subscribes to relevant tables
- **Efficient queries**: Uses indexes and proper filtering
- **Cache management**: 5-minute TTL on stores to reduce API calls

### Error Handling
- **Graceful degradation**: Falls back to cached data if real-time fails
- **Loading states**: Shows skeletons while fetching
- **Empty states**: Clear messaging when no data exists
- **Error recovery**: Automatically retries failed subscriptions

## Activity Types

| Type | Description | Example |
|------|-------------|---------|
| `care_note` | Care notes completed | "Visit notes for Sarah Johnson" |
| `schedule` | Schedule changes | "John Smith assigned to new client visit" |
| `client` | Client CRUD operations | "Robert Williams added to system" |
| `employee` | Employee CRUD operations | "Jane Doe joined the team" |
| `visit` | EVV visit events | "EVV check-out for visit #4521" |
| `alert` | System alerts | "Missing documentation for visit #4489" |
| `task` | Task management | "Follow-up required for client assessment" |
| `document` | Document uploads | "Care plan uploaded for John Doe" |
| `billing` | Billing events | "Invoice #1234 sent to client" |
| `compliance` | Compliance events | "Employee certification expired" |

## Status Types

| Status | Color | Usage |
|--------|-------|-------|
| `completed` | Green | Successful operations |
| `pending` | Gray | Awaiting action |
| `urgent` | Red | Requires immediate attention |
| `info` | Blue | Informational updates |

## Troubleshooting

### Dashboard not updating in real-time

1. **Check Supabase real-time status**:
   - Go to Supabase Dashboard → Database → Replication
   - Ensure tables are enabled for real-time

2. **Check browser console**:
   - Look for WebSocket connection errors
   - Verify Supabase client is initialized

3. **Verify environment variables**:
   - Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set

### Activities not appearing

1. **Check activity_log table**:
   ```sql
   SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 10;
   ```

2. **Verify API endpoint**:
   ```bash
   curl http://localhost:3000/api/dashboard/activities
   ```

3. **Check RLS policies**:
   - Ensure anon/authenticated users have SELECT permission on `activity_log`

### Statistics showing zero

1. **Check data exists**:
   ```sql
   SELECT COUNT(*) FROM clients WHERE is_archived = false;
   SELECT COUNT(*) FROM employees WHERE is_archived = false;
   ```

2. **Verify agency_id**:
   - Ensure all records have `agency_id` set
   - Run migration 026 backfill if needed

3. **Check API response**:
   ```bash
   curl http://localhost:3000/api/dashboard/stats
   ```

## Future Enhancements

- [ ] Add real-time notifications for urgent activities
- [ ] Implement activity filtering by type/status
- [ ] Add activity search functionality
- [ ] Create activity detail modal
- [ ] Add export functionality for activity logs
- [ ] Implement activity aggregation (e.g., "5 new clients this week")
- [ ] Add user preferences for activity feed (show/hide types)
- [ ] Implement real-time chart animations
- [ ] Add dashboard refresh button for manual updates
- [ ] Create dashboard customization options

## Performance Notes

- Real-time subscriptions use WebSocket connections (efficient)
- Activity feed limited to 10 most recent entries
- Statistics cached for 5 minutes in stores
- Indexes on all frequently queried columns
- Optimized queries with proper JOINs and aggregations

## Security Notes

- All API endpoints require authentication via `requireAuth`
- RLS policies enforce agency-level data isolation
- Activity logs include actor tracking for audit trail
- Sensitive data (SSN, etc.) never logged in activities
- Service role key only used server-side

## Related Files

- `lib/hooks/useSupabaseRealtime.ts` - Real-time subscription hooks
- `lib/activity-logger.ts` - Activity logging helpers
- `app/api/dashboard/stats/route.ts` - Dashboard statistics API
- `app/api/dashboard/activities/route.ts` - Activity log API
- `app/api/dashboard/visit-stats/route.ts` - Visit statistics API
- `supabase/migrations/034_create_activity_log.sql` - Activity log table
- `supabase/migrations/035_seed_activity_log.sql` - Sample data
