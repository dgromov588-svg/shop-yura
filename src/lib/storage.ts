// Типи для системи управління заявками антикварного магазину

export type RequestStatus = 'new' | 'reviewing' | 'meeting' | 'completed' | 'rejected'

/** Категорії — за листівкою салону «АнтикварЪ» (+ «Інше») */
export type RequestCategory =
  | 'books'
  | 'postcards'
  | 'military'
  | 'desk'
  | 'toys'
  | 'models'
  | 'drinks'
  | 'perfume'
  | 'cameras'
  | 'other'

export type ContactMethod = 'phone' | 'telegram' | 'viber' | 'whatsapp' | 'email'

export interface OfferMessage {
  id: string
  author: 'client' | 'owner'
  text: string
  timestamp: number
  offerAmount?: number // запропонована сума в грн
  byName?: string // хто з команди написав (ставить сервер)
  byRole?: string
}

export interface ClientRequest {
  id: string
  createdAt: number
  updatedAt: number
  status: RequestStatus

  // Контактні дані клієнта
  clientName: string
  phone: string
  preferredContact: ContactMethod
  email?: string
  city?: string

  // Інформація про предмет
  category: RequestCategory
  categoryLabel: string
  itemTitle: string
  itemDescription: string
  estimatedYear?: string
  estimatedCondition?: string

  // Оцінена вартість
  ownerAskingPrice?: number // скільки хоче власник
  ownerEstimatedPrice?: number // скільки власник припускає
  myOfferPrice?: number // запропонована ціна
  currency: 'UAH' | 'USD' | 'EUR'

  // Робота з повідомленнями
  messages: OfferMessage[]

  // Теги та нотатки
  tags: string[]
  notes: string
  priority: 'low' | 'normal' | 'high' | 'urgent'

  // Зустріч
  meetingDate?: number
  meetingLocation?: string

  // Адреса клієнта (для виїзду)
  needsVisit: boolean
  clientAddress?: string

  // Команда
  assignedTo?: string | null // id відповідального
  createdBy?: string | null
  updatedBy?: string | null
}

export interface Settings {
  /** @deprecated паролі тепер в облікових записах (lib/backend.ts) */
  ownerPassword?: string
  ownerName: string
  companyName: string
  defaultCurrency: 'UAH' | 'USD' | 'EUR'
  exchangeRates: { UAH: number; USD: number; EUR: number } // до UAH
  notifications: {
    newRequest: boolean
    statusChange: boolean
    offerReceived: boolean
  }
  autoResponder: {
    enabled: boolean
    text: string
  }
}

// v2 — нові категорії за листівкою салону «АнтикварЪ»
export const STORAGE_KEY = 'antique_requests_v2'
const SETTINGS_KEY = 'antique_settings_v1'

export const defaultSettings: Settings = {
  ownerName: 'Юрій',
  companyName: 'Салон «АнтикварЪ»',
  defaultCurrency: 'UAH',
  exchangeRates: { UAH: 1, USD: 41.5, EUR: 45.2 },
  notifications: {
    newRequest: true,
    statusChange: true,
    offerReceived: true,
  },
  autoResponder: {
    enabled: true,
    text:
      'Дякую за звернення! Я оціню ваш предмет протягом 15 хвилин та передзвоню. З повагою, Юрій.',
  },
}

export const categoryLabels: Record<RequestCategory, string> = {
  books: 'Книги (дореволюційні видання)',
  postcards: 'Листівки та фотокартки',
  military: 'Військова форма, головні убори, кокарди',
  desk: 'Письмові прибори, лампи, свічники',
  toys: 'Ялинкові іграшки, гірлянди',
  models: 'Масштабні моделі',
  drinks: 'Колекційні напої',
  perfume: 'Старі парфуми',
  cameras: 'Фотоапарати, обʼєктиви, біноклі',
  other: 'Інше',
}

