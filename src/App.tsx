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
const topics = topicsData as TopicsIndex

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
