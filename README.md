# ListenTrueCrime.com

A production-ready true crime podcast discovery and review platform. Find your next obsession.

## Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Database / Auth**: Supabase (PostgreSQL + Row Level Security + Auth)
- **Styling**: Tailwind CSS with custom design system
- **Deployment**: Vercel

## Local setup

### 1. Clone & install

```bash
git clone <your-repo>
cd listentruecrime
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. In the SQL editor, run the migrations in order:
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_seed.sql`
3. Enable Google Auth (optional): Dashboard → Authentication → Providers → Google

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in your `.env.local`:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (secret) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` (dev) |
| `ADMIN_EMAILS` | Comma-separated emails for admin access |
| `NEWSLETTER_PROVIDER` | `supabase`, `beehiiv`, `convertkit`, or `mailchimp` |

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Making yourself an admin

After signing in once, run this in the Supabase SQL editor:

```sql
UPDATE profiles SET is_admin = true WHERE id = '<your-user-id>';
```

Then visit `/admin` to access the dashboard.

## Newsletter providers

Set `NEWSLETTER_PROVIDER` in your env to one of:

- `supabase` — stores emails in the `newsletter_subscribers` table only (no external provider)
- `beehiiv` — requires `BEEHIIV_API_KEY` and `BEEHIIV_PUBLICATION_ID`
- `convertkit` — requires `CONVERTKIT_API_KEY` and `CONVERTKIT_FORM_ID`
- `mailchimp` — requires `MAILCHIMP_API_KEY`, `MAILCHIMP_LIST_ID`, `MAILCHIMP_SERVER_PREFIX`

All providers also log subscriptions to Supabase.

## Importing podcasts from CSV

1. Go to `/admin/import`
2. Upload a CSV with these columns (flexible naming):
   - `podcast_name` / `title`
   - `what_is_it_about` / `description`
   - `who_is_it_for` / `short_description`
   - `case_types` (comma-separated)
   - `format` / `format_type`
   - `tone` / `factual_style`
   - `binge_factor_1_10`
   - `quick_verdict`
   - `country` (ISO code: US, GB, AU, CA…)
   - `platforms` (comma-separated)
   - `image_url`

Existing slugs are updated, new slugs are inserted.

## Deployment (Vercel)

1. Push to GitHub
2. Import repository in Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy

In Supabase, add your Vercel production URL to:
- Authentication → URL Configuration → Site URL
- Authentication → URL Configuration → Redirect URLs: `https://your-domain.com/auth/callback`

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
  admin/                      # Admin panel (protected)
  api/                        # API routes
  auth/callback/route.ts      # Supabase auth callback
  sitemap.ts
  robots.ts

components/
  layout/header.tsx
  layout/footer.tsx
  auth/auth-modal.tsx
  auth/user-menu.tsx
  newsletter/newsletter-form.tsx
  podcasts/podcast-card.tsx
  podcasts/rating-widget.tsx
  podcasts/review-form.tsx
  admin/csv-importer.tsx
  admin/podcast-form.tsx
  admin/review-queue.tsx

lib/
  supabase/client.ts          # Browser client
  supabase/server.ts          # Server client
  supabase/admin.ts           # Service-role client
  types/database.ts           # TypeScript types + constants
  utils.ts                    # Helper functions

supabase/
  migrations/001_schema.sql   # Full schema + RLS
  migrations/002_seed.sql     # 10 sample podcasts
```
