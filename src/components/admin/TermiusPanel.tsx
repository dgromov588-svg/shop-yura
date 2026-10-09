import { useState } from 'react'
import { Terminal, Copy, Check, ShieldAlert, Server, Zap, Undo2, Info } from 'lucide-react'

const SSH = {
  host: 'amarok.cityhost.com.ua',
  user: 'ch9ca38181',
  port: '22',
}
const STORE_KEY = 'termius_cfg_v1'

function loadCfg() {
  try {
    const own = JSON.parse(localStorage.getItem(STORE_KEY) || '{}')
    const gh = JSON.parse(localStorage.getItem('gh_deploy_v1') || '{}')
    return { repo: own.repo || gh.repo || '', branch: own.branch || gh.branch || 'main', isPrivate: own.isPrivate ?? true }
  } catch {
    return { repo: '', branch: 'main', isPrivate: true }
  }
}

function CopyRow({ label, value, mono = true }: { label?: string; value: string; mono?: boolean }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = value
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setDone(true)
    setTimeout(() => setDone(false), 1500)
  }
  return (
    <div>
      {label && <div className="text-xs font-semibold text-stone-600 mb-1">{label}</div>}
      <div className="flex items-stretch gap-2">
        <code
          className={`flex-1 min-w-0 px-3 py-2.5 rounded-lg bg-stone-900 text-amber-200 text-xs break-all ${
            mono ? 'font-mono' : ''
          }`}
        >
          {value}
        </code>
        <button
          onClick={copy}
          className={`shrink-0 px-3 rounded-lg text-xs font-bold transition-colors ${
            done ? 'bg-emerald-500 text-white' : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
          aria-label="Копіювати"
        >
          {done ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

/** Інструкція + готові команди для оновлення сайту з телефону через Termius */
export function TermiusPanel() {
  const [cfg, setCfg] = useState(loadCfg)
  const save = (next: typeof cfg) => {
    setCfg(next)
    localStorage.setItem(STORE_KEY, JSON.stringify(next))
  }
  const repoOk = /^[\w.-]+\/[\w.-]+$/.test(cfg.repo)
  const repo = repoOk ? cfg.repo : 'ЛОГІН/РЕПОЗИТОРІЙ'
  const br = cfg.branch || 'main'

  const installCmd = cfg.isPrivate
    ? `read -rsp 'Токен GitHub: ' T; echo; curl -fsSL -H "Authorization: Bearer $T" -H "Accept: application/vnd.github.raw" "https://api.github.com/repos/${repo}/contents/scripts/server/antikvar.sh?ref=${br}" -o ~/antikvar.sh && bash ~/antikvar.sh setup`
    : `curl -fsSL https://raw.githubusercontent.com/${repo}/${br}/scripts/server/antikvar.sh -o ~/antikvar.sh && bash ~/antikvar.sh setup`

  return (
    <section className="bg-white rounded-2xl border-2 border-stone-800 p-6">
      <h2 className="font-bold text-stone-900 mb-1 flex items-center gap-2">
        <Terminal className="w-5 h-5 text-amber-600" />
        Заливка з телефону через Termius
      </h2>
      <p className="text-sm text-stone-500 mb-5">
        Підключаєтесь до хостингу в застосунку Termius і запускаєте одну команду: сервер сам
        завантажує код із GitHub, збирає сайт і оновлює його.
      </p>

      {/* Крок 1 */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-5">
        <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
          <ShieldAlert className="w-4 h-4 text-amber-700" />
          Крок 1 · Дозвольте IP телефону
        </div>
        <p className="mt-1 text-xs text-stone-700 leading-relaxed">
          На телефоні, <b>у тій самій мережі</b>, з якої підключатиметесь (Wi-Fi або мобільний інтернет),
          відкрийте панель CityHost → <b>Хостинг 2.0 → Керування → SSH → Дозволені IP → Додати IP</b> →
          «додати поточний IP». VPN вимкніть.
          <br />
          Termius пише «Connection refused / timeout»? Отже, IP змінився — додайте його ще раз.
          Запасний варіант без IP: <b>SSH → Web SSH</b> у тій самій панелі, команди ті самі.
        </p>
      </div>

      {/* Крок 2 */}
      <div className="mb-5">
        <div className="flex items-center gap-2 font-bold text-stone-900 text-sm mb-2">
          <Server className="w-4 h-4 text-amber-700" />
          Крок 2 · Новий хост у Termius (Hosts → +)
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          <CopyRow label="Hostname" value={SSH.host} />
          <CopyRow label="Username" value={SSH.user} />
          <CopyRow label="Port" value={SSH.port} />
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Пароль SSH введіть у Termius (зберігається в зашифрованому сховищі застосунку). Тут він не зберігається.
        </p>
      </div>

      {/* Крок 3 */}
      <div className="mb-5">
        <div className="flex items-center gap-2 font-bold text-stone-900 text-sm mb-2">
          <Zap className="w-4 h-4 text-amber-700" />
          Крок 3 · Встановлення (один раз)
        </div>
        <div className="grid sm:grid-cols-3 gap-2 mb-3">
          <label className="sm:col-span-2 block">
            <span className="text-xs font-semibold text-stone-600">Репозиторій GitHub</span>
            <input
              value={cfg.repo}
              onChange={(e) =>
                save({ ...cfg, repo: e.target.value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '') })
              }
              placeholder="логін/antikvar"
              autoCapitalize="none"
              className="mt-1 w-full px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-amber-400"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-600">Гілка</span>
            <input
              value={cfg.branch}
              onChange={(e) => save({ ...cfg, branch: e.target.value.trim() })}
              autoCapitalize="none"
              className="mt-1 w-full px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-amber-400"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm mb-3">
          <input
            type="checkbox"
            checked={cfg.isPrivate}
            onChange={(e) => save({ ...cfg, isPrivate: e.target.checked })}
            className="w-4 h-4 accent-amber-500"
          />
          Приватний репозиторій (потрібен токен GitHub)
        </label>
        <CopyRow label="Вставте в Termius і натисніть Enter:" value={installCmd} />
        {!repoOk && <p className="mt-2 text-xs text-rose-600">Спочатку вкажіть репозиторій у форматі логін/назва</p>}
        <p className="mt-2 text-xs text-stone-500">
          Скрипт запитає репозиторій, токен і папку сайту, запамʼятає їх і запропонує встановити Node.js на хостинг,
          щоб сайт збирався прямо на сервері.
          {cfg.isPrivate && (
            <>
              {' '}Токен:{' '}
              <a
                href="https://github.com/settings/personal-access-tokens/new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 underline"
              >
                github.com → Fine-grained token
              </a>{' '}
              → ваш репозиторій → <b>Contents: Read-only</b>.
            </>
          )}
        </p>
      </div>

      {/* Крок 4 */}
      <div>
        <div className="flex items-center gap-2 font-bold text-stone-900 text-sm mb-2">
          <Terminal className="w-4 h-4 text-amber-700" />
          Крок 4 · Snippets у Termius (запуск одним дотиком)
        </div>
        <p className="text-xs text-stone-500 mb-3">
          Termius → <b>Snippets → +</b>. Потім у сесії: значок {'{ }'} → обрати сніпет.
        </p>
        <div className="space-y-2">
          <CopyRow label="🔁 Увімкнути автозбірку (1 раз) — далі сайт оновлюється сам" value="bash ~/antikvar.sh auto" />
          <CopyRow label="📊 Стан автозбірки" value="bash ~/antikvar.sh auto status" />
          <CopyRow label="⚡ Миттєва автозбірка, поки відкритий Termius" value="bash ~/antikvar.sh watch" />
          <CopyRow label="🚀 Зібрати проект із сервера зараз" value="bash ~/antikvar.sh local" />
          <CopyRow label="↩️ Повернути попередню версію" value="bash ~/antikvar.sh rollback" />
          <CopyRow label="ℹ️ Стан і резервні копії" value="bash ~/antikvar.sh status" />
        </div>
      </div>

      <div className="mt-5 flex gap-2 text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-xl p-3">
        <Info className="w-4 h-4 shrink-0 text-stone-400 mt-0.5" />
        <div>
          Як змінити сайт з телефону: github.com → файл (напр. <code>src/lib/hours.ts</code>) → ✏️ → Commit changes →
          у Termius <code>bash ~/antikvar.sh</code>. Перед кожним оновленням зберігається копія сайту
          (<Undo2 className="w-3 h-3 inline" /> rollback). Якщо збірка зламана, сайт не змінюється.
        </div>
      </div>
    </section>
  )
}
