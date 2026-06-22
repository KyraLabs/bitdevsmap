# BitDevs Map

An interactive world map of cities with an active [BitDevs](https://bitdevs.org/about)
group — Socratic seminars where developers gather to discuss changes to the Bitcoin
protocol and the technologies around it.

The map renders a dotted landmass on a canvas, drops a marker on every city, and
keeps a searchable city index in sync with it. All city data comes from a single
JSON file, so adding a community is a one-line change.

## Tech stack

- **[React](https://react.dev/)** + **[TypeScript](https://www.typescriptlang.org/)**
- **[Vite](https://vite.dev/)** for dev server and bundling
- **[Tailwind CSS v4](https://tailwindcss.com/)** for styling (brand tokens in `@theme`)
- **[Bun](https://bun.sh/)** as the package manager and runtime
- **[d3-geo](https://github.com/d3/d3-geo)** (Natural Earth projection) +
  **[topojson-client](https://github.com/topojson/topojson-client)** +
  **[world-atlas](https://github.com/topojson/world-atlas)** for the map

## Getting started

Requires [Bun](https://bun.sh/) (>= 1.3). Clone the repo and install dependencies:

```bash
bun install
```

### Scripts

```bash
bun run dev      # start the dev server (http://localhost:5173)
bun run build    # type-check and build for production into dist/
bun run preview  # serve the production build locally
```

## Add your city

There are two ways to get a city onto the map. Pick whichever you are comfortable
with — both end up in the same place.

### Option A — Open an issue (no coding required)

If you don't want to touch the code, just
[open a "New city" issue](https://github.com/KyraLabs/bitdevsmap/issues/new?template=add-city.yml)
with your city, country and the group's link. A maintainer will add it for you. If
you don't know the exact coordinates, leave them blank — we'll fill them in.

### Option B — Open a pull request

City data lives in [`src/data/bitdevs.json`](src/data/bitdevs.json). Add an object to
the array and open a PR:

```json
{
  "city": "Buenos Aires",
  "country": "Argentina",
  "lat": -34.6037,
  "lng": -58.3816,
  "url": "https://www.bitdevsba.org/"
}
```

The marker and the city card are generated automatically from each entry — no other
changes are needed.

#### Field reference

| Field     | Type   | Description                                              |
| --------- | ------ | -------------------------------------------------------- |
| `city`    | string | City name shown on the marker and in the index.          |
| `country` | string | Country, shown as the marker subtitle.                   |
| `lat`     | number | Decimal-degree latitude of the city center.              |
| `lng`     | number | Decimal-degree longitude of the city center.             |
| `url`     | string | Public link to the group (website, Meetup, X or GitHub). |

#### Guidelines

- Keep the list **alphabetical by city** so diffs stay clean.
- Use the **city center** coordinates in decimal degrees. You can grab them from
  Google Maps (right-click a location to copy `lat, lng`) or
  [latlong.net](https://www.latlong.net/).
- Make sure the group is **active** and the link works.
- Run `bun run build` before opening the PR to confirm everything still compiles.

## Project structure

```
.github/
  ISSUE_TEMPLATE/add-city.yml   Guided form for the "add a city" issue
  pull_request_template.md      Checklist shown when opening a PR
docs/                           Original Claude Design reference (static HTML)
public/favicon.svg              Brand favicon
src/
  data/bitdevs.json             City data — edit this to add a city
  components/                   TopBar, Hero, WorldMap, CityIndex, Footer
  types.ts                      The BitDev type
  index.css                     Tailwind theme tokens + map component styles
  App.tsx, main.tsx             App entry points
```

## Contributing

1. Fork the repository and create a branch (`git checkout -b add-my-city`).
2. Make your change (for a new city, edit `src/data/bitdevs.json`).
3. Run `bun run build` to verify it compiles.
4. Commit, push, and open a pull request.

## License

[MIT](LICENSE) © Kyra Labs
