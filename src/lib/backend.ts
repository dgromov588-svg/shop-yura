/**
 * Слой данных адмін-панелі.
 *
 *  • server — на хостингу з PHP (public/api.php): спільна база для власника й помічників,
 *             права перевіряє сервер.
 *  • local  — якщо api.php недоступний (локальний перегляд): дані лише в цьому браузері.
 *
 * Обидва режими мають однаковий інтерфейс і однакові правила.
 */
import {
  ClientRequest,
  Settings,
  loadRequests,
  saveRequests,
  loadSettings,
  saveSettings,
  ContactMethod,
  RequestCategory,
} from './storage'
import {
  User,
  Permission,
  TeamMember,
  AuditEntry,
  GRANTABLE_IDS,
  ALL_PERMISSIONS,
  can,
  validLogin,
} from './auth'

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 500) {
    super(message)
    this.status = status
  }
}

export interface StatusInfo {
  needsSetup: boolean
  setupCodeRequired: boolean
  setupCodePath?: string
  user: User | null
}

export interface UserInput {
  id?: string
  login?: string
  name: string
  password?: string
  permissions: Permission[]
  active: boolean
}

export interface PublicSubmission {
  name: string
  phone: string
  contact: ContactMethod
  category: RequestCategory
  categoryLabel: string
  itemTitle: string
  message: string
  price?: number
  website?: string // приховане поле-пастка для ботів
}

export interface Backend {
  mode: 'server' | 'local'
  status(): Promise<StatusInfo>
  setup(d: { login: string; name: string; password: string; code?: string }): Promise<User>
  login(login: string, password: string): Promise<User>
  logout(): Promise<void>
  listRequests(): Promise<ClientRequest[]>
  saveRequest(r: ClientRequest): Promise<ClientRequest>
  deleteRequest(id: string): Promise<void>
  importRequests(list: ClientRequest[]): Promise<void>
  submitPublic(d: PublicSubmission): Promise<void>
  team(): Promise<TeamMember[]>
  listUsers(): Promise<User[]>
  saveUser(u: UserInput): Promise<User>
  deleteUser(id: string): Promise<void>
  saveProfile(d: { name?: string; oldPassword?: string; newPassword?: string }): Promise<User>
  audit(): Promise<AuditEntry[]>
  getSettings(): Promise<Partial<Settings>>
  saveSettings(s: Settings): Promise<void>
}

// ==================================================================
//  SERVER
// ==================================================================
const API = './api.php'

async function call<T = Record<string, unknown>>(action: string, body?: unknown): Promise<T> {
  let r: Response
  try {
    r = await fetch(
      `${API}?action=${encodeURIComponent(action)}`,
      body === undefined
        ? { credentials: 'same-origin', cache: 'no-store' }
        : {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json', 'X-Antikvar': '1' },
            body: JSON.stringify(body),
          },
    )
  } catch {
    throw new ApiError('Немає звʼязку з сервером. Перевірте інтернет.', 0)
  }
  let data: { ok?: boolean; error?: string } & Record<string, unknown>
  try {
    data = await r.json()
  } catch {
    throw new ApiError(`Сервер повернув некоректну відповідь (HTTP ${r.status})`, r.status)
  }
  if (!r.ok || !data.ok) throw new ApiError(data.error || `Помилка ${r.status}`, r.status)
  return data as T
}

const serverBackend: Backend = {
  mode: 'server',
  async status() {
    const d = await call<StatusInfo>('status')
    return { needsSetup: d.needsSetup, setupCodeRequired: !!d.setupCodeRequired, setupCodePath: d.setupCodePath, user: d.user }
  },
  async setup(d) {
    return (await call<{ user: User }>('setup', d)).user
  },
  async login(login, password) {
    return (await call<{ user: User }>('login', { login, password })).user
  },
  async logout() {
    await call('logout', {})
  },
  async listRequests() {
    return (await call<{ requests: ClientRequest[] }>('requests')).requests
  },
  async saveRequest(r) {
    return (await call<{ request: ClientRequest }>('request.save', { request: r })).request
  },
  async deleteRequest(id) {
    await call('request.delete', { id })
  },
  async importRequests(list) {
    await call('requests.import', { requests: list })
  },
  async submitPublic(d) {
    await call('submit', d)
  },
  async team() {
    return (await call<{ team: TeamMember[] }>('team')).team
  },
  async listUsers() {
    return (await call<{ users: User[] }>('users')).users
  },
  async saveUser(u) {
    return (await call<{ user: User }>('user.save', u)).user
  },
  async deleteUser(id) {
    await call('user.delete', { id })
  },
  async saveProfile(d) {
    return (await call<{ user: User }>('profile.save', d)).user
  },
  async audit() {
    return (await call<{ audit: AuditEntry[] }>('audit')).audit
  },
  async getSettings() {
    return (await call<{ settings: Partial<Settings> }>('settings')).settings
  },
  async saveSettings(s) {
    await call('settings.save', { settings: s })
  },
}

