import { useState, useRef, useEffect } from 'react'
import {
  ArrowLeft,
  Send,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Edit3,
  Trash2,
  Banknote,
  Tag,
  CalendarDays,
  CheckCircle2,
  Copy,
  ExternalLink,
  Save,
} from 'lucide-react'
import {
  ClientRequest,
  RequestStatus,
  statusLabels,
  statusColors,
  formatCurrency,
  formatDate,
  formatRelative,
  priorityLabels,
  priorityColors,
} from '../../lib/storage'
import { can, ROLE_LABEL, type User, type TeamMember } from '../../lib/auth'

interface Props {
  request: ClientRequest
  user: User
  team: TeamMember[]
  onBack: () => void
  onUpdate: (updater: (r: ClientRequest) => ClientRequest) => void
  /** Немає — немає права видаляти */
  onDelete?: () => void
}

export function RequestDetail({ request, user, team, onBack, onUpdate, onDelete }: Props) {
  const canOffer = can(user, 'offers.make')
  const nameOf = (id?: string | null) => team.find((t) => t.id === id)?.name
  const [replyText, setReplyText] = useState('')
  const [offerAmount, setOfferAmount] = useState('')
  const [showOffer, setShowOffer] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(request.notes)
  const [tagInput, setTagInput] = useState('')
  const messagesEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNotesValue(request.notes)
  }, [request.notes])

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [request.messages])

  const sendReply = (withOffer = false) => {
    const text = replyText.trim()
    if (!text && !withOffer) return

    const offer = withOffer && offerAmount ? Number(offerAmount) : undefined

    const newMsg = {
      id: `m_${Date.now()}`,
      author: 'owner' as const,
      text: text || (withOffer ? `Моя пропозиція: ${formatCurrency(offer, request.currency)}` : ''),
      timestamp: Date.now(),
      offerAmount: offer,
    }

    onUpdate((r) => ({
      ...r,
      messages: [...r.messages, newMsg],
      updatedAt: Date.now(),
      myOfferPrice: offer ?? r.myOfferPrice,
      status: r.status === 'new' ? 'reviewing' : r.status,
    }))

    setReplyText('')
    setOfferAmount('')
    setShowOffer(false)
  }

  const setStatus = (status: RequestStatus) => {
    onUpdate((r) => ({ ...r, status, updatedAt: Date.now() }))
  }

  const setPriority = (priority: ClientRequest['priority']) => {
    onUpdate((r) => ({ ...r, priority, updatedAt: Date.now() }))
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (!tag || request.tags.includes(tag)) return
    onUpdate((r) => ({ ...r, tags: [...r.tags, tag] }))
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    onUpdate((r) => ({ ...r, tags: r.tags.filter((t) => t !== tag) }))
  }

  const saveNotes = () => {
    onUpdate((r) => ({ ...r, notes: notesValue }))
    setEditingNotes(false)
  }

  const copyContact = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const openMessenger = () => {
    const phoneClean = request.phone.replace(/\D/g, '')
    switch (request.preferredContact) {
      case 'telegram':
        window.open(`https://t.me/+${phoneClean}`, '_blank')
        break
      case 'viber':
        window.open(`viber://chat?number=%2B${phoneClean}`, '_blank')
        break
      case 'whatsapp':
        window.open(`https://wa.me/${phoneClean}`, '_blank')
        break
      default:
        window.open(`tel:${request.phone}`, '_blank')
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900"
        >
          <ArrowLeft className="w-4 h-4" />
          До списку
        </button>
        <div className="flex gap-2">
          <span
            className={`text-xs px-3 py-1.5 rounded-full border font-semibold ${
              statusColors[request.status]
            }`}
          >
            {statusLabels[request.status]}
          </span>
          <span
            className={`text-xs px-3 py-1.5 rounded-full font-bold ${
              priorityColors[request.priority]
            }`}
          >
            {priorityLabels[request.priority]}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main: chat + actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client & item card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-700 text-stone-950 flex items-center justify-center font-black text-xl shrink-0">
                {request.clientName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-black text-stone-900">{request.clientName}</h1>
                <div className="text-sm text-stone-500 mt-0.5">
                  {request.city || 'Дніпро'} · Звернення{' '}
                  {formatRelative(request.createdAt)}
                </div>
                <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
                  <button
                    onClick={() => copyContact(request.phone)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors group"
                  >
                    <Phone className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold text-stone-700">{request.phone}</span>
                    <Copy className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <button
                    onClick={openMessenger}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors text-amber-700 font-semibold"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Написати у {request.preferredContact}
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  {request.email && (
                    <a
                      href={`mailto:${request.email}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors"
                    >
                      <Mail className="w-4 h-4 text-violet-600" />
                      <span className="text-stone-700 truncate">{request.email}</span>
                    </a>
                  )}
                  {request.needsVisit && request.clientAddress && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 text-rose-700">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{request.clientAddress}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-stone-200">
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Предмет оцінки
              </div>
              <div className="font-bold text-stone-900">{request.itemTitle}</div>
              <p className="mt-2 text-stone-600 leading-relaxed">
                {request.itemDescription}
              </p>
              <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-stone-500">Рік / період</div>
                  <div className="font-semibold text-stone-800">
                    {request.estimatedYear || 'Не вказано'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-stone-500">Стан</div>
                  <div className="font-semibold text-stone-800">
                    {request.estimatedCondition || 'Не вказано'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-stone-500">Бажана ціна клієнта</div>
                  <div className="font-bold text-amber-700 text-lg">
                    {formatCurrency(request.ownerAskingPrice, request.currency)}
                  </div>
                </div>
                {request.ownerEstimatedPrice !== undefined && (
                  <div>
                    <div className="text-xs text-stone-500">Припущення власника</div>
                    <div className="font-bold text-stone-800 text-lg">
                      {formatCurrency(request.ownerEstimatedPrice, request.currency)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-600" />
                <h2 className="font-bold">Переписка</h2>
              </div>
              <div className="text-xs text-stone-500">
                {request.messages.length} повідомлень
              </div>
            </div>

            <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto bg-stone-50/50">
              {request.messages.length === 0 ? (
                <div className="text-center py-12 text-stone-500">
                  <MessageSquare className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                  <div className="font-semibold">Ще немає повідомлень</div>
                  <div className="text-sm mt-1">Напишіть перше повідомлення клієнту</div>
                </div>
              ) : (
                request.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex gap-3 ${m.author === 'owner' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        m.author === 'owner'
                          ? 'bg-gradient-to-br from-amber-400 to-yellow-700 text-stone-950'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {m.author === 'owner' ? (m.byName || 'Ю').charAt(0) : request.clientName.charAt(0)}
                    </div>
                    <div className={`max-w-[75%] ${m.author === 'owner' ? 'items-end' : ''}`}>
                      {m.offerAmount && (
                        <div
                          className={`mb-1 inline-block px-4 py-2 rounded-2xl font-bold ${
                            m.author === 'owner'
                              ? 'bg-amber-500 text-stone-950'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}
                        >
                          💰 {formatCurrency(m.offerAmount, request.currency)}
                        </div>
                      )}
                      {m.text && (
                        <div
                          className={`px-4 py-2.5 rounded-2xl ${
                            m.author === 'owner'
                              ? 'bg-stone-900 text-amber-50 rounded-tr-md'
                              : 'bg-white border border-stone-200 text-stone-800 rounded-tl-md'
                          }`}
                        >
                          {m.text}
                        </div>
                      )}
                      <div
                        className={`mt-1 text-[10px] text-stone-400 ${
                          m.author === 'owner' ? 'text-right' : ''
                        }`}
                      >
                        {formatDate(m.timestamp)} ·{' '}
                        {m.author === 'client'
                          ? 'Клієнт'
                          : !m.byName || m.byName === user.name
                            ? 'Ви'
                            : `${m.byName}${m.byRole ? ` (${ROLE_LABEL[m.byRole] || m.byRole})` : ''}`}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEnd}></div>
            </div>

            {/* Reply box */}
            <div className="p-4 border-t border-stone-200 bg-white">
              {showOffer && (
                <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-semibold text-stone-700">Сума пропозиції:</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-amber-200 bg-white focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-sm font-bold text-stone-700">грн</span>
                </div>
              )}
              <div className="flex gap-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendReply(false)
                    }
                  }}
                  rows={2}
                  placeholder="Напишіть відповідь клієнту..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100 resize-none"
                />
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => sendReply(false)}
                    disabled={!replyText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-bold hover:shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    hidden={!canOffer}
                    onClick={() => setShowOffer(!showOffer)}
                    className={`px-4 py-2.5 rounded-xl border transition-all ${
                      showOffer
                        ? 'bg-amber-100 border-amber-300 text-amber-700'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                    title="Запропонувати ціну"
                  >
                    <Banknote className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
                <span>Enter — відправити, Shift+Enter — новий рядок</span>
                {showOffer && (
                  <button
                    onClick={() => sendReply(true)}
                    disabled={!replyText.trim() && !offerAmount}
                    className="px-3 py-1 rounded-lg bg-amber-500 text-stone-950 font-bold disabled:opacity-30"
                  >
                    Надіслати пропозицію
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status actions */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <h3 className="font-bold text-stone-900 mb-3 text-sm uppercase tracking-wider">
              Змінити статус
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(statusLabels).map(([key, label]) => {
                const k = key as RequestStatus
                const isActive = request.status === k
                return (
                  <button
                    key={k}
                    onClick={() => setStatus(k)}
                    className={`px-3 py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                      isActive
                        ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-md'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-amber-300 hover:bg-amber-50'
                    }`}
                  >
                    {isActive && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                    {label}
                  </button>
                )
              })}
            </div>
            <h3 className="font-bold text-stone-900 mt-5 mb-3 text-sm uppercase tracking-wider">
              Пріоритет
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(['urgent', 'high', 'normal', 'low'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    request.priority === p
                      ? `${priorityColors[p]} ring-2 ring-stone-900`
                      : `${priorityColors[p]} opacity-50 hover:opacity-100`
                  }`}
                >
                  {p === 'urgent' && '🔥 '}
                  {priorityLabels[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Відповідальний */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <h3 className="font-bold text-stone-900 mb-3 text-sm uppercase tracking-wider">Відповідальний</h3>
            <select
              value={request.assignedTo || ''}
              onChange={(e) => onUpdate((r) => ({ ...r, assignedTo: e.target.value || null }))}
              className="w-full px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-amber-400"
            >
              <option value="">— не призначено —</option>
              {team.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {ROLE_LABEL[t.role]}
                  {t.id === user.id ? ' (ви)' : ''}
                </option>
              ))}
            </select>
            {request.assignedTo !== user.id && (
              <button
                onClick={() => onUpdate((r) => ({ ...r, assignedTo: user.id }))}
                className="mt-2 text-xs font-semibold text-amber-700 hover:underline"
              >
                Взяти собі
              </button>
            )}
            <div className="mt-3 pt-3 border-t border-stone-100 text-xs text-stone-500 space-y-0.5">
              {request.createdBy && <div>Створив: {request.createdBy}</div>}
              {request.updatedBy && <div>Останні зміни: {request.updatedBy}</div>}
              {request.assignedTo && !nameOf(request.assignedTo) && <div className="text-rose-600">Відповідального видалено з команди</div>}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <h3 className="font-bold text-stone-900 mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Теги
            </h3>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {request.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-rose-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                placeholder="Новий тег..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={addTag}
                className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-sm font-semibold"
              >
                +
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <h3 className="font-bold text-stone-900 mb-3 text-sm uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Нотатки
              </span>
              {!editingNotes ? (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-amber-700 hover:text-amber-800 text-xs"
                >
                  Редагувати
                </button>
              ) : (
                <button
                  onClick={saveNotes}
                  className="text-emerald-700 hover:text-emerald-800 text-xs flex items-center gap-1"
                >
                  <Save className="w-3 h-3" /> Зберегти
                </button>
              )}
            </h3>
            {editingNotes ? (
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-amber-400 resize-none"
                placeholder="Ваші внутрішні нотатки..."
              />
            ) : (
              <p className="text-sm text-stone-600 whitespace-pre-wrap min-h-[60px]">
                {request.notes || (
                  <span className="italic text-stone-400">
                    Поки що немає нотаток...
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Meeting */}
          {(request.meetingDate || request.status === 'meeting') && (
            <div className="bg-gradient-to-br from-violet-50 to-amber-50 rounded-2xl border border-violet-200 p-5">
              <h3 className="font-bold text-stone-900 mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Зустріч
              </h3>
              {request.meetingDate && (
                <div className="text-sm text-stone-700">
                  <div className="font-semibold">
                    {new Date(request.meetingDate).toLocaleString('uk-UA', {
                      day: '2-digit',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  {request.meetingLocation && (
                    <div className="text-stone-600 mt-1">{request.meetingLocation}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <h3 className="font-bold text-stone-900 mb-3 text-sm uppercase tracking-wider">
              Інформація
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">ID заявки</span>
                <code className="text-xs bg-stone-100 px-2 py-0.5 rounded text-stone-700">
                  {request.id.slice(-8)}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Створено</span>
                <span className="text-stone-700">{formatDate(request.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Оновлено</span>
                <span className="text-stone-700">{formatRelative(request.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Delete — лише з правом «requests.delete» */}
          {onDelete && (
            <button
              onClick={() => {
                if (confirm('Видалити заявку? Цю дію не можна скасувати.')) onDelete()
              }}
              className="w-full py-3 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100 flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Видалити заявку
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
