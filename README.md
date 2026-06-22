# BitDevs Map

Interactive map of cities with active [BitDevs](https://bitdevs.org/about) groups —
Socratic seminars where developers discuss the Bitcoin protocol and surrounding
technologies.

Built with React, Vite and Tailwind CSS, using [Bun](https://bun.sh) as the
package manager and runtime. The dotted world map is rendered to a canvas with
[`d3-geo`](https://github.com/d3/d3-geo) (Natural Earth projection) and
[`topojson-client`](https://github.com/topojson/topojson-client).

## Getting started

```bash
bun install
bun run dev      # start the dev server
bun run build    # type-check and build for production
bun run preview  # serve the production build locally
```

## Add your city

City data lives in [`src/data/bitdevs.json`](src/data/bitdevs.json). Add an entry
and open a Pull Request:

```json
{
  "city": "Buenos Aires",
  "country": "Argentina",
  "lat": -34.6037,
  "lng": -58.3816,
  "url": "https://www.bitdevsba.org"
}
```

| Field     | Description                                  |
| --------- | -------------------------------------------- |
| `city`    | City name shown on the marker and the index. |
| `country` | Country, shown as the marker subtitle.       |
| `lat`     | Decimal-degree latitude.                     |
| `lng`     | Decimal-degree longitude.                    |
| `url`     | Public URL of the local BitDevs group.       |

The marker and the city card are generated automatically from each entry.

## Project structure

```
docs/                   Original Claude Design reference (static HTML)
src/
  data/bitdevs.json     City data (edit this to add a city)
  components/           TopBar, Hero, WorldMap, CityIndex, Footer
  types.ts              BitDev type
  index.css             Tailwind theme tokens + map component styles
```