// ==================================================================
//  LOCAL (той самий набір правил, дані в цьому браузері)
// ==================================================================
const LS_USERS = 'akv_users_v1'
const LS_SESSION = 'akv_session_v1'
const LS_AUDIT = 'akv_audit_v1'
const SESSION_TTL = 12 * 60 * 60 * 1000

interface StoredUser {
  id: string
  login: string
  name: string
  role: 'owner' | 'assistant'
  perms: Permission[]
  active: boolean
  createdAt: number
  lastLoginAt?: number | null
  hash: string
  salt: string
}

function read<T>(key: string, def: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : def
  } catch {
    return def
  }
}
const write = (key: string, v: unknown) => localStorage.setItem(key, JSON.stringify(v))
const rid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

async function hashPw(pw: string, salt: string): Promise<string> {
  const enc = new TextEncoder()
  const subtle = globalThis.crypto?.subtle
  if (subtle) {
    const key = await subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits'])
    const bits = await subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256)
    return 'p2$' + Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('')
  }
  // Запасний варіант для небезпечного (http) зʼєднання
  let h = 0x811c9dc5
  const s = `${salt}:${pw}`
  for (let r = 0; r < 4000; r++) for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0
  return 'fnv$' + h.toString(16)
}

const toPublic = (u: StoredUser): User => ({
  id: u.id,
  login: u.login,
  name: u.name,
  role: u.role,
  permissions: u.role === 'owner' ? [...ALL_PERMISSIONS] : u.perms.filter((p) => GRANTABLE_IDS.includes(p)),
  active: u.active,
  createdAt: u.createdAt,
  lastLoginAt: u.lastLoginAt ?? null,
})

const users = () => read<StoredUser[]>(LS_USERS, [])

function sessionUser(): User | null {
  const s = read<{ uid: string; exp: number } | null>(LS_SESSION, null)
  if (!s || s.exp < Date.now()) return null
  const u = users().find((x) => x.id === s.uid && x.active)
  if (!u) return null
  write(LS_SESSION, { uid: u.id, exp: Date.now() + SESSION_TTL })
  return toPublic(u)
}

function needUser(): User {
  const u = sessionUser()
  if (!u) throw new ApiError('Сесія завершилась — увійдіть знову', 401)
  return u
}
function needPerm(p: Permission): User {
  const u = needUser()
  if (!can(u, p)) throw new ApiError('Недостатньо прав для цієї дії', 403)
  return u
}
function needOwner(): User {
  const u = needUser()
  if (u.role !== 'owner') throw new ApiError('Доступно лише власнику', 403)
  return u
}

function audit(u: Pick<User, 'id' | 'name' | 'role'> | null, action: string, target = '', details = '') {
  const log = read<AuditEntry[]>(LS_AUDIT, [])
  log.push({ t: Date.now(), uid: u?.id ?? null, name: u?.name ?? 'Сайт', role: u?.role ?? 'public', action, target, details })
  write(LS_AUDIT, log.slice(-2000))
}

function checkPw(p: string) {
  if (!p || p.length < 8) throw new ApiError('Пароль — мінімум 8 символів', 422)
}

/** Ті самі правила, що й у PHP (merge_request / view_request) */
export function viewRequest(r: ClientRequest, u: User): ClientRequest {
  if (can(u, 'finance.view')) return r
  const { myOfferPrice: _hidden, ...rest } = r
  void _hidden
  return { ...rest, messages: r.messages.map(({ offerAmount: _o, ...m }) => (void _o, m)) } as ClientRequest
}

