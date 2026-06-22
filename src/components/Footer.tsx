import sticker from '../assets/kyra-sticker.png'

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[15px] w-[15px]">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.02 2.89-.02 3.28 0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className="border-t border-line bg-[#08090a]">
      <div className="wrap flex flex-wrap items-center justify-between gap-7 pt-[30px] pb-8 max-[680px]:flex-col max-[680px]:items-start max-[680px]:gap-[22px]">
        <div className="flex items-center gap-5">
          <img
            src={sticker}
            alt="Kyra Labs"
            className="block h-auto w-[42px] drop-shadow-[0_4px_14px_rgba(0,0,0,0.4)]"
          />
        </div>
        <div className="flex max-w-[360px] flex-col items-start gap-4">
          <p className="text-[13.5px] leading-[1.6] text-pretty text-body">
            Your city isn't on the map yet? Open a Pull Request on{' '}
            <a
              href="https://github.com/KyraLabs/bitdevsmap"
              target="_blank"
              rel="noopener"
              className="border-b border-b-[rgba(227,111,70,0.4)] text-kyra-orange no-underline hover:border-b-kyra-orange"
            >
              the repository
            </a>{' '}
            with the city, its coordinates and the BitDevs link.
          </p>
          <a
            href="https://github.com/KyraLabs/bitdevsmap"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-[7px] font-mono text-xs tracking-[0.04em] text-muted no-underline transition-colors duration-200 hover:text-strong"
          >
            <GitHubIcon />
            GitHub ↗
          </a>
        </div>
      </div>
    </footer>
  )
}
