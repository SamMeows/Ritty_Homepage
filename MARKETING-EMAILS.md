# Development email subscriptions

The contact source of truth is the existing Notion pre-registration database. The Gmail campaign workflow is documented in [docs/gmail-newsletter.md](docs/gmail-newsletter.md).

## Eligibility

A paragraph beginning with `ritty_marketing_subscription_v1:` is the authoritative development-email subscription state. A record is excluded when this state is declined, withdrawn, or marked as a test. Invalid or contradictory state stops processing; it is never interpreted as permission.

When no dedicated state exists, eligibility requires **one** of:

- The exact historical `Consent Version` value `2026-10` or `2026-10-new-launch`. The operator confirmed that these two forms required marketing consent. A missing/false modern checkbox on these historical registrations is not treated as a withdrawal.
- An explicit `Marketing Consent` checkbox value of `true`.

No other missing or historical consent is assumed to mean yes. There is no bulk checkbox migration.

Archived/out-of-scope pages, invalid emails, unknown locales, test UTM metadata (`internal_test` / `registration_qa`), body `registration_test: true`, and an optional `Email Suppressed` checkbox set to true are excluded. Add that checkbox to the contact database when operational suppression is needed. A dedicated current withdrawal always overrides historical eligibility.

## Sender integration

`listMarketingCandidates(locale)` returns a paginated, property-only estimate as `{ pageId, email, locale }` records. It does not read every subscription paragraph and its preview count is not a promise of final deliveries. Duplicate email records remain separate for the worker to reconcile.

Use `getMarketingRecipient(pageId)` immediately before each Gmail request. It verifies database membership, reads all top-level subscription-state pages, and rechecks current email, locale, consent, withdrawal, test and suppression state. Storage errors stop sending. `deliverMarketingEmail(pageId, locale, sendCallback)` preserves the same fresh check for another sender integration.

The campaign worker uses this check and durable delivery records. Each Gmail request has exactly one To address. Launch/reward notifications follow their separate workflow; marketing withdrawal does not cancel the pre-registration or remove its email/platform/history.

## Withdrawal links

The visible footer link from `marketingUnsubscribeUrl(pageId, locale)` opens `/unsubscribe?lang=kr#credential`. The recipient confirms once without a login or email entry. Opening the page alone does not mutate consent. The fragment keeps this credential out of normal HTTP access logs and referrers. Preserve the fragment and do not add click tracking to this link.

`marketingOneClickUnsubscribeUrl(pageId, locale)` supplies a separate HTTPS URL for the `List-Unsubscribe` header. The sender also sets `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.

`POST /api/marketing/unsubscribe` accepts either:

- Existing page flow: JSON `{ "token": "signed-credential" }`.
- Mail-client flow: `application/x-www-form-urlencoded` body `List-Unsubscribe=One-Click`, with the signed token in the URL query.

GET returns 405 and does not write. Request bodies are limited to 2 KiB. The endpoint derives the contact from the signed token, validates its database membership, and never accepts an arbitrary email address to unsubscribe. Invalid tokens return 400; storage errors return 503 rather than a success message.

The authoritative false/withdrawn state is persisted **before** the `Marketing Consent` display checkbox is synchronized. A legacy contact receives a dedicated withdrawal paragraph on its first unsubscribe. Repeated successful requests are idempotent. Failed checkbox synchronization cannot restore consent.

After persisting the token's contact, the endpoint scans the contact database with pagination and propagates withdrawal to every current record with the same normalized, validated email, including other locales and legacy rows. Each matching address is rechecked before writing; unrelated contacts are untouched. A duplicate lookup or synchronization failure returns 503, while already persisted withdrawals remain effective. Retry that withdrawal after storage recovers. A later deliberate re-registration/resubscription requires its own explicit new consent.

The header URL necessarily carries its bearer token in the query. Exclude/redact that query from access logs and external analytics; the route returns no-store/no-referrer responses. The visible unsubscribe page disables analytics. The token grants withdrawal for the contact; it does not grant contact-list access or sending authority.

RFC 8058 header generation and POST handling are implemented. Gmail's inbox “Unsubscribe” UI is not guaranteed: the delivered message's authentication and DKIM coverage of both List-Unsubscribe headers still need live verification. See [RFC 8058](https://www.rfc-editor.org/rfc/rfc8058) and [Google sender guidelines](https://support.google.com/mail/answer/81126).

## Configuration

Both the website and worker need the same `NOTION_TOKEN`, `NOTION_PRE_REGISTER_DB_ID`, stable `MARKETING_UNSUBSCRIBE_SECRET`, and `NEXT_PUBLIC_SITE_URL`. The production origin must use HTTPS.

The newsletter workflow requires a dedicated signing secret of at least 32 characters, identical in Vercel and GitHub Actions. The lower-level existing link helper retains its old Notion-token fallback for compatibility, but production campaigns must not rely on it. Rotating the signing secret invalidates old unsubscribe links and pending campaign approvals; plan migration before changing it.

## Verification

```sh
node scripts/check-marketing-subscription.cjs
npx tsc --noEmit
```

The subscription test uses mocked Notion storage and sends no emails or live requests. It covers exact historical consent, optional consent, fresh withdrawal checks, test/suppression exclusions, malformed/conflicting state, pagination, signed links, duplicate-email withdrawal, idempotence, failure ordering and RFC 8058 request handling.
