/**
 * Графік роботи магазину та розрахунок статусу «Відчинено / Зачинено».
 * Використовується у Header, Hero, Location та Contact.
 */

export interface DaySchedule {
  /** 0 = неділя … 6 = субота */
  day: number
  label: string
  short: string
  open: number | null // хвилини від початку доби
  close: number | null
  note?: string
}

export const WEEK: DaySchedule[] = [
  { day: 1, label: 'Понеділок', short: 'Пн', open: 10 * 60, close: 19 * 60 },
  { day: 2, label: 'Вівторок', short: 'Вт', open: 10 * 60, close: 19 * 60 },
  { day: 3, label: 'Середа', short: 'Ср', open: 10 * 60, close: 19 * 60 },
  { day: 4, label: 'Четвер', short: 'Чт', open: 10 * 60, close: 19 * 60 },
  { day: 5, label: "П'ятниця", short: 'Пт', open: 10 * 60, close: 19 * 60 },
  { day: 6, label: 'Субота', short: 'Сб', open: 11 * 60, close: 17 * 60 },
  { day: 0, label: 'Неділя', short: 'Нд', open: null, close: null, note: 'за домовленістю' },
]

export interface OpenStatus {
  isOpen: boolean
  /** Текст: «Відчинено до 19:00» / «Зачинено · відкриємось о 10:00» */
  message: string
  /** Коротко: «Відчинено» / «Зачинено» */
  short: string
  /** Хвилин до закриття (якщо відчинено) або до відкриття */
  minutesUntil: number | null
  todayIndex: number
}

