/**
 * Topic aggregator (git-scraping).
 *
 * Walks every community in src/data/bitdevs.json and collects recent meeting
 * topics through a matching adapter, then writes the merged result to
 * src/data/topics.json. Designed to run on a GitHub Action cron and
 * auto-commit any changes.
 *
 *   - github-issues: communities configured in scripts/sources.json whose
 *     minutes live in GitHub issues.
 *   - rss: every other community with a website. Auto-discovers an RSS/Atom
 *     feed and extracts the discussion topics from the latest seminar entry.
 *
 * Run locally: bun run scripts/aggregate-topics.ts
 * A GITHUB_TOKEN in the environment raises the GitHub API rate limit.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { BitDev, Topic, TopicsIndex } from '../src/types'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const BITDEVS_PATH = join(root, 'src/data/bitdevs.json')
const SOURCES_PATH = join(root, 'scripts/sources.json')
const TOPICS_PATH = join(root, 'src/data/topics.json')

/** Max topics kept per community (the full "Show all" list; preview shows 3). */
const MAX_TOPICS = 50
/** Concurrent community fetches. */
const CONCURRENCY = 12
/** Feed paths probed during auto-discovery, in order. */
const FEED_PATHS = ['/feed.xml', '/rss.xml', '/atom.xml', '/feed', '/index.xml']
/** Hosts that never carry a topic feed (social, meetup, code hosts). */
const SKIP_HOSTS = [
  'x.com', 'twitter.com', 'mobile.twitter.com', 'nitter.net',
  'meetup.com', 'github.com', 't.me', 'discord.gg', 'discord.com',
]
/** Link hosts that are navigation/social/dashboards, never a discussion topic.
 * (Code hosts like github.com are intentionally absent — PRs are real topics.) */
const BAD_LINK_HOSTS = [
  'x.com', 'twitter.com', 'mobile.twitter.com', 'nitter.net', 'bsky.app', 'nostr.com',
  't.me', 'telegram.org', 'youtube.com', 'youtu.be', 'meetup.com', 'lu.ma', 'eventbrite.com',
  'mempool.space', 'clarkmoody.com', 'dashboard.clarkmoody.com', 'bitnodes.io', 'bitnod.es',
  'wikipedia.org', 'chathamhouse.org', 'discord.gg', 'discord.com', 'linkedin.com',
  'facebook.com', 'instagram.com', 'docs.google.com', 'forms.gle',
]
const UA = 'bitdevsmap-aggregator'

// --- generic helpers -------------------------------------------------------

// Named entities common in feed titles (typographic punctuation) beyond the
// numeric refs handled above. &amp; is decoded last to avoid double-decoding.
const NAMED_ENTITIES: Record<string, string> = {
  '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ',
  '&rsquo;': '’', '&lsquo;': '‘', '&rdquo;': '”', '&ldquo;': '“',
  '&mdash;': '—', '&ndash;': '–', '&hellip;': '…', '&deg;': '°',
  '&copy;': '©', '&reg;': '®', '&trade;': '™',
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&(?:lt|gt|quot|apos|nbsp|rsquo|lsquo|rdquo|ldquo|mdash|ndash|hellip|deg|copy|reg|trade);/g,
      (m) => NAMED_ENTITIES[m] ?? m)
    .replace(/&amp;/g, '&')
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function toISO(raw: string): string | undefined {
  const t = new Date(raw.trim()).getTime()
  return Number.isNaN(t) ? undefined : new Date(t).toISOString()
}

function absolute(href: string, base: string): string {
  try {
    return new URL(href, base).href
  } catch {
    return href
  }
}

async function fetchText(url: string, timeoutMs = 7_000): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: '*/*' },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

