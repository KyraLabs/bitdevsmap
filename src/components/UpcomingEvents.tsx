import { useMemo } from 'react'
import type { BitDev, EventsIndex } from '../types'

const MS_PER_DAY = 86_400_000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface Props {
  cities: BitDev[]
  events: EventsIndex
}

interface UpcomingItem {
  city: string
  country: string
  siteUrl: string
  title: string
  url: string
  date: string
}

/** Whole-day index (UTC) for an ISO calendar day, for stable date math. */
function dayIndex(iso: string): number {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return NaN
  return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / MS_PER_DAY)
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

/** "today" / "tomorrow" / "in 3 days" / "in 2 weeks" / "in 2 mo". `soon` flags
 * events within a week so the UI can accent them. */
function relative(days: number): { text: string; soon: boolean } {
  if (days <= 0) return { text: 'today', soon: true }
  if (days === 1) return { text: 'tomorrow', soon: true }
  if (days < 7) return { text: `in ${days} days`, soon: true }
  if (days < 14) return { text: 'in 1 week', soon: false }
  if (days < 30) return { text: `in ${Math.round(days / 7)} weeks`, soon: false }
  return { text: `in ${Math.round(days / 30)} mo`, soon: false }
}

export default function UpcomingEvents({ cities, events }: Props) {
  // Recompute only when the fetched events change; "today" is stable per render.
  const today = Math.floor(Date.now() / MS_PER_DAY)
  const items = useMemo<UpcomingItem[]>(
    () =>
      cities
        .map((c): UpcomingItem | null => {
          const entry = events[c.id]
          if (!entry || entry.events.length === 0) return null
          // Soonest upcoming for this community; guard against stale past dates.
          const next = entry.events
            .filter((e) => dayIndex(e.date) >= today)
            .sort((a, b) => a.date.localeCompare(b.date))[0]
          if (!next) return null
          return {
            city: c.city,
            country: c.country,
            siteUrl: c.url,
            title: next.title,
            url: next.url ?? c.url,
            date: next.date,
          }
        })
        .filter((x): x is UpcomingItem => x !== null)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [cities, events, today],
  )

  if (items.length === 0) return null

  const currentYear = new Date(today * MS_PER_DAY).getUTCFullYear()

  return (
    <section className="pt-[54px]" id="upcoming">
      <div className="wrap">
        <div className="mb-[22px] flex items-baseline justify-between gap-5">
          <h2 className="m-0 font-sans text-[22px] font-bold tracking-[-0.02em] text-strong">
            Upcoming BitDevs
          </h2>
          <span className="font-mono text-[12.5px] text-muted">
            {String(items.length).padStart(2, '0')} announced
          </span>
        </div>

        <div className="grid gap-[14px] [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
          {items.map((it, i) => {
            const parts = it.date.match(/^(\d{4})-(\d{2})-(\d{2})/)
            const month = parts ? MONTHS[+parts[2] - 1] : ''
            const dayNum = parts ? parts[3] : ''
            const year = parts ? +parts[1] : 0
            const showYear = year !== 0 && year !== currentYear
            const rel = relative(dayIndex(it.date) - today)
            return (
              <a
                key={`${it.city}-${i}`}
                href={it.url}
                target="_blank"
                rel="noopener"
                className="group flex items-stretch gap-[16px] rounded-[6px] border border-line bg-surface p-[18px] no-underline outline-none transition-[border-color,background] duration-200 hover:border-kyra-orange-600 hover:bg-surface-2 focus-visible:border-kyra-orange-600 focus-visible:bg-surface-2"
              >
                <div className="flex w-[52px] shrink-0 flex-col items-center justify-center rounded-[5px] border border-line bg-surface-2 py-[8px] text-center">
                  <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-kyra-orange">
                    {month}
                  </span>
                  <span className="font-sans text-[20px] font-bold leading-none tracking-[-0.02em] text-strong">
                    {dayNum}
                  </span>
                  {showYear ? (
                    <span className="mt-[2px] font-mono text-[9px] tracking-[0.06em] text-faint">
                      {year}
                    </span>
                  ) : null}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-[5px]">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-base font-bold tracking-[-0.01em] text-strong">
                      {it.city}
                      <span className="ml-[8px] font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted">
                        {it.country}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 whitespace-nowrap font-mono text-[10.5px] tracking-[0.04em] ${
                        rel.soon ? 'text-kyra-orange' : 'text-faint'
                      }`}
                    >
                      {rel.text}
                    </span>
                  </div>
                  <span className="truncate text-[13.5px] leading-snug text-body">{it.title}</span>
                  <span className="flex items-center gap-[6px] font-mono text-[11px] tracking-[0.06em] text-faint transition-colors duration-200 group-hover:text-kyra-orange group-focus-visible:text-kyra-orange">
                    view event <ArrowIcon />
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
