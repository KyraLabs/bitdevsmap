import { useEffect, useRef, useState } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import landTopo from 'world-atlas/land-110m.json'
import type { BitDev } from '../types'

// Internal projection box. The dotted land is rendered at this resolution and
// scaled to fit the responsive frame; markers are placed as percentages of it.
const W = 1600
const H = 815

// A tooltip is 44px tall and rests 11px above its dot. With less room than
// that the frame's overflow clips it, which at phone width happens to 27 of
// the 63 markers, so those flip their tooltip under the dot instead.
const TIP_CLEARANCE = 60

interface PlacedMarker {
  city: string
  country: string
  url: string
  leftPct: number
  topPct: number
}

interface Props {
  cities: BitDev[]
  activeIndex: number | null
  onHover: (index: number | null) => void
}

// Touch devices have no hover, so the frame is barely 180px tall and the
// markers sit within a finger's width of each other. A tap there must reveal
// the city rather than leave the site: selection replaces hover, and the
// details strip below the map carries the outbound link.
function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() => window.matchMedia('(hover: none)').matches)
  useEffect(() => {
    const query = window.matchMedia('(hover: none)')
    const onChange = () => setCoarse(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return coarse
}

export default function WorldMap({ cities, activeIndex, onHover }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [markers, setMarkers] = useState<PlacedMarker[]>([])
  const [ready, setReady] = useState(false)
  const [boxHeight, setBoxHeight] = useState(0)
  const coarse = useCoarsePointer()
  const selected = activeIndex === null ? null : (markers[activeIndex] ?? null)

  // Whether a tooltip fits above its dot depends on the rendered height, not
  // on the marker's position in the projection box, so it has to be measured.
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const observer = new ResizeObserver(([entry]) => {
      setBoxHeight(entry.contentRect.height)
    })
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

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

  return (
    <>
      <div
        className="map-frame"
        onClick={coarse && selected ? () => onHover(null) : undefined}
      >
        <div
          ref={boxRef}
          className="relative w-full"
          style={{ aspectRatio: '1600 / 815' }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

          {!ready && <div className="map-loading">Loading map…</div>}

          {markers.map((m, i) => {
            const flipped = boxHeight > 0 && (m.topPct / 100) * boxHeight < TIP_CLEARANCE
            return (
              <a
                key={`${m.city}-${i}`}
                className={`marker${activeIndex === i ? ' is-active' : ''}${flipped ? ' tip-below' : ''}`}
                href={m.url}
                target="_blank"
                rel="noopener"
                style={{ left: `${m.leftPct}%`, top: `${m.topPct}%` }}
                aria-label={`${m.city}, ${m.country} — open site`}
                onClick={(e) => {
                  if (!coarse) return
                  // Enter on a focused marker also lands here, reporting no
                  // click count. Swallowing it would strand keyboard users:
                  // blur clears the selection, so the strip's link unmounts
                  // before it can be reached. Let the anchor navigate.
                  if (e.detail === 0) return
                  // First tap selects; the strip below opens the site.
                  e.preventDefault()
                  e.stopPropagation()
                  onHover(i)
                }}
                onMouseEnter={() => onHover(i)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(i)}
                onBlur={() => onHover(null)}
              >
                <span className="ring" style={{ animationDelay: `${0.9 * i}s` }} />
                <span className="dot" />
                <span className="tip">
                  {m.city}
                  <i>{m.country}</i>
                </span>
              </a>
            )
          })}
        </div>
      </div>

      {coarse && (
        <div className="mt-[10px] flex min-h-[62px] items-center justify-between gap-4 rounded-[6px] border border-line bg-surface px-[18px] py-[13px]">
          {selected ? (
            <>
              <span className="min-w-0">
                <span className="block truncate text-base font-bold tracking-[-0.01em] text-strong">
                  {selected.city}
                </span>
                <span className="mt-[3px] block font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                  {selected.country}
                </span>
              </span>
              <a
                href={selected.url}
                target="_blank"
                rel="noopener"
                className="shrink-0 font-mono text-[11px] tracking-[0.06em] text-kyra-orange no-underline"
              >
                visit ↗
              </a>
            </>
          ) : (
            <span className="font-mono text-[11.5px] tracking-[0.04em] text-faint">
              Tap a marker to see the city
            </span>
          )}
        </div>
      )}
    </>
  )
}
