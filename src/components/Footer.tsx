import { MapPin, Phone, Mail, MessageCircle, Clock } from 'lucide-react'
import { mapLinks, CONTACT, ADDRESS, WEEK, getOpenStatus } from '../lib/hours'
import { Logo } from './Logo'
import { Ornament } from './Ornament'

const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export function Footer() {
  const status = getOpenStatus()

  return (
    <footer className="relative bg-wood text-amber-100/80 pt-16 pb-8 overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 relative">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Бренд */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <Logo className="w-48 drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]" />
            <p className="mt-5 text-sm leading-relaxed text-amber-100/70">
              Справедлива оцінка та викуп предметів старовини. Працюємо чесно
              та прозоро вже понад 15 років.
            </p>
          </div>

          {/* Контакти */}
          <div>
            <h4 className="font-display text-lg font-bold text-brass">Контакти</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
                <a
                  href={mapLinks.google}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-300 transition-colors"
                >
                  {ADDRESS.streetShort}
                  <br />
                  {ADDRESS.floor}, м. {ADDRESS.city}, {ADDRESS.postal}
                  <br />
                  <span className="text-amber-300/90">Будівля АТБ · поруч з HUMANA</span>
                </a>
              </li>
              <li className="pl-6">
                <a href="#location" className="text-xs font-bold text-amber-400 hover:text-amber-300">
                  → Як нас знайти, транспорт, парковка
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-400" />
                <a href={`tel:${CONTACT.phone}`} className="hover:text-amber-300">
                  {CONTACT.phoneDisplay}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400" />
                <a href={`mailto:${CONTACT.email}`} className="hover:text-amber-300 break-all">
                  {CONTACT.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Месенджери */}
          <div>
            <h4 className="font-display text-lg font-bold text-brass">Месенджери Юрія</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                { label: 'Telegram', href: CONTACT.telegramLink, ext: true },
                { label: 'Viber', href: CONTACT.viber, ext: false },
                { label: 'WhatsApp', href: CONTACT.whatsapp, ext: true },
              ].map((m) => (
                <li key={m.label}>
                  <a
                    href={m.href}
                    {...(m.ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="inline-flex items-center gap-2 hover:text-amber-300"
                  >
                    <MessageCircle className="w-4 h-4 text-amber-400" />
                    {m.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Графік */}
          <div>
            <h4 className="font-display text-lg font-bold text-brass flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Графік роботи
            </h4>
            <ul className="mt-4 space-y-1.5 text-sm">
              {WEEK.map((d) => (
                <li
                  key={d.day}
                  className={`flex justify-between gap-4 ${
                    d.day === status.todayIndex ? 'text-amber-300 font-semibold' : ''
                  }`}
                >
                  <span>{d.short}</span>
                  <span className={d.open === null ? 'text-amber-200/50' : 'text-amber-50'}>
                    {d.open !== null && d.close !== null ? `${hhmm(d.open)} — ${hhmm(d.close)}` : d.note}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Ornament tone="light" className="mt-12" />

        <div className="mt-6 flex flex-col sm:flex-row justify-between gap-3 text-xs text-amber-200/50">
          <div>© {new Date().getFullYear()} Салон «АнтикварЪ» · {CONTACT.phoneDisplay}. Усі права захищені.</div>
          <div className="flex items-center gap-4">
            <span>м. Дніпро · Дніпропетровська область</span>
            <a href="#admin" className="hover:text-amber-300 transition-colors">
              🔐 Панель
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
