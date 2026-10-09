import { useCallback, useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Inbox,
  MessageSquare,
  Settings as SettingsIcon,
  LogOut,
  Users,
  ScrollText,
  UserCircle,
  RefreshCw,
  Cloud,
  HardDrive,
  X,
} from 'lucide-react'
import type { ClientRequest } from '../../lib/storage'
import { ApiError, type Backend } from '../../lib/backend'
import { can, ROLE_LABEL, type User, type TeamMember } from '../../lib/auth'
import { LogoMark } from '../Logo'
import { DashboardOverview } from './DashboardOverview'
import { RequestsList } from './RequestsList'
import { RequestDetail } from './RequestDetail'
import { SettingsPanel } from './SettingsPanel'
import { MessagesPanel } from './MessagesPanel'
import { TeamPanel, AuditPanel, ProfilePanel } from './TeamPanel'

type Tab = 'overview' | 'requests' | 'messages' | 'team' | 'audit' | 'settings' | 'profile'

interface Props {
  backend: Backend
  user: User
  onUserChange: (u: User) => void
  onLogout: () => void
}

export function AdminDashboard({ backend, user, onUserChange, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [requests, setRequests] = useState<ClientRequest[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncedAt, setSyncedAt] = useState<number | null>(null)

  const handleError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        onLogout()
        return
      }
      setError(e instanceof Error ? e.message : String(e))
    },
    [onLogout],
  )

  const reload = useCallback(async () => {
    try {
      const [list, t] = await Promise.all([backend.listRequests(), backend.team()])
      setRequests(list)
      setTeam(t)
      setSyncedAt(Date.now())
    } catch (e) {
      handleError(e)
    } finally {
      setLoading(false)
    }
  }, [backend, handleError])

  useEffect(() => {
    reload()
  }, [reload])

  // Спільна база: підтягуємо зміни колег кожні 30 с
  useEffect(() => {
    if (backend.mode !== 'server') return
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') reload()
    }, 30000)
    return () => clearInterval(t)
  }, [backend, reload])

  const updateRequest = async (id: string, updater: (r: ClientRequest) => ClientRequest) => {
    const cur = requests.find((r) => r.id === id)
    if (!cur) return
    const next = updater(cur)
    setRequests((list) => list.map((r) => (r.id === id ? next : r)))
    try {
      const saved = await backend.saveRequest(next)
      setRequests((list) => list.map((r) => (r.id === id ? saved : r)))
    } catch (e) {
      handleError(e)
      reload()
    }
  }

  const createRequest = async (r: ClientRequest) => {
    const saved = await backend.saveRequest(r)
    setRequests((list) => [saved, ...list])
    return saved
  }

  const deleteRequest = async (id: string) => {
    try {
      await backend.deleteRequest(id)
      setRequests((list) => list.filter((r) => r.id !== id))
      setSelectedId(null)
    } catch (e) {
      handleError(e)
    }
  }

  const selected = selectedId ? requests.find((r) => r.id === selectedId) || null : null
  const newCount = requests.filter((r) => r.status === 'new').length
  const mineCount = requests.filter((r) => r.assignedTo === user.id && r.status !== 'completed' && r.status !== 'rejected').length

  const nav: { id: Tab; label: string; icon: typeof Inbox; badge?: number; show: boolean }[] = [
    { id: 'overview', label: 'Огляд', icon: LayoutDashboard, show: true },
    { id: 'requests', label: 'Заявки', icon: Inbox, badge: newCount || undefined, show: true },
    { id: 'messages', label: 'Переписка', icon: MessageSquare, show: true },
    { id: 'team', label: 'Команда', icon: Users, show: user.role === 'owner' },
    { id: 'audit', label: 'Журнал', icon: ScrollText, show: can(user, 'audit.view') },
    { id: 'settings', label: 'Налаштування', icon: SettingsIcon, show: can(user, 'settings.edit') },
    { id: 'profile', label: 'Профіль', icon: UserCircle, show: true },
  ]
  const visible = nav.filter((n) => n.show)

  const go = (t: Tab) => {
    setTab(t)
    setSelectedId(null)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Верхня панель */}
      <header className="bg-wood border-b border-amber-700/40 sticky top-0 z-30 text-amber-50">
        <div className="px-4 sm:px-6 flex items-center justify-between gap-3 h-16">
          <div className="flex items-center gap-3 min-w-0">
            <LogoMark className="w-10 h-10 shrink-0 drop-shadow" />
            <div className="min-w-0">
              <div className="font-display font-bold text-brass leading-tight truncate">АнтикварЪ · панель</div>
              <div className="text-xs text-amber-200/70 truncate">
                {user.name} ·{' '}
                <span className={user.role === 'owner' ? 'text-amber-300 font-semibold' : 'text-sky-300 font-semibold'}>
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <span
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border border-amber-700/40 text-amber-200/80"
              title={backend.mode === 'server' ? 'Спільна база на хостингу' : 'Дані лише в цьому браузері'}
            >
              {backend.mode === 'server' ? <Cloud className="w-3.5 h-3.5" /> : <HardDrive className="w-3.5 h-3.5" />}
              {backend.mode === 'server' ? 'Спільна база' : 'Локально'}
            </span>
            <button
              onClick={reload}
              className="p-2 rounded-lg hover:bg-white/10 text-amber-200"
              title={syncedAt ? `Оновлено ${new Date(syncedAt).toLocaleTimeString('uk-UA')}` : 'Оновити'}
              aria-label="Оновити"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <a href="#" className="hidden sm:inline-flex px-3 py-2 text-sm text-amber-200/80 hover:bg-white/10 rounded-lg">
              На сайт
            </a>
            <button onClick={onLogout} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-rose-300 hover:bg-white/10 rounded-lg">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Вихід</span>
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 border-b border-rose-200 text-rose-800 text-sm px-4 py-2.5 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError('')} className="p-1" aria-label="Закрити">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex">
        {/* Бокове меню */}
        <aside className="hidden md:block w-60 bg-white border-r border-stone-200 min-h-[calc(100vh-4rem)] sticky top-16 self-start">
          <nav className="p-3 space-y-1">
            {visible.map((item) => {
              const Icon = item.icon
              const active = tab === item.id && !selected
              return (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </span>
                  {item.badge && <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs font-bold">{item.badge}</span>}
                </button>
              )
            })}
          </nav>
          {mineCount > 0 && (
            <div className="mx-3 mt-2 p-3 rounded-xl bg-sky-50 border border-sky-200 text-sm text-sky-900">
              На вас <b>{mineCount}</b> {mineCount === 1 ? 'активна заявка' : 'активних заявок'}
            </div>
          )}
        </aside>

        {/* Мобільне меню знизу */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-stone-200 z-30 flex overflow-x-auto">
          {visible.map((item) => {
            const Icon = item.icon
            const active = tab === item.id && !selected
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={`relative flex-1 min-w-[72px] flex flex-col items-center justify-center py-2 text-[11px] ${
                  active ? 'text-amber-700' : 'text-stone-500'
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                {item.label}
                {item.badge && (
                  <span className="absolute top-1 left-1/2 ml-2 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <main className="flex-1 min-w-0 pb-20 md:pb-0">
          {selected ? (
            <RequestDetail
              request={selected}
              user={user}
              team={team}
              onBack={() => setSelectedId(null)}
              onUpdate={(updater) => updateRequest(selected.id, updater)}
              onDelete={can(user, 'requests.delete') ? () => deleteRequest(selected.id) : undefined}
            />
          ) : tab === 'overview' ? (
            <DashboardOverview
              requests={requests}
              canFinance={can(user, 'finance.view')}
              onSelectRequest={(id) => {
                setSelectedId(id)
                setTab('requests')
              }}
            />
          ) : tab === 'requests' ? (
            <RequestsList requests={requests} user={user} team={team} onSelect={setSelectedId} onCreate={createRequest} />
          ) : tab === 'messages' ? (
            <MessagesPanel requests={requests} onSelect={setSelectedId} />
          ) : tab === 'team' ? (
            <TeamPanel backend={backend} onError={handleError} />
          ) : tab === 'audit' ? (
            <AuditPanel backend={backend} onError={handleError} />
          ) : tab === 'settings' ? (
            <SettingsPanel backend={backend} user={user} requests={requests} onImported={reload} onError={handleError} />
          ) : (
            <ProfilePanel backend={backend} user={user} onUserChange={onUserChange} />
          )}
        </main>
      </div>
    </div>
  )
}
