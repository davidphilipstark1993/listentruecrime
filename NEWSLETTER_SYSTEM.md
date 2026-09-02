# Weekly Newsletter System

The **primary** workflow is manual curation — you personally pick the five podcasts each week. An **optional** automated discovery system also exists for possible future use, but it is not part of the weekly send path and requires no AI credits to leave switched off.

## PRIMARY WORKFLOW: manual weekly newsletter

You add podcasts yourself, at any point during the week, in `/admin/weekly-newsletter`. Every Sunday morning, a GitHub Action checks what you've approved and sends automatically — but **only if you've explicitly approved exactly 5 podcasts AND approved the newsletter as a whole for sending.** Otherwise it sends nothing and just emails you why.

This path never calls Anthropic. It only uses Supabase, SendGrid, and the fields you type in.

### Adding a podcast during the week

1. Go to `/admin/weekly-newsletter`. The page always shows "this week's" newsletter — whichever upcoming Sunday hasn't sent yet.
2. Click **Add Podcast** and fill in whatever you know: name (required), podcast URL, website, RSS URL, hosts, description, why you recommend it, private notes, your rating, artwork URL, and any extra info.
3. Click **Save**. You can add podcast #1 on Monday, #2 on Wednesday, etc. — each one saves independently.
4. If the name is a near-exact match to something already added this week, the save is blocked with an explanation. If it looks like it might already exist in the main LTC podcast database, you'll see an amber warning next to it — informational only, it won't block anything.

### Approving

Each podcast card has its own **Approve** button — click it once you're happy with that entry. The header shows **"X / 5 podcasts ready."**

Once exactly 5 are individually approved, an **"Approve for Sunday Sending"** button appears. That's the separate, explicit, whole-newsletter approval the Sunday job actually checks — approving individual podcasts alone is not enough to trigger a send.

**Important:** editing, removing, or adding a podcast after you've clicked "Approve for Sunday Sending" automatically drops the newsletter back out of the approved state. You'll need to re-click it. This is intentional — a last-minute edit can never sneak through without you re-confirming.

### Adding a podcast to the main directory (optional, separate action)

A podcast being in this week's newsletter does **not** automatically add it to the main Listen True Crime podcast directory — those are deliberately kept as two separate decisions. Each card has its own **"Add to Directory"** button if you want that specific podcast to also get a permanent LTC page; if it's already there, the card shows **"In directory — view page"** instead. The newsletter itself renders and sends perfectly using only your own supplied fields, whether or not any of the five are ever added to the directory.

### What happens Sunday morning

The GitHub Action (`weekly-newsletter-send.yml`, 08:00 UTC Sunday — 8am GMT in winter / 9am BST in summer) runs `scripts/newsletter/weekly-send.ts`, which:

- Finds this week's newsletter.
- Checks: is it explicitly approved for sending, AND are exactly 5 podcasts approved?
- **If yes:** builds the newsletter using only what you typed — linking to a directory page only for podcasts you've explicitly added there, otherwise linking straight to the podcast/website URL you supplied — sends it via SendGrid to all active subscribers, marks it sent, and emails you a confirmation with the subscriber count and SendGrid message id. It never creates directory entries itself.
- **If no:** sends nothing, creates no content, and emails you exactly why (how many podcasts are approved, whether the whole-newsletter approval is set).

You can also trigger this manually any time from GitHub → Actions → "Weekly Manual Newsletter Send" → Run workflow, instead of waiting for Sunday.

---

## OPTIONAL: automated AI-assisted discovery (not part of the weekly send)

This is a separate system that can search Podcast Index, research candidates, score them, and draft AI copy — kept available for possible future use, but it is **not** wired into the Sunday send in any way, and needs `ANTHROPIC_API_KEY` + Podcast Index credentials to do anything useful. If those aren't configured, this part simply does nothing; it has no effect on the manual workflow above.

### The big picture

Every Monday morning, a separate GitHub Action can run. It:

1. Searches Podcast Index for true crime podcasts.
2. Checks each one against podcasts already in the ListenTrueCrime database or previously discovered.
3. Researches each new candidate from its own RSS feed and Apple Podcasts listing (real data only — nothing is invented).
4. Scores each one (an internal editorial ranking, not an objective measurement).
5. Picks the top 10, and drafts blurb copy for the top 5 (using Anthropic, if configured).
6. Emails you (at the addresses in `ADMIN_EMAILS`) saying the review is ready.

**Nothing is ever sent to subscribers automatically from this path either.** It only ever prepares a draft in `/admin/newsletter-issues`, entirely separate from the manual `/admin/weekly-newsletter` flow above.

### How to review and approve a discovery-based newsletter issue

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
| `PODCASTINDEX_API_KEY`, `PODCASTINDEX_API_SECRET` | *(Optional — auto-discovery only, not needed for the manual weekly send)* | GitHub Actions secrets only |
| `ANTHROPIC_API_KEY` | *(Optional — auto-discovery blurb drafting only, not needed for the manual weekly send)* | GitHub Actions secrets only |
| `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL` | Already exists — also needed by the GitHub Action | GitHub Actions secrets (copy of what's already in Vercel) |
| `ADMIN_EMAILS` | Already exists — receives the "review ready" email | Already set in Vercel; copy to GitHub Actions secrets too |

## How the GitHub Action is wired

`.github/workflows/weekly-discovery.yml` runs `npx tsx scripts/discovery/index.ts` on a schedule (Monday 07:00 UTC) or on demand via "Run workflow" in the Actions tab. All scripts live in `scripts/discovery/` and only ever write to `podcast_discoveries` and `newsletters` (status up to `review`) plus send you the notification email — sending to subscribers is a separate, manual step you trigger from the admin UI.