function mergeRequest(inc: ClientRequest, old: ClientRequest | null, u: User): ClientRequest {
  const now = Date.now()
  const prev = new Map((old?.messages ?? []).map((m) => [m.id, m]))
  const seen = new Set<string>()
  let newOffer: number | undefined
  const msgs = []
  for (const m of inc.messages ?? []) {
    if (!m?.id || seen.has(m.id)) continue
    seen.add(m.id)
    const p = prev.get(m.id)
    if (p) {
      msgs.push(p)
      continue
    }
    const nm: ClientRequest['messages'][number] = { id: m.id, author: m.author === 'client' ? 'client' : 'owner', text: (m.text || '').slice(0, 5000), timestamp: now }
    if (nm.author === 'owner') {
      nm.byName = u.name
      nm.byRole = u.role
    }
    if (m.offerAmount && m.offerAmount > 0 && can(u, 'offers.make')) {
      nm.offerAmount = m.offerAmount
      newOffer = m.offerAmount
    }
    msgs.push(nm)
  }
  for (const [id, m] of prev) if (!seen.has(id)) msgs.push(m)
  msgs.sort((a, b) => a.timestamp - b.timestamp)

  let offer = old?.myOfferPrice
  if (can(u, 'offers.make') && can(u, 'finance.view')) offer = inc.myOfferPrice
  if (newOffer !== undefined) offer = newOffer

  const r: ClientRequest = {
    ...inc,
    id: old ? old.id : rid('req'),
    createdAt: old ? old.createdAt : now,
    createdBy: old ? old.createdBy : u.name,
    updatedAt: now,
    updatedBy: u.name,
    messages: msgs,
  }
  if (offer === undefined) delete r.myOfferPrice
  else r.myOfferPrice = offer
  return r
}

