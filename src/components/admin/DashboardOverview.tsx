import {
  Inbox,
  Clock,
  CheckCircle2,
  TrendingUp,
  Users,
  Banknote,
  CalendarDays,
  ArrowRight,
} from 'lucide-react'
import { ClientRequest, formatCurrency, formatRelative, statusLabels } from '../../lib/storage'

interface Props {
  requests: ClientRequest[]
  onSelectRequest: (id: string) => void
  /** Без права «Бачити фінанси» суми приховані */
  canFinance?: boolean
}

export function DashboardOverview({ requests, onSelectRequest, canFinance = true }: Props) {
  const newReqs = requests.filter((r) => r.status === 'new')
  const reviewingReqs = requests.filter((r) => r.status === 'reviewing')
  const meetingReqs = requests.filter((r) => r.status === 'meeting')
  const completedReqs = requests.filter((r) => r.status === 'completed')

  const totalCompletedValue = completedReqs.reduce(
    (acc, r) => acc + (r.myOfferPrice || r.ownerAskingPrice || 0),
    0,
  )

  const allOffers = requests.flatMap((r) =>
    r.messages.filter((m) => m.offerAmount).map((m) => m.offerAmount!),
  )
  const avgOffer = allOffers.length
    ? Math.round(allOffers.reduce((a, b) => a + b, 0) / allOffers.length)
    : 0

  // Категорії
  const categoryStats = requests.reduce<Record<string, number>>((acc, r) => {
    acc[r.categoryLabel] = (acc[r.categoryLabel] || 0) + 1
    return acc
  }, {})
  const topCategories = Object.entries(categoryStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const stats = [
    {
      label: 'Нові заявки',
      value: newReqs.length,
      icon: Inbox,
      color: 'from-blue-500 to-blue-600',
      iconColor: 'text-blue-600 bg-blue-100',
    },
    {
      label: 'На розгляді',
      value: reviewingReqs.length,
      icon: Clock,
      color: 'from-amber-500 to-orange-500',
      iconColor: 'text-amber-600 bg-amber-100',
    },
    {
      label: 'Зустрічі',
      value: meetingReqs.length,
      icon: CalendarDays,
      color: 'from-violet-500 to-purple-600',
      iconColor: 'text-violet-600 bg-violet-100',
    },
    {
      label: 'Завершено',
      value: completedReqs.length,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-green-600',
      iconColor: 'text-emerald-600 bg-emerald-100',
    },
  ]

  const recent = [...requests].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)

  // Відсоток конверсії
  const conversionRate =
    requests.length > 0
      ? Math.round((completedReqs.length / requests.length) * 100)
      : 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">Огляд</h1>
        <p className="mt-1 text-stone-500">Стан справ на сьогодні</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div
              key={s.label}
              className="bg-white rounded-2xl p-5 border border-stone-200 hover:shadow-lg transition-shadow"
            >
              <div className={`w-11 h-11 rounded-xl ${s.iconColor} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="mt-3 text-2xl sm:text-3xl font-black text-stone-900">{s.value}</div>
              <div className="text-sm text-stone-500">{s.label}</div>
            </div>
          )
        })}
      </div>

      {/* Big stats */}
      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-stone-900 to-amber-900 rounded-2xl p-6 text-amber-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center gap-2 text-amber-300 text-sm font-semibold uppercase tracking-wider">
              <Banknote className="w-4 h-4" />
              Загальний оборот
            </div>
            <div className="mt-3 text-4xl font-black">{canFinance ? formatCurrency(totalCompletedValue) : '•••••'}</div>
            <div className="mt-2 text-amber-200/70 text-sm">
              Сума завершених угод за весь час
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-stone-200">
          <div className="flex items-center gap-2 text-stone-500 text-sm font-semibold uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            Конверсія угод
          </div>
          <div className="mt-3 text-4xl font-black text-stone-900">{conversionRate}%</div>
          <div className="mt-3 h-2 rounded-full bg-stone-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all"
              style={{ width: `${conversionRate}%` }}
            ></div>
          </div>
          <div className="mt-2 text-xs text-stone-500">
            {completedReqs.length} з {requests.length} заявок завершено
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-stone-200">
          <div className="flex items-center gap-2 text-stone-500 text-sm font-semibold uppercase tracking-wider">
            <Users className="w-4 h-4" />
            Середня пропозиція
          </div>
          <div className="mt-3 text-4xl font-black text-stone-900">{canFinance ? formatCurrency(avgOffer) : '•••••'}</div>
          {!canFinance && <div className="mt-1 text-xs text-stone-400">Приховано власником</div>}
          <div className="mt-2 text-xs text-stone-500">
            На основі {allOffers.length} {allOffers.length === 1 ? 'пропозиції' : 'пропозицій'}
          </div>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200">
          <div className="p-6 border-b border-stone-200 flex items-center justify-between">
            <h2 className="font-bold text-stone-900">Останні звернення</h2>
            <span className="text-xs text-stone-500">{requests.length} всього</span>
          </div>
          <div className="divide-y divide-stone-100">
            {recent.map((r) => (
              <button
                key={r.id}
                onClick={() => onSelectRequest(r.id)}
                className="w-full p-4 flex items-start gap-4 hover:bg-stone-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-700 text-stone-950 flex items-center justify-center font-bold shrink-0">
                  {r.clientName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-stone-900 truncate">
                      {r.clientName}
                    </div>
                    <div className="text-xs text-stone-500 shrink-0">
                      {formatRelative(r.updatedAt)}
                    </div>
                  </div>
                  <div className="text-sm text-stone-600 truncate">{r.itemTitle}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                      {r.categoryLabel}
                    </span>
                    <span className="text-xs text-stone-500">
                      {statusLabels[r.status]}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-300 mt-3 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Top categories */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h2 className="font-bold text-stone-900 mb-4">Топ категорії</h2>
          {topCategories.length === 0 ? (
            <div className="text-sm text-stone-500">Ще немає заявок</div>
          ) : (
            <div className="space-y-4">
              {topCategories.map(([cat, count], i) => {
                const percent = Math.round((count / requests.length) * 100)
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-semibold text-stone-700">{cat}</span>
                      <span className="text-stone-500">{count} ({percent}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          i === 0
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                            : i === 1
                            ? 'bg-amber-400'
                            : 'bg-amber-300'
                        }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-stone-200">
            <h3 className="font-bold text-stone-900 text-sm">Швидкі дії</h3>
            <div className="mt-3 space-y-2">
              <a
                href="#admin#requests"
                className="block text-sm text-amber-700 hover:text-amber-800 font-semibold"
              >
                → Усі заявки
              </a>
              <a
                href="#admin#messages"
                className="block text-sm text-amber-700 hover:text-amber-800 font-semibold"
              >
                → Непрочитані повідомлення
              </a>
              <a
                href="#admin#settings"
                className="block text-sm text-amber-700 hover:text-amber-800 font-semibold"
              >
                → Налаштування
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
