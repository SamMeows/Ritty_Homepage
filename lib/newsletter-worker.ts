import 'server-only'
import { newsletterEmailHash, newsletterJobKey, verifyNewsletterApproval, type NewsletterApproval } from './newsletter-approval'
import { newsletterId } from './newsletter-config'
import { GmailSendError, gmailConfigurationMissing, sendNewsletterEmail } from './newsletter-gmail'
import { getMarketingRecipient, getNewsletterTestRecipient, marketingOneClickUnsubscribeUrl, marketingUnsubscribeUrl } from './marketing-subscription'
import { appendNewsletterDeliveries, finishNewsletterRetry, listNewsletterJobIds, readNewsletterJob, saveNewsletterDelivery, saveNewsletterJob, type JobDetails } from './newsletter-store'
import { NEWSLETTER_TEST_EMAIL, type DeliveryRecord, type NewsletterJob } from './newsletter-types'

// GitHub Actions is the only production consumer. Its fixed concurrency group
// serializes writers across scheduled and button-triggered executions.
const defaultDependencies = {
  listJobs: listNewsletterJobIds,
  readJob: readNewsletterJob,
  saveJob: saveNewsletterJob,
  appendDeliveries: appendNewsletterDeliveries,
  saveDelivery: saveNewsletterDelivery,
  finishRetry: finishNewsletterRetry,
  recipient: getMarketingRecipient,
  testRecipient: getNewsletterTestRecipient,
  send: sendNewsletterEmail,
  unsubscribe: marketingUnsubscribeUrl,
  oneClick: marketingOneClickUnsubscribeUrl,
  now: () => Date.now(),
  sleep: (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)),
}
export type NewsletterWorkerDependencies = typeof defaultDependencies
type StoredDelivery = JobDetails['deliveries'][number]

function approvedJob(details: JobDetails): NewsletterApproval {
  const { job } = details
  const approval = verifyNewsletterApproval(job.approvalToken, { approvedAt: job.approvedAt })
  if ((job.mode !== undefined && job.mode !== 'test') || job.mode !== approval.mode
    || newsletterJobKey(approval.draft, approval.mode === 'test' ? approval.testId : undefined) !== job.key
    || JSON.stringify(approval.draft) !== JSON.stringify(job.draft)) {
    throw new Error('Campaign contents differ from the administrator approval')
  }
  const pages = new Set<string>()
  for (const row of approval.recipients) {
    const id = newsletterId(row.pageId)
    if (pages.has(id)) throw new Error('Duplicate approved registration')
    pages.add(id)
  }
  return approval
}

function recipientGroups(approval: NewsletterApproval) {
  const groups = new Map<string, string[]>()
  for (const recipient of approval.recipients) {
    const pageIds = groups.get(recipient.emailHash) || []
    pageIds.push(newsletterId(recipient.pageId))
    groups.set(recipient.emailHash, pageIds)
  }
  return groups
}

function validateLedger(details: JobDetails, approval: NewsletterApproval) {
  const groups = recipientGroups(approval), seen = new Set<string>()
  for (const { value } of details.deliveries) {
    const expected = groups.get(value.key)
    if (seen.has(value.key) || !expected || value.locale !== approval.draft.locale
      || JSON.stringify([...value.pageIds].map(newsletterId).sort()) !== JSON.stringify([...expected].sort())
      || (value.email !== '' && newsletterEmailHash(value.email) !== value.key)
      || (value.status !== 'skipped' && !value.email)) {
      throw new Error('Delivery ledger is inconsistent; manual review is required')
    }
    seen.add(value.key)
  }
  if (details.job.prepared && seen.size !== groups.size) throw new Error('Prepared campaign has missing delivery records')
  return groups
}

// An explicit withdrawal in any duplicate registration blocks that email.
// All records must still match the approved identity and language at send time.
async function eligibleEmail(pageIds: string[], emailHash: string, locale: string, dependencies: NewsletterWorkerDependencies, isTest = false) {
  if (isTest) {
    if (emailHash !== newsletterEmailHash(NEWSLETTER_TEST_EMAIL) || !pageIds.length) return null
    for (const pageId of pageIds) {
      const recipient = await dependencies.testRecipient(pageId)
      if (!recipient || recipient.email !== NEWSLETTER_TEST_EMAIL) return null
    }
    return NEWSLETTER_TEST_EMAIL
  }
  let email = ''
  for (const pageId of pageIds) {
    const recipient = await dependencies.recipient(pageId)
    if (!recipient || recipient.locale !== locale || newsletterEmailHash(recipient.email) !== emailHash) return null
    email = recipient.email
  }
  return email || null
}

