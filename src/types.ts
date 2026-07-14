export interface BitDev {
  /** Stable slug used to link a community to its topics (e.g. "san-francisco"). */
  id: string
  /** City name shown on the marker and in the index. */
  city: string
  /** Country, used as the marker subtitle. */
  country: string
  /** Decimal-degree latitude. */
  lat: number
  /** Decimal-degree longitude. */
  lng: number
  /** Public URL of the local BitDevs group. */
  url: string
}

/** A single meeting topic surfaced from a community's source. */
export interface Topic {
  /** Human-readable topic title. */
  title: string
  /** Optional link to the topic (issue, minutes, event, etc.). */
  url?: string
  /** Optional ISO 8601 date the topic was published or discussed. */
  date?: string
}

/** Topics aggregated for one community, keyed by BitDev.id in topics.json. */
export interface CommunityTopics {
  /** Matches BitDev.id. */
  id: string
  /** Adapter that produced these topics (e.g. "github-issues"). */
  source: string
  /** ISO 8601 timestamp of the last successful fetch. */
  fetchedAt: string
  /** Most recent topics, newest first. */
  topics: Topic[]
}

/** Shape of src/data/topics.json: a map from BitDev.id to its aggregated topics. */
export type TopicsIndex = Record<string, CommunityTopics>

/** A single upcoming meeting scraped from a community's site. */
export interface NextEvent {
  /** Human-readable event title (e.g. "Socratic Seminar 72"). */
  title: string
  /** Optional link to the event page. */
  url?: string
  /** Event date as an ISO calendar day (YYYY-MM-DD). */
  date: string
}

/** Upcoming events for one community, keyed by BitDev.id in events.json. */
export interface CommunityEvents {
  /** Matches BitDev.id. */
  id: string
  /** ISO 8601 timestamp of the last successful fetch. */
  fetchedAt: string
  /** Upcoming events (date >= fetch day), soonest first. */
  events: NextEvent[]
}

/** Shape of src/data/events.json: a map from BitDev.id to its upcoming events. */
export type EventsIndex = Record<string, CommunityEvents>
