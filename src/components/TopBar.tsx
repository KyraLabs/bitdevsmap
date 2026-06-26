import bitcoinLogo from '../assets/bitcoin-logo.svg'

const navLink =
  'font-mono text-xs tracking-[0.04em] no-underline transition-colors duration-200'

export default function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[rgba(6,6,7,0.82)] backdrop-blur-[8px]">
      <div className="wrap flex h-16 items-center justify-between">
        <a className="flex items-center gap-[11px] no-underline" href="#map">
          <img
            src={bitcoinLogo}
            alt=""
            aria-hidden
            className="h-6 w-6 shrink-0 drop-shadow-[0_1px_6px_rgba(0,0,0,0.4)]"
          />
          <span className="text-sm font-bold tracking-[-0.01em] text-strong">
            BitDevs <b className="font-bold text-kyra-orange">Map</b>
          </span>
        </a>

        <nav className="flex items-center gap-[26px]">
          <a className={`${navLink} text-muted hover:text-strong max-[680px]:hidden`} href="#map">
            Map
          </a>
          <a
            className={`${navLink} text-muted hover:text-strong max-[680px]:hidden`}
            href="#cities"
          >
            Cities
          </a>
          <a
            className={`${navLink} text-kyra-orange`}
            href="https://bitdevs.org/about"
            target="_blank"
            rel="noopener"
          >
            What is BitDevs? ↗
          </a>
        </nav>
      </div>
    </header>
  )
}
