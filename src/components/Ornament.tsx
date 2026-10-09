interface OrnamentProps {
  className?: string
  /** light — для темного дерева, dark — для пергаменту */
  tone?: 'light' | 'dark'
  align?: 'center' | 'left'
}

/** Латунний орнамент-роздільник у стилі різьби логотипу */
export function Ornament({ className = '', tone = 'dark', align = 'center' }: OrnamentProps) {
  const c = tone === 'light' ? '#d6b157' : '#a7802f'
  return (
    <svg
      viewBox="0 0 240 24"
      className={`h-6 w-52 ${align === 'center' ? 'mx-auto' : ''} ${className}`}
      aria-hidden="true"
      fill="none"
      stroke={c}
      strokeWidth="1.4"
      strokeLinecap="round"
    >
      <path d="M4 12 H84" strokeOpacity="0.7" />
      <path d="M156 12 H236" strokeOpacity="0.7" />
      <path d="M84 12 C 92 3, 104 3, 106 10 C 107 14, 102 16, 100 13" />
      <path d="M156 12 C 148 3, 136 3, 134 10 C 133 14, 138 16, 140 13" />
      <path d="M84 12 C 92 21, 103 21, 106 15" />
      <path d="M156 12 C 148 21, 137 21, 134 15" />
      <path d="M120 3 L127.5 12 L120 21 L112.5 12 Z" fill={c} />
      <circle cx="109" cy="12" r="1.6" fill={c} />
      <circle cx="131" cy="12" r="1.6" fill={c} />
      <circle cx="4" cy="12" r="1.8" fill={c} />
      <circle cx="236" cy="12" r="1.8" fill={c} />
    </svg>
  )
}