/** Hard cap on a whole community's work so one slow host can't stall the run. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const guard = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms (${label})`)), ms)
  })
  return Promise.race([p.finally(() => clearTimeout(timer)), guard])
}

// --- github-issues adapter -------------------------------------------------

interface GithubIssuesSource {
  adapter: 'github-issues'
  repo: string
}

async function githubIssues(source: GithubIssuesSource): Promise<Topic[]> {
  const url = new URL(`https://api.github.com/repos/${source.repo}/issues`)
  url.searchParams.set('state', 'all')
  url.searchParams.set('sort', 'updated')
  url.searchParams.set('direction', 'desc')
  url.searchParams.set('per_page', '20')

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': UA,
  }
  const token = process.env.GITHUB_TOKEN
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${source.repo}`)

  const issues = (await res.json()) as Array<{
    title: string
    html_url: string
    created_at: string
    updated_at: string
    pull_request?: unknown
  }>

  return issues
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({
      title: issue.title,
      url: issue.html_url,
      date: issue.updated_at ?? issue.created_at,
    }))
}

// --- rss/atom adapter ------------------------------------------------------

interface FeedEntry {
  title: string
  link: string
  date: string
  content: string
}

const isFeed = (xml: string) => /<(feed|rss)[\s>]/i.test(xml.slice(0, 1000))

async function discoverFeed(base: string): Promise<{ url: string; xml: string } | null> {
  const origin = new URL(base).origin
  for (const path of FEED_PATHS) {
    try {
      const xml = await fetchText(origin + path)
      if (isFeed(xml)) return { url: origin + path, xml }
    } catch {
      // try next path
    }
  }
  // Fall back to the <link rel="alternate"> advertised on the homepage.
  try {
    const html = await fetchText(base)
    const tag = html.match(/<link[^>]+application\/(?:rss|atom)\+xml[^>]*>/i)?.[0]
    const href = tag?.match(/href=["']([^"']+)["']/i)?.[1]
    if (href) {
      const url = absolute(href, base)
      const xml = await fetchText(url)
      if (isFeed(xml)) return { url, xml }
    }
  } catch {
    // give up
  }
  return null
}

function parseEntries(xml: string): FeedEntry[] {
  const atom = /<feed[\s>]/i.test(xml)
  const chunks = xml.split(atom ? /<entry[\s>]/i : /<item[\s>]/i).slice(1)
  return chunks.map((block) => {
    const title = stripTags(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
    let link = ''
    if (atom) {
      const tag =
        block.match(/<link[^>]*rel=["']alternate["'][^>]*>/i)?.[0] ??
        block.match(/<link[^>]+href=[^>]*>/i)?.[0]
      link = tag?.match(/href=["']([^"']+)["']/i)?.[1] ?? ''
    } else {
      link = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? '').trim()
    }
    const date = block.match(/<(?:published|updated|pubDate)[^>]*>([\s\S]*?)<\//i)?.[1] ?? ''
    let content =
      block.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i)?.[1] ??
      block.match(/<content[^>]*>([\s\S]*?)<\/content>/i)?.[1] ??
      block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ??
      ''
    const cdata = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
    content = cdata ? cdata[1] : decodeEntities(content)
    return { title, link, date, content }
  })
}

type RawTopic = Omit<Topic, 'date'>

// Section headings that are structure, not discussion topics. Matched against
// the whole heading text so real topics like "BIP 450: Formosa" or
// "Bitcoin Core CVE-2024-52911" (which merely mention these words) are kept.
const BOILERPLATE =
  /^(announcements?|housekeeping|presentations?|introductions?|general links?|links?|news( &amp;| &| and)? ?announcements?|new releases?|releases?|chain weather( report)?|discussion|(delving bitcoin[, ].*)?mailing lists?(,? .*)?|meetings?|optech|network data|cves?( and research)?|research|infosec|improvement proposals?|bips?( &amp;| &)? ?proposals?|pull requests?.*|repo updates?|noteworthy prs?|pr.?s|.*\bevents?|sponsors?|.*trivia.*|recent (questions|research)|topics?( bitcoin)?|agenda|miscellaneous|misc\.?|ai|local\/legal|beginners.*|meme.*|avisos|agradecimentos?|cronograma|formato|informa[cç][õo]es.*|apresenta[cç][õo]es|aquecimento|warm ?up|presentaci\S+|introducci\S+|novedades\S*)$/i

/** Pattern 1: an explicit "Topics"/"Agenda" section. The real topics are the
 * linked list items inside it; category sub-headings are intentionally ignored
 * so we surface "Remove Taproot BIP 9 Deployment", not "Mining". */
function fromTopicsSection(content: string, entryLink: string): RawTopic[] {
  const heading = content.match(/<h([1-4])[^>]*>\s*(?:<[^>]+>\s*)*(?:topics|agenda)\b[\s\S]*?<\/h\1>/i)
  if (!heading) return []
  const level = Number(heading[1])
  let section = content.slice((heading.index ?? 0) + heading[0].length)
  const cut = section.search(new RegExp(`<h[1-${level}][\\s>]`, 'i'))
  if (cut >= 0) section = section.slice(0, cut)

  const topics: RawTopic[] = []
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi
  for (let m; (m = liRe.exec(section)); ) {
    const li = m[1]
    const anchor = li.match(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i)
    const title = stripTags(anchor ? anchor[2] : li)
    if (isNoise(title)) continue
    topics.push({ title, url: anchor ? absolute(anchor[1], entryLink) : entryLink })
  }
  return topics
}

