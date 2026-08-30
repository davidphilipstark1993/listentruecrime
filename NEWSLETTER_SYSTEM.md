# Weekly Newsletter & Podcast Discovery System

How the automated weekly newsletter works, written for a non-developer running the day-to-day.

## The big picture

Every Monday morning, a GitHub Action runs automatically. It:

1. Searches Podcast Index for true crime podcasts.
2. Checks each one against podcasts already in the ListenTrueCrime database or previously discovered.
3. Researches each new candidate from its own RSS feed and Apple Podcasts listing (real data only — nothing is invented).
4. Scores each one (an internal editorial ranking, not an objective measurement).
5. Picks the top 10, and drafts blurb copy for the top 5.
6. Emails you (at the addresses in `ADMIN_EMAILS`) saying the review is ready.

**Nothing is ever sent to subscribers automatically.** The system only ever prepares a draft for you to review.

## How to review and approve a newsletter issue

1. Go to `/admin/newsletter-issues` and open the new issue.
2. For each of the 5 featured podcasts you'll see: artwork, score, hosts (or a note saying they couldn't be verified), pros/cons, sources, and a drafted blurb.
3. **Edit** any blurb directly in the text box — it saves automatically when you click away.
4. **Replace** a slot using the dropdown if you'd rather feature a different candidate from the shortlist — this redrafts that slot's blurb automatically.
5. Once all 5 slots have a blurb you're happy with, click **Approve issue**. This generates the final email HTML and creates a live ListenTrueCrime page for any featured podcast that doesn't already have one.
6. Click **Send to subscribers** when you're ready. You'll get a confirmation prompt first — this is the only irreversible step in the whole process.

## How to reject a discovered podcast

Open it from `/admin/discoveries`, optionally add a reason, and click **Reject**. It won't be suggested again (the dedupe check treats it as already-seen going forward).

## How subscribers are stored and synced

- Every signup (from any form on the site) is saved to the `newsletter_subscribers` table first — this always succeeds, even if SendGrid is down.
- If `NEWSLETTER_PROVIDER=sendgrid`, the subscriber is also pushed to your SendGrid Marketing Contacts list. If that push fails, it's logged and the subscriber stays marked "Pending" — nothing is lost.
- On `/admin/newsletter`, you'll see a **Retry SendGrid sync** button whenever there are pending subscribers — click it to retry all of them at once.
- When someone unsubscribes or bounces in SendGrid, a webhook (`/api/webhooks/sendgrid`) updates their status here automatically, so future sends skip them.

## Running discovery manually

Instead of waiting for Monday, go to the **Actions** tab on GitHub, select "Weekly Podcast Discovery," and click **Run workflow**. It runs the exact same process on demand.

## Troubleshooting

**Discovery found nothing / very few candidates.**
Check the Action's run log (GitHub → Actions → the failed/empty run). Common causes: `PODCASTINDEX_API_KEY`/`PODCASTINDEX_API_SECRET` missing or wrong, or Podcast Index rate limits. The run still completes and emails you even with zero new candidates.

**A candidate has "Host(s) could not be verified" or other gaps.**
This is expected and intentional — the system never invents facts it can't confirm from the podcast's own RSS feed. You can still feature it; just note the gap in your edited blurb if relevant.

**Blurbs read generically / template-like.**
This means `ANTHROPIC_API_KEY` wasn't set for that run, so the system fell back to a plain template instead of an LLM-drafted blurb. Add the key as a GitHub Actions secret and re-run.

**SendGrid sync shows "Pending" for subscribers.**
Check `SENDGRID_API_KEY` and `SENDGRID_LIST_ID` are set correctly in Vercel, then use the **Retry SendGrid sync** button on `/admin/newsletter`.

**Approve fails with a podcast-page-creation error.**
Usually a slug collision or a required field missing on the discovery record — check the specific error message returned, it names the podcast and the Supabase error.

## Required environment variables

See `.env.example` for the full list with comments. In short:

| Variable | Needed for | Where to set it |
|---|---|---|
| `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`, `SENDGRID_LIST_ID` | Subscriber sync, welcome email, sending issues | Vercel (all environments) + GitHub Actions secrets |
| `SENDGRID_UNSUBSCRIBE_GROUP_ID` | One-click unsubscribe on sent emails | Vercel |
| `SENDGRID_WEBHOOK_VERIFICATION_KEY` | Verifying SendGrid's unsubscribe/bounce webhook | Vercel |
| `NEWSLETTER_PROVIDER=sendgrid` | Makes SendGrid the active provider | Vercel |
| `PODCASTINDEX_API_KEY`, `PODCASTINDEX_API_SECRET` | Weekly discovery search | GitHub Actions secrets only |
| `ANTHROPIC_API_KEY` | LLM-drafted blurb copy | GitHub Actions secrets only |
| `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL` | Already exists — also needed by the GitHub Action | GitHub Actions secrets (copy of what's already in Vercel) |
| `ADMIN_EMAILS` | Already exists — receives the "review ready" email | Already set in Vercel; copy to GitHub Actions secrets too |

## How the GitHub Action is wired

`.github/workflows/weekly-discovery.yml` runs `npx tsx scripts/discovery/index.ts` on a schedule (Monday 07:00 UTC) or on demand via "Run workflow" in the Actions tab. All scripts live in `scripts/discovery/` and only ever write to `podcast_discoveries` and `newsletters` (status up to `review`) plus send you the notification email — sending to subscribers is a separate, manual step you trigger from the admin UI.
