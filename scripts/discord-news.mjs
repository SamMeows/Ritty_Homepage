import { pathToFileURL } from 'node:url'
export const STATE = 'Discord 알림 기록'
export const CATEGORY = '개발 소식'
const plain = (values = []) => values.map(v => v.plain_text || v.text?.content || '').join('')
const normalized = id => String(id || '').replaceAll('-', '')
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
const languages = {
  KO: { category: CATEGORY, locale: 'kr', prefix: '', secret: 'DISCORD_WEBHOOK_URL_KO', username: '리티 소식', tag: '1568575302345560086',
    read: '홈페이지에서 보기', register: '새로운 리티 사전등록', tooLarge: '🖼️ 용량이 큰 이미지는 홈페이지에서 볼 수 있어요' },
  EN: { category: 'Development Updates', locale: 'en', prefix: '/en', secret: 'DISCORD_WEBHOOK_URL_EN', username: 'Ritty News', tag: '1568575304513884262',
    read: 'Read on the website', register: 'Pre-register for the new Ritty', tooLarge: '🖼️ This image is too large for Discord; see it on the website' },
}
const SITE = 'https://ritty.sam-meows.com'
const UTM = 'utm_source=discord&utm_medium=referral&utm_campaign=devlog'
const MAX_TEXT = 1900
const MAX_FILES = 10
// Discord's default upload limit is 10 MiB per file for servers below boost level 2.
export const MAX_FILE_BYTES = 10 * 1024 * 1024 - 64 * 1024
const MAX_MESSAGE_BYTES = 24 * 1024 * 1024
const SUPPRESS_EMBEDS = 1 << 2
const pageLanguage = p => p.properties?.['언어']?.select?.name || 'KO'
const record = p => plain(p.properties?.[STATE]?.rich_text)
const isPublic = p => !p.archived && !p.in_trash && p.properties?.['공개']?.checkbox === true
  && !!p.properties?.['게시일']?.date?.start && p.properties['게시일'].date.start.slice(0, 10) <= today()
export const eligible = p => isPublic(p) && p.properties?.['분류']?.select?.name === CATEGORY
  && Object.hasOwn(languages, pageLanguage(p)) && !!plain(p.properties?.['제목']?.title).trim()
const safeHttps = value => { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : undefined } catch { return undefined } }

// Turns a website article into forum messages: body text in reading order, images attached where they appear.
export function messages(article) {
  const language = article.language || 'KO'
  if (!Object.hasOwn(languages, language)) throw new Error('Unsupported article language')
  const copy = languages[language]
  const url = `${SITE}${copy.prefix}/news/${normalized(article.id)}`
  const items = []
  let number = 0
  function visit(blocks = []) {
    for (const b of blocks) {
      const text = String(b.text || '').trim()
      number = b.type === 'numbered_list_item' ? number + 1 : 0
      if (b.type === 'image' || b.type === 'video') { const href = safeHttps(b.href); if (href) items.push({ file: href }) }
      else if (/^heading_[123]$/.test(b.type)) { if (text) items.push({ text: `## ${text}` }) }
      else if (b.type === 'bulleted_list_item') items.push({ text: `- ${text}` })
      else if (b.type === 'numbered_list_item') items.push({ text: `${number}. ${text}` })
      else if (b.type === 'quote' || b.type === 'callout') items.push({ text: `> ${text}` })
      else if (b.type === 'divider') items.push({ text: '' })
      else if (b.type === 'link') { const href = safeHttps(b.href); if (href) items.push({ text: text && text !== href ? `[${text}](${href})` : href, link: href }) }
      else if (text) items.push({ text })
      else if (b.type === 'paragraph') items.push({ text: '' })
      if (b.type !== 'numbered_list_item' && b.children?.length) visit(b.children)
    }
  }
  visit(article.blocks)
  const out = []
  let current = { lines: [], files: [], closed: false }
  const flush = () => {
    const content = current.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
    if (content || current.files.length) out.push({ content, files: current.files })
    current = { lines: [], files: [], closed: false }
  }
  // The cover opens the first post; body images close the text above them, so text after an image starts a new message.
  const cover = safeHttps(article.cover)
  if (cover) current.files.push(cover)
  for (const item of items) {
    if (item.file) {
      if (current.files.length >= MAX_FILES) flush()
      current.files.push(item.file); current.closed = true
      continue
    }
    if (!item.text && (current.closed || !current.lines.length)) continue
    if (item.link && current.lines.join('\n').includes(item.link)) continue
    // A short "(caption)" right after images stays with them; Discord shows text above attachments.
    if (current.closed && /^\(.{1,80}\)$/.test(item.text) && current.lines.join('\n').length + item.text.length < MAX_TEXT) { current.lines.push(item.text); continue }
    if (current.closed) flush()
    for (let line = item.text; ;) {
      const used = current.lines.join('\n').length
      if (used + line.length + 1 <= MAX_TEXT) { current.lines.push(line); break }
      if (used) { flush(); continue }
      current.lines.push(line.slice(0, MAX_TEXT)); line = line.slice(MAX_TEXT); flush()
      if (!line) break
    }
  }
  flush()
  out.push({ content: `🔗 [${copy.read}](<${url}?${UTM}>) · [${copy.register}](<${SITE}${copy.prefix}?${UTM}>)`, files: [] })
  return { title: String(article.title || '').slice(0, 100), username: copy.username, tag: copy.tag, tooLarge: copy.tooLarge, url, messages: out }
}

