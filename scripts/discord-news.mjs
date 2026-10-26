import { pathToFileURL } from 'node:url'
export const STATE = 'Discord 알림 기록'
export const CATEGORY = '개발 소식'
const plain = (values = []) => values.map(v => v.plain_text || v.text?.content || '').join('')
const normalized = id => String(id || '').replaceAll('-', '')
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
const languages = {
  KO: { category: CATEGORY, locale: 'kr', prefix: '', secret: 'DISCORD_WEBHOOK_URL_KO', username: '리티 소식', fallback: '리티의 새로운 개발 소식을 만나보세요!', link: '개발일지 읽기 →', footer: '리티 · 개발 소식' },
  EN: { category: 'Development Updates', locale: 'en', prefix: '/en', secret: 'DISCORD_WEBHOOK_URL_EN', username: 'Ritty News', fallback: 'Discover the latest Ritty development updates!', link: 'Read the devlog →', footer: 'Ritty · Development Updates' },
}
const pageLanguage = p => p.properties?.['언어']?.select?.name || 'KO'
const record = p => plain(p.properties?.[STATE]?.rich_text)
const isPublic = p => !p.archived && !p.in_trash && p.properties?.['공개']?.checkbox === true
  && !!p.properties?.['게시일']?.date?.start && p.properties['게시일'].date.start.slice(0, 10) <= today()
export const eligible = p => isPublic(p) && p.properties?.['분류']?.select?.name === CATEGORY
  && Object.hasOwn(languages, pageLanguage(p)) && !!plain(p.properties?.['제목']?.title).trim()
export function payload(article) {
  const language = article.language || 'KO'
  if (!Object.hasOwn(languages, language)) throw new Error('Unsupported article language')
  const copy = languages[language]
  const texts = []
  function visit(blocks = []) {
    for (const b of blocks) {
      if (['paragraph', 'quote', 'callout', 'bulleted_list_item', 'numbered_list_item'].includes(b.type) && b.text) texts.push(b.text)
      visit(b.children)
    }
  }
  visit(article.blocks)
  const url = `https://ritty.sam-meows.com${copy.prefix}/news/${normalized(article.id)}`
  let cover
  try { const u = new URL(article.cover); if (u.protocol === 'https:') cover = u.href } catch {}
  return { username: copy.username, allowed_mentions: { parse: [] }, embeds: [{
    title: article.title.slice(0, 256), url, color: 0xFF7979,
    description: `${texts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 400) || copy.fallback}\n\n[${copy.link}](${url})`,
    ...(cover ? { image: { url: cover } } : {}), footer: { text: copy.footer },
  }] }
}
export async function run({ mode = 'preview', env = process.env, fetcher = fetch, log = console.log } = {}) {
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
        webhook.search = '?wait=true'
        webhooks[language] = webhook
      } catch { throw new Error('Set a valid ' + config.secret) }
    }
    if (webhooks.KO.pathname.replace('/v10/', '/') === webhooks.EN.pathname.replace('/v10/', '/')) throw new Error('Use separate Korean and English channel webhooks')
  }
  // Fetch exceptions may include secret URLs; report only sanitized errors.
  async function request(url, options = {}) {
    try { return await fetcher(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(20000) }) }
    catch { throw new Error('Network request failed; check service availability') }
  }
  async function notion(path, method = 'GET', body) {
    for (let attempt = 0; ; attempt++) {
      const res = await request(`https://api.notion.com/v1/${path}`, { method,
        headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      if (res.status === 429 && attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, Math.min(10, Math.max(1, Number(res.headers.get('retry-after')) || 1)) * 1000)); continue
      }
      if (!res.ok) throw new Error(`Notion HTTP ${res.status}`)
      return res.json()
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
    try {
      const id = normalized(p.id)
      const live = await request(`https://ritty.sam-meows.com/api/news/${id}?locale=${config.locale}`, { cache: 'no-store' })
      if (!live.ok) throw new Error(`Website article HTTP ${live.status}; will retry`)
      const article = await live.json()
      if (article.id !== id || article.category !== config.category || article.language !== language) throw new Error('Website article does not match the public development post')
      const html = await request(`https://ritty.sam-meows.com${articlePath}`, { cache: 'no-store' })
      if (!html.ok) throw new Error(`Website page HTTP ${html.status}; will retry`)
      await html.body?.cancel()
      await mark(p.id, `pending:${new Date().toISOString()}`)
      const res = await request(webhooks[language].href, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload(article)) })
      if (!res.ok) {
        if (res.status >= 400 && res.status < 500) await mark(p.id, '')
        throw new Error(`Discord HTTP ${res.status}`)
      }
      const message = await res.json()
      if (!/^\d+$/.test(message.id || '')) throw new Error('Discord message ID missing; inspect pending record')
      await mark(p.id, `sent:${message.id}`)
      processed++; log(`Sent ${language}: ${articlePath}`)
    } catch (error) { failures.push(`${normalized(p.id)}: ${error.message}`) }
  }
  log(`${mode}: ${processed} post(s)`)
  if (failures.length) throw new Error(failures.join('\n'))
  return processed
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run({ mode: process.argv[2] || 'preview' }).catch(error => { console.error(error.message); process.exitCode = 1 })
}
