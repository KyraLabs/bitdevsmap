import { useEffect, useState } from 'react'

// Fedi runs mini apps inside its own in-app browser and injects `webln`,
// `nostr` and `fedi` onto `window`. Nothing else identifies the environment.
// Fedi's own snippet keys on `webln`, but a Lightning browser extension
// injects that too, so detection here uses `fedi`, which only Fedi provides.
// https://fedibtc.github.io/fedi-docs/docs/miniapps/developers/miniapp-integration
declare global {
  interface Window {
    /** Injected by Fedi's in-app browser; undefined in a normal browser. */
    fedi?: unknown
  }
}

export function isFediMiniApp(): boolean {
  return typeof window.fedi !== 'undefined'
}

/**
 * The injection is expected to be in place before the app mounts, but the app
 * must not depend on winning that race: a second check after mount is enough
 * to catch a late injection without polling.
 */
export function useIsFediMiniApp(): boolean {
  const [inFedi, setInFedi] = useState(isFediMiniApp)
  useEffect(() => {
    if (!inFedi) setInFedi(isFediMiniApp())
  }, [inFedi])
  return inFedi
}
