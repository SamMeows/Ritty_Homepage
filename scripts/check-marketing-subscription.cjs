const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');

const id = '123456781234123412341234567890ab';
const database = 'abcdefabcdefabcdefabcdefabcdefab';
const optionalVersion = '2026-10-26-registration-v2-optional-marketing';
const marker = 'ritty_marketing_subscription_v1:';
const pages = new Map(), blockLists = new Map();
let calls = [], queryRows, queryPageSize = 100, blockPageSize = 100, fail = false, failCheckbox = false, failQuery = false;
let repeatQueryCursor = false, repeatBlockCursor = false, nextBlock = 0;
const rich = value => [{ type: 'text', text: { content: value } }];
const otherId = n => n.toString(16).padStart(32, '0');
function page(options = {}) {
 const { pageId = id, email = 'person@example.com', locale = 'kr', version = optionalVersion, consent = true,
  archived = false, parent = database, suppressed = false, source = '', campaign = '', isTest = false } = options;
 return { id: pageId, archived, parent: { database_id: parent }, properties: {
  Email: { type: 'title', title: rich(email) }, Locale: { type: 'select', select: { name: locale } },
  'Consent Version': { type: 'rich_text', rich_text: rich(version) },
  'Marketing Consent': { type: 'checkbox', checkbox: consent },
  'Email Suppressed': { type: 'checkbox', checkbox: suppressed },
  'UTM Source': { type: 'rich_text', rich_text: rich(source) },
  'UTM Campaign': { type: 'rich_text', rich_text: rich(campaign) },
  'Is Test': { type: 'checkbox', checkbox: isTest },
 } };
}
function rawBlock(value) {
 return { id: 'mock-block-' + (++nextBlock), type: 'paragraph', paragraph: { rich_text: rich(value) } };
}
function stateBlock(subscribed = true, isTest = false, extra = {}) {
 return rawBlock(marker + JSON.stringify({ subscribed, isTest, updatedAt: '2026-10-30T00:00:00.000Z', ...extra }));
}
function reset(options = {}, blocks = []) {
 pages.clear(); blockLists.clear(); calls = []; queryRows = undefined;
 queryPageSize = blockPageSize = 100; fail = failCheckbox = failQuery = repeatQueryCursor = repeatBlockCursor = false;
 const value = page(options); pages.set(id, value); blockLists.set(id, blocks); return value;
}
function json(value, status = 200) { return Response.json(value, { status }); }
async function mockFetch(input, options) {
 const url = new URL(input), method = options.method;
 assert.equal(url.origin, 'https://api.notion.com');
 assert.equal(options.headers['Notion-Version'], '2022-06-28');
 assert.equal(options.headers.Authorization, 'Bearer test-token');
 assert.equal(options.cache, 'no-store');
 const body = options.body ? JSON.parse(options.body) : undefined;
 calls.push({ path: url.pathname, method, body, cursor: url.searchParams.get('start_cursor') });
 if (fail) return json({}, 503);
 let match = url.pathname.match(/^\/v1\/pages\/([a-f0-9]{32})$/);
 if (match) {
  const value = pages.get(match[1]);
  assert(value, 'Unknown mock contact');
  if (method === 'PATCH') {
   assert.deepEqual(Object.keys(body.properties), ['Marketing Consent']);
   assert.equal(body.properties['Marketing Consent'].checkbox, false);
   if (failCheckbox) return json({}, 503);
   value.properties['Marketing Consent'].checkbox = false;
  }
  return json(value);
 }
 match = url.pathname.match(/^\/v1\/blocks\/([^/]+)\/children$/);
 if (match) {
  const list = blockLists.get(match[1]);
  assert(list, 'Unknown mock children');
  if (method === 'PATCH') {
   assert.equal(body.children.length, 1);
   list.push({ ...body.children[0], id: 'mock-block-' + (++nextBlock) });
   return json({});
  }
  assert.equal(method, 'GET');
  const offset = Number(url.searchParams.get('start_cursor') || 0), end = offset + blockPageSize;
  return json({ results: list.slice(offset, end), has_more: repeatBlockCursor || end < list.length, next_cursor: repeatBlockCursor ? '1' : String(end) });
 }
 match = url.pathname.match(/^\/v1\/blocks\/(mock-block-\d+)$/);
 if (match && method === 'PATCH') {
  const block = [...blockLists.values()].flat().find(value => value.id === match[1]);
  assert(block, 'Unknown mock state');
  block.paragraph = body.paragraph;
  return json({});
 }
 if (url.pathname === '/v1/databases/' + database + '/query' && method === 'POST') {
  if (failQuery) return json({}, 503);
  assert.equal(body.page_size, 100);
  if (body.filter) assert.equal(body.filter.property, 'Locale');
  const rows = queryRows || [...pages.values()];
  const offset = Number(body.start_cursor || 0), end = offset + queryPageSize;
  return json({ results: rows.slice(offset, end), has_more: repeatQueryCursor || end < rows.length, next_cursor: repeatQueryCursor ? '1' : String(end) });
 }
 throw new Error('Unexpected mock request: ' + method + ' ' + url.pathname);
}
const mod = { exports: {} };
const source = ts.transpileModule(fs.readFileSync('lib/marketing-subscription.ts', 'utf8'), {
 compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function('require', 'module', 'exports', 'fetch', 'process', source)(
 name => name === 'server-only' ? {} : require(name), mod, mod.exports, mockFetch,
 { env: { NOTION_TOKEN: 'test-token', NOTION_PRE_REGISTER_DB_ID: database, MARKETING_UNSUBSCRIBE_SECRET: 'test-secret', NODE_ENV: 'test' } },
);
const m = mod.exports;
const recipient = { pageId: id, email: 'person@example.com', locale: 'kr' };

(async () => {
 // Exact required-consent versions are eligible without a modern state/checkbox.
 for (const version of ['2026-10', '2026-10-new-launch']) {
  reset({ version, consent: false });
  assert.deepEqual(await m.getMarketingRecipient(id), recipient);
  assert.deepEqual(await m.listMarketingCandidates('kr'), [recipient]);
  assert.equal(calls.some(call => call.method === 'PATCH'), false);
 }
 reset({ consent: true }); assert.equal(await m.canReceiveMarketing(id), true);
 reset({ consent: false }); assert.equal(await m.canReceiveMarketing(id), false);
 reset({ version: '2026-09', consent: false }); assert.equal(await m.canReceiveMarketing(id), false);
 reset({ version: '2026-10-new-launch-unverified', consent: false }); assert.equal(await m.canReceiveMarketing(id), false);
 reset({ version: 'unknown', consent: true }); assert.equal(await m.canReceiveMarketing(id), true);
 const noCheckbox = reset({ version: '2026-10', consent: false });
 delete noCheckbox.properties['Marketing Consent'];
 assert.equal(await m.canReceiveMarketing(id), true);
 reset({ consent: true }, [stateBlock(false)]); assert.equal(await m.canReceiveMarketing(id), false);
 reset({ version: '2026-10', consent: false }, [stateBlock(false, false, { withdrawnAt: '2026-10-29T12:00:00Z' })]);
 assert.equal(await m.canReceiveMarketing(id), false);
 reset({ consent: false }, [stateBlock(true)]); assert.equal(await m.canReceiveMarketing(id), true);
 reset({ consent: true }, [stateBlock(true, false, { withdrawnAt: '2026-10-29T12:00:00Z' })]);
 assert.equal(await m.canReceiveMarketing(id), false);

 // Test and suppression signals override every consent source.
 for (const options of [{ isTest: true }, { source: 'internal_test' }, { campaign: 'registration_qa' }, { suppressed: true }, { locale: 'unknown' }, { archived: true }, { parent: otherId(99) }]) {
  reset({ version: '2026-10', ...options }, [stateBlock(true)]);
  assert.equal(await m.getMarketingRecipient(id), null);
  assert.deepEqual(await m.listMarketingCandidates('kr'), []);
 }
 reset({}, [stateBlock(true, true)]); assert.equal(await m.canReceiveMarketing(id), false);
 reset({}, [rawBlock('광고 유입 정보\nregistration_test: true\nutm_source: example')]);
 assert.equal(await m.canReceiveMarketing(id), false);
 reset({ email: ' PERSON@EXAMPLE.COM ' }); assert.deepEqual(await m.getMarketingRecipient(id), recipient);
 for (const email of ['person@example.com\r\nBcc: victim@example.com', 'person@example.com\n', 'Name <person@example.com>', 'a..b@example.com', '.a@example.com', 'a@-example.com', 'a@localhost']) {
  reset({ email }); assert.equal(await m.canReceiveMarketing(id), false); assert.deepEqual(await m.listMarketingCandidates('kr'), []);
 }
 reset(); const invalidBefore = calls.length; assert.equal(await m.getMarketingRecipient('invalid'), null); assert.equal(calls.length, invalidBefore);

 // Every state block is inspected, including later pages; bad or conflicting state fails closed.
 for (const value of [marker + '{', marker + '{"subscribed":"true","isTest":false}', marker + '{"subscribed":true,"isTest":false,"updatedAt":"bad"}', 'prefix ' + marker + '{}']) {
  reset({}, [rawBlock(value)]); await assert.rejects(() => m.getMarketingRecipient(id));
 }
 const converted = stateBlock(false);
 converted.type = 'heading_1'; converted.heading_1 = converted.paragraph; delete converted.paragraph;
 reset({ version: '2026-10', consent: false }, [converted]);
 await assert.rejects(() => m.getMarketingRecipient(id), /Invalid subscription state/);
 reset({}, [stateBlock(true), stateBlock(false)]); blockPageSize = 1;
 await assert.rejects(() => m.getMarketingRecipient(id), /Conflicting/);
 assert(calls.some(call => call.cursor === '1'));
 reset({}, [stateBlock(true), stateBlock(true)]); blockPageSize = 1;
 assert.equal(await m.canReceiveMarketing(id), true);
 reset({}, [stateBlock(true)]); repeatBlockCursor = true;
 await assert.rejects(() => m.canReceiveMarketing(id), /pagination/);

 // Candidate preview is paginated, prefiltered and metadata-only; preserve duplicate email records.
 reset();
 queryPageSize = 2;
 queryRows = [
  page(), page({ pageId: otherId(2), consent: false, version: '2026-10-new-launch' }),
  page({ pageId: otherId(3), consent: false }), page({ pageId: otherId(4), source: 'internal_test' }),
  page({ pageId: otherId(5), email: 'another@example.com' }), page(),
  page({ pageId: otherId(6), locale: 'en' }), page({ pageId: otherId(7), suppressed: true }),
 ];
 const candidates = await m.listMarketingCandidates('kr');
 assert.deepEqual(candidates.map(value => value.pageId), [id, otherId(2), otherId(5)]);
 assert.equal(candidates.filter(value => value.email === 'person@example.com').length, 2);
 assert.equal(calls.length, 4);
 assert(calls.every(call => call.path.endsWith('/query')));
 const beforeUnknownLocale = calls.length;
 assert.deepEqual(await m.listMarketingCandidates('unknown'), []);
 assert.equal(calls.length, beforeUnknownLocale);
 repeatQueryCursor = true; await assert.rejects(() => m.listMarketingCandidates('kr'), /pagination/);

 // Bearer links grant only contact-scoped withdrawal, and GET never has that effect.
 reset();
 const url = new URL(m.marketingUnsubscribeUrl(id, 'ja')), token = url.hash.slice(1);
 assert.equal(url.pathname, '/unsubscribe'); assert.equal(url.searchParams.get('lang'), 'ja'); assert(!url.search.includes(id));
 const oneClick = new URL(m.marketingOneClickUnsubscribeUrl(id, 'ja'));
 assert.equal(oneClick.pathname, '/api/marketing/unsubscribe');
 assert.equal(oneClick.searchParams.get('token'), token);
 assert.equal(oneClick.hash, '');
 let before = calls.length;
 assert.equal(await m.unsubscribeMarketing(token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a')), false);
 assert.equal(await m.unsubscribeMarketing('invalid'), false); assert.equal(calls.length, before);
 reset({ parent: otherId(99) }); assert.equal(await m.unsubscribeMarketing(token), false);
 assert.equal(calls.some(call => call.method === 'PATCH'), false);
 reset({ archived: true }); assert.equal(await m.unsubscribeMarketing(token), false);

 // Legacy withdrawal appends durable state once; checked before every actual send.
 reset({ version: '2026-10', consent: false });
 let sends = 0;
 assert.equal((await m.deliverMarketingEmail(id, 'kr', async link => { sends++; assert(link.includes('#')); })).sent, true);
 assert.equal((await m.deliverMarketingEmail(id, 'en', async () => { sends++; })).sent, false);
 assert.equal(await m.unsubscribeMarketing(token), true);
 assert.equal(await m.canReceiveMarketing(id), false);
 assert.equal((await m.deliverMarketingEmail(id, 'kr', async () => { sends++; })).sent, false);
 assert.equal(sends, 1);
 const state = JSON.parse(blockLists.get(id)[0].paragraph.rich_text[0].text.content.slice(marker.length));
 assert.equal(state.subscribed, false); assert(state.withdrawnAt);
 assert.equal(await m.unsubscribeMarketing(token), true);
 assert.equal(calls.filter(call => call.method === 'PATCH' && call.path.endsWith('/children')).length, 1);

 // One recipient's withdrawal covers every current duplicate email row, even
 // different casing, language, legacy consent or a previously declined checkbox.
 reset({ version: '2026-10', consent: false });
 for (const options of [
  { pageId: otherId(2), email: ' PERSON@EXAMPLE.COM ', locale: 'ja' },
  { pageId: otherId(3), consent: false },
  { pageId: otherId(4), email: 'unrelated@example.com' },
 ]) {
  pages.set(options.pageId, page(options)); blockLists.set(options.pageId, []);
 }
 blockLists.set(otherId(2), [stateBlock(true)]);
 queryPageSize = 1;
 assert.equal(await m.unsubscribeMarketing(token), true);
 assert.equal(await m.canReceiveMarketing(id), false);
 assert.equal(await m.canReceiveMarketing(otherId(2)), false);
 assert.equal(await m.canReceiveMarketing(otherId(3)), false);
 assert.equal(await m.canReceiveMarketing(otherId(4)), true);
 assert.equal(pages.get(otherId(2)).properties['Marketing Consent'].checkbox, false);
 const duplicateWrites = calls.filter(call => call.method === 'PATCH').length;
 assert.equal(await m.unsubscribeMarketing(token), true);
 assert.equal(calls.filter(call => call.method === 'PATCH').length, duplicateWrites);
 const firstWithdrawal = calls.findIndex(call => call.method === 'PATCH' && call.path.endsWith(id + '/children'));
 const duplicateLookup = calls.findIndex(call => call.path.endsWith('/query'));
 assert(firstWithdrawal >= 0 && duplicateLookup > firstWithdrawal);
 reset({ version: '2026-10', consent: false }); failQuery = true;
 await assert.rejects(() => m.unsubscribeMarketing(token));
 failQuery = false;
 assert.equal(await m.canReceiveMarketing(id), false);

 // Even a display-checkbox failure must not prevent remaining duplicates from withdrawing.
 reset({}, [stateBlock(true)]);
 pages.set(otherId(2), page({ pageId: otherId(2) })); blockLists.set(otherId(2), []);
 failCheckbox = true;
 await assert.rejects(() => m.unsubscribeMarketing(token));
 assert.equal(await m.canReceiveMarketing(id), false);
 assert.equal(await m.canReceiveMarketing(otherId(2)), false);

 // Withdrawal is persisted first, even when checkbox synchronization fails.
 reset({ consent: true }, [stateBlock(true)]);
 failCheckbox = true;
 await assert.rejects(() => m.unsubscribeMarketing(token));
 assert.equal(await m.canReceiveMarketing(id), false);
 const writes = calls.filter(call => call.method === 'PATCH');
 assert(writes[0].path.includes('/blocks/')); assert(writes[1].path.includes('/pages/'));
 failCheckbox = false;
 assert.equal(await m.unsubscribeMarketing(token), true);
 assert.equal(pages.get(id).properties['Marketing Consent'].checkbox, false);
 fail = true;
 await assert.rejects(() => m.deliverMarketingEmail(id, 'kr', async () => { sends++; }));
 await assert.rejects(() => m.unsubscribeMarketing(token));
 assert.equal(sends, 1);

 const routeModule = { exports: {} };
 const routeSource = ts.transpileModule(fs.readFileSync('app/api/marketing/unsubscribe/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
 }).outputText;
 new Function('require', 'module', 'exports', routeSource)(
  name => name === 'next/server' ? { NextResponse: { json: (body, options) => Response.json(body, options) } } : m,
  routeModule, routeModule.exports,
 );
 const api = routeModule.exports;
 const post = (body, type = 'application/json', query = '', headers = {}) => api.POST(new Request('https://ritty.example/api/marketing/unsubscribe' + query, {
  method: 'POST', body, headers: { 'content-type': type, ...headers },
 }));
 reset({}, [stateBlock(true)]);
 before = calls.length;
 const get = api.GET();
 assert.equal(get.status, 405); assert.equal(get.headers.get('Allow'), 'POST');
 assert.equal(calls.length, before);
 assert.equal((await post(JSON.stringify({ token }))).status, 200);
 assert.equal((await post(JSON.stringify({ token: 'invalid' }))).status, 400);
 assert.equal((await post('null')).status, 400);
 assert.equal((await post('{')).status, 400);
 assert.equal((await post('x', 'text/plain')).status, 415);
 assert.equal((await post('x'.repeat(2049))).status, 413);
 assert.equal((await post('{}', 'application/json', '', { 'content-length': '2049' })).status, 413);
 reset({ version: '2026-10-new-launch', consent: false });
 assert.equal((await post('List-Unsubscribe=One-Click', 'application/x-www-form-urlencoded; charset=UTF-8', '?token=' + token)).status, 200);
 assert.equal(await m.canReceiveMarketing(id), false);
 before = calls.length;
 assert.equal((await post('List-Unsubscribe=Wrong', 'application/x-www-form-urlencoded', '?token=' + token)).status, 400);
 assert.equal((await post('List-Unsubscribe=One-Click&List-Unsubscribe=One-Click', 'application/x-www-form-urlencoded', '?token=' + token)).status, 400);
 assert.equal((await post('List-Unsubscribe=One-Click', 'application/x-www-form-urlencoded', '?token=' + token + '&token=' + token)).status, 400);
 assert.equal((await post('List-Unsubscribe=One-Click', 'application/x-www-form-urlencoded')).status, 400);
 assert.equal(calls.length, before);
 fail = true;
 const failure = await post(JSON.stringify({ token }));
 assert.equal(failure.status, 503); assert.equal((await failure.json()).error, 'unavailable');
 assert.equal(failure.headers.get('Cache-Control'), 'no-store');
 assert.equal(failure.headers.get('Referrer-Policy'), 'no-referrer');

 console.log('PASS: exact legacy consent, optional consent, fresh withdrawal checks, test/suppression exclusions, strict email validation, paginated candidate/state reads, malformed/conflicting state rejection, signed links, durable idempotent withdrawal across duplicate emails, checkbox/query failure ordering, bounded JSON/RFC8058 POST and GET non-mutation. No live requests or sends.');
})().catch(error => { console.error(error); process.exitCode = 1; });
