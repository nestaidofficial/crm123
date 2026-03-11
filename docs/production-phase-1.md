# Production Phase 1: Foundation

**Goal:** Safe configuration and a clear “production” mode so the app can run with environment-specific config and basic security in place.

---

## 1. Environment and configuration

### 1.1 Create `.env.example`

Add a `.env.example` at the project root listing every variable the app (and future API) will need, with no real secrets. Example:

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (Phase 2)
# DATABASE_URL=postgresql://user:password@host:5432/nessacrm

# Auth (Phase 3)
# NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
# NEXTAUTH_URL=http://localhost:3000
```

- Document each variable in a comment.
- Copy to `.env.local` for local development and fill in real values (never commit `.env` or `.env.local`).

### 1.2 Single source of truth for env

- Add `lib/env.ts` (or `lib/config.ts`) that reads `process.env` and exports a typed config object.
- Validate required variables at app startup using Zod (or similar) so missing/invalid env fails fast with a clear error.
- Use different `.env` files per environment (e.g. `.env.development`, `.env.production`) where needed; ensure production secrets are never committed.

### 1.3 Checklist

- [x] `.env.example` created and documented
- [x] `lib/env.ts` (or equivalent) validates and exports config
- [x] Local dev runs with `.env.local`; production uses platform env (e.g. Vercel env vars)

---

## 2. Security basics

### 2.1 Security headers

Add security headers in `next.config.js` (or via middleware):

- **Content-Security-Policy (CSP):** Restrict script/style sources to your app and trusted CDNs.
- **Strict-Transport-Security (HSTS):** Force HTTPS in production.
- **X-Frame-Options:** Prevent clickjacking (e.g. `DENY` or `SAMEORIGIN`).
- **X-Content-Type-Options:** `nosniff` to reduce MIME sniffing.

Example in `next.config.js`:

```js
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
];

module.exports = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
```

### 2.2 API and HTTPS

- When API routes exist (Phase 2), ensure they validate and sanitize all inputs.
- In production, serve the app over HTTPS only (handled by the hosting platform).

### 2.3 Checklist

- [ ] Security headers added in `next.config.js`
- [ ] HTTPS enforced in production (via host)

---

## 3. Dependencies and audit

### 3.1 Dependency hygiene

- Run `npm audit` and fix critical/high vulnerabilities.
- Optionally pin dependency versions (remove `^`/`~`) in `package.json` for reproducible production builds.

### 3.2 Checklist

- [x] `npm audit` run and critical/high issues resolved
- [ ] (Optional) Versions pinned for production

---

## Deliverables summary

| Deliverable              | Description                                      |
|--------------------------|--------------------------------------------------|
| `.env.example`           | Documented env vars, no secrets                  |
| `lib/env.ts`             | Validated, typed config from env                 |
| `next.config.js` updates | Security headers                                 |
| Clean `npm audit`        | No critical/high vulnerabilities                 |

---

## Rough effort

**1–2 days** — can be done in parallel with early Phase 2 planning.
