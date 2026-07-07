import { useEffect, useMemo, useState } from 'react'
import type { BitDev, TopicsIndex } from '../types'

// Topics shown per community before "Show all".
const PREVIEW = 3
// Auto-advance interval (ms).
const INTERVAL = 6000

interface Community {
  city: string
  country: string
  siteUrl: string
  date?: string
  topics: { title: string; url?: string }[]
}

interface Props {
  cities: BitDev[]
  topics: TopicsIndex
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

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px]">
      <path d={dir === 'left' ? 'M15 6 9 12l6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  )
}

export default function TopicsSpotlight({ cities, topics }: Props) {
  const communities = useMemo<Community[]>(
    () =>
      cities
        .map((c): Community | null => {
          const t = topics[c.id]
          if (!t || t.topics.length === 0) return null
          return { city: c.city, country: c.country, siteUrl: c.url, date: t.topics[0].date, topics: t.topics }
        })
        .filter((c): c is Community => c !== null)
        .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [cities, topics],
  )

  const n = communities.length
  const [idx, setIdx] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [focused, setFocused] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Rotation freezes while expanded ("Show all"), on hover/keyboard focus, or
  // reduced motion — otherwise a focused link is lost when the slide remounts.
  const paused = expanded || hovering || focused || reduced

  useEffect(() => {
    if (paused || n <= 1) return
    const t = setTimeout(() => setIdx((i) => (i + 1) % n), INTERVAL)
    return () => clearTimeout(t)
  }, [paused, n, idx])

  if (n === 0) return null

  const safeIdx = idx % n
  const cur = communities[safeIdx]
  const shown = expanded ? cur.topics : cur.topics.slice(0, PREVIEW)
  const hasMore = cur.topics.length > PREVIEW

  const go = (delta: number) => {
    setExpanded(false)
    setIdx((i) => (i + delta + n) % n)
  }

  return (
    <div
      className="mt-[22px]"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="BitDevs communities"
    >
      {/* auto-advance progress */}
      <div className="mb-[14px] h-[2px] w-full overflow-hidden rounded bg-line">
        <div
          key={paused ? 'paused' : safeIdx}
          className="h-full w-full origin-left bg-kyra-orange"
          style={paused ? { transform: 'scaleX(0)' } : { animation: `topic-progress ${INTERVAL}ms linear forwards` }}
        />
      </div>

      <article
        key={safeIdx}
        className="rounded-[8px] border border-line bg-surface p-[22px] [animation:topic-in_0.32s_var(--ease)]"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="m-0 font-sans text-[18px] font-bold tracking-[-0.02em] text-strong">
            {cur.city}
            <span className="ml-[10px] font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              {cur.country}
            </span>
          </h3>
          <span className="shrink-0 whitespace-nowrap font-mono text-[11px] tracking-[0.04em] text-faint">
            {timeAgo(cur.date)}
          </span>
        </div>

        <ul className="m-0 mt-[16px] flex list-none flex-col gap-[11px] p-0">
          {shown.map((t, i) => (
            <li key={`${t.title}-${i}`} className="flex items-start gap-[11px]">
              <span className="mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full bg-kyra-orange" />
              {t.url ? (
                <a
                  href={t.url}
                  target="_blank"
                  rel="noopener"
                  className="text-[14.5px] leading-snug text-body no-underline transition-colors duration-150 hover:text-kyra-orange"
                >
                  {t.title}
                </a>
              ) : (
                <span className="text-[14.5px] leading-snug text-body">{t.title}</span>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-[18px] flex items-center justify-between gap-4 border-t border-line pt-[15px]">
          {hasMore ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="font-mono text-[11px] uppercase tracking-[0.06em] text-kyra-orange transition-colors duration-150 hover:text-kyra-orange-400"
            >
              {expanded ? '− Show less' : `+ Show all ${cur.topics.length} topics`}
            </button>
          ) : (
            <span />
          )}
          <a
            href={cur.siteUrl}
            target="_blank"
            rel="noopener"
            className="font-mono text-[11px] tracking-[0.04em] text-muted transition-colors duration-150 hover:text-strong"
          >
            visit site ↗
          </a>
        </div>
      </article>

      {/* controls */}
      <div className="mt-[16px] flex items-center justify-center gap-[20px] font-mono text-[12px] text-muted">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous community"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-colors duration-150 hover:border-line-strong hover:text-strong"
        >
          <Chevron dir="left" />
        </button>
        <span className="tabular-nums tracking-[0.08em]">
          <b className="text-strong">{String(safeIdx + 1).padStart(2, '0')}</b>
          <span className="text-faint"> / {n}</span>
          {paused && <span className="ml-[10px] text-faint">paused</span>}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next community"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-colors duration-150 hover:border-line-strong hover:text-strong"
        >
          <Chevron dir="right" />
        </button>
      </div>
    </div>
  )
}
