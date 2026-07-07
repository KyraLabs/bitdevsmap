import { useMemo } from 'react'
import type { BitDev, TopicsIndex } from '../types'

// Most recent topics shown in the global feed.
const MAX_FEED = 40

interface Props {
  cities: BitDev[]
  topics: TopicsIndex
}

interface FeedItem {
  city: string
  country: string
  /** Community site, used when a topic has no direct link. */
  siteUrl: string
  title: string
  url?: string
  date?: string
}

function timeAgo(iso?: string): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const days = Math.floor(Math.max(0, Date.now() - then) / 86_400_000)
  if (days < 1) return 'today'
  if (days === 1) return '1d ago'
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[13px] w-[13px]"
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  )
}

export default function TopicsPage({ cities, topics }: Props) {
  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = []
    for (const city of cities) {
      const community = topics[city.id]
      if (!community) continue
      for (const topic of community.topics) {
        items.push({
          city: city.city,
          country: city.country,
          siteUrl: city.url,
          title: topic.title,
          url: topic.url,
          date: topic.date,
        })
      }
    }
    items.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    return items.slice(0, MAX_FEED)
  }, [cities, topics])

  const communityCount = new Set(
    feed.map((f) => `${f.city}, ${f.country}`),
  ).size

  return (
    <section className="pt-[74px] pb-[80px]" id="topics">
      <div className="wrap">
        <div className="max-w-[760px]">
          <p className="m-0 font-mono text-[11.5px] font-medium uppercase tracking-[0.26em] text-kyra-orange">
            Global topics feed
          </p>
          <h1 className="mt-[18px] font-sans text-[clamp(34px,5vw,54px)] font-bold leading-[1.04] tracking-[-0.025em] text-strong">
            What BitDevs is <span className="text-kyra-orange">discussing</span>
          </h1>
          <p className="mt-5 max-w-[620px] text-[clamp(15px,1.4vw,18px)] text-pretty text-body">
            Recent Socratic seminar topics aggregated from BitDevs communities
            around the world, newest first.
          </p>
        </div>

        {feed.length === 0 ? (
          <p className="mt-[40px] font-mono text-[13px] text-muted">
            No topics yet — check back soon.
          </p>
        ) : (
          <>
            <div className="mt-[34px] mb-[22px] flex items-baseline gap-x-[26px] gap-y-2 font-mono text-[12.5px] text-muted">
              <span>
                <b className="text-[14px] font-bold text-strong">{feed.length}</b>{' '}
                topics
              </span>
              <span className="h-4 w-px bg-line-strong" />
              <span>
                <b className="text-[14px] font-bold text-strong">
                  {communityCount}
                </b>{' '}
                {communityCount === 1 ? 'community' : 'communities'}
              </span>
            </div>

            <ul className="m-0 flex list-none flex-col gap-[10px] p-0">
              {feed.map((item, i) => {
                const href = item.url ?? item.siteUrl
                return (
                  <li key={`${item.city}-${item.title}-${i}`}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener"
                      className="group flex items-start justify-between gap-[14px] rounded-[6px] border border-line bg-surface px-[18px] py-[15px] no-underline outline-none transition-[border-color,background] duration-200 hover:border-kyra-orange-600 hover:bg-surface-2 focus-visible:border-kyra-orange-600 focus-visible:bg-surface-2"
                    >
                      <span className="flex min-w-0 items-start gap-[13px]">
                        <span className="mt-[6px] h-[9px] w-[9px] shrink-0 rounded-full bg-kyra-orange shadow-[0_0_0_3px_rgba(227,111,70,0.16)]" />
                        <span className="min-w-0">
                          <span className="block text-[15px] font-semibold leading-snug tracking-[-0.01em] text-strong">
                            {item.title}
                          </span>
                          <span className="mt-[5px] block font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                            {item.city} · {item.country}
                          </span>
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-[6px] whitespace-nowrap pt-[2px] font-mono text-[11px] tracking-[0.04em] text-faint transition-colors duration-200 group-hover:text-kyra-orange group-focus-visible:text-kyra-orange">
                        {timeAgo(item.date)}
                        <ArrowIcon />
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}