// Завантаження/збереження
/** Ідентифікатори колишніх демо-заявок — прибираються автоматично */
const DEMO_IDS = /^req_00[1-4]$/

export function loadRequests(): ClientRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list.filter((r: ClientRequest) => r && !DEMO_IDS.test(r.id)) : []
  } catch {
    return []
  }
}

export function saveRequests(requests: ClientRequest[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests))
  } catch (e) {
    console.error('Failed to save', e)
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultSettings
    return { ...defaultSettings, ...JSON.parse(raw) }
  } catch {
    return defaultSettings
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save settings', e)
  }
}

// Приклади заявок — НЕ використовуються сайтом (демо вимкнено), лише для тестів
export function getExampleRequests(): ClientRequest[] {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  return [
    {
      id: 'req_001',
      createdAt: now - 2 * day,
      updatedAt: now - 3 * 60 * 60 * 1000,
      status: 'new',
      clientName: 'Олена Петренко',
      phone: '+380671234567',
      preferredContact: 'telegram',
      email: 'o.petrenko@gmail.com',
      city: 'Дніпро',
      category: 'books',
      categoryLabel: 'Книги (дореволюційні видання)',
      itemTitle: 'Енциклопедія Брокгауза та Ефрона, 12 томів',
      itemDescription:
        'Енциклопедичний словник, шкіряні палітурки з тисненням, дореволюційна орфографія. Частина томів з потертостями.',
      estimatedYear: '1890-1907',
      estimatedCondition: 'Добрий, потерті корінці',
      ownerAskingPrice: 25000,
      currency: 'UAH',
      messages: [
        {
          id: 'm1',
          author: 'client',
          text: 'Доброго дня! Книги дістались від дідуся. Чи можете оцінити?',
          timestamp: now - 2 * day,
        },
      ],
      tags: ['спадщина', 'терміново'],
      notes: '',
      priority: 'high',
      needsVisit: false,
    },
    {
      id: 'req_002',
      createdAt: now - 5 * day,
      updatedAt: now - 1 * day,
      status: 'reviewing',
      clientName: 'Віктор Коваленко',
      phone: '+380501112233',
      preferredContact: 'phone',
      city: 'Дніпро',
      category: 'cameras',
      categoryLabel: 'Фотоапарати, обʼєктиви, біноклі',
      itemTitle: 'Фотоапарат ФЕД-2 та бінокль БПЦ 8х30',
      itemDescription:
        'Фотоапарат ФЕД-2 з обʼєктивом Індустар-26М у шкіряному чохлі, бінокль БПЦ 8х30 з футляром. Механіка працює.',
      estimatedYear: 'середина XX ст.',
      ownerAskingPrice: 80000,
      ownerEstimatedPrice: 60000,
      currency: 'UAH',
      messages: [
        {
          id: 'm1',
          author: 'client',
          text: 'Потрібна оцінка фотоапарата та бінокля, фото додав',
          timestamp: now - 5 * day,
        },
        {
          id: 'm2',
          author: 'owner',
          text: 'Дякую! Підкажіть серійний номер фотоапарата та чи чисті лінзи бінокля?',
          timestamp: now - 4 * day,
        },
        {
          id: 'm3',
          author: 'client',
          text: 'Номер 2-го випуску, лінзи чисті. Все від батька лишилось.',
          timestamp: now - 1 * day,
        },
      ],
      tags: ['без підпису', 'великий розмір'],
      notes: 'Потрібен очний огляд для точної оцінки',
      priority: 'normal',
      needsVisit: true,
      clientAddress: 'вул. Робоча, 45, кв. 12',
    },
    {
      id: 'req_003',
      createdAt: now - 10 * day,
      updatedAt: now - 10 * 60 * 60 * 1000,
      status: 'meeting',
      clientName: 'Михайло Шевченко',
      phone: '+380935551122',
      preferredContact: 'viber',
      category: 'toys',
      categoryLabel: 'Ялинкові іграшки, гірлянди',
      itemTitle: 'Скляні ялинкові іграшки 1950-х, коробка',
      itemDescription:
        'Близько 40 скляних іграшок 1950-60-х: шишки, бурульки, птахи, космонавт. Зберігались в оригінальній коробці.',
      ownerAskingPrice: 15000,
      currency: 'UAH',
      messages: [
        {
          id: 'm1',
          author: 'client',
          text: 'Маю коробку старих ялинкових іграшок, цікавить оцінка',
          timestamp: now - 10 * day,
        },
        {
          id: 'm2',
          author: 'owner',
          text: 'Приїздіть завтра о 14:00 на адресу магазину',
          timestamp: now - 10 * 60 * 60 * 1000,
          offerAmount: 12000,
        },
      ],
      tags: ['колекція'],
      notes: 'Принести альбом повністю',
      priority: 'normal',
      needsVisit: false,
      meetingDate: now + 1 * day,
      meetingLocation: 'Магазин на Перемоги, 35',
    },
    {
      id: 'req_004',
      createdAt: now - 7 * day,
      updatedAt: now - 2 * day,
      status: 'completed',
      clientName: 'Ірина Бондаренко',
      phone: '+380999887766',
      preferredContact: 'whatsapp',
      category: 'models',
      categoryLabel: 'Масштабні моделі',
      itemTitle: 'Модель «Москвич-412», масштаб 1:43',
      itemDescription:
        'Металева модель «Москвич-412» з оригінальною коробкою, виробництво СРСР. Фарба без сколів.',
      estimatedYear: '1950-1960',
      ownerAskingPrice: 8000,
      myOfferPrice: 7200,
      currency: 'UAH',
      messages: [
        {
          id: 'm1',
          author: 'client',
          text: 'Є модель машинки з дитинства, фото нижче',
          timestamp: now - 7 * day,
        },
        {
          id: 'm2',
          author: 'owner',
          text: 'Готовий запропонувати 7200 грн',
          timestamp: now - 5 * day,
          offerAmount: 7200,
        },
        {
          id: 'm3',
          author: 'client',
          text: 'Домовились, дякую!',
          timestamp: now - 2 * day,
        },
      ],
      tags: ['угода'],
      notes: 'Угода закрита. Клієнт задоволений.',
      priority: 'normal',
      needsVisit: false,
    },
  ]
}

