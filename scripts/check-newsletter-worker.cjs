const assert = require('node:assert/strict');
const { load } = require('./load-typescript.cjs');
const { approveNewsletter, newsletterBatchKey, newsletterEmailHash, newsletterJobKey, verifyNewsletterApproval } = load('lib/newsletter-approval.ts');
const { runNewsletterWorker, newsletterWorkerMain } = load('lib/newsletter-worker.ts');
const { GmailSendError } = load('lib/newsletter-gmail.ts');
const { NEWSLETTER_TEST_EMAIL } = load('lib/newsletter-types.ts');
const { newsletterSigningSecret } = load('lib/newsletter-config.ts');
const { createHash, createHmac } = require('node:crypto');
process.env.MARKETING_UNSUBSCRIBE_SECRET = 'offline-worker-test-secret-that-is-not-a-real-secret';
global.fetch = async () => { throw new Error('Live network is forbidden in the worker tests'); };
const clone = value => JSON.parse(JSON.stringify(value));
const id = value => value.toString(16).padStart(32, '0');
const timestamp = Date.now();
const draft = { articleId: id(1), locale: 'kr', title: '개발일지', subject: '(광고) 리티 개발일지', summary: '새로운 이야기', articleUrl: 'https://example.com/kr/news/' + id(1), articleModifiedAt: new Date(timestamp).toISOString() };
function harness(options = {}) {
  const draft = options.draft || { articleId: id(1), locale: 'kr', title: '개발일지', subject: '(광고) 리티 개발일지', summary: '새로운 이야기', articleUrl: 'https://example.com/kr/news/' + id(1), articleModifiedAt: new Date(timestamp).toISOString() };
  const recipients = options.recipients || [{ pageId: id(10), email: 'one@example.com', locale: 'kr' }, { pageId: id(11), email: 'two@example.com', locale: 'kr' }];
  const signed = approveNewsletter(draft, recipients.map(row => ({ pageId: row.pageId, emailHash: newsletterEmailHash(row.email) })), timestamp, options.testId ? { mode: 'test', testId: options.testId } : undefined);
  const jobs = new Map();
  let blockCounter = 1000;
  function addJob(number = 100) {
    const jobId = id(number);
    jobs.set(jobId, { job: { id: jobId, key: newsletterJobKey(draft, options.testId), ...(options.testId ? { mode: 'test' } : {}), draft: clone(draft), approvalToken: signed.token, approvedAt: new Date(timestamp).toISOString(), status: 'queued', createdAt: new Date(timestamp).toISOString(), updatedAt: new Date(timestamp).toISOString() }, metadataBlock: id(number + 100), deliveries: [], retries: [] });
    return jobs.get(jobId);
  }
  const first = addJob();
  const sends = [], recipientCalls = new Map();
  const deps = {
    listJobs: async () => [...jobs.keys()],
    readJob: async jobId => clone(jobs.get(jobId)),
    saveJob: async (blockId, value) => {
      const entry = [...jobs.values()].find(item => item.metadataBlock === blockId);
      entry.job = clone(value);
    },
    appendDeliveries: async (jobId, records) => { jobs.get(jobId).deliveries.push(...records.map(value => ({ blockId: id(blockCounter++), value: clone(value) }))); },
    saveDelivery: async (blockId, value) => {
      const row = [...jobs.values()].flatMap(item => item.deliveries).find(item => item.blockId === blockId);
      row.value = clone(value);
    },
    finishRetry: async command => { [...jobs.values()].flatMap(item => item.retries).find(item => item.blockId === command.blockId).value.handled = true; },
    recipient: async pageId => {
      recipientCalls.set(pageId, (recipientCalls.get(pageId) || 0) + 1);
      return clone(recipients.find(row => row.pageId === pageId) || null);
    },
    testRecipient: async pageId => clone(recipients.find(row => row.pageId === pageId) || null),
    send: async input => { sends.push(clone(input)); return { messageId: 'message-' + sends.length }; },
    unsubscribe: pageId => 'https://example.com/unsubscribe#' + pageId,
    oneClick: pageId => 'https://example.com/api/marketing/unsubscribe?token=' + pageId,
    now: () => timestamp + 1000,
    sleep: async () => {},
  };
  function retry() { first.retries.push({ blockId: id(blockCounter++), value: { requestedAt: new Date(timestamp + 2000).toISOString(), handled: false } }); }
  function addBatch(number = 200, batchRecipients = recipients, issuedAt = timestamp + 1) {
    const entry = addJob(number);
    const approved = approveNewsletter(draft, batchRecipients.map(row => ({ pageId: row.pageId, emailHash: newsletterEmailHash(row.email) })), issuedAt);
    entry.job.approvalToken = approved.token;
    entry.job.approvedAt = new Date(issuedAt).toISOString();
    entry.job.key = newsletterBatchKey(draft, approved.token);
    return entry;
  }
  function prepare(status = 'pending', entry = first, batchRecipients = recipients) {
    entry.job.prepared = true;
    entry.deliveries = batchRecipients.map(value => ({ blockId: id(blockCounter++), value: { key: newsletterEmailHash(value.email), pageIds: [value.pageId], email: value.email, locale: draft.locale, status, updatedAt: new Date(timestamp).toISOString() } }));
  }
  return { jobs, first, deps, sends, recipients, recipientCalls, addJob, addBatch, retry, prepare, run: extra => runNewsletterWorker({ dependencies: deps, ...extra }) };
}

