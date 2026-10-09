import { useCallback, useEffect, useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { AdminLogin } from './AdminLogin'
import { AdminDashboard } from './AdminDashboard'
import { getBackend, type Backend, type StatusInfo } from '../../lib/backend'
import type { User } from '../../lib/auth'

export function AdminApp() {
  const [backend, setBackend] = useState<Backend | null>(null)
  const [status, setStatus] = useState<StatusInfo | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async (b: Backend) => {
    try {
      const s = await b.status()
      setStatus(s)
      setUser(s.user)
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    getBackend().then((b) => {
      setBackend(b)
      refresh(b)
    })
  }, [refresh])

  const logout = useCallback(async () => {
    if (!backend) return
    try {
      await backend.logout()
    } catch {
      /* сесія могла вже завершитись */
    }
    setUser(null)
    refresh(backend)
  }, [backend, refresh])

  if (error) {
    return (
      <div className="min-h-screen bg-wood flex items-center justify-center p-6 text-center">
        <div className="max-w-sm bg-stone-900/80 border border-rose-500/40 rounded-2xl p-6 text-amber-50">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
          <div className="mt-3 font-bold">Не вдалося зʼєднатися з сервером</div>
          <div className="mt-1 text-sm text-amber-100/70">{error}</div>
          <button
            onClick={() => backend && refresh(backend)}
            className="mt-4 px-5 py-2.5 rounded-full bg-brass text-stone-950 font-bold"
          >
            Спробувати ще раз
          </button>
        </div>
      </div>
    )
  }

  if (!backend || !status) {
    return (
      <div className="min-h-screen bg-wood flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <AdminLogin backend={backend} status={status} onLogin={setUser} />
  }

  return <AdminDashboard backend={backend} user={user} onUserChange={setUser} onLogout={logout} />
}
