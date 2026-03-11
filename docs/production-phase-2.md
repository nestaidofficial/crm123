# Production Phase 2: Backend and Data

**Goal:** Replace localStorage with a real backend and database. Keep Zustand as the UI layer that talks to the API so the app has persistent, multi-device data.

---

## 1. Database

### 1.1 Choose and provision database

- Use **PostgreSQL** (e.g. Vercel Postgres, Supabase, Neon, or self-hosted/RDS).
- Create a database and obtain `DATABASE_URL` (add to `.env.example` and `.env.local`).

### 1.2 Schema and ORM

- Use **Prisma** (or another ORM) and define schemas for:
  - **clients** — align with `SavedClient` / client form schema (id, careType, firstName, lastName, dob, gender, phone, email, address, primaryContact, emergencyContact, notes, etc.).
  - **employees** — align with `Employee` from `app/hr/mockEmployees.ts` (id, firstName, lastName, role, status, phone, email, avatar, etc.).
  - **tasks** — align with `Task` from `app/tasks/mockTasks.ts` (id, title, description, status, category, assignees, etc.).
  - **schedule_events** — id, title, startTime, endTime, day, date, client_id, caregiver_id, color, etc.
- Add relations (e.g. task assignees, event → client/employee) as needed.
- Run `prisma migrate dev` to create migrations; commit migration files.

### 1.3 Migrations in deploy

- In CI/CD and production deploy, run `prisma migrate deploy` after build so the DB is up to date.

### 1.4 Checklist

- [ ] PostgreSQL provisioned and `DATABASE_URL` set
- [ ] Prisma schema for clients, employees, tasks, schedule_events
- [ ] Migrations created and run locally
- [ ] Deploy pipeline runs `prisma migrate deploy`

---

## 2. API layer

### 2.1 Next.js API routes

Add routes under `app/api/`:

| Resource   | List/Create              | Get/Update/Delete              |
|-----------|---------------------------|---------------------------------|
| Clients  | `GET/POST /api/clients`  | `GET/PATCH/DELETE /api/clients/[id]`  |
| Employees | `GET/POST /api/employees`| `GET/PATCH/DELETE /api/employees/[id]` |
| Tasks     | `GET/POST /api/tasks`     | `GET/PATCH/DELETE /api/tasks/[id]`     |
| Schedule  | `GET/POST /api/schedule/events` | `GET/PATCH/DELETE /api/schedule/events/[id]` |

### 2.2 Request/response contract

- **List (GET):** Return JSON array; optional query params for filter/pagination later.
- **Create (POST):** Parse JSON body, validate with Zod, insert in DB, return 201 and created resource.
- **Get one (GET):** Return 200 and resource or 404.
- **Update (PATCH):** Parse body, validate, update in DB, return 200 and updated resource or 404.
- **Delete (DELETE):** Delete in DB, return 204 or 404.

Use consistent error shape (e.g. `{ error: string, code?: string }`) and status codes (400 validation, 404 not found, 500 server error).

### 2.3 Validation

- Reuse Zod schemas from `app/clients/forms/schema.ts` (and define DTOs for employees, tasks, events) and validate in each route. Return 400 with validation errors when invalid.

### 2.4 Checklist

- [ ] All CRUD routes implemented for clients, employees, tasks, schedule events
- [ ] Request bodies validated with Zod
- [ ] Consistent JSON and error response format

---

## 3. Frontend: wire stores to API

### 3.1 Clients (`useClientsStore`)

- **hydrate:** Call `GET /api/clients`, set `clients` in store (replace localStorage read).
- **addClient:** Call `POST /api/clients`, then append to store or re-fetch.
- **updateClient:** Add; call `PATCH /api/clients/[id]`, then update store or re-fetch.
- **deleteClient:** Add; call `DELETE /api/clients/[id]`, then remove from store or re-fetch.
- Remove `getJSON`/`setJSON` for clients; keep draft in localStorage if desired.

### 3.2 Employees (`useEmployeesStore`)

- **hydrate:** Call `GET /api/employees`, set `employees` in store.
- **addEmployee:** Call `POST /api/employees`, update store.
- **updateEmployee:** Call `PATCH /api/employees/[id]`, update store.
- **deleteEmployee:** Add; call `DELETE /api/employees/[id]`, update store.
- Remove localStorage persistence for employees.

### 3.3 Tasks (`useTasksStore`)

- **hydrate:** Call `GET /api/tasks`, set `tasks` in store.
- **addTask / updateTask / deleteTask / moveTask:** Call corresponding API, then update store (or re-fetch).
- Remove localStorage persistence for tasks.

### 3.4 Schedule events

- **New store or hook:** e.g. `useScheduleStore` or `useScheduleEvents` that:
  - Loads events from `GET /api/schedule/events` (optional query: week range, etc.).
  - Provides create (POST), update (PATCH), delete (DELETE) and updates local state.
- In `components/schedule/weekly-calendar-view.tsx`, replace in-memory `useState(sampleEvents)` with this store/hook so events persist across refresh and devices.

### 3.5 API client (optional)

- Add `lib/api.ts` (or similar) with typed helpers (e.g. `api.get('/api/clients')`, `api.post('/api/clients', body)`) and centralize base URL and error handling. Use from stores.

### 3.6 Checklist

- [ ] Clients store uses API; updateClient and deleteClient implemented
- [ ] Employees store uses API; deleteEmployee implemented
- [ ] Tasks store uses API
- [ ] Schedule events persisted via API and new store/hook; calendar uses it
- [ ] (Optional) `lib/api.ts` client in place

---

## 4. Server-side validation and errors

- Every API route that accepts body or query must validate with Zod (or equivalent) and return 400 with a clear payload on failure.
- Catch DB and unexpected errors in routes; log them; return 500 with a generic message (no stack traces to client).

---

## Deliverables summary

| Deliverable              | Description                                           |
|--------------------------|-------------------------------------------------------|
| PostgreSQL + Prisma      | Schema for clients, employees, tasks, schedule_events |
| Migrations               | Created and run in deploy                             |
| API routes               | Full CRUD for all four resources                      |
| Store refactors          | All stores call API instead of localStorage           |
| Schedule persistence     | Events in DB and calendar using store/hook            |

---

## Rough effort

**1–2 weeks** — core of production readiness; can overlap with Phase 1.