export async function run({ mode = 'preview', env = process.env, fetcher = fetch, log = console.log, wait = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  if (!['preview', 'initialize', 'send'].includes(mode)) throw new Error('Unknown mode')
  const token = env.NOTION_NEWS_TOKEN || env.NOTION_TOKEN
  const source = env.NOTION_NEWS_DATA_SOURCE_ID || '83793ee8-a696-468d-85ef-9d41e880b692'
  if (!token) throw new Error('Set NOTION_NEWS_TOKEN')
  if (mode === 'send' && env.DISCORD_NEWS_ENABLED !== 'true') throw new Error('Initialize existing posts, then set DISCORD_NEWS_ENABLED=true')
  const webhooks = {}
  if (mode === 'send') {
    for (const [language, config] of Object.entries(languages)) {
      try {
        const webhook = new URL(env[config.secret])
        if (webhook.protocol !== 'https:' || webhook.hostname !== 'discord.com' || !/^\/api(?:\/v\d+)?\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(webhook.pathname)) throw new Error()
        webhook.search = ''
        webhooks[language] = webhook
      } catch { throw new Error('Set a valid ' + config.secret) }
    }
    if (webhooks.KO.pathname.replace('/v10/', '/') === webhooks.EN.pathname.replace('/v10/', '/')) throw new Error('Use separate Korean and English channel webhooks')
  }
  // Fetch exceptions may include secret URLs; report only sanitized errors.
  async function request(url, options = {}) {
    try { return await fetcher(url, { ...options, redirect: options.redirect || 'error', signal: AbortSignal.timeout(options.timeout || 20000) }) }
    catch { throw new Error('Network request failed; check service availability') }
  }
  async function notion(path, method = 'GET', body) {
    for (let attempt = 0; ; attempt++) {
      const res = await request(`https://api.notion.com/v1/${path}`, { method,
        headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      if (res.status === 429 && attempt < 2) {
        await wait(Math.min(10, Math.max(1, Number(res.headers.get('retry-after')) || 1)) * 1000); continue
      }
      if (!res.ok) throw new Error(`Notion HTTP ${res.status}`)
      return res.json()
    }
  }
  // Downloads every attachment before anything is posted, so a broken image cannot leave a half-posted thread.
  async function attachments(post) {
    const ready = []
    for (const message of post.messages) {
      const files = [], notes = []
      for (const href of message.files) {
        const res = await request(href, { redirect: 'follow', timeout: 60000 })
        if (!res.ok) throw new Error(`Article image HTTP ${res.status}; will retry`)
        const bytes = await res.arrayBuffer()
        if (bytes.byteLength > MAX_FILE_BYTES) { notes.push(post.tooLarge); continue }
        const type = (res.headers.get('content-type') || 'image/png').split(';')[0]
        const ext = (new URL(href).pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1] || type.split('/')[1] || 'png').toLowerCase()
        files.push({ blob: new Blob([bytes], { type }), name: `ritty-${ready.length + 1}-${files.length + 1}.${ext}`, size: bytes.byteLength })
      }
      // Keep each request under Discord's total upload size; overflow files follow in extra messages.
      const groups = [[]]
      for (const file of files) {
        const last = groups[groups.length - 1]
        if (last.length && last.reduce((s, f) => s + f.size, 0) + file.size > MAX_MESSAGE_BYTES) groups.push([])
        groups[groups.length - 1].push(file)
      }
      const content = [message.content, ...new Set(notes)].filter(Boolean).join('\n\n')
      groups.forEach((group, i) => { if (i === 0 ? content || group.length : group.length) ready.push({ content: i === 0 ? content : '', files: group }) })
    }
    return ready
  }
  async function deliver(webhook, post, message, threadId) {
    const form = new FormData()
    form.append('payload_json', JSON.stringify({
      content: message.content, username: post.username, allowed_mentions: { parse: [] }, flags: SUPPRESS_EMBEDS,
      ...(threadId ? {} : { thread_name: post.title, applied_tags: [post.tag] }),
      attachments: message.files.map((f, id) => ({ id, filename: f.name })),
    }))
    message.files.forEach((f, id) => form.append(`files[${id}]`, f.blob, f.name))
    const target = new URL(webhook.href); target.searchParams.set('wait', 'true')
    if (threadId) target.searchParams.set('thread_id', threadId)
    for (let attempt = 0; ; attempt++) {
      const res = await request(target.href, { method: 'POST', body: form, timeout: 120000 })
      if (res.status === 429 && attempt < 3) {
        const body = await res.json().catch(() => ({}))
        await wait(Math.min(30, Math.max(1, Number(body.retry_after) || Number(res.headers.get('retry-after')) || 2)) * 1000); continue
      }
      return res
    }
  }
  const schema = await notion(`data_sources/${source}`)
  for (const [name, type] of [['공개', 'checkbox'], ['게시일', 'date'], ['분류', 'select'], ['언어', 'select'], ['제목', 'title'], [STATE, 'rich_text']]) {
    if (schema.properties?.[name]?.type !== type) throw new Error(`Notion property required: ${name} (${type})`)
  }
  if (!schema.properties['분류'].select.options.some(o => o.name === CATEGORY)) throw new Error(`Missing category: ${CATEGORY}`)
  const mark = (id, value) => notion(`pages/${id}`, 'PATCH', {
    properties: { [STATE]: { rich_text: value ? [{ type: 'text', text: { content: value } }] : [] } },
  })
  const pages = []
  let cursor
  do {
    const data = await notion(`data_sources/${source}/query`, 'POST', {
      page_size: 100, ...(cursor ? { start_cursor: cursor } : {}),
      filter: { and: [{ property: '공개', checkbox: { equals: true } }, { property: '게시일', date: { on_or_before: today() } }] },
      sorts: [{ property: '게시일', direction: 'ascending' }],
    })
    pages.push(...data.results); cursor = data.has_more ? data.next_cursor : undefined
  } while (cursor)
  let processed = 0
  const failures = []
  for (const listed of pages) {
    const p = await notion(`pages/${listed.id}`)
    if (normalized(p.parent?.data_source_id) !== normalized(source) || !isPublic(p)) continue
    const current = record(p)
    if (mode === 'initialize') {
      if (!current) { await mark(p.id, `skipped:existing:${new Date().toISOString()}`); processed++ }
      continue
    }
    if (!eligible(p)) continue
    const language = pageLanguage(p)
    const config = languages[language]
    const articlePath = `${config.prefix}/news/${normalized(p.id)}`
    if (current.startsWith('pending:')) { failures.push(`${normalized(p.id)}: pending; inspect Discord before clearing record`); continue }
    if (current) continue
    if (mode === 'preview') { log(`Would send ${language}: ${articlePath}`); processed++; continue }
    if (processed >= 5) break
    let threadId, posted = false
    try {
      const id = normalized(p.id)
      const live = await request(`${SITE}/api/news/${id}?locale=${config.locale}`, { cache: 'no-store' })
      if (!live.ok) throw new Error(`Website article HTTP ${live.status}; will retry`)
      const article = await live.json()
      if (article.id !== id || article.category !== config.category || article.language !== language) throw new Error('Website article does not match the public development post')
      const html = await request(`${SITE}${articlePath}`, { cache: 'no-store' })
      if (!html.ok) throw new Error(`Website page HTTP ${html.status}; will retry`)
      await html.body?.cancel()
      const post = messages(article)
      const ready = await attachments(post)
      await mark(p.id, `pending:${new Date().toISOString()}`)
      const first = await deliver(webhooks[language], post, ready[0])
      if (!first.ok) {
        if (first.status >= 400 && first.status < 500) await mark(p.id, '')
        throw new Error(`Discord HTTP ${first.status}`)
      }
      const message = await first.json()
      threadId = message.channel_id || message.id
      if (!/^\d+$/.test(threadId || '')) throw new Error('Discord message ID missing; inspect pending record')
      for (const next of ready.slice(1)) {
        await wait(700)
        const res = await deliver(webhooks[language], post, next, threadId)
        if (!res.ok) throw new Error(`Discord HTTP ${res.status} after thread ${threadId}; finish or delete the post`)
      }
      posted = true
      await mark(p.id, `sent:${threadId}`)
      processed++; log(`Sent ${language}: ${articlePath} (${ready.length} messages)`)
    } catch (error) {
      // A half-posted thread must not be resent; a fully posted one whose save failed stays pending for inspection.
      if (threadId && !posted) await mark(p.id, `partial:${threadId}`).catch(() => {})
      failures.push(`${normalized(p.id)}: ${error.message}`)
    }
  }
  log(`${mode}: ${processed} post(s)`)
  if (failures.length) throw new Error(failures.join('\n'))
  return processed
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run({ mode: process.argv[2] || 'preview' }).catch(error => { console.error(error.message); process.exitCode = 1 })
}