const localBackend: Backend = {
  mode: 'local',
  async status() {
    const u = sessionUser()
    return { needsSetup: users().length === 0, setupCodeRequired: false, user: u }
  },
  async setup({ login, name, password }) {
    if (users().length) throw new ApiError('Власника вже створено — увійдіть', 409)
    login = login.trim().toLowerCase()
    if (!validLogin(login)) throw new ApiError('Логін: 3–32 символи — латиниця, цифри, . _ -', 422)
    if (!name.trim()) throw new ApiError('Вкажіть імʼя', 422)
    checkPw(password)
    const salt = rid('s')
    const u: StoredUser = { id: rid('usr'), login, name: name.trim(), role: 'owner', perms: [], active: true, createdAt: Date.now(), lastLoginAt: Date.now(), salt, hash: await hashPw(password, salt) }
    write(LS_USERS, [u])
    write(LS_SESSION, { uid: u.id, exp: Date.now() + SESSION_TTL })
    audit(u, 'setup', login)
    return toPublic(u)
  },
  async login(login, password) {
    const list = users()
    const u = list.find((x) => x.login === login.trim().toLowerCase())
    if (!u || (await hashPw(password, u.salt)) !== u.hash) {
      audit(null, 'login.fail', login)
      throw new ApiError('Невірний логін або пароль', 401)
    }
    if (!u.active) throw new ApiError('Обліковий запис вимкнено власником', 403)
    u.lastLoginAt = Date.now()
    write(LS_USERS, list)
    write(LS_SESSION, { uid: u.id, exp: Date.now() + SESSION_TTL })
    audit(u, 'login')
    return toPublic(u)
  },
  async logout() {
    const u = sessionUser()
    if (u) audit(u, 'logout')
    localStorage.removeItem(LS_SESSION)
  },
  async listRequests() {
    const u = needUser()
    return loadRequests().map((r) => viewRequest(r, u))
  },
  async saveRequest(r) {
    const u = needUser()
    const list = loadRequests()
    const idx = list.findIndex((x) => x.id === r.id)
    if (idx < 0 && !can(u, 'requests.create')) throw new ApiError('Немає права створювати заявки', 403)
    const old = idx < 0 ? null : list[idx]
    const merged = mergeRequest(r, old, u)
    if (idx < 0) list.unshift(merged)
    else list[idx] = merged
    saveRequests(list)
    audit(u, old ? 'request.update' : 'request.create', merged.itemTitle, old && old.status !== merged.status ? `статус: ${old.status} → ${merged.status}` : '')
    return viewRequest(merged, u)
  },
  async deleteRequest(id) {
    const u = needPerm('requests.delete')
    const list = loadRequests()
    const r = list.find((x) => x.id === id)
    saveRequests(list.filter((x) => x.id !== id))
    audit(u, 'request.delete', r?.itemTitle || id)
  },
  async importRequests(list) {
    const u = needOwner()
    saveRequests(list.filter((r) => r && typeof r.id === 'string'))
    audit(u, 'import', `${list.length} заявок`)
  },
  async submitPublic(d) {
    if (d.website) return
    const now = Date.now()
    const r: ClientRequest = {
      id: rid('req'),
      createdAt: now,
      updatedAt: now,
      status: 'new',
      clientName: d.name,
      phone: d.phone,
      preferredContact: d.contact,
      category: d.category,
      categoryLabel: d.categoryLabel,
      itemTitle: d.itemTitle || 'Заявка з сайту',
      itemDescription: d.message,
      ownerAskingPrice: d.price,
      currency: 'UAH',
      messages: [{ id: rid('m'), author: 'client', text: d.message || 'Цікавить оцінка', timestamp: now }],
      tags: ['з сайту'],
      notes: '',
      priority: 'normal',
      needsVisit: false,
      createdBy: 'Сайт',
    }
    saveRequests([r, ...loadRequests()])
    audit(null, 'request.submit', `${r.itemTitle} · ${d.name}`)
  },
  async team() {
    needUser()
    return users().filter((u) => u.active).map((u) => ({ id: u.id, name: u.name, role: u.role }))
  },
  async listUsers() {
    needOwner()
    return users().map(toPublic)
  },
  async saveUser(inp) {
    const me = needOwner()
    const list = users()
    const perms = inp.permissions.filter((p) => GRANTABLE_IDS.includes(p))
    if (!inp.name.trim()) throw new ApiError('Вкажіть імʼя', 422)
    if (inp.password) checkPw(inp.password)
    let u: StoredUser
    if (!inp.id) {
      const login = (inp.login || '').trim().toLowerCase()
      if (!validLogin(login)) throw new ApiError('Логін: 3–32 символи — латиниця, цифри, . _ -', 422)
      if (list.some((x) => x.login === login)) throw new ApiError('Такий логін уже зайнято', 422)
      if (!inp.password) throw new ApiError('Задайте пароль для помічника', 422)
      const salt = rid('s')
      u = { id: rid('usr'), login, name: inp.name.trim(), role: 'assistant', perms, active: inp.active, createdAt: Date.now(), lastLoginAt: null, salt, hash: await hashPw(inp.password, salt) }
      list.push(u)
      audit(me, 'user.create', u.name, perms.join(', '))
    } else {
      const found = list.find((x) => x.id === inp.id)
      if (!found) throw new ApiError('Користувача не знайдено', 404)
      if (found.role === 'owner') throw new ApiError('Дані власника змінюються в розділі «Профіль»', 422)
      found.name = inp.name.trim()
      found.perms = perms
      found.active = inp.active
      if (inp.password) found.hash = await hashPw(inp.password, found.salt)
      u = found
      audit(me, 'user.update', u.name, perms.join(', '))
    }
    write(LS_USERS, list)
    return toPublic(u)
  },
  async deleteUser(id) {
    const me = needOwner()
    const list = users()
    const u = list.find((x) => x.id === id)
    if (!u) throw new ApiError('Користувача не знайдено', 404)
    if (u.role === 'owner') throw new ApiError('Власника видалити не можна', 422)
    write(LS_USERS, list.filter((x) => x.id !== id))
    audit(me, 'user.delete', u.name)
  },
  async saveProfile({ name, oldPassword, newPassword }) {
    const me = needUser()
    const list = users()
    const u = list.find((x) => x.id === me.id)!
    if (name !== undefined) {
      if (!name.trim()) throw new ApiError('Імʼя не може бути порожнім', 422)
      u.name = name.trim()
    }
    if (newPassword) {
      checkPw(newPassword)
      if ((await hashPw(oldPassword || '', u.salt)) !== u.hash) throw new ApiError('Поточний пароль невірний', 403)
      u.hash = await hashPw(newPassword, u.salt)
    }
    write(LS_USERS, list)
    audit(me, 'profile.update', '', newPassword ? 'змінено пароль' : 'змінено імʼя')
    return toPublic(u)
  },
  async audit() {
    needPerm('audit.view')
    return read<AuditEntry[]>(LS_AUDIT, []).slice().reverse().slice(0, 500)
  },
  async getSettings() {
    needUser()
    return loadSettings()
  },
  async saveSettings(s) {
    const u = needPerm('settings.edit')
    saveSettings(s)
    audit(u, 'settings.save')
  },
}

// ==================================================================
//  Вибір режиму
// ==================================================================
let detected: Promise<Backend> | null = null

export function getBackend(): Promise<Backend> {
  if (!detected) {
    detected = (async () => {
      try {
        const r = await fetch(`${API}?action=status`, { credentials: 'same-origin', cache: 'no-store' })
        if ((r.headers.get('content-type') || '').includes('json')) {
          const d = await r.json()
          if (d && d.app === 'antikvar') return serverBackend
        }
      } catch {
        /* немає сервера — локальний режим */
      }
      return localBackend
    })()
  }
  return detected
}