function fmt(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function getOpenStatus(now: Date = new Date()): OpenStatus {
  const day = now.getDay()
  const today = WEEK.find((d) => d.day === day)!
  const minutesNow = now.getHours() * 60 + now.getMinutes()

  // Сьогодні робочий день
  if (today.open !== null && today.close !== null) {
    if (minutesNow >= today.open && minutesNow < today.close) {
      const until = today.close - minutesNow
      return {
        isOpen: true,
        message: `Відчинено до ${fmt(today.close)} · чекаємо на вас`,
        short: 'Відчинено',
        minutesUntil: until,
        todayIndex: day,
      }
    }
    if (minutesNow < today.open) {
      return {
        isOpen: false,
        message: `Зачинено · відкриємось сьогодні о ${fmt(today.open)}`,
        short: 'Зачинено',
        minutesUntil: today.open - minutesNow,
        todayIndex: day,
      }
    }
  }

  // Шукаємо наступний робочий день
  for (let i = 1; i <= 7; i++) {
    const next = WEEK.find((d) => d.day === (day + i) % 7)!
    if (next.open !== null) {
      const when = i === 1 ? 'завтра' : next.label.toLowerCase()
      return {
        isOpen: false,
        message: `Зачинено · відкриємось ${when} о ${fmt(next.open)}`,
        short: 'Зачинено',
        minutesUntil: null,
        todayIndex: day,
      }
    }
  }

  return { isOpen: false, message: 'Зачинено', short: 'Зачинено', minutesUntil: null, todayIndex: day }
}

export function formatMinutes(mins: number | null): string {
  if (mins === null) return ''
  if (mins < 60) return `${mins} хв`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h} год ${m} хв` : `${h} год`
}

/** Адреса магазину — єдине джерело правди для всього сайту */
export const ADDRESS = {
  street: 'вулиця 20-річчя Перемоги, 35',
  streetShort: 'вул. 20-річчя Перемоги, 35',
  floor: '2 поверх',
  city: 'Дніпро',
  region: 'Дніпропетровська область',
  postal: '49127',
  full: 'вул. 20-річчя Перемоги, 35, 2 поверх, Дніпро, 49127',
  /** Будівля, в якій знаходиться салон */
  building: 'будівля АТБ',
  lat: 48.4157,
  lng: 35.1335,
}

/**
 * Орієнтир: магазин в тій самій будівлі (посилання від власника).
 * За адресою «вул. 20-річчя Перемоги, 35, 2 поверх» у Google Maps — HUMANA (2 поверх будівлі АТБ).
 */
export const LANDMARK = {
  name: 'HUMANA',
  description: 'секонд-хенд',
  link: 'https://maps.app.goo.gl/XYmsibbhf8PBApeL8?g_st=ic',
  short: 'В одній будівлі з HUMANA (будівля АТБ, 2 поверх)',
  /** Інші заклади в цій самій будівлі — допомагають знайти вхід */
  neighbours: [
    { name: 'АТБ', note: 'супермаркет, 1 поверх — головний орієнтир' },
    { name: 'HUMANA', note: 'секонд-хенд, 2 поверх — ми поруч' },
    { name: 'Аптека «Подорожник»', note: 'в цьому ж будинку' },
    { name: 'Pizza Day', note: 'піцерія в цьому ж будинку' },
    { name: 'EVA', note: 'магазин косметики в цьому ж будинку' },
  ],
}

/** Посилання на точку в Google Maps (від власника) */
export const MAPS_LINK = 'https://maps.app.goo.gl/kbJmH1DWLV55HhQf8?g_st=ic'

/** Пошуковий запит для карт */
export const MAPS_QUERY = `${ADDRESS.street}, ${ADDRESS.city}, ${ADDRESS.region}`

/** Побудова посилань на різні картографічні сервіси */
export const mapLinks = {
  google: MAPS_LINK,
  googleDirections: `https://www.google.com/maps/dir/?api=1&destination=${ADDRESS.lat},${ADDRESS.lng}&travelmode=driving`,
  transit: `https://www.google.com/maps/dir/?api=1&destination=${ADDRESS.lat},${ADDRESS.lng}&travelmode=transit`,
  walking: `https://www.google.com/maps/dir/?api=1&destination=${ADDRESS.lat},${ADDRESS.lng}&travelmode=walking`,
  googleEmbed: `https://maps.google.com/maps?q=${ADDRESS.lat},${ADDRESS.lng}&z=18&hl=uk&output=embed`,
  apple: `https://maps.apple.com/?q=${encodeURIComponent(MAPS_QUERY)}&ll=${ADDRESS.lat},${ADDRESS.lng}`,
  osm: `https://www.openstreetmap.org/?mlat=${ADDRESS.lat}&mlon=${ADDRESS.lng}#map=18/${ADDRESS.lat}/${ADDRESS.lng}`,
  osmEmbed: `https://www.openstreetmap.org/export/embed.html?bbox=${ADDRESS.lng - 0.004}%2C${
    ADDRESS.lat - 0.0025
  }%2C${ADDRESS.lng + 0.004}%2C${ADDRESS.lat + 0.0025}&layer=mapnik&marker=${ADDRESS.lat}%2C${ADDRESS.lng}`,
  uber: `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(
    ADDRESS.full,
  )}&dropoff[latitude]=${ADDRESS.lat}&dropoff[longitude]=${ADDRESS.lng}`,
  bolt: `https://bolt.eu/ua/`,
  yandex: `https://yandex.ua/maps/?text=${encodeURIComponent(MAPS_QUERY)}&z=17`,
}

/** Назва салону (з рекламної листівки) */
export const BRAND = {
  prefix: 'Салон',
  name: 'АнтикварЪ',
  full: 'Салон «АнтикварЪ»',
  slogan: 'Консультація — безкоштовна',
}

/** Телефон Юрія — (050) 562-35-23 */
export const CONTACT = {
  phone: '+380505623523',
  phoneDisplay: '(050) 562-35-23',
  phoneFull: '+38 (050) 562-35-23',
  telegram: '+380505623523',
  telegramLink: 'https://t.me/+380505623523',
  viber: 'viber://chat?number=%2B380505623523',
  whatsapp: 'https://wa.me/380505623523',
  email: 'yuriy.antique.dnipro@gmail.com',
}

/** Примітка з листівки щодо символіки */
export const SYMBOLISM_NOTE =
  'Будь-яка символіка в жодному разі не несе в собі агітацію, а є невідʼємною частиною предметів колекціонування.'
