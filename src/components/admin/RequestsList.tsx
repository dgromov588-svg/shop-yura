import { useState, useMemo } from 'react'
import {
  Plus,
  Filter,
  Download,
  Search,
  X,
} from 'lucide-react'
import {
  ClientRequest,
  RequestStatus,
  RequestCategory,
  statusLabels,
  priorityLabels,
  priorityColors,
  formatCurrency,
  formatRelative,
  categoryLabels,
} from '../../lib/storage'
import { can, type User, type TeamMember } from '../../lib/auth'

interface Props {
  requests: ClientRequest[]
  user: User
  team: TeamMember[]
  onSelect: (id: string) => void
  onCreate: (r: ClientRequest) => Promise<ClientRequest>
}

export function RequestsList({ requests, user, team, onSelect, onCreate }: Props) {
  const [onlyMine, setOnlyMine] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<RequestStatus | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState<RequestCategory | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'normal' | 'high' | 'urgent'>(
    'all',
  )
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority' | 'price'>('newest')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = useMemo(() => {
    let result = requests

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (r) =>
          r.clientName.toLowerCase().includes(q) ||
          r.itemTitle.toLowerCase().includes(q) ||
          r.phone.includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    if (filterStatus !== 'all') result = result.filter((r) => r.status === filterStatus)
    if (filterCategory !== 'all') result = result.filter((r) => r.category === filterCategory)
    if (filterPriority !== 'all') result = result.filter((r) => r.priority === filterPriority)
    if (onlyMine) result = result.filter((r) => r.assignedTo === user.id)

    result = [...result]
    result.sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt - a.createdAt
      if (sortBy === 'oldest') return a.createdAt - b.createdAt
      if (sortBy === 'priority') {
        const order = { urgent: 0, high: 1, normal: 2, low: 3 }
        return order[a.priority] - order[b.priority]
      }
      if (sortBy === 'price') {
        return (b.ownerAskingPrice || 0) - (a.ownerAskingPrice || 0)
      }
      return 0
    })
    return result
  }, [requests, search, filterStatus, filterCategory, filterPriority, sortBy, onlyMine, user.id])

  const clearFilters = () => {
    setSearch('')
    setFilterStatus('all')
    setFilterCategory('all')
    setFilterPriority('all')
  }

  const activeFilters =
    (search ? 1 : 0) +
    (filterStatus !== 'all' ? 1 : 0) +
    (filterCategory !== 'all' ? 1 : 0) +
    (filterPriority !== 'all' ? 1 : 0)

  const exportCSV = () => {
    const headers = [
      'Дата',
      'Клієнт',
      'Телефон',
      'Зв\'язок',
      'Категорія',
      'Предмет',
      'Хоче отримати',
      'Статус',
      'Пріоритет',
    ]
    const rows = filtered.map((r) => [
      new Date(r.createdAt).toLocaleDateString('uk-UA'),
      r.clientName,
      r.phone,
      r.preferredContact,
      r.categoryLabel,
      r.itemTitle,
      formatCurrency(r.ownerAskingPrice, r.currency),
      statusLabels[r.status],
      priorityLabels[r.priority],
    ])
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `requests_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleAdd = async (data: Partial<ClientRequest>) => {
    const id = `req_${Date.now()}`
    const newReq: ClientRequest = {
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'new',
      clientName: data.clientName || '',
      phone: data.phone || '',
      preferredContact: data.preferredContact || 'phone',
      category: data.category || 'other',
      categoryLabel: data.categoryLabel || categoryLabels.other,
      itemTitle: data.itemTitle || '',
      itemDescription: data.itemDescription || '',
      ownerAskingPrice: data.ownerAskingPrice,
      currency: data.currency || 'UAH',
      messages: [],
      tags: [],
      notes: '',
      priority: data.priority || 'normal',
      needsVisit: false,
    }
    try {
      const saved = await onCreate(newReq)
      setShowAdd(false)
      onSelect(saved.id)
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900">Заявки</h1>
          <p className="mt-1 text-stone-500 text-sm">
            {filtered.length} з {requests.length} заявок
          </p>
        </div>
        <div className="flex gap-2">
          <button
            hidden={!can(user, 'data.export')}
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 text-sm font-semibold"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            hidden={!can(user, 'requests.create')}
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-bold text-sm hover:shadow-lg hover:shadow-amber-500/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            Додати заявку
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Пошук за ім'ям, телефоном, предметом..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-amber-400"
          >
            <option value="all">Всі статуси</option>
            {Object.entries(statusLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as any)}
            className="px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-amber-400"
          >
            <option value="all">Всі категорії</option>
            {Object.entries(categoryLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as any)}
            className="px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-amber-400"
          >
            <option value="all">Будь-який пріоритет</option>
            {Object.entries(priorityLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-amber-400"
          >
            <option value="newest">Новіші спочатку</option>
            <option value="oldest">Старіші спочатку</option>
            <option value="priority">За пріоритетом</option>
            <option value="price">За ціною</option>
          </select>

          <button
            onClick={() => setOnlyMine(!onlyMine)}
            className={`px-3 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
              onlyMine ? 'bg-sky-600 text-white border-sky-600' : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            👤 Мої
          </button>

          {activeFilters > 0 && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-sm font-semibold hover:bg-rose-100"
            >
              <X className="w-4 h-4" />
              Скинути ({activeFilters})
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <Filter className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <div className="text-stone-600 font-semibold">Заявок не знайдено</div>
          <div className="text-sm text-stone-500 mt-1">Спробуйте змінити фільтри</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Клієнт</th>
                  <th className="text-left px-4 py-3">Предмет</th>
                  <th className="text-left px-4 py-3">Категорія</th>
                  <th className="text-left px-4 py-3">Ціна</th>
                  <th className="text-left px-4 py-3">Статус</th>
                  <th className="text-left px-4 py-3">Пріоритет</th>
                  <th className="text-left px-4 py-3">Оновлено</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onSelect(r.id)}
                    className="hover:bg-amber-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-yellow-700 text-stone-950 flex items-center justify-center font-bold text-sm shrink-0">
                          {r.clientName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-stone-900 text-sm">
                            {r.clientName}
                          </div>
                          <div className="text-xs text-stone-500">{r.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-semibold text-stone-800 text-sm truncate">
                        {r.itemTitle}
                      </div>
                      <div className="text-xs text-stone-500 truncate">
                        {r.itemDescription}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-md bg-stone-100 text-stone-700 font-medium">
                        {r.categoryLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-stone-900 text-sm">
                        {formatCurrency(r.ownerAskingPrice, r.currency)}
                      </div>
                      {r.myOfferPrice && (
                        <div className="text-xs text-amber-700 font-semibold">
                          Пропозиція: {formatCurrency(r.myOfferPrice, r.currency)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2.5 py-1 rounded-full border bg-white font-semibold">
                        {statusLabels[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                          priorityColors[r.priority]
                        }`}
                      >
                        {priorityLabels[r.priority]}
                      </span>
                      {r.assignedTo && (
                        <div className={`mt-1 text-[11px] ${r.assignedTo === user.id ? 'text-sky-700 font-semibold' : 'text-stone-500'}`}>
                          👤 {r.assignedTo === user.id ? 'ви' : team.find((t) => t.id === r.assignedTo)?.name || '—'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-stone-600">
                        {formatRelative(r.updatedAt)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && (
        <AddRequestModal
          onClose={() => setShowAdd(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  )
}

interface AddRequestModalProps {
  onClose: () => void
  onAdd: (data: Partial<ClientRequest>) => void
}

function AddRequestModal({ onClose, onAdd }: AddRequestModalProps) {
  const [form, setForm] = useState({
    clientName: '',
    phone: '',
    itemTitle: '',
    category: 'books' as RequestCategory,
    ownerAskingPrice: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd({
      ...form,
      categoryLabel: categoryLabels[form.category],
      ownerAskingPrice: form.ownerAskingPrice ? Number(form.ownerAskingPrice) : undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-stone-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-black">Нова заявка</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <input
            required
            placeholder="Ім'я клієнта"
            value={form.clientName}
            onChange={(e) => setForm({ ...form, clientName: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400"
          />
          <input
            required
            type="tel"
            placeholder="Телефон"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as RequestCategory })}
            className="w-full px-4 py-3 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400"
          >
            {Object.entries(categoryLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Назва предмета"
            value={form.itemTitle}
            onChange={(e) => setForm({ ...form, itemTitle: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400"
          />
          <input
            type="number"
            placeholder="Бажана ціна (грн)"
            value={form.ownerAskingPrice}
            onChange={(e) => setForm({ ...form, ownerAskingPrice: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400"
          />
          <select
            value={form.priority}
            onChange={(e) =>
              setForm({ ...form, priority: e.target.value as 'low' | 'normal' | 'high' | 'urgent' })
            }
            className="w-full px-4 py-3 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400"
          >
            <option value="low">Низький</option>
            <option value="normal">Звичайний</option>
            <option value="high">Високий</option>
            <option value="urgent">Терміново</option>
          </select>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200"
            >
              Скасувати
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-bold hover:shadow-lg"
            >
              Створити
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
