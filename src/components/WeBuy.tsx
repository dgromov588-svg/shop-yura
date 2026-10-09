import { ArrowUpRight, Phone, Info, BadgeCheck } from 'lucide-react'
import { Ornament } from './Ornament'
import { BUY_CATEGORIES } from '../lib/categories'
import { BRAND, CONTACT, SYMBOLISM_NOTE } from '../lib/hours'

export function WeBuy() {
  return (
    <section id="we-buy" className="py-20 lg:py-28 bg-paper">
      <div className="max-w-7xl mx-auto px-4">
        {/* Заголовок як на листівці */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-sm font-semibold text-amber-700 uppercase tracking-[0.3em]">
            {BRAND.full}
          </div>
          <h2 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-stone-900 uppercase">
            Купуємо
          </h2>
          <Ornament className="mt-5" />
          <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
            <BadgeCheck className="w-5 h-5" />
            {BRAND.slogan}
          </div>
        </div>

        {/* Категорії */}
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {BUY_CATEGORIES.map((c, i) => (
            <a
              key={c.id}
              href="#contact"
              className="group relative rounded-2xl overflow-hidden bg-stone-900 shadow-lg shadow-stone-900/20 hover:shadow-2xl hover:-translate-y-1 transition-all p-1.5 bg-gradient-to-b from-amber-300 via-amber-600 to-amber-900"
            >
              <div className="relative rounded-xl overflow-hidden bg-stone-900">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={c.img}
                    alt={c.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-amber-50">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="font-display text-xs text-amber-300/90 font-bold tracking-widest mb-1">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div className="font-display text-xl font-bold leading-tight">{c.title}</div>
                      {c.details && (
                        <p className="mt-1 text-sm text-amber-100/75 leading-snug">({c.details})</p>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-brass text-stone-950 flex items-center justify-center shrink-0 group-hover:rotate-45 transition-transform">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Заклик + телефон з листівки */}
        <div className="mt-12 rounded-3xl bg-wood frame-carved p-8 sm:p-10 text-center text-amber-50 shadow-2xl shadow-stone-900/30">
          <div className="text-amber-200/80">Маєте щось із переліку? Телефонуйте:</div>
          <a
            href={`tel:${CONTACT.phone}`}
            className="mt-2 inline-flex items-center gap-3 font-display text-4xl sm:text-5xl font-black text-brass hover:brightness-110"
          >
            <Phone className="w-8 h-8 text-amber-400" />
            {CONTACT.phoneDisplay}
          </a>
          <div className="mt-3 text-amber-100/70">
            {BRAND.slogan} · Viber · Telegram · WhatsApp
          </div>
        </div>

        {/* Примітка щодо символіки */}
        <div className="mt-6 flex items-start gap-3 max-w-3xl mx-auto rounded-2xl border border-stone-300 bg-stone-100/70 p-4 text-sm text-stone-600">
          <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <p className="italic">{SYMBOLISM_NOTE}</p>
        </div>
      </div>
    </section>
  )
}
