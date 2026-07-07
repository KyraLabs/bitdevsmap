import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import landTopo from 'world-atlas/land-110m.json'
import type { BitDev, TopicsIndex } from '../types'

// Internal projection box. The dotted land is rendered at this resolution and
// scaled to fit the responsive frame; markers are placed as percentages of it.
const W = 1600
const H = 815

const POPUP_WIDTH = 268

interface PlacedMarker {
  id: string
  city: string
  country: string
  url: string
  leftPct: number
  topPct: number
}

interface Props {
  cities: BitDev[]
  topics: TopicsIndex
  activeIndex: number | null
  onHover: (index: number | null) => void
}

interface OpenPopup {
  index: number
  x: number
  y: number
  above: boolean
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export default function WorldMap({ cities, topics, activeIndex, onHover }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [markers, setMarkers] = useState<PlacedMarker[]>([])
  const [ready, setReady] = useState(false)
  const [popup, setPopup] = useState<OpenPopup | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // world-atlas ships a TopoJSON topology; expand the land geometry.
    const land = feature(landTopo as never, (landTopo as never as { objects: { land: never } }).objects.land)
    const projection = geoNaturalEarth1().fitExtent(
      [
        [26, 26],
        [W - 26, H - 26],
      ],
      land,
    )

    // 1) Rasterize land to an offscreen canvas for fast point-in-land tests.
    const off = document.createElement('canvas')
    off.width = W
    off.height = H
    const octx = off.getContext('2d')
    if (!octx) return
    const path = geoPath(projection, octx)
    octx.fillStyle = '#fff'
    octx.beginPath()
    path(land)
    octx.fill()
    const data = octx.getImageData(0, 0, W, H).data
    const isLand = (x: number, y: number) =>
      data[((y | 0) * W + (x | 0)) * 4 + 3] > 130

    // 2) Draw the dotted land on the visible (retina) canvas.
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = W * dpr
    canvas.height = H * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.fillStyle =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-land-dot')
        .trim() || 'rgba(156,161,170,0.55)'

    const gap = 9
    const r = 1.6
    let row = 0
    for (let y = gap; y < H; y += gap * 0.9) {
      const xoff = row % 2 ? gap / 2 : 0
      for (let x = gap + xoff; x < W; x += gap) {
        if (isLand(x, y)) {
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      row++
    }

    // 3) Project the cities into marker positions.
    const placed: PlacedMarker[] = []
    for (const d of cities) {
      const p = projection([d.lng, d.lat])
      if (!p) continue
      placed.push({
        id: d.id,
        city: d.city,
        country: d.country,
        url: d.url,
        leftPct: (p[0] / W) * 100,
        topPct: (p[1] / H) * 100,
      })
    }
    setMarkers(placed)
    setReady(true)
  }, [cities])

  // Close the popup on Escape or when the viewport shifts (position goes stale).
  useEffect(() => {
    if (!popup) return
    const close = () => setPopup(null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [popup])

  const togglePopup = (index: number, el: HTMLElement) => {
    if (popup?.index === index) {
      setPopup(null)
      return
    }
    const rect = el.getBoundingClientRect()
    setPopup({
      index,
      x: rect.left,
      y: rect.top,
      above: rect.top > window.innerHeight * 0.5,
    })
  }

  const activePopup = popup ? markers[popup.index] : null
  const popupTopics = activePopup ? topics[activePopup.id]?.topics ?? [] : []

  return (
    <div className="map-frame">
      <div className="relative w-full" style={{ aspectRatio: '1600 / 815' }}>
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

        {!ready && <div className="map-loading">Loading map…</div>}

        {markers.map((m, i) => {
          const hasTopics = (topics[m.id]?.topics.length ?? 0) > 0
          const inner = (
            <>
              <span className="ring" style={{ animationDelay: `${0.9 * i}s` }} />
              <span className="dot" />
              <span className="tip">
                {m.city}
                <i>{m.country}</i>
              </span>
            </>
          )
          const shared = {
            className: `marker${activeIndex === i ? ' is-active' : ''}`,
            style: { left: `${m.leftPct}%`, top: `${m.topPct}%` },
            onMouseEnter: () => onHover(i),
            onMouseLeave: () => onHover(null),
            onFocus: () => onHover(i),
            onBlur: () => onHover(null),
          }

          // Communities with topics open a popup; the rest link out as before.
          return hasTopics ? (
            <button
              key={`${m.city}-${i}`}
              type="button"
              {...shared}
              className={`${shared.className} cursor-pointer appearance-none border-0 bg-transparent p-0`}
              aria-label={`${m.city}, ${m.country} — view topics`}
              aria-expanded={popup?.index === i}
              onClick={(e) => togglePopup(i, e.currentTarget)}
            >
              {inner}
            </button>
          ) : (
            <a
              key={`${m.city}-${i}`}
              {...shared}
              href={m.url}
              target="_blank"
              rel="noopener"
              aria-label={`${m.city}, ${m.country} — open site`}
            >
              {inner}
            </a>
          )
        })}
      </div>

      {popup &&
        activePopup &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[60]"
              onClick={() => setPopup(null)}
              aria-hidden
            />
            <div
              role="dialog"
              aria-label={`${activePopup.city} recent topics`}
              className="fixed z-[61] rounded-[8px] border border-line-strong bg-surface-2 p-[15px] shadow-[0_14px_44px_rgba(0,0,0,0.6)]"
              style={{
                width: POPUP_WIDTH,
                left: clamp(
                  popup.x,
                  12 + POPUP_WIDTH / 2,
                  window.innerWidth - 12 - POPUP_WIDTH / 2,
                ),
                top: popup.above ? popup.y - 14 : popup.y + 14,
                transform: `translate(-50%, ${popup.above ? '-100%' : '0'})`,
              }}
            >
              <div className="mb-[11px] flex items-baseline justify-between gap-2">
                <span className="text-[14px] font-bold tracking-[-0.01em] text-strong">
                  {activePopup.city}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                  {activePopup.country}
                </span>
              </div>

              <ul className="m-0 flex list-none flex-col gap-[9px] p-0">
                {popupTopics.map((t, ti) => (
                  <li key={`${t.title}-${ti}`} className="flex items-start gap-[9px]">
                    <span className="mt-[6px] h-[5px] w-[5px] shrink-0 rounded-full bg-kyra-orange" />
                    {t.url ? (
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener"
                        className="block text-[12.5px] leading-snug text-body no-underline transition-colors duration-150 hover:text-kyra-orange"
                      >
                        {t.title}
                      </a>
                    ) : (
                      <span className="block text-[12.5px] leading-snug text-body">
                        {t.title}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <a
                href={activePopup.url}
                target="_blank"
                rel="noopener"
                className="mt-[13px] flex items-center gap-[6px] border-t border-line pt-[11px] font-mono text-[11px] tracking-[0.04em] text-kyra-orange transition-colors duration-150 hover:text-kyra-orange-400"
              >
                visit site ↗
              </a>
            </div>
          </>,
          document.body,
        )}
    </div>
  )
}