async function main() {
  const testId = 'a'.repeat(64);
  const ownRecipients = [{ pageId: id(10), email: NEWSLETTER_TEST_EMAIL, locale: 'ja' }];
  const testHarness = () => harness({ recipients: ownRecipients, testId });
  {
    const h = testHarness(); h.deps.recipient = async () => null;
    h.addJob(101);
    await h.run(); await h.run();
    assert.equal(h.sends.length, 1, 'own withdrawn address can receive one explicitly approved test');
    assert.equal(h.sends[0].email, NEWSLETTER_TEST_EMAIL);
    assert.equal(h.sends[0].draft.locale, 'kr', 'test ignores identity locale mismatch');
    assert(h.sends[0].unsubscribeUrl.endsWith(id(10)), 'test unsubscribe addresses the real own registration');
    assert.equal(h.jobs.get(id(101)).job.status, 'duplicate', 'same test key dedupes clicks');
  }
  {
    const h = testHarness();
    const normal = harness({ recipients: ownRecipients }); normal.prepare('submitted'); normal.first.job.status = 'completed';
    const prior = clone(normal.first); prior.job.id = id(200); prior.metadataBlock = id(5000);
    prior.deliveries.forEach((row, index) => { row.blockId = id(6000 + index); });
    h.jobs.set(prior.job.id, prior);
    assert.notEqual(h.first.job.key, prior.job.key);
    await h.run(); assert.equal(h.sends.length, 1, 'normal completed campaign does not suppress test');
    assert.equal(h.first.job.status, 'completed'); assert.equal(prior.job.status, 'completed');
  }
  for (const changed of [null, { pageId: id(10), email: 'other@example.com', locale: 'kr' }, { pageId: id(10), email: 'CSJ0934@NAVER.COM', locale: 'kr' }]) {
    const h = testHarness(); h.deps.testRecipient = async () => changed;
    await h.run(); assert.equal(h.sends.length, 0, 'test lookup must return the exact fixed identity');
  }
  {
    const h = testHarness(); let reads = 0;
    h.deps.testRecipient = async pageId => ({ pageId, email: ++reads === 1 ? NEWSLETTER_TEST_EMAIL : 'changed@example.com', locale: 'en' });
    await h.run(); assert.equal(reads, 2); assert.equal(h.sends.length, 0, 'test identity is rechecked immediately before send');
    assert.equal(h.first.deliveries[0].value.status, 'skipped');
  }
  {
    const h = harness({ recipients: [{ pageId: id(10), email: NEWSLETTER_TEST_EMAIL, locale: 'kr' }] });
    h.deps.recipient = async () => null;
    await h.run(); assert.equal(h.sends.length, 0, 'normal campaigns still require own-address consent');
  }
  for (const jobMode of [undefined, 'normal', 'invalid']) {
    const h = testHarness(); h.first.job.mode = jobMode;
    await assert.rejects(h.run(), /differ/); assert.equal(h.sends.length, 0, 'runtime mode must match signed test approval');
  }
  {
    const h = harness(); h.first.job.mode = 'test';
    await assert.rejects(h.run(), /differ/); assert.equal(h.sends.length, 0);
  }
  {
    const approvedRecipients = [{ pageId: id(10), emailHash: newsletterEmailHash(NEWSLETTER_TEST_EMAIL) }];
    const signed = approveNewsletter(draft, approvedRecipients, timestamp, { mode: 'test', testId });
    const approval = verifyNewsletterApproval(signed.token, { now: timestamp });
    assert.equal(approval.mode, 'test'); assert.equal(approval.testId, testId);
    assert.equal(newsletterJobKey(draft, testId), newsletterJobKey(draft) + ':test:' + testId);
    const sign = value => {
      const body = Buffer.from(JSON.stringify(value)).toString('base64url');
      return body + '.' + createHmac('sha256', newsletterSigningSecret()).update('ritty:newsletter-approval:v1:' + body).digest('base64url');
    };
    for (const changes of [
      { mode: 'invalid' }, { mode: null }, { mode: undefined }, { testId: undefined },
      { testId: 'A'.repeat(64) }, { testId: 'a'.repeat(63) }, { testId: null },
      { recipients: [...approvedRecipients, { pageId: id(11), emailHash: newsletterEmailHash('other@example.com') }] },
    ]) assert.throws(() => verifyNewsletterApproval(sign({ ...approval, ...changes }), { now: timestamp }), /mode|Test id|test id|test recipient/);
    for (const options of [{ mode: 'invalid', testId }, { mode: 'test', testId: 'bad' }, { testId }]) {
      assert.throws(() => approveNewsletter(draft, approvedRecipients, timestamp, options));
    }
    assert.throws(() => approveNewsletter(draft, [{ pageId: id(10), emailHash: newsletterEmailHash('other@example.com') }], timestamp, { mode: 'test', testId }), /test recipient/);
    const signature = signed.token.split('.')[1];
    const changed = Buffer.from(JSON.stringify({ ...approval, testId: 'b'.repeat(64) })).toString('base64url');
    assert.throws(() => verifyNewsletterApproval(changed + '.' + signature, { now: timestamp }), /검증/);
  }
  {
    const h = harness({ draft: { ...draft, locale: 'zh-tw', title: 'Ritty 開發消息', articleUrl: 'https://example.com/zh-tw/news/' + id(1) }, recipients: [{ pageId: id(10), email: 'reader@example.com', locale: 'zh-tw' }] });
    await h.run();
    assert.equal(h.sends.length, 1);
    assert.equal(h.sends[0].draft.locale, 'zh-tw');
    assert.equal(h.first.job.status, 'completed');
  }
  {
    const h = harness(); h.addJob(101);
    await h.run(); await h.run();
    assert.equal(h.sends.length, 2, 'duplicate clicks and repeated workers must not resend');
    assert.equal(h.first.job.status, 'completed');
    assert.equal(h.jobs.get(id(101)).job.status, 'duplicate');
    assert.deepEqual(h.first.deliveries.map(row => row.value.status), ['submitted', 'submitted']);
  }
  {
    const h = harness({ recipients: [{ pageId: id(10), email: 'one@example.com', locale: 'kr' }, { pageId: id(11), email: 'one@example.com', locale: 'kr' }] });
    await h.run(); assert.equal(h.sends.length, 1, 'duplicate email is one delivery');
  }
  {
    const h = harness({ recipients: [{ pageId: id(10), email: 'one@example.com', locale: 'kr' }, { pageId: id(11), email: 'one@example.com', locale: 'kr' }] });
    const original = h.deps.recipient;
    h.deps.recipient = async pageId => pageId === id(11) ? null : original(pageId);
    await h.run(); assert.equal(h.sends.length, 0, 'a duplicate withdrawal blocks the email');
  }
  {
    const h = harness(); const original = h.deps.recipient;
    h.deps.recipient = async pageId => { const value = await original(pageId); return h.recipientCalls.get(pageId) > 1 ? null : value; };
    await h.run(); assert.equal(h.sends.length, 0, 'withdrawal after preview/preparation blocks send');
    assert(h.first.deliveries.every(row => row.value.status === 'skipped'));
  }
  {
    const h = harness(); h.prepare();
    h.deps.recipient = async pageId => ({ pageId, email: 'changed@example.com', locale: 'kr' });
    await h.run(); assert.equal(h.sends.length, 0, 'new identity is outside the approved cohort');
  }
  {
    const h = harness(); h.prepare(); h.first.deliveries[0].value.status = 'sending';
    await h.run(); await h.run();
    assert.equal(h.sends.length, 0); assert.equal(h.first.deliveries[0].value.status, 'unknown');
    assert.equal(h.first.job.status, 'attention');
    h.retry(); await h.run();
    assert.equal(h.sends.length, 1, 'explicit resume sends remaining pending only');
    assert.equal(h.first.deliveries[0].value.status, 'unknown');
  }
  {
    const h = harness(); const original = h.deps.send;
    h.deps.send = async input => { await original(input); throw new GmailSendError('Ambiguous network response', { kind: 'unknown', code: 'offline_unknown' }); };
    await h.run(); await h.run();
    assert.equal(h.sends.length, 1, 'unknown results cannot retry automatically');
    h.deps.send = original; h.retry(); await h.run();
    assert.equal(h.sends.length, 2); assert.equal(h.first.deliveries[0].value.status, 'unknown');
  }
  {
    const h = harness(); const original = h.deps.send;
    h.deps.send = async input => { await original(input); throw new GmailSendError('Rate limited', { kind: 'rejected', retryable: true, code: 'send_quota' }); };
    await h.run(); await h.run(); assert.equal(h.sends.length, 1);
    assert.equal(h.first.deliveries[0].value.status, 'failed');
    h.deps.send = original; h.retry(); await h.run();
    assert.equal(h.sends.length, 3); assert.equal(h.first.job.status, 'completed');
  }
  {
    const h = harness(); const original = h.deps.saveDelivery;
    h.deps.saveDelivery = async (blockId, value) => { if (value.status === 'sending') throw new Error('Store unavailable'); return original(blockId, value); };
    await h.run(); assert.equal(h.sends.length, 0, 'persist-before-send failure must not call Gmail');
    assert.equal(h.first.job.status, 'attention');
    h.deps.saveDelivery = original; h.retry(); await h.run(); assert.equal(h.sends.length, 2);
  }
  {
    const h = harness(); const original = h.deps.saveDelivery;
    h.deps.saveDelivery = async (blockId, value) => { if (value.status === 'submitted') throw new Error('Lost storage acknowledgement'); return original(blockId, value); };
    await h.run(); assert.equal(h.sends.length, 1);
    assert.equal(h.first.deliveries[0].value.status, 'sending');
    h.deps.saveDelivery = original; await h.run();
    assert.equal(h.first.deliveries[0].value.status, 'unknown'); assert.equal(h.sends.length, 1);
  }
  {
    const h = harness(); const original = h.deps.appendDeliveries;
    h.deps.appendDeliveries = async (jobId, rows) => { await original(jobId, rows); throw new Error('Append accepted but acknowledgement lost'); };
    await h.run(); assert.equal(h.sends.length, 0); assert.equal(h.first.deliveries.length, 2);
    h.deps.appendDeliveries = original; h.retry(); await h.run();
    assert.equal(h.first.deliveries.length, 2); assert.equal(h.sends.length, 2);
  }
  {
    const h = harness(); await h.run({ maxMessages: 1 });
    assert.equal(h.sends.length, 1); assert.equal(h.first.job.status, 'queued');
    await h.run(); assert.equal(h.sends.length, 2);
  }
  {
    const h = harness(); h.first.job.draft.summary = 'Unapproved replacement';
    await assert.rejects(h.run(), /differ/); assert.equal(h.sends.length, 0);
  }
  {
    const h = harness(); h.prepare(); h.first.deliveries.push(clone(h.first.deliveries[0]));
    await assert.rejects(h.run(), /ledger/); assert.equal(h.sends.length, 0, 'all corrupt ledgers fail preflight');
    assert.equal(h.first.job.status, 'queued', 'preflight failure does not mutate campaigns');
  }
  {
    const h = harness(); const token = h.first.job.approvalToken;
    assert.throws(() => verifyNewsletterApproval(token, { now: timestamp + 31 * 60_000 }), /만료/);
    assert.doesNotThrow(() => verifyNewsletterApproval(token, { approvedAt: new Date(timestamp).toISOString() }));
    assert.throws(() => verifyNewsletterApproval(token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A')), /검증/);
    process.env.NEWSLETTER_ENABLED = 'false'; assert.deepEqual(await newsletterWorkerMain(), { disabled: true });
    process.env.NEWSLETTER_ENABLED = 'true'; delete process.env.GITHUB_ACTIONS;
    await assert.rejects(newsletterWorkerMain(), /GitHub Actions/);
  }
  {
    const { listNewsletterJobIds } = load('lib/newsletter-store.ts');
    process.env.NOTION_TOKEN = 'offline-storage-test-token';
    process.env.NEWSLETTER_QUEUE_PAGE_ID = id(8000);
    process.env.NOTION_PRE_REGISTER_DB_ID = id(9000);
    let renamed = true;
    global.fetch = async url => Response.json(String(url).includes('/children')
      ? { results: [{ id: id(100), type: 'child_page', child_page: { title: renamed ? 'Renamed campaign' : 'Ritty newsletter · ' + newsletterJobKey(draft) } }, { id: id(101), type: 'child_page', child_page: { title: 'Ritty newsletter contact · kr · manual@example.com' } }], has_more: false }
      : { id: id(8000), archived: false, public_url: null });
    await assert.rejects(listNewsletterJobIds(), /renamed/, 'renaming must not hide a previous delivery');
    renamed = false;
    assert.deepEqual(await listNewsletterJobIds(newsletterJobKey(draft)), [id(100)]);
    global.fetch = async () => { throw new Error('Live network is forbidden in the worker tests'); };
  }
  {
    const h = harness();
    const expected = newsletterJobKey(draft) + ':batch:' + createHash('sha256').update(h.first.job.approvalToken).digest('hex');
    assert.equal(newsletterBatchKey(draft, h.first.job.approvalToken), expected);
    h.first.job.key = expected;
    h.addJob(101).job.key = expected;
    await h.run(); await h.run();
    assert.equal(h.sends.length, 2, 'same exact batch key still has one canonical owner');
    assert.equal(h.jobs.get(id(101)).job.status, 'duplicate');
  }
  for (const tamper of ['suffix', 'other-token', 'test-key']) {
    const h = harness();
    const key = newsletterBatchKey(draft, h.first.job.approvalToken);
    h.first.job.key = tamper === 'suffix' ? key + '0' : tamper === 'other-token' ? newsletterBatchKey(draft, h.first.job.approvalToken + 'x') : newsletterJobKey(draft, testId);
    await assert.rejects(h.run(), /differ/);
    assert.equal(h.sends.length, 0, 'arbitrary or non-derived keys are rejected');
  }
  {
    const h = testHarness(); h.first.job.key = newsletterBatchKey(draft, h.first.job.approvalToken);
    await assert.rejects(h.run(), /differ/);
    assert.equal(h.sends.length, 0, 'test approvals cannot use normal batch keys');
  }
  for (const status of ['submitted', 'sending', 'unknown']) {
    const h = harness(); const a = h.recipients[0];
    h.first.job.approvalToken = approveNewsletter(draft, [{ pageId: a.pageId, emailHash: newsletterEmailHash(a.email) }], timestamp).token;
    h.prepare(status, h.first, [a]);
    h.first.job.status = status === 'submitted' ? 'completed' : 'attention';
    const batch = h.addBatch();
    // Put the old ledger after the new batch to prove preflight reads all jobs.
    h.jobs.delete(h.first.job.id); h.jobs.set(h.first.job.id, h.first);
    await h.run(); await h.run();
    assert.deepEqual(h.sends.map(row => row.email), ['two@example.com'], 'prior ' + status + ' blocks A but allows newly approved B');
    assert.deepEqual(batch.deliveries.map(row => row.value.status), ['skipped', 'submitted']);
    assert.match(batch.deliveries[0].value.error, /이미 발송|불확실/);
    assert.equal(h.first.job.status, status === 'submitted' ? 'completed' : 'attention', 'old completed jobs never reopen');
    if (status === 'sending') assert.equal(h.first.deliveries[0].value.status, 'unknown');
  }
  {
    const h = harness(); h.first.job.key = newsletterBatchKey(draft, h.first.job.approvalToken);
    const batch = h.addBatch();
    assert.notEqual(h.first.job.key, batch.job.key, 'distinct signed approvals create distinct batches');
    await h.run(); await h.run();
    assert.deepEqual(h.sends.map(row => row.email).sort(), ['one@example.com', 'two@example.com']);
    assert(batch.deliveries.every(row => row.value.status === 'skipped'), 'same-run submitted persistence blocks later batches');
  }
  {
    const h = harness({ recipients: [{ pageId: id(10), email: 'one@example.com', locale: 'kr' }] });
    const batch = h.addBatch(); const original = h.deps.send;
    h.deps.send = async input => { await original(input); throw new GmailSendError('Unknown result', { kind: 'unknown', code: 'unknown' }); };
    await h.run();
    assert.equal(h.sends.length, 1, 'same-run unknown result blocks a later batch');
    assert.equal(batch.deliveries[0].value.status, 'skipped');
  }
  {
    const h = harness({ recipients: [{ pageId: id(10), email: 'one@example.com', locale: 'kr' }] });
    const batch = h.addBatch(); const original = h.deps.send; let rejected = false;
    h.deps.send = async input => {
      if (!rejected) { rejected = true; throw new GmailSendError('Definite rejection', { kind: 'rejected', retryable: true, code: 'quota' }); }
      return original(input);
    };
    await h.run();
    assert.equal(h.first.deliveries[0].value.status, 'failed');
    assert.equal(batch.deliveries[0].value.status, 'submitted', 'new explicitly approved work can retry known rejected delivery');
    assert.equal(h.sends.length, 1);
  }
  {
    const h = harness(); h.prepare('failed'); h.first.job.status = 'attention';
    h.first.deliveries.forEach(row => { row.value.retryable = true; });
    h.addBatch(); await h.run();
    assert.equal(h.sends.length, 2, 'persisted rejected failures are not submitted-recipient blocks');
    assert(h.first.deliveries.every(row => row.value.status === 'failed'), 'no automatic retries of the old failed job');
  }
  {
    const h = harness({ recipients: [{ pageId: id(10), email: NEWSLETTER_TEST_EMAIL, locale: 'kr' }] });
    const test = testHarness(); test.prepare('submitted'); test.first.job.status = 'completed';
    const prior = clone(test.first); prior.job.id = id(201); prior.metadataBlock = id(5001);
    prior.deliveries.forEach((row, index) => { row.blockId = id(6100 + index); });
    h.jobs.set(prior.job.id, prior); await h.run();
    assert.equal(h.sends.length, 1, 'test submitted records never suppress normal consented sends');
  }
  {
    const h = harness(); h.first.job.key = newsletterBatchKey(draft, h.first.job.approvalToken);
    const batch = h.addBatch(); h.prepare('pending', batch);
    await h.run();
    assert.equal(h.sends.length, 2, 'already prepared pending rows also check the same-run block index');
    assert(batch.deliveries.every(row => row.value.status === 'skipped'));
    assert([...h.recipientCalls.values()].every(count => count === 2), 'blocked pending rows skip before final recipient lookup');
  }
  for (const corrupt of ['duplicate', 'missing', 'partial-attempt', 'unapproved', 'bad-status', 'bad-email']) {
    const h = harness(); const prior = h.addBatch();
    h.prepare('submitted', prior); prior.job.status = 'completed';
    if (corrupt === 'duplicate') prior.deliveries.push(clone(prior.deliveries[0]));
    if (corrupt === 'missing') { prior.deliveries = []; prior.job.prepared = false; }
    if (corrupt === 'partial-attempt') { prior.deliveries.pop(); prior.job.prepared = false; prior.job.status = 'queued'; }
    if (corrupt === 'unapproved') prior.deliveries[0].value.pageIds = [id(999)];
    if (corrupt === 'bad-status') prior.deliveries[0].value.status = 'not-a-status';
    if (corrupt === 'bad-email') prior.deliveries[0].value.email = 'tampered@example.com';
    await assert.rejects(h.run(), /ledger|missing/);
    assert.equal(h.sends.length, 0, 'malformed later prior ledger must stop all sends: ' + corrupt);
  }
  console.log('PASS newsletter worker: approval-bound batches, recipient dedupe, consent, tests, interrupted sends, quota, retry and durable recovery (offline)');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
