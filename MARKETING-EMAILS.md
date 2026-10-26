# Development email subscriptions

Registrations now contain a dedicated Notion paragraph beginning with ritty_marketing_subscription_v1:. This is the authoritative development-email subscription state. The other consent details are the historical signup record. No Notion schema migration is required.

## Sending

Use deliverMarketingEmail(pageId, locale, sendCallback) from lib/marketing-subscription.ts for every development-news recipient. The callback receives their personal unsubscribe URL; include it as the development-email unsubscribe link in the message footer. Do not bypass this check by sending from an old exported recipient list. The helper skips declined, withdrawn, test and legacy registrations. Storage errors stop sending rather than assuming consent.

No mail delivery provider or campaign sender is installed by this change. The callback must be connected to the chosen sender. This website does not automatically send emails yet.

Launch and pre-registration reward notices use a separate recipient workflow. Unsubscribing from development emails changes only the dedicated subscription paragraph; it never deletes or edits the registration, email, platform or original consent record. A provider-level global suppression or delivery failure must still be respected by any sender.

## Withdrawal

The signed URL opens /unsubscribe?lang=kr#credential. The recipient confirms once; no login or email entry is required. Opening the URL alone does not mutate state, protecting against link previews. POST /api/marketing/unsubscribe verifies its marketing-only signature and database membership, then changes the subscription state to false and records withdrawnAt. Repeated requests succeed without further changes. Invalid links and storage failures do not display a success message.

The credential is in the URL fragment to keep it out of HTTP access logs/referrers. Analytics are disabled on this page, which also has noindex and no-referrer metadata. Disable click tracking/link rewriting for this footer link in the chosen email provider, and preserve its fragment.

## Configuration

Uses existing NOTION_TOKEN and NOTION_PRE_REGISTER_DB_ID. Optional MARKETING_UNSUBSCRIBE_SECRET provides a separate stable signing key. Without it, NOTION_TOKEN is used for signing; rotating that token invalidates previously sent links. Set a stable dedicated secret before sending campaigns. NEXT_PUBLIC_SITE_URL optionally sets the link origin (default https://ritty.sam-meows.com).

Old registrations without the dedicated subscription state are excluded, even if they contain a historical marketing consent boolean. Never migrate them to subscribed without confirming consent scope.

## Verification

node scripts/check-marketing-subscription.cjs
npx tsc --noEmit

The offline test uses mocked Notion storage and sends no emails or live requests.
