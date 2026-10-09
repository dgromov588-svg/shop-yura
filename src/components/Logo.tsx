import { useId, useState } from 'react'

/**
 * Логотип «ЮК · Антикварний магазин».
 *
 * За замовчуванням малюється векторна копія (SVG) — чітка на будь-якому розмірі.
 * Щоб використати оригінальний файл логотипу:
 *   1. Покладіть PNG з ПРОЗОРИМ фоном у public/logo.png
 *   2. Вкажіть LOGO_IMAGE_URL = './logo.png'
 */
export const LOGO_IMAGE_URL: string | null = null

function useIds() {
  const raw = useId().replace(/:/g, '')
  return {
    wood: `${raw}-wood`,
    rim: `${raw}-rim`,
    brass: `${raw}-brass`,
    shadow: `${raw}-shadow`,
    clip: `${raw}-clip`,
  }
}

function Defs({ ids }: { ids: ReturnType<typeof useIds> }) {
  return (
    <defs>
      <radialGradient id={ids.wood} cx="42%" cy="38%" r="70%">
        <stop offset="0%" stopColor="#93432a" />
        <stop offset="50%" stopColor="#642814" />
        <stop offset="100%" stopColor="#36140a" />
      </radialGradient>
      <linearGradient id={ids.rim} x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stopColor="#7e3a22" />
        <stop offset="55%" stopColor="#5a2313" />
        <stop offset="100%" stopColor="#35130a" />
      </linearGradient>
      <linearGradient id={ids.brass} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f8e8aa" />
        <stop offset="36%" stopColor="#dcbb62" />
        <stop offset="62%" stopColor="#a6812e" />
        <stop offset="100%" stopColor="#ebcf7b" />
      </linearGradient>
      <filter id={ids.shadow} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.4" floodColor="#140603" floodOpacity="0.75" />
      </filter>
      <clipPath id={ids.clip}>
        <circle cx="100" cy="100" r="66" />
      </clipPath>
    </defs>
  )
}

/** Резна квітка-завиток (дублюється по колу) */
const FLOURISH_L = 'M100 13 C 109 16, 112 24, 106 29 C 102 32, 97 29, 99.5 25'
const FLOURISH_R = 'M100 13 C 91 16, 88 24, 94 29 C 98 32, 103 29, 100.5 25'

function Emblem({ ids }: { ids: ReturnType<typeof useIds> }) {
  return (
    <g>
      {/* Зовнішній обід */}
      <circle cx="100" cy="100" r="97" fill={`url(#${ids.rim})`} stroke="#1c0804" strokeWidth="2" />
      <circle cx="100" cy="100" r="93" fill="none" stroke="#b06a40" strokeOpacity="0.35" strokeWidth="1" />

      {/* Різьблений орнамент */}
      {Array.from({ length: 16 }).map((_, i) => (
        <g key={i} transform={`rotate(${i * 22.5} 100 100)`}>
          {/* світлий відблиск різьби */}
          <g transform="translate(-0.6 -0.8)" stroke="#c07a4c" strokeOpacity="0.45" strokeWidth="2" fill="none" strokeLinecap="round">
            <path d={FLOURISH_L} />
            <path d={FLOURISH_R} />
          </g>
          {/* темне заглиблення */}
          <g stroke="#230a04" strokeWidth="2.3" fill="none" strokeLinecap="round">
            <path d={FLOURISH_L} />
            <path d={FLOURISH_R} />
          </g>
          <circle cx="100" cy="34" r="1.7" fill="#230a04" />
          <circle cx="111" cy="18" r="1.1" fill="#230a04" transform="rotate(11.25 100 100)" />
        </g>
      ))}

      {/* Внутрішній жолоб */}
      <circle cx="100" cy="100" r="69" fill="#230a04" />
      <circle cx="100" cy="100" r="66" fill={`url(#${ids.wood})`} />
      <circle cx="100" cy="100" r="64" fill="none" stroke="#b5643a" strokeOpacity="0.35" strokeWidth="1" />

      {/* Волокна дерева */}
      <g clipPath={`url(#${ids.clip})`} fill="none" stroke="#1c0804" strokeOpacity="0.22" strokeWidth="0.9">
        <path d="M30 70 Q 100 52 170 76" />
        <path d="M30 88 Q 100 72 170 94" />
        <path d="M30 110 Q 100 96 170 116" />
        <path d="M30 130 Q 100 118 170 138" />
        <path d="M30 150 Q 100 140 170 158" />
        <path d="M82 40 Q 72 100 86 165" />
      </g>

      {/* Латунні літери «ЮК» */}
      <text
        x="100"
        y="124"
        textAnchor="middle"
        fontFamily="'Playfair Display', Georgia, 'Times New Roman', serif"
        fontWeight="800"
        fontSize="68"
        letterSpacing="-3"
        fill={`url(#${ids.brass})`}
        stroke="#4a3210"
        strokeWidth="0.9"
        filter={`url(#${ids.shadow})`}
      >
        ЮК
      </text>
    </g>
  )
}

interface LogoProps {
  className?: string
  title?: string
}

/** Лише круглий медальйон «ЮК» — для шапки, іконок, аватарок */
export function LogoMark({ className = 'w-12 h-12', title = 'ЮК — антикварний магазин' }: LogoProps) {
  const ids = useIds()
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={title}>
      <Defs ids={ids} />
      <Emblem ids={ids} />
    </svg>
  )
}

/** Повний логотип: медальйон + плашка «АНТИКВАРНЫЙ МАГАЗИН» */
export function Logo({ className = 'w-48', title = 'Салон «АнтикварЪ»' }: LogoProps) {
  const ids = useIds()
  const [imgFailed, setImgFailed] = useState(false)

  if (LOGO_IMAGE_URL && !imgFailed) {
    return (
      <img
        src={LOGO_IMAGE_URL}
        alt={title}
        className={className}
        onError={() => setImgFailed(true)}
      />
    )
  }

  return (
    <svg viewBox="0 0 300 290" className={className} role="img" aria-label={title}>
      <Defs ids={ids} />
      <g transform="translate(50 0)">
        <Emblem ids={ids} />
      </g>

      {/* Плашка з написом */}
      <g filter={`url(#${ids.shadow})`}>
        <path
          d="M18 188 H282 a7 7 0 0 1 7 7 V225 a7 7 0 0 1 -7 7 H238 V270 a7 7 0 0 1 -7 7 H69 a7 7 0 0 1 -7 -7 V232 H18 a7 7 0 0 1 -7 -7 V195 a7 7 0 0 1 7 -7 Z"
          fill={`url(#${ids.rim})`}
          stroke="#1c0804"
          strokeWidth="2"
        />
      </g>
      <path
        d="M20 192 H280 M66 236 V268"
        stroke="#c07a4c"
        strokeOpacity="0.35"
        strokeWidth="1"
        fill="none"
      />
      <g
        fontFamily="'Playfair Display', Georgia, 'Times New Roman', serif"
        fontWeight="800"
        fill={`url(#${ids.brass})`}
        stroke="#4a3210"
        strokeWidth="0.6"
        textAnchor="middle"
      >
        <text x="150" y="223" fontSize="32" textLength="236" lengthAdjust="spacingAndGlyphs">
          АНТИКВАРЪ
        </text>
        <text x="150" y="265" fontSize="28" textLength="132" lengthAdjust="spacingAndGlyphs">
          САЛОН
        </text>
      </g>
    </svg>
  )
}
