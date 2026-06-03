# ListenTrueCrime.com

True crime podcast discovery and review platform. Find your next obsession.

**Stack**: Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase

---

## Quick start (local dev)

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment checklist

### 1 — Supabase project setup

1. Create a project at [supabase.com](https://supabase.com)
2. In the SQL editor, run the migrations **in order**:
   - `supabase/migrations/001_schema.sql` — tables, RLS, search trigger
   - `supabase/migrations/002_seed.sql` — 10 sample podcasts
3. Copy credentials from **Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY`

#### Email auth (magic link)

1. Supabase Dashboard → **Authentication → Providers → Email** → ensure enabled
2. Dashboard → **Authentication → URL Configuration**:
   - **Site URL**: `https://listentruecrime.com` (or `http://localhost:3000` for dev)
   - **Redirect URLs**: add `https://listentruecrime.com/auth/callback`

#### Google OAuth (optional)

Only needed if you want Google sign-in. If not configured the button in the auth
modal will show a helpful fallback message directing users to use email instead.

1. [Google Cloud Console](https://console.cloud.google.com) → create OAuth 2.0 client
2. Authorised redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
3. Supabase → **Authentication → Providers → Google** → paste Client ID + Secret

---

### 2 — Environment variables

Fill in `.env.local` (see `.env.example` for all keys):

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | From Supabase Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Admin server actions outside RLS |
| `NEXT_PUBLIC_SITE_URL` | ✅ prod | Used in sitemap + OG tags |
| `NEWSLETTER_PROVIDER` | Optional | `supabase` (default) \| `beehiiv` \| `convertkit` \| `mailchimp` |

---

### 3 — Make yourself admin

After signing in once via the site (magic link), run this in the Supabase SQL editor:

```sql
-- Find your user ID
SELECT id, email FROM auth.users;

-- Grant admin
UPDATE profiles SET is_admin = true WHERE id = '<your-user-id>';
```

Then visit `/admin` to access the dashboard.

---

### 4 — Import all 100 podcasts

1. Ensure you are signed in and have admin access (step 3 above)
2. Go to `/admin/import`
3. Upload `true_crime_podcast_database_ENRICHED.csv` from the TCP folder on your Desktop
4. Click **Import 100 rows** — you should see "100 podcasts imported / updated"

The import is **idempotent** — re-uploading updates existing rows rather than creating
duplicates (upsert on `slug`). Safe to run multiple times.

If you see a **403 error**: your user is not marked as admin yet — do step 3 first.
If you see a **401 error**: you are not signed in.

---

### 5 — Vercel deployment

```bash
# Push to GitHub first
git init
git add .
git commit -m "initial commit"
gh repo create listentruecrime --public --push
```

Then:
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Framework preset: **Next.js** (auto-detected)
4. Add all environment variables from your `.env.local`
5. Click **Deploy**

Vercel auto-deploys on every push to `main`.

---

### 6 — Custom domain (listentruecrime.com)

#### In Vercel
1. Project → **Settings → Domains**
2. Add `listentruecrime.com` and `www.listentruecrime.com`
3. Vercel shows the DNS records you need to add

#### In your DNS provider (Namecheap / Cloudflare / etc.)

| Type | Name | Value |
|---|---|---|
| `A` | `@` | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

DNS propagates in 5–60 minutes. Vercel provisions SSL automatically.

#### Update Supabase after domain is live

Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://listentruecrime.com`
- **Redirect URLs**: add `https://listentruecrime.com/auth/callback`

Update `NEXT_PUBLIC_SITE_URL` in Vercel env vars to `https://listentruecrime.com` and trigger a redeploy.

---

## Project structure

```
app/
  page.tsx                    # Homepage
  browse/page.tsx             # Search & filter
  podcasts/[slug]/page.tsx    # Podcast detail
  category/[slug]/page.tsx    # Category pages
  country/[country]/page.tsx  # Country pages
  platform/[platform]/page.tsx
  best-true-crime-podcasts/   # SEO landing page
  about/page.tsx
  admin/                      # Admin panel (protected by middleware)
  api/                        # Route handlers
  auth/callback/route.ts      # Supabase magic-link callback
  sitemap.ts                  # Dynamic XML sitemap
  robots.ts

components/
  layout/                     # Header + footer
  auth/                       # Auth modal + user menu
  newsletter/newsletter-form.tsx
  podcasts/                   # PodcastCard, RatingWidget, ReviewForm
  admin/                      # CsvImporter, PodcastForm, ReviewQueue

lib/
  supabase/client.ts          # Browser client
  supabase/server.ts          # Server client (request-scoped, uses cookies)
  supabase/admin.ts           # Service-role client
  types/database.ts           # Types + CATEGORIES / PLATFORMS / COUNTRIES
  utils.ts

supabase/
  migrations/001_schema.sql
  migrations/002_seed.sql
```

---

## Newsletter providers

Set `NEWSLETTER_PROVIDER` in your env:

| Value | Keys needed |
|---|---|
| `supabase` (default) | None — stores in `newsletter_subscribers` table |
| `beehiiv` | `BEEHIIV_API_KEY`, `BEEHIIV_PUBLICATION_ID` |
| `convertkit` | `CONVERTKIT_API_KEY`, `CONVERTKIT_FORM_ID` |
| `mailchimp` | `MAILCHIMP_API_KEY`, `MAILCHIMP_LIST_ID`, `MAILCHIMP_SERVER_PREFIX` |

All providers also log to Supabase regardless of which is active.
