# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Bun is the package manager and the runtime for the aggregator scripts (>= 1.3).

```bash
bun install
bun run dev                              # Vite dev server on http://localhost:5173
bun run build                            # tsc -b && vite build -> dist/
bun run preview                          # serve the production build
bun run aggregate-topics                 # regenerate src/data/topics.json
bun run scripts/aggregate-events.ts      # regenerate src/data/events.json
```

There is no test suite and no linter configuration. `bun run build` is the only
gate: it runs the TypeScript project build (`tsc -b`) across the three project
references before bundling, so type errors in `src/`, `vite.config.ts` or
`scripts/` all fail the build.

`GITHUB_TOKEN` in the environment raises the GitHub API rate limit for the
`github-issues` adapter in `aggregate-topics.ts`. Both aggregators hit ~60 live
community websites, so a local run takes a while and its output depends on what
those sites are serving that day.

## Architecture

### Three data files, two very different lifecycles

- `src/data/bitdevs.json` — hand-maintained source of truth. An array of
  `BitDev` (`src/types.ts`). The `id` slug is the join key for everything else.
- `src/data/topics.json` and `src/data/events.json` — **generated**. Never edit
  by hand; regenerate with the aggregators. Both are `Record<BitDev["id"], …>`.

Topics and events are consumed twice. The JSON checked into `src/data/` is
imported at build time as a **bundled seed** (instant first paint, offline
fallback), and `App.tsx` then fetches the live versions at runtime from the
`data` branch on GitHub raw. This is the core pattern of the project:

```
GH Actions cron (daily 06:00 UTC)
  -> bun run scripts/aggregate-topics.ts   (fatal on failure)
  -> bun run scripts/aggregate-events.ts   (continue-on-error)
  -> force-push topics.json + events.json to the `data` branch
     (unprotected, single-commit; main is never touched, no rebuild)
App.tsx fetch -> shape guard -> setState, or silently keep the seed
```

Consequences worth keeping in mind:

- The deployed site can show data newer than `main`. The checked-in JSON only
  matters for first paint and for anyone offline.
- `isValidTopics` / `isValidEvents` in `App.tsx` guard the fetched payload before
  it replaces the known-good seed. Any network, parse, or shape failure falls
  through to the seed silently — by design, not an oversight. Note the
  asymmetry: topics require a non-empty index, events accept an empty one (a
  week with no announced meetings is legitimate).
- Both fetches use an `AbortController` with a 10s timeout.

### Aggregator design (`scripts/`)

Both scripts follow the same shape: read `bitdevs.json`, fan out over
communities with a hand-rolled `pool()` (concurrency 12), report per-community
outcomes to stdout, rebuild the index from scratch, write sorted JSON, then
print a coverage report.

`aggregate-topics.ts` picks an adapter per community:

- `github-issues` — only for communities listed in `scripts/sources.json`.
- `rss` — everything else with a real website. Auto-discovers a feed
  (`/feed.xml`, `/rss.xml`, … then `<link rel="alternate">`), then extracts
  topics from the latest seminar entry using three patterns in priority order:
  an explicit "Topics"/"Agenda" section, top-level `<h2>` headings, or the
  linked list items themselves. The first pattern yielding >= 3 topics wins.
  Social/meetup/code hosts are skipped up front (`SKIP_HOSTS`).

The extraction heuristics (`isNoise`, `isSpecific`, `BOILERPLATE`,
`BAD_LINK_HOSTS`) are the fragile, load-bearing part. They are tuned to reject
section labels, addresses, nostr keys and navigation links while keeping real
topic titles. Tightening them intentionally drops communities.

`aggregate-events.ts` scrapes the shared BitDevs static-site template
(date `»` linked-title blocks, either `Home-posts-post` divs or `<li><time>`)
from each homepage and keeps only events dated today or later.

**Carry-over policy (both scripts):** the index is rebuilt from scratch each
run so tightened filters can drop stale communities. Only a genuine *network
error* reuses the previous entry; a successful fetch that yields nothing is a
real result and removes the community. Carried-over events are additionally
pruned to still-future dates.

### Frontend

Single-page React 19 app, no router and no state library.

- **Routing** is hash-based (`App.tsx#useHashRoute`): `#/topics` renders
  `TopicsPage`, anything else renders the home view. `#map` / `#cities` /
  `#upcoming` are plain anchors on the home page, so `TopBar` links mix both
  kinds. Route changes scroll to top or to the named anchor.
- **`WorldMap`** rasterizes the world-atlas TopoJSON land geometry onto an
  offscreen canvas once, then uses the alpha channel as a cheap point-in-land
  test to stipple a dot grid onto the visible (DPR-scaled) canvas. Markers are
  not drawn on the canvas — they are absolutely positioned `<a>` elements placed
  as percentages of the fixed 1600x815 projection box, which is what makes them
  hoverable, focusable and responsive.
- **Shared hover state** lives in `App` (`activeIndex`) so hovering a card in
  `CityIndex` lights up its map marker and vice versa. The index is the position
  in the `cities` array — keep the array order stable across both components.
- **`TopicsSpotlight`** is an auto-advancing carousel; it honors
  `prefers-reduced-motion` and pauses on hover/focus.

### Styling

Tailwind CSS v4 via the Vite plugin — there is **no `tailwind.config.js`**.
Design tokens live in the `@theme` block of `src/index.css` and are exposed both
as Tailwind utilities (`text-strong`, `bg-surface`, `text-kyra-orange`) and as
CSS variables. Multi-part component styles (`.wrap`, `.map-frame`, `.marker`
and its `.dot` / `.ring` / `.tip` children) are in `@layer components`;
everything else is inline utilities. The design is dark-only; `WorldMap` reads
`--color-land-dot` from the computed root style to color the canvas dots.

## Conventions

- **Adding a city** means one object in `src/data/bitdevs.json`, kept
  alphabetical by city. The entry needs an `id` slug in addition to the fields
  documented in the README's table — topics and events are keyed by it, so an
  entry without a matching `id` silently gets no topics or events.
- Commit messages are imperative, sentence-case, and not Conventional Commits
  (e.g. "Add events aggregator and upcoming-events section to homepage").
- GitHub Actions are pinned to commit SHAs.
- `docs/BitDevs Map.html` is the original static design reference, not built or
  served.
