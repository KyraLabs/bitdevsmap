export default function Hero({ count }: { count: number }) {
  return (
    <section className="pt-[74px] pb-[30px]" id="mapa">
      <div className="wrap">
        <div className="max-w-[760px]">
          <p className="m-0 font-mono text-[11.5px] font-medium uppercase tracking-[0.26em] text-kyra-orange">
            Global community map
          </p>
          <h1 className="mt-[18px] font-sans text-[clamp(40px,6vw,68px)] font-bold leading-[1.02] tracking-[-0.025em] text-strong">
            BitDevs around <br />
            <span className="text-kyra-orange">the world</span>
          </h1>
          <p className="mt-5 max-w-[620px] text-[clamp(16px,1.5vw,19px)] text-pretty text-body">
            Socratic seminars where developers gather to discuss changes to the
            Bitcoin protocol and the technologies around it. Find your city on the
            map.
          </p>
        </div>

        <div className="mt-[30px] flex flex-wrap items-center gap-x-[26px] gap-y-[14px] font-mono text-[12.5px] text-muted">
          <span className="flex items-baseline gap-2">
            <b className="text-[15px] font-bold text-strong">{count}</b> active cities
          </span>
          <span className="h-4 w-px bg-line-strong" />
          <span className="flex items-center gap-[9px]">
            <span className="h-[11px] w-[11px] rounded-full bg-kyra-orange shadow-[0_0_0_4px_rgba(227,111,70,0.16)]" />
            City with BitDevs
          </span>
          <span className="h-4 w-px bg-line-strong" />
          <span>Natural Earth projection</span>
        </div>
      </div>
    </section>
  )
}
