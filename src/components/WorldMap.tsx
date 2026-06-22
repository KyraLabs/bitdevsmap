import { useEffect, useRef, useState } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import landTopo from 'world-atlas/land-110m.json'
import type { BitDev } from '../types'

// Internal projection box. The dotted land is rendered at this resolution and
// scaled to fit the responsive frame; markers are placed as percentages of it.
const W = 1600
const H = 815

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

export default function WorldMap({ cities, activeIndex, onHover }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [markers, setMarkers] = useState<PlacedMarker[]>([])
  const [ready, setReady] = useState(false)

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
    <div className="map-frame">
      <div className="relative w-full" style={{ aspectRatio: '1600 / 815' }}>
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

        {!ready && <div className="map-loading">Loading map…</div>}

        {markers.map((m, i) => (
          <a
            key={`${m.city}-${i}`}
            className={`marker${activeIndex === i ? ' is-active' : ''}`}
            href={m.url}
            target="_blank"
            rel="noopener"
            style={{ left: `${m.leftPct}%`, top: `${m.topPct}%` }}
            aria-label={`${m.city}, ${m.country} — open site`}
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
        ))}
      </div>
    </div>
  )
}
