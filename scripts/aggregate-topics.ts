/**
 * Topic aggregator (git-scraping).
 *
 * Reads scripts/sources.json, fetches recent meeting topics from each
 * community's source through a matching adapter, and writes the merged result
 * to src/data/topics.json. Designed to run on a GitHub Action cron and
 * auto-commit any changes.
 *
 * Run locally: bun run scripts/aggregate-topics.ts
 * A GITHUB_TOKEN in the environment raises the GitHub API rate limit.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { CommunityTopics, Topic, TopicsIndex } from '../src/types'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCES_PATH = join(root, 'scripts/sources.json')
const TOPICS_PATH = join(root, 'src/data/topics.json')

/** Max topics kept per community. */
const MAX_TOPICS = 5

interface GithubIssuesSource {
  adapter: 'github-issues'
  /** "owner/repo" whose issues hold the meeting minutes. */
  repo: string
}

type Source = GithubIssuesSource

type Adapter = (source: Source) => Promise<Topic[]>

/** Fetch recent, non-PR issues from a repo and map them to topics. */
const githubIssues: Adapter = async (source) => {
  const url = new URL(`https://api.github.com/repos/${source.repo}/issues`)
  url.searchParams.set('state', 'all')
  url.searchParams.set('sort', 'updated')
  url.searchParams.set('direction', 'desc')
  url.searchParams.set('per_page', '20')

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'bitdevsmap-aggregator',
  }
  const token = process.env.GITHUB_TOKEN
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} ${res.statusText} for ${source.repo}`)
  }

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

const adapters: Record<Source['adapter'], Adapter> = {
  'github-issues': githubIssues,
}

function readTopicsIndex(): TopicsIndex {
  try {
    return JSON.parse(readFileSync(TOPICS_PATH, 'utf8')) as TopicsIndex
  } catch {
    return {}
  }
}

async function main() {
  const sources = JSON.parse(readFileSync(SOURCES_PATH, 'utf8')) as Record<string, Source>
  // Start from the existing index so a failing source keeps its last-known
  // topics instead of being wiped from the map.
  const index = readTopicsIndex()
  const fetchedAt = new Date().toISOString()

  let updated = 0
  for (const [id, source] of Object.entries(sources)) {
    const adapter = adapters[source.adapter]
    if (!adapter) {
      console.warn(`[skip] ${id}: unknown adapter "${source.adapter}"`)
      continue
    }

    try {
      const topics = (await adapter(source)).slice(0, MAX_TOPICS)
      const entry: CommunityTopics = { id, source: source.adapter, fetchedAt, topics }
      index[id] = entry
      updated++
      console.log(`[ok] ${id}: ${topics.length} topics`)
    } catch (err) {
      console.warn(`[fail] ${id}: ${(err as Error).message} (keeping previous data)`)
    }
  }

  // Sort keys for stable, review-friendly diffs.
  const sorted: TopicsIndex = {}
  for (const key of Object.keys(index).sort()) sorted[key] = index[key]

  writeFileSync(TOPICS_PATH, JSON.stringify(sorted, null, 2) + '\n')
  console.log(`Wrote ${TOPICS_PATH} (${updated}/${Object.keys(sources).length} sources updated)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
