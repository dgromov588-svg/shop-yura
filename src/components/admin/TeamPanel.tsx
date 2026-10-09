import { useCallback, useEffect, useState } from 'react'
import {
  UserPlus,
  Crown,
  ShieldCheck,
  Save,
  Trash2,
  Loader2,
  KeyRound,
  Power,
  X,
  ScrollText,
  RefreshCw,
  UserCircle,
  Check,
} from 'lucide-react'
import type { Backend } from '../../lib/backend'
import {
  GRANTABLE,
  ASSISTANT_DEFAULT,
  ROLE_LABEL,
  AUDIT_LABEL,
  type User,
  type Permission,
  type AuditEntry,
} from '../../lib/auth'
import { formatDate, formatRelative } from '../../lib/storage'

const inp =
  'w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100'

function Alert({ type, text }: { type: 'ok' | 'err'; text: string }) {
  return (
    <div
      className={`p-3 rounded-xl text-sm ${
        type === 'ok' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
      }`}
    >
      {text}
    </div>
  )
}

function PermToggles({ value, onChange }: { value: Permission[]; onChange: (p: Permission[]) => void }) {
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {GRANTABLE.map((p) => {
        const on = value.includes(p.id)
        return (
          <label
            key={p.id}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
              on ? 'bg-amber-50 border-amber-300' : 'bg-white border-stone-200 hover:border-stone-300'
            }`}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={(e) => onChange(e.target.checked ? [...value, p.id] : value.filter((x) => x !== p.id))}
              className="mt-0.5 w-5 h-5 accent-amber-600 shrink-0"
            />
            <span>
              <span className="block text-sm font-semibold text-stone-900">{p.label}</span>
              <span className="block text-xs text-stone-500">{p.desc}</span>
            </span>
          </label>
        )
      })}
    </div>
  )
}

// ==================================================================
//  КОМАНДА (лише власник)
// ==================================================================
export function TeamPanel({ backend, onError }: { backend: Backend; onError: (e: unknown) => void }) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<User | 'new' | null>(null)

  const load = useCallback(async () => {
    try {
      setUsers(await backend.listUsers())
    } catch (e) {
      onError(e)
    } finally {
      setLoading(false)
    }
  }, [backend, onError])

  useEffect(() => {
    load()
  }, [load])

  const owner = users.find((u) => u.role === 'owner')
  const assistants = users.filter((u) => u.role === 'assistant')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900">Команда</h1>
          <p className="mt-1 text-sm text-stone-500">Помічники власника та їхні права. Права перевіряє сервер.</p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brass text-stone-950 font-bold"
        >
          <UserPlus className="w-4 h-4" />
          Додати помічника
        </button>
      </div>

      {loading ? (
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      ) : (
        <div className="space-y-3">
          {owner && (
            <div className="bg-wood rounded-2xl p-5 text-amber-50 flex items-center gap-4 frame-carved">
              <div className="w-12 h-12 rounded-full bg-brass text-stone-950 flex items-center justify-center shrink-0">
                <Crown className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold">{owner.name}</div>
                <div className="text-xs text-amber-200/70">
                  Власник · @{owner.login} · усі права
                  {owner.lastLoginAt ? ` · вхід ${formatRelative(owner.lastLoginAt)}` : ''}
                </div>
              </div>
            </div>
          )}

          {assistants.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-8 text-center text-stone-500">
              Помічників ще немає. Натисніть «Додати помічника» — він отримає власний логін і пароль.
            </div>
          )}

          {assistants.map((u) => (
            <button
              key={u.id}
              onClick={() => setEditing(u)}
              className="w-full text-left bg-white rounded-2xl border border-stone-200 p-5 hover:border-amber-400 hover:shadow-md transition-all flex items-center gap-4"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-black shrink-0 ${
                  u.active ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-400'
                }`}
              >
                {u.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-stone-900">{u.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-semibold">Помічник</span>
                  {!u.active && <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold">вимкнено</span>}
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  @{u.login} · {u.lastLoginAt ? `вхід ${formatRelative(u.lastLoginAt)}` : 'ще не входив'}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {u.permissions.length === 0 && <span className="text-xs text-stone-400">лише перегляд і обробка заявок</span>}
                  {GRANTABLE.filter((p) => u.permissions.includes(p.id)).map((p) => (
                    <span key={p.id} className="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900">
                      {p.label}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}

          <div className="mt-6 rounded-2xl bg-stone-100 border border-stone-200 p-4 text-sm text-stone-600">
            <div className="font-bold text-stone-800 mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700" /> Що може будь-який помічник
            </div>
            Переглядати заявки, вести переписку з клієнтом, змінювати статус і пріоритет, теги й нотатки, призначати
            відповідального. Решта — лише якщо ви увімкнете відповідне право. Команда, паролі інших людей і цей розділ —
            тільки для власника.
          </div>
        </div>
      )}

      {editing && (
        <UserEditor
          backend={backend}
          user={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function UserEditor({
  backend,
  user,
  onClose,
  onSaved,
}: {
  backend: Backend
  user: User | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(user?.name || '')
  const [login, setLogin] = useState(user?.login || '')
  const [password, setPassword] = useState('')
  const [perms, setPerms] = useState<Permission[]>(user ? user.permissions : ASSISTANT_DEFAULT)
  const [active, setActive] = useState(user ? user.active : true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const genPassword = () => {
    const abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const rnd = new Uint32Array(12)
    crypto.getRandomValues(rnd)
    setPassword(Array.from(rnd, (n) => abc[n % abc.length]).join(''))
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      await backend.saveUser({ id: user?.id, login: login.trim().toLowerCase(), name, password: password || undefined, permissions: perms, active })
      onSaved()
    } catch (err) {
      setMsg({ type: 'err', text: (err as Error).message })
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!user || !confirm(`Видалити помічника «${user.name}»? Він більше не зможе увійти.`)) return
    setBusy(true)
    try {
      await backend.deleteUser(user.id)
      onSaved()
    } catch (err) {
      setMsg({ type: 'err', text: (err as Error).message })
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <form onSubmit={save} className="bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-black">{user ? `Помічник: ${user.name}` : 'Новий помічник'}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-stone-100" aria-label="Закрити">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-semibold text-stone-700">Імʼя</span>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Напр. Олександр" className={`mt-1 ${inp}`} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-stone-700">Логін для входу</span>
              <input
                required
                disabled={!!user}
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="латиницею, напр. sasha"
                autoCapitalize="none"
                className={`mt-1 ${inp} disabled:opacity-60`}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-stone-700 flex items-center gap-1">
              <KeyRound className="w-4 h-4" /> {user ? 'Новий пароль (порожньо — не змінювати)' : 'Пароль (мінімум 8 символів)'}
            </span>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!user}
                minLength={8}
                autoCapitalize="none"
                autoComplete="new-password"
                className={`${inp} font-mono`}
              />
              <button type="button" onClick={genPassword} className="shrink-0 px-3 rounded-lg bg-stone-100 hover:bg-stone-200 text-sm font-semibold">
                Згенерувати
              </button>
            </div>
            {password && <span className="text-xs text-stone-500">Передайте пароль помічнику особисто. Після збереження його не буде видно.</span>}
          </label>

          <div>
            <div className="text-sm font-semibold text-stone-700 mb-2">Права</div>
            <PermToggles value={perms} onChange={setPerms} />
          </div>

          {user && (
            <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer">
              <span className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                <Power className="w-4 h-4" /> Доступ увімкнено
              </span>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-5 h-5 accent-amber-600" />
            </label>
          )}

          {msg && <Alert {...msg} />}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-stone-200 px-6 py-4 flex gap-3">
          {user && (
            <button type="button" onClick={remove} disabled={busy} className="px-4 py-3 rounded-xl bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-700 font-semibold">
            Скасувати
          </button>
          <button type="submit" disabled={busy} className="flex-1 py-3 rounded-xl bg-brass text-stone-950 font-bold inline-flex items-center justify-center gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Зберегти
          </button>
        </div>
      </form>
    </div>
  )
}

// ==================================================================
//  ЖУРНАЛ ДІЙ
// ==================================================================
export function AuditPanel({ backend, onError }: { backend: Backend; onError: (e: unknown) => void }) {
  const [log, setLog] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [who, setWho] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setLog(await backend.audit())
    } catch (e) {
      onError(e)
    } finally {
      setLoading(false)
    }
  }, [backend, onError])

  useEffect(() => {
    load()
  }, [load])

  const names = Array.from(new Set(log.map((l) => l.name)))
  const shown = who === 'all' ? log : log.filter((l) => l.name === who)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900">Журнал дій</h1>
          <p className="mt-1 text-sm text-stone-500">Хто, коли і що робив. Останні 500 подій.</p>
        </div>
        <div className="flex gap-2">
          <select value={who} onChange={(e) => setWho(e.target.value)} className="px-3 py-2 rounded-lg bg-white border border-stone-200 text-sm">
            <option value="all">Усі</option>
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button onClick={load} className="p-2.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50" aria-label="Оновити">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100">
        {!loading && shown.length === 0 && (
          <div className="p-10 text-center text-stone-500">
            <ScrollText className="w-10 h-10 mx-auto text-stone-300 mb-2" />
            Подій ще немає
          </div>
        )}
        {shown.map((l, i) => (
          <div key={i} className="p-4 flex gap-3">
            <div
              className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                l.action === 'login.fail' || l.action.endsWith('delete') ? 'bg-rose-500' : l.role === 'owner' ? 'bg-amber-500' : l.role === 'public' ? 'bg-emerald-500' : 'bg-sky-500'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm">
                <span className="font-semibold text-stone-900">{l.name}</span>{' '}
                <span className="text-xs text-stone-500">({ROLE_LABEL[l.role] || l.role})</span>{' '}
                <span className="text-stone-700">— {AUDIT_LABEL[l.action] || l.action}</span>
                {l.target && <span className="text-stone-900 font-medium"> «{l.target}»</span>}
              </div>
              {l.details && <div className="text-xs text-stone-500 mt-0.5">{l.details}</div>}
              <div className="text-[11px] text-stone-400 mt-0.5">
                {formatDate(l.t)}
                {l.ip && l.ip !== 'cli' ? ` · ${l.ip}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ==================================================================
//  ПРОФІЛЬ (будь-який користувач)
// ==================================================================
export function ProfilePanel({ backend, user, onUserChange }: { backend: Backend; user: User; onUserChange: (u: User) => void }) {
  const [name, setName] = useState(user.name)
  const [oldPassword, setOld] = useState('')
  const [newPassword, setNew] = useState('')
  const [newPassword2, setNew2] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const saveName = async () => {
    setBusy(true)
    setMsg(null)
    try {
      onUserChange(await backend.saveProfile({ name }))
      setMsg({ type: 'ok', text: 'Імʼя збережено' })
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (newPassword !== newPassword2) {
      setMsg({ type: 'err', text: 'Нові паролі не збігаються' })
      return
    }
    setBusy(true)
    try {
      onUserChange(await backend.saveProfile({ oldPassword, newPassword }))
      setOld('')
      setNew('')
      setNew2('')
      setMsg({ type: 'ok', text: 'Пароль змінено' })
    } catch (err) {
      setMsg({ type: 'err', text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      <h1 className="text-2xl sm:text-3xl font-black text-stone-900 mb-6 flex items-center gap-2">
        <UserCircle className="w-7 h-7 text-amber-600" /> Профіль
      </h1>

      <div className="space-y-5">
        <section className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                user.role === 'owner' ? 'bg-amber-100 text-amber-900' : 'bg-sky-100 text-sky-800'
              }`}
            >
              {ROLE_LABEL[user.role]}
            </span>
            <span className="text-sm text-stone-500">@{user.login}</span>
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-stone-700">Імʼя (бачать колеги в заявках)</span>
            <div className="mt-1 flex gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inp} />
              <button
                onClick={saveName}
                disabled={busy || !name.trim() || name === user.name}
                className="shrink-0 px-4 rounded-lg bg-stone-900 text-amber-100 font-semibold disabled:opacity-40"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </label>
          <div className="mt-4">
            <div className="text-sm font-semibold text-stone-700 mb-2">Ваші права</div>
            {user.role === 'owner' ? (
              <div className="text-sm text-stone-600">Усі права, включно з керуванням командою.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs px-2 py-1 rounded-md bg-stone-100 text-stone-700">Обробка заявок і переписка</span>
                {GRANTABLE.filter((p) => user.permissions.includes(p.id)).map((p) => (
                  <span key={p.id} className="text-xs px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-900">
                    {p.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <form onSubmit={savePassword} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3">
          <h2 className="font-bold text-stone-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-600" /> Змінити пароль
          </h2>
          <input required type="password" value={oldPassword} onChange={(e) => setOld(e.target.value)} placeholder="Поточний пароль" autoComplete="current-password" className={inp} />
          <input required type="password" minLength={8} value={newPassword} onChange={(e) => setNew(e.target.value)} placeholder="Новий пароль (мін. 8 символів)" autoComplete="new-password" className={inp} />
          <input required type="password" value={newPassword2} onChange={(e) => setNew2(e.target.value)} placeholder="Повторіть новий пароль" autoComplete="new-password" className={inp} />
          <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-brass text-stone-950 font-bold">
            Змінити пароль
          </button>
        </form>

        {msg && <Alert {...msg} />}
      </div>
    </div>
  )
}
