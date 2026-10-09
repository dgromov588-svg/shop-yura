import { useState } from 'react'
import {
  MapPin,
  Navigation,
  Copy,
  Check,
  Clock,
  Car,
  Bus,
  Footprints,
  Building2,
  Phone,
  ChevronRight,
  Info,
  Layers,
  DoorOpen,
  Landmark,
  ExternalLink,
  Accessibility,
  Package,
} from 'lucide-react'
import {
  ADDRESS,
  CONTACT,
  LANDMARK,
  mapLinks,
  WEEK,
  getOpenStatus,
  formatMinutes,
} from '../lib/hours'

import { Ornament } from './Ornament'

type MapProvider = 'google' | 'osm'

export function Location() {
  const [provider, setProvider] = useState<MapProvider>('google')
  const [copied, setCopied] = useState(false)
  const status = getOpenStatus()
  const todayIdx = status.todayIndex

  const copyAddress = () => {
    navigator.clipboard.writeText(ADDRESS.full)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const steps = [
    {
      icon: Building2,
      title: 'Знайдіть будівлю АТБ',
      text: 'вул. 20-річчя Перемоги, 35. На першому поверсі — супермаркет АТБ, його вивіску видно здалеку.',
    },
    {
      icon: DoorOpen,
      title: 'Орієнтуйтесь на HUMANA',
      text: 'Салон «АнтикварЪ» знаходиться в одній будівлі з секонд-хендом HUMANA — на тому ж 2 поверсі.',
    },
    {
      icon: Layers,
      title: 'Піднімайтесь на 2 поверх',
      text: 'Підніміться на другий поверх будівлі АТБ. Не знайшли — телефонуйте (050) 562-35-23, підкажемо.',
    },
    {
      icon: Package,
      title: 'Приносіть речі',
      text: 'Консультація безкоштовна. Великі предмети або колекції — домовимось про виїзд.',
    },
  ]

  return (
    <section id="location" className="py-20 lg:py-28 bg-wood text-amber-50 relative overflow-hidden">
      {/* Декор */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgba(217,119,6,0.18), transparent 45%), radial-gradient(circle at 85% 75%, rgba(180,83,9,0.15), transparent 50%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 relative">
        {/* Заголовок */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-medium">
            <MapPin className="w-4 h-4" />
            Точка магазину в Дніпрі
          </div>
          <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
            Легко нас <span className="text-brass italic">знайти</span>
          </h2>
          <Ornament tone="light" className="mt-5" />
          <p className="mt-4 text-lg text-amber-100/70">
            Ми в самому серці міста — в кількох хвилинах від зупинки транспорту
            та з безкоштовною парковкою поруч
          </p>
        </div>

        {/* Головний орієнтир */}
        <div className="mt-12 max-w-4xl mx-auto rounded-3xl bg-paper text-stone-900 p-6 sm:p-8 border-2 border-amber-500/70 shadow-2xl shadow-black/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-brass text-stone-950 flex items-center justify-center shrink-0 shadow-lg">
              <Landmark className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
                Як нас швидко знайти
              </div>
              <div className="mt-1 font-display text-2xl sm:text-3xl font-black leading-tight">
                В одній будівлі з <span className="text-amber-700">{LANDMARK.name}</span>
              </div>
              <div className="mt-1 text-stone-600">
                {ADDRESS.streetShort} · {ADDRESS.building} · {ADDRESS.floor}
              </div>
            </div>
          </div>

          <div className="mt-5 grid sm:grid-cols-2 gap-3">
            <a
              href={LANDMARK.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-stone-900 text-amber-100 font-bold hover:bg-stone-800 transition-colors"
            >
              <MapPin className="w-4 h-4 text-amber-400" />
              Будівля на карті ({LANDMARK.name})
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
            <a
              href={mapLinks.google}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-brass text-stone-950 font-bold hover:brightness-110 transition-all"
            >
              <Navigation className="w-4 h-4" />
              Точка салону «АнтикварЪ»
            </a>
          </div>

          {/* Сусіди по будівлі */}
          <div className="mt-6">
            <div className="text-sm font-semibold text-stone-700 mb-2">
              Також у цій будівлі — запитайте будь-кого:
            </div>
            <div className="flex flex-wrap gap-2">
              {LANDMARK.neighbours.map((n) => (
                <span
                  key={n.name}
                  title={n.note}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-300 text-sm text-stone-700"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                  <strong className="font-semibold">{n.name}</strong>
                  <span className="text-stone-500 hidden sm:inline">· {n.note}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Карта + інформація */}
        <div className="mt-10 grid lg:grid-cols-5 gap-6">
          {/* Карта */}
          <div className="lg:col-span-3">
            <div className="rounded-3xl overflow-hidden border border-amber-800/40 shadow-2xl shadow-amber-500/10 bg-stone-900">
              {/* Тулбар карти */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-stone-900 border-b border-amber-900/30">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setProvider('google')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      provider === 'google'
                        ? 'bg-amber-400 text-stone-950'
                        : 'bg-stone-800 text-amber-100/70 hover:bg-stone-700'
                    }`}
                  >
                    Google Maps
                  </button>
                  <button
                    onClick={() => setProvider('osm')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      provider === 'osm'
                        ? 'bg-amber-400 text-stone-950'
                        : 'bg-stone-800 text-amber-100/70 hover:bg-stone-700'
                    }`}
                  >
                    OpenStreetMap
                  </button>
                </div>
                <a
                  href={mapLinks.googleDirections}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 text-xs font-bold transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Маршрут
                </a>
              </div>

              {/* Сама карта */}
              <div className="relative h-[340px] sm:h-[420px] bg-stone-800">
                <iframe
                  key={provider}
                  title="Мапа розташування магазину антикваріату в Дніпрі"
                  src={provider === 'google' ? mapLinks.googleEmbed : mapLinks.osmEmbed}
                  className="w-full h-full"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>

              {/* Підпис під картою */}
              <div className="px-4 py-3 bg-stone-900 border-t border-amber-900/30 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      status.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                    }`}
                  />
                  <span className="font-semibold">{status.short}</span>
                  <span className="text-amber-100/60 text-xs hidden sm:inline">
                    · {status.message}
                  </span>
                </div>
                <a
                  href={mapLinks.google}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300"
                >
                  Відкрити точку в Google Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Інформаційна колонка */}
          <div className="lg:col-span-2 space-y-4">
            {/* Адреса */}
            <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-stone-950 p-6 shadow-xl shadow-amber-500/20">
              <div className="text-xs font-black uppercase tracking-widest opacity-70">
                Наша адреса
              </div>
              <div className="mt-2 text-2xl font-black leading-tight">
                {ADDRESS.streetShort}
              </div>
              <div className="mt-1 font-semibold opacity-80">
                {ADDRESS.floor} · {ADDRESS.city}
              </div>
              <button
                onClick={copyAddress}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-950 text-amber-200 font-bold text-sm hover:bg-stone-900 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" /> Адресу скопійовано!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Скопіювати адресу
                  </>
                )}
              </button>
              <a
                href={mapLinks.googleDirections}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/90 text-stone-950 font-bold text-sm hover:bg-white transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Прокласти маршрут
              </a>
            </div>

            {/* Графік з підсвіткою сьогоднішнього дня */}
            <div className="rounded-2xl bg-stone-900/80 border border-amber-900/40 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Графік роботи
                </h3>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    status.isOpen
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {status.short}
                </span>
              </div>

              <ul className="space-y-1.5 text-sm">
                {WEEK.map((d) => {
                  const isToday = d.day === todayIdx
                  return (
                    <li
                      key={d.day}
                      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isToday
                          ? 'bg-amber-500/15 border border-amber-500/30'
                          : 'hover:bg-stone-800/60'
                      }`}
                    >
                      <span className={isToday ? 'font-bold text-amber-300' : 'text-amber-100/80'}>
                        {d.short}
                        {isToday && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-500 font-black">
                            сьогодні
                          </span>
                        )}
                      </span>
                      <span
                        className={`font-semibold ${
                          d.open === null ? 'text-amber-100/40' : 'text-amber-50'
                        }`}
                      >
                        {d.open !== null && d.close !== null
                          ? `${String(Math.floor(d.open / 60)).padStart(2, '0')}:${String(d.open % 60).padStart(2, '0')} — ${String(Math.floor(d.close / 60)).padStart(2, '0')}:${String(d.close % 60).padStart(2, '0')}`
                          : d.note}
                      </span>
                    </li>
                  )
                })}
              </ul>

              {status.isOpen && status.minutesUntil !== null && (
                <div className="mt-3 text-xs text-amber-200/70 text-center">
                  Закриваємось через {formatMinutes(status.minutesUntil)}
                </div>
              )}
            </div>

            {/* Швидкі дії */}
            <div className="rounded-2xl bg-stone-900/80 border border-amber-900/40 p-5">
              <h3 className="font-bold mb-3 text-sm uppercase tracking-wider text-amber-200/80">
                Потрібна допомога?
              </h3>
              <div className="space-y-2">
                <a
                  href={`tel:${CONTACT.phone}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 transition-colors"
                >
                  <Phone className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-sm">{CONTACT.phoneDisplay}</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-amber-100/40" />
                </a>
                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={CONTACT.telegramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 rounded-xl bg-sky-500/15 text-sky-300 text-xs font-bold hover:bg-sky-500/25 transition-colors text-center"
                  >
                    Telegram
                  </a>
                  <a
                    href={CONTACT.viber}
                    className="py-2.5 rounded-xl bg-violet-500/15 text-violet-300 text-xs font-bold hover:bg-violet-500/25 transition-colors text-center"
                  >
                    Viber
                  </a>
                  <a
                    href={CONTACT.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 transition-colors text-center"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Як нас знайти — покрокова інструкція */}
        <div className="mt-20">
          <div className="text-center max-w-2xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-black">
              Покрокова <span className="text-amber-400">інструкція</span>
            </h3>
            <p className="mt-3 text-amber-100/70">
              Чотири прості кроки — і ви вже у нас на 2 поверсі
            </p>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((s, i) => {
              const Icon = s.icon
              return (
                <div
                  key={s.title}
                  className="relative rounded-2xl bg-stone-900/60 border border-amber-900/30 p-5 hover:border-amber-500/50 hover:bg-stone-900 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-700 text-stone-950 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-stone-800 text-amber-400 font-black text-sm flex items-center justify-center">
                      {i + 1}
                    </div>
                  </div>
                  <h4 className="mt-4 font-bold text-amber-50 leading-tight">{s.title}</h4>
                  <p className="mt-2 text-sm text-amber-100/60 leading-relaxed">{s.text}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Практична інформація: транспорт, парковка, орієнтири */}
        <div className="mt-16 grid md:grid-cols-3 gap-5">
          {/* Транспорт */}
          <div className="rounded-2xl bg-stone-900/60 border border-amber-900/30 p-6">
            <h3 className="font-bold flex items-center gap-2 text-amber-300">
              <Bus className="w-5 h-5" />
              Громадським транспортом
            </h3>
            <p className="mt-4 text-sm text-amber-100/70 leading-relaxed">
              Їдьте до зупинки біля супермаркету <strong className="text-amber-200">АТБ</strong> на
              вул. 20-річчя Перемоги. Google Maps покаже актуальні номери автобусів і маршруток
              саме з вашого місця.
            </p>
            <a
              href={mapLinks.transit}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-200 text-sm font-bold transition-colors"
            >
              <Bus className="w-4 h-4" />
              Маршрут транспортом
            </a>
            <a
              href={mapLinks.walking}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-800/60 hover:bg-stone-700 text-amber-100/80 text-sm font-semibold transition-colors"
            >
              <Footprints className="w-4 h-4" />
              Пішки
            </a>
          </div>

          {/* Авто / парковка */}
          <div className="rounded-2xl bg-stone-900/60 border border-amber-900/30 p-6">
            <h3 className="font-bold flex items-center gap-2 text-amber-300">
              <Car className="w-5 h-5" />
              На автомобілі
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-amber-100/70">
              <li className="flex gap-2.5">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span>Вводьте в навігатор «АТБ, вул. 20-річчя Перемоги, 35» — це наша будівля</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span>Припаркуйтесь біля супермаркету та підніміться на 2 поверх</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span>Важкі речі? Зателефонуйте з парковки — допоможемо</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span>Замовте таксі — Uber, Bolt, Uklon привезуть за адресою</span>
              </li>
            </ul>
            <a
              href={mapLinks.googleDirections}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300"
            >
              <Navigation className="w-3.5 h-3.5" />
              Маршрут до нас авто
            </a>
          </div>

          {/* Орієнтири */}
          <div className="rounded-2xl bg-stone-900/60 border border-amber-900/30 p-6">
            <h3 className="font-bold flex items-center gap-2 text-amber-300">
              <Landmark className="w-5 h-5" />
              Орієнтири в будівлі
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-amber-100/70">
              {LANDMARK.neighbours.map((n) => (
                <li key={n.name} className="flex gap-2.5">
                  <Footprints className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-amber-200">{n.name}</strong> — {n.note}
                  </span>
                </li>
              ))}
              <li className="flex gap-2.5">
                <Accessibility className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Заблукали? Телефонуйте {CONTACT.phoneDisplay} — зустрінемо</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Інфо-блок для великих предметів */}
        <div className="mt-10 rounded-2xl bg-gradient-to-r from-amber-500/15 to-transparent border border-amber-600/30 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center shrink-0">
            <Info className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-amber-50">
              Немає можливості привезти велику річ?
            </div>
            <div className="text-sm text-amber-100/70 mt-1">
              Комоди, шафи, картини у багеті, колекції — ми самі приїдемо до вас.
              Виїзд по Дніпру та області <strong className="text-amber-300">безкоштовний</strong>.
            </div>
          </div>
          <a
            href={`tel:${CONTACT.phone}`}
            className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-400 text-stone-950 font-bold text-sm hover:bg-amber-300 transition-colors"
          >
            <Phone className="w-4 h-4" />
            Викликати на виїзд
          </a>
        </div>
      </div>
    </section>
  )
}

/** Аліас, щоб не конфліктувати з DOM-типом Location */
export { Location as LocationSection }
