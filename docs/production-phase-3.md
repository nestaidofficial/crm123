# Production Phase 3: Authentication and Authorization

**Goal:** Real login, session, and protected app so only authenticated users can access the dashboard and API.

---

## 1. Auth provider

### 1.1 Choose a provider

Pick one:

- **NextAuth.js** — Full control, DB-backed sessions, Credentials or OAuth (Google, etc.).
- **Clerk** — Hosted UI and API; less code, subscription cost.
- **Supabase Auth** — Good if you use Supabase for DB; built-in email/OAuth.

### 1.2 Implement login

- Replace the stub in `app/login/page.tsx`:
  - On submit, call the auth provider (e.g. `signIn` with credentials or redirect to OAuth).
  - On success, create a session and redirect to `/dashboard` (or intended URL).
- Implement “Forgot password” if using email/password (provider-specific flow).
- Optional: Sign-up page and email verification if you need self-service registration.

### 1.3 Session

- Session should include at least: user id, email, name (and optionally role).
- Store session in a cookie (or JWT) and validate on each request; use the provider’s helpers (e.g. `getServerSession`, `getToken`).

### 1.4 Checklist

- [ ] Auth provider integrated (NextAuth / Clerk / Supabase Auth)
- [ ] Login (and optional sign-up / forgot password) working
- [ ] Session created on login and available server-side

---

## 2. Middleware and protected routes

### 2.1 Next.js middleware

- Add `middleware.ts` at the project root (or under `src` if using `src/`).
- In middleware:
  - If the path is public (e.g. `/login`, `/api/auth/*`, `/_next/*`, static assets), allow the request.
  - Otherwise, check for a valid session (e.g. get token/session from cookie).
  - If no valid session, redirect to `/login` (and optionally set `?callbackUrl=` to the current path for post-login redirect).
- Use the auth provider’s middleware helpers if available (e.g. NextAuth’s `withAuth`).

### 2.2 Route list

- **Public:** `/login`, auth callbacks, `/_next/*`, `/favicon.ico`, etc.
- **Protected:** Everything else (e.g. `/`, `/dashboard`, `/clients`, `/schedule`, `/hr`, `/tasks`, etc.).

### 2.3 Checklist

- [ ] `middleware.ts` redirects unauthenticated users to `/login`
- [ ] Authenticated users can reach dashboard and app routes
- [ ] Optional: `callbackUrl` preserves intended destination after login

---

## 3. API authorization

### 3.1 Require auth on every API route

- In each API route that touches data (clients, employees, tasks, schedule):
  - Read the session (e.g. `getServerSession()` for NextAuth, or provider’s API).
  - If no session, return **401 Unauthorized** with a consistent JSON body (e.g. `{ error: "Unauthorized" }`).
- Optionally attach `userId` (and role) to the request context so you can filter data by tenant/user later.

### 3.2 Role-based access (optional)

- If you have roles (e.g. admin, coordinator, caregiver):
  - Store role in session or DB and load it in API routes.
  - For destructive or sensitive actions (e.g. delete client, edit employee), check role and return **403 Forbidden** if not allowed.

### 3.3 Checklist

- [ ] All data API routes check session and return 401 when not authenticated
- [ ] (Optional) Role checks and 403 where needed

---

## 4. UI: user and logout

### 4.1 Navbar / profile

- In `components/layout/navbar.tsx` (or equivalent):
  - Get current user from session (e.g. via `useSession` or provider’s hook).
  - Replace hardcoded “John Doe” / “john.doe@nessacrm.com” with session user name and email.
  - “Log out” button: call provider’s sign-out (e.g. `signOut()`), then redirect to `/login`.

### 4.2 Optional: profile page

- Add a profile/settings page (e.g. under `/settings`) to show user info and optionally change password or linked accounts.

### 4.3 Checklist

- [ ] Navbar shows current user and working “Log out”
- [ ] No hardcoded user in header

---

## 5. Environment and security

### 5.1 Env vars

- Add to `.env.example` and set in production:
  - **NextAuth:** `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (and OAuth client id/secret if used).
  - **Clerk:** `NEXT_PUBLIC_CLERK_*` and server keys as per docs.
  - **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or anon key) as per docs.

### 5.2 Secrets

- Generate a strong secret for session signing (e.g. `openssl rand -base64 32` for NextAuth). Never commit secrets; use platform env (e.g. Vercel env vars).

### 5.3 Checklist

- [ ] Auth-related env vars documented in `.env.example` and set in production
- [ ] Session secret strong and not committed

---

## Deliverables summary

| Deliverable           | Description                                      |
|-----------------------|--------------------------------------------------|
| Auth provider         | NextAuth / Clerk / Supabase Auth integrated      |
| Login (and optional sign-up / forgot password) | Working flow                    |
| Middleware            | Protects app routes; redirects to `/login`       |
| API auth              | 401 on missing/invalid session for data routes   |
| Navbar                | Current user + logout                            |

---

## Rough effort

**3–5 days** — after Phase 2 so API routes exist to protect.
