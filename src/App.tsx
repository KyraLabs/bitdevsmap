import { useState } from 'react'
import bitdevsData from './data/bitdevs.json'
import topicsData from './data/topics.json'
import type { BitDev, TopicsIndex } from './types'
import TopBar from './components/TopBar'
import Hero from './components/Hero'
import WorldMap from './components/WorldMap'
import TopicsFeed from './components/TopicsFeed'
import CityIndex from './components/CityIndex'
import Footer from './components/Footer'

const cities = bitdevsData as BitDev[]
const topics = topicsData as TopicsIndex

export default function App() {
  // Shared highlight: hovering a city card lights up its marker and vice versa.
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  return (
    <>
      <TopBar />
      <Hero count={cities.length} />

      <section className="pt-[26px] pb-2">
        <div className="wrap">
          <WorldMap
            cities={cities}
            topics={topics}
            activeIndex={activeIndex}
            onHover={setActiveIndex}
          />
          <div className="mt-[14px] flex flex-wrap justify-between gap-x-5 gap-y-[10px] font-mono text-[11.5px] tracking-[0.04em] text-faint">
            <span>
              <span className="text-muted">Interaction</span> &nbsp;·&nbsp; hover
              to see the city, click for topics or the site
            </span>
            <span className="text-muted">data · bitdevs-map · open source</span>
          </div>
        </div>
      </section>

      <TopicsFeed
        cities={cities}
        topics={topics}
        activeIndex={activeIndex}
        onHover={setActiveIndex}
      />

      <CityIndex cities={cities} activeIndex={activeIndex} onHover={setActiveIndex} />
      <Footer />
    </>
  )
}
