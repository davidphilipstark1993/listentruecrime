# "Rate the podcasts you know" email: notes

Campaign: `rate-podcasts-oct26`
Files: `rate-podcasts-email.html` (HTML version), `rate-podcasts-email.txt` (plain-text version)

## Subject lines (pick one)

1. Which of these have you listened to?
2. A small favour: rate the shows you know
3. Help the next listener find a good podcast

## Preview text

> Takes a minute per show, no account needed. Only rate what you've actually heard.

Paste this into the Single Send's preview text field too. The HTML version already has it as hidden text at the top, but SendGrid's own field takes priority in some inboxes.

## Do not send until

1. **Anonymous ratings count.** Run `supabase/migrations/016_count_anonymous_ratings.sql` in the Supabase SQL editor, after the code that handles anonymous rows is deployed. Then check it: open a podcast page in a private or incognito window, rate it without signing in, and refresh after a few seconds. The "Community ratings" count on that page should go up by one.
2. **The `#rate` anchor is live.** It's already deployed: every link in the email ends in `#rate` and jumps straight to the "Rate this podcast" box.
3. **Subscribers are in sync with SendGrid.** A Single Send goes to your SendGrid list, not the Supabase table. In `/admin/newsletter`, click **Retry SendGrid sync** if any subscribers show as "Pending".

## SendGrid Single Send setup

- **Design:** use the **Code Editor** and paste in the full HTML file. Paste the `.txt` file into the plain-text tab. Turn off "auto-generate plain text" if it's on, or your version will be overwritten.
- **Unsubscribe:** the footer uses `{{{unsubscribe}}}` and `{{{unsubscribe_preferences}}}`, the tags Single Sends expect. In the Single Send settings, choose the **same unsubscribe group** your weekly newsletter uses. The site's code reads it from the `SENDGRID_UNSUBSCRIBE_GROUP_ID` environment variable, so you can match the ID shown in SendGrid against that. This keeps unsubscribes consistent across all your emails.
- **Sender address:** the footer uses `{{Sender_Name}}`, `{{Sender_Address}}`, `{{Sender_City}}`, `{{Sender_State}}` and `{{Sender_Zip}}`. SendGrid fills these from the sender identity you pick. If your sender has no state (normal for UK addresses), that tag comes out blank, which is fine. Check the test email looks tidy.
- **First name:** the greeting is `Hi {{#if first_name}}{{first_name}}{{else}}there{{/if}},`. The site sends first names to SendGrid when someone gives one, so most people will get "Hi there". That's intended.
- **Sender:** send from `info@listentruecrime.com` as usual, so replies reach you.
- **Click tracking:** SendGrid rewrites links for click tracking. UTM parameters survive this, so Google Analytics will still show the campaign.

## Before you press send

- [ ] Send a test to yourself. Check it in Gmail on your phone and on desktop. Check every **Rate it →** link and the main button.
- [ ] Check the 10 one-line descriptions read the way you'd describe each show. I wrote them from general knowledge of the shows, not from your site's reviews.
- [ ] Check the plain-text version in the test as well.
- [ ] Check the unsubscribe link works on the test.

## Why these 10 shows

There are **717 published podcasts** (from the live sitemap). That's far too many to list, so the email names 10 widely heard shows. People are more likely to rate what they recognise. All 10 pages were checked as live:

| Show | Page |
|---|---|
| Serial | /podcasts/serial |
| Casefile True Crime | /podcasts/casefile-true-crime |
| RedHanded | /podcasts/redhanded |
| Murder Mile UK True Crime | /podcasts/murder-mile-uk-true-crime |
| The Teacher's Pet | /podcasts/the-teachers-pet |
| Crime Junkie | /podcasts/crime-junkie |
| My Favorite Murder | /podcasts/my-favorite-murder |
| S-Town | /podcasts/s-town |
| Dr. Death | /podcasts/dr-death |
| In the Dark | /podcasts/in-the-dark |

There's a mix of UK, US and Australian shows, with two UK shows near the top. The main button sends everyone else to `/browse` to find any show they've heard.

## After sending

- Ratings appear on a podcast's page within a few seconds once the fix is live.
- To measure the campaign, filter Google Analytics on `utm_campaign=rate-podcasts-oct26`. To count ratings, run `select count(*) from ratings where created_at > '<send time>'` in Supabase. Anonymous ratings are the rows with an empty `user_id`.
- Each connection is limited to 40 anonymous ratings an hour. A household sharing broadband won't reach that, but very large shared networks such as a university could. If anyone reports a "Too many ratings" message, that's the cause.
