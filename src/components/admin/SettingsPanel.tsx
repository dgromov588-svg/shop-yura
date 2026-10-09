import { useState, useEffect } from 'react'
import {
  Save,
  Bell,
  MessageSquare,
  RefreshCw,
  Download,
  Upload,
  Check,
  ShieldCheck,
} from 'lucide-react'
import { Settings, ClientRequest, defaultSettings, formatDate } from '../../lib/storage'
import type { Backend } from '../../lib/backend'
import { can, type User } from '../../lib/auth'
import { DeployPanel } from './DeployPanel'
import { TermiusPanel } from './TermiusPanel'

interface Props {
  backend: Backend
  user: User
  requests: ClientRequest[]
  onImported: () => void
  onError: (e: unknown) => void
}

export function SettingsPanel({ backend, user, requests, onImported, onError }: Props) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [saved, setSaved] = useState(false)
  const isOwner = user.role === 'owner'
  const canExport = can(user, 'data.export')

  useEffect(() => {
    backend
      .getSettings()
      .then((s) => setSettings({ ...defaultSettings, ...s, notifications: { ...defaultSettings.notifications, ...(s.notifications || {}) }, autoResponder: { ...defaultSettings.autoResponder, ...(s.autoResponder || {}) } }))
      .catch(onError)
  }, [backend, onError])

  const save = async () => {
    try {
      await backend.saveSettings(settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      onError(e)
    }
  }

  const exportAll = () => {
    const data = { settings, requests, exportedAt: new Date().toISOString(), by: user.name }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `antique_backup_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!Array.isArray(data.requests)) throw new Error('У файлі немає заявок')
        if (!confirm(`Замінити всі заявки на ${data.requests.length} з файлу? Поточні буде втрачено.`)) return
        await backend.importRequests(data.requests)
        if (data.settings) await backend.saveSettings({ ...settings, ...data.settings })
        onImported()
        alert('Імпорт завершено')
      } catch (err) {
        alert(`Помилка імпорту: ${(err as Error).message}`)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900">Налаштування</h1>
          <p className="mt-1 text-stone-500 text-sm">
            Параметри роботи панелі, сповіщення та дані
          </p>
        </div>
        <button
          onClick={save}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-bold hover:shadow-lg hover:shadow-amber-500/30 transition-all"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" />
              Збережено!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Зберегти зміни
            </>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {/* Owner info */}
        <section className="bg-white rounded-2xl border border-stone-200 p-6">
          <h2 className="font-bold text-stone-900 mb-4">Інформація про власника</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-stone-700">Ім'я власника</label>
              <input
                value={settings.ownerName}
                onChange={(e) => setSettings({ ...settings, ownerName: e.target.value })}
                className="mt-1 w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-stone-700">Назва компанії</label>
              <input
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="mt-1 w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </section>

        {/* Безпека */}
        <section className="bg-white rounded-2xl border border-stone-200 p-6 flex gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
          <div className="text-sm text-stone-600">
            <div className="font-bold text-stone-900 mb-1">Доступ і паролі</div>
            Кожен член команди має власний логін і пароль, збережені у вигляді хешу.
            {backend.mode === 'server' ? ' Права перевіряє сервер.' : ' Локальний режим: дані лише в цьому браузері.'}
            {' '}Свій пароль — у розділі «Профіль»
            {isOwner ? ', паролі й права помічників — у розділі «Команда».' : '.'}
          </div>
        </section>

        {/* Currency */}
        <section className="bg-white rounded-2xl border border-stone-200 p-6">
          <h2 className="font-bold text-stone-900 mb-4">Валюта та курси</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold text-stone-700">За замовчуванням</label>
              <select
                value={settings.defaultCurrency}
                onChange={(e) =>
                  setSettings({ ...settings, defaultCurrency: e.target.value as any })
                }
                className="mt-1 w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400"
              >
                <option value="UAH">UAH (грн)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-stone-700">Курс USD</label>
              <input
                type="number"
                step="0.01"
                value={settings.exchangeRates.USD}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    exchangeRates: {
                      ...settings.exchangeRates,
                      USD: Number(e.target.value),
                    },
                  })
                }
                className="mt-1 w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-stone-700">Курс EUR</label>
              <input
                type="number"
                step="0.01"
                value={settings.exchangeRates.EUR}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    exchangeRates: {
                      ...settings.exchangeRates,
                      EUR: Number(e.target.value),
                    },
                  })
                }
                className="mt-1 w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-white rounded-2xl border border-stone-200 p-6">
          <h2 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-600" />
            Сповіщення
          </h2>
          <div className="space-y-3">
            {[
              {
                key: 'newRequest',
                label: 'Нові заявки',
                desc: 'Сповіщати про нові звернення клієнтів',
              },
              {
                key: 'statusChange',
                label: 'Зміна статусу',
                desc: 'Сповіщати при зміні статусу заявки',
              },
              {
                key: 'offerReceived',
                label: 'Зустрічна пропозиція',
                desc: 'Сповіщати коли клієнт пропонує свою ціну',
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-stone-50 hover:bg-stone-100 cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-stone-900">{item.label}</div>
                  <div className="text-xs text-stone-500">{item.desc}</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications[item.key as keyof typeof settings.notifications]}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        [item.key]: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
                />
              </label>
            ))}
          </div>
        </section>

        {/* Auto-reply */}
        <section className="bg-white rounded-2xl border border-stone-200 p-6">
          <h2 className="font-bold text-stone-900 mb-1 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-600" />
            Автовідповідь
          </h2>
          <p className="text-sm text-stone-500 mb-4">
            Текст, який автоматично надсилається клієнту при створенні заявки
          </p>
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={settings.autoResponder.enabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  autoResponder: { ...settings.autoResponder, enabled: e.target.checked },
                })
              }
              className="w-5 h-5 rounded accent-amber-500"
            />
            <span className="font-semibold text-stone-700">Увімкнути автовідповідь</span>
          </label>
          <textarea
            rows={3}
            value={settings.autoResponder.text}
            onChange={(e) =>
              setSettings({
                ...settings,
                autoResponder: { ...settings.autoResponder, text: e.target.value },
              })
            }
            className="w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400 resize-none"
          />
        </section>

        {/* Data management */}
        <section className="bg-white rounded-2xl border border-stone-200 p-6">
          <h2 className="font-bold text-stone-900 mb-1 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-amber-600" />
            Резервна копія
          </h2>
          <p className="text-sm text-stone-500 mb-4">
            Збережіть дані на свій пристрій або відновіть з резервної копії
          </p>
          <div className="flex flex-wrap gap-3">
            {canExport && (
              <button
                onClick={exportAll}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
              >
                <Download className="w-4 h-4" />
                Експорт JSON
              </button>
            )}
            {isOwner && (
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold cursor-pointer">
                <Upload className="w-4 h-4" />
                Імпорт JSON
                <input type="file" accept=".json" onChange={importFile} className="hidden" />
              </label>
            )}
            {!canExport && !isOwner && <span className="text-sm text-stone-500">Експорт і імпорт доступні власнику</span>}
          </div>
          {backend.mode === 'server' && (
            <p className="mt-3 text-xs text-stone-500">
              На сервері дані зберігаються окремо від папки сайту (MySQL або <code>~/antikvar-data/</code>). Оновлення сайту їх не стирає.
            </p>
          )}
        </section>

        {/* Заливка з телефону через Termius */}
        {isOwner && <TermiusPanel />}

        {/* Заливка з телефону через GitHub-кнопку */}
        <DeployPanel />

        {/* Deployment */}
        <section className="bg-white rounded-2xl border border-stone-200 p-6">
          <h2 className="font-bold text-stone-900 mb-1 flex items-center gap-2">
            <Upload className="w-5 h-5 text-amber-600" />
            Публікація на хостинг
          </h2>
          <p className="text-sm text-stone-500 mb-4">
            З компʼютера, у папці проекту — чотири файли по порядку:
          </p>

          <ol className="space-y-2">
            {[
              { file: '1-ВСТАНОВИТИ.bat', when: 'один раз', what: 'встановлює все, заливає сайт, показує код входу в адмінку' },
              { file: '2-ЗАЛИТИ-САЙТ.bat', when: 'після кожної зміни', what: 'збирає сайт і заливає лише змінені файли' },
              { file: '3-АВТОЗАЛИВКА.bat', when: 'за бажанням', what: 'поки вікно відкрите — кожне збереження одразу на сайті' },
              { file: '4-ПОВЕРНУТИ-ПОПЕРЕДНЮ.bat', when: 'якщо щось зламалось', what: 'повертає сайт до стану перед останньою заливкою' },
            ].map((s, i) => (
              <li key={s.file} className="flex gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200">
                <span className="w-7 h-7 rounded-full bg-brass text-stone-950 font-black text-sm flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-sm">
                    <code className="font-bold text-stone-900">{s.file}</code>{' '}
                    <span className="text-xs text-amber-700 font-semibold">· {s.when}</span>
                  </div>
                  <div className="text-xs text-stone-600 mt-0.5">{s.what}</div>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-4 p-4 rounded-xl bg-stone-900 text-amber-50">
            <div className="font-bold text-sm mb-2">Або через Netcatty (перетягнути мишкою)</div>
            <ol className="text-xs space-y-1.5 text-amber-100/85 list-decimal list-inside">
              <li>
                <code className="text-amber-300">ЗІБРАТИ-ДЛЯ-NETCATTY.bat</code> — відкриється папка з двома файлами
              </li>
              <li>
                Netcatty → SFTP → перетягніть <code className="text-amber-300">antikvar-site.tgz</code> і{' '}
                <code className="text-amber-300">antikvar.sh</code> у домашню папку сервера
              </li>
              <li>
                У терміналі Netcatty: <code className="text-amber-300">bash ~/antikvar.sh unpack</code>
                <span className="text-amber-100/50"> (з автозаливкою — не потрібно)</span>
              </li>
            </ol>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
            Що де змінювати: телефон, адреса, графік — <code>src/lib/hours.ts</code> · перелік «Купуємо» —{' '}
            <code>src/lib/categories.ts</code> · фото — папка <code>public/</code>.
          </div>

          <p className="mt-3 text-xs text-stone-500">
            Покрокова інструкція — файл{' '}
            <code className="bg-stone-100 px-1.5 py-0.5 rounded">ІНСТРУКЦІЯ.md</code> у папці проекту.
          </p>
        </section>

        {/* System info */}
        <section className="bg-gradient-to-br from-stone-900 to-amber-900 rounded-2xl text-amber-50 p-6">
          <h2 className="font-bold mb-3">Інформація про систему</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-amber-200/60">Версія</div>
              <div className="font-semibold">1.0.0</div>
            </div>
            <div>
              <div className="text-amber-200/60">Збережено заявок</div>
              <div className="font-semibold">{requests.length}</div>
            </div>
            <div>
              <div className="text-amber-200/60">Дата</div>
              <div className="font-semibold">{formatDate(Date.now())}</div>
            </div>
            <div>
              <div className="text-amber-200/60">Сховище</div>
              <div className="font-semibold">
                {backend.mode === 'server' ? 'Сервер (спільна база)' : 'Локальне (цей браузер)'}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
