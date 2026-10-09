import { MessageCircle } from 'lucide-react'
import { ClientRequest, formatRelative, formatCurrency } from '../../lib/storage'

interface Props {
  requests: ClientRequest[]
  onSelect: (id: string) => void
}

export function MessagesPanel({ requests, onSelect }: Props) {
  // Сортуємо за останнім повідомленням
  const conversations = [...requests]
    .filter((r) => r.messages.length > 0)
    .sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1].timestamp
      const bLast = b.messages[b.messages.length - 1].timestamp
      return bLast - aLast
    })

  const hasUnread = (r: ClientRequest) => {
    const last = r.messages[r.messages.length - 1]
    return last.author === 'client' && Date.now() - last.timestamp < 24 * 60 * 60 * 1000
  }

  const totalMessages = requests.reduce((acc, r) => acc + r.messages.length, 0)
  const totalUnread = conversations.filter(hasUnread).length

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">Повідомлення</h1>
        <p className="mt-1 text-stone-500">Усі активні діалоги з клієнтами</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="text-2xl font-black text-stone-900">{conversations.length}</div>
          <div className="text-xs text-stone-500 mt-1">Активних діалогів</div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="text-2xl font-black text-stone-900">{totalMessages}</div>
          <div className="text-xs text-stone-500 mt-1">Повідомлень</div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="text-2xl font-black text-amber-600">{totalUnread}</div>
          <div className="text-xs text-stone-500 mt-1">Непрочитаних</div>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <MessageCircle className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <div className="text-stone-600 font-semibold">Ще немає діалогів</div>
          <div className="text-sm text-stone-500 mt-1">
            Напишіть клієнту першим, щоб розпочати розмову
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100">
          {conversations.map((r) => {
            const last = r.messages[r.messages.length - 1]
            const unread = hasUnread(r)
            return (
              <button
                key={r.id}
                onClick={() => onSelect(r.id)}
                className="w-full p-4 hover:bg-amber-50/40 transition-colors text-left flex items-start gap-3 group"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-700 text-stone-950 flex items-center justify-center font-black text-lg shrink-0">
                    {r.clientName.charAt(0)}
                  </div>
                  {unread && (
                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-bold text-stone-900 truncate">{r.clientName}</div>
                    <div className="text-xs text-stone-500 shrink-0">
                      {formatRelative(last.timestamp)}
                    </div>
                  </div>
                  <div className="text-xs text-stone-500 truncate">
                    {r.itemTitle} · {r.categoryLabel}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    {last.offerAmount && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-bold">
                        💰 {formatCurrency(last.offerAmount, r.currency)}
                      </span>
                    )}
                    <span
                      className={`text-xs truncate ${
                        last.author === 'owner' ? 'text-stone-400 italic' : 'text-stone-600 font-medium'
                      }`}
                    >
                      {last.author === 'owner' && 'Ви: '}
                      {last.text || (last.offerAmount ? 'Пропозиція' : '...')}
                    </span>
                  </div>
                </div>
                <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity text-amber-600 text-sm font-semibold">
                  Відкрити →
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