/** A heading/title specific enough to be a real topic rather than a section
 * label: it carries a number, a colon, or reads as a phrase (>= 4 words). */
const isSpecific = (t: string) => /\d/.test(t) || t.includes(':') || t.trim().split(/\s+/).length >= 4

/** A raw URL, a structural label ("Attendees:"), a boilerplate section name, a
 * bare one-word label, or something too short/long to be a real topic. */
const isNoise = (t: string) =>
  !t ||
  t.length < 4 ||
  t.length > 200 ||
  /^https?:\/\//i.test(t) ||
  /:\s*$/.test(t) ||
  /^(npub1|nsec1|[0-9a-f]{40,})/i.test(t) || // nostr keys / hashes
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2}$/i.test(t) || // "May 28"
  /^\d{2,6}\s+\w.*\b(blvd|ave|avenue|st|street|road|rd|suite|ste|dr|drive|way|lane|ln)\b/i.test(t) || // street address
  (!t.includes(' ') && /^[\w.-]+\.[a-z]{2,6}(\/\S*)?$/i.test(t)) || // bare domain "delvingbitcoin.org"
  (!t.includes(' ') && /^[\w.-]+\/[\w.@#-]+$/i.test(t)) || // repo path "owner/repo#99"
  BOILERPLATE.test(t) ||
  (!t.includes(' ') && !/\d/.test(t) && t.length < 10)

/** Pattern 2: each top-level heading is itself a topic (Chicago-style). Only
 * trusted for specific, non-boilerplate headings, and only when several exist,
 * so category-based layouts fall through cleanly instead of adding noise. */
function fromHeadingTopics(content: string, entryLink: string): RawTopic[] {
  const topics: RawTopic[] = []
  const re = /<h2([^>]*)>([\s\S]*?)<\/h2>/gi
  for (let m; (m = re.exec(content)); ) {
    const title = stripTags(m[2])
    if (isNoise(title) || !isSpecific(title)) continue
    const id = m[1].match(/id=["']([^"']+)["']/i)?.[1]
    topics.push({ title, url: id ? `${entryLink}#${id}` : entryLink })
  }
  return topics.length >= 3 ? topics : []
}

const hostOfUrl = (url: string): string => {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return ''
  }
}
const isBadLinkHost = (host: string) =>
  !host || BAD_LINK_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))

/** Pattern 3: the discussion topics are the linked list items themselves — a
 * bitcoin-dev thread, a Delving post, a PR. Used for the many communities whose
 * seminar notes group links under category headings ("Mailing Lists", etc.).
 * Keeps only descriptive titles pointing at real content (not social/dashboards
 * or the community's own site). */
function fromContentLinks(content: string, entryLink: string): RawTopic[] {
  const selfHost = hostOfUrl(entryLink)
  const topics: RawTopic[] = []
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi
  for (let m; (m = liRe.exec(content)); ) {
    const anchor = m[1].match(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i)
    if (!anchor) continue
    const title = stripTags(anchor[2])
    if (isNoise(title) || !isSpecific(title)) continue
    const url = absolute(anchor[1], entryLink)
    const host = hostOfUrl(url)
    if (host === selfHost || isBadLinkHost(host)) continue
    topics.push({ title, url })
  }
  return topics
}

/** Extract discussion topics from one seminar's HTML content. */
function extractTopics(content: string, entryLink: string): RawTopic[] {
  const byPriority = [
    fromTopicsSection(content, entryLink),
    fromHeadingTopics(content, entryLink),
    fromContentLinks(content, entryLink),
  ]
  const raw = byPriority.find((c) => c.length >= 3) ?? byPriority.find((c) => c.length > 0) ?? []

  const seen = new Set<string>()
  const topics = raw.filter((t) => {
    const key = t.title.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Reject category tables of contents: most surviving topics must be specific.
  const specific = topics.filter((t) => isSpecific(t.title)).length
  return specific >= 2 && specific >= Math.ceil(topics.length / 2) ? topics : []
}

interface RssResult {
  topics: Topic[]
  seminar?: string
  note?: string
}

async function rssAdapter(community: BitDev): Promise<RssResult> {
  const found = await discoverFeed(community.url)
  if (!found) return { topics: [], note: 'no feed' }

  for (const entry of parseEntries(found.xml)) {
    const entryLink = entry.link ? absolute(entry.link, community.url) : community.url
    const raw = extractTopics(entry.content, entryLink)
    if (raw.length === 0) continue
    const date = toISO(entry.date)
    return {
      topics: raw.slice(0, MAX_TOPICS).map((t) => ({ ...t, date })),
      seminar: entry.title,
    }
  }
  return { topics: [], note: 'feed but no topics' }
}

// --- orchestration ---------------------------------------------------------

interface Outcome {
  city: BitDev
  source?: string
  topics?: Topic[]
  seminar?: string
  skipped?: string
  error?: string
}

async function pool<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const run = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await worker(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run))
  return results
}

