import { useCallback, useEffect, useState } from 'react'
import {
  Smartphone,
  Rocket,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  KeyRound,
  Trash2,
} from 'lucide-react'

const STORE_KEY = 'gh_deploy_v1'
const WORKFLOW = 'deploy-cityhost.yml'

interface Cfg {
  repo: string
  branch: string
  token: string
}

interface Run {
  id: number
  status: string
  conclusion: string | null
  created_at: string
  html_url: string
  event: string
  head_commit?: { message?: string }
}

function loadCfg(): Cfg {
  try {
    return { repo: '', branch: 'main', token: '', ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') }
  } catch {
    return { repo: '', branch: 'main', token: '' }
  }
}

const EVENT_LABEL: Record<string, string> = {
  push: 'зміна файлів',
  workflow_dispatch: 'кнопка',
}

/**
 * Заливка з телефону: кнопка запускає GitHub Actions («📱 Заливка на CityHost»),
 * той збирає сайт і дає хостингу команду оновитися.
 * Токен GitHub зберігається лише в цьому браузері.
 */
export function DeployPanel() {
  const [cfg, setCfg] = useState<Cfg>(loadCfg)
  const [runs, setRuns] = useState<Run[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const ready = /^[\w.-]+\/[\w.-]+$/.test(cfg.repo) && cfg.token.length > 10

  const api = useCallback(
    (path: string, init?: RequestInit) =>
      fetch(`https://api.github.com/repos/${cfg.repo}${path}`, {
        ...init,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${cfg.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(init?.headers || {}),
        },
      }),
    [cfg.repo, cfg.token],
  )

  const save = (next: Cfg) => {
    setCfg(next)
    localStorage.setItem(STORE_KEY, JSON.stringify(next))
  }

  const refresh = useCallback(async () => {
    if (!ready) return
    try {
      const r = await api(`/actions/workflows/${WORKFLOW}/runs?per_page=5`)
      if (r.status === 401) throw new Error('Токен недійсний або прострочений')
      if (r.status === 404) throw new Error('Не знайдено репозиторій або workflow — перевірте назву і що файли залиті на GitHub')
      if (!r.ok) throw new Error(`GitHub відповів ${r.status}`)
      const data = await r.json()
      setRuns(data.workflow_runs || [])
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message })
    }
  }, [api, ready])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Поки йде заливка — оновлюємо статус кожні 8 секунд
  const active = runs.some((r) => r.status !== 'completed')
  useEffect(() => {
    if (!active) return
    const t = setInterval(refresh, 8000)
    return () => clearInterval(t)
  }, [active, refresh])

  const deploy = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const r = await api(`/actions/workflows/${WORKFLOW}/dispatches`, {
        method: 'POST',
        body: JSON.stringify({ ref: cfg.branch || 'main' }),
      })
      if (r.status === 204) {
        setMsg({ type: 'ok', text: 'Заливку запущено! Займе 1–2 хвилини.' })
        setTimeout(refresh, 3000)
      } else if (r.status === 403) {
        throw new Error('У токена немає права Actions: Read and write')
      } else if (r.status === 422) {
        throw new Error(`Гілку «${cfg.branch}» не знайдено`)
      } else {
        throw new Error(`GitHub відповів ${r.status}`)
      }
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const statusView = (r: Run) => {
    if (r.status !== 'completed')
      return (
        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
          <Loader2 className="w-4 h-4 animate-spin" /> Виконується…
        </span>
      )
    if (r.conclusion === 'success')
      return (
        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
          <CheckCircle2 className="w-4 h-4" /> Залито
        </span>
      )
    return (
      <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
        <XCircle className="w-4 h-4" /> Помилка
      </span>
    )
  }

  return (
    <section className="bg-white rounded-2xl border-2 border-amber-300 p-6">
      <h2 className="font-bold text-stone-900 mb-1 flex items-center gap-2">
        <Smartphone className="w-5 h-5 text-amber-600" />
        Заливка з телефону
      </h2>
      <p className="text-sm text-stone-500 mb-4">
        Одна кнопка: GitHub збирає сайт і оновлює його на CityHost. Працює з будь-якого телефону.
      </p>

      {ready ? (
        <>
          <button
            onClick={deploy}
            disabled={busy || active}
            className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-xl bg-brass text-stone-950 font-black text-lg disabled:opacity-60"
          >
            {busy || active ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
            {active ? 'Йде заливка…' : 'Залити зараз'}
          </button>

          {msg && (
            <div
              className={`mt-3 p-3 rounded-xl text-sm ${
                msg.type === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {msg.text}
            </div>
          )}

          <div className="mt-5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-700">Останні заливки</h3>
            <button onClick={refresh} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500" aria-label="Оновити">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <ul className="mt-2 divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
            {runs.length === 0 && <li className="p-3 text-sm text-stone-500">Ще не було жодної заливки</li>}
            {runs.map((r) => (
              <li key={r.id} className="p-3 text-sm flex items-center justify-between gap-3">
                <div className="min-w-0">
                  {statusView(r)}
                  <div className="text-xs text-stone-500 truncate">
                    {new Date(r.created_at).toLocaleString('uk-UA')} · {EVENT_LABEL[r.event] || r.event}
                    {r.head_commit?.message ? ` · ${r.head_commit.message.split('\n')[0]}` : ''}
                  </div>
                </div>
                <a href={r.html_url} target="_blank" rel="noopener noreferrer" className="text-amber-700 shrink-0" aria-label="Деталі">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between text-xs text-stone-500">
            <span>
              {cfg.repo} · гілка {cfg.branch}
            </span>
            <button
              onClick={() => save({ ...cfg, token: '' })}
              className="inline-flex items-center gap-1 text-rose-600 hover:underline"
            >
              <Trash2 className="w-3 h-3" /> Забути токен
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-semibold text-stone-700">Репозиторій GitHub</span>
            <input
              value={cfg.repo}
              onChange={(e) => save({ ...cfg, repo: e.target.value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '') })}
              placeholder="ваш-логін/antikvar"
              autoCapitalize="none"
              className="mt-1 w-full px-4 py-3 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-stone-700">Гілка</span>
            <input
              value={cfg.branch}
              onChange={(e) => save({ ...cfg, branch: e.target.value.trim() })}
              autoCapitalize="none"
              className="mt-1 w-full px-4 py-3 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-stone-700 flex items-center gap-1">
              <KeyRound className="w-4 h-4" /> Токен GitHub
            </span>
            <input
              type="password"
              value={cfg.token}
              onChange={(e) => save({ ...cfg, token: e.target.value.trim() })}
              placeholder="github_pat_..."
              autoCapitalize="none"
              className="mt-1 w-full px-4 py-3 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400"
            />
          </label>
          <div className="text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-1">
            <div className="font-bold text-stone-800">Як отримати токен (1 раз, 2 хвилини):</div>
            <div>
              1.{' '}
              <a
                href="https://github.com/settings/personal-access-tokens/new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 underline"
              >
                github.com → Fine-grained token
              </a>
            </div>
            <div>2. Repository access → Only select repositories → ваш репозиторій</div>
            <div>
              3. Permissions → <b>Actions: Read and write</b>
            </div>
            <div>4. Generate token → скопіюйте сюди</div>
            <div className="pt-1 text-stone-500">Токен зберігається лише в цьому браузері й не потрапляє на сайт.</div>
          </div>
        </div>
      )}
    </section>
  )
}
