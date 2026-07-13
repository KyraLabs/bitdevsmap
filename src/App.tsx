import { useEffect, useState } from 'react'
import bitdevsData from './data/bitdevs.json'
import topicsData from './data/topics.json'
import type { BitDev, TopicsIndex } from './types'
import TopBar from './components/TopBar'
import Hero from './components/Hero'
import WorldMap from './components/WorldMap'
import TopicsPage from './components/TopicsPage'
import CityIndex from './components/CityIndex'
import Footer from './components/Footer'

const cities = bitdevsData as BitDev[]
// Bundled snapshot: instant first paint and an offline fallback.
const seedTopics = topicsData as TopicsIndex
// Live topics are git-scraped daily onto the unprotected `data` branch and
// fetched at runtime, so updates ship without touching main or rebuilding.
const TOPICS_URL =
  'https://raw.githubusercontent.com/KyraLabs/bitdevsmap/data/topics.json'

// Guard the fetched payload before it replaces the known-good seed: a corrupted
// or wrongly-shaped file on the data branch must not crash downstream views.
function isValidTopics(data: unknown): data is TopicsIndex {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return false
  const entries = Object.values(data as Record<string, unknown>)
  return (
    entries.length > 0 &&
    entries.every((v) => {
      if (typeof v !== 'object' || v === null) return false
      const c = v as { id?: unknown; topics?: unknown }
      return typeof c.id === 'string' && Array.isArray(c.topics)
    })
  )
}

type Route = 'home' | 'topics'

function currentRoute(): Route {
  return window.location.hash.replace(/^#/, '').startsWith('/topics') ? 'topics' : 'home'
}

function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(currentRoute)
  useEffect(() => {
    const onChange = () => setRoute(currentRoute())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export default function App() {
  const route = useHashRoute()
  // Shared highlight: hovering a city card lights up its marker and vice versa.
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [topics, setTopics] = useState<TopicsIndex>(seedTopics)

  // Override the bundled seed with the freshly git-scraped topics; on any
  // network/parse/shape error the seed stays in place.
  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    fetch(TOPICS_URL, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: unknown) => {
        if (isValidTopics(data)) setTopics(data)
      })
      .catch(() => {})
      .finally(() => clearTimeout(timeout))
    return () => controller.abort()
  }, [])

  // On route change, jump to the top or to the anchor named in the hash
  // (e.g. #cities when arriving from the topics page).
  useEffect(() => {
    if (route === 'topics') {
      window.scrollTo(0, 0)
      return
    }
    const id = window.location.hash.slice(1)
    const el = id && id !== '/' ? document.getElementById(id) : null
    if (el) el.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [route])

  return (
    <>
      <TopBar route={route} />

      {route === 'topics' ? (
        <TopicsPage cities={cities} topics={topics} />
      ) : (
        <>
          <Hero count={cities.length} />

          <section className="pt-[26px] pb-2">
            <div className="wrap">
              <WorldMap
                cities={cities}
                activeIndex={activeIndex}
                onHover={setActiveIndex}
              />
              <div className="mt-[14px] flex flex-wrap justify-between gap-x-5 gap-y-[10px] font-mono text-[11.5px] tracking-[0.04em] text-faint">
                <span>
                  <span className="text-muted">Interaction</span> &nbsp;·&nbsp; hover
                  to see the city, click to open the site
                </span>
                <span className="text-muted">data · bitdevs-map · open source</span>
              </div>
            </div>
          </section>

          <CityIndex cities={cities} activeIndex={activeIndex} onHover={setActiveIndex} />
        </>
      )}

      <Footer />
    </>
  )
}
