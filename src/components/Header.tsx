import { useState, useEffect } from 'react'
import { MapPin, Phone, Menu, X } from 'lucide-react'
import { ADDRESS, CONTACT, mapLinks, getOpenStatus } from '../lib/hours'
import { LogoMark } from './Logo'

type HeaderProps = { scrolled: boolean }

const nav = [
  { href: '#we-buy', label: 'Що скуповуємо' },
  { href: '#process', label: 'Як працюємо' },
  { href: '#why-us', label: 'Чому ми' },
  { href: '#about', label: 'Про Юрія' },
  { href: '#location', label: 'Як знайти' },
  { href: '#contact', label: 'Контакти' },
]

export function Header({ scrolled }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const status = getOpenStatus()

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
  }, [open])

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      {/* Верхній рядок: адреса, статус, месенджери */}
      <div
        className={`hidden md:block bg-stone-950 text-amber-100/70 text-xs border-b border-amber-700/25 overflow-hidden transition-all duration-300 ${
          scrolled ? 'max-h-0 border-b-0' : 'max-h-10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 h-9 flex items-center justify-between gap-4">
          <a
            href={mapLinks.google}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-amber-300 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            {ADDRESS.streetShort}, {ADDRESS.floor}
            <span className="text-amber-300/90">· будівля АТБ, поруч з HUMANA</span>
          </a>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  status.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              {status.message}
            </span>
            <span className="h-3 w-px bg-amber-700/40" />
            <a href={CONTACT.telegramLink} target="_blank" rel="noopener noreferrer" className="hover:text-amber-300">
              Telegram
            </a>
            <a href={CONTACT.viber} className="hover:text-amber-300">
              Viber
            </a>
            <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="hover:text-amber-300">
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Основна панель з дерева */}
      <div
        className={`bg-wood border-b border-amber-600/35 transition-all duration-300 ${
          scrolled ? 'py-2 shadow-2xl shadow-black/50' : 'py-3'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-6">
          <a href="#" className="flex items-center gap-3 group" aria-label="ЮК — на головну">
            <LogoMark
              className={`drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] transition-all duration-300 group-hover:rotate-6 ${
                scrolled ? 'w-11 h-11' : 'w-14 h-14'
              }`}
            />
            <div className="leading-none">
              <div className="text-[10px] uppercase tracking-[0.35em] text-amber-200/80 font-semibold">
                Салон
              </div>
              <div className="mt-0.5 font-display text-2xl sm:text-[26px] font-black text-brass tracking-wide">
                АнтикварЪ
              </div>
            </div>
          </a>

          <nav className="hidden xl:flex items-center gap-7">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="text-[15px] text-amber-100/85 hover:text-amber-300 transition-colors relative group"
              >
                {n.label}
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-px bg-amber-400 group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <a
              href={`tel:${CONTACT.phone}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brass text-stone-950 text-sm font-bold hover:brightness-110 transition-all"
            >
              <Phone className="w-4 h-4" />
              {CONTACT.phoneDisplay}
            </a>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="xl:hidden p-2 rounded-lg text-amber-200 hover:bg-white/5 border border-amber-700/40"
            aria-label="Меню"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Мобільне меню */}
      {open && (
        <div className="xl:hidden bg-wood border-b border-amber-700/30 max-h-[calc(100vh-5rem)] overflow-y-auto">
          <div className="px-4 py-4 flex flex-col gap-1">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="py-3 px-3 rounded-lg hover:bg-white/5 font-display text-lg text-amber-100 border-b border-amber-800/20"
              >
                {n.label}
              </a>
            ))}
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-100/70 px-3">
              <span className={`w-2 h-2 rounded-full ${status.isOpen ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {status.message}
            </div>
            <a
              href={`tel:${CONTACT.phone}`}
              className="mt-3 flex items-center justify-center gap-2 py-3 rounded-full bg-brass text-stone-950 font-bold"
            >
              <Phone className="w-4 h-4" />
              Зателефонувати
            </a>
            <a
              href="#admin"
              onClick={() => setOpen(false)}
              className="py-2 px-3 text-amber-200/40 hover:text-amber-300 text-xs text-center"
            >
              🔐 Панель власника
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