async function updateJob(details: JobDetails, changes: Partial<NewsletterJob>, dependencies: NewsletterWorkerDependencies) {
  const next = { ...details.job, ...changes, updatedAt: new Date(dependencies.now()).toISOString() }
  await dependencies.saveJob(details.metadataBlock, next)
  details.job = next
}

async function updateDelivery(row: StoredDelivery, changes: Partial<DeliveryRecord>, dependencies: NewsletterWorkerDependencies) {
  const next = { ...row.value, ...changes, updatedAt: new Date(dependencies.now()).toISOString() }
  await dependencies.saveDelivery(row.blockId, next)
  row.value = next
}

async function prepare(details: JobDetails, approval: NewsletterApproval, dependencies: NewsletterWorkerDependencies) {
  const groups = validateLedger(details, approval)
  if (details.job.prepared) return details
  const existing = new Set(details.deliveries.map(row => row.value.key))
  const missing: DeliveryRecord[] = []
  for (const [key, pageIds] of groups) {
    if (existing.has(key)) continue
    const email = await eligibleEmail(pageIds, key, approval.draft.locale, dependencies, approval.mode === 'test')
    missing.push({ key, pageIds, email: email || '', locale: approval.draft.locale,
      status: email ? 'pending' : 'skipped', updatedAt: new Date(dependencies.now()).toISOString(),
      ...(email ? {} : { error: '동의 철회·발송 제외·주소 또는 언어 변경으로 제외했습니다.' }),
    })
  }
  // If an append times out, stop. The next run reads durable records before
  // appending anything else, so an acknowledged-late append is never repeated.
  if (missing.length) await dependencies.appendDeliveries(details.job.id, missing)
  const refreshed = await dependencies.readJob(details.job.id)
  const refreshedApproval = approvedJob(refreshed)
  const expected = validateLedger(refreshed, refreshedApproval)
  if (refreshed.deliveries.length !== expected.size) throw new Error('Delivery preparation is incomplete')
  await updateJob(refreshed, { prepared: true }, dependencies)
  return refreshed
}

async function applyRetryCommands(details: JobDetails, dependencies: NewsletterWorkerDependencies) {
  const commands = details.retries.filter(row => row.value.handled === false)
  if (!commands.length) return false
  // Consume the command before changing records. A crash can require another
  // click, but must not keep authorizing future retries after a new failure.
  for (const command of commands) await dependencies.finishRetry(command)
  for (const row of details.deliveries) {
    if (row.value.status === 'failed' && row.value.retryable) {
      await updateDelivery(row, { status: 'pending', error: undefined, retryable: undefined }, dependencies)
    }
  }
  return true
}

