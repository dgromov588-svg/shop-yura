import { useState } from 'react'
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  Navigation,
  MessageCircle,
} from 'lucide-react'
import { categoryLabels, RequestCategory } from '../lib/storage'
import { getBackend } from '../lib/backend'
import { CONTACT, mapLinks } from '../lib/hours'
import { Ornament } from './Ornament'

export function Contact() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    contact: 'telegram' as 'phone' | 'telegram' | 'viber' | 'whatsapp',
    category: 'other' as RequestCategory,
    itemTitle: '',
    message: '',
    price: '',
  })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [website, setWebsite] = useState('') // пастка для ботів (приховане поле)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setSendError('')
    try {
      const backend = await getBackend()
      const price = Number(String(form.price).replace(/\D/g, ''))
      await backend.submitPublic({
        name: form.name.trim(),
        phone: form.phone.trim(),
        contact: form.contact,
        category: form.category,
        categoryLabel: categoryLabels[form.category],
        itemTitle: form.itemTitle.trim(),
        message: form.message.trim() || `Цікавить: ${categoryLabels[form.category]}`,
        price: price > 0 ? price : undefined,
        website,
      })
    } catch (err) {
      setSendError(`${(err as Error).message}. Або зателефонуйте: ${CONTACT.phoneDisplay}`)
      setSending(false)
      return
    }
    setSending(false)
    setSent(true)
    setTimeout(() => {
      setSent(false)
      setForm({
        name: '',
        phone: '',
        contact: 'telegram',
        category: 'other',
        itemTitle: '',
        message: '',
        price: '',
      })
    }, 3500)
  }

  // Контактні дані Юрія — джерело правди: src/lib/hours.ts
  const phone = CONTACT.phone
  const phoneFormatted = CONTACT.phoneDisplay
  const telegram = CONTACT.telegram
  const viber = CONTACT.phone
  const whatsapp = CONTACT.phone

  return (
    <section
      id="contact"
      className="py-20 lg:py-28 bg-gradient-to-b from-stone-50 to-amber-50/40"
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-sm font-semibold text-amber-700 uppercase tracking-wider">
            Звʼязатися з Юрієм
          </div>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-stone-900">
            <span className="text-amber-700 italic">Зателефонуйте</span> або напишіть
          </h2>
          <Ornament className="mt-5" />
          <p className="mt-4 text-lg text-stone-600">
            Опишіть, що у вас є, надішліть фото — і я передзвоню протягом 15
            хвилин
          </p>
        </div>

        {/* Messengers buttons */}
        <div className="mt-12 flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
          <a
            href={`tel:${phone}`}
            className="inline-flex items-center gap-3 px-6 py-4 rounded-full bg-gradient-to-r from-amber-400 to-yellow-600 text-stone-950 font-bold shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02] transition-all"
          >
            <Phone className="w-5 h-5" />
            {phoneFormatted}
          </a>
          <a
            href={`https://t.me/${telegram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-6 py-4 rounded-full bg-sky-500 text-white font-bold shadow-lg shadow-sky-500/30 hover:bg-sky-600 hover:scale-[1.02] transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            Telegram
          </a>
          <a
            href={`viber://chat?number=${viber}`}
            className="inline-flex items-center gap-3 px-6 py-4 rounded-full bg-violet-600 text-white font-bold shadow-lg shadow-violet-500/30 hover:bg-violet-700 hover:scale-[1.02] transition-all"
          >
            <Phone className="w-5 h-5" />
            Viber
          </a>
          <a
            href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-6 py-4 rounded-full bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 hover:scale-[1.02] transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            WhatsApp
          </a>
        </div>

        <div className="mt-14 grid lg:grid-cols-5 gap-8">
          {/* Contact info */}
          <div className="lg:col-span-2 space-y-4">
            <a
              href="https://maps.google.com/?q=вул.+20-річчя+Перемоги,+35,+Дніпро"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white rounded-2xl p-5 border border-amber-200 hover:border-amber-500 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-stone-900">Адреса магазину</div>
                  <div className="text-stone-600 mt-1">
                    вул. 20-річчя Перемоги, 35
                    <br />
                    2 поверх, м. Дніпро, 49127
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-amber-700">
                    <Navigation className="w-4 h-4" />
                    Прокласти маршрут
                  </div>
                </div>
              </div>
            </a>

            <a
              href={`tel:${phone}`}
              className="block bg-white rounded-2xl p-5 border border-amber-200 hover:border-amber-500 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-stone-900">Юрій — оцінювач</div>
                  <div className="text-stone-600 mt-1">{phoneFormatted}</div>
                  <div className="text-stone-600 text-sm">
                    Щодня з 10:00 до 19:00
                  </div>
                </div>
              </div>
            </a>

            <a
              href={`mailto:${telegram}@gmail.com`}
              className="block bg-white rounded-2xl p-5 border border-amber-200 hover:border-amber-500 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-stone-900">Email</div>
                  <div className="text-stone-600 mt-1">
                    yuriy.antique.dnipro@gmail.com
                  </div>
                </div>
              </div>
            </a>

            <div className="bg-white rounded-2xl p-5 border border-amber-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-stone-900">Графік роботи</div>
                  <div className="mt-2 space-y-1 text-stone-600 text-sm">
                    <div className="flex justify-between gap-4">
                      <span>Понеділок — П'ятниця</span>
                      <span className="font-semibold text-stone-900">10:00 — 19:00</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Субота</span>
                      <span className="font-semibold text-stone-900">11:00 — 17:00</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Неділя</span>
                      <span className="font-semibold text-stone-900">за домовленістю</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Map link + form */}
          <div className="lg:col-span-3 space-y-6">
            {/* Швидкий доступ до карти */}
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-amber-200 bg-gradient-to-br from-stone-900 to-stone-800 text-amber-50 p-6">
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl"></div>
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-stone-950 flex items-center justify-center shrink-0 shadow-lg">
                  <MapPin className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Точка магазину на карті
                  </div>
                  <div className="mt-1 text-xl font-black leading-tight">
                    вул. 20-річчя Перемоги, 35
                  </div>
                  <div className="text-amber-100/70 text-sm">
                    2 поверх будівлі АТБ · Дніпро · 49127
                  </div>
                  <div className="mt-1 text-amber-300 text-sm font-semibold">
                    В одній будівлі з HUMANA
                  </div>
                  <a
                    href="#location"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300"
                  >
                    Інструкція як знайти, транспорт і парковка →
                  </a>
                </div>
                <a
                  href={mapLinks.googleDirections}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-400 text-stone-950 font-bold text-sm hover:bg-amber-300 transition-colors w-full sm:w-auto"
                >
                  <Navigation className="w-4 h-4" />
                  Маршрут
                </a>
              </div>
            </div>

            {/* Quick form */}
            <form
              onSubmit={submit}
              className="bg-white rounded-2xl p-6 sm:p-8 border border-amber-200 shadow-sm"
            >
              <h3 className="text-xl font-bold text-stone-900">
                Залиште заявку на оцінку
              </h3>
              <p className="text-sm text-stone-500 mt-1">
                Опишіть предмет та залиште контакт — передзвоню протягом 15
                хвилин
              </p>

              <div className="mt-5 grid sm:grid-cols-2 gap-4">
                <input
                  required
                  type="text"
                  placeholder="Ваше імʼя"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-amber-200 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition"
                />
                <input
                  required
                  type="tel"
                  placeholder="+38 (___) ___-__-__"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-amber-200 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition"
                />
              </div>

              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as RequestCategory })
                  }
                  className="px-4 py-3 rounded-xl bg-stone-50 border border-amber-200 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition"
                >
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  value={form.contact}
                  onChange={(e) =>
                    setForm({ ...form, contact: e.target.value as typeof form.contact })
                  }
                  className="px-4 py-3 rounded-xl bg-stone-50 border border-amber-200 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition"
                >
                  <option value="telegram">Telegram</option>
                  <option value="viber">Viber</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone">Телефон</option>
                </select>
              </div>

              <input
                type="text"
                placeholder="Коротка назва предмета (напр. Ікона Богородиці, XIX ст.)"
                value={form.itemTitle}
                onChange={(e) => setForm({ ...form, itemTitle: e.target.value })}
                className="mt-4 w-full px-4 py-3 rounded-xl bg-stone-50 border border-amber-200 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition"
              />

              <textarea
                placeholder="Детальний опис: стан, розміри, рік, особливості..."
                rows={3}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="mt-4 w-full px-4 py-3 rounded-xl bg-stone-50 border border-amber-200 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition resize-none"
              ></textarea>

              <input
                type="text"
                inputMode="numeric"
                placeholder="Очікувана вартість (грн), якщо відомо"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="mt-4 w-full px-4 py-3 rounded-xl bg-stone-50 border border-amber-200 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition"
              />

              <button
                type="submit"
                disabled={sent || sending}
                className="mt-5 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-600 text-stone-950 font-bold shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02] transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {sent ? '✓ Заявку надіслано!' : sending ? 'Надсилаємо…' : 'Надіслати заявку'}
              </button>

              {/* Пастка для ботів: людина це поле не бачить */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="absolute -left-[9999px] w-px h-px opacity-0"
                aria-hidden="true"
              />

              {sendError && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">{sendError}</div>
              )}

              {sent && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                  Дякую! Юрій передзвонить протягом 15 хвилин.
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
