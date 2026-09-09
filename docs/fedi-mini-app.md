# Fedi mini app

BitDevs Map runs as a mini app inside [Fedi](https://www.fedi.xyz/), so members of
a Fedi community can open the map from their community home screen instead of
leaving the app for a browser.

## What a mini app is

A Fedi mini app is a website loaded in Fedi's in-app browser. There is no SDK to
install, no manifest to publish and no submission to review — Fedi is explicit
that it does not gatekeep mini apps. What the webview adds is three objects on
`window`: `webln` for Lightning payments, `nostr` for NIP-07 identity and
signing, and `fedi` for ecash and app context. All three are optional, and every
call is gated by a user permission prompt.

Nothing in this repository is built specifically for Fedi. The same static build
that serves the website serves the mini app.

## Adding it to a federation

A federation's guardians add an entry to the `sites` array of the Federation Meta
Config:

```json
{
  "id": "bitdevsmap",
  "title": "BitDevs Map",
  "url": "https://www.bitdevsmap.org",
  "imageUrl": "https://www.bitdevsmap.org/pwa-512x512.png",
  "description": "Find the cities with an active BitDevs group and their next meetings."
}
```

| Field         | Notes                                                                     |
| ------------- | ------------------------------------------------------------------------- |
| `id`          | Stable slug for the entry. Unrelated to the `id` in `src/data/bitdevs.json`. |
| `title`       | Name shown on the community home screen.                                  |
| `url`         | The `www` host. The apex answers with a 308 to it, so naming `www` saves the webview a redirect and matches the page's canonical link. |
| `imageUrl`    | The 512px icon already shipped for the installable web app.               |
| `description` | One line, shown next to the title.                                        |

No guardian is needed just to try it: any user can open the Mini Apps browser in
Fedi and type the URL.

## What the app changes inside the webview

- `src/fedi.ts` detects the webview by the injected `window.fedi` object. Fedi's
  own snippet keys on `window.webln`, but a Lightning browser extension provides
  that too, so it is not a reliable signal on the open web.
- The top bar drops its outbound "What is BitDevs?" link there. It is the only
  link in the bar that leaves the mini app without the user having asked for a
  community, and Fedi's guidance asks for minimal navigation because the webview
  already has its own back button and address bar. The links to the communities
  themselves are the point of the map and stay.
- The map is usable with a finger: a tap selects a marker instead of navigating,
  and the details strip under the map carries the city and its outbound link.
  Tooltips that would not fit above their marker flip under it.

## What it deliberately does not use

The mini app is informational. It has no account, no payment surface and no
identity surface, so it calls none of the injected APIs and the user is never
shown a permission prompt. Whether the Nostr APIs are worth using is tracked in
[issue #23](https://github.com/KyraLabs/bitdevsmap/issues/23).

Note that Fedi documents the current permission behaviour as deprecated: a future
release will require explicit user permission for every injected API. Any feature
built on `webln`, `nostr` or `fedi` has to handle a denial for every call.

## Testing a change before it ships

1. Deploy the build to any HTTPS URL, or expose a local `bun run dev` through a
   tunnel.
2. In Fedi, open the Mini Apps browser and enter that URL.
3. Fedi injects [Eruda](https://github.com/liriliri/eruda) alongside the APIs, so
   a console is available inside the webview once developer settings are
   unlocked.

## References

- [Mini App Integration Guide](https://fedibtc.github.io/fedi-docs/docs/miniapps/developers/miniapp-integration)
- [Solutions for Communities](https://fedibtc.github.io/fedi-docs/docs/miniapps/intro)
- [Catalog of Fedi Mini Apps](https://fedibtc.github.io/fedi-docs/docs/miniapps/catalog)
