import sticker from '../assets/kyra-sticker.png'

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
        <div className="max-w-[360px]">
          <p className="text-[13.5px] leading-[1.6] text-pretty text-body">
            Your city isn't on the map yet? Add it with a Pull Request — include the
            city, its coordinates and the BitDevs link in{' '}
            <a
              href="#ciudades"
              className="border-b border-b-[rgba(227,111,70,0.4)] text-kyra-orange no-underline hover:border-b-kyra-orange"
            >
              the city list
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  )
}
