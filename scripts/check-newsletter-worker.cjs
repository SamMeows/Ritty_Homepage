const assert = require('node:assert/strict');
const { load } = require('./load-typescript.cjs');
const { approveNewsletter, newsletterEmailHash, newsletterJobKey, verifyNewsletterApproval } = load('lib/newsletter-approval.ts');
const { runNewsletterWorker, newsletterWorkerMain } = load('lib/newsletter-worker.ts');
const { GmailSendError } = load('lib/newsletter-gmail.ts');
process.env.MARKETING_UNSUBSCRIBE_SECRET = 'offline-worker-test-secret-that-is-not-a-real-secret';
global.fetch = async () => { throw new Error('Live network is forbidden in the worker tests'); };
const clone = value => JSON.parse(JSON.stringify(value));
const id = value => value.toString(16).padStart(32, '0');
const timestamp = Date.now();
const draft = { articleId: id(1), locale: 'kr', title: '개발일지', subject: '(광고) 리티 개발일지', summary: '새로운 이야기', articleUrl: 'https://example.com/kr/news/' + id(1), articleModifiedAt: new Date(timestamp).toISOString() };
function harness(options = {}) {
  const recipients = options.recipients || [{ pageId: id(10), email: 'one@example.com', locale: 'kr' }, { pageId: id(11), email: 'two@example.com', locale: 'kr' }];
  const signed = approveNewsletter(draft, recipients.map(row => ({ pageId: row.pageId, emailHash: newsletterEmailHash(row.email) })), timestamp);
  const jobs = new Map();
  let blockCounter = 1000;
  function addJob(number = 100) {
    const jobId = id(number);
    jobs.set(jobId, { job: { id: jobId, key: newsletterJobKey(draft), draft: clone(draft), approvalToken: signed.token, approvedAt: new Date(timestamp).toISOString(), status: 'queued', createdAt: new Date(timestamp).toISOString(), updatedAt: new Date(timestamp).toISOString() }, metadataBlock: id(number + 100), deliveries: [], retries: [] });
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
    send: async input => { sends.push(clone(input)); return { messageId: 'message-' + sends.length }; },
    unsubscribe: pageId => 'https://example.com/unsubscribe#' + pageId,
    oneClick: pageId => 'https://example.com/api/marketing/unsubscribe?token=' + pageId,
    now: () => timestamp + 1000,
    sleep: async () => {},
  };
  function retry() { first.retries.push({ blockId: id(blockCounter++), value: { requestedAt: new Date(timestamp + 2000).toISOString(), handled: false } }); }
  function prepare(status = 'pending') {
    first.job.prepared = true;
    first.deliveries = recipients.map(value => ({ blockId: id(blockCounter++), value: { key: newsletterEmailHash(value.email), pageIds: [value.pageId], email: value.email, locale: value.locale, status, updatedAt: new Date(timestamp).toISOString() } }));
  }
  return { jobs, first, deps, sends, recipients, recipientCalls, addJob, retry, prepare, run: extra => runNewsletterWorker({ dependencies: deps, ...extra }) };
}

async function main() {
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
    await h.run(); assert.equal(h.sends.length, 0); assert.equal(h.first.job.status, 'attention');
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
      ? { results: [{ id: id(100), type: 'child_page', child_page: { title: renamed ? 'Renamed campaign' : 'Ritty newsletter · ' + newsletterJobKey(draft) } }], has_more: false }
      : { id: id(8000), archived: false, public_url: null });
    await assert.rejects(listNewsletterJobIds(), /renamed/, 'renaming must not hide a previous delivery');
    renamed = false;
    assert.deepEqual(await listNewsletterJobIds(newsletterJobKey(draft)), [id(100)]);
    global.fetch = async () => { throw new Error('Live network is forbidden in the worker tests'); };
  }
  console.log('PASS newsletter worker: approval, consent, duplicate clicks, interrupted sends, quota, retry and durable recovery (offline)');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