function readTopicsIndex(): TopicsIndex {
  try {
    return JSON.parse(readFileSync(TOPICS_PATH, 'utf8')) as TopicsIndex
  } catch {
    return {}
  }
}

async function main() {
  const cities = JSON.parse(readFileSync(BITDEVS_PATH, 'utf8')) as BitDev[]
  const sources = JSON.parse(readFileSync(SOURCES_PATH, 'utf8')) as Record<string, GithubIssuesSource>
  const previous = readTopicsIndex()
  const fetchedAt = new Date().toISOString()

  let done = 0
  const report = (o: Outcome): Outcome => {
    done++
    const tag = o.topics?.length
      ? `ok ${o.source} (${o.topics.length})`
      : o.error
        ? `err ${o.error}`
        : `skip ${o.skipped}`
    console.log(`[${String(done).padStart(2)}/${cities.length}] ${o.city.city}: ${tag}`)
    return o
  }

  const outcomes = await pool<BitDev, Outcome>(
    cities,
    async (city) => {
      const explicit = sources[city.id]
      if (explicit?.adapter === 'github-issues') {
        try {
          return report({ city, source: 'github-issues', topics: (await githubIssues(explicit)).slice(0, MAX_TOPICS) })
        } catch (err) {
          return report({ city, error: (err as Error).message })
        }
      }

      const host = hostOfUrl(city.url)
      if (!host || SKIP_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
        return report({ city, skipped: 'non-website' })
      }

      try {
        const r = await withTimeout(rssAdapter(city), 25_000, city.city)
        return report(
          r.topics.length
            ? { city, source: 'rss', topics: r.topics, seminar: r.seminar }
            : { city, skipped: r.note },
        )
      } catch (err) {
        return report({ city, error: (err as Error).message })
      }
    },
    CONCURRENCY,
  )

  // Rebuild the index from scratch each run so tightened filters can drop
  // communities that no longer yield clean topics. A "no topics" skip is a real
  // (possibly permanent) result and is intentionally NOT carried over — only a
  // genuine network error reuses the last-known topics, so a momentary outage
  // doesn't drop a community.
  const index: TopicsIndex = {}
  for (const o of outcomes) {
    if (o.topics && o.topics.length > 0) {
      index[o.city.id] = { id: o.city.id, source: o.source!, fetchedAt, topics: o.topics }
    } else if (o.error && previous[o.city.id]) {
      index[o.city.id] = previous[o.city.id]
    }
  }

  const sorted: TopicsIndex = {}
  for (const key of Object.keys(index).sort()) sorted[key] = index[key]
  writeFileSync(TOPICS_PATH, JSON.stringify(sorted, null, 2) + '\n')

  // --- coverage report (derived from the written index, no silent caps) ---
  const withTopics = outcomes.filter((o) => o.topics && o.topics.length > 0)
  const errored = outcomes.filter((o) => o.error)
  const written = Object.keys(index).length
  const carried = written - withTopics.length

  const bySource: Record<string, number> = {}
  for (const entry of Object.values(index)) bySource[entry.source] = (bySource[entry.source] ?? 0) + 1

  console.log(
    `\nCoverage: ${written}/${cities.length} communities in topics.json` +
      ` (fresh ${withTopics.length}, carried over ${carried})`,
  )
  console.log('  by source:', bySource)
  console.log(`  skipped: ${outcomes.filter((o) => o.skipped).length}, errored: ${errored.length}`)
  for (const o of withTopics) {
    console.log(`  [${o.source}] ${o.city.city}: ${o.topics!.length}${o.seminar ? ` — ${o.seminar}` : ''}`)
  }
  if (errored.length) {
    console.log('errors:')
    for (const o of errored) console.log(`  ${o.city.city}: ${o.error}`)
  }
  console.log(`\nWrote ${TOPICS_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
