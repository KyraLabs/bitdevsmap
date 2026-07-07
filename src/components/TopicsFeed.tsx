import { useMemo } from 'react'
import type { BitDev, TopicsIndex } from '../types'

// Most recent topics shown in the global feed.
const MAX_FEED = 15

interface Props {
  cities: BitDev[]
  topics: TopicsIndex
  activeIndex: number | null
  onHover: (index: number | null) => void
}

interface FeedItem {
  /** Index of the city in the cities array, for shared map highlighting. */
  cityIndex: number
  city: string
  country: string
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

export default function TopicsFeed({ cities, topics, activeIndex, onHover }: Props) {
  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = []
    cities.forEach((city, cityIndex) => {
      const community = topics[city.id]
      if (!community) return
      for (const topic of community.topics) {
        items.push({
          cityIndex,
          city: city.city,
          country: city.country,
          title: topic.title,
          url: topic.url,
          date: topic.date,
        })
      }
    })
    items.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    return items.slice(0, MAX_FEED)
  }, [cities, topics])

  if (feed.length === 0) return null

  const communityCount = new Set(feed.map((f) => f.cityIndex)).size

  return (
    <section className="pt-[54px] pb-2" id="topics">
      <div className="wrap">
        <div className="mb-[22px] flex items-baseline justify-between gap-5">
          <h2 className="m-0 font-sans text-[22px] font-bold tracking-[-0.02em] text-strong">
            Recent topics
          </h2>
          <span className="font-mono text-[12.5px] text-muted">
            {communityCount} {communityCount === 1 ? 'community' : 'communities'}
          </span>
        </div>

        <ul className="m-0 flex list-none flex-col gap-[10px] p-0">
          {feed.map((item, i) => {
            const active = activeIndex === item.cityIndex
            const Row = item.url ? 'a' : 'div'
            return (
              <li key={`${item.cityIndex}-${item.title}-${i}`}>
                <Row
                  {...(item.url
                    ? { href: item.url, target: '_blank', rel: 'noopener' }
                    : {})}
                  data-active={active || undefined}
                  onMouseEnter={() => onHover(item.cityIndex)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(item.cityIndex)}
                  onBlur={() => onHover(null)}
                  className="group flex items-start justify-between gap-[14px] rounded-[6px] border border-line bg-surface px-[18px] py-[15px] no-underline outline-none transition-[border-color,background] duration-200 hover:border-kyra-orange-600 hover:bg-surface-2 focus-visible:border-kyra-orange-600 focus-visible:bg-surface-2 data-[active]:border-kyra-orange-600 data-[active]:bg-surface-2"
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
                    {item.url && <ArrowIcon />}
                  </span>
                </Row>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
