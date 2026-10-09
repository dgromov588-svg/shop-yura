/**
 * Ролі та права адмін-панелі.
 * Ті самі права перевіряє сервер (public/api.php) — інтерфейс лише ховає недоступне.
 */

export type Role = 'owner' | 'assistant'

export type Permission =
  | 'requests.create'
  | 'requests.delete'
  | 'offers.make'
  | 'finance.view'
  | 'data.export'
  | 'settings.edit'
  | 'audit.view'
  | 'users.manage'

/** Права, які власник може вмикати помічнику */
export const GRANTABLE: { id: Permission; label: string; desc: string }[] = [
  { id: 'requests.create', label: 'Створювати заявки', desc: 'Додавати заявки вручну — з дзвінка чи візиту' },
  { id: 'offers.make', label: 'Пропонувати ціну', desc: 'Надсилати клієнтам цінові пропозиції' },
  { id: 'finance.view', label: 'Бачити фінанси', desc: 'Суми пропозицій, оборот, середня пропозиція' },
  { id: 'requests.delete', label: 'Видаляти заявки', desc: 'Безповоротне видалення' },
  { id: 'data.export', label: 'Експорт даних', desc: 'Вивантаження заявок у CSV / JSON' },
  { id: 'audit.view', label: 'Журнал дій', desc: 'Хто, коли і що змінював' },
  { id: 'settings.edit', label: 'Налаштування', desc: 'Курси, автовідповідь, заливка сайту' },
]

export const GRANTABLE_IDS: Permission[] = GRANTABLE.map((p) => p.id)
export const ALL_PERMISSIONS: Permission[] = [...GRANTABLE_IDS, 'users.manage']

/** Стартовий набір прав для нового помічника */
export const ASSISTANT_DEFAULT: Permission[] = ['requests.create', 'offers.make']

export interface User {
  id: string
  login: string
  name: string
  role: Role
  permissions: Permission[]
  active: boolean
  createdAt: number
  lastLoginAt?: number | null
}

export interface TeamMember {
  id: string
  name: string
  role: Role
}

export interface AuditEntry {
  t: number
  uid?: string | null
  name: string
  role: string
  action: string
  target?: string
  details?: string
  ip?: string
}

export const can = (u: User | null | undefined, p: Permission): boolean =>
  !!u && (u.role === 'owner' || u.permissions.includes(p))

export const ROLE_LABEL: Record<string, string> = {
  owner: 'Власник',
  assistant: 'Помічник',
  public: 'Сайт',
  cli: 'Термінал',
}

export const AUDIT_LABEL: Record<string, string> = {
  setup: 'Створено власника',
  login: 'Вхід',
  'login.fail': 'Невдала спроба входу',
  logout: 'Вихід',
  'request.submit': 'Заявка з сайту',
  'request.create': 'Нова заявка',
  'request.update': 'Зміна заявки',
  'request.delete': 'Видалено заявку',
  import: 'Імпорт заявок',
  'user.create': 'Додано помічника',
  'user.update': 'Змінено помічника',
  'user.delete': 'Видалено помічника',
  'profile.update': 'Змінено профіль',
  'password.reset': 'Скинуто пароль',
  'settings.save': 'Змінено налаштування',
}

export function validLogin(s: string) {
  return /^[a-z0-9._-]{3,32}$/.test(s)
}
