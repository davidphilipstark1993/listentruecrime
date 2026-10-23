# "Link to us" podcast outreach: notes

Campaign: `podcast-backlinks-oct26`
Files: `podcast-backlinks-email.html`, `podcast-backlinks-email.txt`

## What it asks / offers

Asks each podcast to link to www.listentruecrime.com from their site or show notes. In return they choose:

- **Option A:** a featured spot in the Trending section on the homepage
- **Option B:** a feature in the newsletter

Each option is a button that opens a pre-filled reply to info@listentruecrime.com ("Option A - Trending" / "Option B - Newsletter"), so you can filter replies by subject.

## Check before sending

1. **Trending only has 5 slots.** `app/page.tsx` shows `TRENDING_COUNT = 5` featured podcasts, picked by `is_featured` and `binge_factor`. If many shows say yes to Option A, you can't give them all a slot at once. Either rotate the five (and tell them the feature is time-limited), or reword Option A to "a spot in our Trending rotation". Decide before sending, so the email doesn't promise more than the homepage can show.
2. **Merge tags.** The template uses `{{podcast_title}}` and `{{podcast_url}}`. These are SendGrid custom fields, created by `scripts/outreach/sendgrid-import.mjs`. Both have fallbacks ("there" / generic wording) for contacts where they're empty.
3. **Separate list and unsubscribe group.** Use the "Podcast backlink outreach (Oct 2026)" list, not your newsletter list, and pick a different unsubscribe group from the newsletter's. Cold outreach gets more spam complaints than newsletter mail; keeping it apart protects the newsletter's deliverability.
4. **Send a small batch first** (20-30 addresses), check bounces and replies, then send the rest. Single Sends can target a segment.
5. **Test email.** Send to yourself, check the two buttons open a correctly addressed reply, and check the unsubscribe link.

## About the addresses

Contacts come from each show's own RSS feed (`<itunes:email>`, `<managingEditor>`, `<webMaster>`), which is the address publishers list for contact. Notes:

- Some are network or platform addresses (e.g. a hosting company's metadata mailbox) rather than the show's team. Skim `podcast-contacts.csv` for repeated domains before importing.
- Shows with no confident match or no email in the feed are in `unmatched.csv`. These need a manual search on their website.
- UK/EU rules (PECR/GDPR) allow business-to-business outreach to a role address at a company, but are stricter for individuals and sole traders using personal addresses. Keep the message relevant, identify yourself, and honour unsubscribes straight away.

## Steps

1. `node scripts/outreach/harvest-contacts.mjs outreach-data` (already run; resumable)
2. Review `outreach-data/podcast-contacts.csv`
3. `SENDGRID_API_KEY=... node scripts/outreach/sendgrid-import.mjs outreach-data/podcast-contacts.csv --apply`
4. In SendGrid: new Single Send -> Code Editor -> paste the HTML; paste the .txt in the plain-text tab; pick the new list and unsubscribe group; send a test; then schedule.