export async function runNewsletterWorker(options: {
  dependencies?: Partial<NewsletterWorkerDependencies>
  maxMessages?: number
  timeBudgetMs?: number
} = {}) {
  const dependencies: NewsletterWorkerDependencies = { ...defaultDependencies, ...options.dependencies }
  const startedAt = dependencies.now()
  const maxMessages = options.maxMessages ?? 300
  const timeBudgetMs = options.timeBudgetMs ?? 20 * 60_000
  const summary = { campaigns: 0, submitted: 0, skipped: 0, attention: 0, duplicates: 0 }
  let attempts = 0
  const jobs: JobDetails[] = []
  // Never send from a partially read queue: a hidden older job could already
  // have submitted this campaign. Storage failure here stops the whole run.
  for (const id of await dependencies.listJobs()) jobs.push(await dependencies.readJob(id))
  const groups = new Map<string, JobDetails[]>()
  for (const details of jobs) {
    approvedJob(details)
    const group = groups.get(details.job.key) || []
    group.push(details); groups.set(details.job.key, group)
  }
  for (const group of groups.values()) {
    // Prefer the durable campaign that already owns delivery records. Queue
    // insertion order is the tie-breaker before any campaign has been prepared.
    const owners = group.filter(details => details.deliveries.length > 0 && details.job.status !== 'duplicate')
    if (owners.length > 1) throw new Error('Multiple delivery ledgers exist for one campaign; sending is stopped')
    const details = owners[0] || group.find(item => item.job.status !== 'duplicate')
    if (!details) continue
    for (const duplicate of group) {
      if (duplicate.job.id === details.job.id || duplicate.job.status === 'duplicate') continue
      await updateJob(duplicate, { status: 'duplicate', error: '같은 글과 언어의 발송 기록이 이미 있습니다.' }, dependencies)
      summary.duplicates++
    }
    if (details.job.status === 'completed' || details.job.status === 'duplicate') continue
    if (attempts >= maxMessages || dependencies.now() - startedAt >= timeBudgetMs) break
    let current = details
    try {
      const approval = approvedJob(current)
      validateLedger(current, approval)
      let interrupted = false
      for (const row of current.deliveries) {
        if (row.value.status === 'sending') {
          await updateDelivery(row, { status: 'unknown', retryable: false, error: '발송 도중 작업이 중단되었습니다. 보낸편지함을 확인해 주세요.' }, dependencies)
          interrupted = true
        }
      }
      if (interrupted) {
        await updateJob(current, { status: 'attention', error: '이전 작업의 발송 결과를 확인해야 합니다.' }, dependencies)
        summary.attention++
        continue
      }
      const retryAuthorized = await applyRetryCommands(current, dependencies)
      if (current.job.status === 'attention' && !retryAuthorized) continue
      current = await prepare(current, approval, dependencies)
      await updateJob(current, { status: 'sending', error: undefined }, dependencies)
      summary.campaigns++
      let paused = false
      for (const row of current.deliveries) {
        if (row.value.status !== 'pending') continue
        if (attempts >= maxMessages || dependencies.now() - startedAt >= timeBudgetMs) break
        // Fail closed if the current registration cannot be read. This happens
        // before marking an attempt or contacting Gmail.
        const email = await eligibleEmail(row.value.pageIds, row.value.key, current.job.draft.locale, dependencies, approval.mode === 'test')
        if (!email || email !== row.value.email) {
          await updateDelivery(row, { status: 'skipped', error: '발송 직전 동의·주소·언어 확인에서 제외했습니다.' }, dependencies)
          summary.skipped++
          continue
        }
        const unsubscribeUrl = dependencies.unsubscribe(row.value.pageIds[0], row.value.locale)
        const oneClickUrl = dependencies.oneClick(row.value.pageIds[0], row.value.locale)
        // This write must succeed before any irreversible API call.
        await updateDelivery(row, { status: 'sending', error: undefined, retryable: undefined }, dependencies)
        attempts++
        let result: { messageId: string }
        try {
          result = await dependencies.send({ draft: current.job.draft, email, unsubscribeUrl, oneClickUrl, jobKey: current.job.key })
        } catch (error) {
          const known = error instanceof GmailSendError
          const unknown = !known || error.kind === 'unknown'
          await updateDelivery(row, { status: unknown ? 'unknown' : 'failed',
            error: known ? error.message : '발송 결과를 확인할 수 없습니다. 보낸편지함을 확인해 주세요.',
            retryable: unknown ? false : error.retryable,
          }, dependencies)
          paused = true
          break
        }
        // Intentionally outside the Gmail catch: if persisting this response
        // fails, retain `sending` and stop. Never reinterpret it as a rejection.
        await updateDelivery(row, { status: 'submitted', messageId: result.messageId, error: undefined }, dependencies)
        summary.submitted++
        await dependencies.sleep(2000)
      }
      const pending = current.deliveries.some(row => row.value.status === 'pending')
      const needsReview = current.deliveries.some(row => ['failed', 'unknown'].includes(row.value.status))
      const status = paused ? 'attention' : pending ? 'queued' : needsReview ? 'attention' : 'completed'
      await updateJob(current, { status, error: paused ? '발송을 보류했습니다. 결과를 확인한 뒤 남은 대상의 발송을 재개할 수 있습니다.' : undefined }, dependencies)
      if (status === 'attention') summary.attention++
    } catch {
      // Never log recipient data, OAuth credentials, approval tokens or upstream
      // response bodies. Failure of this final write propagates and stops all work.
      await updateJob(current, { status: 'attention', error: '발송 기록 또는 수신 동의를 확인하지 못해 중단했습니다. 설정과 기록을 확인해 주세요.' }, dependencies)
      summary.attention++
      break
    }
  }
  return summary
}

export async function newsletterWorkerMain() {
  if (process.env.NEWSLETTER_ENABLED !== 'true') return { disabled: true }
  if (process.env.GITHUB_ACTIONS !== 'true' || process.env.NEWSLETTER_SERIAL_WORKER !== 'true') {
    throw new Error('Use the configured GitHub Actions workflow with its global concurrency lock')
  }
  const missing = gmailConfigurationMissing()
  for (const name of ['NOTION_TOKEN', 'NOTION_PRE_REGISTER_DB_ID', 'NEWSLETTER_QUEUE_PAGE_ID', 'NEWSLETTER_COMPANY_ADDRESS']) {
    if (!process.env[name]?.trim()) missing.push(name)
  }
  if ((process.env.MARKETING_UNSUBSCRIBE_SECRET || '').length < 32) missing.push('MARKETING_UNSUBSCRIBE_SECRET')
  if (missing.length) throw new Error('Newsletter worker configuration is incomplete: ' + missing.join(', '))
  return runNewsletterWorker()
}
