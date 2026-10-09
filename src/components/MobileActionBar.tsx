import { useEffect, useState } from 'react'
import { Navigation, Phone, X } from 'lucide-react'
import { CONTACT, mapLinks, getOpenStatus } from '../lib/hours'

/**
 * Плаваюча панель дій для мобільних пристроїв:
 *   • швидкий маршрут до магазину
 *   • швидкий дзвінок
 *   • індикатор «Відчинено / Зачинено»
 * З'являється після скролу першого екрана.
 */
export function MobileActionBar() {
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const status = getOpenStatus()

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <>
      {/* Панель */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-stone-950 via-stone-950/95 to-transparent pt-6">
        {expanded && (
          <div className="mb-2 rounded-2xl bg-stone-900 border border-amber-800/40 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-200/70">Адреса магазину</span>
              <button onClick={() => setExpanded(false)} className="text-amber-100/50 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="font-bold text-amber-50 text-sm">
              вул. 20-річчя Перемоги, 35 · 2 поверх
            </div>
            <div className="text-xs text-amber-300">
              Будівля АТБ · в одній будівлі з HUMANA
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  status.isOpen ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              <span className="text-amber-100/70">{status.message}</span>
            </div>
            <a
              href={mapLinks.googleDirections}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-2.5 rounded-xl bg-amber-400 text-stone-950 font-bold text-sm"
            >
              Прокласти маршрут
            </a>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-600 text-stone-950 font-bold shadow-lg shadow-amber-500/30"
          >
            <Navigation className="w-4 h-4" />
            Як нас знайти
          </button>
          <a
            href={`tel:${CONTACT.phone}`}
            className="w-14 h-[52px] rounded-2xl bg-stone-800 border border-amber-800/40 flex items-center justify-center text-amber-300 shrink-0"
            aria-label="Зателефонувати"
          >
            <Phone className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Отступ снизу, чтобы контент не перекрывался */}
      <div className="md:hidden h-20" />
    </>
  )
}
