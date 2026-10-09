import { ArrowRight, Star, Clock, Award, Navigation, BadgeCheck, Phone } from 'lucide-react'
import { ADDRESS, mapLinks, getOpenStatus } from '../lib/hours'
import { LogoMark } from './Logo'
import { Ornament } from './Ornament'

export function Hero() {
  const status = getOpenStatus()

  return (
    <section className="relative pt-36 pb-24 md:pt-48 lg:pt-52 lg:pb-32 overflow-hidden bg-wood">
      {/* Фон */}
      <div className="absolute inset-0">
        <img
          src="./hero-bg.jpg"
          alt=""
          className="w-full h-full object-cover opacity-20 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/70 via-stone-950/50 to-stone-950/90" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 30% 40%, rgba(214,177,87,0.12), transparent 70%)',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
        {/* Текст */}
        <div className="text-amber-50">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-10 bg-amber-500/60" />
            <span className="text-[11px] sm:text-xs uppercase tracking-[0.3em] text-amber-300 font-semibold">
              Салон «АнтикварЪ» · Дніпро
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.05]">
            Скупка антикваріату
            <span className="block mt-2 text-brass italic font-bold">за справедливою ціною</span>
          </h1>

          <Ornament tone="light" align="left" className="mt-7" />

          <p className="mt-6 text-lg text-amber-100/80 max-w-xl leading-relaxed">
            Купуємо дореволюційні книги, листівки та фотокартки царського
            періоду, стару військову форму, письмові прибори, ялинкові
            іграшки, масштабні моделі, колекційні напої, старі парфуми,
            фотоапарати та біноклі.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border ${
                status.isOpen
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  status.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              {status.message}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-amber-500/10 border border-amber-500/30 text-amber-200">
              <BadgeCheck className="w-4 h-4" />
              Консультація — безкоштовна
            </span>
          </div>

          {/* Телефон з листівки — крупно */}
          <a
            href="tel:+380505623523"
            className="mt-6 inline-flex items-center gap-3 font-display text-3xl sm:text-4xl font-black text-brass hover:brightness-110"
          >
            <Phone className="w-7 h-7 text-amber-400" />
            (050) 562-35-23
          </a>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#contact"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-brass text-stone-950 font-bold shadow-xl shadow-black/40 hover:brightness-110 hover:scale-[1.02] transition-all"
            >
              Оцінити предмет
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href={mapLinks.googleDirections}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full border border-amber-400/50 text-amber-100 font-semibold hover:bg-amber-400/10 hover:border-amber-300 transition-all"
            >
              <Navigation className="w-4 h-4" />
              Прокласти маршрут
            </a>
          </div>

          {/* Показники */}
          <div className="mt-12 grid grid-cols-3 max-w-lg divide-x divide-amber-700/40 border-y border-amber-700/40">
            <div className="py-4 pr-4">
              <div className="flex items-center gap-0.5 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
              <div className="mt-1 font-display text-3xl font-black text-brass">4.9</div>
              <div className="text-xs text-amber-200/60">оцінка клієнтів</div>
            </div>
            <div className="py-4 px-4">
              <div className="h-3.5" />
              <div className="mt-1 font-display text-3xl font-black text-brass">15+</div>
              <div className="text-xs text-amber-200/60">років досвіду</div>
            </div>
            <div className="py-4 pl-4">
              <div className="h-3.5" />
              <div className="mt-1 font-display text-3xl font-black text-brass">3000+</div>
              <div className="text-xs text-amber-200/60">успішних угод</div>
            </div>
          </div>
        </div>

        {/* Портрет у латунній рамі */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative rounded-[2rem] p-2.5 bg-gradient-to-b from-amber-200 via-amber-600 to-amber-900 shadow-2xl shadow-black/60">
            <div className="relative rounded-[1.6rem] overflow-hidden border-4 border-stone-950">
              <img
                src="./hero-portrait.jpg"
                alt="Юрій — оцінювач антикваріату"
                className="w-full h-[460px] sm:h-[540px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent" />
              <div className="absolute inset-0 frame-carved rounded-[1.4rem] pointer-events-none" />

              <div className="absolute bottom-0 inset-x-0 p-6 text-amber-50">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-[0.2em]">
                  <Award className="w-4 h-4" />
                  Оцінювач-експерт
                </div>
                <div className="mt-2 font-display text-4xl font-black">Юрій</div>
                <div className="mt-1 text-amber-100/80 text-sm">
                  Власник салону «АнтикварЪ» · експерт з предметів старовини
                </div>
              </div>
            </div>
          </div>

          {/* Медальйон-логотип */}
          <div className="absolute -top-10 -right-3 sm:-right-10 w-28 h-28 sm:w-40 sm:h-40 rotate-6 drop-shadow-[0_18px_30px_rgba(0,0,0,0.65)]">
            <LogoMark className="w-full h-full" />
          </div>

          {/* Статус і адреса */}
          <a
            href="#location"
            className="absolute -bottom-6 -left-3 sm:-left-8 bg-paper rounded-2xl shadow-2xl shadow-black/50 p-4 flex items-center gap-3 border border-amber-400/60 hover:-translate-y-0.5 transition-transform"
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                status.isOpen ? 'bg-emerald-100' : 'bg-rose-100'
              }`}
            >
              <Clock className={`w-6 h-6 ${status.isOpen ? 'text-emerald-700' : 'text-rose-700'}`} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    status.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                {status.short}
              </div>
              <div className="font-display font-bold text-sm text-stone-900">{ADDRESS.streetShort}</div>
              <div className="text-xs text-amber-700 font-semibold">
                Будівля АТБ, {ADDRESS.floor} · поруч з HUMANA →
              </div>
            </div>
          </a>
        </div>
      </div>

      {/* Латунна лінія знизу */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />
    </section>
  )
}