// Утиліти
export function formatCurrency(amount: number | undefined, currency: string = 'UAH'): string {
  if (amount === undefined || amount === null) return '—'
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / (60 * 1000))
  const hours = Math.floor(diff / (60 * 60 * 1000))
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))

  if (minutes < 1) return 'щойно'
  if (minutes < 60) return `${minutes} хв тому`
  if (hours < 24) return `${hours} год тому`
  if (days < 7) return `${days} дн тому`
  return new Date(timestamp).toLocaleDateString('uk-UA')
}

export const statusLabels: Record<RequestStatus, string> = {
  new: 'Нова',
  reviewing: 'На розгляді',
  meeting: 'Зустріч',
  completed: 'Завершено',
  rejected: 'Відхилено',
}

export const statusColors: Record<RequestStatus, string> = {
  new: 'bg-blue-100 text-blue-800 border-blue-200',
  reviewing: 'bg-amber-100 text-amber-800 border-amber-200',
  meeting: 'bg-violet-100 text-violet-800 border-violet-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-100 text-rose-800 border-rose-200',
}

export const priorityLabels: Record<ClientRequest['priority'], string> = {
  low: 'Низький',
  normal: 'Звичайний',
  high: 'Високий',
  urgent: 'Терміново',
}

export const priorityColors: Record<ClientRequest['priority'], string> = {
  low: 'bg-stone-100 text-stone-700',
  normal: 'bg-sky-100 text-sky-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-rose-100 text-rose-700',
}
